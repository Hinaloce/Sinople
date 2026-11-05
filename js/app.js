/* Interface de l'atelier */
(function (H) {
  const $ = s => document.querySelector(s);
  const KEY = 'blasons.v2';
  let S, AN, W, hist = [], hi = -1;
  const ui = { tab: 'partition', side: 'pieces', path: [], selP: null, selC: null, strict: true, cat: 'tous', q: '', gridR: 1, gridC: 2 };
  const rid = p => p + Math.random().toString(36).slice(2, 7);
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const THUMB_T = ['argent', 'azur', 'or', 'gueules'];
  const ICONS = {
    ecu: '<svg viewBox="0 0 24 24"><path d="M4 3h16v8c0 5-4 8.5-8 10C8 19.5 4 16 4 11z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    partition: '<svg viewBox="0 0 24 24"><path d="M4 3h16v8c0 5-4 8.5-8 10C8 19.5 4 16 4 11z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 3v18M4 11h16" stroke="currentColor" stroke-width="1.5"/></svg>',
    pieces: '<svg viewBox="0 0 24 24"><path d="M4 3h16v8c0 5-4 8.5-8 10C8 19.5 4 16 4 11z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 9h16v5H4z" fill="currentColor"/></svg>',
    meubles: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.5 6.4 20l1.5-6.3L3 9.5 9.4 9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'
  };
  const TABS = [['ecu', 'Écu'], ['partition', 'Partition'], ['pieces', 'Pièces'], ['meubles', 'Meubles']];

  /* ---------- État, historique, persistance ---------- */
  /* lien partagé (#s=…) : lu une fois puis retiré de l'adresse, pour qu'un rechargement reprenne le blason en cours */
  const clearShared = () => { if (/^#s=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); };
  function load() {
    try {
      const m = location.hash.match(/^#s=(.+)$/);
      if (m) { const s = JSON.parse(decodeURIComponent(escape(atob(m[1])))); clearShared(); return s; }
      const j = localStorage.getItem(KEY);
      if (j) return JSON.parse(j);
    } catch (e) {}
    return null;
  }
  const okT = t => (H.TMAP[t] ? t : null);
  /* particularités à émail au choix (couronné, becqué…) : seuls les émaux connus sont gardés ; rien → pas de propriété */
  const cleanExtras = x => {
    const out = {};
    H.EXTRAS.forEach(e => { if (x && okT(x[e.id])) out[e.id] = x[e.id]; });
    return Object.keys(out).length ? out : undefined;
  };
  /* réglages multiplicateurs : 1 = taille par défaut (lz : motif du trait, fs : fourrure, sp : espacement des meubles,
     th : épaisseur ou taille d'une pièce, scale : taille d'un meuble) — plages des curseurs */
  /* [min, max, pas] ; motif du trait : pas de 0,05, le plus petit qui change toujours le dessin
     (un bord porte un nombre entier de motifs, seule leur hauteur varie entre deux changements de nombre) */
  /* [min, max, pas, valeur par défaut (1 si absente)] ; off : décalage d'une pièce ou d'un meuble, en unités de l'écu (200 de large) */
  const RANGE = { lz: [0.2, 4, 0.05], fs: [0.2, 4], sp: [0.1, 2.5], spSeme: [0.3, 2.5], th: [0.3, 2], scale: [0.2, 4], ow: [0, 4], off: [-60, 60, 0.5, 0], rot: [-90, 90, 1, 0] };
  const defOf = key => (RANGE[key][3] === undefined ? 1 : RANGE[key][3]);
  const num = (v, key) => (+v >= RANGE[key][0] && +v <= RANGE[key][1] ? +v : defOf(key));
  /* affichage de la valeur d'un curseur : ×1.20 pour un facteur, +3.5 pour un décalage */
  const fmtTune = (v, key) => (key === 'rot' ? (v > 0 ? '+' : '') + Math.round(v) + '°'
    : defOf(key) === 0 ? (v > 0 ? '+' : '') + v.toFixed(1) : '×' + v.toFixed(2));
  /* nested : champ d'une sous-composition (partie composée, intérieur d'une pièce ou d'un meuble) */
  function sanitizeField(f, nested) {
    const d = H.newField('azur');
    if (!f || typeof f !== 'object') return d;
    const F = {
      part: H.PMAP[f.part] ? f.part : 'plein',
      line: H.LMAP[f.line] ? f.line : 'droite',
      t: [0, 1, 2, 3].map(i => okT((f.t || [])[i])),
      lz: num(f.lz, 'lz'), fs: num(f.fs, 'fs'), lc: !!f.lc, fc: !!f.fc,
      subs: [], pieces: [], charges: []
    };
    (f.subs || []).forEach((s, i) => { if (s && i < 4) F.subs[i] = sanitizeField(s, true); });
    F.pieces = (f.pieces || []).filter(p => p && H.PCMAP[p.type]).map(p => {
      const q = { id: p.id || rid('p'), type: p.type, line: H.LMAP[p.line] ? p.line : 'droite', t: okT(p.t) || 'or', th: num(p.th, 'th'), lz: num(p.lz, 'lz'), fs: num(p.fs, 'fs'), lc: !!p.lc, fc: !!p.fc, dx: num(p.dx, 'off'), dy: num(p.dy, 'off') };
      if (H.MULTI_PIECES.includes(p.type) && [2, 3, 4].includes(+p.n)) q.n = +p.n;
      if (p.type === 'chevron' && p.inv) q.inv = true;
      /* sous le tout (dessinée avant les autres) ou brochant (par-dessus les meubles) : l'un ou l'autre */
      /* (seulement dans le champ principal : dans une sous-composition, ces plans n'ont guère de sens) */
      if (!nested) { if (p.sous) q.sous = true; else if (p.broch) q.broch = true; }
      if (p.ual) q.ual = true;
      if (p.inner && H.PCMAP[p.type].box) q.inner = sanitizeField(p.inner, true);
      /* bordure componée : second émail des compons */
      if (p.type === 'bordure' && okT(p.comp) && okT(p.comp) !== q.t) q.comp = okT(p.comp);
      return q;
    });
    F.charges = (f.charges || []).filter(c => c && H.CMAP[c.type]).map(c => ({
      id: c.id || rid('c'), type: c.type, t: okT(c.t) || 'or', arr: H.ARR[c.arr] ? c.arr : '1', n: +c.n || 1,
      on: c.on && F.pieces.some(p => p.id === c.on && !p.inner) ? c.on : 'field', scale: +c.scale || 1, flip: !!c.flip, invert: !!c.invert, rot: num(c.rot, 'rot'),
      variant: H.CMAP[c.type].variants.some(v => v.id === c.variant) ? c.variant : H.CMAP[c.type].variants[0].id,
      langue: okT(c.langue), armes: okT(c.armes), peau: H.SKIN_MAP[c.peau] ? c.peau : null, cheveux: okT(c.cheveux), aureole: okT(c.aureole),
      extras: cleanExtras(c.extras), orn: +c.orn >= 4 && +c.orn <= 24 ? Math.round(+c.orn) : undefined, fs: num(c.fs, 'fs'), fc: !!c.fc, sp: num(c.sp, 'sp'), ow: c.ow === undefined ? 1 : num(c.ow, 'ow'), dx: num(c.dx, 'off'), dy: num(c.dy, 'off'), mv: H.MOUVANTS[c.mv] || c.mv === 'non' ? c.mv : undefined,
      ual: !!c.ual && !c.uet || undefined, uet: !!c.uet || undefined,
      /* intérieur composé du meuble (partition, pièces, meubles posés sur lui) */
      inner: c.inner ? sanitizeField(c.inner, true) : undefined
    }));
    return F;
  }
  function sanitize(s) {
    if (!s || typeof s !== 'object') return H.defaultState();
    return { v: 2, shape: H.SMAP[s.shape] ? s.shape : 'moderne', field: sanitizeField(s.field) };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function commit() {
    const j = JSON.stringify(S);
    if (j !== hist[hi]) {
      hist = hist.slice(0, hi + 1); hist.push(j); hi++;
      if (hist.length > 100) { hist.shift(); hi--; }
      clearShared();
    }
    save(); renderAll();
  }
  function jump(d) {
    const n = hi + d;
    if (n < 0 || n >= hist.length) return;
    hi = n; S = JSON.parse(hist[hi]); save(); renderAll();
  }
  const cur = () => W.F;
  const strictFix = id => { if (ui.strict) H.fixItem(S, id); };

  /* ---------- Vignettes ---------- */
  const cache = {};
  const thumb = (key, fn) => cache[key] || (cache[key] = fn());
  const base = over => ({ v: 2, shape: S.shape, field: Object.assign(H.newField('argent'), over) });
  const tShape = id => thumb('s' + id, () => H.renderArms({ v: 2, shape: id, field: H.newField('argent') }));
  const tPart = id => thumb('p' + S.shape + id, () => H.renderArms(base({ part: id, t: THUMB_T })));
  /* trait : gros plan sur trois motifs, plus lisible qu'un écu entier */
  const tLine = id => thumb('l' + id, () => H.lineSwatch(id, H.fill('argent'), H.fill('azur'), H.INK));
  const tPiece = (id, line, n) => thumb('pc' + S.shape + id + (line || '') + (n || ''), () => H.renderArms(base({ pieces: [{ id: 'x', type: id, line: line || 'droite', t: 'azur', th: 1, n: n || 1 }] })));
  const tCharge = id => thumb('c' + id, () => H.renderCharge(id, 'sable'));
  const tVariant = (type, v) => thumb('cv' + type + v, () => H.renderCharge(type, 'sable', v));
  const tArr = id => thumb('a' + S.shape + id, () => H.renderArms(base({ charges: [{ id: 'x', type: 'besant', t: 'azur', arr: id, n: 1, on: 'field', scale: 1 }] })));
  /* pastille d'émail ; pour une fourrure, la fenêtre couvre environ deux motifs pour qu'on la reconnaisse */
  const tSwatch = id => H.cls(id) === 'fur'
    ? (H.isVair(id) ? `<svg viewBox="12 12 100 100"><rect width="130" height="130" fill="${H.fill(id)}"/></svg>`
      : `<svg viewBox="4 6 60 60"><rect x="-10" y="-10" width="90" height="90" fill="${H.fill(id)}"/></svg>`)
    : `<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="${H.fill(id)}"/></svg>`;

  /* ---------- Fabriques HTML ---------- */
  function cards(items, cur, act, th, cls) {
    return `<div class="grid ${cls || ''}">` + items.map(it =>
      `<button class="card${it.id === cur ? ' on' : ''}" data-a="${act}" data-v="${it.id}" title="${esc(it.name)}"><span class="thumb">${th(it.id)}</span><span class="lbl">${esc(it.name)}</span></button>`).join('') + '</div>';
  }
  /* Sélecteur d'émail : métaux, émaux (couleurs) et fourrures en trois groupes, nom sous chaque pastille */
  const T_GROUPS = [['metal', 'Métaux'], ['color', 'Couleurs'], ['fur', 'Fourrures']];
  const swItem = (act, extra, id, label, on, dis, sub) =>
    `<div class="swi${on ? ' on' : ''}${dis ? ' dis' : ''}"><button class="sw${on ? ' on' : ''}" data-a="${act}" data-v="${id}" ${extra || ''} title="${esc(label)}${dis ? ' — interdit par la règle de contrariété' : ''}" ${dis ? 'disabled' : ''}>${tSwatch(sub || id)}</button><span>${esc(label)}</span></div>`;
  function swatches(act, cur, extra, blocked) {
    const base = H.furBase(cur);
    const row = list => `<div class="swatches">${list.map(t =>
      swItem(act, extra, t.id, t.name, t.id === base, blocked && blocked(t.id), t.id === base ? cur : null)).join('')}</div>`;
    /* fourrures sur deux lignes : l'hermine et ses déclinaisons, puis le vair et les siennes */
    const groups = T_GROUPS.map(([cls, title]) => {
      const list = H.TINCTURES.filter(t => t.cls === cls);
      const body = cls === 'fur' ? ['hermine', 'vair'].map(f => row(list.filter(t => t.fam === f))).join('') : row(list);
      return `<div class="swg"><div class="swg-t">${title}</div>${body}</div>`;
    }).join('');
    /* herminé, contre-herminé, vairé : sous-menu pour choisir le métal et la couleur de la fourrure */
    let sub = '';
    const ft = H.furTinctures(cur);
    if (ft) {
      /* la combinaison qui redonne la fourrure ordinaire (argent et azur pour le vairé…) est grisée */
      const [m, c] = ft, fb = H.FUR_CUSTOM[base].forbid, pick = (cls, keep) => H.TINCTURES.filter(t => t.cls === cls).map(t => {
        const mm = cls === 'metal' ? t.id : m, cc = cls === 'metal' ? c : t.id;
        const dis = mm === fb[0] && cc === fb[1];
        return swItem(act, extra, `${base}~${mm}~${cc}`, t.name, t.id === keep, dis, dis ? base : null);
      }).join('');
      sub = `<div class="swsub"><div class="swg-t">${esc(H.FUR_CUSTOM[base].name)} : métal</div><div class="swatches">${pick('metal', m)}</div>
        <div class="swg-t">${esc(H.FUR_CUSTOM[base].name)} : couleur</div><div class="swatches">${pick('color', c)}</div></div>`;
    }
    return `<div class="swgroups">${groups}</div>${sub}${cur ? '' : '<div class="tname"><em>Émail à choisir</em></div>'}`;
  }
  /* Curseur multiplicateur (1 = taille par défaut) avec remise à zéro */
  function slider(label, a, k, v, key) {
    const def = defOf(key);
    v = v === undefined || v === null ? def : v;
    const [min, max, step] = RANGE[key];
    return `<div class="row tune"><label>${label}</label><input type="range" min="${min}" max="${max}" step="${step || 0.01}" value="${v}" data-a="${a}" data-k="${k || ''}" data-key="${key}" title="Cliquez puis ← → pour affiner (Maj : pas plus grand)">
      <span class="tune-v">${fmtTune(v, key)}</span><button class="mini" data-a="rst" data-v="${a}" data-k="${k || ''}" data-def="${def}" title="Revenir à la valeur par défaut" ${v === def ? 'disabled' : ''}>↺</button></div>`;
  }
  const isFur = t => H.cls(t) === 'fur';
  /* décalage horizontal (+ vers la senestre, à droite à l'écran) et vertical (+ vers la pointe) */
  const offsetSliders = (kind, it) => `<div class="sec offset"><h3>Décalage</h3>
    ${slider('Horizontal ↔', kind + 'dx', it.id, it.dx, 'off')}${slider('Vertical ↕', kind + 'dy', it.id, it.dy, 'off')}
    ${kind === 'c' ? slider('Rotation ⟳', 'crot', it.id, it.rot, 'rot') + orientRow(it) : ''}</div>`;
  /* orientations nommées d'un meuble : le dessin est en pal ; 45° à dextre, en bande ; à senestre, en barre ; couché, en fasce */
  const ORIENTS = [['pal', 'En pal', 0], ['bande', 'En bande', -45], ['barre', 'En barre', 45], ['fasce', 'En fasce', 90]];
  const orientRow = it => `<div class="row"><label>Posé</label><div class="seg">${ORIENTS.map(([id, nm, deg]) =>
    `<button class="${(H.orientOf(it.rot) || 'pal') === id ? 'on' : ''}" data-a="corient" data-v="${deg}" title="${nm}">${nm}</button>`).join('')}</div></div>`;
  /* case « centrer » sous un curseur de motif : prop = propriété booléenne de l'élément (lc : trait, fc : fourrure) */
  const centerBox = (kind, k, prop, on) =>
    `<label class="check tune-center"><input type="checkbox" data-a="ctr" data-v="${kind}:${prop}" data-k="${k || ''}" ${on ? 'checked' : ''}> Centrer le motif <em>(grossit depuis le centre)</em></label>`;
  /* Émaux voisins d'une partie (une partie composée n'impose rien à ses voisines) */
  const slotNeighbors = (F, i) => {
    const P = H.PMAP[F.part];
    if (P.compose && F.subs[i]) return [];
    return P.adj.filter(([a, b]) => a === i || b === i).map(([a, b]) => (a === i ? b : a)).filter(j => !(P.compose && F.subs[j])).map(j => F.t[j]);
  };
  const pieceName = p => {
    const d = H.PCMAP[p.type];
    const t = p.inner ? (p.inner.part === 'plein' ? H.tDe(p.inner.t[0]) + (p.inner.pieces.length || p.inner.charges.length ? ', chargé' + (d.g === 'f' ? 'e' : '') : '') : '— composé') : H.tDe(p.t);
    return `${cap(H.pieceNoun(p).txt)} ${t}`;
  };
  const chargeName = c => {
    const n = H.chargeCount(c), d = H.CMAP[c.type];
    const alt = d.alt && H.cls(c.t) !== 'metal' ? d.alt : d;
    const t = c.inner ? (c.inner.part === 'plein' ? H.tDe(c.inner.t[0]) + (c.inner.pieces.length || c.inner.charges.length ? ', chargé' + (d.g === 'f' ? 'e' : '') : '') : '— composé') : H.tDe(c.t);
    return `${n > 1 ? n + ' ' + alt.pl : cap(alt.sg)} ${t}${n === 0 ? ' (semé)' : ''}`;
  };

  /* ---------- Panneaux ---------- */
  function renderCrumbs() {
    const c = W.crumbs;
    $('#crumbs').innerHTML = `<span class="crumb-ico">📍</span>` + c.map((x, i) =>
      i === c.length - 1 ? `<span class="crumb on">${esc(x.label)}</span>` : `<button class="crumb" data-a="goto" data-v="${x.depth}">${esc(x.label)}</button><span class="sep">›</span>`).join('') +
      (c.length > 1 ? `<button class="crumb-up" data-a="goto" data-v="${c.length - 2}" title="Revenir au niveau supérieur">⤴ Remonter</button>` : '');
    $('#crumbs').classList.toggle('deep', c.length > 1);
  }

  function panelEcu() {
    return `<div class="sec"><h3>Forme de l'écu</h3>
      <p class="hint">La forme n'a pas de valeur héraldique : choisissez celle qui vous plaît. Elle s'applique à tout le blason (et aux écussons).</p>
      ${cards(H.SHAPES, S.shape, 'shape', tShape)}</div>`;
  }

  function panelPartition() {
    const F = cur(), part = H.PMAP[F.part];
    let h = `<div class="sec"><h3>Partition du champ</h3>${cards(H.PARTS, F.part, 'part', tPart, 'small')}</div>`;
    if (part.lines) {
      h += `<div class="sec"><h3>Trait de partition</h3>
        <p class="hint">Le trait qui sépare les parties : droit, ondé, crénelé…</p>
        ${cards(H.LINES, F.line, 'pline', tLine, 'small lines')}
        ${F.line !== 'droite' ? slider('Taille du motif', 'flz', '', F.lz, 'lz') + centerBox('f', '', 'lc', F.lc) : ''}</div>`;
    }
    h += `<div class="sec"><h3>Émaux ${part.swap && part.slots > 1 ? '<button class="mini" data-a="swap" title="Échange les émaux des parties (dextre ↔ senestre…)">⇄ Intervertir</button>' : ''}</h3>
      <p class="hint">Une partition se compose d'un métal et d'une couleur : jamais métal contre métal, ni couleur contre couleur.${part.compose ? ' <b>Composer</b> une partie y crée un champ à part entière, avec sa propre partition, ses pièces et ses meubles.' : ''}</p>`;
    for (let i = 0; i < part.slots; i++) {
      const sub = part.compose && F.subs[i];
      const btns = part.compose ? (sub
        ? `<span><button class="mini accent" data-a="openS" data-v="${i}">Ouvrir ▸</button> <button class="mini" data-a="uncomposeS" data-v="${i}" title="Revenir à un émail simple">✕</button></span>`
        : `<button class="mini" data-a="composeS" data-v="${i}">Composer ▸</button>`) : '';
      h += `<div class="slot">${part.slots > 1 || btns ? `<div class="slot-name"><span>${part.labels[i]}</span>${btns}</div>` : ''}`;
      if (sub) h += `<div class="composed" data-a="openS" data-v="${i}">${H.renderArms({ v: 2, shape: S.shape, field: sub })}<span>Partie composée : ${esc(H.blazon({ shape: S.shape, field: sub }))}</span></div>`;
      else h += swatches('ftinct', F.t[i], `data-k="${i}"`, ui.strict ? (id => H.conflicts(id, slotNeighbors(F, i))) : null);
      h += '</div>';
    }
    if (F.t.slice(0, part.slots).some((t, i) => isFur(t) && !(part.compose && F.subs[i]))) h += slider('Taille de la fourrure', 'ffs', '', F.fs, 'fs') + centerBox('f', '', 'fc', F.fc);
    h += '</div>';
    /* compositions toutes faites : partitions imbriquées, dont les parties sont numérotées dans le blasonnement */
    h += `<div class="sec"><h3>Compositions</h3>
      <p class="hint">Remplace la partition de <b>ce champ</b> par une composition toute faite. Les parties sont ensuite numérotées dans le blasonnement (« au 1 …, aux 2 et 5 … »).</p>
      <div class="presets">${PRESETS.map(([id, nm]) => `<button class="btn" data-a="preset" data-v="${id}">${esc(nm)}</button>`).join('')}</div>
      <div class="row" style="margin-top:.6rem"><label>Coupé de</label><div class="seg">${[1, 2, 3].map(n => `<button class="${ui.gridR === n ? 'on' : ''}" data-a="gridR" data-v="${n}">${n}</button>`).join('')}</div>
        <label>traits, parti de</label><div class="seg">${[1, 2, 3].map(n => `<button class="${ui.gridC === n ? 'on' : ''}" data-a="gridC" data-v="${n}">${n}</button>`).join('')}</div>
        <button class="btn btn-accent" data-a="makeGrid">Créer</button></div></div>`;
    return h;
  }
  /* Compositions : [identifiant, nom, construction du champ] ; mk(partition, émaux, parties composées) */
  const mk = (part, t, subs) => Object.assign(H.newField(t[0]), { part, t: t.concat([null, null, null, null]).slice(0, 4), subs: subs || [] });
  const compose = (F, f) => { F.part = f.part; F.t = f.t; F.subs = f.subs.map((s, i) => { if (s) F.t[i] = s.t[0]; return s; }); };
  const WITH_PIECE = (F, type, t) => { if (!F.pieces.some(p => p.type === type)) F.pieces.push(Object.assign(newPiece(type), { t })); };
  const gridField = (rows, cols) => {
    const R = { 1: ['coupe', ['azur', 'or']], 2: ['tierce-fasce', ['azur', 'or', 'azur']], 3: ['quarte-fasce', ['azur', 'or', 'azur', 'or']] }[rows];
    const C = { 1: ['parti', ['argent', 'gueules']], 2: ['tierce-pal', ['argent', 'gueules', 'argent']], 3: ['quarte-pal', ['argent', 'gueules', 'argent', 'gueules']] }[cols];
    return mk(R[0], R[1], R[1].map((_, i) => mk(C[0], i % 2 ? C[1].slice().reverse() : C[1])));
  };
  const PRESETS = [
    ['sen', 'Parti, écartelé à senestre (5)', F => compose(F, mk('parti', ['azur', 'argent'], [null, mk('ecartele', ['argent', 'gueules', 'gueules', 'argent'])]))],
    ['contre', 'Écartelé, aux 2 et 3 contre-écartelé (10)', F => compose(F, mk('ecartele', ['azur', 'argent', 'argent', 'azur'],
      [null, mk('ecartele', ['or', 'sable', 'sable', 'or']), mk('ecartele', ['or', 'sable', 'sable', 'or']), null]))],
    ['g12', 'Coupé d\'un trait, parti de deux (6)', F => compose(F, gridField(1, 2))],
    ['g13', 'Coupé d\'un trait, parti de trois (8)', F => compose(F, gridField(1, 3))],
    ['trois', 'Parti, à senestre coupé de trois traits, les 2e et 3e rangs partis de deux traits (9)', F => compose(F, mk('parti', ['azur', 'or'],
      [null, mk('quarte-fasce', ['or', 'sable', 'or', 'sable'], [null, mk('tierce-pal', ['argent', 'azur', 'argent']), mk('tierce-pal', ['argent', 'azur', 'argent']), null])]))],
    ['ente', 'Écartelé enté en pointe (5)', F => { compose(F, mk('ecartele', ['azur', 'argent', 'argent', 'azur'])); WITH_PIECE(F, 'ente', 'or'); }],
    ['saut', 'Écartelé en sautoir, chef et pointe partis (6)', F => compose(F, mk('sautoir', ['azur', 'or', 'or', 'azur'],
      [mk('parti', ['argent', 'sable']), null, null, mk('parti', ['argent', 'sable'])]))],
    ['chefp', 'Coupé, le chef parti de deux traits (4)', F => compose(F, mk('coupe', ['azur', 'or'], [mk('tierce-pal', ['argent', 'azur', 'argent']), null]))],
    ['ecu', 'Parti, écartelé à senestre, écusson brochant sur le parti', F => { PRESETS[0][2](F); WITH_PIECE(F, 'ecusson', 'gueules'); }],
    ['tout', 'Écartelé, avec écusson sur le tout et sur le tout du tout', F => {
      compose(F, mk('ecartele', ['azur', 'argent', 'argent', 'azur']));
      if (!F.pieces.some(p => p.type === 'ecusson')) {
        const deep = mk('plein', ['gueules']), mid = Object.assign(mk('plein', ['or']), { pieces: [Object.assign(newPiece('ecusson'), { t: 'gueules', inner: deep })] });
        F.pieces.push(Object.assign(newPiece('ecusson'), { t: 'or', inner: mid }));
      }
    }]
  ];

  function panelPieces() {
    let h = `<div class="sec"><h3>Ajouter une pièce honorable</h3>
      <p class="hint">Cliquez pour poser une pièce. Le chef, le canton, le franc-quartier, la champagne et l'écusson peuvent ensuite être <b>composés</b> (ex. un sautoir dans un franc-quartier).</p>
      ${cards(H.PIECES, null, 'addP', id => tPiece(id), 'small')}
      <p class="hint side-hint">Les pièces ajoutées se règlent dans le panneau <b>Éléments ajoutés</b>, à droite.</p></div>`;
    return h;
  }

  /* ---------- Panneau de droite : éléments ajoutés au champ en cours ---------- */
  /* Éléments rangés dans les parties et pièces composées de ce champ (un niveau plus bas), avec un lien pour y aller */
  function nested(kind) {
    const F = cur(), P = H.PMAP[F.part], groups = [];
    if (P.compose) F.subs.forEach((s, i) => { if (s && i < P.slots && s[kind].length) groups.push({ label: P.labels[i], f: s, a: 'openS', v: i }); });
    F.pieces.forEach(p => { if (p.inner && p.inner[kind].length) groups.push({ label: H.PCMAP[p.type].name, f: p.inner, a: 'openP', v: p.id }); });
    F.charges.forEach(c => { if (c.inner && c.inner[kind].length) groups.push({ label: H.CMAP[c.type].name, f: c.inner, a: 'openP', v: c.id }); });
    if (!groups.length) return '';
    return `<div class="sec nested"><h3>Dans les parties composées</h3>` + groups.map(g =>
      `<div class="nest-grp"><div class="slot-name"><span>${esc(g.label)}</span><button class="mini accent" data-a="${g.a}" data-v="${g.v}">Ouvrir ▸</button></div>
      <div class="items">${g.f[kind].map(x => `<div class="item sub" data-a="${g.a}" data-v="${g.v}"><span class="dot">${tSwatch(kind === 'pieces' ? H.pieceT(x) : x.t)}</span><span class="nm">${esc(kind === 'pieces' ? pieceName(x) : chargeName(x))}</span></div>`).join('')}</div></div>`).join('') + '</div>';
  }
  function sidePieces() {
    const F = cur();
    let h = '';
    if (!F.pieces.length) h += '<div class="empty">Aucune pièce pour l\'instant.<br>Choisissez-en une dans l\'onglet <b>Pièces</b>, à gauche.</div>';
    else {
      h += '<div class="items">' + F.pieces.map((p, i) =>
        `<div class="item${p.id === ui.selP ? ' on' : ''}" data-a="selP" data-v="${p.id}">
          <span class="dot">${tSwatch(H.pieceT(p))}</span><span class="nm">${esc(pieceName(p))}</span>
          <button class="ib" data-a="upP" data-v="${p.id}" title="Monter" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="ib" data-a="dnP" data-v="${p.id}" title="Descendre" ${i === F.pieces.length - 1 ? 'disabled' : ''}>▼</button>
          <button class="ib del" data-a="delP" data-v="${p.id}" title="Supprimer">✕</button></div>`).join('') + '</div>';
    }
    h += nested('pieces');
    const p = F.pieces.find(x => x.id === ui.selP);
    if (p) {
      const d = H.PCMAP[p.type], U = AN.under[p.id] || [];
      const simpleT = !p.inner || p.inner.part === 'plein';
      h += `<div class="editor"><h4>${d.name}</h4>`;
      if (d.box) {
        h += p.inner
          ? `<div class="row"><button class="btn btn-accent" data-a="openP" data-v="${p.id}">Ouvrir l'intérieur ▸</button><button class="btn" data-a="uncomposeP" data-v="${p.id}">Retirer la composition</button></div>`
          : `<div class="row"><button class="btn" data-a="composeP" data-v="${p.id}">Composer l'intérieur ▸</button><span class="hint" style="margin:0">y placer partition, pièces et meubles</span></div>`;
      }
      if (H.MULTI_PIECES.includes(p.type)) {
        const opts = [1, 2, 3, 4].map(n => ({ id: n, name: cap(H.pieceNoun({ type: p.type, n, line: 'droite' }).txt) }));
        h += `<div class="sec"><h3>Nombre</h3>${cards(opts, p.n || 1, 'pnum', n => tPiece(p.type, null, n), 'small')}</div>`;
      }
      h += `<div class="sec"><h3>Trait</h3>${cards(H.LINES, p.line, 'plineP', tLine, 'small lines')}
        ${p.line !== 'droite' ? slider('Taille du motif', 'plz', p.id, p.lz, 'lz') + centerBox('p', p.id, 'lc', p.lc) : ''}</div>`;
      if (simpleT) h += `<div class="sec"><h3>Émail</h3>${swatches('ptinct', H.pieceT(p), `data-k="${p.id}"`, ui.strict ? (id => H.conflicts(id, U)) : null)}
        ${!p.inner && isFur(p.t) ? slider('Taille de la fourrure', 'pfs', p.id, p.fs, 'fs') + centerBox('p', p.id, 'fc', p.fc) : ''}</div>`;
      if (p.type === 'bordure') h += `<div class="sec"><h3>Componée ${p.comp ? '<button class="mini" data-a="pcomp" data-v="" title="Bordure d\'un seul émail">✕ Unie</button>' : ''}</h3>
        <p class="hint">Second émail des compons : la bordure est faite de segments alternés des deux émaux.</p>
        ${swatches('pcomp', p.comp || null, `data-k="${p.id}"`, id => id === p.t)}</div>`;
      if (H.twoTone(F) && !p.inner) h += `<div class="row"><label class="check"><input type="checkbox" data-a="ctr" data-v="p:ual" data-k="${p.id}" ${p.ual ? 'checked' : ''}> De l'un en l'autre <em>(chaque moitié de l'émail de l'autre partie)</em></label></div>`;
      if (p.type === 'chevron') h += `<div class="row"><label class="check"><input type="checkbox" data-a="ctr" data-v="p:inv" data-k="${p.id}" ${p.inv ? 'checked' : ''}> Renversé <em>(la pointe en bas)</em></label></div>`;
      /* plan de la pièce : au milieu, sous le tout (avant les autres), ou brochant (par-dessus les meubles) */
      /* pas dans une sous-composition (partie composée, intérieur d'une pièce ou d'un meuble) */
      if (!ui.path.length && !['chef', 'champagne', 'bordure', 'franc-quartier'].includes(p.type)) h += `<div class="sec"><h3>Plan</h3><div class="row">
        <label class="check"><input type="checkbox" data-a="ctr" data-v="p:broch" data-k="${p.id}" ${p.broch ? 'checked' : ''}> Brochant <em>(sur les meubles)</em></label>
        <label class="check"><input type="checkbox" data-a="ctr" data-v="p:sous" data-k="${p.id}" ${p.sous ? 'checked' : ''}> Sous le tout <em>(sous les autres pièces)</em></label></div></div>`;
      if (p.type !== 'franc-quartier') h += slider(p.type === 'ecusson' ? 'Taille' : 'Épaisseur', 'th', p.id, p.th, 'th');
      /* décalage manuel (la bordure et l'orle suivent le bord de l'écu : pas de décalage) */
      if (p.type !== 'bordure' && p.type !== 'orle') h += offsetSliders('p', p);
      h += '</div>';
    }
    return h;
  }

  function panelMeubles() {
    const q = ui.q.trim().toLowerCase();
    const list = H.CHARGES.filter(c => (ui.cat === 'tous' || c.cat === ui.cat) && (!q || c.name.toLowerCase().includes(q)));
    let h = `<div class="sec"><h3>Ajouter un meuble</h3>
      <div class="chips">${H.CHARGE_CATS.map(([id, nm]) => `<button class="chip${ui.cat === id ? ' on' : ''}" data-a="cat" data-v="${id}">${nm}</button>`).join('')}</div>
      <div class="row search-row"><input class="search" type="search" placeholder="Rechercher un meuble…" value="${esc(ui.q)}" data-a="q"></div>
      ${H.CHARGE_ERRORS.length ? `<div class="warn">Fichiers ignorés : ${esc(H.CHARGE_ERRORS.join(' ; '))}</div>` : ''}
      ${list.length ? cards(list, null, 'addC', tCharge, 'small charges') : '<div class="empty">Aucun meuble ne correspond.</div>'}</div>`;
    return h;
  }

  function sideMeubles() {
    const F = cur();
    let h = '';
    if (!F.charges.length) h += '<div class="empty">Aucun meuble pour l\'instant.<br>Choisissez-en un dans l\'onglet <b>Meubles</b>, à gauche.</div>';
    else {
      h += '<div class="items">' + F.charges.map(c =>
        `<div class="item${c.id === ui.selC ? ' on' : ''}" data-a="selC" data-v="${c.id}">
          <span class="dot">${tSwatch(c.t)}</span><span class="nm">${esc(chargeName(c))}</span>
          <button class="ib del" data-a="delC" data-v="${c.id}" title="Supprimer">✕</button></div>`).join('') + '</div>';
    }
    h += nested('charges');
    const c = F.charges.find(x => x.id === ui.selC);
    if (c) {
      const d = H.CMAP[c.type], v = H.variantOf(c), U = AN.under[c.id] || [], onPiece = c.on !== 'field';
      const hosts = F.pieces.filter(p => !p.inner);
      const g = d.g === 'f' ? 'e' : '';
      h += `<div class="editor"><h4>${cap(d.sg)}</h4>`;
      /* intérieur composé : partition du meuble, pièces et meubles posés sur lui (une cotice sur un lion…) */
      h += c.inner
        ? `<div class="row"><button class="btn btn-accent" data-a="openP" data-v="${c.id}">Ouvrir l'intérieur ▸</button><button class="btn" data-a="uncomposeC" data-v="${c.id}">Retirer la composition</button></div>`
        : `<div class="row"><button class="btn" data-a="composeC" data-v="${c.id}">Composer ▸</button><span class="hint" style="margin:0">partition du meuble, pièces et meubles sur lui</span></div>`;
      if (d.variants.length > 1) h += `<div class="sec"><h3>Position</h3>${cards(d.variants.map(x => ({ id: x.id, name: x.name })), v.id, 'cvar', id => tVariant(d.id, id), 'small charges')}</div>`;
      if (!c.inner || c.inner.part === 'plein') h += `<div class="sec"><h3>Émail</h3>${swatches('ctinct', c.t, `data-k="${c.id}"`, ui.strict ? (id => H.conflicts(id, U)) : null)}</div>`;
      if (v.cp.has.armes) h += `<div class="sec attr"><h3><label class="check"><input type="checkbox" data-a="carmes" ${c.armes ? 'checked' : ''}> ${esc(v.armesNom)} d'un autre émail <em>(${esc(v.armesTerme)}${g})</em></label></h3>
        ${c.armes ? swatches('cattr', c.armes, 'data-k="armes"') : ''}</div>`;
      if (v.cp.has.langue) h += `<div class="sec attr"><h3><label class="check"><input type="checkbox" data-a="clangue" ${c.langue ? 'checked' : ''}> Langue <em>(${esc(v.langueTerme)}${g})</em></label></h3>
        ${c.langue ? swatches('cattr', c.langue, 'data-k="langue"') : ''}</div>`;
      /* peau des personnages : de l'émail du meuble par défaut, ou d'une des quatre nuances de carnation */
      /* cheveux : émail du meuble, ou un autre au choix ; auréole : d'or par défaut, modifiable */
      if (v.cp.has.cheveux) h += `<div class="sec attr"><h3><label class="check"><input type="checkbox" data-a="ccheveux" ${c.cheveux ? 'checked' : ''}> Cheveux d'un autre émail <em>(chevelé${g})</em></label></h3>
        ${c.cheveux ? swatches('cattr', c.cheveux, 'data-k="cheveux"') : ''}</div>`;
      if (v.cp.has.aureole) h += `<div class="sec attr"><h3>Auréole <em>(nimbé${g})</em></h3>${swatches('cattr', c.aureole || 'or', 'data-k="aureole"')}</div>`;
      /* couronne, bec, pattes, cornes, sabots, crête : un émail différent de celui du meuble, dit dans le blasonnement */
      H.EXTRAS.filter(x => v.cp.has[x.id]).forEach(x => {
        const t = c.extras && c.extras[x.id];
        h += `<div class="sec attr"><h3><label class="check"><input type="checkbox" data-a="cextra" data-k="${x.id}" ${t ? 'checked' : ''}> ${esc(v.extraNoms[x.id])}${x.opt ? '' : " d'un autre émail"} <em>(${esc(v.extraTermes[x.id])}${g})</em></label></h3>
          ${t ? swatches('cxt', t, `data-k="${x.id}"`) : ''}</div>`;
      });
      if (v.cp.has.peau) h += `<div class="sec attr"><h3><label class="check"><input type="checkbox" data-a="cpeau" ${c.peau ? 'checked' : ''}> Peau de carnation <em>(au naturel)</em></label></h3>
        ${c.peau ? `<div class="swatches">${H.SKINS.map(s => `<button class="sw${s.id === c.peau ? ' on' : ''}" data-a="cskin" data-v="${s.id}" title="${s.name}"><svg viewBox="0 0 10 10"><rect width="10" height="10" fill="${s.fill}"/></svg></button>`).join('')}</div><div class="tname">Carnation ${esc(H.SKIN_MAP[c.peau].name.toLowerCase())}</div>` : ''}</div>`;
      h += `
        <div class="sec"><h3>Emplacement</h3><div class="row">
          <select data-a="con" data-k="${c.id}"><option value="field"${!onPiece ? ' selected' : ''}>Dans le champ</option>
          ${hosts.map(p => `<option value="${p.id}"${c.on === p.id ? ' selected' : ''}>Sur : ${esc(pieceName(p))}</option>`).join('')}</select></div></div>`;
      if (!onPiece) h += `<div class="sec"><h3>Disposition</h3>${cards(H.ARR_ORDER.map(id => ({ id, name: H.ARR[id].l })), c.arr, 'carr', tArr, 'small')}</div>`;
      else h += `<div class="sec"><h3>Nombre</h3><div class="seg">${[1, 2, 3, 4, 5, 6, 8].map(n => `<button class="${c.n === n ? 'on' : ''}" data-a="cn" data-v="${n}">${n}</button>`).join('')}</div></div>`;
      /* orle : nombre de meubles au choix */
      if (!onPiece && H.ARR[c.arr].orle) h += `<div class="sec"><h3>Nombre dans l'orle</h3><div class="seg">${[6, 8, 10, 12, 14, 16, 20].map(n => `<button class="${H.chargeCount(c) === n ? 'on' : ''}" data-a="corn" data-v="${n}">${n}</button>`).join('')}</div></div>`;
      const ring = onPiece && hosts.some(p => p.id === c.on && (p.type === 'bordure' || p.type === 'orle'));
      if (H.chargeCount(c) !== 1 && !ring && !(!onPiece && H.ARR[c.arr].orle)) /* semé : pas en dessous de 0,30 (le nombre de meubles grandit comme l'inverse du carré de l'espacement) */
      h += H.chargeCount(c) === 0 ? slider('Espacement du semé', 'csp', c.id, Math.max(0.3, c.sp || 1), 'spSeme') : slider('Espacement', 'csp', c.id, c.sp, 'sp');
      if ([c.t, c.armes, c.langue].some(isFur)) h += slider('Taille de la fourrure', 'cfs', c.id, c.fs, 'fs') + centerBox('c', c.id, 'fc', c.fc);
      h += slider('Taille', 'cscale', c.id, c.scale, 'scale');
      h += slider('Épaisseur du contour', 'cow', c.id, c.ow, 'ow');
      /* sur un champ parti, coupé, tranché ou taillé de deux émaux : la figure prend l'émail de l'autre partie */
      if (!onPiece && H.twoTone(F) && !c.inner) h += `<div class="sec"><h3>Sur le trait</h3><div class="row">
        <label class="check"><input type="checkbox" data-a="ctr" data-v="c:ual" data-k="${c.id}" ${c.ual ? 'checked' : ''}> De l'un en l'autre <em>(à cheval sur le trait)</em></label>
        <label class="check"><input type="checkbox" data-a="ctr" data-v="c:uet" data-k="${c.id}" ${c.uet ? 'checked' : ''}> De l'un et de l'autre <em>(2 figures de part et d'autre)</em></label></div></div>`;
      /* mouvant : la figure sort d'un bord ; le choix par défaut est celui du meuble (haie, pont, arc-en-ciel : les flancs) */
      if (!onPiece) h += `<div class="sec"><h3>Mouvant</h3><div class="row"><select data-a="cmv" data-k="${c.id}">${[['', d.mouvant ? 'Par défaut (' + H.MOUVANTS[d.mouvant] + ')' : 'Non']].concat(d.mouvant ? [['non', 'Non']] : []).concat(Object.keys(H.MOUVANTS).map(k => [k, cap(H.MOUVANTS[k])])).map(([k, nm]) => `<option value="${k}"${(c.mv || '') === k ? ' selected' : ''}>${esc(nm)}</option>`).join('')}</select></div></div>`;
      h += offsetSliders('c', c);
      h += `
        <div class="row"><label class="check"><input type="checkbox" data-a="cflip" ${c.flip ? 'checked' : ''}> Contourné</label>
        <label class="check"><input type="checkbox" data-a="cinv" ${c.invert ? 'checked' : ''}> ${cap(d.renverse || 'renversé')}</label></div></div>`;
    }
    return h;
  }

  function renderTabs() {
    const F = cur();
    const n = { pieces: F.pieces.length, meubles: F.charges.length };
    $('#tabs').innerHTML = TABS.map(([id, nm]) =>
      `<button class="tab" role="tab" data-a="tab" data-v="${id}" aria-selected="${ui.tab === id}">${ICONS[id]}<span>${nm}${n[id] ? `<span class="count">${n[id]}</span>` : ''}</span></button>`).join('');
  }
  /* Re-rendu d'un panneau en gardant le curseur actif sélectionné (pour l'affiner au clavier) */
  function keepFocus(el, html) {
    const f = document.activeElement, sel = f && f.type === 'range' && el.contains(f) ? `input[data-a="${f.dataset.a}"][data-k="${f.dataset.k || ''}"]` : null;
    const top = el.scrollTop;
    el.innerHTML = html;
    el.scrollTop = top;
    if (sel) { const n = el.querySelector(sel); if (n) n.focus({ preventScroll: true }); }
  }
  function renderPanel() {
    keepFocus($('#panel'), { ecu: panelEcu, partition: panelPartition, pieces: panelPieces, meubles: panelMeubles }[ui.tab]());
  }
  function renderSide() {
    const F = cur(), n = { pieces: F.pieces.length, meubles: F.charges.length };
    $('#side-tabs').innerHTML = [['pieces', 'Pièces ajoutées'], ['meubles', 'Meubles ajoutés']].map(([id, nm]) =>
      `<button class="tab" role="tab" data-a="stab" data-v="${id}" aria-selected="${ui.side === id}">${ICONS[id]}<span>${nm}<span class="count${n[id] ? '' : ' zero'}">${n[id]}</span></span></button>`).join('');
    const c = W.crumbs;
    $('#side-where').innerHTML = `Dans : <b>${esc(c[c.length - 1].label)}</b>`;
    keepFocus($('#side'), ui.side === 'pieces' ? sidePieces() : sideMeubles());
  }
  /* ---------- Zoom de l'aperçu ----------
     L'écu lui-même grandit dans la zone centrale (redimensionné, donc toujours net) ;
     ox, oy : décalage de son centre par rapport au centre de la zone, en pixels. L'export n'est pas concerné. */
  const ZMAX = 8;
  const zoom = { z: 1, ox: 0, oy: 0, base: null };
  function applyZoom() {
    const pv = $('#preview'), wrap = pv.parentNode;
    if (zoom.z <= 1) {
      zoom.z = 1; zoom.ox = zoom.oy = 0; zoom.base = null;
      pv.removeAttribute('style'); wrap.style.height = '';
      wrap.classList.remove('zoomed');
    } else {
      if (!zoom.base) {
        /* taille de référence mesurée à 100 % ; la zone garde sa hauteur pendant le zoom */
        zoom.base = { w: pv.offsetWidth, h: pv.offsetHeight };
        wrap.style.height = wrap.offsetHeight + 'px';
        wrap.classList.add('zoomed');
      }
      const W = zoom.base.w * zoom.z, Hh = zoom.base.h * zoom.z;
      zoom.ox = Math.max(-W / 2, Math.min(W / 2, zoom.ox));
      zoom.oy = Math.max(-Hh / 2, Math.min(Hh / 2, zoom.oy));
      Object.assign(pv.style, {
        position: 'absolute', maxWidth: 'none', width: W + 'px', height: Hh + 'px',
        left: (wrap.clientWidth / 2 + zoom.ox - W / 2) + 'px', top: (wrap.clientHeight / 2 + zoom.oy - Hh / 2) + 'px'
      });
    }
    $('#z-reset').textContent = Math.round(zoom.z * 100) + ' %';
    $('#z-reset').disabled = $('#z-out').disabled = zoom.z <= 1;
    $('#z-in').disabled = zoom.z >= ZMAX;
  }
  /* zoom d'un facteur f en gardant fixe le point (cx, cy) de l'écran (par défaut : centre de la zone) */
  function zoomAt(f, cx, cy) {
    const wrap = $('#preview').parentNode, r = wrap.getBoundingClientRect();
    const nz = Math.min(ZMAX, Math.max(1, zoom.z * f)), k = nz / zoom.z;
    const px = cx === undefined ? 0 : cx - (r.left + r.width / 2), py = cy === undefined ? 0 : cy - (r.top + r.height / 2);
    zoom.ox = px - (px - zoom.ox) * k;
    zoom.oy = py - (py - zoom.oy) * k;
    zoom.z = nz;
    applyZoom();
  }
  const resetZoom = () => { zoom.z = 1; applyZoom(); };
  let drag = null, dragged = false;
  function initZoom() {
    const pv = $('#preview'), wrap = pv.parentNode;
    wrap.addEventListener('wheel', e => {
      if (!$('#preview svg') || e.target.closest('.zoom-bar')) return;
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX, e.clientY);
    }, { passive: false });
    /* glisser pour se déplacer quand on est zoomé ; un glissement n'est pas un clic */
    wrap.addEventListener('pointerdown', e => {
      if (zoom.z <= 1 || e.button !== 0 || e.target.closest('.zoom-bar')) return;
      drag = { cx: e.clientX, cy: e.clientY, ox: zoom.ox, oy: zoom.oy };
      dragged = false;
    });
    window.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.cx, dy = e.clientY - drag.cy;
      if (!dragged && Math.hypot(dx, dy) < 4) return;
      if (!dragged) { dragged = true; pv.classList.add('dragging'); }
      zoom.ox = drag.ox + dx; zoom.oy = drag.oy + dy;
      applyZoom();
    });
    window.addEventListener('resize', () => { if (zoom.z > 1) { const z = zoom.z; resetZoom(); zoomAt(z); } });
    window.addEventListener('pointerup', () => { drag = null; pv.classList.remove('dragging'); });
    $('#z-in').onclick = () => zoomAt(1.5);
    $('#z-out').onclick = () => zoomAt(1 / 1.5);
    $('#z-reset').onclick = resetZoom;
    /* curseurs : ← → d'un pas (natif) ; avec Maj, grand pas (0,10, ou 0,25 pour le motif du trait) */
    document.addEventListener('keydown', e => {
      const r = e.target;
      if (r.type !== 'range' || !e.shiftKey || !/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
      e.preventDefault();
      const big = Math.max(0.1, (+r.step || 0.01) * 5), d = /Right|Up/.test(e.key) ? big : -big;
      r.value = Math.min(+r.max, Math.max(+r.min, Math.round((+r.value + d) * 100) / 100));
      r.dispatchEvent(new Event('input', { bubbles: true }));
      r.dispatchEvent(new Event('change', { bubbles: true }));
    });
    document.addEventListener('keydown', e => {
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.ctrlKey || e.metaKey) return;
      if (document.body.dataset.view && document.body.dataset.view !== 'editeur') return;
      if (e.key === '+' || e.key === '=') zoomAt(1.5);
      else if (e.key === '-') zoomAt(1 / 1.5);
      else if (e.key === '0') resetZoom();
    });
  }

  /* ---------- Aperçu au survol des boutons d'ajout (pièces, meubles) ----------
     On dessine une copie du blason avec l'élément ajouté par défaut ; rien n'est enregistré. */
  let hoverKey = null;
  function showHover(a, v) {
    const T = JSON.parse(JSON.stringify(S)), F = H.walk(T, ui.path).F;
    const it = a === 'addP' ? newPiece(v) : newCharge(v);
    (a === 'addP' ? F.pieces : F.charges).push(it);
    if (ui.strict) H.fixItem(T, it.id);
    $('#preview').innerHTML = H.renderArms(T, { gloss: true, focus: W.path });
    $('#preview').classList.add('hover-preview');
    applyZoom();
  }
  function onHover(e) {
    const b = e.target.closest && e.target.closest('[data-a="addP"],[data-a="addC"]');
    const key = b ? b.dataset.a + ':' + b.dataset.v : null;
    if (key === hoverKey) return;
    hoverKey = key;
    if (b) showHover(b.dataset.a, b.dataset.v); else renderStage();
  }

  function renderStage() {
    hoverKey = null;
    $('#preview').classList.remove('hover-preview');
    $('#preview').innerHTML = H.renderArms(S, { gloss: true, focus: W.path });
    applyZoom();
    $('#blazon').textContent = H.blazon(S);
    const w = AN.warnings;
    $('#warnings').innerHTML = w.length
      ? `<div class="warn"><strong>Règle de contrariété non respectée</strong><ul>${w.map(x => `<li>${esc(x.msg)}</li>`).join('')}</ul><button class="btn" data-a="autofix">Corriger automatiquement</button></div>`
      : '<div class="good">✓ Ce blason respecte la règle de contrariété des émaux.</div>';
    $('#b-undo').disabled = hi <= 0;
    $('#b-redo').disabled = hi >= hist.length - 1;
  }
  function refresh() {
    W = H.walk(S, ui.path);
    ui.path = W.path;
    AN = H.analyze(S);
  }
  function renderAll() {
    refresh();
    renderCrumbs(); renderTabs(); renderPanel(); renderSide(); renderStage();
  }
  function enter(step) {
    ui.path = ui.path.concat([step]);
    ui.selP = ui.selC = null;
    const F = H.walk(S, ui.path).F;
    if (F.pieces[0]) ui.selP = F.pieces[0].id;
    if (F.charges[0]) ui.selC = F.charges[0].id;
  }

  /* ---------- Actions ---------- */
  const piece = id => cur().pieces.find(p => p.id === id);
  const charge = id => cur().charges.find(c => c.id === id);
  const newPiece = type => ({ id: rid('p'), type, line: 'droite', t: 'argent', th: 1 });
  const newCharge = (type, t) => ({ id: rid('c'), type, t: t || 'or', arr: '1', n: 1, on: 'field', scale: 1, flip: false, invert: false, rot: 0, variant: H.CMAP[type].variants[0].id, langue: null, armes: null, peau: null });
  /* Émail par défaut d'une langue ou d'armes : gueules, sauf si le meuble est déjà de gueules */
  const attrDefault = c => (c.t === 'gueules' ? 'azur' : 'gueules');
  /* émail par défaut d'une particularité : la couronne est d'or (de gueules sur un meuble d'or), les autres comme une langue */
  const extraDefault = (id, c) => (id === 'couronne' ? (c.t === 'or' ? 'gueules' : 'or') : attrDefault(c));

  function randomState() {
    const all = ['or', 'argent', 'gueules', 'azur', 'sable', 'sinople', 'pourpre'];
    const metals = ['or', 'argent'], colors = ['gueules', 'azur', 'sable', 'sinople'];
    function randField(depth) {
      const F = H.newField(rnd(all));
      const part = Math.random() < (depth ? 0.6 : 0.4) ? 'plein' : rnd(H.PARTS.filter(p => p.id !== 'plein' && (!depth || p.slots === 2))).id;
      const P = H.PMAP[part];
      F.part = part;
      F.line = P.lines && Math.random() < 0.35 ? rnd(H.LINES).id : 'droite';
      const k0 = H.cls(F.t[0]) === 'metal';
      /* bipartition métal / couleur selon les adjacences */
      const klass = [k0];
      for (let i = 1; i < P.slots; i++) { const nb = P.adj.find(([a, b]) => (a === i && b < i) || (b === i && a < i)); klass[i] = nb ? !klass[nb[0] === i ? nb[1] : nb[0]] : !k0; }
      for (let i = 1; i < P.slots; i++) F.t[i] = rnd(klass[i] ? metals : colors);
      if (!depth && P.compose && Math.random() < 0.25) {
        const k = Math.floor(Math.random() * P.slots), sub = randField(1);
        sub.t[0] = F.t[k]; F.subs[k] = sub;
      }
      const nP = depth ? rnd([0, 0, 1]) : rnd([0, 0, 1, 1, 1, 2]);
      for (let i = 0; i < nP; i++) {
        const p = { id: rid('p'), type: rnd(H.PIECES).id, line: Math.random() < 0.3 ? rnd(H.LINES).id : 'droite', t: rnd(all), th: 1 };
        if (!depth && H.PCMAP[p.type].box && Math.random() < 0.4) { p.inner = randField(1); p.inner.part = 'plein'; p.inner.subs = []; p.t = p.inner.t[0]; }
        F.pieces.push(p);
      }
      const nC = nP === 0 && !F.subs.some(Boolean) ? rnd([1, 1, 2]) : rnd([0, 1, 1]);
      for (let i = 0; i < nC; i++) {
        const c = newCharge(rnd(H.CHARGES).id, rnd(all));
        const ch = H.CMAP[c.type], v = rnd(ch.variants);
        c.variant = v.id;
        if (v.cp.has.armes && Math.random() < 0.5) c.armes = attrDefault(c);
        if (v.cp.has.langue && Math.random() < 0.5) c.langue = c.armes || attrDefault(c);
        H.EXTRAS.forEach(x => { if (v.cp.has[x.id] && Math.random() < 0.25) c.extras = Object.assign({}, c.extras, { [x.id]: extraDefault(x.id, c) }); });
        const hosts = F.pieces.filter(p => !p.inner);
        if (hosts.length && Math.random() < 0.35) { c.on = rnd(hosts).id; c.n = rnd([1, 2, 3]); }
        else c.arr = rnd(H.ARR_ORDER.filter(a => a !== 'seme' || !nP));
        F.charges.push(c);
      }
      return F;
    }
    const s = { v: 2, shape: S.shape, field: randField(0) };
    H.autofix(s);
    return s;
  }

  function setPart(F, v) {
    const old = H.PMAP[F.part], P = H.PMAP[v];
    F.part = v;
    for (let k = old.slots; k < 4; k++) F.t[k] = null;   /* aucun émail imposé pour les nouvelles parties */
    if (!P.lines) F.line = 'droite';
    F.subs = P.compose ? F.subs.slice(0, P.slots) : [];
  }

  function onClick(e) {
    const b = e.target.closest('[data-a]');
    if (!b || b.tagName === 'INPUT' || b.tagName === 'SELECT') return;
    const a = b.dataset.a, v = b.dataset.v, k = b.dataset.k, F = cur();
    switch (a) {
      case 'tab': ui.tab = v; if (v === 'pieces' || v === 'meubles') ui.side = v; renderTabs(); renderPanel(); renderSide(); return;
      case 'stab': ui.side = v; renderSide(); return;
      case 'goto': ui.path = ui.path.slice(0, +v); ui.selP = ui.selC = null; renderAll(); return;
      case 'cat': ui.cat = v; renderPanel(); return;
      case 'shape': S.shape = v; break;
      case 'part': setPart(F, v); break;
      case 'preset': PRESETS.find(p => p[0] === v)[2](F); ui.tab = 'partition'; break;
      case 'gridR': ui.gridR = +v; renderPanel(); return;
      case 'gridC': ui.gridC = +v; renderPanel(); return;
      case 'makeGrid': compose(F, gridField(ui.gridR, ui.gridC)); break;
      case 'pline': F.line = v; break;
      case 'ftinct': F.t[+k] = v; break;
      case 'swap': (H.PMAP[F.part].swap || []).forEach(([i, j]) => { [F.t[i], F.t[j]] = [F.t[j], F.t[i]]; [F.subs[i], F.subs[j]] = [F.subs[j], F.subs[i]]; }); break;
      case 'composeS': F.subs[+v] = H.newField(F.t[+v]); enter('s' + v); ui.tab = 'pieces'; break;
      case 'openS': enter('s' + v); renderAll(); return;
      case 'uncomposeS': { const sub = F.subs[+v]; if (sub) F.t[+v] = sub.t[0]; F.subs[+v] = null; break; }
      case 'addP': { const p = newPiece(v); F.pieces.push(p); ui.selP = p.id; ui.side = 'pieces'; strictFix(p.id); break; }
      case 'selP': ui.selP = v; renderSide(); return;
      case 'upP': case 'dnP': {
        const i = F.pieces.findIndex(p => p.id === v), j = a === 'upP' ? i - 1 : i + 1;
        if (j < 0 || j >= F.pieces.length) return;
        [F.pieces[i], F.pieces[j]] = [F.pieces[j], F.pieces[i]]; break;
      }
      case 'delP':
        F.pieces = F.pieces.filter(p => p.id !== v);
        F.charges.forEach(c => { if (c.on === v) c.on = 'field'; });
        if (ui.selP === v) ui.selP = null; break;
      case 'plineP': piece(ui.selP).line = v; break;
      case 'pnum': piece(ui.selP).n = +v; strictFix(ui.selP); break;
      case 'ptinct': { const p = piece(k); p.t = v; if (p.inner && p.inner.part === 'plein') p.inner.t[0] = v; if (p.comp === v) delete p.comp; break; }
      case 'pcomp': { const p = piece(k || ui.selP); if (v && v !== p.t) p.comp = v; else delete p.comp; break; }
      case 'composeP': {
        const p = piece(v); p.inner = H.newField(p.t);
        F.charges.filter(c => c.on === p.id).forEach(c => { F.charges.splice(F.charges.indexOf(c), 1); c.on = 'field'; c.arr = '1'; p.inner.charges.push(c); });
        enter(p.id); ui.tab = 'pieces'; break;
      }
      case 'openP': enter(v); renderAll(); return;
      case 'uncomposeP': { const p = piece(v); if (p.inner) p.t = p.inner.t[0] || p.t; delete p.inner; break; }
      case 'addC': { const c = newCharge(v); F.charges.push(c); ui.selC = c.id; ui.side = 'meubles'; strictFix(c.id); break; }
      case 'selC': ui.selC = v; renderSide(); return;
      case 'delC': F.charges = F.charges.filter(c => c.id !== v); if (ui.selC === v) ui.selC = null; break;
      case 'ctinct': { const c = charge(k); c.t = v; if (c.inner && c.inner.part === 'plein') c.inner.t[0] = v; break; }
      case 'composeC': { const c = charge(v); c.inner = H.newField(c.t); delete c.ual; delete c.uet; enter(c.id); ui.tab = 'pieces'; break; }
      case 'uncomposeC': { const c = charge(v); if (c.inner) c.t = c.inner.t[0] || c.t; delete c.inner; break; }
      case 'carr': charge(ui.selC).arr = v; break;
      case 'cvar': charge(ui.selC).variant = v; break;
      case 'cattr': charge(ui.selC)[k] = v; break;
      case 'cskin': charge(ui.selC).peau = v; break;
      case 'cn': charge(ui.selC).n = +v; break;
      case 'corn': charge(ui.selC).orn = +v; break;
      case 'corient': charge(ui.selC).rot = +v; break;
      case 'cxt': { const c = charge(ui.selC); c.extras = Object.assign({}, c.extras); c.extras[k] = v; break; }
      case 'rst': TUNE[v](+b.dataset.def, k); break;
      case 'autofix': H.autofix(S); break;
      default: return;
    }
    commit();
  }
  /* curseurs multiplicateurs : motif du trait, fourrure, espacement */
  const TUNE = {
    flz: (v) => { cur().lz = v; }, ffs: (v) => { cur().fs = v; },
    plz: (v, k) => { piece(k).lz = v; }, pfs: (v, k) => { piece(k).fs = v; },
    cfs: (v, k) => { charge(k).fs = v; }, csp: (v, k) => { charge(k).sp = v; },
    th: (v, k) => { piece(k).th = v; }, cscale: (v, k) => { charge(k).scale = v; }, cow: (v, k) => { charge(k).ow = v; },
    pdx: (v, k) => { piece(k).dx = v; }, pdy: (v, k) => { piece(k).dy = v; },
    cdx: (v, k) => { charge(k).dx = v; }, cdy: (v, k) => { charge(k).dy = v; }, crot: (v, k) => { charge(k).rot = v; }
  };
  function onInput(e) {
    const t = e.target, a = t.dataset.a;
    if (TUNE[a]) {
      TUNE[a](+t.value, t.dataset.k); refresh(); renderStage();
      const out = t.parentNode.querySelector('.tune-v'); if (out) out.textContent = fmtTune(+t.value, t.dataset.key);
    }
    else if (a === 'q') {
      ui.q = t.value; renderPanel();
      const s = $('.search'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    }
  }
  function onChange(e) {
    const t = e.target, a = t.dataset.a;
    if (TUNE[a]) commit();
    else if (a === 'cmv') { const c = charge(t.dataset.k); if (t.value) c.mv = t.value; else delete c.mv; commit(); }
    else if (a === 'cflip') { charge(ui.selC).flip = t.checked; commit(); }
    else if (a === 'cinv') { charge(ui.selC).invert = t.checked; commit(); }
    else if (a === 'clangue' || a === 'carmes') {
      const c = charge(ui.selC), key = a === 'clangue' ? 'langue' : 'armes';
      const other = c[key === 'langue' ? 'armes' : 'langue'];
      c[key] = t.checked ? (other || attrDefault(c)) : null;
      commit();
    }
    else if (a === 'ctr') {
      const [kind, prop] = t.dataset.v.split(':'), k = t.dataset.k;
      const it = kind === 'f' ? cur() : kind === 'p' ? piece(k) : charge(k);
      it[prop] = t.checked;
      if (t.checked && prop === 'sous') it.broch = false;
      if (t.checked && prop === 'broch') it.sous = false;
      if (t.checked && prop === 'ual') it.uet = false;
      if (t.checked && prop === 'uet') it.ual = false;
      commit();
    }
    else if (a === 'cextra') {
      const c = charge(ui.selC), id = t.dataset.k;
      c.extras = Object.assign({}, c.extras);
      c.extras[id] = t.checked ? extraDefault(id, c) : null;
      c.extras = cleanExtras(c.extras);
      commit();
    }
    else if (a === 'ccheveux') { const c = charge(ui.selC); c.cheveux = t.checked ? (c.t === 'sable' ? 'or' : 'sable') : null; commit(); }
    else if (a === 'cpeau') { charge(ui.selC).peau = t.checked ? H.SKINS[0].id : null; commit(); }
    else if (a === 'con') {
      const c = charge(t.dataset.k), pc = piece(t.value);
      c.on = t.value;
      c.n = pc && (pc.type === 'bordure' || pc.type === 'orle') ? 8 : (c.n || 1);
      strictFix(c.id);
      commit();
    }
  }
  /* Clic sur l'aperçu : on va éditer la partie composée la plus profonde sous le curseur */
  function onPreviewClick(e) {
    const svg = $('#preview svg');
    if (dragged) { dragged = false; return; }
    if (!svg) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const path = H.pathAt(S, p.x, p.y);
    if (JSON.stringify(path) === JSON.stringify(ui.path)) return;
    ui.path = []; ui.selP = ui.selC = null;
    path.forEach(enter);
    renderAll();
  }

  /* ---------- Export ---------- */
  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2200);
  }
  /* Nom de fichier tiré du blasonnement, simplifié : sans accents, ponctuation ni petits mots, coupé vers 60 caractères
     (« D'azur à trois trèfles d'or. » → blason-azur-trois-trefles-or) */
  const STOP = new Set(['de', 'd', 'du', 'des', 'a', 'au', 'aux', 'et', 'la', 'le', 'les', 'l', 'en', 'un', 'une', 'sur']);
  function fileName(ext) {
    const words = H.blazon(S).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .split(/[^a-z0-9]+/).filter(w => w && !STOP.has(w) && !/^\d+$/.test(w));   /* sans les chiffres (« 2 et 1 », « au 1 ») */
    let name = 'blason';
    for (const w of words) { if (name.length + w.length + 1 > 60) break; name += '-' + w; }
    return name + '.' + ext;
  }
  function exportSVG() { download(fileName('svg'), new Blob([H.renderArms(S, { standalone: true, px: 600 })], { type: 'image/svg+xml' })); }
  /* PNG de 3200 × 3968 : quatre fois la taille d'affichage habituelle, pour zoomer à 400 % sans voir les pixels */
  function exportPNG() {
    const W = 3200, Hh = Math.round(W * 248 / 200);
    const svg = H.renderArms(S, { standalone: true, px: W }), name = fileName('png');
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
      cv.getContext('2d').drawImage(img, 0, 0, W, Hh);
      cv.toBlob(b => download(name, b), 'image/png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function copyLink() {
    const url = location.href.split('#')[0] + '#s=' + btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    /* presse-papiers indisponible : le lien va dans la barre d'adresse (il en sera retiré à la prochaine modification) */
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Lien copié dans le presse-papiers'),
      () => { history.replaceState(null, '', url); toast('Lien placé dans la barre d\'adresse'); });
  }

  /* ---------- Démarrage ---------- */
  function init() {
    $('#fur-defs').innerHTML = H.FUR_DEFS;
    H.loadCharges();
    if (!H.CHARGES.length) document.body.insertAdjacentHTML('afterbegin', '<div class="warn" style="margin:8px">Aucun meuble chargé : lancez <b>assembler-meubles.bat</b> pour générer js/meubles-bundle.js à partir du dossier « meubles ».</div>');
    S = sanitize(load());
    save();   /* un blason reçu par lien devient le blason en cours */
    hist = [JSON.stringify(S)]; hi = 0;
    if (S.field.pieces[0]) ui.selP = S.field.pieces[0].id;
    if (S.field.charges[0]) ui.selC = S.field.charges[0].id;
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    $('#preview').addEventListener('click', onPreviewClick);
    initZoom();
    /* aperçu au survol, seulement avec une souris (pas au toucher) */
    document.addEventListener('pointerover', e => { if (e.pointerType === 'mouse') onHover(e); });
    document.documentElement.addEventListener('pointerleave', () => { if (hoverKey) renderStage(); });
    $('#b-undo').onclick = () => jump(-1);
    $('#b-redo').onclick = () => jump(1);
    $('#b-random').onclick = () => { S = randomState(); ui.path = []; ui.selP = S.field.pieces[0] && S.field.pieces[0].id; ui.selC = S.field.charges[0] && S.field.charges[0].id; commit(); };
    $('#b-reset').onclick = () => { S = { v: 2, shape: S.shape, field: H.newField('azur') }; ui.path = []; ui.selP = ui.selC = null; commit(); };
    $('#b-svg').onclick = exportSVG;
    $('#b-png').onclick = exportPNG;
    $('#b-link').onclick = copyLink;
    $('#strict').onchange = e => { ui.strict = e.target.checked; renderAll(); };
    document.addEventListener('keydown', e => {
      if (document.body.dataset.view && document.body.dataset.view !== 'editeur') return;
      if (!(e.ctrlKey || e.metaKey) || (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && e.target.type !== 'checkbox' && e.target.type !== 'range')) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); jump(-1); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); jump(1); }
    });
    renderAll();
  }
  /* accès pour les autres pages (galerie, blasonnement) */
  window.H.app = {
    get state() { return S; },
    sanitize,
    /* ouvre un blason dans l'éditeur (nouvelle étape de l'historique, donc annulable) */
    open(st) {
      S = sanitize(JSON.parse(JSON.stringify(st)));
      ui.path = []; ui.selP = S.field.pieces[0] ? S.field.pieces[0].id : null; ui.selC = S.field.charges[0] ? S.field.charges[0].id : null;
      commit();
      if (H.showView) H.showView('editeur');
    }
  };
  window.addEventListener('DOMContentLoaded', () => {
    try { init(); } catch (err) {
      document.body.insertAdjacentHTML('afterbegin', '<pre id="fatal" style="color:#a00;padding:12px;white-space:pre-wrap">' + err.stack + '</pre>');
    }
  });
})(window.H);
