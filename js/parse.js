/* Blasonnement → blason : lecture d'une phrase héraldique, de gauche à droite.
   1. le champ : émail seul, ou partition + trait + émaux ;
   2. les éléments : « à / au / aux » + nombre + pièce ou meuble + trait / position + émail + attributs + disposition ;
      « chargé de … » se rapporte à la pièce qui précède, « semé de … » au champ.
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
    /* trait : toutes les formes accordées (crénelé, crénelée, crénelés, crénelées) */
    const lines = [];
    H.LINES.forEach(l => {
      if (!l.m) return;
      const forms = l.inv ? [l.m] : ['', 'e', 's', 'es'].map(e => (l.m.includes('{e}') ? l.m.replace(/\{e\}/g, e) : l.m + e));
      forms.forEach(f => lines.push({ k: f.toLowerCase(), id: l.id }));
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
    T = { tinct, parts, lines, pieces, charges };
    return T;
  }
  const find = (list, s) => list.find(e => bound(s, e.k));

  H.parseBlazon = function (text) {
    const { tinct, parts, lines, pieces, charges } = tables();
    const notes = [];
    let s = String(text || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ')
      .replace(/\s*([,;:])\s*/g, '$1 ').trim().replace(/[.!]+$/, '').trim().replace(/\s+plain$/, '');
    const field = H.newField(null);
    const state = { v: 2, shape: 'moderne', field };
    const skip = re => { const m = s.match(re); if (m) s = s.slice(m[0].length); return m; };
    const readT = () => { skip(/^\s+/); const t = find(tinct, s); if (t) s = s.slice(t.k.length); return t ? t.id : null; };
    const readLine = () => { skip(/^\s+/); const l = find(lines, s); if (l) { s = s.slice(l.k.length); return l.id; } return null; };
    /* passe ce qui reste jusqu'à la prochaine virgule et le note comme non compris */
    const giveUp = why => {
      const m = s.match(/^[^,;]*/); const frag = m[0].trim();
      if (frag) notes.push(`${why} : « ${frag} »`);
      s = s.slice(m[0].length);
    };
    if (!s) return { state, notes, empty: true };

    /* ---------- 1. le champ ---------- */
    const P = find(parts, s);
    if (P) {
      s = s.slice(P.k.length);
      const line = readLine();
      if (line) field.line = line;
      field.part = P.id;
      const def = H.PMAP[P.id];
      /* émaux de la partition, dans l'ordre des parties ; on accepte « : au 1 … », « en chef … » devant chacun */
      const want = P.id === 'ecartele' || P.id === 'sautoir' ? 2 : def.slots;
      const got = [];
      for (let i = 0; i < want; i++) {
        skip(/^[\s,:;]+|^et\s+/); skip(/^et\s+/);
        skip(/^(?:aux?\s+\d+(?:\s*(?:,|et)\s*\d+)*\s+)/);
        (def.pos || []).slice().sort((a, b) => b.length - a.length).some(p => { if (bound(s, p)) { s = s.slice(p.length); return true; } return false; });
        const t = readT();
        if (!t) break;
        got.push(t);
      }
      if (P.id === 'ecartele' || P.id === 'sautoir') field.t = got.length === 2 ? [got[0], got[1], got[1], got[0]] : [got[0] || null, got[1] || null, got[2] || null, got[3] || null];
      else got.forEach((t, i) => (field.t[i] = t));
      if (got.length < want) notes.push(`${def.name} : ${want} émaux attendus, ${got.length} lu${got.length > 1 ? 's' : ''}`);
    } else {
      const t = readT();
      if (t) field.t[0] = t;
      else notes.push("L'émail du champ n'a pas été reconnu (« d'azur », « de gueules »…)");
    }

    /* ---------- 2. pièces et meubles ---------- */
    let lastPiece = null, guard = 0;
    while (s.trim() && guard++ < 60) {
      skip(/^[\s,;:]+/);
      skip(/^(?:et\s+)?(?:sur le tout,?\s*|le tout\s+)/); skip(/^et\s+/);
      if (!s) break;
      /* liaison : sur la pièce précédente, semé sur le champ, ou accompagnement (champ) */
      let mode = 'field', link = null, m;
      if (skip(/^chargée?s?(?:\s+chacune?s?)?\s+/)) mode = lastPiece ? 'piece' : 'field';
      else if (skip(/^semée?s?\s+/)) mode = 'seme';
      else if (skip(/^(?:accompagnée?s?)\s+/)) mode = 'field';
      /* cantonné (entre les bras d'une croix) et accosté (de part et d'autre d'un pal, d'une bande ou d'une barre) */
      else if (skip(/^cantonnée?s?\s+/)) { mode = 'field'; link = 'canton'; }
      else if ((m = s.match(/^accostée?s?(?:\s+en\s+(chef|pointe))?\s+/))) { s = s.slice(m[0].length); mode = 'field'; link = m[1] ? 'accoste-' + m[1] : 'accoste'; }
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
        else p.t = readT();
        if (!p.t) giveUp('Émail de la pièce non compris');
        /* plan : brochant sur le tout, ou sous le tout */
        if (skip(/^\s*brochant(?:e?s?)?(?:\s+sur le tout)?/)) p.broch = true;
        else if (skip(/^\s*sous le tout/)) p.sous = true;
        field.pieces.push(p);
        lastPiece = p;
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
      /* attributs : armé, lampassé, langué, accorné… de tel émail */
      const ATTR = /^,?\s*((?:armé|lampassé|langué|accorné|onglé|défendu|ramé|membré|crêté|loré|becqué|couronné|colleté|clariné)e?s?)(?:\s*,\s*|\s+et\s+)?((?:armé|lampassé|langué|accorné|onglé|défendu|ramé|membré|crêté|loré|becqué|couronné|colleté|clariné)e?s?(?:\s*,\s*|\s+et\s+)?)*\s*/;
      let am;
      while ((am = s.match(ATTR))) {
        const terms = am[0];
        s = s.slice(am[0].length);
        const t = readT();
        if (!t) { notes.push(`Émail manquant après « ${terms.trim()} »`); break; }
        if (/lampass|langu/.test(terms)) c.langue = t;
        if (/armé|accorn|onglé|défendu|ramé|membré|crêté|loré|becqué/.test(terms)) c.armes = t;
      }
      if (skip(/^,?\s*les chairs de carnation/)) c.peau = 'claire';
      /* mouvant du chef, de la pointe, des flancs… */
      if ((m = s.match(/^,?\s*mouvante?s?\s+(du chef|de la pointe|du flanc dextre|du flanc senestre|du canton dextre du chef|du canton senestre du chef|des flancs|du trait)/))) {
        s = s.slice(m[0].length);
        c.mv = Object.keys(H.MOUVANTS).find(k => H.MOUVANTS[k] === m[1]);
      }
      /* disposition */
      const ARRS = [[/^,?\s*2,? et 1/, '3'], [/^,?\s*1 et 2/, '3b'], [/^,?\s*2 et 2/, '4'], [/^,?\s*2, 1 et 2/, '5'], [/^,?\s*3, 2 et 1/, '6'],
        [/^,?\s*(?:rangée?s?\s+)?en pal|^,?\s*l'une? sur l'autre/, n === 3 ? '3pal' : '2pal'], [/^,?\s*(?:rangée?s?\s+)?en fasce/, n === 3 ? '3fasce' : '2fasce'],
        [/^,?\s*(?:rangée?s?\s+)?en bande/, '3bande'], [/^,?\s*(?:rangée?s?\s+)?en chef/, n === 1 ? 'chef1' : 'chef3'], [/^,?\s*en pointe/, 'pointe1'], [/^,?\s*en orle/, 'orle']];
      let arr = null;
      for (const [re, a] of ARRS) if (skip(re)) { arr = a; break; }
      if (link && mode !== 'piece') c.arr = link;
      else if (mode === 'seme') c.arr = 'seme';
      else if (mode === 'piece') { c.on = lastPiece.id; c.n = n; }
      else {
        c.arr = arr || { 1: '1', 2: '2fasce', 3: '3', 4: '4', 5: '5', 6: '6' }[n] || '6';
        if (n > 6 && !arr) notes.push(`${n} ${ch.k} : six au plus dans le champ (ou semé)`);
      }
      field.charges.push(c);
    }
    if (guard >= 60) notes.push('Phrase trop longue : la fin a été ignorée');
    return { state, notes };
  };
})(window.H);
