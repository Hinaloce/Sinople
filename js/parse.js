/* Blasonnement → blason : lecture d'une phrase héraldique, de gauche à droite.
   1. le champ : émail seul, ou partition + trait + émaux, les parties pouvant être nommées (« au 1 … ») et composées
      (« écartelé : au 1 d'azur à trois fleurs de lis d'or ; au 2 … ») ;
   2. les éléments : « à / au / aux » + nombre + pièce ou meuble + trait / position + émail + attributs + disposition ;
      « chargé de … » se rapporte à la pièce ou au meuble qui précède, « semé de … » au champ ;
      « surmonté de … », « accompagné de … », « cantonné de … » placent les meubles autour de la figure principale.
   Les noms reconnus sont ceux de l'application (émaux, partitions, traits, pièces, meubles), les plus longs d'abord.
   H.parseBlazon(texte) → { state, notes: [textes non compris ou approximations] } */
(function (H) {
  const NUM = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12 };
  const rid = p => p + Math.random().toString(36).slice(2, 7);
  const byLen = (a, b) => b.k.length - a.k.length;
  const bound = (s, k) => s.startsWith(k) && (s.length === k.length || /[\s,;:.]/.test(s[k.length]));

  /* tables, construites au premier usage (les meubles sont chargés après ce fichier) */
  let T = null;
  function tables() {
    if (T) return T;
    const tinct = H.TINCTURES.map(t => ({ k: t.de.toLowerCase(), id: t.id })).sort(byLen);
    const parts = H.PARTS.filter(p => p.id !== 'plein').map(p => ({ k: p.name.toLowerCase(), id: p.id })).sort(byLen);
    /* trait : toutes les formes accordées (crénelé, crénelée, crénelés, crénelées), et celles de ses autres noms */
    const lines = [];
    H.LINES.forEach(l => {
      if (!l.m) return;
      [l.m].concat(l.alias || []).forEach(m => {
        const forms = l.inv ? [m] : ['', 'e', 's', 'es'].map(e => (m.includes('{e}') ? m.replace(/\{e\}/g, e) : m + e));
        forms.forEach(f => lines.push({ k: f.toLowerCase(), id: l.id }));
      });
    });
    lines.sort(byLen);
    /* pièces, au singulier et au pluriel ; les pièces diminuées comptent pour quatre */
    const pieces = [];
    H.PIECES.forEach(p => {
      const nm = p.name.toLowerCase();
      pieces.push({ k: nm, id: p.id }, { k: nm + 's', id: p.id, pl: true });
    });
    pieces.push({ k: 'vergettes', id: 'pal', pl: true, n: 4 }, { k: 'burelles', id: 'fasce', pl: true, n: 4 },
      { k: 'cotices en barre', id: 'barre', pl: true, n: 4 }, { k: 'cotices', id: 'bande', pl: true, n: 4 },
      /* diminutifs d'une pièce seule : vergette, burelle, cotice (épaisseur réduite) */
      { k: 'vergette', id: 'pal', th: 0.5 }, { k: 'burelle', id: 'fasce', th: 0.5 }, { k: 'cotice en barre', id: 'barre', th: 0.5 }, { k: 'cotice', id: 'bande', th: 0.5 });
    pieces.sort(byLen);
    /* meubles : nom, singulier, pluriel, et nom de couleur (besant → tourteau) */
    const charges = [];
    H.CHARGES.forEach(c => {
      const add = (k, pl) => k && charges.push({ k: k.toLowerCase(), id: c.id, pl });
      add(c.sg, false); add(c.pl, true); add(c.name, false);
      if (c.alt) { add(c.alt.sg, false); add(c.alt.pl, true); }
    });
    charges.sort(byLen);
    /* attributs : termes usuels, ceux des particularités et ceux que chaque meuble définit (« loré », « ramé »…) */
    const words = new Set(['armé', 'lampassé', 'langué', 'onglé', 'défendu', 'loré', 'membré', 'chevelé', 'nimbé']);
    H.EXTRAS.forEach(x => words.add(x.terme));
    H.CHARGES.forEach(c => c.variants.forEach(v => {
      words.add(v.armesTerme); words.add(v.langueTerme);
      Object.values(v.extraTermes || {}).forEach(w => words.add(w));
    }));
    const W = [...words].filter(Boolean).sort((a, b) => b.length - a.length).join('|');
    const attrRe = new RegExp(`^,?\\s*(?:(?:${W})e?s?(?![a-zà-ÿ])(?:\\s*,\\s*|\\s+et\\s+)?)+\\s*`);
    const attrWord = new RegExp(`(?:${W})e?s?(?![a-zà-ÿ])`, 'g');
    /* dispositions dites après l'émail (« , 2 et 1 », « rangés en pal », « au canton dextre du chef »), les plus longues d'abord ;
       une même expression vaut pour plusieurs nombres (« en chef » : un ou trois meubles) */
    const arrs = [];
    const addArr = (txt, id) => {
      const k = txt.replace(/^rangés /, '');
      let e = arrs.find(a => a.k === k);
      if (!e) arrs.push(e = { k, ids: [] });
      e.ids.push(id);
    };
    Object.keys(H.ARR).forEach(id => { const a = H.ARR[id]; if (a.txt && !a.seme && !a.canton && !a.accoste) addArr(a.txt, id); });
    addArr("l'un sur l'autre", '2pal'); addArr("l'une sur l'autre", '2pal'); addArr('en abîme', '1');
    arrs.sort(byLen);
    arrs.forEach(a => { a.re = new RegExp(`^,?\\s*(?:rangée?s?\\s+)?${a.k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-zà-ÿ])`); });
    T = { tinct, parts, lines, pieces, charges, arrs, attrRe, attrWord };
    return T;
  }
  /* partie du meuble désignée par un terme : langue, armes, cheveux, auréole ou particularité (« x:couronne ») */
  function attrTarget(v, term) {
    const has = v.cp.has;
    if (has.langue && term === v.langueTerme) return 'langue';
    if (has.armes && term === v.armesTerme) return 'armes';
    const x = H.EXTRAS.find(e => has[e.id] && v.extraTermes[e.id] === term);
    if (x) return 'x:' + x.id;
    if (has.cheveux && term === 'chevelé') return 'cheveux';
    if (has.aureole && term === 'nimbé') return 'aureole';
    /* terme usuel quand le meuble en emploie un autre (« langué » pour un meuble « lampassé ») */
    if (has.langue && (term === 'lampassé' || term === 'langué')) return 'langue';
    if (has.armes && ['armé', 'onglé', 'défendu', 'loré', 'membré'].includes(term)) return 'armes';
    return null;
  }
  const find = (list, s) => list.find(e => bound(s, e.k));
  const pickArr = (e, n) => e.ids.find(id => H.ARR[id].n === n) || e.ids[0];
  /* « posé en bande » : angle du meuble (rules.js, H.orientOf) */
  const ROT = { pal: 0, bande: -45, barre: 45, fasce: 90 };
  /* places autour de la figure principale (rules.js, POSITION) ; « acc » : accompagné, la disposition suit le meuble */
  const LINKS = [
    [/^surmontée?s?\s+/, 'chef1'],
    [/^adextrée?s?\s+en chef\s+/, 'p1'], [/^adextrée?s?\s+en pointe\s+/, 'p7'], [/^adextrée?s?\s+/, 'p4'],
    [/^senestrée?s?\s+en chef\s+/, 'p3'], [/^senestrée?s?\s+en pointe\s+/, 'p9'], [/^senestrée?s?\s+/, 'p6'],
    [/^cantonnée?s?\s+/, 'canton'],
    [/^accostée?s?\s+en chef\s+/, 'accoste-chef'], [/^accostée?s?\s+en pointe\s+/, 'accoste-pointe'], [/^accostée?s?\s+/, 'accoste'],
    [/^accompagnée?s?\s+/, 'acc']
  ];
  /* identifiants neufs pour la copie d'une partie (une même partie composée dite « aux 1 et 4 ») */
  function reId(F) {
    const map = {};
    F.pieces.forEach(p => { const o = p.id; p.id = rid('p'); map[o] = p.id; if (p.inner) reId(p.inner); });
    F.charges.forEach(c => { c.id = rid('c'); if (map[c.on]) c.on = map[c.on]; if (c.inner) reId(c.inner); });
    F.subs.forEach(x => x && reId(x));
    return F;
  }

  /* Lit un champ et tout ce qu'il porte ; une partie composée est lue par un nouvel appel */
  function parseField(src, notes) {
    const { tinct, parts, lines, pieces, charges, arrs, attrRe, attrWord } = tables();
    let s = src;
    const field = H.newField(null);
    let lastT = null;
    const skip = re => { const m = s.match(re); if (m) s = s.slice(m[0].length); return m; };
    /* émail ; « du même » reprend le dernier émail énoncé, « du champ » celui du champ */
    const readT = () => {
      skip(/^\s+/);
      let id = null;
      if (bound(s, 'du même')) { s = s.slice('du même'.length); id = lastT; }
      else if (bound(s, 'du champ')) { s = s.slice('du champ'.length); id = field.t[0]; }
      else { const t = find(tinct, s); if (t) { s = s.slice(t.k.length); id = t.id; } }
      if (id) lastT = id;
      return id;
    };
    const readLine = () => { skip(/^\s+/); const l = find(lines, s); if (l) { s = s.slice(l.k.length); return l.id; } return null; };
    /* passe ce qui reste jusqu'à la prochaine virgule et le note comme non compris */
    const giveUp = why => {
      const m = s.match(/^[^,;]*/); const frag = m[0].trim();
      if (frag) notes.push(`${why} : « ${frag} »`);
      s = s.slice(m[0].length);
    };
    /* parties désignées : « au 1 », « aux 1 et 4 », « en chef et en pointe », « aux flancs » → indices des parties */
    const readPos = def => {
      const save = s, idx = [];
      const named = (def.pos || []).map((p, i) => [p, [i]]).concat(def.id === 'sautoir' ? [['aux flancs', [1, 2]]] : [])
        .sort((a, b) => b[0].length - a[0].length);
      for (;;) {
        skip(/^\s+/);
        const m = s.match(/^aux? (\d+(?:\s*,\s*\d+)*(?:\s+et\s+\d+)?)(?!\d)\s*/);
        if (m) { s = s.slice(m[0].length); m[1].split(/\s*,\s*|\s+et\s+/).forEach(n => idx.push(+n - 1)); }
        else {
          const p = named.find(([k]) => bound(s, k));
          if (!p) break;
          s = s.slice(p[0].length); idx.push(...p[1]);
        }
        if (!skip(/^\s+et\s+(?=en |à |au )/)) break;
      }
      if (!idx.length) { s = save; return null; }
      return idx.filter(i => i >= 0 && i < def.slots);
    };
    const peekPos = def => { const save = s, r = readPos(def); s = save; return !!r; };

    /* ---------- 1. le champ ---------- */
    const P = find(parts, s);
    if (P) {
      s = s.slice(P.k.length);
      const line = readLine();
      if (line) field.line = line;
      field.part = P.id;
      const def = H.PMAP[P.id], filled = new Set();
      skip(/^\s*:\s*/);
      if (peekPos(def)) {
        /* parties nommées : « au 1 d'azur, au 2 d'or » ; une partie qui porte quelque chose va jusqu'au point-virgule */
        let idx;
        while ((idx = readPos(def))) {
          const save = s, t = readT();
          if (t && /^\s*(?:[,;]|et\s|$)/.test(s)) idx.forEach(i => { field.t[i] = t; filled.add(i); });
          else {
            s = save;
            const seg = s.match(/^[^;]*/)[0];
            s = s.slice(seg.length);
            const sub = parseField(seg.trim(), notes);
            const rich = sub.part !== 'plein' || sub.pieces.length || sub.charges.length;
            if (rich && !def.compose) notes.push(`${def.name} : ses parties ne peuvent pas être composées`);
            idx.forEach((i, k) => {
              field.t[i] = sub.t[0]; filled.add(i);
              if (rich && def.compose) field.subs[i] = k ? reId(JSON.parse(JSON.stringify(sub))) : sub;
            });
          }
          const save2 = s;
          skip(/^\s*(?:[,;]\s*|et\s+)/);
          if (!peekPos(def)) { s = save2; break; }
        }
      } else {
        /* émaux dans l'ordre des parties : « parti d'or et de sable », « tiercé en fasce d'or, de gueules et d'azur » */
        for (let i = 0; i < def.slots; i++) {
          const save = s;
          skip(/^\s*,?\s*(?:et\s+)?/);
          const t = readT();
          if (!t) { s = save; break; }
          field.t[i] = t; filled.add(i);
        }
        /* écartelé de deux émaux : le premier aux 1 et 4, le second aux 2 et 3 */
        if ((P.id === 'ecartele' || P.id === 'sautoir') && filled.size === 2) { field.t[2] = field.t[1]; field.t[3] = field.t[0]; filled.add(2); filled.add(3); }
      }
      if (filled.size < def.slots) notes.push(`${def.name} : ${def.slots} émaux attendus, ${filled.size} lu${filled.size > 1 ? 's' : ''}`);
      /* « bandé d'or et d'azur de six pièces » : le nombre est celui de la partition */
      skip(/^\s*de (?:\w+|\d+) pièces/);
    } else {
      const t = readT();
      if (t) field.t[0] = t;
      else notes.push("L'émail du champ n'a pas été reconnu (« d'azur », « de gueules »…)");
    }

    /* ---------- 2. pièces et meubles ---------- */
    /* mode : à qui vont les éléments (champ, pièce ou meuble qui précède, semé) ; link : place autour de la figure principale.
       Les deux valent jusqu'à la prochaine liaison ou au prochain « à … » : « chargée d'une rose et d'une étoile » */
    let lastPiece = null, lastCharge = null, lastKind = null, mode = 'field', link = null, guard = 0, m;
    while (s.trim() && guard++ < 60) {
      skip(/^[\s,;:]+/);
      if (skip(/^(?:et\s+)?(?:sur le tout,?\s*|le tout\s+)/)) { mode = 'field'; link = null; }
      skip(/^et\s+/);
      if (!s) break;
      if (skip(/^chargée?s?(?:\s+chacune?s?)?\s+/)) { mode = lastKind === 'charge' ? 'charge' : lastPiece ? 'piece' : 'field'; link = null; }
      else if (skip(/^semée?s?\s+/)) { mode = 'seme'; link = null; }
      else {
        const L = LINKS.find(([re]) => re.test(s));
        if (L) { s = s.replace(L[0], ''); mode = 'field'; link = L[1]; }
        else if (/^(?:à |au |aux )/.test(s)) { mode = 'field'; link = null; }
      }
      /* champ qui reçoit l'élément : celui de l'écu, ou l'intérieur du meuble qui précède (« un lion chargé d'une cotice ») */
      const host = mode === 'charge' ? (lastCharge.inner = lastCharge.inner || H.newField(lastCharge.t)) : field;
      skip(/^(?:à la |à l'|au |aux |à |d'une |d'un |de la |de l'|du |des |de |d'|une |un |le |la |l'|les )/);
      let n = 1;
      const mn = s.match(/^(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|\d+)\s+/);
      if (mn) { n = NUM[mn[1]] || +mn[1]; s = s.slice(mn[0].length); }

      /* pièce honorable */
      /* le nom le plus long l'emporte : « croix ancrée » (meuble) plutôt que « croix » (pièce) */
      let pc = mode !== 'seme' && find(pieces, s), ch = find(charges, s);
      if (pc && ch) { if (ch.k.length > pc.k.length) pc = null; else ch = null; }
      if (pc) {
        s = s.slice(pc.k.length);
        const p = { id: rid('p'), type: pc.id, line: 'droite', t: null, th: 1 };
        const cnt = pc.n || n;
        if (cnt > 1) {
          if (H.MULTI_PIECES && H.MULTI_PIECES.includes(pc.id)) p.n = Math.min(4, cnt);
          else notes.push(`${cnt} ${pc.k} : une seule pièce est dessinée`);
          if (cnt > 4) notes.push(`${cnt} ${pc.k} : quatre au plus`);
        }
        if (pc.th) p.th = pc.th;
        if (skip(/^\s*renversée?s?/)) p.inv = true;
        let l;
        while ((l = readLine())) p.line = l;
        if (skip(/^\s*de l'un en l'autre/)) { p.ual = true; p.t = 'argent'; }
        /* « componée d'argent et de gueules » : émail de la pièce, puis celui des compons */
        else if (skip(/^\s*componée?s?\s+/)) { p.t = readT(); skip(/^\s*et\s+/); const c2 = readT(); if (c2 && c2 !== p.t) p.comp = c2; }
        else p.t = readT();
        if (!p.t) giveUp('Émail de la pièce non compris');
        /* plan : brochant sur le tout, ou sous le tout */
        if (skip(/^\s*brochant(?:e?s?)?(?:\s+sur le tout)?/)) p.broch = true;
        else if (skip(/^\s*sous le tout/)) p.sous = true;
        host.pieces.push(p);
        if (host === field) { lastPiece = p; lastKind = 'piece'; }
        continue;
      }
      if (!ch) { giveUp('Non compris'); continue; }

      /* meuble */
      s = s.slice(ch.k.length);
      const def = H.CMAP[ch.id];
      const c = { id: rid('c'), type: ch.id, t: null, arr: '1', n: 1, on: 'field', scale: 1 };
      /* position, contourné, renversé : avant l'émail */
      for (let k = 0; k < 6; k++) {
        skip(/^\s+/);
        const v = def.variants.find(x => x.adj && x.adj.some(a => a && bound(s, a.toLowerCase())));
        if (v) { const a = v.adj.filter(Boolean).map(x => x.toLowerCase()).sort((x, y) => y.length - x.length).find(x => bound(s, x)); s = s.slice(a.length); c.variant = v.id; continue; }
        if (skip(/^contournée?s?(?:\s+et\s+)?/)) { c.flip = true; continue; }
        if (skip(/^renversée?s?(?:\s+et\s+)?/)) { c.invert = true; continue; }
        break;
      }
      if (skip(/^\s*de l'un en l'autre/)) { c.ual = true; c.t = 'argent'; }
      else if (skip(/^\s*de l'un et de l'autre/)) { c.uet = true; c.t = 'argent'; }
      else c.t = readT();
      if (!c.t) { giveUp(`Émail de « ${ch.k} » non compris`); }
      /* « posé en bande » : le meuble est incliné */
      if ((m = s.match(/^\s*posée?s?\s+en\s+(pal|bande|barre|fasce)(?![a-zà-ÿ])/))) { s = s.slice(m[0].length); c.rot = ROT[m[1]]; }
      /* attributs : « armé et lampassé de gueules, couronné d'or »… chaque terme va à la partie du meuble qui le porte */
      const v = H.variantOf(c);
      let am;
      while ((am = s.match(attrRe))) {
        const terms = am[0];
        s = s.slice(am[0].length);
        const t = readT();
        if (!t) { notes.push(`Émail manquant après « ${terms.trim()} »`); break; }
        terms.match(attrWord).forEach(w => {
          const k = attrTarget(v, w.replace(/s$/, '').replace(/e$/, ''));
          if (!k) notes.push(`« ${w} » : ce meuble n'a pas cette partie`);
          else if (k.startsWith('x:')) c.extras = Object.assign({}, c.extras, { [k.slice(2)]: t });
          else c[k] = t;
        });
      }
      if (skip(/^,?\s*les chairs de carnation/)) c.peau = 'claire';
      /* mouvant du chef, de la pointe, des flancs… */
      if ((m = s.match(/^,?\s*mouvante?s?\s+(du chef|de la pointe|du flanc dextre|du flanc senestre|du canton dextre du chef|du canton senestre du chef|des flancs|du trait)/))) {
        s = s.slice(m[0].length);
        c.mv = Object.keys(H.MOUVANTS).find(k => H.MOUVANTS[k] === m[1]);
      }
      /* « de fleurs de lis d'or sans nombre » : un semé */
      const seme = mode === 'seme' || !!skip(/^\s*sans nombre/);
      /* disposition */
      let arr = null;
      const e = arrs.find(a => a.re.test(s));
      if (e) { s = s.replace(e.re, ''); arr = pickArr(e, n); }
      if (mode === 'piece') {
        /* semé sur une pièce qui peut être composée (chef, canton…) : il va dans son champ */
        if (seme && H.PCMAP[lastPiece.type].box) {
          c.arr = 'seme';
          (lastPiece.inner = lastPiece.inner || H.newField(lastPiece.t)).charges.push(c);
          continue;
        }
        c.on = lastPiece.id; c.n = n;
      } else if (seme) c.arr = 'seme';
      else if (link && link !== 'acc') {
        /* accosté : de part et d'autre d'un pal, d'une bande ou d'une barre ; sinon les deux meubles sont rangés en fasce */
        c.arr = link === 'accoste' && !H.tiedPiece(host, { accoste: true }) ? '2fasce' : link;
      } else {
        c.arr = arr || { 1: '1', 2: '2fasce', 3: '3', 4: '4', 5: '5', 6: '6' }[n] || '6';
        if (c.arr === 'orle' && n !== H.ARR.orle.n && n >= 4) c.orn = n;
        if (n > 6 && !arr) notes.push(`${n} ${ch.k} : six au plus dans le champ (ou semé)`);
      }
      host.charges.push(c);
      if (host === field) { lastCharge = c; lastKind = 'charge'; }
    }
    if (guard >= 60) notes.push('Phrase trop longue : la fin a été ignorée');
    return field;
  }

  H.parseBlazon = function (text) {
    const notes = [];
    const s = String(text || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ')
      .replace(/\s*([,;:])\s*/g, '$1 ').trim().replace(/[.!]+$/, '').trim().replace(/\s+plain$/, '');
    if (!s) return { state: { v: 2, shape: 'moderne', field: H.newField(null) }, notes, empty: true };
    return { state: { v: 2, shape: 'moderne', field: parseField(s, notes) }, notes };
  };
})(window.H);
