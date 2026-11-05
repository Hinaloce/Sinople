/* Rendu SVG d'un blason à partir de l'état (champs imbriqués) */
(function (H) {
  let uidN = 0;
  const r = (v, p) => { const m = Math.pow(10, p === undefined ? 1 : p); return Math.round(v * m) / m; };

  H.newField = t0 => ({ part: 'plein', line: 'droite', t: [t0 === undefined ? null : t0, null, null, null], subs: [], pieces: [], charges: [] });

  H.defaultState = () => {
    const f = H.newField('azur');
    f.charges = [{ id: 'c1', type: 'fleur-de-lis', t: 'or', arr: '3', n: 1, on: 'field', scale: 1, flip: false, invert: false, rot: 0 }];
    return { v: 2, shape: 'moderne', field: f };
  };

  /* Émail effectif d'une pièce (une pièce composée n'a un émail unique que si son champ est plein) */
  H.pieceT = p => (p.inner ? (p.inner.part === 'plein' ? p.inner.t[0] : null) : p.t);
  H.chargeT = c => (c.inner ? (c.inner.part === 'plein' ? c.inner.t[0] : null) : c.t);

  /* Fourrure d'un meuble, dans sa grille 100×100 : le motif suit la taille du meuble */
  const FUR_CHARGE = 0.55;
  /* fx : registre des filtres de contour du dessin en cours (un par épaisseur) */
  /* inner : intérieur composé du meuble, déjà dessiné dans la grille 100×100 du meuble */
  function chargeSvg(c, x, y, size, fx, inner) {
    if (!H.CMAP[c.type]) return '';
    const k = size / 100;
    /* ow : réglage de l'épaisseur du contour (0 = sans contour) */
    const ow = c.ow === undefined ? 1 : c.ow;
    const iw = Math.min(2, Math.max(0.3, 0.35 / k)) * ow;
    const t = H.TMAP[c.t];
    const fill = id => fx.fur(id, FUR_CHARGE * (c.fs || 1), c.fc ? [50, 50] : null);
    const o = { f: fill(c.t), fill, k: H.INK, d: t ? t.det : '#333', iw, filter: iw >= 0.05 ? fx.get(Math.max(0.1, iw)) : null };
    if (inner) { o.inner = inner; o.mask = fx.mask(c, () => H.chargeArt(c, { mode: 'mask', f: '#fff', fill })); }
    const art = H.chargeArt(c, o);
    const sx = (c.flip ? -1 : 1) * k, sy = (c.invert ? -1 : 1) * k;
    const rot = c.rot ? ` rotate(${c.rot})` : '';
    return `<g transform="translate(${r(x)} ${r(y)})${rot} scale(${r(sx, 4)} ${r(sy, 4)}) translate(-50 -50)">${art}</g>`;
  }
  function filters(prefix) {
    const map = {};
    const fx = { defs: '', get(iw) {
      const key = (Math.round(iw * 10) / 10).toFixed(1);
      if (!map[key]) { map[key] = prefix + 'o' + key.replace('.', '_'); fx.defs += H.outlineFilter(map[key], key, H.INK); }
      return map[key];
    },
    /* masque de la silhouette d'un meuble (intérieur composé), un par meuble et par réglage de ses parties */
    mask(c, art) {
      const key = 'm' + c.type + c.variant + [c.langue, c.armes, c.peau, c.cheveux, JSON.stringify(c.extras || {})].join('|');
      if (!map[key]) {
        map[key] = prefix + 'm' + Object.keys(map).length;
        fx.defs += `<mask id="${map[key]}" maskUnits="userSpaceOnUse" x="-60" y="-60" width="220" height="220">${art()}</mask>`;
      }
      return map[key];
    },
    /* fourrure à l'échelle s (motif propre à ce dessin) ; les autres émaux sont rendus tels quels */
    fur(id, s, c) {
      const pat = H.FUR_PAT[id];
      if (!pat) return H.fill(id);
      const sc = Math.round(Math.min(4, Math.max(0.08, s)) * 100) / 100;
      const key = 'f' + id + sc + (c ? '@' + c.map(v => v.toFixed(1)).join(',') : '');
      if (!map[key]) { map[key] = prefix + 'f' + Object.keys(map).length; fx.defs += pat(map[key], sc, c); }
      return `url(#${map[key]})`;
    } };
    return fx;
  }

  H.renderArms = function (S, opt) {
    opt = opt || {};
    const shape = H.shapeById(S.shape);
    const uid = 'u' + ++uidN;
    let defs = '', n = 0;
    const INK = H.INK;
    const fx = filters(uid);
    const clip = (d, eo) => {
      const id = uid + 'c' + n++;
      defs += `<clipPath id="${id}"><path d="${d}"${eo ? ' clip-rule="evenodd"' : ''}/></clipPath>`;
      return id;
    };

    const fill0 = id => (H.FUR_PAT[id] ? fx.fur(id, 1, null) : H.fill(id));
    /* Bordure componée : la ligne médiane de la bordure est partagée en 16 compons de même longueur ;
       chaque compon est une bande perpendiculaire à cette ligne, plus large que la bordure (le dessin est découpé par elle) */
    function compons(axis, w, f) {
      const N = 16, pts = axis.concat([axis[0]]), cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const L = cum[cum.length - 1];
      const at = s => {
        let i = 1;
        while (i < cum.length - 1 && cum[i] < s) i++;
        const k = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
        return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
      };
      const wrap = s => ((s % L) + L) % L;
      /* point de la ligne médiane et normale (estimée sur un petit pas de part et d'autre) */
      const norm = s => {
        const p = at(wrap(s)), a = at(wrap(s - 1.5)), b = at(wrap(s + 1.5));
        const tx = b[0] - a[0], ty = b[1] - a[1], n = Math.hypot(tx, ty) || 1;
        return [p, [-ty / n * w, tx / n * w]];
      };
      const seg = ([p, n], k) => `${r(p[0] + n[0] * k)} ${r(p[1] + n[1] * k)}`;
      /* le premier compon est centré sur le point du chef */
      const s0 = -L / N / 2;
      let d = '', lines = '';
      for (let j = 0; j < N; j++) {
        const a = s0 + (j * L) / N, b = a + L / N, edge = [];
        for (let k = 0; k <= 8; k++) edge.push(norm(a + (b - a) * k / 8));
        if (j % 2 === 0) d += 'M' + edge.map(e => seg(e, 1)).join('L') + 'L' + edge.reverse().map(e => seg(e, -1)).join('L') + 'Z';
        const e0 = norm(a);
        lines += `M${seg(e0, 1)}L${seg(e0, -1)}`;
      }
      return `<path d="${d}" fill="${f}"/><path d="${lines}" fill="none" stroke="${INK}" stroke-width="1.4"/>`;
    }

    function field(F, ctx) {
      const B = ctx.B, P = H.PMAP[F.part] || H.PMAP.plein;
      const subs = P.compose && F.subs ? F.subs : [];
      const composed = subs.some((s, i) => s && i < P.slots);
      /* les fourrures du champ suivent la taille de la zone (écu entier, quartier, intérieur d'une pièce…) */
      /* le vair garde la taille de ses tires sur tout l'écu, même dans une partition (l'hermine suit la zone) */
      const fill = id => fx.fur(id, (H.isVair(id) ? 1 : B.ls || 1) * (F.fs || 1), F.fc ? [B.cx, B.cy] : null);
      /* bare : seulement les pièces et meubles (pièces traversant un meuble), sans fond */
      let g = F.bare ? '' : `<rect x="-60" y="-60" width="320" height="400" fill="${fill(F.t[0])}"/>`;
      if (F.part !== 'plein') {
        for (const rg of H.fieldRegions(F.part, B, F.line, composed, F.lz, F.lc)) {
          const sub = subs[rg.slot];
          if (sub) {
            const sc = H.slotCtx(F, ctx, rg.slot);
            if (sc) g += `<g clip-path="url(#${clip(rg.d)})">${field(sub, sc)}</g>`;
            g += `<path d="${rg.d}" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`;
          } else {
            g += `<path d="${rg.d}" fill="${fill(F.t[rg.slot])}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`;
          }
        }
      }
      /* un semé fait partie du champ : il passe sous les pièces (« semé de lis, à la bande… brochant ») */
      const isSeme = c => (!c.on || c.on === 'field') && c.arr === 'seme';
      /* de l'un en l'autre : la figure est dessinée dans chaque partie, de l'émail de l'autre ;
         de l'un et de l'autre : chaque figure prend l'émail de la partie opposée à la sienne */
      const two = H.twoTone(F), regs = () => H.fieldRegions(F.part, B, F.line, true, F.lz, F.lc);
      const drawCharge = c => {
        const pos = H.chargePos(F, B, c);
        /* intérieur composé : dessiné une fois dans la grille du meuble, repris pour chaque exemplaire ;
           les pièces traversantes (et leurs meubles) sont centrées sur chaque exemplaire et vont jusqu'aux bords de la zone */
        const cc = c.inner && H.chargeCtx(F, ctx, c), sp = cc && H.splitInner(c.inner), inner = cc ? field(sp.inside, cc) : null;
        if (inner) for (const [x, y] of pos.pts) {
          g += chargeSvg(c, x, y, pos.size, fx, inner);
          if (sp.through.length) g += field({ bare: true, part: 'plein', t: [], subs: [], pieces: sp.through, charges: sp.onThrough }, H.throughCtx(ctx, c, x, y, pos.size));
        }
        else if (two && c.uet) {
          for (const [x, y] of pos.pts) g += chargeSvg(Object.assign({}, c, { t: F.t[1 - H.slotAt(F.part, B, x, y)] }), x, y, pos.size, fx);
        } else if (two && c.ual) {
          for (const rg of regs()) for (const [x, y] of pos.pts) g += `<g clip-path="url(#${clip(rg.d)})">${chargeSvg(Object.assign({}, c, { t: F.t[1 - rg.slot] }), x, y, pos.size, fx)}</g>`;
        } else for (const [x, y] of pos.pts) g += chargeSvg(c, x, y, pos.size, fx);
      };
      F.charges.filter(isSeme).forEach(drawCharge);
      const drawPiece = p => {
        const geom = H.pieceGeom(p, B);
        const paths = H.piecePaths(geom, p.line);
        for (const pp of paths) g += `<path d="${pp.d}"${pp.eo ? ' fill-rule="evenodd"' : ''} fill="none" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/>`;
        const pc = p.inner && H.pieceCtx(F, ctx, p);
        if (pc) {
          g += `<g clip-path="url(#${clip(paths.map(x => x.d).join(''), geom.eo)})">${field(p.inner, pc)}</g>`;
        } else {
          /* pièce de fourrure : motif à l'échelle de la pièce */
          let pf = H.fill(p.t);
          if (H.FUR_PAT[p.t]) { const pk = H.pieceCtx(F, ctx, p); const pb = pk ? pk.B : B; pf = fx.fur(p.t, (pk ? pk.B.ls : B.ls || 1) * (p.fs || 1), p.fc ? [pb.cx, pb.cy] : null); }
          if (two && p.ual) {
            for (const rg of regs()) for (const pp of paths) g += `<g clip-path="url(#${clip(rg.d)})"><path d="${pp.d}"${pp.eo ? ' fill-rule="evenodd"' : ''} fill="${fill(F.t[1 - rg.slot])}"/></g>`;
          } else for (const pp of paths) g += `<path d="${pp.d}"${pp.eo ? ' fill-rule="evenodd"' : ''} fill="${pf}"/>`;
          if (p.comp && geom.axis.closed) g += `<g clip-path="url(#${clip(paths.map(x => x.d).join(''), geom.eo)})">${compons(geom.axis.pts, geom.size * 3, fill0(p.comp))}</g>`;
        }
      };
      /* sous le tout : avant les autres pièces ; brochant : par-dessus les meubles */
      F.pieces.filter(p => p.sous).forEach(drawPiece);
      F.pieces.filter(p => !p.sous && !p.broch).forEach(drawPiece);
      const onBroch = c => F.pieces.some(p => p.broch && !p.sous && p.id === c.on);
      F.charges.filter(c => !isSeme(c) && !onBroch(c)).forEach(drawCharge);
      F.pieces.filter(p => p.broch && !p.sous).forEach(drawPiece);
      F.charges.filter(onBroch).forEach(drawCharge);
      return g;
    }

    const root = H.rootCtx(S.shape);
    const body = field(S.field, root);

    /* Partie en cours d'édition : on assombrit le reste et on souligne son contour */
    let focus = '';
    if (opt.focus && opt.focus.length) {
      const w = H.walk(S, opt.focus);
      /* intérieur d'un meuble : on met en évidence la zone qui contient le meuble */
      const li = w.ctx.chain.findIndex(x => x.local), chain = li >= 0 ? w.ctx.chain.slice(0, li) : w.ctx.chain;
      if (chain.length > 1) {
        let open = '', close = '';
        for (let i = 1; i < chain.length - 1; i++) { open += `<g clip-path="url(#${clip(chain[i].d, chain[i].eo)})">`; close += '</g>'; }
        const last = chain[chain.length - 1];
        const eo = last.eo ? ' fill-rule="evenodd"' : '';
        defs += `<mask id="${uid}m"><rect x="-60" y="-60" width="320" height="400" fill="#fff"/>${open}<path d="${last.d}"${eo} fill="#000"/>${close}</mask>`;
        focus = `<rect x="-60" y="-60" width="320" height="400" fill="#120c04" opacity=".5" mask="url(#${uid}m)"/>` +
          `${open}<path d="${last.d}"${eo} fill="none" stroke="#ffd36b" stroke-width="2.4" stroke-dasharray="5 4"/>${close}`;
      }
    }

    defs += fx.defs + `<clipPath id="${uid}root"><path d="${shape.d}"/></clipPath>` +
      (opt.gloss ? `<linearGradient id="${uid}gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>` : '') +
      (opt.standalone ? H.FUR_DEFS.slice(0, H.FUR_DEFS.indexOf('</pattern>') + 10) : '');
    const size = opt.standalone ? ' width="' + (opt.px || 400) + '" height="' + Math.round((opt.px || 400) * 1.24) + '"' : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 248"${size} class="${opt.cls || ''}" role="img" aria-label="Blason"><defs>${defs}</defs>` +
      `<g clip-path="url(#${uid}root)">${body}${focus}</g>` +
      (opt.gloss ? `<path d="${shape.d}" fill="url(#${uid}gl)" style="pointer-events:none"/>` : '') +
      `<path d="${shape.d}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></svg>`;
  };

  /* Vignette d'un meuble seul */
  H.renderCharge = function (type, t, variant, extra) {
    const fx = filters('t' + ++uidN);
    const g = chargeSvg(Object.assign({ type, t: t || 'sable', variant }, extra || {}), 50, 50, 100, fx);
    return `<svg viewBox="-4 -4 108 108" aria-hidden="true"><defs>${fx.defs}</defs>${g}</svg>`;
  };
})(window.H);
