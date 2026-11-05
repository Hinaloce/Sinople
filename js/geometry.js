/* Géométrie : traits décorés, partitions, pièces honorables, positions des meubles */
(function (H) {
  const X0 = -120, X1 = 320, Y0 = -120, Y1 = 380;
  const f1 = v => Math.round(v * 10) / 10;
  const norm = v => { const m = Math.hypot(v[0], v[1]); return [v[0] / m, v[1] / m]; };

  H.boxOf = function (id) {
    const s = H.shapeById(id), b = s.box;
    const B = { id: s.id, shape: s.id, l: b.l, r: b.r, t: b.t, b: b.b, cx: (b.l + b.r) / 2, cy: s.cy };
    B.w = B.r - B.l; B.h = B.b - B.t; B.hd = Math.min(B.h, B.w * 1.15);
    B.u = B.w;
    B.real = { l: B.l, r: B.r, t: B.t, b: B.b };
    B.ol = sc => H.shieldPoly(s.id, sc);
    /* ls : échelle des traits de partition (1 sur l'écu entier) ; area0 : surface de l'écu entier */
    B.ls = 1;
    B.area0 = Math.abs(area(H.shieldPoly(s.id, 1))) / 2;
    return B;
  };

  /* ---------- Profils de traits (une période, de (0,0) à (1,0)) ---------- */
  /* Courbe lissée (Catmull-Rom) passant par les points ; renvoie les points après le premier */
  function smooth(c, n) {
    const o = [];
    for (let i = 0; i < c.length - 1; i++) {
      const p0 = c[Math.max(0, i - 1)], p1 = c[i], p2 = c[i + 1], p3 = c[Math.min(c.length - 1, i + 2)];
      for (let k = 1; k <= n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        o.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    return o;
  }
  /* motif « en haut » centré en 0,25 puis le même retourné « en bas » centré en 0,75 (traits alternés) */
  const alternate = up => up.concat(up.map(([u, v]) => [u + 0.5, -v]));
  /* arc de cercle de centre (cx, cy), rayon r, de l'angle a0 à a1 (degrés, sens trigonométrique en v vers le haut) */
  const arc = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  /* Fleur de lys pour les traits fleurdelisés : contour des pétales au-dessus de l'anneau, d'après le SVG de référence
     (« Meuble héraldique Fleur de lys », Wikimedia). Courbes de Bézier du fichier : pétale gauche, moitié gauche du
     pétale central ; le côté droit est leur symétrique. La ligne de partition passe juste au-dessus de l'anneau. */
  const cubicPts = (P, n) => {
    const o = [P[0]];
    for (let i = 1; i + 2 < P.length; i += 3) {
      const a = P[i - 1], b = P[i], c = P[i + 1], d = P[i + 2];
      for (let k = 1; k <= n; k++) {
        const t = k / n, u = 1 - t;
        o.push([0, 1].map(j => u * u * u * a[j] + 3 * u * u * t * b[j] + 3 * u * t * t * c[j] + t * t * t * d[j]));
      }
    }
    return o;
  };
  const LIS = (() => {
    const AX = 398.1, Y0 = 655.38, TIP = [398.1, 51.6];
    const petal = cubicPts([[350.52292, 657.37224], [349.09835, 595.41623], [333.77176, 537.83277], [305.23335, 483.26364],
      [230.51893, 326.07784], [2.3130139, 329.8319], [52.618133, 522.07495], [71.154997, 592.91432], [134.12674, 634.54881],
      [208.93699, 641.68996], [203.5374, 623.02459], [173.8367, 557.03751], [197.81252, 544.1284], [236.15068, 545.5768],
      [283.75686, 611.8335], [295.20534, 643.42912], [296.85804, 647.96522], [296.39575, 653.20713], [298.24118, 657.66919]], 10);
    const centre = cubicPts([[364.65715, 657.37017], [366.24813, 617.04065], [362.81238, 576.95877], [349.3759, 538.58892],
      [327.88647, 477.43115], [297.41422, 418.63533], [284.84465, 355.15142], [262.06129, 240.08175], [314.9116, 141.96961],
      [393.6259, 57.12017]], 10);
    /* pied sous l'anneau (moitié gauche, jusqu'à la pointe) */
    const foot = cubicPts([[331.34465, 704.40142], [317.38299, 743.53144], [260.45647, 815.19349], [230.21965, 835.62017],
      [222.37748, 840.91802], [267.70602, 832.5686], [288.0009, 828.12017], [314.61991, 822.28553], [349.21835, 793.92258],
      [348.40715, 803.93267], [348.33151, 849.77093], [361.21819, 926.25691], [394.8134, 961.40142]], 10);
    const BL = 239.3521, BR = 557.23983, BB = 706.88281, FOOT_TIP = [397.99548, 964.78902];   /* anneau : bords et bas */
    const mir = pts => pts.map(([x, y]) => [2 * AX - x, y]);
    const above = pts => pts.map(([x, y]) => [x, Math.min(y, Y0)]), below = pts => pts.map(([x, y]) => [x, Math.max(y, BB)]);
    /* Parcours de gauche à droite le long de la ligne :
       1. anneau et pied, sous la ligne (de l'autre côté) ;
       2. retour sur le dessus de l'anneau (aller-retour sans surface : il dessine la ligne qui traverse la fleur) ;
       3. pétales au-dessus de la ligne : gauche (volute intérieure puis extérieure), central, droit ;
       4. fin du dessus de l'anneau. */
    const out = [].concat(
      [[BL, Y0], [BL, BB]], below(foot), [FOOT_TIP], below(mir(foot.slice().reverse())), [[BR, BB], [BR, Y0]],
      [[BL, Y0]],
      above(petal.slice().reverse()), above(centre), [TIP], above(mir(centre.slice().reverse())), above(mir(petal)),
      [[BR, Y0]]);
    const xs = out.map(p => p[0]), w = Math.max(...xs) - Math.min(...xs), h = Y0 - TIP[1];
    /* pts(cu, s) : en unités de trait, centré en cu, s = largeur de la fleur en fraction de période ;
       v = hauteur relative (1 à la pointe du pétale central, négatif pour le pied) */
    return (cu, s) => out.map(([x, y]) => [cu + ((x - AX) / w) * s, (Y0 - y) / h]);
  })();
  /* Motif périodique (u de 0 à 1, même v aux deux bouts) dont la ligne ne passe pas par les extrémités :
     on fait commencer la période au premier passage par la ligne (v = 0), pour que le trait parte et finisse sur la ligne */
  function fromCrossing(L) {
    let i = 0;
    while (!(L[i][1] !== L[i + 1][1] && L[i][1] * L[i + 1][1] <= 0 && L[i][1] !== 0)) i++;
    const t = L[i][1] / (L[i][1] - L[i + 1][1]), c = L[i][0] + t * (L[i + 1][0] - L[i][0]);
    const rot = L.slice(i + 1).concat(L.slice(1, i + 1).map(([u, v]) => [u + 1, v]));
    return rot.map(([u, v]) => [u - c, v]).concat([[1, 0]]);
  }
  /* Sapins : points des tracés de référence, ramenés à une période (u de 0 à 1) et à l'amplitude (v) */
  const SAPIN_CIME = (() => {
    const X = 301.22, Y = 350.47, W = 119.2, Hh = 136.91;   /* pointe, fond, période, hauteur */
    const half = [[242.53, 350.47], [277.81, 303.78], [256.69, 303.78], [286.06, 265.125], [264.03, 265.125]];
    /* la ligne de partition passe à mi-hauteur des sapins (v de -0,5 au pied à +0,5 à la cime) */
    const norm = ([x, y]) => [0.5 + (x - X) / W, (Y - y) / Hh - 0.5];
    const left = half.map(norm);
    return fromCrossing([[0, -0.5]].concat(left, [[0.5, 0.5]], left.slice().reverse().map(([u, v]) => [1 - u, v]), [[1, -0.5]]));
  })();
  const SAPIN_BRANCHE = (() => {
    /* une période, de crête à crête (x décroissant dans le fichier) */
    const raw = [[497.198, 133.915], [485.246, 145.569], [485.246, 181.027], [464.256, 160.566], [447.350, 160.566], [447.350, 177.048],
      [485.246, 213.990], [485.246, 230.364], [468.340, 230.473], [447.350, 210.011], [447.350, 245.469], [435.398, 257.124],
      [423.446, 245.469], [423.446, 210.011], [402.457, 230.473], [385.551, 230.364], [385.551, 213.990], [423.446, 177.048],
      [423.446, 160.566], [406.540, 160.566], [385.551, 181.027], [385.551, 145.569], [373.599, 133.915]];
    const X0 = 497.198, W = 123.599, MID = 195.52, A = 61.6;
    return fromCrossing(raw.map(([x, y]) => [(X0 - x) / W, (MID - y) / A]));
  })();
  /* Tréflé : trèfle du SVG de référence (« Blason azur 3 trèfles or », 154 de large, tige de 279 à 321 en y = 500),
     un trèfle debout puis un renversé ; d'une tige à l'autre, une queue en S qui croise la ligne.
     Moitié gauche (du croisement au sommet du lobe du haut), en courbes de Bézier du fichier ; la droite est son symétrique. */
  const TREFLE = (() => {
    /* W : les trèfles de part et d'autre de la ligne se chevauchent d'une demi-feuille (35) : 154 - W / 2 = 35 */
    const AX = 300, W = 238, YL = 500, TOP = 346;   /* axe, période, ligne de partition (pied de la tige), sommet */
    /* les trèfles reposent sur la ligne : d'un pied de tige à l'autre, un segment droit le long de la ligne */
    const left = cubicPts([[AX - W / 4, YL], [AX - W / 4, YL], [279, YL], [279, YL],
      [298.006, 482.914], [294.748, 450.996], [294.748, 450.996],                  /* bord gauche de la tige */
      [294.748, 450.996], [283.652, 479], [258, 479],
      [236.617, 479], [223, 460.666], [223, 444],                                  /* lobe gauche */
      [223, 410.712], [261.12, 399.341], [282.501, 415.998],
      [282.501, 415.998], [263.251, 400.598], [263.251, 379.248],
      [263.251, 366.758], [274.347, 346], [AX, TOP]], 8);                          /* lobe du haut */
    const half = left.concat(left.slice(0, -1).reverse().map(([x, y]) => [2 * AX - x, y]));
    return half.slice(1).map(([x, y]) => [0.25 + (x - AX) / W, (YL - y) / (YL - TOP)]);
  })();
  const UNITS = {};
  function unit(type) {
    if (UNITS[type]) return UNITS[type];
    let p = [];
    switch (type) {
      case 'ondee': for (let i = 1; i <= 32; i++) { const u = i / 32; p.push([u, Math.sin(u * 2 * Math.PI)]); } break;
      /* nébulé : lobes en champignon qui surplombent la ligne, alternativement en haut et en bas */
      case 'nebulee': p = alternate(smooth([[0, 0], [0.1, 0.12], [0.13, 0.45], [0.04, 0.72], [0.1, 1], [0.25, 1.1], [0.4, 1], [0.46, 0.72], [0.37, 0.45], [0.4, 0.12], [0.5, 0]], 6)); break;
      case 'crenelee': p = [[0, 1], [0.4, 1], [0.4, 0], [1, 0]]; break;
      /* crénelé en bande (ragulé) : créneaux aux flancs obliques parallèles */
      case 'ragulee': p = [[0.25, 1], [0.6, 1], [0.35, 0], [1, 0]]; break;
      /* mortaisé : queues d'aronde, plus larges au sommet */
      case 'mortaisee': p = [[0.2, 0], [0.05, 1], [0.6, 1], [0.45, 0], [1, 0]]; break;
      /* palissadé : pieux à pointe */
      case 'palissadee': p = [[0.08, 0], [0.08, 0.68], [0.3, 1], [0.52, 0.68], [0.52, 0], [1, 0]]; break;
      /* rayonné (flammé) : flammes ondulantes à pointe effilée */
      case 'rayonnee': p = smooth([[0, 0], [0.28, 0.3], [0.16, 0.62], [0.36, 1]], 5).concat(smooth([[0.36, 1], [0.7, 0.6], [0.6, 0.3], [1, 0]], 5)); break;
      /* en cime de sapin : sapins à trois étages débordants, tous du même côté
         (d'après le blason du Grand Sudbury : un sapin tous les 119,2, haut de 136,9 au-dessus du fond) */
      case 'cime-sapin': p = SAPIN_CIME; break;
      /* en branche de sapin : tiges à rameaux coudés, alternativement vers le haut et vers le bas
         (d'après le tracé de référence : période 123,6, crêtes et creux à ± 61,6 de la ligne) */
      case 'branche-sapin': p = SAPIN_BRANCHE; break;
      /* tréflé : trèfles sur tige, alternativement en haut et en bas, reliés par des queues en S */
      case 'treflee': p = alternate(TREFLE); break;
      /* fleurdelisé : fleurs de lys d'un seul côté, toutes dans le même sens */
      case 'fleurdelisee': p = LIS(0.5, 0.86).concat([[1, 0]]); break;
      /* contre-fleurdelisé : une fleur debout, la suivante renversée ; leurs volutes s'imbriquent de part et d'autre */
      case 'contre-fleurdelisee': p = alternate(LIS(0.25, 0.62)).concat([[1, 0]]); break;
      case 'dentelee': case 'dancettee': p = [[0.5, 1], [1, 0]]; break;
      case 'emanchee': p = [[0.15, 0], [0.5, 1], [0.85, 0], [1, 0]]; break;
      case 'engrelee': for (let i = 1; i <= 16; i++) { const u = i / 16; p.push([u, -2 * Math.sqrt(Math.max(0, 0.25 - (u - 0.5) * (u - 0.5)))]); } break;
      case 'invectee': for (let i = 1; i <= 16; i++) { const u = i / 16; p.push([u, 2 * Math.sqrt(Math.max(0, 0.25 - (u - 0.5) * (u - 0.5)))]); } break;
      case 'potencee':
        p = [[0.15, 0], [0.15, 0.6], [0.05, 0.6], [0.05, 1], [0.45, 1], [0.45, 0.6], [0.35, 0.6], [0.35, 0], [0.5, 0],
             [0.65, 0], [0.65, -0.6], [0.55, -0.6], [0.55, -1], [0.95, -1], [0.95, -0.6], [0.85, -0.6], [0.85, 0], [1, 0]];
        break;
      default: p = [[1, 0]];
    }
    return (UNITS[type] = p);
  }

  /* Décore une polyligne ouverte ; sign = côté du renflement (normale gauche si +1). */
  /* ctr : nombre impair de motifs, pour qu'un motif reste centré au milieu de l'arête quelle que soit sa taille */
  function decorate(pts, type, sign, ls, ctr) {
    const spec = H.LMAP[type];
    if (!spec || !spec.P) return pts;
    const P = spec.P * (ls || 1), A = spec.A * (ls || 1);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = cum[cum.length - 1];
    if (L < P * 0.6) return pts;
    const n = ctr ? Math.max(1, 2 * Math.round((L / P - 1) / 2) + 1) : Math.max(1, Math.round(L / P));
    /* le nombre de motifs est entier (la largeur s'ajuste au bord) ; la hauteur suit la taille demandée
       de façon continue, en ne gardant qu'une partie de l'étirement pour ne pas déformer le motif */
    const su = L / n, amp = A * Math.sqrt(su / P) * sign;
    const un = unit(type);
    const out = [pts[0]];
    for (let k = 0; k < n; k++) {
      for (const [u, v] of un) {
        const s = (k + u) * su;
        let lo = 0, hi = pts.length - 2;
        while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid - 1; }
        const a = pts[lo], b = pts[lo + 1], sl = (cum[lo + 1] - cum[lo]) || 1;
        const dx = (b[0] - a[0]) / sl, dy = (b[1] - a[1]) / sl;
        const along = Math.min(Math.max(s - cum[lo], 0), sl);
        out.push([a[0] + dx * along + dy * v * amp, a[1] + dy * along - dx * v * amp]);
      }
    }
    out[out.length - 1] = pts[pts.length - 1];
    return out;
  }

  /* Vignette d'un trait : gros plan de 3 à 4 motifs, argent au-dessus, azur au-dessous (viewBox de 100 de large).
     Les traits alternés (un motif en haut, un en bas par période) n'en montrent que 2 périodes. */
  const ALTERNATED = ['nebulee', 'potencee', 'branche-sapin', 'treflee', 'contre-fleurdelisee'];
  H.lineSwatch = function (type, top, bot, ink) {
    const spec = H.LMAP[type] || { P: 0, A: 0 };
    const P = spec.P || 30;
    /* motifs très hauts : on en montre davantage (donc plus petits) tant que le dessin, mis à 100 de large,
       dépasse la hauteur du bandeau */
    let pts, lo, hi;
    for (let n = ALTERNATED.includes(type) ? 2 : 3; n <= 6; n++) {
      const W = n * P, k = 100 / W;
      pts = (type === 'droite' ? [[0, 0], [W, 0]] : decorate([[0, 0], [W, 0]], type, 1, 1)).map(([x, y]) => [x * k, y * k]);
      const ys = pts.map(p => p[1]); lo = Math.min(...ys); hi = Math.max(...ys);
      if (hi - lo <= 40) break;
    }
    const H0 = Math.max(56, (hi - lo) + 26), cy = H0 / 2 - (lo + hi) / 2;
    const d = pts.slice().reverse().map(([x, y]) => f1(x) + ' ' + f1(y + cy)).join('L');
    return `<svg viewBox="0 0 100 ${f1(H0)}" preserveAspectRatio="xMidYMid slice"><rect width="100" height="${f1(H0)}" fill="${bot}"/>` +
      `<path d="M-2 -2H102V${f1(cy)}H${f1(pts[pts.length - 1][0])}L${d}H-2Z" fill="${top}" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  };

  /* Arête p→q ; orientation canonique pour que deux régions voisines partagent le même tracé. */
  function edge(p, q, type, mode, os, ls, ctr) {
    if (type === 'droite') return [p, q];
    let a = p, b = q, swap = false;
    if (q[0] < p[0] - 1e-9 || (Math.abs(q[0] - p[0]) < 1e-9 && q[1] < p[1])) { a = q; b = p; swap = true; }
    const sign = mode === 'out' ? os * (swap ? -1 : 1) : 1;
    const r = decorate([a, b], type, sign, ls, ctr);
    return swap ? r.slice().reverse() : r;
  }

  const ptsToD = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
  function area(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a; }

  /* verts : [x, y, estDécoré] — le drapeau décrit l'arête partant de ce sommet. */
  function pathFromVerts(verts, type, mode, ls, ctr) {
    const os = area(verts) >= 0 ? 1 : -1;
    const pts = [];
    for (let i = 0; i < verts.length; i++) {
      const a = verts[i], b = verts[(i + 1) % verts.length];
      const seg = a[2] ? edge(a, b, type, mode, os, ls, ctr) : [a, b];
      for (let j = 0; j < seg.length - 1; j++) pts.push(seg[j]);
    }
    return ptsToD(pts);
  }
  function ringPath(rg, type, mode, ls) {
    const base = rg.pts;
    const os = (area(base) >= 0 ? 1 : -1) * (rg.hole ? -1 : 1);
    const closed = base.concat([base[0]]);
    const dec = decorate(closed, type, mode === 'out' ? os : 1, ls);
    return ptsToD(dec.slice(0, -1));
  }

  /* ---------- Contour de l'écu (polyligne échantillonnée) ---------- */
  const POLY = {};
  let probe = null;
  H.shieldPoly = function (id, scale) {
    const key = id + '@' + scale;
    if (POLY[key]) return POLY[key];
    if (!probe) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
      svg.style.cssText = 'position:absolute;visibility:hidden';
      probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      svg.appendChild(probe); document.body.appendChild(svg);
    }
    const s = H.shapeById(id);
    probe.setAttribute('d', s.d);
    const L = probe.getTotalLength(), N = 200, cx = (s.box.l + s.box.r) / 2, cy = s.cy, out = [];
    for (let i = 0; i < N; i++) {
      const p = probe.getPointAtLength((i / N) * L);
      out.push([cx + (p.x - cx) * scale, cy + (p.y - cy) * scale]);
    }
    return (POLY[key] = out);
  };
  function pip(poly, x, y) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  H.pip = pip;

  /* ---------- Partitions ---------- */
  const halfPlane = (c, d, n) => {
    const P0 = [c[0] - d[0] * 700, c[1] - d[1] * 700, 1], P1 = [c[0] + d[0] * 700, c[1] + d[1] * 700, 0];
    return [P0, P1, [P1[0] + n[0] * 900, P1[1] + n[1] * 900, 0], [P0[0] + n[0] * 900, P0[1] + n[1] * 900, 0]];
  };
  const stripeBand = (c, d, n, sa, sb) => {
    const R = 700;
    return [
      [c[0] + n[0] * sa - d[0] * R, c[1] + n[1] * sa - d[1] * R, 1],
      [c[0] + n[0] * sa + d[0] * R, c[1] + n[1] * sa + d[1] * R, 0],
      [c[0] + n[0] * sb + d[0] * R, c[1] + n[1] * sb + d[1] * R, 1],
      [c[0] + n[0] * sb - d[0] * R, c[1] + n[1] * sb - d[1] * R, 0]
    ];
  };
  function diagInfo(B, n, dir) {
    const c0 = [B.cx, B.t + B.h / 2];
    const nn = [-dir[1], dir[0]];
    const ext = (B.w * Math.abs(nn[0]) + B.h * Math.abs(nn[1])) / 2;
    return { c0, nn, ext };
  }
  const lozParams = (part, B) => {
    const a = part === 'fusele' ? B.w / 14 : B.w / 8;
    return { a, b: part === 'fusele' ? a * 2.8 : a * 1.45 };
  };

  /* tiercé en chevron : pente des chevrons ; tiercé en pairle : hauteur du cœur (fraction de la hauteur de l'écu) */
  const CHEV_M = 1.05, PAIRLE_Y = 0.42;
  /* all : produit aussi la région de l'émail 0 (utile quand une partie est composée). */
  /* lz : réglage de la taille du motif du trait (1 = taille par défaut, proportionnelle à la zone) */
  H.fieldRegions = function (part, B, line, all, lz, lc) {
    const out = [];
    const { cx, cy, l, r, t, b, w, h } = B;
    const ls = (B.ls || 1) * (lz || 1);
    const add = (slot, verts) => out.push({ slot, d: pathFromVerts(verts, line, 'par', ls, lc) });
    const D1 = norm([w, B.hd]), D2 = norm([-w, B.hd]);
    const c = [cx, cy];
    switch (part) {
      case 'parti':
        if (all) add(0, [[X0, Y0, 0], [cx, Y0, 1], [cx, Y1, 0], [X0, Y1, 0]]);
        add(1, [[cx, Y0, 0], [X1, Y0, 0], [X1, Y1, 0], [cx, Y1, 1]]); break;
      case 'coupe':
        if (all) add(0, [[X0, Y0, 0], [X1, Y0, 0], [X1, cy, 1], [X0, cy, 0]]);
        add(1, [[X0, cy, 1], [X1, cy, 0], [X1, Y1, 0], [X0, Y1, 0]]); break;
      case 'tranche':
        if (all) add(0, halfPlane(c, D1, [D1[1], -D1[0]]));
        add(1, halfPlane(c, D1, [-D1[1], D1[0]])); break;
      case 'taille':
        if (all) add(0, halfPlane(c, D2, [-D2[1], D2[0]]));
        add(1, halfPlane(c, D2, [D2[1], -D2[0]])); break;
      case 'ecartele':
        if (all) add(0, [[X0, Y0, 0], [cx, Y0, 1], [cx, cy, 1], [X0, cy, 0]]);
        add(1, [[cx, Y0, 0], [X1, Y0, 0], [X1, cy, 1], [cx, cy, 1]]);
        add(2, [[X0, cy, 1], [cx, cy, 1], [cx, Y1, 0], [X0, Y1, 0]]);
        add(3, [[cx, cy, 1], [X1, cy, 0], [X1, Y1, 0], [cx, Y1, 1]]);
        break;
      case 'sautoir': {
        const K = 3, TL = [cx - w * K, cy - B.hd * K], TR = [cx + w * K, cy - B.hd * K], BL = [cx - w * K, cy + B.hd * K], BR = [cx + w * K, cy + B.hd * K];
        if (all) add(0, [[cx, cy, 1], [TR[0], TR[1], 0], [TL[0], TL[1], 1]]);
        add(1, [[cx, cy, 1], [TL[0], TL[1], 0], [BL[0], BL[1], 1]]);
        add(2, [[cx, cy, 1], [BR[0], BR[1], 0], [TR[0], TR[1], 1]]);
        add(3, [[cx, cy, 1], [BL[0], BL[1], 0], [BR[0], BR[1], 1]]);
        break;
      }
      case 'tierce-pal': {
        const x1 = l + w / 3, x2 = l + (2 * w) / 3;
        if (all) add(0, [[X0, Y0, 0], [x1, Y0, 1], [x1, Y1, 0], [X0, Y1, 0]]);
        add(1, [[x1, Y0, 0], [x2, Y0, 1], [x2, Y1, 0], [x1, Y1, 1]]);
        add(2, [[x2, Y0, 0], [X1, Y0, 0], [X1, Y1, 0], [x2, Y1, 1]]);
        break;
      }
      case 'quarte-pal': case 'quarte-fasce': {
        /* quatre colonnes (parti de trois traits) ou quatre rangs (coupé de trois traits) */
        /* partage de la zone réelle (ses bords), non de sa boîte centrée : quatre rangs égaux même dans une moitié d'écu */
        const N = 4, col = part === 'quarte-pal', R = B.real || { l, t, r: l + w, b: t + h };
        const l = R.l, t = R.t, w = R.r - R.l, h = R.b - R.t;
        for (let i = 0; i < N; i++) {
          if (i === 0 && !all) continue;
          const a = col ? l + (i * w) / N : t + (i * h) / N, b = col ? l + ((i + 1) * w) / N : t + ((i + 1) * h) / N, first = i === 0, last = i === N - 1;
          add(i, col ? [[first ? X0 : a, Y0, 0], [last ? X1 : b, Y0, last ? 0 : 1], [last ? X1 : b, Y1, 0], [first ? X0 : a, Y1, first ? 0 : 1]]
            : [[X0, first ? Y0 : a, first ? 0 : 1], [X1, first ? Y0 : a, 0], [X1, last ? Y1 : b, last ? 0 : 1], [X0, last ? Y1 : b, 0]]);
        }
        break;
      }
      case 'tierce-fasce': {
        const y1 = t + h / 3, y2 = t + (2 * h) / 3;
        if (all) add(0, [[X0, Y0, 0], [X1, Y0, 0], [X1, y1, 1], [X0, y1, 0]]);
        add(1, [[X0, y1, 1], [X1, y1, 0], [X1, y2, 1], [X0, y2, 0]]);
        add(2, [[X0, y2, 1], [X1, y2, 0], [X1, Y1, 0], [X0, Y1, 0]]);
        break;
      }
      case 'tierce-chevron': {
        /* deux chevrons parallèles : le premier part du milieu du chef, le second descend jusqu'à la pointe */
        const m = CHEV_M, a1 = t + 2, a2 = t + 0.58 * h, yy = (a, x) => a + m * Math.abs(x - cx);
        if (all) add(0, [[X0, Y0, 0], [X1, Y0, 0], [X1, yy(a1, X1), 1], [cx, a1, 1], [X0, yy(a1, X0), 0]]);
        add(1, [[X0, yy(a1, X0), 1], [cx, a1, 1], [X1, yy(a1, X1), 0], [X1, yy(a2, X1), 1], [cx, a2, 1], [X0, yy(a2, X0), 0]]);
        add(2, [[X0, yy(a2, X0), 1], [cx, a2, 1], [X1, yy(a2, X1), 0], [X1, Y1, 0], [X0, Y1, 0]]);
        break;
      }
      case 'tierce-pairle': {
        /* un pairle : des angles du chef jusqu'au cœur, puis droit jusqu'à la pointe */
        const O = [cx, t + PAIRLE_Y * h], k = 4;
        const PL = [O[0] + (l - cx) * k, O[1] + (t - O[1]) * k], PR = [O[0] + (r - cx) * k, O[1] + (t - O[1]) * k];
        if (all) add(0, [[PL[0], PL[1], 1], [O[0], O[1], 1], [PR[0], PR[1], 0], [PR[0], -600, 0], [PL[0], -600, 0]]);
        add(1, [[cx, 900, 1], [O[0], O[1], 1], [PL[0], PL[1], 0], [PL[0], 900, 0]]);
        add(2, [[O[0], O[1], 1], [cx, 900, 0], [PR[0], 900, 0], [PR[0], PR[1], 1]]);
        break;
      }
      case 'parti-mi-coupe':
        if (all) add(0, [[X0, Y0, 0], [cx, Y0, 1], [cx, cy, 1], [X0, cy, 0]]);
        add(1, [[X0, cy, 1], [cx, cy, 1], [cx, Y1, 0], [X0, Y1, 0]]);
        add(2, [[cx, Y0, 0], [X1, Y0, 0], [X1, Y1, 0], [cx, Y1, 1], [cx, cy, 1]]);
        break;
      case 'parti-mi-coupe-sen':
        if (all) add(0, [[X0, Y0, 0], [cx, Y0, 1], [cx, cy, 1], [cx, Y1, 0], [X0, Y1, 0]]);
        add(1, [[cx, Y0, 0], [X1, Y0, 0], [X1, cy, 1], [cx, cy, 1]]);
        add(2, [[cx, cy, 1], [X1, cy, 0], [X1, Y1, 0], [cx, Y1, 1]]);
        break;
      case 'mi-parti-coupe':
        if (all) add(0, [[X0, Y0, 0], [cx, Y0, 1], [cx, cy, 1], [X0, cy, 0]]);
        add(1, [[cx, Y0, 0], [X1, Y0, 0], [X1, cy, 1], [cx, cy, 1]]);
        add(2, [[X0, cy, 1], [cx, cy, 1], [X1, cy, 0], [X1, Y1, 0], [X0, Y1, 0]]);
        break;
      case 'coupe-mi-coupe':
        if (all) add(0, [[X0, Y0, 0], [X1, Y0, 0], [X1, cy, 1], [cx, cy, 1], [X0, cy, 0]]);
        add(1, [[X0, cy, 1], [cx, cy, 1], [cx, Y1, 0], [X0, Y1, 0]]);
        add(2, [[cx, cy, 1], [X1, cy, 0], [X1, Y1, 0], [cx, Y1, 1]]);
        break;
      case 'chape': case 'chausse': {
        const up = part === 'chape';
        const A = up ? [cx, t] : [cx, b];
        const F = up ? cy + 0.12 * h : cy - 0.12 * h;
        const FL = [A[0] + (l - A[0]) * 4, A[1] + (F - A[1]) * 4], FR = [A[0] + (r - A[0]) * 4, A[1] + (F - A[1]) * 4];
        const far = up ? -600 : 900, far0 = up ? 900 : -600;
        if (all) add(0, [[A[0], A[1], 1], [FL[0], FL[1], 0], [FL[0], far0, 0], [FR[0], far0, 0], [FR[0], FR[1], 1]]);
        add(1, [[A[0], A[1], 1], [FL[0], FL[1], 0], [FL[0], far, 0], [cx, far, 0]]);
        add(2, [[A[0], A[1], 0], [cx, far, 0], [FR[0], far, 0], [FR[0], FR[1], 1]]);
        break;
      }
      case 'girone': {
        for (let i = 1; i < 8; i += 2) {
          const a0 = ((-90 + 45 * i) * Math.PI) / 180, a1 = ((-90 + 45 * (i + 1)) * Math.PI) / 180, R = 800;
          add(1, [[cx, cy, 1], [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R, 0], [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R, 1]]);
        }
        break;
      }
      case 'pale': {
        const N = 6;
        for (let i = 1; i < N; i += 2) { const xa = l + (i * w) / N, xb = l + ((i + 1) * w) / N; add(1, [[xa, Y0, 0], [xb, Y0, 1], [xb, Y1, 0], [xa, Y1, 1]]); }
        break;
      }
      case 'fasce': case 'burele': {
        const N = part === 'fasce' ? 8 : 10;
        for (let i = 1; i < N; i += 2) { const ya = t + (i * h) / N, yb = t + ((i + 1) * h) / N; add(1, [[X0, ya, 1], [X1, ya, 0], [X1, yb, 1], [X0, yb, 0]]); }
        break;
      }
      case 'bande': case 'barre': {
        const N = 6, d = part === 'bande' ? D1 : D2, g = diagInfo(B, null, d);
        for (let i = 1; i < N; i += 2) add(1, stripeBand(g.c0, d, g.nn, -g.ext + (2 * g.ext * i) / N, -g.ext + (2 * g.ext * (i + 1)) / N));
        break;
      }
      case 'echiquete': {
        const s = w / 5; let d = '';
        for (let j = -1; j < Math.ceil(h / s) + 1; j++) for (let i = -1; i < 7; i++) if (((i + j) & 1) === 1) {
          const x = l + i * s, y = t + j * s;
          d += `M${f1(x)} ${f1(y)}h${f1(s)}v${f1(s)}h${f1(-s)}Z`;
        }
        out.push({ slot: 1, d });
        break;
      }
      case 'losange': case 'fusele': {
        const { a, b: bb } = lozParams(part, B);
        let d = '';
        for (let n = -3; n < Math.ceil(h / bb) + 3; n++) for (let m = -2; m < 14; m++) {
          if ((n & 1) !== 1) continue;
          const x = l + a * (2 * m + 1), y = t + bb * n;
          d += `M${f1(x - a)} ${f1(y)}L${f1(x)} ${f1(y - bb)}L${f1(x + a)} ${f1(y)}L${f1(x)} ${f1(y + bb)}Z`;
        }
        out.push({ slot: 1, d });
        break;
      }
    }
    return out;
  };

  /* Quel émail du champ se trouve au point (x,y) ? (sans les décorations de ligne) */
  H.slotAt = function (part, B, x, y) {
    const { cx, cy, l, t, w, h } = B;
    const dx = x - cx, dy = y - cy;
    const D1 = norm([w, B.hd]), D2 = norm([-w, B.hd]);
    switch (part) {
      case 'parti': return x >= cx ? 1 : 0;
      case 'coupe': return y >= cy ? 1 : 0;
      case 'tranche': return dx * -D1[1] + dy * D1[0] > 0 ? 1 : 0;
      case 'taille': return dx * D2[1] + dy * -D2[0] > 0 ? 1 : 0;
      case 'ecartele': return x < cx ? (y < cy ? 0 : 2) : (y < cy ? 1 : 3);
      case 'sautoir': {
        const a = D1[0] * dy - D1[1] * dx, bq = D2[0] * dy - D2[1] * dx;
        if (a < 0 && bq > 0) return 0;
        if (a > 0 && bq > 0) return 1;
        if (a < 0 && bq < 0) return 2;
        return 3;
      }
      case 'quarte-pal': { const R = B.real || { l, r: l + w }; return Math.min(3, Math.max(0, Math.floor(((x - R.l) / (R.r - R.l)) * 4))); }
      case 'quarte-fasce': { const R = B.real || { t, b: t + h }; return Math.min(3, Math.max(0, Math.floor(((y - R.t) / (R.b - R.t)) * 4))); }
      case 'tierce-pal': return x < l + w / 3 ? 0 : x < l + (2 * w) / 3 ? 1 : 2;
      case 'tierce-fasce': return y < t + h / 3 ? 0 : y < t + (2 * h) / 3 ? 1 : 2;
      case 'tierce-chevron': {
        const d = CHEV_M * Math.abs(x - cx);
        return y < t + 2 + d ? 0 : y < t + 0.58 * h + d ? 1 : 2;
      }
      case 'tierce-pairle': {
        const Oy = t + PAIRLE_Y * h, edge = Oy - (Math.abs(x - cx) / (w / 2)) * (Oy - t);
        return y < edge ? 0 : x < cx ? 1 : 2;
      }
      case 'parti-mi-coupe': return x >= cx ? 2 : y < cy ? 0 : 1;
      case 'parti-mi-coupe-sen': return x < cx ? 0 : y < cy ? 1 : 2;
      case 'mi-parti-coupe': return y >= cy ? 2 : x < cx ? 0 : 1;
      case 'coupe-mi-coupe': return y < cy ? 0 : x < cx ? 1 : 2;
      case 'chape': case 'chausse': {
        const up = part === 'chape';
        const F = up ? cy + 0.12 * h : cy - 0.12 * h, A = up ? t : B.b;
        const slope = (F - A) / (cx - l);
        const ly = A + Math.abs(x - cx) * slope;
        const inside = up ? y < ly : y > ly;
        return inside ? (x < cx ? 1 : 2) : 0;
      }
      case 'girone': {
        let ang = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        ang = ((ang % 360) + 360) % 360;
        return Math.floor(ang / 45) & 1;
      }
      case 'pale': return Math.min(5, Math.max(0, Math.floor(((x - l) / w) * 6))) & 1;
      case 'fasce': return Math.min(7, Math.max(0, Math.floor(((y - t) / h) * 8))) & 1;
      case 'burele': return Math.min(9, Math.max(0, Math.floor(((y - t) / h) * 10))) & 1;
      case 'bande': case 'barre': {
        const d = part === 'bande' ? D1 : D2, g = diagInfo(B, null, d);
        const s = (x - g.c0[0]) * g.nn[0] + (y - g.c0[1]) * g.nn[1];
        return Math.min(5, Math.max(0, Math.floor(((s + g.ext) / (2 * g.ext)) * 6))) & 1;
      }
      case 'echiquete': { const s = w / 5; return (Math.floor((x - l) / s) + Math.floor((y - t) / s)) & 1; }
      case 'losange': case 'fusele': {
        const { a, b } = lozParams(part, B);
        const xo = x - l, yo = y - t;
        let best = 1e9, bm = 0, bn = 0;
        const n0 = Math.floor(yo / b);
        for (let n = n0; n <= n0 + 1; n++) {
          const m0 = Math.round((xo - a * (n & 1)) / (2 * a));
          for (let m = m0 - 1; m <= m0 + 1; m++) {
            const d = Math.abs(xo - a * (2 * m + (n & 1))) / a + Math.abs(yo - b * n) / b;
            if (d < best) { best = d; bm = m; bn = n; }
          }
        }
        return bn & 1;
      }
      default: return 0;
    }
  };

  /* ---------- Pièces honorables ---------- */
  function band(o, d, half, s0, s1) {
    const n = [-d[1], d[0]];
    s0 = s0 === undefined ? -700 : s0; s1 = s1 === undefined ? 700 : s1;
    const A = [o[0] + d[0] * s0 - n[0] * half, o[1] + d[1] * s0 - n[1] * half, 1];
    const Bq = [o[0] + d[0] * s1 - n[0] * half, o[1] + d[1] * s1 - n[1] * half, 0];
    const C = [Bq[0] + 2 * half * n[0], Bq[1] + 2 * half * n[1], 1];
    const D = [A[0] + 2 * half * n[0], A[1] + 2 * half * n[1], 0];
    return [A, Bq, C, D];
  }
  const polyLen = (pts, closed) => {
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (closed) L += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
    return L;
  };
  function along(pts, n, closed) {
    const P = closed ? pts.concat([pts[0]]) : pts;
    const cum = [0];
    for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const L = cum[cum.length - 1], out = [];
    for (let k = 0; k < n; k++) {
      const s = closed ? (k / n) * L : ((k + 0.5) / n) * L;
      let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
      const t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
      out.push([P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t]);
    }
    return out;
  }

  /* Fait commencer un anneau (contour d'écu) au milieu du chef, pour que 1 ou 8 meubles se répartissent symétriquement */
  function fromTop(pts, B) {
    let bi = 0, bd = 1e9;
    pts.forEach((p, i) => { const d = Math.abs(p[0] - B.cx) + (p[1] < B.cy ? 0 : 1000) + (p[1] - B.t) * 0.01; if (d < bd) { bd = d; bi = i; } });
    return pts.slice(bi).concat(pts.slice(0, bi));
  }
  H.ringFromTop = fromTop;

  /* ls de la pièce : celle du champ qui la porte, réduite pour l'écusson (petit écu dans l'écu) */
  /* décalage manuel d'une pièce : toutes ses formes, ses axes et sa zone se déplacent ensemble */
  function shiftGeom(g, dx, dy) {
    const pt = q => { const r = q.slice(); r[0] += dx; r[1] += dy; return r; }, all = a => a.map(pt);
    g.polys = g.polys.map(all);
    if (g.rings) g.rings = g.rings.map(rg => Object.assign({}, rg, { pts: all(rg.pts) }));
    if (g.outline) g.outline = all(g.outline);
    if (g.axis) g.axis = Object.assign({}, g.axis, { pts: all(g.axis.pts) });
    if (g.multi) g.multi = g.multi.map(all);
    if (g.table) { const t = {}; Object.keys(g.table).forEach(n => (t[n] = all(g.table[n]))); g.table = t; }
    if (g.area) g.area = Object.assign({}, g.area, { cx: g.area.cx + dx, cy: g.area.cy + dy });
    return g;
  }
  H.pieceGeom = function (p, B) {
    const g = pieceShape(p, B);
    if (p.dx || p.dy) shiftGeom(g, p.dx || 0, p.dy || 0);
    g.ls = (B.ls || 1) * (g.lf || 1) * (p.lz || 1);
    g.lc = !!p.lc;
    return g;
  };
  /* Pièces multiples (2 pals, 3 fasces, 4 cotices…) : le champ est divisé en 2n+1 bandes égales,
     les pièces occupent les bandes paires (2e, 4e…). Chaque pièce a son axe pour y poser des meubles. */
  function multiShape(p, B, n) {
    const th = p.th || 1, { l, t, w, h } = B, N = 2 * n + 1, polys = [], axes = [];
    /* pièces plus étroites : motif du trait réduit d'autant (lf, comme pour l'écusson) */
    const lf = Math.sqrt(3 / N);
    if (p.type === 'pal' || p.type === 'fasce') {
      const vert = p.type === 'pal', ext = vert ? w : h, half = (ext / N / 2) * th;
      for (let i = 0; i < n; i++) {
        const s = (vert ? l : t) + ext * (2 * i + 1.5) / N;
        const o = vert ? [s, B.cy] : [B.cx, s], d = vert ? [0, 1] : [1, 0];
        polys.push(band(o, d, half));
        axes.push(vert ? [[s, t + 0.12 * h], [s, B.b - 0.22 * h]] : [[l + 0.1 * w, s], [l + 0.9 * w, s]]);
      }
      return { polys, multi: axes, axis: { pts: axes[0] }, size: half * 1.7, lf };
    }
    const d = p.type === 'bande' ? norm([w, B.hd]) : norm([-w, B.hd]), g = diagInfo(B, null, d);
    const half = (g.ext * 2 / N / 2) * th, L = Math.hypot(w, B.hd) * 0.3;
    for (let i = 0; i < n; i++) {
      const s = -g.ext + 2 * g.ext * (2 * i + 1.5) / N, o = [g.c0[0] + g.nn[0] * s, g.c0[1] + g.nn[1] * s];
      polys.push(band(o, d, half));
      /* les bandes excentrées traversent moins d'écu : axe raccourci */
      const Li = L * (1 - 0.55 * Math.abs(s) / g.ext);
      axes.push([[o[0] - d[0] * Li, o[1] - d[1] * Li], [o[0] + d[0] * Li, o[1] + d[1] * Li]]);
    }
    return { polys, multi: axes, axis: { pts: axes[0] }, size: half * 1.6, lf };
  }
  H.MULTI_PIECES = ['pal', 'fasce', 'bande', 'barre'];
  function pieceShape(p, B) {
    const th = p.th || 1, { cx, cy, l, r, t, b, w, h } = B;
    const D1 = norm([w, B.hd]), D2 = norm([-w, B.hd]);
    const c = [cx, cy];
    const diagLen = Math.hypot(w, B.hd);
    if ((p.n || 1) > 1 && H.MULTI_PIECES.includes(p.type)) return multiShape(p, B, p.n);
    switch (p.type) {
      case 'chef': {
        const hc = h * 0.27 * th, yb = t + hc;
        return { polys: [[[X0, Y0, 0], [X1, Y0, 0], [X1, yb, 1], [X0, yb, 0]]], axis: { pts: [[l + 0.1 * w, t + hc / 2], [r - 0.1 * w, t + hc / 2]] }, size: Math.min(hc * 0.8, w * 0.24) };
      }
      case 'fasce': {
        const half = h * 0.125 * th;
        return { polys: [band(c, [1, 0], half)], axis: { pts: [[l + 0.1 * w, cy], [r - 0.1 * w, cy]] }, size: half * 1.7 };
      }
      case 'pal': {
        const half = w * 0.14 * th;
        return { polys: [band(c, [0, 1], half)], axis: { pts: [[cx, t + 0.15 * h], [cx, b - 0.25 * h]] }, size: half * 1.7 };
      }
      case 'bande': case 'barre': {
        const d = p.type === 'bande' ? D1 : D2, half = w * 0.13 * th, L = diagLen * 0.3;
        return { polys: [band(c, d, half)], axis: { pts: [[cx - d[0] * L, cy - d[1] * L], [cx + d[0] * L, cy + d[1] * L]] }, size: half * 1.6 };
      }
      case 'croix': {
        const a = w * 0.1 * th;
        const v = [[cx - a, Y0, 0], [cx + a, Y0, 1], [cx + a, cy - a, 1], [X1, cy - a, 0], [X1, cy + a, 1], [cx + a, cy + a, 1], [cx + a, Y1, 0], [cx - a, Y1, 1], [cx - a, cy + a, 1], [X0, cy + a, 0], [X0, cy - a, 1], [cx - a, cy - a, 1]];
        const a1 = [cx, cy - 0.27 * h], a2 = [cx, cy + 0.27 * h], a3 = [cx - 0.3 * w, cy], a4 = [cx + 0.3 * w, cy];
        return { polys: [v], axis: { pts: [a3, a4] }, size: a * 1.7, table: { 1: [c], 2: [a3, a4], 3: [a3, c, a4], 4: [a1, a2, a3, a4], 5: [c, a1, a2, a3, a4] } };
      }
      case 'sautoir': {
        const half = w * 0.095 * th, k = 78;
        const e1 = [cx - D1[0] * k, cy - D1[1] * k], e2 = [cx + D1[0] * k, cy + D1[1] * k], e3 = [cx - D2[0] * k, cy - D2[1] * k], e4 = [cx + D2[0] * k, cy + D2[1] * k];
        return { polys: [band(c, D1, half), band(c, D2, half)], axis: { pts: [e1, e2] }, size: half * 1.6,
                 table: { 1: [c], 2: [e1, e2], 3: [e1, c, e2], 4: [e1, e2, e3, e4], 5: [c, e1, e2, e3, e4] } };
      }
      case 'chevron': {
        const m = 0.62, tv = h * 0.17 * th, yA = cy - h * 0.12;
        const v = [[cx, yA, 1], [X1, yA + (X1 - cx) * m, 0], [X1, yA + (X1 - cx) * m + tv, 1], [cx, yA + tv, 1], [X0, yA + (cx - X0) * m + tv, 0], [X0, yA + (cx - X0) * m, 1]];
        const dx = 0.36 * w;
        const ax = [[cx - dx, yA + tv / 2 + dx * m], [cx, yA + tv / 2], [cx + dx, yA + tv / 2 + dx * m]];
        /* chevron renversé : la pointe en bas, le dessin retourné autour de l'axe horizontal du cœur */
        if (p.inv) { const fy = q => { const r = q.slice(); r[1] = 2 * cy - r[1]; return r; }; return { polys: [v.map(fy)], axis: { pts: ax.map(fy) }, size: tv * 0.8 }; }
        return { polys: [v], axis: { pts: ax }, size: tv * 0.8 };
      }
      case 'pairle': {
        const half = w * 0.085 * th, o = [cx, cy - h * 0.03];
        const UL = norm([-1, -0.9]), UR = norm([1, -0.9]), DN = [0, 1];
        const pL = [o[0] + UL[0] * 72, o[1] + UL[1] * 72], pR = [o[0] + UR[0] * 72, o[1] + UR[1] * 72], pD = [o[0], o[1] + 72];
        return { polys: [band(o, UL, half, -half * 0.9, 700), band(o, UR, half, -half * 0.9, 700), band(o, DN, half, -half * 0.9, 700)],
                 axis: { pts: [pL, o, pR] }, size: half * 1.6, table: { 1: [o], 2: [pL, pR], 3: [pL, pR, pD], 4: [o, pL, pR, pD] } };
      }
      case 'bordure': {
        const bw = w * 0.1 * th, s = 1 - (2 * bw) / w, sm = 1 - bw / w;
        return { polys: [[[X0, Y0, 0], [X1, Y0, 0], [X1, Y1, 0], [X0, Y1, 0]]], rings: [{ pts: B.ol(s), hole: true }], eo: true,
                 axis: { pts: fromTop(B.ol(sm), B), closed: true }, size: bw * 0.85 };
      }
      case 'orle': {
        const g = w * 0.035, tk = w * 0.055 * th, so = 1 - (2 * g) / w, si = 1 - (2 * (g + tk)) / w, sm = 1 - (2 * (g + tk / 2)) / w;
        return { polys: [], rings: [{ pts: B.ol(so), hole: false }, { pts: B.ol(si), hole: true }], eo: true,
                 axis: { pts: fromTop(B.ol(sm), B), closed: true }, size: tk * 0.8 };
      }
      case 'ecusson': {
        /* écusson « sur le tout » : réduction de la forme de l'écu, centrée en cœur */
        const sh = H.shapeById(B.shape), sb = sh.box, sw = sb.r - sb.l, shh = sb.b - sb.t;
        const k = 0.44 * th * Math.min(B.w / sw, B.h / shh);
        const pts = H.shieldPoly(B.shape, 1).map(([x, y]) => [B.cx + (x - (sb.l + sb.r) / 2) * k, B.cy + (y - sh.cy) * k]);
        return { polys: [], rings: [{ pts, hole: false }], eo: true, outline: pts, lf: Math.min(1, (sw * k) / w),
                 axis: { pts: [[B.cx, B.cy], [B.cx + 0.01, B.cy]] }, size: sw * k * 0.62,
                 area: { cx: B.cx, cy: B.cy - shh * k * 0.04, w: sw * k * 0.8, h: shh * k * 0.72, size: sw * k * 0.62 } };
      }
      case 'ente': {
        /* partie arrondie qui monte de la pointe jusqu'au cœur, ses flancs s'évasant vers le bas (courbe en puissance) */
        const ya = cy - h * 0.05, W0 = w * 0.34 * th, tb = (b - ya) * 1.25, N = 28, hw = u => W0 * Math.pow(u, 0.7) * 1.0;
        const right = [], left = [];
        for (let i = 1; i <= N; i++) { const u = (i / N) * 1.25; right.push([cx + hw(u), ya + u * (b - ya), 0]); left.unshift([cx - hw(u), ya + u * (b - ya), 0]); }
        const v = [[cx, ya, 0]].concat(right, left);
        const ay = ya + 0.52 * (b - ya);
        return { polys: [v], axis: { pts: [[cx, ay], [cx + 0.01, ay]] }, size: W0 * 0.7,
                 area: { cx, cy: ay, w: W0 * 1.1, h: (b - ya) * 0.5, size: W0 * 0.7 } };
      }
      case 'canton': {
        const cw = w * 0.34 * th, ch = h * 0.26 * th;
        return { polys: [[[X0, Y0, 0], [l + cw, Y0, 1], [l + cw, t + ch, 1], [X0, t + ch, 0]]], axis: { pts: [[l + cw / 2, t + ch / 2], [l + cw / 2 + 0.01, t + ch / 2]] }, size: Math.min(cw, ch) * 0.7,
                 area: { cx: l + cw / 2, cy: t + ch / 2, w: cw * 0.9, h: ch * 0.9, size: Math.min(cw, ch) * 0.7 } };
      }
      case 'franc-quartier': {
        const cw = cx - l, ch = cy - t;
        return { polys: [[[X0, Y0, 0], [cx, Y0, 1], [cx, cy, 1], [X0, cy, 0]]], axis: { pts: [[l + cw / 2, t + ch / 2], [l + cw / 2 + 0.01, t + ch / 2]] }, size: Math.min(cw, ch) * 0.75,
                 area: { cx: l + cw / 2, cy: t + ch / 2, w: cw * 0.9, h: ch * 0.9, size: Math.min(cw, ch) * 0.75 } };
      }
      case 'champagne': {
        const y0 = b - h * 0.27 * th, yy = y0 + (b - y0) * 0.4;
        return { polys: [[[X0, y0, 1], [X1, y0, 0], [X1, Y1, 0], [X0, Y1, 0]]], axis: { pts: [[cx - 0.26 * w, yy], [cx + 0.26 * w, yy]] }, size: (b - y0) * 0.55 };
      }
    }
    return { polys: [], axis: { pts: [c, c] }, size: 30 };
  }

  H.piecePaths = function (g, line) {
    const mode = line === 'ondee' || line === 'nebulee' ? 'par' : 'out';
    if (g.eo) {
      let d = '';
      g.polys.forEach(v => (d += pathFromVerts(v, line, mode, g.ls, g.lc)));
      (g.rings || []).forEach(rg => (d += ringPath(rg, line, mode, g.ls)));
      return [{ d, eo: true }];
    }
    return g.polys.map(v => ({ d: pathFromVerts(v, line, mode, g.ls, g.lc), eo: false }));
  };

  H.pieceContains = function (g, x, y) {
    if (g.eo) {
      let n = 0;
      g.polys.forEach(v => { if (pip(v, x, y)) n++; });
      (g.rings || []).forEach(rg => { if (pip(rg.pts, x, y)) n++; });
      return n % 2 === 1;
    }
    return g.polys.some(v => pip(v, x, y));
  };

  /* Pièces « en boîte » (canton, franc-quartier, écusson) : meubles rangés par rangs dans la zone */
  const ROWS = { 1: [1], 2: [2], 3: [2, 1], 4: [2, 2], 5: [2, 1, 2], 6: [3, 2, 1], 7: [3, 1, 3], 8: [3, 2, 3] };
  function inArea(A, n) {
    const rows = ROWS[n] || [n], cols = Math.max(...rows);
    const cell = Math.min(A.w / cols, A.h / rows.length), pts = [];
    rows.forEach((k, r) => {
      const y = A.cy + (r - (rows.length - 1) / 2) * cell;
      for (let i = 0; i < k; i++) pts.push([A.cx + (i - (k - 1) / 2) * cell, y]);
    });
    return { pts, size: n === 1 ? A.size : cell * 0.82 };
  }
  H.anchors = function (g, n) {
    if (g.area) return inArea(g.area, n);
    if (g.table && g.table[n]) return { pts: g.table[n], size: g.size };
    const closed = !!g.axis.closed;
    const pts = along(g.axis.pts, n, closed);
    const L = polyLen(g.axis.pts, closed);
    return { pts, size: Math.min(g.size, (L / n) * 0.86) };
  };

  /* ---------- Meubles ---------- */
  H.chargeCount = function (c) {
    if (c.on && c.on !== 'field') return c.n || 1;
    const a = H.ARR[c.arr] || H.ARR['1'];
    return a.orle ? c.orn || a.n : a.n;
  };

  /* F : champ qui porte le meuble, B : boîte de ce champ */
  /* sp : espacement des meubles identiques, appliqué autour du centre du groupe */
  const spread = (pts, sp) => {
    if (!sp || sp === 1 || pts.length < 2) return pts;
    const gx = pts.reduce((s, p) => s + p[0], 0) / pts.length, gy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    return pts.map(([x, y]) => [gx + (x - gx) * sp, gy + (y - gy) * sp]);
  };
  /* décalage manuel d'un meuble (dx, dy en unités de l'écu) appliqué à toutes ses positions */
  H.chargePos = function (F, B, c) {
    const r = chargePos0(F, B, c);
    if (c.dx || c.dy) r.pts = r.pts.map(([x, y]) => [x + (c.dx || 0), y + (c.dy || 0)]);
    return r;
  };
  function chargePos0(F, B, c) {
    const sc = c.scale || 1, sp = c.sp || 1;
    if (c.on && c.on !== 'field') {
      const p = F.pieces.find(x => x.id === c.on);
      if (p) {
        const g = H.pieceGeom(p, B);
        if (g.multi) {
          /* pièces multiples : chacune porte le même nombre de meubles (« chargées chacune de… ») */
          const parts = g.multi.map(ax => H.anchors({ axis: { pts: ax }, size: g.size }, c.n || 1));
          return { pts: [].concat(...parts.map(a => spread(a.pts, sp))), size: Math.min(...parts.map(a => a.size)) * sc, onPiece: p };
        }
        const a = H.anchors(g, c.n || 1);
        /* sur la bordure ou l'orle, les meubles font le tour : l'espacement est déjà imposé */
        return { pts: g.axis.closed ? a.pts : spread(a.pts, sp), size: a.size * sc, onPiece: p };
      }
    }
    const a = H.ARR[c.arr] || H.ARR['1'];
    if (a.seme) {
      const sps = Math.max(0.3, sp), S0 = a.s * B.u * sc, sx = S0 * 1.8 * sps, sy = S0 * 1.7 * sps, poly = B.ol(1.08), pts = [];
      const R = B.real;
      let row = 0;
      for (let y = R.t + sy * 0.45; y < R.b + sy * 0.3; y += sy, row++) {
        for (let x = R.l + sx * 0.35 + (row % 2 ? sx / 2 : 0); x < R.r + sx * 0.3; x += sx) if (pip(poly, x, y)) pts.push([x, y]);
      }
      return { pts, size: S0 };
    }
    /* orle : autant de meubles que l'on veut (8 par défaut), un peu plus petits au-delà de 14 pour ne pas se chevaucher */
    if (a.orle) { const n = c.orn || a.n; return { pts: along(fromTop(B.ol(0.78), B), n, true), size: a.s * B.u * sc * Math.min(1, 14 / n) }; }
    const mvp = !a.seme && !a.orle && mouvantPts(B, c, a);
    if (mvp) return { pts: spread(mvp.pts, sp), size: mvp.size };
    const tied = (a.canton || a.accoste) && tiedPts(F, B, a);
    if (tied) return { pts: spread(tied, sp), size: a.s * B.u * sc };
    return { pts: spread(a.pts.map(([fx, fy]) => [B.cx + fx * B.w, B.cy + fy * B.h]), sp), size: a.s * B.u * sc };
  }
  /* Mouvant : la figure touche le bord de la zone d'où elle sort. c.mv choisit le bord ; à défaut, celui du meuble
     (pont, haie, arc-en-ciel : « des flancs », la figure occupe toute la largeur à sa hauteur habituelle). */
  H.MOUVANTS = { chef: 'du chef', pointe: 'de la pointe', 'flanc-d': 'du flanc dextre', 'flanc-s': 'du flanc senestre', 'canton-d': 'du canton dextre du chef', 'canton-s': 'du canton senestre du chef', flancs: 'des flancs', trait: 'du trait' };
  H.mouvantOf = c => { const d = (H.CMAP[c.type] || {}).mouvant; return c.mv === 'non' ? null : c.mv || d || null; };
  function mouvantPts(B, c, a) {
    const mv = H.mouvantOf(c);
    if (!mv) return null;
    const sc = c.scale || 1, R = B.real;
    /* dessin réellement occupé dans la grille (retourné ou penché comme le meuble) */
    let bb = (H.contentBox && H.contentBox(c)) || [0, 0, 100, 100];
    if (c.rot) { const m = Math.max(...bb.map((v, i) => Math.abs(v - 50))); bb = [50 - m, 50 - m, 50 + m, 50 + m]; }
    if (c.flip) bb = [100 - bb[2], bb[1], 100 - bb[0], bb[3]];
    if (c.invert) bb = [bb[0], 100 - bb[3], bb[2], 100 - bb[1]];
    if (mv === 'flancs') {
      if (a.n !== 1) return null;
      const [fx, fy] = a.pts[0], size = B.w * 1.04 * sc * 100 / Math.max(10, bb[2] - bb[0]), k = size / 100;
      return { pts: [[B.cx + fx * B.w - ((bb[0] + bb[2]) / 2 - 50) * k, B.cy + fy * B.h]], size };
    }
    const s = 0.32 * B.u * sc, h = s / 2, k = s / 100;
    let dir = mv;
    if (mv === 'trait') {
      const vx = (B.pc ? B.pc[0] : B.cx) - B.cx, vy = (B.pc ? B.pc[1] : B.cy - 1) - B.cy;
      dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'flanc-s' : 'flanc-d') : (vy > 0 ? 'pointe' : 'chef');
    }
    /* le bord de la zone touche le bord du dessin (pas celui de sa case carrée) ; la pointe, plus étroite, reste un peu au-dessus */
    const mx = (bb[0] + bb[2]) / 2 - 50, top = R.t + (50 - bb[1]) * k, left = R.l + (50 - bb[0]) * k, right = R.r - (bb[2] - 50) * k, bot = R.b - (bb[3] - 50) * k - s * 0.12;
    const P = {
      chef: [B.cx - mx * k, top], pointe: [B.cx - mx * k, bot], 'flanc-d': [left, B.cy], 'flanc-s': [right, B.cy],
      'canton-d': [left, top], 'canton-s': [right, top]
    }[dir];
    return P ? { pts: [P], size: s } : null;
  }
  /* Pièce du champ à laquelle se rapportent « cantonné » (croix, sautoir) et « accosté » (pal, bande, barre) */
  H.tiedPiece = (F, a) => (F.pieces || []).find(p => (p.n || 1) === 1 && (a.canton ? p.type === 'croix' || p.type === 'sautoir' : ['pal', 'bande', 'barre'].includes(p.type)));
  function tiedPts(F, B, a) {
    const p = H.tiedPiece(F, a);
    if (!p) return null;
    const ox = B.cx + (p.dx || 0), oy = B.cy + (p.dy || 0), th = p.th || 1;
    if (a.canton) {
      /* entre les bras : les quatre quartiers de la croix, ou le chef, les flancs et la pointe du sautoir */
      return (p.type === 'croix' ? [[-0.29, -0.22], [0.29, -0.22], [-0.29, 0.22], [0.29, 0.22]] : [[0, -0.3], [-0.3, 0], [0.3, 0], [0, 0.3]])
        .map(([fx, fy]) => [ox + fx * B.w, oy + fy * B.h]);
    }
    /* de part et d'autre de l'axe de la pièce, à son milieu, vers le chef ou vers la pointe */
    const d = p.type === 'pal' ? [0, 1] : p.type === 'bande' ? norm([B.w, B.hd]) : norm([-B.w, B.hd]);
    const nn = [-d[1], d[0]], half = (p.type === 'pal' ? B.w * 0.14 : B.w * 0.13) * th;
    const off = half + a.s * B.u * 0.58, al = (a.along || 0) * (p.type === 'pal' ? B.h * 0.22 : Math.hypot(B.w, B.hd) * 0.13);
    return [-1, 1].map(s => [ox + nn[0] * off * s + d[0] * al, oy + nn[1] * off * s + d[1] * al]);
  }

  /* ---------- Contextes imbriqués (poupées russes) ----------
     Un contexte = { B : boîte, inside(x,y), chain : chemins de découpe successifs, key }.
     La boîte d'une sous-partie est centrée sur son barycentre pour bien y placer pièces et meubles. */
  const CTX = {};
  let ctxCount = 0;
  const memo = (key, fn) => {
    if (key in CTX) return CTX[key];
    if (++ctxCount > 400) { for (const k in CTX) delete CTX[k]; ctxCount = 0; }
    return (CTX[key] = fn());
  };
  function boxFrom(inside, parent) {
    const P = parent.real, step = Math.max(P.r - P.l, P.b - P.t) / 60;
    let n = 0, sx = 0, sy = 0, l = 1e9, r = -1e9, t = 1e9, b = -1e9;
    for (let y = P.t + step / 2; y < P.b; y += step) for (let x = P.l + step / 2; x < P.r; x += step) {
      if (!inside(x, y)) continue;
      n++; sx += x; sy += y;
      if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y;
    }
    if (n < 3) return null;
    const cx = sx / n, cy = sy / n;
    const hw = Math.max(step, Math.min(cx - l, r - cx)), hh = Math.max(step, Math.min(cy - t, b - cy));
    const B = { shape: parent.shape, l: cx - hw, r: cx + hw, t: cy - hh, b: cy + hh, cx, cy, w: 2 * hw, h: 2 * hh };
    B.hd = Math.min(B.h, B.w * 1.15);
    B.u = Math.min(B.w, B.h / 1.26);
    B.pc = [parent.cx, parent.cy];   /* centre de la zone qui contient celle-ci (pour « mouvant du trait ») */
    B.real = { l: l - step / 2, r: r + step / 2, t: t - step / 2, b: b + step / 2 };
    /* les traits suivent la taille de la zone : racine carrée du rapport des surfaces avec l'écu entier */
    B.area0 = parent.area0;
    B.ls = Math.min(1, Math.max(0.2, Math.sqrt((n * step * step) / B.area0)));
    return B;
  }
  const scaleAbout = (pts, cx, cy) => sc => pts.map(([x, y]) => [cx + (x - cx) * sc, cy + (y - cy) * sc]);
  const rectOl = B => scaleAbout([[B.l, B.t], [B.r, B.t], [B.r, B.b], [B.l, B.b]], B.cx, B.cy);

  H.rootCtx = function (shape) {
    return memo('R' + shape, () => {
      const B = H.boxOf(shape), poly = H.shieldPoly(shape, 1);
      return { B, inside: (x, y) => pip(poly, x, y), chain: [{ d: H.shapeById(shape).d }], key: 'R' + shape };
    });
  };
  H.slotCtx = function (F, ctx, k) {
    const key = ctx.key + '/s' + F.part + F.line + (F.lz || 1) + (F.lc ? 'c' : '') + k;
    return memo(key, () => {
      const inside = (x, y) => ctx.inside(x, y) && H.slotAt(F.part, ctx.B, x, y) === k;
      const B = boxFrom(inside, ctx.B);
      if (!B) return null;
      B.ol = rectOl(B);
      const rg = H.fieldRegions(F.part, ctx.B, F.line, true, F.lz, F.lc).find(x => x.slot === k);
      return { B, inside, chain: ctx.chain.concat([{ d: rg ? rg.d : '' }]), key };
    });
  };
  H.pieceCtx = function (F, ctx, p) {
    const key = ctx.key + '/p' + p.type + p.th + p.line + (p.lz || 1) + (p.lc ? 'c' : '') + 'n' + (p.n || 1) + (p.inv ? 'i' : '') + '@' + (p.dx || 0) + ',' + (p.dy || 0);
    return memo(key, () => {
      const g = H.pieceGeom(p, ctx.B);
      const inside = (x, y) => ctx.inside(x, y) && H.pieceContains(g, x, y);
      const B = boxFrom(inside, ctx.B);
      if (!B) return null;
      B.ol = g.outline ? scaleAbout(g.outline, B.cx, B.cy) : rectOl(B);
      const paths = H.piecePaths(g, p.line);
      return { B, inside, chain: ctx.chain.concat([{ d: paths.map(x => x.d).join(''), eo: !!g.eo }]), key };
    });
  };

  /* Intérieur d'un meuble : champ dessiné dans la grille 100×100 du dessin (il suit le meuble : taille, rotation, contourné),
     sur la boîte de la silhouette. Le contexte est « local » : ses coordonnées ne sont pas celles de l'écu. */
  H.chargeCtx = function (F, ctx, c) {
    const key = 'C' + c.type + '~' + c.variant;
    return memo(key, () => {
      const b = H.contentBox(c) || [10, 10, 90, 90];
      const B = { shape: ctx.B.shape, l: b[0], t: b[1], r: b[2], b: b[3], cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2, w: b[2] - b[0], h: b[3] - b[1] };
      B.hd = Math.min(B.h, B.w * 1.15);
      B.u = Math.min(B.w, B.h / 1.26);
      B.pc = [B.cx, B.cy];
      B.real = { l: B.l, r: B.r, t: B.t, b: B.b };
      B.area0 = ctx.B.area0;
      /* les traits gardent à peu près la taille qu'ils ont sur l'écu entier, ramenée à la grille du meuble */
      B.ls = Math.min(1, Math.max(0.2, Math.sqrt((B.w * B.h) / B.area0)));
      B.ol = rectOl(B);
      return { B, inside: (x, y) => x >= B.l && x <= B.r && y >= B.t && y <= B.b, chain: [{ d: '', local: true }], key, local: true };
    });
  };

  /* Pièces posées sur un meuble : celles qui traversent (fasce, bande, croix…) sont centrées sur le meuble mais vont d'un bord
     à l'autre de la zone qui le contient ; les autres (chef, bordure, canton…) restent dans la silhouette du meuble. */
  H.THROUGH = ['fasce', 'pal', 'bande', 'barre', 'croix', 'sautoir', 'chevron', 'pairle'];
  H.splitInner = function (inner) {
    const through = inner.pieces.filter(p => H.THROUGH.includes(p.type)), ids = through.map(p => p.id);
    const onThrough = inner.charges.filter(c => ids.includes(c.on));
    const inside = Object.assign({}, inner, { pieces: inner.pieces.filter(p => !through.includes(p)), charges: inner.charges.filter(c => !onThrough.includes(c)) });
    return { through, onThrough, inside };
  };
  /* Contexte des pièces traversantes d'un exemplaire du meuble (centre x, y, taille size) : boîte du dessin, en coordonnées de l'écu */
  H.throughCtx = function (ctx, c, x, y, size) {
    const b = H.contentBox(c) || [10, 10, 90, 90], k = size / 100, P = ctx.B;
    const l = x + (b[0] - 50) * k, r = x + (b[2] - 50) * k, t = y + (b[1] - 50) * k, bb = y + (b[3] - 50) * k;
    const B = { shape: P.shape, l, r, t, b: bb, cx: x, cy: y, w: r - l, h: bb - t };
    B.hd = Math.min(B.h, B.w * 1.15);
    B.u = Math.min(B.w, B.h / 1.26);
    B.pc = [x, y];
    B.real = { l, r, t, b: bb };
    B.area0 = P.area0;
    B.ls = Math.min(1, Math.max(0.2, Math.sqrt((B.w * B.h) / B.area0)));
    B.ol = rectOl(B);
    const key = ctx.key + '/t' + c.type + c.variant + '@' + [x, y, size].map(v => Math.round(v * 10)).join(',');
    return { B, inside: ctx.inside, chain: ctx.chain, key };
  };

  /* Chemin de navigation : ['s1', 'pXXXX', 'cXXXX', …] → { F, ctx, labels } */
  H.walk = function (S, path) {
    let F = S.field, ctx = H.rootCtx(S.shape);
    const crumbs = [{ label: 'Écu entier', depth: 0 }];
    const ok = [];
    for (const step of path || []) {
      let nF = null, nctx = null, label = '';
      if (step[0] === 's') {
        const k = +step.slice(1), P = H.PMAP[F.part];
        if (P.compose && k < P.slots && F.subs && F.subs[k]) { nF = F.subs[k]; nctx = H.slotCtx(F, ctx, k); label = P.labels[k]; }
      } else {
        const p = F.pieces.find(x => x.id === step), c = !p && F.charges.find(x => x.id === step);
        if (p && p.inner) { nF = p.inner; nctx = H.pieceCtx(F, ctx, p); label = H.PCMAP[p.type].name; }
        else if (c && c.inner) { nF = c.inner; nctx = H.chargeCtx(F, ctx, c); label = H.CMAP[c.type].name; }
      }
      if (!nF || !nctx) break;
      /* sous un meuble, les découpes sont en coordonnées du meuble : la mise en évidence s'arrête à lui */
      if (ctx.local || ctx.chain.some(x => x.local)) nctx = Object.assign({}, nctx, { chain: ctx.chain });
      else if (nctx.local) nctx = Object.assign({}, nctx, { chain: ctx.chain.concat([{ d: '', local: true }]) });
      F = nF; ctx = nctx; ok.push(step);
      crumbs.push({ label, depth: ok.length });
    }
    return { F, ctx, path: ok, crumbs };
  };
})(window.H);
