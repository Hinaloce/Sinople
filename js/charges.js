/* Meubles : lecture des fichiers SVG du dossier « meubles » (assemblés dans js/meubles-bundle.js).

   Format d'un fichier : viewBox quelconque (ramené à 100×100), calques nommés par id ou par
   nom de calque Inkscape :
     corps   — silhouette, prend l'émail du meuble (tout élément hors calque va dans « corps ») ;
     langue  — facultatif, affiché seulement si la langue est activée, émail au choix ;
     armes   — facultatif (griffes, serres, cornes…), émail du corps ou émail au choix ;
     details — traits intérieurs (yeux, crinière…), couleur de contraste automatique ;
     couronne, bec, membres, cornes, sabots, crete — facultatifs, particularités d'émail au choix (voir H.EXTRAS).
   Les couleurs du fichier sont ignorées ; « fill="none" » désigne un trait (on garde son épaisseur).
   Les métadonnées sont des attributs data-* de la balise <svg> (voir meubles/LISEZMOI.md). */
(function (H) {
  /* cheveux : émail du meuble par défaut ; aureole : d'or par défaut ; l'un et l'autre peuvent changer d'émail */
  const LAYERS = ['corps', 'langue', 'armes', 'details', 'peau', 'cheveux', 'aureole'];
  const PH = { corps: '__T__', langue: '__L__', armes: '__A__', details: '__D__', peau: '__S__', cheveux: '__C__', aureole: '__N__' };
  /* Particularités à émail au choix : un calque facultatif et un terme héraldique chacun (« couronné d'or »,
     « becqué de gueules »…). Le terme peut être changé par data-<calque>-terme. opt : le calque n'est dessiné
     que si la particularité est activée (une couronne s'ajoute), sinon il l'est toujours, de l'émail du meuble. */
  H.EXTRAS = [
    { id: 'couronne', nom: 'Couronne', terme: 'couronné', opt: true },
    { id: 'bec', nom: 'Bec', terme: 'becqué' },
    { id: 'membres', nom: 'Pattes', terme: 'membré' },
    { id: 'cornes', nom: 'Cornes', terme: 'accorné' },
    { id: 'sabots', nom: 'Sabots', terme: 'onglé' },
    { id: 'crete', nom: 'Crête', terme: 'crêté' }
  ];
  H.EXTRA_MAP = {};
  H.EXTRAS.forEach(x => { H.EXTRA_MAP[x.id] = x; LAYERS.push(x.id); PH[x.id] = `__X${x.id}__`; });
  /* Mode encre : tons chair des dessins d'origine → peau (émail du meuble ou carnation choisie) ;
     cheveux bruns → émail du meuble, pour une figure entièrement monochrome par défaut */
  const SKIN_COLORS = ['#eabfa2', '#eabfa1', '#fd9863', '#fad398', '#fc9', '#ffcc99'];
  const HAIR_COLORS = ['#725a42', '#4f1a00'];
  const SHAPES = ['path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line', 'text'];
  const SKIP = ['defs', 'metadata', 'title', 'desc', 'style', 'script', 'sodipodi:namedview', 'namedview'];
  const KEEP_STYLE = ['stroke-width', 'fill-rule', 'stroke-linecap', 'stroke-linejoin', 'display', 'opacity', 'stroke-miterlimit'];
  const r2 = v => Math.round(v * 1000) / 1000;

  H.CHARGE_CATS = [['tous', 'Tous'], ['animaux', 'Quadrupèdes'], ['oiseaux', 'Oiseaux'], ['aquatiques', 'Aquatiques & reptiles'], ['fabuleux', 'Fabuleux'],
    ['insectes', 'Insectes & petites bêtes'], ['corps', 'Corps humain'], ['vegetaux', 'Végétaux'], ['astres', 'Astres & éléments'], ['croix', 'Croix'],
    ['figures', 'Figures géométriques'], ['armes', 'Armes & armures'], ['edifices', 'Édifices & navires'], ['objets', 'Objets & figures']];

  function layerName(el) {
    const lab = (el.getAttribute('inkscape:label') || el.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') || el.getAttribute('id') || '').toLowerCase().trim();
    return LAYERS.includes(lab) ? lab : null;
  }
  /* Nettoie un élément : retire couleurs, identifiants et attributs d'éditeur ; pose le marqueur de couleur du calque */
  function clean(el, layer) {
    const style = {};
    (el.getAttribute('style') || '').split(';').forEach(p => { const i = p.indexOf(':'); if (i > 0) style[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
    const fill = el.getAttribute('fill') || style.fill, stroke = el.getAttribute('stroke') || style.stroke;
    [...el.attributes].map(a => a.name).forEach(n => {
      if (n === 'id' || n === 'class' || n === 'style' || n === 'fill' || n === 'stroke' || n.includes(':') || n.startsWith('data-')) el.removeAttribute(n);
    });
    KEEP_STYLE.forEach(k => { if (style[k] && !el.hasAttribute(k)) el.setAttribute(k, style[k]); });
    const tag = el.localName;
    if (SHAPES.includes(tag)) {
      const isTrait = (fill === 'none' || tag === 'line' || (tag === 'polyline' && !fill)) && stroke && stroke !== 'none';
      if (isTrait) { el.setAttribute('fill', 'none'); el.setAttribute('stroke', PH[layer]); if (!el.hasAttribute('stroke-width')) el.setAttribute('stroke-width', '1'); }
      else if (fill === 'none') el.setAttribute('fill', 'none');
      else { el.setAttribute('fill', PH[layer]); el.removeAttribute('stroke-width'); }
    }
    [...el.children].forEach(ch => { if (SKIP.includes(ch.nodeName)) ch.remove(); else clean(ch, layer); });
  }

  /* Mode encre (data-encre="oui") : les traits intérieurs sont conservés.
     Forme sans couleur → émail du calque ; noir → encre ; autre couleur explicite → conservée telle quelle ;
     contour par défaut : encre, avec l'épaisseur du fichier. */
  const INK_STYLE = KEEP_STYLE.concat(['stroke-dasharray', 'fill-opacity', 'stroke-opacity']);
  const isBlack = v => /^(#000|#000000|black)$/i.test(v);
  function cleanInk(el) {
    const style = {};
    (el.getAttribute('style') || '').split(';').forEach(p => { const i = p.indexOf(':'); if (i > 0) style[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
    ['fill', 'stroke'].forEach(k => {
      const v = (el.getAttribute(k) || style[k] || '').trim();
      el.removeAttribute(k);
      const lc = v.toLowerCase();
      if (!v || v === 'currentColor' || v.startsWith('url(') || lc === '#d7374a' || HAIR_COLORS.includes(lc)) return;
      el.setAttribute(k, isBlack(v) ? '__K__' : SKIN_COLORS.includes(lc) ? '__S__' : v);
    });
    [...el.attributes].map(a => a.name).forEach(n => {
      if (n === 'id' || n === 'class' || n === 'style' || n.includes(':') || n.startsWith('data-')) el.removeAttribute(n);
    });
    INK_STYLE.forEach(k => { if (style[k] && !el.hasAttribute(k)) el.setAttribute(k, style[k]); });
    [...el.children].forEach(ch => { if (SKIP.includes(ch.nodeName)) ch.remove(); else cleanInk(ch); });
  }

  /* Analyse un fichier SVG → { meta, parts: [{ layer, markup }], has, wrap } */
  H.compileSVG = function (text) {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const root = doc.documentElement;
    if (!root || root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length) throw new Error('fichier SVG illisible');
    const meta = {};
    [...root.attributes].forEach(a => { if (a.name.startsWith('data-')) meta[a.name.slice(5)] = a.value; });
    let vb = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || vb.some(isNaN) || !vb[2] || !vb[3]) vb = [0, 0, parseFloat(root.getAttribute('width')) || 100, parseFloat(root.getAttribute('height')) || 100];
    const s = 100 / Math.max(vb[2], vb[3]);
    const ox = (100 - vb[2] * s) / 2 - vb[0] * s, oy = (100 - vb[3] * s) / 2 - vb[1] * s;
    const wrap = Math.abs(s - 1) < 1e-6 && Math.abs(ox) < 1e-6 && Math.abs(oy) < 1e-6 ? '' : `translate(${r2(ox)} ${r2(oy)}) scale(${r2(s)})`;
    const ser = new XMLSerializer(), parts = [], ink = meta.encre === 'oui';
    [...root.children].forEach(el => {
      if (SKIP.includes(el.nodeName)) return;
      const layer = (el.localName === 'g' && layerName(el)) || 'corps';
      const c = el.cloneNode(true);
      if (ink) cleanInk(c); else clean(c, layer);
      let markup = ser.serializeToString(c).replace(/ xmlns(:\w+)?="[^"]*"/g, '');
      if (ink) markup = `<g fill="${PH[layer]}" stroke="__K__">${markup}</g>`;
      parts.push({ layer, markup });
    });
    const has = { langue: parts.some(p => p.layer === 'langue'), armes: parts.some(p => p.layer === 'armes'),
      peau: parts.some(p => p.markup.includes('__S__')),
      cheveux: parts.some(p => p.layer === 'cheveux'), aureole: parts.some(p => p.layer === 'aureole') };
    H.EXTRAS.forEach(x => { has[x.id] = parts.some(p => p.layer === x.id); });
    return { meta, parts, has, wrap };
  };

  /* ---------- Catalogue ---------- */
  H.CHARGES = [];
  H.CMAP = {};
  H.CHARGE_ERRORS = [];
  function register(fileName, text) {
    let cp;
    try { cp = H.compileSVG(text); } catch (e) { H.CHARGE_ERRORS.push(fileName + ' : ' + e.message); return null; }
    const m = cp.meta, base = fileName.replace(/\.svg$/i, '');
    const id = m.meuble || base.split('--')[0];
    let ch = H.CMAP[id];
    if (!ch) {
      const sg = m.singulier || (m.nom || id).toLowerCase();
      ch = {
        id, name: m.nom || id, cat: m.categorie || 'divers', sg, pl: m.pluriel || sg + 's', g: m.genre === 'f' ? 'f' : 'm',
        ordre: m.ordre !== undefined ? +m.ordre : 9999, alt: m['couleur-singulier'] ? { sg: m['couleur-singulier'], pl: m['couleur-pluriel'] || m['couleur-singulier'] + 's' } : null,
        variants: []
      };
      H.CMAP[id] = ch; H.CHARGES.push(ch);
    }
    /* valables pour tout le meuble, quelle que soit la position qui les porte */
    if (m.article === 'defini') ch.defini = true;
    if (m.renverse) ch.renverse = m.renverse;
    /* mouvant par défaut (pont, haie, arc-en-ciel…) : flancs, chef, pointe… ; ne se dit pas dans le blasonnement */
    if (m.mouvant) ch.mouvant = m.mouvant;
    const v = {
      id: m.variante || base.split('--')[1] || 'normal', name: m['variante-nom'] || m.variante || 'Normal',
      adj: m.adjectif ? m.adjectif.split('|') : null, file: fileName, cp,
      armesNom: m['armes-nom'] || 'Griffes', armesTerme: m['armes-terme'] || 'armé', langueTerme: m['langue-terme'] || 'lampassé'
    };
    v.extraTermes = {}; v.extraNoms = {};
    H.EXTRAS.forEach(x => { v.extraTermes[x.id] = m[x.id + '-terme'] || x.terme; v.extraNoms[x.id] = m[x.id + '-nom'] || x.nom; });
    /* variante par défaut : data-defaut="oui", sinon celle qui n'a pas d'adjectif (ex. lion rampant) */
    v.rank = m.defaut === 'oui' ? 0 : m.adjectif ? 2 : 1;
    const i = ch.variants.findIndex(x => x.id === v.id);
    if (i >= 0) ch.variants[i] = v; else ch.variants.push(v);
    ch.variants.sort((a, b) => a.rank - b.rank);
    return ch;
  }
  /* Boîte du dessin d'un meuble dans sa grille 100×100 : [x0, y0, x1, y1], mesurée une fois (couronne exclue) ; null hors navigateur */
  H.contentBox = c => {
    const v = H.variantOf(c), cp = v && v.cp;
    if (!cp) return null;
    if (cp.box === undefined) {
      cp.box = null;
      try {
        const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 100 100'); svg.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden';
        svg.innerHTML = `<g><g${cp.wrap ? ` transform="${cp.wrap}"` : ''}>${cp.parts.filter(p => p.layer !== 'couronne').map(p => p.markup).join('')}</g></g>`;
        document.body.appendChild(svg);
        const b = svg.firstChild.getBBox();
        svg.remove();
        if (b.width > 0 && b.height > 0) cp.box = [b.x, b.y, b.x + b.width, b.y + b.height];
      } catch (e) { cp.box = null; }
    }
    return cp.box;
  };
  function sortCatalogue() {
    const order = H.CHARGE_CATS.map(c => c[0]);
    H.CHARGES.forEach(c => { if (!order.includes(c.cat)) { H.CHARGE_CATS.push([c.cat, c.cat.charAt(0).toUpperCase() + c.cat.slice(1)]); order.push(c.cat); } });
    /* ordre alphabétique (les accents ne comptent pas : « Écureuil » se range avec les E) */
    H.CHARGES.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }
  H.loadCharges = function () {
    Object.keys(H.SVG_FILES || {}).forEach(f => register(f, H.SVG_FILES[f]));
    sortCatalogue();
  };
  H.variantOf = c => {
    const ch = H.CMAP[c.type];
    if (!ch) return null;
    return ch.variants.find(v => v.id === c.variant) || ch.variants[0];
  };

  /* ---------- Rendu d'un meuble (grille 100×100) ----------
     o = { f: émail, d: couleur des détails, k: encre, iw: épaisseur du contour, filter: id du filtre de contour } */
  H.chargeArt = function (c, o) {
    const v = H.variantOf(c);
    if (!v) return '';
    const fill = o.fill || H.fill;
    const L = c.langue && v.cp.has.langue ? fill(c.langue) : null;
    const A = c.armes && v.cp.has.armes ? fill(c.armes) : null;
    /* traits intérieurs d'encre : couleur de contraste sur un meuble sombre, sinon ils disparaîtraient
       (le tanné garde l'encre noire, assez lisible sur son brun) */
    const K = ['sable', 'contre-hermine', 'contre-hermine-or'].includes(H.furBase(c.t)) ? o.d : o.k;
    /* peau : émail du meuble par défaut, ou nuance de carnation choisie */
    const skin = c.peau && v.cp.has.peau && H.SKIN_MAP[c.peau] ? H.SKIN_MAP[c.peau].fill : o.f;
    const hair = c.cheveux && v.cp.has.cheveux ? fill(c.cheveux) : o.f;
    const halo = fill(c.aureole && v.cp.has.aureole ? c.aureole : 'or');
    /* particularités : émail choisi, sinon celui du meuble (null : calque facultatif non activé) */
    const X = {};
    H.EXTRAS.forEach(x => { if (v.cp.has[x.id]) X[x.id] = c.extras && c.extras[x.id] ? fill(c.extras[x.id]) : null; });
    /* masque de la silhouette (intérieur composé) : blanc là où le meuble prend son émail, noir ailleurs
       (encre, détails, langue ou armes d'un autre émail…) */
    if (o.mode === 'mask') {
      const W = '#fff', N = '#000';
      const repM = s => {
        s = s.replace(/__T__/g, W).replace(/__L__/g, L ? N : W).replace(/__A__/g, A ? N : W)
          .replace(/__S__/g, c.peau && v.cp.has.peau && H.SKIN_MAP[c.peau] ? N : W).replace(/__C__/g, c.cheveux && v.cp.has.cheveux ? N : W)
          .replace(/__N__/g, N).replace(/__D__/g, N).replace(/__K__/g, N);
        Object.keys(X).forEach(id => { s = s.replace(new RegExp(`__X${id}__`, 'g'), X[id] ? N : W); });
        return s;
      };
      const m = v.cp.parts.filter(p => p.layer !== 'details' && p.layer !== 'langue' && !(H.EXTRA_MAP[p.layer] && H.EXTRA_MAP[p.layer].opt)).map(p => repM(p.markup)).join('');
      return v.cp.wrap ? `<g transform="${v.cp.wrap}">${m}</g>` : m;
    }
    const rep = s => {
      s = s.replace(/__T__/g, o.f).replace(/__L__/g, L || o.f).replace(/__A__/g, A || o.f).replace(/__S__/g, skin)
        .replace(/__C__/g, hair).replace(/__N__/g, halo).replace(/__D__/g, o.d).replace(/__K__/g, K);
      Object.keys(X).forEach(id => { s = s.replace(new RegExp(`__X${id}__`, 'g'), X[id] || o.f); });
      return s;
    };
    /* le contour d'encre vient uniquement du filtre global : pas de liseré supplémentaire sur la langue ni les armes */
    let col = '', det = '';
    for (const p of v.cp.parts) {
      if (p.layer === 'details') det += rep(p.markup);
      else if (p.layer === 'langue') { if (L) col += rep(p.markup); }
      else if (H.EXTRA_MAP[p.layer] && H.EXTRA_MAP[p.layer].opt) { if (X[p.layer]) col += rep(p.markup); }
      else col += rep(p.markup);
    }
    /* intérieur composé (o.inner : champ déjà dessiné dans la grille du meuble, o.mask : id du masque de la silhouette) :
       posé sur le corps, sous les traits intérieurs */
    const wrapT = s => (v.cp.wrap ? `<g transform="${v.cp.wrap}">${s}</g>` : s);
    if (o.inner) return wrapT(o.filter ? `<g filter="url(#${o.filter})">${col}</g>` : col) + `<g mask="url(#${o.mask})">${o.inner}</g>` + wrapT(det);
    const body = (o.filter ? `<g filter="url(#${o.filter})">${col}</g>` : col) + det;
    return wrapT(body);
  };
  /* Filtre de contour : dilate la silhouette et la remplit d'encre, sous le dessin */
  H.outlineFilter = (id, r, ink) =>
    `<filter id="${id}" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">` +
    `<feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="d"/><feFlood flood-color="${ink}"/>` +
    `<feComposite in2="d" operator="in" result="o"/><feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
})(window.H);
