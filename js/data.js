/* Données héraldiques : émaux, écus, traits, partitions, pièces, dispositions */
window.H = window.H || {};
(function (H) {
  H.INK = '#17130f';

  /* ---------- Émaux ---------- */
  H.TINCTURES = [
    { id: 'or', name: 'Or', cls: 'metal', fill: '#f2c230', de: "d'or", det: '#3a2a00' },
    { id: 'argent', name: 'Argent', cls: 'metal', fill: '#f6f4ee', de: "d'argent", det: '#222' },
    { id: 'gueules', name: 'Gueules', cls: 'color', fill: '#d1242f', de: 'de gueules', det: '#2a0508' },
    { id: 'azur', name: 'Azur', cls: 'color', fill: '#2a56a8', de: "d'azur", det: '#dbe6ff' },
    { id: 'sable', name: 'Sable', cls: 'color', fill: '#1d1b1c', de: 'de sable', det: '#cfcfcf' },
    { id: 'sinople', name: 'Sinople', cls: 'color', fill: '#238a47', de: 'de sinople', det: '#06210f' },
    { id: 'pourpre', name: 'Pourpre', cls: 'color', fill: '#80318f', de: 'de pourpre', det: '#f0d9f5' },
    { id: 'orange', name: 'Orangé', cls: 'color', fill: '#ec8a2c', de: "d'orangé", det: '#3a1a00' },
    { id: 'tanne', name: 'Tanné', cls: 'color', fill: '#8b5a2b', de: 'de tanné', det: '#f3e1c8' },
    { id: 'hermine', fam: 'hermine', name: 'Hermine', cls: 'fur', fill: 'url(#fur-hermine)', de: "d'hermine", det: '#222' },
    { id: 'contre-hermine', fam: 'hermine', name: 'Contre-hermine', cls: 'fur', fill: 'url(#fur-contre)', de: 'de contre-hermine', det: '#ddd' },
    { id: 'vair', fam: 'vair', name: 'Vair', cls: 'fur', fill: 'url(#fur-vair)', de: 'de vair', det: '#222' },
    { id: 'contre-vair', fam: 'vair', name: 'Contre-vair', cls: 'fur', fill: 'url(#fur-contre-vair)', de: 'de contre-vair', det: '#222' },
    /* variantes : mouchetures ou vair d'autres émaux (ceux des planches de référence) et tires autrement disposées */
    { id: 'hermine-or', fam: 'hermine', name: 'Herminé', cls: 'fur', fill: 'url(#fur-hermine-or)', de: "d'or herminé de sable", det: '#222' },
    { id: 'contre-hermine-or', fam: 'hermine', name: 'Contre-herminé', cls: 'fur', fill: 'url(#fur-contre-hermine-or)', de: "de sable contre-herminé d'or", det: '#f2c230' },
    { id: 'vaire', fam: 'vair', name: 'Vairé', cls: 'fur', fill: 'url(#fur-vaire)', de: "vairé d'or et de gueules", det: '#2a0508' },
    { id: 'vair-onde', fam: 'vair', name: 'Vair ondé', cls: 'fur', fill: 'url(#fur-vair-onde)', de: 'de vair ondé', det: '#222' },
    { id: 'vair-pal', fam: 'vair', name: 'Vair en pal', cls: 'fur', fill: 'url(#fur-vair-pal)', de: 'de vair en pal', det: '#222' },
    { id: 'vair-potence', fam: 'vair', name: 'Vair potencé', cls: 'fur', fill: 'url(#fur-vair-potence)', de: 'de vair potencé', det: '#222' }
  ];
  /* Carnation (couleur de peau des personnages) : quatre nuances, hors règle de contrariété */
  H.SKINS = [
    { id: 'claire', name: 'Claire', fill: '#f3d3b5' },
    { id: 'halee', name: 'Hâlée', fill: '#d9a574' },
    { id: 'brune', name: 'Brune', fill: '#9d6841' },
    { id: 'foncee', name: 'Foncée', fill: '#5c3b22' }
  ];
  H.SKIN_MAP = {};
  H.SKINS.forEach(s => (H.SKIN_MAP[s.id] = s));
  /* Fourrures à émaux choisis (herminé, contre-herminé, vairé) : l'identifiant porte le métal et la couleur,
     ex. « vaire~argent~sinople ». Ces émaux composés sont construits à la demande par H.TMAP et H.FUR_PAT. */
  H.FUR_CUSTOM = {
    /* forbid : [métal, couleur] qui redonnerait la fourrure ordinaire (hermine, contre-hermine, vair) */
    'hermine-or': { name: 'Herminé', m: 'or', c: 'sable', forbid: ['argent', 'sable'], de: (m, c) => `${m} herminé ${c}`, det: '#222' },
    'contre-hermine-or': { name: 'Contre-herminé', m: 'or', c: 'sable', forbid: ['argent', 'sable'], de: (m, c) => `${c} contre-herminé ${m}`, det: '#eee' },
    vaire: { name: 'Vairé', m: 'or', c: 'gueules', forbid: ['argent', 'azur'], de: (m, c) => `vairé ${m} et ${c}`, det: '#222' }
  };
  H.isVair = id => (H.TMAP[id] || {}).fam === 'vair';
  /* Vair et vairé d'un champ : 4 à 5 tires sur l'écu ; moins de 4 → beffroi, plus de 5 → menu-vair.
     À l'échelle 1, une tire fait 45 de haut pour un écu d'environ 222 (≈ 4,9 tires). */
  H.vairDe = (t, fs) => {
    const b = H.furBase(t), n = 222 / (45 * (fs || 1));
    if ((b !== 'vair' && b !== 'vaire') || (n >= 3.5 && n <= 5.5)) return H.tDe(t);
    const small = n > 5.5;
    if (b === 'vair') return small ? 'de menu-vair' : 'de beffroi';
    return H.TMAP[t].de.replace(/^vairé/, small ? 'menu-vairé' : 'beffroi');
  };
  H.furBase = id => String(id || '').split('~')[0];
  /* [métal, couleur] d'une fourrure à émaux choisis (valeurs par défaut pour l'identifiant simple) */
  H.furTinctures = id => {
    const [b, m, c] = String(id).split('~'), d = H.FUR_CUSTOM[b];
    return d ? [m || d.m, c || d.c] : null;
  };
  const TBASE = {};
  H.TINCTURES.forEach(t => (TBASE[t.id] = t));
  const custom = id => {
    const [b, m, c] = String(id).split('~'), d = H.FUR_CUSTOM[b];
    if (!d || !TBASE[m] || TBASE[m].cls !== 'metal' || !TBASE[c] || TBASE[c].cls !== 'color' || (d.forbid[0] === m && d.forbid[1] === c)) return undefined;
    return (TBASE[id] = { id, base: b, fam: TBASE[b].fam, name: d.name, cls: 'fur', fill: `url(#fur-${id.replace(/~/g, '_')})`, de: d.de(TBASE[m].de, TBASE[c].de), det: d.det });
  };
  H.TMAP = new Proxy(TBASE, { get: (t, k) => (typeof k !== 'string' ? t[k] : t[k] || (k.includes('~') ? custom(k) : undefined)) });
  H.cls = id => (H.TMAP[id] || {}).cls;
  /* Un émail non choisi (null) s'affiche hachuré et s'écrit « … » dans le blasonnement. */
  H.fill = id => {
    const t = H.TMAP[id];
    if (!t) return 'url(#undef)';
    /* fourrure composée : son motif est ajouté à la volée aux définitions de la page (pastilles, listes) */
    if (t.base && typeof document !== 'undefined') {
      const pid = t.fill.slice(5, -1), defs = document.getElementById('fur-defs');
      if (defs && !document.getElementById(pid)) defs.insertAdjacentHTML('beforeend', H.FUR_PAT[id](pid, 1));
    }
    return t.fill;
  };
  H.tDe = id => (H.TMAP[id] ? H.TMAP[id].de : 'de …');
  /* Règle de contrariété : pas de métal sur métal, ni de couleur sur couleur (fourrures neutres). */
  H.conflicts = function (t, under) {
    const c = H.cls(t);
    if (!c || c === 'fur') return false;
    const nf = under.filter(u => H.cls(u) && H.cls(u) !== 'fur');
    if (!nf.length) return false;
    return nf.every(u => H.cls(u) === c);
  };

  /* Fourrures, d'après les motifs Wikimedia « Hermine (champ) » et « Héraldique fourrure vair »,
     réduits pour en voir environ quatre rangs sur la largeur de l'écu. */
  const ERM = 'M-0.85-30.501c4.802 5.957-8.626 8.327-1.387 13.965 3.088 1.915 10.3-2.229 3.964-7.323-0.819-0.436 2.849-3.447-2.577-6.642z' +
    'M7.159-16.379c-1.201 0.113-2.358 0.854-3.452 2.746-1.371 3.171 4.657 8.671 8.715 1.91 0.286-0.825 4.313 1.818 6.541-3.719-3.818 4.012-7.726-0.777-11.271-0.936-0.174-9e-3-0.362-0.018-0.533-1e-3z' +
    'M-7.691-16.322c-3.546 0.158-7.453 4.966-11.271 0.953 2.228 5.538 6.297 2.896 6.584 3.721 4.056 6.762 10.042 1.264 8.671-1.908-1.249-2.162-2.596-2.828-3.984-2.766z' +
    'M0.298-12.465c-3.124 14.188-8.934 24.232-15.259 31.454 2.628-0.721 5.603-2.764 8.459-4.557-1.748 3.72-3.517 6.942-5.264 10.225 1.043-0.354 4.367-3.669 8.864-8.53 0.704 6.684 1.664 9.842 3.088 14.375 1.134-4.525 1.956-7.615 2.855-14.491 2.71 3.075 5.322 6.167 8.99 8.805l-5.132-10.577c2.658 1.7 5.617 3.921 8.437 4.87-6.683-7.585-12.341-17.384-15.038-31.574z';
  const EW = 74.74, EH = 104.9;
  /* s : échelle relative du motif (1 = taille sur l'écu entier) ; c : centre [x, y] autour duquel le motif grandit
     (une moucheture ou une cloche y reste ancrée), sinon il part du coin du dessin */
  const at = c => (c ? `translate(${+c[0].toFixed(2)} ${+c[1].toFixed(2)}) ` : '');
  const ermine = (bg, fg) => (id, s, c) => `<pattern id="${id}" width="${EW}" height="${EH}" patternUnits="userSpaceOnUse" patternTransform="${at(c)}scale(${+(0.42 * s).toFixed(4)})${c ? '' : ' translate(0 12)'}">` +
    `<rect width="${EW}" height="${EH}" fill="${bg}"/><g fill="${fg}">` +
    [[0, 0], [EW, 0], [0, EH], [EW, EH], [EW / 2, EH / 2]].map(([x, y]) => `<path transform="translate(${x} ${y})" d="${ERM}"/>`).join('') + '</g></pattern>';
  /* vair : cloches d'azur pointe en haut, rangs décalés d'une demi-cloche ; contre-vair : cloches de même émail base contre base */
  /* Vair, d'après les tracés de référence (Wikimedia « Vair », « Contre-vair », « Vair en pal », « Vair en pointe ») :
     cloche de 80 de large sur une tire de 72 de haut (149,3 × 134,3 dans les fichiers), épaulements à 45°.
     À l'échelle 1, une cloche fait le quart de la largeur de l'écu : 4 à 5 tires, comme un vair ordinaire.
     body(fg, bg) : contenu du motif de 80 × h ; sans centre, le motif part du coin haut gauche de l'écu. */
  const VS = 0.625;
  const vairPat = (h, body, fg, bg) => (id, s, c) => {
    fg = fg || '#2a56a8'; bg = bg || '#f6f4ee';
    return `<pattern id="${id}" width="80" height="${h}" patternUnits="userSpaceOnUse" patternTransform="${c ? at(c) : 'translate(12 12) '}scale(${+(VS * s).toFixed(4)})${c ? ' translate(-40 -36)' : ''}">` +
      `<rect width="80" height="${h}" fill="${bg}"/><g stroke="#000" stroke-width="1.6" stroke-linejoin="round">${body(fg, bg)}</g></pattern>`;
  };
  const BELL = (x, y) => `M${x},${y + 72}L${x + 20},${y + 52}V${y + 20}L${x + 40},${y}L${x + 60},${y + 20}V${y + 52}L${x + 80},${y + 72}Z`;
  const BELL_DOWN = (x, y) => `M${x},${y}L${x + 20},${y + 20}V${y + 52}L${x + 40},${y + 72}L${x + 60},${y + 52}V${y + 20}L${x + 80},${y}Z`;
  const path = (d, f) => `<path fill="${f}" d="${d}"/>`;
  /* vair : cloches d'azur pointe en haut, tires décalées d'une demi-cloche */
  const VAIR = (fg) => path(BELL(0, 0) + BELL(-40, 72) + BELL(40, 72), fg);
  /* vair potencé : T d'azur renversés (montant 20, traverse 60) imbriqués dans des T d'argent, rangs décalés d'une demi-tire */
  const POT = (x, y) => `M${x - 10},${y}H${x + 10}V${y + 24}H${x + 30}V${y + 72}H${x - 30}V${y + 24}H${x - 10}Z`;
  const FP = {
    hermine: ermine('#f6f4ee', '#1d1b1c'),
    'contre-hermine': ermine('#1d1b1c', '#f6f4ee'),
    'hermine-or': ermine('#f2c230', '#1d1b1c'),
    'contre-hermine-or': ermine('#1d1b1c', '#f2c230'),
    vair: vairPat(144, VAIR),
    /* contre-vair : les cloches de même émail se touchent base contre base */
    'contre-vair': vairPat(144, fg => path(BELL(0, 0) + BELL_DOWN(0, 72), fg)),
    vaire: vairPat(144, VAIR, '#d1242f', '#f2c230'),
    /* vair ondé (en pointe) : mêmes cloches à chaque tire, émaux inversés d'une tire à l'autre */
    'vair-onde': vairPat(144, (fg, bg) => path(BELL(0, 0), fg) + `<rect y="72" width="80" height="72" fill="${fg}" stroke="none"/>` + path(BELL(0, 72), bg)),
    /* vair en pal : cloches du même émail rangées les unes sur les autres */
    'vair-pal': vairPat(72, fg => path(BELL(0, 0), fg)),
    'vair-potence': vairPat(144, fg => path([0, 80].map(x => POT(x, 0)).join('') + [40, 120, -40].map(x => POT(x, 72)).join(''), fg))
  };
  /* motifs des fourrures composées : mêmes dessins, avec le métal et la couleur choisis */
  const TF = id => TBASE[id].fill;
  H.FUR_PAT = new Proxy(FP, { get: (t, k) => {
    if (typeof k !== 'string' || t[k] || !k.includes('~') || !H.TMAP[k]) return t[k];
    const [b, m, c] = k.split('~');
    return (t[k] = b === 'vaire' ? vairPat(144, VAIR, TF(c), TF(m)) : b === 'hermine-or' ? ermine(TF(m), TF(c)) : ermine(TF(c), TF(m)));
  } });
  const FUR_IDS = { 'contre-hermine': 'fur-contre' };
  H.FUR_DEFS =
    '<pattern id="undef" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#e6e1d5"/><rect width="4" height="8" fill="#d3ccbc"/></pattern>' +
    Object.keys(H.FUR_PAT).map(k => H.FUR_PAT[k](FUR_IDS[k] || 'fur-' + k, 1)).join('');

  /* ---------- Écus (viewBox 0 0 200 248) ---------- */
  /* Contour repris d'un document externe : converti en coordonnées absolues, puis mis à l'échelle (proportions
     conservées) et centré dans le cadre de l'écu. Commandes gérées : M L H V C Z (absolues ou relatives). */
  function fitShape(src, F) {
    const tk = src.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g);
    const out = [];
    let i = 0, cmd = 'M', x = 0, y = 0, sx = 0, sy = 0;
    const n = () => +tk[i++];
    while (i < tk.length) {
      if (/[a-zA-Z]/.test(tk[i])) cmd = tk[i++];
      const rel = cmd === cmd.toLowerCase();
      switch (cmd.toUpperCase()) {
        case 'M': { let a = n(), b = n(); if (rel) { a += x; b += y; } x = sx = a; y = sy = b; out.push(['M', x, y]); cmd = rel ? 'l' : 'L'; break; }
        case 'L': { let a = n(), b = n(); if (rel) { a += x; b += y; } x = a; y = b; out.push(['L', x, y]); break; }
        case 'H': { const a = n(); x = rel ? x + a : a; out.push(['L', x, y]); break; }
        case 'V': { const b = n(); y = rel ? y + b : b; out.push(['L', x, y]); break; }
        case 'C': {
          const p = [n(), n(), n(), n(), n(), n()];
          if (rel) for (let k = 0; k < 6; k += 2) { p[k] += x; p[k + 1] += y; }
          out.push(['C'].concat(p)); x = p[4]; y = p[5]; break;
        }
        default: out.push(['Z']); x = sx; y = sy;
      }
    }
    const xs = [], ys = [];
    out.forEach(c => { for (let k = 1; k < c.length; k += 2) { xs.push(c[k]); ys.push(c[k + 1]); } });
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const s = Math.min((F.r - F.l) / (x1 - x0), (F.b - F.t) / (y1 - y0));
    const ox = (F.l + F.r) / 2 - s * (x0 + x1) / 2, oy = (F.t + F.b) / 2 - s * (y0 + y1) / 2;
    const r = v => Math.round(v * 100) / 100;
    const d = out.map(c => c[0] + c.slice(1).map((v, k) => r(k % 2 ? oy + s * v : ox + s * v)).join(' ')).join('');
    const box = { l: r(ox + s * x0), r: r(ox + s * x1), t: r(oy + s * y0), b: r(oy + s * y1) };
    return { d, box, cy: r(box.t + 0.45 * (box.b - box.t)) };
  }
  const FRAME = { l: 12, r: 188, t: 12, b: 236 };
  /* d'après « Formes des blasons » (Wikimedia, écus polonais, suisse et tête de cheval) */
  const SRC_POLONAIS = 'm 188.33825,170.96272 c 1.22107,-1.78898 2.34943,-3.64418 5.96102,-3.72564 9.09941,-2.01682 13.10708,-8.91322 13.78487,-19.00076 l -0.52688,-6.20186 c -14.84577,0.67715 -8.6648,-13.04799 -2.08107,-11.54949 -4.84886,-2.26696 -2.58332,-5.06103 -3.35307,-7.95555 -4.19665,0.21748 -6.42689,-1.92473 -8.94154,-3.72565 -2.23222,-1.4792 -3.65263,-0.11702 -5.21589,0.74513 -1.90197,-0.88952 -3.72553,-2.48475 -5.96102,-0.37256 -2.15909,1.36755 -3.68681,3.26124 -7.82384,2.98051 -0.52864,3.08106 0.36256,6.75373 -4.09821,8.19641 7.51469,-0.53126 10.11437,10.90183 -1.49025,11.92204 l -0.74513,6.33359 c 0.26508,8.34423 3.30976,16.19293 14.15743,18.25563 3.90443,0.24529 5.18397,2.13114 6.33358,4.0982 z';
  const SRC_SUISSE = 'm 250.9252,28.745985 c 5.65814,4.0747 12.46995,5.08148 20.11845,-0.74513 5.38017,4.69076 11.13813,5.60372 17.5105,0.37257 v 8.94154 c 0.46703,16.99888 -6.4439,30.30879 -17.88307,41.354589 C 252.26421,63.322435 251.94926,49.985525 250.9252,36.569825 Z';
  const SRC_CHEVAL = 'm 51.45639,118.76652 c -5.81817,1.29205 -8.65873,1.17856 -14.12817,0 -1.838,6.07276 -6.09639,10.61319 -9.80804,14.78744 5.6971,9.10275 7.64485,19.70527 7.35857,32.58547 l 3.48693,0.85882 11.56896,0.0314 3.45371,-0.87703 c -0.60911,-9.07465 -0.002,-22.64481 7.01314,-32.54341 -4.8777,-3.96932 -7.40871,-8.98189 -8.9451,-14.84275 z';
  H.SHAPES = [
    { id: 'moderne', name: 'Français moderne', d: 'M12 12H188V118C188 182 146 220 100 234C54 220 12 182 12 118Z', box: { l: 12, r: 188, t: 12, b: 234 }, cy: 112 },
    { id: 'ancien', name: 'Écu en pointe', d: 'M12 12H188C188 98 168 176 100 236C32 176 12 98 12 12Z', box: { l: 12, r: 188, t: 12, b: 236 }, cy: 108 },
    { id: 'espagnol', name: 'Espagnol', d: 'M12 12H188V132A88 88 0 0 1 12 132Z', box: { l: 12, r: 188, t: 12, b: 220 }, cy: 112 },
    { id: 'ovale', name: 'Ovale', d: 'M12 124A88 112 0 1 1 188 124A88 112 0 1 1 12 124Z', box: { l: 12, r: 188, t: 12, b: 236 }, cy: 124 },
    { id: 'losange', name: 'Losange', d: 'M100 8L192 122L100 236L8 122Z', box: { l: 8, r: 192, t: 8, b: 236 }, cy: 122 },
    { id: 'normand', name: 'Normand', d: 'M100 10C150 10 176 28 176 62C176 120 130 190 100 238C70 190 24 120 24 62C24 28 50 10 100 10Z', box: { l: 24, r: 176, t: 10, b: 238 }, cy: 100 },
    { id: 'circulaire', name: 'Circulaire', d: 'M8 124A92 92 0 1 1 192 124A92 92 0 1 1 8 124Z', box: { l: 8, r: 192, t: 32, b: 216 }, cy: 124 },
    { id: 'banniere', name: 'Bannière (carré)', d: 'M14 26H186V214H14Z', box: { l: 14, r: 186, t: 26, b: 214 }, cy: 120 },
    /* cartouche : ovale échancré aux quatre points cardinaux */
    { id: 'cartouche', name: 'Cartouche', d: 'M107 18.4A82 106 0 0 1 181.8 117A7 7 0 0 0 181.8 131A82 106 0 0 1 107 229.6A7 7 0 0 0 93 229.6A82 106 0 0 1 18.2 131A7 7 0 0 0 18.2 117A82 106 0 0 1 93 18.4A7 7 0 0 0 107 18.4Z', box: { l: 18, r: 182, t: 18, b: 230 }, cy: 124 },
    /* targe : chef horizontal, bec à dextre puis échancrure pour la lance (courbe de l'écu allemand de la
       référence, mise à la même proportion), pointe arrondie */
    { id: 'targe', name: 'Targe', d: 'M6 24H188C190 60 190 90 190 124C190 190 150 228 100 236C50 228 16 190 18 130C18 118 17 110 16 104C66 138 62 42 12 76C22 62 22 36 6 24Z', box: { l: 12, r: 190, t: 24, b: 236 }, cy: 130 },
    Object.assign({ id: 'tete-cheval', name: 'Tête de cheval' }, fitShape(SRC_CHEVAL, FRAME)),
    Object.assign({ id: 'polonais', name: 'Polonais' }, fitShape(SRC_POLONAIS, FRAME)),
    Object.assign({ id: 'suisse', name: 'Suisse' }, fitShape(SRC_SUISSE, FRAME)),
    { id: 'accolade', name: 'Base en accolade', d: 'M14 12H186V190C186 206 170 210 140 212C118 213 106 218 100 232C94 218 82 213 60 212C30 210 14 206 14 190Z', box: { l: 14, r: 186, t: 12, b: 232 }, cy: 112 }
  ];
  H.SMAP = {};
  H.SHAPES.forEach(s => (H.SMAP[s.id] = s));
  H.shapeById = id => H.SMAP[id] || H.SHAPES[0];

  /* ---------- Traits (lignes de partition) ---------- */
  /* Traits de partition (profils dans geometry.js) — P : période, A : amplitude, en unités de l'écu.
     m : adjectif du blasonnement ; « {e} » marque l'accord dans une expression, inv : invariable. */
  H.LINES = [
    { id: 'droite', name: 'Droit', m: '', P: 0, A: 0 },
    { id: 'engrelee', name: 'Échancré', m: 'échancré', P: 15, A: 4.5 },
    { id: 'invectee', name: 'Cannelé', m: 'cannelé', P: 15, A: 4.5 },
    { id: 'ondee', name: 'Ondé', m: 'ondé', P: 40, A: 4 },
    { id: 'nebulee', name: 'Nébulé', m: 'nébulé', P: 32, A: 8 },
    { id: 'dentelee', name: 'Denché', m: 'denché', P: 12, A: 6.5 },
    { id: 'dancettee', name: 'Vivré', m: 'vivré', P: 40, A: 20 },
    { id: 'crenelee', name: 'Crénelé', m: 'crénelé', P: 26, A: 7 },
    { id: 'ragulee', name: 'Crénelé en bande', m: 'crénelé{e} en bande', P: 26, A: 7 },
    { id: 'mortaisee', name: 'Mortaisé', m: 'mortaisé', P: 22, A: 9 },
    { id: 'potencee', name: 'Potencé', m: 'potencé', P: 28, A: 8 },
    { id: 'palissadee', name: 'Palissadé', m: 'palissadé', P: 20, A: 12 },
    { id: 'rayonnee', name: 'Rayonné', m: 'rayonné', P: 15, A: 16 },
    { id: 'cime-sapin', name: 'En cime de sapin', m: 'en cime de sapin', inv: true, P: 30, A: 34 },
    { id: 'branche-sapin', name: 'En branche de sapin', m: 'en branche de sapin', inv: true, P: 40, A: 20 },
    { id: 'treflee', name: 'Tréflé', m: 'tréflé', P: 41, A: 26.5 },
    { id: 'fleurdelisee', name: 'Fleurdelisé', m: 'fleurdelisé', P: 30, A: 22 },
    { id: 'contre-fleurdelisee', name: 'Contre-fleurdelisé', m: 'contre-fleurdelisé', P: 50, A: 30 },
    { id: 'emanchee', name: 'Émanché', m: 'émanché', P: 26, A: 22 }
  ];
  H.LMAP = {};
  H.LINES.forEach(l => (H.LMAP[l.id] = l));
  /* pl : pluriel (pièces multiples) */
  H.lineAdj = (id, g, pl) => {
    const l = H.LMAP[id];
    if (!l || !l.m) return '';
    if (l.inv) return l.m;
    const e = (g === 'f' ? 'e' : '') + (pl ? 's' : '');
    return l.m.includes('{e}') ? l.m.replace(/\{e\}/g, e) : l.m + e;
  };

  /* ---------- Partitions ---------- */
  H.PARTS = [
    /* compose : chaque partie peut recevoir son propre champ (poupées russes).
       pos : formule de blasonnement de chaque partie. swap : permutation « intervertir les émaux ». */
    /* Champ plein */
    { id: 'plein', name: 'Plein', slots: 1, lines: false, adj: [], labels: ['Champ'] },
    /* Partitions simples : une ligne, deux parties */
    { id: 'parti', name: 'Parti', slots: 2, lines: true, compose: true, adj: [[0, 1]], labels: ['À dextre', 'À senestre'], pos: ['à dextre', 'à senestre'], swap: [[0, 1]] },
    { id: 'coupe', name: 'Coupé', slots: 2, lines: true, compose: true, adj: [[0, 1]], labels: ['Chef', 'Pointe'], pos: ['en chef', 'en pointe'], swap: [[0, 1]] },
    { id: 'tranche', name: 'Tranché', slots: 2, lines: true, compose: true, adj: [[0, 1]], labels: ['Partie haute', 'Partie basse'], pos: ['au premier', 'au second'], swap: [[0, 1]] },
    { id: 'taille', name: 'Taillé', slots: 2, lines: true, compose: true, adj: [[0, 1]], labels: ['Partie haute', 'Partie basse'], pos: ['au premier', 'au second'], swap: [[0, 1]] },
    /* Tiercés et partitions en trois */
    { id: 'tierce-pal', name: 'Tiercé en pal', slots: 3, lines: true, compose: true, adj: [[0, 1], [1, 2]], labels: ['Dextre', 'Centre', 'Senestre'], pos: ['à dextre', 'au centre', 'à senestre'], swap: [[0, 2]] },
    { id: 'tierce-fasce', name: 'Tiercé en fasce', slots: 3, lines: true, compose: true, adj: [[0, 1], [1, 2]], labels: ['Chef', 'Centre', 'Pointe'], pos: ['en chef', 'au centre', 'en pointe'], swap: [[0, 2]] },
    { id: 'tierce-chevron', name: 'Tiercé en chevron', slots: 3, lines: true, compose: true, adj: [[0, 1], [1, 2]], labels: ['Chef', 'Chevron', 'Pointe'], pos: ['en chef', 'au centre', 'en pointe'], swap: [[0, 2]] },
    { id: 'tierce-pairle', name: 'Tiercé en pairle', slots: 3, lines: true, compose: true, adj: [[0, 1], [0, 2], [1, 2]], labels: ['Chef', 'Dextre', 'Senestre'], pos: ['en chef', 'à dextre', 'à senestre'], swap: [[1, 2]] },
    { id: 'chape', name: 'Chapé', slots: 3, lines: true, compose: true, adj: [[0, 1], [0, 2]], labels: ['Pointe', 'Flanc dextre', 'Flanc senestre'], pos: ['en pointe', 'à dextre', 'à senestre'], swap: [[1, 2]] },
    { id: 'chausse', name: 'Chaussé', slots: 3, lines: true, compose: true, adj: [[0, 1], [0, 2]], labels: ['Chef', 'Flanc dextre', 'Flanc senestre'], pos: ['en chef', 'à dextre', 'à senestre'], swap: [[1, 2]] },
    /* Mi-partitions : une ligne de partition combinée avec la moitié d'une autre */
    { id: 'parti-mi-coupe', name: 'Parti mi-coupé', slots: 3, lines: true, compose: true, adj: [[0, 1], [0, 2], [1, 2]], labels: ['Chef dextre', 'Pointe dextre', 'Senestre'], pos: ['en chef à dextre', 'en pointe à dextre', 'à senestre'], swap: [[0, 1]] },
    { id: 'parti-mi-coupe-sen', name: 'Parti mi-coupé à senestre', slots: 3, lines: true, compose: true, adj: [[0, 1], [0, 2], [1, 2]], labels: ['Dextre', 'Chef senestre', 'Pointe senestre'], pos: ['à dextre', 'en chef à senestre', 'en pointe à senestre'], swap: [[1, 2]] },
    { id: 'mi-parti-coupe', name: 'Mi-parti coupé', slots: 3, lines: true, compose: true, adj: [[0, 1], [0, 2], [1, 2]], labels: ['Chef dextre', 'Chef senestre', 'Pointe'], pos: ['en chef à dextre', 'en chef à senestre', 'en pointe'], swap: [[0, 1]] },
    { id: 'coupe-mi-coupe', name: 'Coupé mi-coupé', slots: 3, lines: true, compose: true, adj: [[0, 1], [0, 2], [1, 2]], labels: ['Chef', 'Pointe dextre', 'Pointe senestre'], pos: ['en chef', 'en pointe à dextre', 'en pointe à senestre'], swap: [[1, 2]] },
    /* Partitions en quatre et plus */
    { id: 'quarte-pal', name: 'Parti de trois traits', slots: 4, lines: true, compose: true, adj: [[0, 1], [1, 2], [2, 3]], labels: ['1 · dextre', '2 · centre dextre', '3 · centre senestre', '4 · senestre'], pos: ['au 1', 'au 2', 'au 3', 'au 4'], swap: [[0, 1], [2, 3]] },
    { id: 'quarte-fasce', name: 'Coupé de trois traits', slots: 4, lines: true, compose: true, adj: [[0, 1], [1, 2], [2, 3]], labels: ['1 · chef', '2 · rang du haut', '3 · rang du bas', '4 · pointe'], pos: ['au 1', 'au 2', 'au 3', 'au 4'], swap: [[0, 1], [2, 3]] },
    { id: 'ecartele', name: 'Écartelé', slots: 4, lines: true, compose: true, adj: [[0, 1], [0, 2], [1, 3], [2, 3]], labels: ['1 · chef dextre', '2 · chef senestre', '3 · pointe dextre', '4 · pointe senestre'], pos: ['au 1', 'au 2', 'au 3', 'au 4'], swap: [[0, 1], [2, 3]] },
    { id: 'sautoir', name: 'Écartelé en sautoir', slots: 4, lines: true, compose: true, adj: [[0, 1], [0, 2], [3, 1], [3, 2]], labels: ['Chef', 'Flanc dextre', 'Flanc senestre', 'Pointe'], pos: ['en chef', 'à dextre', 'à senestre', 'en pointe'], swap: [[0, 1], [2, 3]] },
    { id: 'girone', name: 'Gironné', slots: 2, lines: true, adj: [[0, 1]], labels: ['Fond', 'Girons'], pieces: 8, swap: [[0, 1]] },
    /* Répétitions de pièces */
    { id: 'pale', name: 'Palé', slots: 2, lines: true, adj: [[0, 1]], labels: ['Fond', 'Pals'], pieces: 6, swap: [[0, 1]] },
    { id: 'fasce', name: 'Fascé', slots: 2, lines: true, adj: [[0, 1]], labels: ['Fond', 'Fasces'], pieces: 8, swap: [[0, 1]] },
    { id: 'burele', name: 'Burelé', slots: 2, lines: true, adj: [[0, 1]], labels: ['Fond', 'Burelles'], pieces: 10, swap: [[0, 1]] },
    { id: 'bande', name: 'Bandé', slots: 2, lines: true, adj: [[0, 1]], labels: ['Fond', 'Bandes'], pieces: 6, swap: [[0, 1]] },
    { id: 'barre', name: 'Barré', slots: 2, lines: true, adj: [[0, 1]], labels: ['Fond', 'Barres'], pieces: 6, swap: [[0, 1]] },
    /* Réseaux */
    { id: 'echiquete', name: 'Échiqueté', slots: 2, lines: false, adj: [[0, 1]], labels: ['Fond', 'Cases'], swap: [[0, 1]] },
    { id: 'losange', name: 'Losangé', slots: 2, lines: false, adj: [[0, 1]], labels: ['Fond', 'Losanges'], swap: [[0, 1]] },
    { id: 'fusele', name: 'Fuselé', slots: 2, lines: false, adj: [[0, 1]], labels: ['Fond', 'Fuseaux'], swap: [[0, 1]] }
  ];
  H.PMAP = {};
  H.PARTS.forEach(p => (H.PMAP[p.id] = p));

  /* ---------- Pièces honorables ---------- */
  /* box : la pièce peut contenir son propre champ (partition, pièces, meubles). */
  H.PIECES = [
    { id: 'chef', name: 'Chef', g: 'm', box: true },
    { id: 'fasce', name: 'Fasce', g: 'f' },
    { id: 'pal', name: 'Pal', g: 'm' },
    { id: 'bande', name: 'Bande', g: 'f' },
    { id: 'barre', name: 'Barre', g: 'f' },
    { id: 'croix', name: 'Croix', g: 'f' },
    { id: 'sautoir', name: 'Sautoir', g: 'm' },
    { id: 'chevron', name: 'Chevron', g: 'm' },
    { id: 'pairle', name: 'Pairle', g: 'm' },
    { id: 'bordure', name: 'Bordure', g: 'f' },
    { id: 'orle', name: 'Orle', g: 'm', v: true },
    { id: 'canton', name: 'Canton', g: 'm', box: true },
    { id: 'franc-quartier', name: 'Franc-quartier', g: 'm', box: true },
    { id: 'champagne', name: 'Champagne', g: 'f', box: true },
    { id: 'ecusson', name: 'Écusson', g: 'm', v: true, box: true },
    /* enté en pointe : l'écartelé (ou autre partition) reçoit en pointe une partie arrondie, qui s'ajoute aux quartiers */
    { id: 'ente', name: 'Enté en pointe', g: 'm', v: true, box: true }
  ];
  H.PCMAP = {};
  H.PIECES.forEach(p => (H.PCMAP[p.id] = p));

  /* ---------- Dispositions des meubles dans le champ (x,y en fraction de l'écu) ---------- */
  H.ARR = {
    '1': { n: 1, pts: [[0, 0]], s: 0.58, l: 'Au centre', txt: '' },
    'chef1': { n: 1, pts: [[0, -0.3]], s: 0.3, l: 'En chef', txt: 'en chef' },
    'pointe1': { n: 1, pts: [[0, 0.3]], s: 0.3, l: 'En pointe', txt: 'en pointe' },
    '2pal': { n: 2, pts: [[0, -0.2], [0, 0.2]], s: 0.34, l: '2 en pal', txt: 'rangés en pal' },
    '2fasce': { n: 2, pts: [[-0.22, 0], [0.22, 0]], s: 0.36, l: '2 en fasce', txt: 'rangés en fasce' },
    '3': { n: 3, pts: [[-0.2, -0.15], [0.2, -0.15], [0, 0.2]], s: 0.34, l: '3 · 2 et 1', txt: '2 et 1' },
    '3b': { n: 3, pts: [[0, -0.2], [-0.2, 0.15], [0.2, 0.15]], s: 0.34, l: '3 · 1 et 2', txt: '1 et 2' },
    '3pal': { n: 3, pts: [[0, -0.28], [0, 0], [0, 0.28]], s: 0.26, l: '3 en pal', txt: 'rangés en pal' },
    '3fasce': { n: 3, pts: [[-0.28, 0], [0, 0], [0.28, 0]], s: 0.26, l: '3 en fasce', txt: 'rangés en fasce' },
    '3bande': { n: 3, pts: [[-0.24, -0.22], [0, 0], [0.24, 0.22]], s: 0.26, l: '3 en bande', txt: 'rangés en bande' },
    'chef3': { n: 3, pts: [[-0.27, -0.32], [0, -0.32], [0.27, -0.32]], s: 0.22, l: '3 en chef', txt: 'rangés en chef' },
    '4': { n: 4, pts: [[-0.2, -0.17], [0.2, -0.17], [-0.17, 0.2], [0.17, 0.2]], s: 0.31, l: '4 · 2 et 2', txt: '2 et 2' },
    '5': { n: 5, pts: [[-0.22, -0.2], [0.22, -0.2], [0, 0], [-0.17, 0.22], [0.17, 0.22]], s: 0.25, l: '5 · 2, 1 et 2', txt: '2, 1 et 2' },
    '6': { n: 6, pts: [[-0.27, -0.24], [0, -0.24], [0.27, -0.24], [-0.14, 0], [0.14, 0], [0, 0.24]], s: 0.22, l: '6 · 3, 2 et 1', txt: '3, 2 et 1' },
    'orle': { n: 8, orle: true, s: 0.17, l: 'En orle (8)', txt: 'en orle' },
    'seme': { n: 0, seme: true, s: 0.14, l: 'Semé', txt: 'semé' }
  };
  /* Les neuf points de l'écu, numérotés du chef vers la pointe et de dextre vers senestre :
       1 · 2 · 3     canton dextre du chef, point du chef, canton senestre du chef
       4 · 5 · 6     flanc dextre, cœur (abîme), flanc senestre
       7 · 8 · 9     canton dextre de la pointe, point de la pointe, canton senestre de la pointe
     Les cantons de la pointe (7 et 9) sont resserrés vers l'axe : l'écu s'y rétrécit, surtout l'écu en pointe.
     Dispositions nommées d'après ces points. */
  const PT = { 1: [-0.27, -0.3], 2: [0, -0.3], 3: [0.27, -0.3], 4: [-0.27, 0], 5: [0, 0], 6: [0.27, 0], 7: [-0.17, 0.28], 8: [0, 0.3], 9: [0.17, 0.28] };
  const onPts = (l, txt, s, pts) => ({ n: pts.length, pts, s, l, txt });
  const points = (l, txt, s, ...nums) => onPts(l, txt, s, nums.map(i => PT[i]));
  Object.assign(H.ARR, {
    /* un meuble sur l'un des points (le 2, le 5 et le 8 sont « en chef », « au centre » et « en pointe ») */
    p1: points('Canton dextre du chef', 'au canton dextre du chef', 0.26, 1),
    p3: points('Canton senestre du chef', 'au canton senestre du chef', 0.26, 3),
    p4: points('Flanc dextre', 'au flanc dextre', 0.28, 4),
    p6: points('Flanc senestre', 'au flanc senestre', 0.28, 6),
    p7: points('Canton dextre de la pointe', 'au canton dextre de la pointe', 0.22, 7),
    p9: points('Canton senestre de la pointe', 'au canton senestre de la pointe', 0.22, 9),
    /* entre le point du chef et le cœur, entre le cœur et le point de la pointe */
    honneur: onPts("Point d'honneur", "en point d'honneur", 0.3, [[0, -0.15]]),
    nombril: onPts('Nombril', 'au nombril', 0.3, [[0, 0.15]]),
    /* plusieurs meubles qui prennent l'orientation d'une pièce : « rangés en … » */
    barre3: points('3 en barre', 'rangés en barre', 0.24, 7, 5, 3),
    croix: points('5 en croix', 'rangés en croix', 0.2, 2, 4, 5, 6, 8),
    sautoir: points('5 en sautoir', 'rangés en sautoir', 0.2, 1, 3, 5, 7, 9),
    chevron: points('3 en chevron', 'rangés en chevron', 0.22, 2, 7, 9),
    'chevron-r': points('3 en chevron renversé', 'rangés en chevron renversé', 0.22, 1, 3, 8),
    pairle: points('4 en pairle', 'rangés en pairle', 0.22, 1, 3, 5, 8),
    'pairle-r': points('4 en pairle renversé', 'rangés en pairle renversé', 0.22, 2, 5, 7, 9),
    pointe3: points('3 en pointe', 'rangés en pointe', 0.17, 7, 8, 9),
    'flanc-d': points('3 au flanc dextre', 'rangés au flanc dextre', 0.22, 1, 4, 7),
    'flanc-d': points('3 au flanc dextre', 'rangés au flanc dextre', 0.22, 1, 4, 7),
    'flanc-s': points('3 au flanc senestre', 'rangés au flanc senestre', 0.22, 3, 6, 9)
  });
  /* Figures liées à une pièce : leurs places dépendent d'elle (geometry.js).
     canton : quatre meubles entre les bras d'une croix ou d'un sautoir (« cantonné de quatre … ») ;
     accoste : deux meubles de part et d'autre d'un pal, d'une bande ou d'une barre, au milieu, en chef ou en pointe.
     Sans la pièce qui convient, ils se disent « 2 et 2 » et « rangés en fasce » (geometry.js place alors les quartiers). */
  Object.assign(H.ARR, {
    canton: { n: 4, canton: true, pts: [[-0.27, -0.2], [0.27, -0.2], [-0.27, 0.2], [0.27, 0.2]], s: 0.24, l: 'Cantonné (4)', txt: 'cantonné' },
    accoste: { n: 2, accoste: true, pts: [[-0.3, 0], [0.3, 0]], s: 0.26, l: 'Accosté (2)', txt: 'accosté' },
    'accoste-chef': { n: 2, accoste: true, along: -1, pts: [[-0.3, -0.2], [0.3, -0.2]], s: 0.22, l: 'Accosté en chef (2)', txt: 'accosté en chef' },
    'accoste-pointe': { n: 2, accoste: true, along: 1, pts: [[-0.3, 0.2], [0.3, 0.2]], s: 0.22, l: 'Accosté en pointe (2)', txt: 'accosté en pointe' }
  });
  /* « de l'un en l'autre » et « de l'un et de l'autre » : possibles sur un champ à deux parties simples d'émaux différents
     (parti, coupé, tranché, taillé) : la figure prend, dans chaque partie, l'émail de l'autre. */
  H.TWO_TONE = ['parti', 'coupe', 'tranche', 'taille'];
  H.twoTone = F => !!(F && H.TWO_TONE.includes(F.part) && F.t[0] && F.t[1] && F.t[0] !== F.t[1] && !(F.subs && (F.subs[0] || F.subs[1])));
  H.ARR_ORDER = ['1', 'chef1', 'pointe1', 'p1', 'p3', 'p4', 'p6', 'p7', 'p9', 'honneur', 'nombril',
    '2pal', '2fasce', '3', '3b', '3pal', '3fasce', '3bande', 'barre3', 'chef3', 'pointe3', 'flanc-d', 'flanc-s', 'chevron', 'chevron-r',
    '4', 'canton', 'accoste', 'accoste-chef', 'accoste-pointe', '5', 'croix', 'sautoir', 'pairle', 'pairle-r', '6', 'orle', 'seme'];
})(window.H);
