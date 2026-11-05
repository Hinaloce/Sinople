/* Règles héraldiques (contrariété des émaux) et blasonnement en français — champs imbriqués */
(function (H) {
  const uniq = a => a.filter((v, i) => v && a.indexOf(v) === i);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const low = s => s.charAt(0).toLowerCase() + s.slice(1);
  const NUM = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt'];
  const isComposed = (F, k) => { const P = H.PMAP[F.part]; return P.compose && k < P.slots && F.subs && F.subs[k]; };

  /* ---------- Parcours de l'arbre ---------- */
  H.eachField = function (F, ctx, fn, label) {
    fn(F, ctx, label || '');
    const P = H.PMAP[F.part];
    if (P.compose) for (let k = 0; k < P.slots; k++) if (F.subs && F.subs[k]) {
      const sc = H.slotCtx(F, ctx, k);
      if (sc) H.eachField(F.subs[k], sc, fn, (label ? label + ' › ' : '') + P.labels[k]);
    }
    F.pieces.forEach(p => {
      if (!p.inner) return;
      const pc = H.pieceCtx(F, ctx, p);
      if (pc) H.eachField(p.inner, pc, fn, (label ? label + ' › ' : '') + H.PCMAP[p.type].name);
    });
    F.charges.forEach(c => {
      if (c.inner) H.eachField(c.inner, H.chargeCtx(F, ctx, c), fn, (label ? label + ' › ' : '') + H.CMAP[c.type].name);
    });
  };
  /* Trouve le champ et l'objet (pièce ou meuble) d'identifiant id */
  H.findItem = function (S, id) {
    let res = null;
    H.eachField(S.field, H.rootCtx(S.shape), (F, ctx) => {
      if (res) return;
      const p = F.pieces.find(x => x.id === id), c = F.charges.find(x => x.id === id);
      if (p || c) res = { F, ctx, item: p || c, kind: p ? 'piece' : 'charge' };
    });
    return res;
  };

  /* Émail visible au point (x,y) dans le champ F, en ne considérant que les pièces d'indice < upto */
  function tinctAt(F, ctx, x, y, upto) {
    for (let i = Math.min(upto, F.pieces.length) - 1; i >= 0; i--) {
      const p = F.pieces[i];
      if (H.pieceContains(H.pieceGeom(p, ctx.B), x, y)) {
        if (p.inner) { const pc = H.pieceCtx(F, ctx, p); if (pc) return tinctAt(p.inner, pc, x, y, 1e9); }
        return p.t;
      }
    }
    const k = H.slotAt(F.part, ctx.B, x, y);
    if (isComposed(F, k)) { const sc = H.slotCtx(F, ctx, k); if (sc) return tinctAt(F.subs[k], sc, x, y, 1e9); }
    return F.t[k] || F.t[0];
  }

  /* Chemin vers la partie composée la plus profonde au point (x,y) */
  H.pathAt = function (S, x, y) {
    let F = S.field, ctx = H.rootCtx(S.shape);
    const path = [];
    if (!ctx.inside(x, y)) return path;
    for (let guard = 0; guard < 12; guard++) {
      let next = null;
      for (let i = F.pieces.length - 1; i >= 0; i--) {
        const p = F.pieces[i];
        if (H.pieceContains(H.pieceGeom(p, ctx.B), x, y)) { if (p.inner) next = { step: p.id, F: p.inner, ctx: H.pieceCtx(F, ctx, p) }; else next = 'stop'; break; }
      }
      if (!next) {
        const k = H.slotAt(F.part, ctx.B, x, y);
        if (isComposed(F, k)) next = { step: 's' + k, F: F.subs[k], ctx: H.slotCtx(F, ctx, k) };
      }
      if (!next || next === 'stop' || !next.ctx) break;
      path.push(next.step); F = next.F; ctx = next.ctx;
    }
    return path;
  };

  const ruleTxt = t => (H.cls(t) === 'metal' ? 'métal sur métal' : 'couleur sur couleur');
  H.analyze = function (S) {
    const under = {}, warnings = [];
    H.eachField(S.field, H.rootCtx(S.shape), (F, ctx, label) => {
      const pre = label ? label + ' : ' : '';
      const P = H.PMAP[F.part], t = F.t;
      P.adj.forEach(([i, j]) => {
        if (isComposed(F, i) || isComposed(F, j)) return;
        if (H.conflicts(t[i], [t[j]])) warnings.push({ msg: `${pre}champ ${H.TMAP[t[i]].name.toLowerCase()} contre ${H.TMAP[t[j]].name.toLowerCase()} — ${H.cls(t[i]) === 'metal' ? 'métal contre métal' : 'couleur contre couleur'}.` });
      });
      F.pieces.forEach((p, i) => {
        /* pièce traversant un meuble : elle broche, la règle des émaux ne s'y applique pas */
        if (ctx.local && H.THROUGH.includes(p.type)) return;
        const pts = H.anchors(H.pieceGeom(p, ctx.B), 3).pts;
        const U = uniq(pts.map(([x, y]) => tinctAt(F, ctx, x, y, i)));
        under[p.id] = U;
        const pt = H.pieceT(p);
        if (!(p.ual && H.twoTone(F)) && H.conflicts(pt, U)) warnings.push({ id: p.id, msg: `${pre}${H.pieceNoun(p).txt} ${H.tDe(pt)} sur fond ${H.tDe(U[0])} — ${ruleTxt(pt)}.` });
      });
      F.charges.forEach(c => {
        const pos = H.chargePos(F, ctx.B, c);
        const U = pos.onPiece ? uniq([H.pieceT(pos.onPiece)]) : uniq(pos.pts.slice(0, 14).map(([x, y]) => tinctAt(F, ctx, x, y, F.pieces.length)));
        under[c.id] = U;
        const ct = H.chargeT(c);
        if (!((c.ual || c.uet) && H.twoTone(F)) && H.conflicts(ct, U)) warnings.push({ id: c.id, msg: `${pre}${H.CMAP[c.type].sg} ${H.tDe(ct)} sur fond ${H.tDe(U[0])} — ${ruleTxt(ct)}.` });
      });
    });
    return { warnings, under };
  };

  const ORDER = ['or', 'argent', 'gueules', 'azur', 'sable', 'sinople', 'pourpre'];
  /* Corrige un seul objet (pièce ou meuble) s'il enfreint la règle */
  H.fixItem = function (S, id) {
    const a = H.analyze(S), f = H.findItem(S, id);
    if (!f) return;
    const U = a.under[id] || [], it = f.item;
    if ((it.ual || it.uet) && H.twoTone(f.F)) return;   /* de l'un en l'autre : l'émail suit celui des parties */
    const cur = f.kind === 'piece' ? H.pieceT(it) : H.chargeT(it);
    if (!H.conflicts(cur, U)) return;
    const nt = ORDER.find(o => !H.conflicts(o, U));
    if (!nt) return;
    it.t = nt;
    if (it.inner && it.inner.part === 'plein') it.inner.t[0] = nt;
  };
  /* Corrige tout le blason (action explicite de l'utilisateur) */
  H.autofix = function (S) {
    for (let pass = 0; pass < 3; pass++) {
      H.eachField(S.field, H.rootCtx(S.shape), F => {
        const P = H.PMAP[F.part];
        P.adj.forEach(([i, j]) => {
          if (isComposed(F, i) || isComposed(F, j)) return;
          if (H.conflicts(F.t[j], [F.t[i]])) {
            const want = H.cls(F.t[i]) === 'metal' ? 'color' : 'metal';
            F.t[j] = ORDER.find(o => H.cls(o) === want && !F.t.slice(0, P.slots).includes(o)) || ORDER.find(o => H.cls(o) === want);
          }
        });
      });
      const a = H.analyze(S);
      a.warnings.forEach(w => { if (w.id) H.fixItem(S, w.id); });
    }
  };

  /* ---------- Blasonnement ---------- */
  /* Contexte du champ en cours de description : last est le dernier émail énoncé, field l'émail du champ (s'il est plein),
     abime les meubles centraux accompagnés d'autres meubles. Chaque champ imbriqué a le sien. */
  let E = { last: null, field: null, abime: null, two: false };
  const inField = (F, last, fn) => {
    const saved = E;
    E = { last: last || null, field: F.part === 'plein' ? F.t[0] : null, abime: null, two: H.twoTone(F) };
    try { return fn(F); } finally { E = saved; }
  };
  /* Émail d'une figure : « du même » s'il répète celui qui vient d'être énoncé, « du champ » s'il est celui du champ */
  const em = id => {
    const s = !id ? H.tDe(id) : id === E.last ? 'du même' : id === E.field ? 'du champ' : H.tDe(id);
    E.last = id;
    return s;
  };
  const numWord =(n, g) => (n === 1 ? (g === 'f' ? 'une' : 'un') : NUM[n] || String(n));
  const deArt = w => (/^[aeiouyéèêh]/i.test(w) && w !== 'huit' && w !== 'onze' ? "d'" : 'de ') + w;
  /* « armé et lampassé de gueules », « armé d'azur et lampassé de gueules »… */
  function attrText(c, v, g, n) {
    const agree = term => term + (g === 'f' ? 'e' : '') + (n > 1 ? 's' : '');
    const A = c.armes && v.cp.has.armes ? c.armes : null, L = c.langue && v.cp.has.langue ? c.langue : null;
    /* particularités d'un autre émail que le meuble : couronne, bec, armes, langue, puis pattes, cornes, sabots, crête.
       Les termes de même émail sont réunis : « becqué, armé et langué de gueules, couronné d'or » */
    const entries = [];
    const add = (term, t) => { if (t) entries.push([agree(term), t]); };
    const extra = id => add(v.extraTermes[id], v.cp.has[id] && c.extras && c.extras[id]);
    extra('couronne'); extra('bec'); add(v.armesTerme, A); add(v.langueTerme, L);
    H.EXTRAS.filter(x => x.id !== 'couronne' && x.id !== 'bec').forEach(x => extra(x.id));
    const groups = [];
    entries.forEach(([term, t]) => {
      let grp = groups.find(q => q.t === t);
      if (!grp) groups.push(grp = { t, terms: [] });
      grp.terms.push(term);
    });
    const list = a => a.slice(0, -1).join(', ') + (a.length > 1 ? ' et ' : '') + a[a.length - 1];
    /* « couronné d'or, armé et lampassé de gueules » : pas de second « et » quand un groupe en a déjà un */
    const parts = groups.map(q => `${list(q.terms)} ${H.tDe(q.t)}`);
    const s = groups.length ? ', ' + (groups.some(q => q.terms.length > 1) ? parts.join(', ') : list(parts)) : '';
    /* après « armé de … », « du même » ne désignerait plus clairement l'émail du meuble */
    if (groups.length) E.last = null;
    /* peau d'une autre couleur que le meuble : « les chairs de carnation » */
    /* cheveux d'un autre émail : « chevelé de … » ; auréole (d'or par défaut) : « nimbé de … » si elle diffère du meuble */
    const halo = c.aureole || 'or';
    const P = (c.peau && v.cp.has.peau && H.SKIN_MAP[c.peau] ? ', les chairs de carnation' : '') +
      (c.cheveux && v.cp.has.cheveux ? `, ${agree('chevelé')} ${H.tDe(c.cheveux)}` : '') +
      (v.cp.has.aureole && halo !== c.t ? `, ${agree('nimbé')} ${H.tDe(halo)}` : '');
    return s + P;
  }
  /* Orientation d'un meuble : le dessin est « en pal » ; incliné de 45° vers dextre, « en bande » (la tête vers le chef dextre),
     vers senestre, « en barre » ; couché, « en fasce ». Autres angles : rien n'est dit. */
  H.orientOf = rot => { const r = +rot || 0; return Math.abs(r + 45) <= 15 ? 'bande' : Math.abs(r - 45) <= 15 ? 'barre' : Math.abs(r) >= 75 ? 'fasce' : null; };
  function chargeCore(c, n) {
    const d = H.CMAP[c.type], v = H.variantOf(c);
    const alt = d.alt && H.cls(c.t) !== 'metal' ? d.alt : d;
    const orient = H.orientOf(c.rot);
    let adj = v.adj ? (n > 1 ? v.adj[1] : v.adj[0]) : '';
    /* « épée en pal » penchée de 45° devient « épée posée en barre » : la pose remplace l'orientation de la position */
    if (orient && /^en (pal|bande|barre|fasce)$/.test(adj)) adj = '';
    const agree = term => term + (d.g === 'f' ? 'e' : '') + (n > 1 ? 's' : '');
    const fl =[c.flip ? agree('contourné') : '', c.invert ? agree(d.renverse || 'renversé') : ''].filter(Boolean).join(' et ');
    const head = `${n > 1 ? alt.pl : alt.sg}${adj ? ' ' + adj : ''}${fl ? ' ' + fl : ''}`;
    /* « de l'un en l'autre » (une figure sur le trait) et « de l'un et de l'autre » (deux figures de part et d'autre) */
    const uet = E.two && c.uet && n > 1, ual = E.two && c.ual && !uet;
    /* intérieur composé : « un lion parti d'or et d'azur », « un lion d'or chargé d'une cotice de gueules » */
    /* les pièces traversantes ne « chargent » pas le meuble : elles sont dites à part, « brochant » (throughText) */
    const inner = c.inner && H.splitInner(c.inner).inside;
    let tinct, items = '';
    if (inner) {
      if (inner.part === 'plein') { tinct = em(inner.t[0]); items = inField(inner, inner.t[0], itemsDe); }
      /* la partition s'accorde avec le meuble : « une aigle partie », « trois lions coupés » */
      else { tinct = low(fieldText(inner)).replace(/^[^\s,:]+/, w => agree(w)); E.last = null; items = inField(c.inner, null, () => itemsDe(inner)); }
    } else tinct = uet || ual ? (E.last = null, uet ? "de l'un et de l'autre" : "de l'un en l'autre") : em(c.t);
    const pose = orient ? ` ${agree('posé')} en ${orient}` : '';
    /* mouvant : dit seulement si le bord est choisi et n'est pas celui que le meuble a d'office (pont, haie, arc-en-ciel) */
    const mv = c.mv && c.mv !== 'non' && c.mv !== d.mouvant && H.MOUVANTS[c.mv] ? ` ${agree('mouvant')} ${H.MOUVANTS[c.mv]}` : '';
    const attrs = attrText(c, v, d.g, n);
    /* plusieurs meubles : « chargés chacun d'une cotice » */
    const charged = items ? `${attrs || inner.part !== 'plein' ? ',' : ''} ${agree('chargé')}${n > 1 ? (d.g === 'f' ? ' chacune' : ' chacun') : ''} ${items}` : '';
    if (items) E.last = null;
    return `${head} ${tinct}${pose}${attrs}${charged}${mv}`;
  }
  /* mode : « none » (la position est déjà dite par « surmonté », « adextré »…), « inline » (« une étoile en pointe »,
     sans virgule) ; par défaut : « , en chef », « , 2 et 1 » */
  function chargeArr(c, mode) {
    if (c.on && c.on !== 'field') return '';
    if (mode === 'none') return '';
    /* « mouvant du chef »… dit déjà où est la figure */
    if (c.mv && c.mv !== 'non' && c.mv !== 'flancs') return '';
    const sep = mode === 'inline' ? ' ' : ', ';
    if (E.abime && E.abime.has(c.id)) return sep + 'en abîme';
    const a = H.ARR[c.arr] || H.ARR['1'];
    if (a.orle) return sep + 'en orle';
    /* « cantonné » et « accosté » ne se disent que par rapport à leur pièce (accompany) ; seuls, ils se rangent comme leurs places */
    if (a.canton) return sep + '2 et 2';
    if (a.accoste) return sep + (H.CMAP[c.type].g === 'f' ? 'rangées' : 'rangés') + ' en ' + (a.along ? (a.along < 0 ? 'chef' : 'pointe') : 'fasce');
    if (!a.txt || a.seme) return '';
    return sep + (H.CMAP[c.type].g === 'f' ? a.txt.replace('rangés', 'rangées') : a.txt);
  }
  /* pièces traversant un meuble : « …, à la bande de gueules brochant sur le tout » (sur chacun, s'ils sont plusieurs) */
  const throughText = (c, n) => {
    if (!c.inner) return '';
    const th = H.splitInner(c.inner).through;
    if (!th.length) return '';
    E.last = null;
    return th.map(p => ', ' + inField(c.inner, null, () => pieceText(c.inner, p, 'a')) + (n > 1 ? ' brochant sur chacun' : ' brochant sur le tout')).join('');
  };
  const chargeA = c => {
    const n = H.chargeCount(c), d = H.CMAP[c.type];
    if (n === 0) { const core = chargeCore(c, 2); return (/^[aeéèêiîoôuhy]/i.test(core) ? "semé d'" : 'semé de ') + core; }
    const core = chargeCore(c, n);
    /* le lion et l'aigle seuls prennent l'article défini : « au lion », « à l'aigle » */
    if (n === 1 && d.defini) return `${/^[aeiouyéèêh]/i.test(core) ? "à l'" : d.g === 'f' ? 'à la ' : 'au '}${core}${chargeArr(c)}${throughText(c, n)}`;
    return `à ${numWord(n, d.g)} ${core}${chargeArr(c)}${throughText(c, n)}`;
  };
  const chargeDe = (c, arrMode) => {
    const n = H.chargeCount(c), d = H.CMAP[c.type];
    if (n === 0) return `de ${chargeCore(c, 2)} sans nombre`;
    return `${deArt(numWord(n, d.g))} ${chargeCore(c, n)}${chargeArr(c, arrMode)}${throughText(c, n)}`;
  };

  /* ---------- Ordre et accompagnement des figures ---------- */
  /* Importance d'un meuble du champ : les plus grands d'abord ; à taille égale, celui du cœur, puis du chef vers la pointe
     et de dextre vers senestre. L'ordre de la liste ne sert qu'à départager le reste. */
  const sizeOf = c => Math.round((H.ARR[c.arr] || H.ARR['1']).s * (c.scale || 1) * 20);
  const centroid = c => {
    const a = H.ARR[c.arr] || H.ARR['1'], p = a.pts || [[0, 0]];
    return [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length].map(v => Math.round(v * 20));
  };
  const byImportance = list => list.map((c, i) => ({ c, i, k: centroid(c) })).sort((a, b) =>
    sizeOf(b.c) - sizeOf(a.c) || (b.c.arr === '1') - (a.c.arr === '1') || a.k[1] - b.k[1] || a.k[0] - b.k[0] || a.i - b.i).map(o => o.c);
  /* Place d'un meuble par rapport à la figure principale : terme (accordé avec elle) et précision ajoutée.
     Les autres dispositions se disent « accompagné de … » avec leur disposition. */
  const POSITION = {
    chef1: ['surmonté', ''], p4: ['adextré', ''], p6: ['senestré', ''], '2fasce': ['accosté', ''],
    p1: ['adextré', ' en chef'], p3: ['senestré', ' en chef'], p7: ['adextré', ' en pointe'], p9: ['senestré', ' en pointe'],
    canton: ['cantonné', ''], accoste: ['accosté', ''], 'accoste-chef': ['accosté', ' en chef'], 'accoste-pointe': ['accosté', ' en pointe']
  };
  /* Qualificatifs d'une figure principale à partir des meubles qui l'entourent : renvoie une fonction (genre, pluriel) → texte.
     Les meubles de même place sont réunis : « accompagné de trois étoiles et d'un croissant ». */
  const accompany = (list, main) => (g, pl) => {
    const groups = [];
    list.forEach(c => {
      const a = H.ARR[c.arr] || {};
      /* cantonné (croix, sautoir) et accosté (pal, bande, barre) : seulement si la pièce principale convient */
      const tied = (a.canton || a.accoste) && !(main && H.tiedPiece({ pieces: [main] }, a));
      const pos = (c.on && c.on !== 'field') || tied ? null : POSITION[c.arr], key = pos ? pos[0] + pos[1] : 'accompagné';
      let grp = groups.find(q => q.key === key);
      if (!grp) groups.push(grp = { key, pos, items: [] });
      grp.items.push(c);
    });
    /* le texte est produit dans l'ordre de lecture, pour que « du même » désigne le bon émail */
    const txt = groups.map(q => {
      const term = (q.pos ? q.pos[0] : 'accompagné') + (g === 'f' ? 'e' : '') + (pl ? 's' : '') + (q.pos ? q.pos[1] : '');
      return `${term} ${q.items.map(c => chargeDe(c, q.pos ? 'none' : /^(en|au) /.test((H.ARR[c.arr] || {}).txt || '') ? 'inline' : undefined)).join(' et ')}`;
    });
    return txt.slice(0, -1).join(', ') + (txt.length > 1 ? ' et ' : '') + txt[txt.length - 1];
  };

  /* Description d'une pièce ; mode 'a' : « à la fasce… », 'de' : « d'une fasce… » */
  /* Pièces multiples : nom, genre et suffixe selon le nombre (à quatre, la pièce diminuée change de nom) */
  const MULTI = {
    pal: { 2: ['pals', 'm'], 3: ['pals', 'm'], 4: ['vergettes', 'f'] },
    fasce: { 2: ['fasces', 'f'], 3: ['fasces', 'f'], 4: ['burelles', 'f'] },
    bande: { 2: ['bandes', 'f'], 3: ['bandes', 'f'], 4: ['cotices', 'f'] },
    barre: { 2: ['barres', 'f'], 3: ['barres', 'f'], 4: ['cotices', 'f', ' en barre'] }
  };
  /* nom d'une pièce, avec son trait et son nombre : « fasce ondée », « trois fasces ondées », « quatre cotices en barre » */
  /* Pièce seule et mince (épaisseur ≤ 0,6) : elle prend son nom diminutif (vergette, burelle, cotice) */
  const DIM = { pal: ['vergette', 'f'], fasce: ['burelle', 'f'], bande: ['cotice', 'f'], barre: ['cotice', 'f', ' en barre'] };
  H.pieceNoun = function (p) {
    const d = H.PCMAP[p.type], n = p.n || 1, m = n > 1 && MULTI[p.type] && MULTI[p.type][n];
    if (!m) {
      const dim = n === 1 && (p.th || 1) <= 0.6 && DIM[p.type], g = dim ? dim[1] : d.g, ln = H.lineAdj(p.line, g);
      const inv = p.inv && p.type === 'chevron' ? ' renversé' : '';
      return { txt: (dim ? dim[0] : d.name.toLowerCase()) + inv + (ln ? ' ' + ln : '') + (dim && dim[2] ? dim[2] : ''), g, pl: false, n: 1, dim: !!dim };
    }
    const ln = H.lineAdj(p.line, m[1], true);
    return { txt: `${NUM[n]} ${m[0]}${ln ? ' ' + ln : ''}${m[2] || ''}`, g: m[1], pl: true, n };
  };
  /* acc : (genre, pluriel) → qualificatifs des meubles qui entourent la pièce, dits avant « chargée de… » :
     « à la croix de gueules accompagnée de quatre étoiles d'or et chargée d'une rose d'argent » */
  function pieceText(F, p, mode, acc, depth) {
    const d = H.PCMAP[p.type], pn = H.pieceNoun(p);
    /* écusson portant lui-même un écusson : « sur le tout du tout » (et ainsi de suite, un « du tout » par niveau) */
    if (p.type === 'ecusson' && p.inner && p.inner.pieces.some(q => q.type === 'ecusson')) {
      const lvl = depth || 1, nest = p.inner.pieces.filter(q => q.type === 'ecusson');
      const inner = Object.assign({}, p.inner, { pieces: p.inner.pieces.filter(q => !nest.includes(q)) });
      let res = pieceText(F, Object.assign({}, p, { inner }), mode, acc, lvl);
      nest.forEach(q => { res += `, sur le tout${' du tout'.repeat(lvl)}, ` + inField(p.inner, null, () => pieceText(p.inner, q, 'a', null, lvl + 1)); });
      return res;
    }
    if (pn.pl) {
      const head = (mode === 'de' ? 'de ' : 'à ') + pn.txt;
      const on = F.charges.filter(c => c.on === p.id);
      const ch = pn.g === 'f' ? 'chargées chacune' : 'chargés chacun';
      const tinct = em(p.t), around = acc ? ' ' + acc(pn.g, true) : '';
      return `${head} ${tinct}${around}${on.length ? (around ? ' et ' : ' ') + ch + ' ' + on.map(chargeDe).join(' et ') : ''}`;
    }
    const art = mode === 'de' ? (pn.g === 'f' ? "d'une " : "d'un ") : d.v ? "à l'" : pn.g === 'f' ? 'à la ' : 'au ';
    const head = p.type === 'ente' ? 'enté en pointe' : `${art}${pn.txt}`;
    const charged = pn.g === 'f' ? 'chargée' : 'chargé';
    if (p.inner) {
      const inner = p.inner;
      if (inner.part === 'plein') {
        const tinct = em(inner.t[0]), items = inField(inner, inner.t[0], itemsDe);
        return `${head} ${tinct}${items ? ' ' + charged + ' ' + items : ''}`;
      }
      const items = inField(inner, null, itemsDe);
      return `${head} ${low(fieldText(inner))}${items ? ', ' + charged + ' ' + items : ''}`;
    }
    const on = F.charges.filter(c => c.on === p.id);
    /* « à la bordure componée d'argent et de gueules » */
    const tinct = p.ual && E.two && !p.comp ? (E.last = null, "de l'un en l'autre") : p.comp ? `componée ${em(p.t)} et ${em(p.comp)}` : em(p.t), around = acc ? ' ' + acc(pn.g, false) : '';
    return `${head} ${tinct}${around}${on.length ? (around ? ' et ' : ' ') + charged + ' ' + on.map(chargeDe).join(' et ') : ''}`;
  }
  /* Contenu d'un champ, sous forme « d'un… et de trois… » (pour « chargé de ») */
  function itemsDe(F) {
    const parts = rimLast(F.pieces).map(p => pieceText(F, p, 'de')).concat(byImportance(F.charges.filter(c => !c.on || c.on === 'field')).map(c => chargeDe(c)));
    return parts.join(' et ');
  }

  function slotDesc(F, k) {
    return isComposed(F, k) ? low(fieldBlazon(F.subs[k])) : H.vairDe(F.t[k], F.fs);
  }
  /* ---------- Quartiers numérotés (compositions de partitions) ----------
     Quand une partie est elle-même partagée, toutes les parties « feuilles » sont numérotées dans l'ordre de lecture
     (du chef vers la pointe, de dextre vers senestre) : « Parti, écartelé à senestre : au 1 …, aux 2 et 5 … ».
     Cadre de chaque partie, dans l'écu ramené à [0,1]² : [x0, y0, x1, y1] (celui des triangles : leur boîte). */
  const RECT = {
    parti: [[0, 0, .5, 1], [.5, 0, 1, 1]], coupe: [[0, 0, 1, .5], [0, .5, 1, 1]], tranche: [[0, 0, 1, .5], [0, .5, 1, 1]], taille: [[0, 0, 1, .5], [0, .5, 1, 1]],
    'tierce-pal': [[0, 0, .34, 1], [.33, 0, .67, 1], [.66, 0, 1, 1]], 'tierce-fasce': [[0, 0, 1, .34], [0, .33, 1, .67], [0, .66, 1, 1]],
    'quarte-pal': [[0, 0, .25, 1], [.25, 0, .5, 1], [.5, 0, .75, 1], [.75, 0, 1, 1]], 'quarte-fasce': [[0, 0, 1, .25], [0, .25, 1, .5], [0, .5, 1, .75], [0, .75, 1, 1]],
    'tierce-chevron': [[0, 0, 1, .33], [0, .2, 1, .66], [0, .5, 1, 1]], 'tierce-pairle': [[0, 0, 1, .5], [0, .3, .5, 1], [.5, .3, 1, 1]],
    chape: [[0, .4, 1, 1], [0, 0, .5, .7], [.5, 0, 1, .7]], chausse: [[0, 0, 1, .6], [0, .3, .5, 1], [.5, .3, 1, 1]],
    'parti-mi-coupe': [[0, 0, .5, .5], [0, .5, .5, 1], [.5, 0, 1, 1]], 'parti-mi-coupe-sen': [[0, 0, .5, 1], [.5, 0, 1, .5], [.5, .5, 1, 1]],
    'mi-parti-coupe': [[0, 0, .5, .5], [.5, 0, 1, .5], [0, .5, 1, 1]], 'coupe-mi-coupe': [[0, 0, 1, .5], [0, .5, .5, 1], [.5, .5, 1, 1]],
    ecartele: [[0, 0, .5, .5], [.5, 0, 1, .5], [0, .5, .5, 1], [.5, .5, 1, 1]], sautoir: [[0, 0, 1, .25], [0, .25, .5, .75], [.5, .25, 1, .75], [0, .75, 1, 1]]
  };
  const GRID_ROWS = { coupe: 2, 'tierce-fasce': 3, 'quarte-fasce': 4 }, GRID_COLS = { parti: 2, 'tierce-pal': 3, 'quarte-pal': 4 };
  const traits = n => (n === 1 ? "d'un trait" : `de ${NUM[n]} traits`);
  /* partie partagée à son tour, sans pièce ni meuble à elle : elle se fond dans la numérotation */
  const flatSub = (F, k) => {
    const P = H.PMAP[F.part], s = P.compose && F.subs && F.subs[k];
    return s && s.part !== 'plein' && H.PMAP[s.part].compose && !s.pieces.length && !s.charges.length ? s : null;
  };
  const hasFlat = F => { const P = H.PMAP[F.part]; for (let k = 0; k < P.slots; k++) if (flatSub(F, k)) return true; return false; };
  const joinPos = list => (list.every(p => /^au \d+$/.test(p)) ? (list.length > 1 ? 'aux ' : 'au ') + list.map(p => p.slice(3)).join(', ').replace(/, (\d+)$/, ' et $1') : list.join(' et '));
  /* « Coupé d'un trait, parti de deux traits » pour une grille ; sinon « Parti, écartelé à senestre » */
  function titleOf(F) {
    const P = H.PMAP[F.part], ln = H.lineAdj(F.line, 'm'), L = ln ? ' ' + ln : '';
    const kids = [];
    for (let k = 0; k < P.slots; k++) { const s = flatSub(F, k); if (s) kids.push([k, s]); }
    const rows = GRID_ROWS[F.part], cols = GRID_COLS[F.part];
    if ((rows || cols) && kids.length === P.slots && kids.every(([, s]) => s.part === kids[0][1].part && (rows ? GRID_COLS : GRID_ROWS)[s.part] && !hasFlat(s))) {
      const s = H.PMAP[kids[0][1].part], l2 = H.lineAdj(kids[0][1].line, 'm');
      return `${rows ? 'Coupé' : 'Parti'} ${traits(P.slots - 1)}${L}, ${rows ? 'parti' : 'coupé'} ${traits(s.slots - 1)}${l2 ? ' ' + l2 : ''}`;
    }
    const groups = [];
    kids.forEach(([k, s]) => {
      let t = titleOf(s);
      t = F.part === 'ecartele' && s.part === 'ecartele' ? 'contre-écartelé' + t.slice('Écartelé'.length) : low(t);
      let g = groups.find(q => q.t === t);
      if (!g) groups.push(g = { t, pos: [] });
      g.pos.push(P.pos[k]);
    });
    /* « aux 2 et 3 contre-écartelé » (numéros devant), « écartelé à senestre » (côté derrière) */
    return `${P.name}${L}` + groups.map(g => (/^au \d/.test(g.pos[0]) || g.t.includes(', ') ? `, ${joinPos(g.pos)} ${g.t}` : `, ${g.t} ${joinPos(g.pos)}`)).join('');
  }
  /* parties feuilles (émail simple, ou champ avec ses propres pièces et meubles) avec leur cadre */
  function leaves(F, r, out) {
    const P = H.PMAP[F.part], rects = RECT[F.part];
    for (let k = 0; k < P.slots; k++) {
      const q = rects && rects[k] || [0, 0, 1, 1], w = r[2] - r[0], h = r[3] - r[1];
      const rr = [r[0] + q[0] * w, r[1] + q[1] * h, r[0] + q[2] * w, r[1] + q[3] * h], s = flatSub(F, k);
      if (s) leaves(s, rr, out);
      else out.push({ r: rr, text: slotDesc(F, k), i: out.length });
    }
    return out;
  }
  function numbered(F) {
    const ls = leaves(F, [0, 0, 1, 1], []);
    const tol = 0.04, near = (a, b) => Math.abs(a - b) < tol;
    ls.sort((a, b) => (near(a.r[1], b.r[1]) ? (near(a.r[0], b.r[0]) ? (near(a.r[3], b.r[3]) ? a.i - b.i : a.r[3] - b.r[3]) : a.r[0] - b.r[0]) : a.r[1] - b.r[1]));
    const groups = [];
    ls.forEach((l, n) => {
      let g = groups.find(q => q.text === l.text);
      if (!g) groups.push(g = { text: l.text, pos: [] });
      g.pos.push('au ' + (n + 1));
    });
    return `${titleOf(F)} : ` + groups.map(g => `${joinPos(g.pos)} ${g.text}`).join(', ');
  }
  function fieldText(F) {
    const t = F.t, id = F.part, P = H.PMAP[id], ln = H.lineAdj(F.line, 'm'), L = ln ? ' ' + ln : '';
    const T = i => slotDesc(F, i);
    const nm = P.name.toLowerCase();
    if (id === 'plein') return cap(T(0));
    if (hasFlat(F)) return numbered(F);
    if (P.compose && F.subs && F.subs.some((s, i) => s && i < P.slots)) {
      return `${P.name}${L} : ` + P.pos.slice(0, P.slots).map((pos, i) => `${pos} ${T(i)}`).join(' ; ');
    }
    const two = `${nm}${L} ${T(0)} et ${T(1)}`;
    switch (id) {
      case 'parti': case 'coupe': case 'tranche': case 'taille': case 'echiquete': case 'losange': case 'fusele': return cap(two);
      case 'ecartele':
        return t[0] === t[3] && t[1] === t[2] ? `Écartelé${L} : aux 1 et 4 ${T(0)}, aux 2 et 3 ${T(1)}`
          : `Écartelé${L} : au 1 ${T(0)}, au 2 ${T(1)}, au 3 ${T(2)}, au 4 ${T(3)}`;
      case 'sautoir':
        return t[0] === t[3] && t[1] === t[2] ? `Écartelé en sautoir${L} : en chef et en pointe ${T(0)}, aux flancs ${T(1)}`
          : `Écartelé en sautoir${L} : en chef ${T(0)}, à dextre ${T(1)}, à senestre ${T(2)}, en pointe ${T(3)}`;
      case 'quarte-pal': case 'quarte-fasce': return `${P.name}${L} ${T(0)}, ${T(1)}, ${T(2)} et ${T(3)}`;
      case 'tierce-pal': case 'tierce-fasce': case 'tierce-chevron': case 'tierce-pairle': return `${P.name}${L} ${T(0)}, ${T(1)} et ${T(2)}`;
      /* mi-partitions : chaque partie nommée par sa position */
      case 'parti-mi-coupe': case 'parti-mi-coupe-sen': case 'mi-parti-coupe': case 'coupe-mi-coupe':
        return `${P.name}${L} : ` + P.pos.map((pos, i) => `${pos} ${T(i)}`).join(', ');
      case 'chape': return `Chapé${L} : à dextre ${T(1)}, à senestre ${T(2)}, en pointe ${T(0)}`;
      case 'chausse': return `Chaussé${L} : à dextre ${T(1)}, à senestre ${T(2)}, en chef ${T(0)}`;
      default: return `${cap(two)} de ${NUM[P.pieces] || P.pieces} pièces`;
    }
  }

  /* Pièces de la périphérie de l'écu : blasonnées en dernier, elles ne brochent pas « sur le tout » */
  const PERIPHERAL = ['chef', 'champagne', 'bordure', 'franc-quartier'];
  const rimLast = pieces => pieces.filter(p => !PERIPHERAL.includes(p.type)).concat(pieces.filter(p => PERIPHERAL.includes(p.type)));
  const SIMPLE_PIECES = ['fasce', 'pal', 'bande', 'barre', 'chevron', 'croix', 'sautoir', 'pairle'];
  /* champs faits de répétitions (le chargé d'un écusson s'y dit « chargé », non « sur le tout ») */
  const REPEAT = ['girone', 'pale', 'fasce', 'burele', 'bande', 'barre', 'echiquete', 'losange', 'fusele'];
  const fieldBlazon = F => inField(F, null, fieldBlazon0);
  /* Ordre : champ, semé, pièces, meubles par importance, puis les pièces de la périphérie (chef, champagne, bordure, franc-quartier) */
  function fieldBlazon0(F) {
    let txt = fieldText(F);
    const fieldCh = F.charges.filter(c => !c.on || c.on === 'field');
    fieldCh.filter(c => c.arr === 'seme').forEach(c => { txt += ' ' + chargeA(c); });
    const others = byImportance(fieldCh.filter(c => c.arr !== 'seme'));
    const inMain = p => !PERIPHERAL.includes(p.type) && p.type !== 'ente';
    /* l'enté en pointe fait partie de la partition : il se dit tout de suite après elle, avant « sur le tout » */
    F.pieces.filter(p => p.type === 'ente').forEach(p => { txt += ', ' + pieceText(F, p, 'a'); });
    /* sous le tout : dessinée avant les autres pièces ; brochant : dessinée par-dessus les meubles */
    const sous = F.pieces.filter(p => p.sous && inMain(p)), broch = F.pieces.filter(p => p.broch && !p.sous && inMain(p));
    /* un écusson sur un champ « répété » (gironné, fascé, échiqueté…) en est la charge : « gironné de …, chargé d'un écusson de … » */
    const charged = REPEAT.includes(F.part) ? F.pieces.find(p => p.type === 'ecusson' && inMain(p) && !p.sous && !p.broch) : null;
    if (charged) txt += ', chargé ' + pieceText(F, charged, 'de');
    const main = F.pieces.filter(p => inMain(p) && !sous.includes(p) && !broch.includes(p) && p !== charged), rim = F.pieces.filter(p => PERIPHERAL.includes(p.type));
    /* un meuble au centre qui n'est pas le plus grand, parmi d'autres meubles : « en abîme » */
    const centre = others.filter(c => c.arr === '1' && !c.dx && !c.dy);
    if (centre.length === 1 && others[0] !== centre[0]) E.abime = new Set([centre[0].id]);
    const clauses = [];
    const simple = main.length === 1 && !main[0].inner && SIMPLE_PIECES.includes(main[0].type);
    /* pièce simple : les meubles l'accompagnent ; sinon le meuble central le plus grand est la figure principale */
    sous.forEach(p => clauses.push(pieceText(F, p, 'a') + ' sous le tout'));
    main.forEach(p => clauses.push(pieceText(F, p, 'a', simple && others.length ? accompany(others, main[0]) : null)));
    if (!(simple && others.length)) {
      const lead = others[0];
      if (!main.length && others.length > 1 && lead.arr === '1' && !lead.dx && !lead.dy) {
        clauses.push(chargeA(lead) + ', ' + accompany(others.slice(1))(H.CMAP[lead.type].g, H.chargeCount(lead) > 1));
      } else others.forEach(c => clauses.push(chargeA(c)));
    }
    broch.forEach(p => clauses.push(pieceText(F, p, 'a') + ' brochant sur le tout'));
    rim.forEach(p => clauses.push(pieceText(F, p, 'a')));
    if (clauses.length) {
      /* sur une partition, ce qui n'est pas périphérique broche « sur le tout » */
      const sep = F.part !== 'plein' && (main.length || others.length || sous.length || broch.length) ? ' ; sur le tout, ' : ' ';
      /* « et » devant la dernière clause, sauf si la précédente en contient déjà un : « …cantonnée de … et chargée de …, au chef de … » */
      txt += sep + clauses.reduce((s, cl, i) => (i === 0 ? cl : s + (i === clauses.length - 1 && !/ et /.test(clauses[i - 1]) && !/ brochant sur le tout$/.test(cl) && !/ (sur|sous) le tout$/.test(clauses[i - 1]) ? ' et ' : ', ') + cl), '');
    }
    return txt;
  }

  /* un écu d'un seul émail, sans pièce ni meuble, est « plain » */
  H.blazon = S => {
    const F = S.field, plain = F.part === 'plein' && F.t[0] && !F.pieces.length && !F.charges.length;
    return fieldBlazon(F) + (plain ? ' plain' : '') + '.';
  };
})(window.H);
