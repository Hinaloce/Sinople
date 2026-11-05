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

  /* ---------- Galerie : blasons français connus (données dans galerie.js) ---------- */
  const GALLERY = H.GALLERY;
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
