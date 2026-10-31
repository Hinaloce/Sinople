/* Pages : navigation (édition, galerie, blasonnement), galerie de blasons connus, blasonnement en une phrase */
(function (H) {
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const VIEWS = ['editeur', 'galerie', 'blasonner'];

  /* ---------- Navigation : #galerie, #blasonner ; sans ancre (ou lien partagé #s=…) : l'éditeur ---------- */
  H.showView = function (v, keepHash) {
    if (!VIEWS.includes(v)) v = 'editeur';
    document.body.dataset.view = v;
    VIEWS.forEach(id => { const el = $('#view-' + id); if (el) el.hidden = id !== v; });
    document.querySelectorAll('.topnav [data-view]').forEach(b => b.setAttribute('aria-current', b.dataset.view === v ? 'page' : 'false'));
    if (!keepHash) history.replaceState(null, '', location.pathname + location.search + (v === 'editeur' ? '' : '#' + v));
    if (v === 'galerie') renderGallery();
    if (v === 'blasonner') { runBlazon(); setTimeout(() => $('#blz-text').focus(), 0); }
  };
  const viewFromHash = () => (location.hash === '#galerie' ? 'galerie' : location.hash === '#blasonner' ? 'blasonner' : 'editeur');

  /* ---------- Galerie : blasons français connus ---------- */
  const F = (t, o) => Object.assign(H.newField(t), o || {});
  const C = (type, t, o) => Object.assign({ id: 'c' + Math.random().toString(36).slice(2, 7), type, t, arr: '1', n: 1, on: 'field', scale: 1 }, o || {});
  const P = (type, t, o) => Object.assign({ id: 'p' + Math.random().toString(36).slice(2, 7), type, t, line: 'droite', th: 1 }, o || {});
  /* champs repris dans plusieurs quartiers (chaque appel crée des identifiants neufs) */
  const franceModerne = o => F('azur', Object.assign({ charges: [C('fleur-de-lis', 'or', { arr: '3', scale: 0.85 })] }, o || {}));
  const bourgogneAncien = () => F('or', { part: 'bande', t: ['or', 'azur', null, null], pieces: [P('bordure', 'gueules')] });
  const GALLERY = [
    { name: 'Royaume de France', note: '« France moderne » : depuis Charles V, les fleurs de lis sont réduites à trois.',
      field: F('azur', { charges: [C('fleur-de-lis', 'or', { arr: '3' })] }) },
    { name: 'France ancien', note: 'Les armes des Capétiens jusqu\'au XIVᵉ siècle : un semé de fleurs de lis.',
      field: F('azur', { charges: [C('fleur-de-lis', 'or', { arr: 'seme' })] }) },
    { name: 'Bretagne', note: 'Le duché porte un champ d\'hermine plain depuis Jean III (1316).',
      field: F('hermine') },
    { name: 'Normandie', note: 'Les deux léopards du duché, repris par les rois d\'Angleterre.',
      field: F('gueules', { charges: [C('leopard', 'or', { variant: 'passant', arr: '2pal', armes: 'azur', langue: 'azur' })] }) },
    { name: 'Guyenne', note: 'L\'Aquitaine anglaise : un seul léopard.',
      field: F('gueules', { charges: [C('leopard', 'or', { variant: 'passant', armes: 'azur', langue: 'azur' })] }) },
    { name: 'Bourgogne ancien', note: 'Les ducs capétiens de Bourgogne (XIᵉ – XIVᵉ siècle).',
      field: F('or', { part: 'bande', t: ['or', 'azur', null, null], pieces: [P('bordure', 'gueules')] }) },
    { name: 'Anjou', note: 'Les Valois-Anjou : les armes de France brisées d\'une bordure de gueules.',
      field: F('azur', { charges: [C('fleur-de-lis', 'or', { arr: '3', scale: 0.85 })], pieces: [P('bordure', 'gueules')] }) },
    { name: 'Lorraine', note: 'La bande chargée de trois alérions, attestée dès le XIIIᵉ siècle.',
      field: (() => { const b = P('bande', 'gueules'); return F('or', { pieces: [b], charges: [C('alerion', 'argent', { on: b.id, n: 3 })] }); })() },
    { name: 'Flandre', note: 'Le lion de sable sur champ d\'or des comtes de Flandre.',
      field: F('or', { charges: [C('lion', 'sable', { variant: 'rampant', armes: 'gueules', langue: 'gueules' })] }) },
    { name: 'Franche-Comté', note: 'Le comté de Bourgogne : un semé de billettes, au lion brochant.',
      field: F('azur', { charges: [C('billette', 'or', { arr: 'seme', scale: 0.8 }), C('lion', 'or', { variant: 'rampant', armes: 'gueules', langue: 'gueules' })] }) },
    { name: 'Dauphiné', note: 'Le dauphin, armes parlantes des dauphins de Viennois.',
      field: F('or', { charges: [C('dauphin', 'azur', { armes: 'gueules' })] }) },
    { name: 'Savoie', note: 'La croix d\'argent sur gueules des comtes puis ducs de Savoie.',
      field: F('gueules', { pieces: [P('croix', 'argent')] }) },
    { name: 'Languedoc', note: 'La croix des comtes de Toulouse, dite croix occitane.',
      field: F('gueules', { charges: [C('croix-occitane', 'or', { scale: 1.35 })] }) },
    { name: 'Béarn', note: 'Les deux vaches du vicomté de Béarn.',
      field: F('or', { charges: [C('vache', 'gueules', { arr: '2pal', armes: 'azur' })] }) },
    { name: 'Artois', note: 'Robert, frère de Saint Louis, brise les armes de France d\'un lambel chargé des châteaux de Castille, pays de sa mère (ici un château par pendant au lieu de trois).',
      field: F('azur', { charges: [C('fleur-de-lis', 'or', { arr: 'seme' }), C('lambel', 'gueules', { arr: 'chef1', scale: 2.8, dy: 4 }),
        C('chateau', 'or', { arr: 'chef3', scale: 0.55, sp: 0.88, dy: 18 })] }) },
    { name: 'Auvergne', note: 'Le gonfanon des comtes d\'Auvergne, bannière d\'église à trois pendants.',
      field: F('or', { charges: [C('gonfanon', 'gueules', { armes: 'sinople', scale: 1.45 })] }) },
    { name: 'Gascogne', note: 'Le lion d\'argent des anciens ducs, écartelé avec les gerbes d\'or.',
      field: F('azur', { part: 'ecartele', t: ['azur', 'gueules', 'gueules', 'azur'], subs: [
        F('azur', { charges: [C('lion', 'argent', { variant: 'rampant', armes: 'gueules', langue: 'gueules' })] }), F('gueules', { charges: [C('gerbe', 'or')] }),
        F('gueules', { charges: [C('gerbe', 'or')] }), F('azur', { charges: [C('lion', 'argent', { variant: 'rampant', armes: 'gueules', langue: 'gueules' })] })] }) },
    { name: 'Comté de Nice', note: 'L\'aigle de Savoie couronnée, posée sur trois coupeaux qui sortent de la mer.',
      field: F('argent', { pieces: [P('champagne', 'azur', { line: 'ondee', th: 0.6 })],
        charges: [C('aigle', 'gueules', { scale: 0.95, dy: -14 }), C('couronne', 'gueules', { arr: 'chef1', scale: 0.45, dy: -6 }), C('mont3', 'sinople', { arr: 'pointe1', scale: 1.8, dy: -18 })] }) },
    { name: 'Roussillon', note: 'Les pals des comtes de Barcelone et rois d\'Aragon, maîtres du Roussillon jusqu\'en 1659.',
      field: F('or', { pieces: [P('pal', 'gueules', { n: 4 })] }) },
    { name: 'Comté de Foix', note: 'Trois pals seulement : les comtes de Foix, issus des comtes de Carcassonne, ont brisé les pals catalans.',
      field: F('or', { pieces: [P('pal', 'gueules', { n: 3 })] }) },
    { name: 'Nivernais', note: 'Les ducs de Nevers, cadets de Bourgogne : la bordure de Bourgogne ancien devient engrêlée.',
      field: F('or', { part: 'bande', t: ['or', 'azur', null, null], pieces: [P('bordure', 'gueules', { line: 'engrelee' })] }) },
    { name: 'Bourgogne moderne', note: 'Les ducs Valois (1363 – 1477) : France à la bordure componée, écartelé de Bourgogne ancien.',
      field: F('azur', { part: 'ecartele', t: ['azur', 'or', 'or', 'azur'], subs: [
        franceModerne({ pieces: [P('bordure', 'argent', { comp: 'gueules' })] }), bourgogneAncien(),
        bourgogneAncien(), franceModerne({ pieces: [P('bordure', 'argent', { comp: 'gueules' })] })] }) },
    { name: 'Saintonge', note: 'La mitre rappelle l\'évêché de Saintes ; les fleurs de lis, le domaine royal.',
      field: F('azur', { charges: [C('mitre', 'argent', { scale: 0.8, dy: 4 }), C('fleur-de-lis', 'or', { arr: '3', scale: 0.62, sp: 1.5 })] }) },
    { name: 'Picardie', note: 'France écartelé des lionceaux de gueules de l\'ancienne Picardie.',
      field: F('azur', { part: 'ecartele', t: ['azur', 'argent', 'argent', 'azur'], subs: [
        franceModerne(), F('argent', { charges: [C('lion', 'gueules', { variant: 'rampant', arr: '3' })] }),
        F('argent', { charges: [C('lion', 'gueules', { variant: 'rampant', arr: '3' })] }), franceModerne()] }) },
    { name: 'Orléanais', note: 'Les ducs d\'Orléans, princes du sang, brisent France d\'un lambel d\'argent.',
      field: F('azur', { charges: [C('fleur-de-lis', 'or', { arr: '3', scale: 0.8, dy: 18 }), C('lambel', 'argent', { arr: 'chef1', scale: 2.8, dy: 4 })] }) },
    { name: 'Poitou', note: 'Les châteaux d\'Alphonse de Poitiers, frère de Saint Louis, fils de Blanche de Castille.',
      field: F('gueules', { charges: [C('chateau', 'or', { arr: '5' })] }) },
    { name: 'Bourbonnais', note: 'France ancien brisé d\'une bande de gueules : la maison de Bourbon.',
      field: F('azur', { charges: [C('fleur-de-lis', 'or', { arr: 'seme' })], pieces: [P('bande', 'gueules', { th: 0.55 })] }) },
    { name: 'Aunis', note: 'La perdrix d\'or, couronnée, de la province de La Rochelle.',
      field: F('gueules', { charges: [C('perdrix', 'or', { scale: 1.3, extras: { couronne: 'or' } })] }) },
    { name: 'Maine', note: 'Les comtes du Maine, cadets d\'Anjou : France ancien à la bordure de gueules, au lion d\'argent en canton.',
      field: F('azur', { charges: [C('fleur-de-lis', 'or', { arr: 'seme' }), C('lion', 'argent', { variant: 'rampant', arr: 'p1', scale: 0.75, dx: -10, dy: -8 })],
        pieces: [P('bordure', 'gueules')] }) },
    { name: 'Comtat-Venaissin', note: 'Les clefs de saint Pierre : le Comtat appartint aux papes jusqu\'en 1791.',
      field: F('gueules', { charges: [C('cle', 'or', { rot: -45, scale: 1.25 }), C('cle', 'or', { rot: 45, scale: 1.25, flip: true })] }) },
    { name: 'Limousin', note: 'L\'hermine des ducs de Bretagne, vicomtes de Limoges, à la bordure de gueules.',
      field: F('hermine', { pieces: [P('bordure', 'gueules')] }) },
    { name: 'Berry', note: 'Le duc Jean de Berry, fils de Jean le Bon : France à la bordure engrêlée de gueules.',
      field: franceModerne({ pieces: [P('bordure', 'gueules', { line: 'engrelee' })] }) },
    { name: 'Navarre', note: 'Les chaînes d\'or posées en orle, en croix et en sautoir, centrées d\'une émeraude.',
      field: F('gueules', { charges: [C('chaines-navarre', 'or', { scale: 2.43 }), C('carreau', 'sinople', { scale: 0.2, rot: 45 })] }) },
    { name: 'Provence', note: 'Les comtes de Provence de la maison d\'Anjou : une fleur de lis sous un lambel.',
      field: F('azur', { charges: [C('fleur-de-lis', 'or', { scale: 1, dy: 20 }), C('lambel', 'gueules', { arr: 'chef1', scale: 2.8, dy: 4 })] }) },
    { name: 'Corse', note: 'La tête de Maure au bandeau, emblème de l\'île depuis le XVIIIᵉ siècle.',
      field: F('argent', { charges: [C('tete-maure', 'sable', { scale: 1.3, extras: { crete: 'argent' } })] }) },
    { name: 'Touraine', note: 'France ancien à la bordure componée d\'argent et de gueules.',
      field: F('azur', { charges: [C('fleur-de-lis', 'or', { arr: 'seme' })], pieces: [P('bordure', 'argent', { comp: 'gueules' })] }) },
    { name: 'Champagne', note: 'Les comtes de Champagne : bande d\'argent entre deux cotices potencées d\'or.',
      field: F('azur', { pieces: [P('bande', 'argent'), P('bande', 'or', { th: 0.3, lz: 0.6, line: 'potencee', dx: -23, dy: 20 }), P('bande', 'or', { th: 0.3, lz: 0.6, line: 'potencee', dx: 23, dy: -20 })] }) },
    { name: 'Alsace', note: 'Basse-Alsace (bande bordée de fleurons) parti de Haute-Alsace (bande accostée de six couronnes).',
      field: F('gueules', { part: 'parti', t: ['gueules', 'gueules', null, null], subs: [
        F('gueules', { pieces: [P('bande', 'argent', { line: 'fleurdelisee', th: 0.8 })] }),
        F('gueules', { pieces: [P('bande', 'or', { th: 0.8 })], charges: [C('couronne', 'or', { arr: 'flanc-s', scale: 0.9, dy: -10 }), C('couronne', 'or', { arr: 'flanc-d', scale: 0.9, dy: 10 })] })] }) },
    { name: 'Angoumois', note: 'Le losangé d\'or et de gueules des comtes d\'Angoulême, de la maison de Lusignan.',
      field: F('or', { part: 'losange', t: ['or', 'gueules', null, null] }) },
    { name: 'Paris', note: 'Le navire de la hanse des marchands de l\'eau, au chef de France ancien.',
      field: F('gueules', { charges: [C('navire', 'argent', { dy: 16, scale: 1.05 })],
        pieces: [P('chef', 'azur', { inner: F('azur', { charges: [C('fleur-de-lis', 'or', { arr: 'seme' })] }) })] }) },
    { name: 'Lyon', note: 'Le lion parlant de la ville, au chef de France (cousu : couleur sur couleur).',
      field: (() => { const ch = P('chef', 'azur'); return F('gueules', { pieces: [ch], charges: [C('lion', 'argent', { variant: 'rampant', dy: 14, scale: 0.85 }), C('fleur-de-lis', 'or', { on: ch.id, n: 3 })] }); })() },
    { name: 'Marseille', note: 'La croix d\'azur sur champ d\'argent, portée depuis le XIIIᵉ siècle.',
      field: F('argent', { pieces: [P('croix', 'azur')] }) },
    { name: 'Strasbourg', note: 'Une bande de gueules sur argent, rappel du sang de l\'évêque.',
      field: F('argent', { pieces: [P('bande', 'gueules')] }) },
    { name: 'Lille', note: 'La fleur de lis d\'argent, armes parlantes (l\'Isle, le lis).',
      field: F('gueules', { charges: [C('fleur-de-lis', 'argent', { scale: 1.5 })] }) }
  ];
  let galIdx = 0, galStates = null;
  /* blasons validés une fois les meubles chargés (un meuble absent est simplement omis) */
  const states = () => galStates || (galStates = GALLERY.map(g => H.app.sanitize({ v: 2, shape: 'moderne', field: g.field })));
  function renderGallery() {
    const st = states();
    $('#gal-list').innerHTML = `<h2>Blasons de France</h2><div class="gal-grid">` + GALLERY.map((g, i) =>
      `<button class="gal-card${i === galIdx ? ' on' : ''}" data-gal="${i}" title="${esc(g.name)}">${H.renderArms(st[i])}<span>${esc(g.name)}</span></button>`).join('') + '</div>';
    showGal(galIdx);
  }
  function showGal(i) {
    const st = states();
    galIdx = (i + GALLERY.length) % GALLERY.length;
    const g = GALLERY[galIdx];
    document.querySelectorAll('.gal-card').forEach((b, k) => b.classList.toggle('on', k === galIdx));
    $('#gal-show').innerHTML = `
      <div class="gal-nav"><button class="btn" data-galgo="-1" title="Blason précédent (←)">‹ Précédent</button>
        <span class="gal-count">${galIdx + 1} / ${GALLERY.length}</span>
        <button class="btn" data-galgo="1" title="Blason suivant (→)">Suivant ›</button></div>
      <div class="gal-big">${H.renderArms(st[galIdx], { gloss: true })}</div>
      <h2>${esc(g.name)}</h2>
      <div class="blazon-card"><div class="blazon-label">Blasonnement</div><p class="blazon">${esc(H.blazon(st[galIdx]))}</p></div>
      <p class="gal-note">${esc(g.note)}</p>
      <button class="btn btn-accent" data-galedit="${galIdx}">✎ Créer un blason à partir de celui-ci</button>`;
    const card = document.querySelector('.gal-card.on');
    if (card) card.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- Blasonnement en une phrase ---------- */
  const EXAMPLES = ["D'azur à trois fleurs de lis d'or", "De gueules au lion d'or, armé et lampassé d'azur", "Coupé d'or et de sable, à la fasce ondée de gueules",
    "D'argent à trois pals de gueules", "Écartelé d'or et d'azur", "D'or à la bande de gueules chargée de trois alérions d'argent",
    "Tiercé en fasce de sinople, d'argent et de gueules", "De sable semé d'étoiles d'or, au chef d'hermine"];
  let blzResult = null, blzTimer = 0;
  function runBlazon() {
    const txt = $('#blz-text').value;
    const r = H.parseBlazon(txt);
    blzResult = r.empty ? null : H.app.sanitize(r.state);
    $('#blz-shield').innerHTML = H.renderArms(blzResult || { v: 2, shape: 'moderne', field: H.newField(null) }, { gloss: true });
    $('#blz-read').textContent = blzResult ? H.blazon(blzResult) : '—';
    $('#blz-notes').innerHTML = r.notes.length
      ? `<div class="warn"><strong>À vérifier</strong><ul>${r.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>`
      : blzResult ? '<div class="good">✓ Toute la phrase a été comprise.</div>' : '';
    $('#blz-edit').disabled = !blzResult;
  }

  function init() {
    $('#blz-ex').innerHTML = '<span class="hint">Exemples :</span> ' + EXAMPLES.map(e => `<button class="chip" data-blzex="${esc(e)}">${esc(e)}</button>`).join('');
    $('#blz-text').addEventListener('input', () => { clearTimeout(blzTimer); blzTimer = setTimeout(runBlazon, 200); });
    $('#blz-edit').addEventListener('click', () => { if (blzResult) H.app.open(blzResult); });
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-view],[data-gal],[data-galgo],[data-galedit],[data-blzex]');
      if (!b) return;
      if (b.dataset.view) H.showView(b.dataset.view);
      else if (b.dataset.gal !== undefined) showGal(+b.dataset.gal);
      else if (b.dataset.galgo) showGal(galIdx + +b.dataset.galgo);
      else if (b.dataset.galedit !== undefined) H.app.open(states()[+b.dataset.galedit]);
      else if (b.dataset.blzex) { $('#blz-text').value = b.dataset.blzex; runBlazon(); }
    });
    document.addEventListener('keydown', e => {
      if (document.body.dataset.view !== 'galerie' || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); showGal(galIdx + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); showGal(galIdx - 1); }
    });
    window.addEventListener('hashchange', () => { if (!/^#s=/.test(location.hash)) H.showView(viewFromHash(), true); });
    H.showView(viewFromHash(), true);
  }
  /* après l'éditeur (app.js s'initialise aussi au chargement de la page) */
  window.addEventListener('DOMContentLoaded', () => setTimeout(() => {
    try { init(); } catch (err) { document.body.insertAdjacentHTML('afterbegin', '<pre style="color:#a00;padding:12px;white-space:pre-wrap">' + err.stack + '</pre>'); }
  }, 0));
})(window.H);
