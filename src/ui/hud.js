// The heads-up interface: place card, dock of icon buttons with popover menus, loading pill and hint toast.
// Styles live in public/index.html; icons are drawn here as simple line icons (24 x 24 grid).
const ICONS = {
  map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z"/><path d="M9 4v14M15 6v14"/>',
  follow: '<circle cx="12" cy="13.5" r="3.2"/><circle cx="6.2" cy="9" r="1.8"/><circle cx="9.6" cy="5.4" r="1.8"/><circle cx="14.4" cy="5.4" r="1.8"/><circle cx="17.8" cy="9" r="1.8"/>',
  pin: '<path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0c0 5.4 6.5 11 6.5 11Z"/><circle cx="12" cy="10" r="2.4"/>',
  tree: '<path d="M12 3 6.5 10h3L6 15h12l-3.5-5h3L12 3Z"/><path d="M12 15v6"/>',
  rotL: '<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/>',
  rotR: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/>',
  home: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  deer: '<path d="M8 4 9.5 7M16 4l-1.5 3M7 3l1 1.5M17 3l-1 1.5"/><path d="M9.5 7c0 2 1 3 2.5 3s2.5-1 2.5-3"/><path d="M10 10l-1 5 2 5h2l2-5-1-5"/>',
  boar: '<path d="M4 13c0-3.5 3-6 7-6h3c3 0 5.5 2 6 5l-1.5 1H17l-1 4h-2l-.5-3h-4l-.5 3H7l-1-4H4.5"/><circle cx="16.5" cy="10.5" r=".6"/>',
  badger: '<path d="M3.5 14c1.5-4 5-6 9-6 4.5 0 7 2.5 8 6"/><path d="M3.5 14h17M9 9.2 11 14M15 9.2 13 14"/>',
  fox: '<path d="M5 5l3.5 4h7L19 5l-1 7-6 7-6-7-1-7Z"/><path d="M10 13h.01M14 13h.01"/>',
  hare: '<path d="M10 3c-1 2-1 5 0 7M14 3c1 2 1 5 0 7"/><ellipse cx="12" cy="15" rx="5" ry="5"/>',
  squirrel: '<path d="M17 4c3 1 4 5 2 8-1.5 2-3.5 2-4 4"/><path d="M15 16c0 2.5-2 4-4.5 4S6 18.5 6 16s2-5 4.5-5c1.5 0 2.5.6 3 1.5"/>',
  beaver: '<ellipse cx="11" cy="13" rx="6.5" ry="4.5"/><path d="M17 15.5l4 1.5-1 3-4-2"/><path d="M6 10.5 5 9M9 9.2 8.6 7.8"/>',
  buzzard: '<path d="M2 12c3-2 6-2.5 10 0 4-2.5 7-2 10 0"/><path d="M12 12v4l-1.5 2h3L12 16"/>',
  plot: '<rect x="4.5" y="4.5" width="15" height="15" rx="1.5"/><path d="M4.5 4.5h0M19.5 4.5h0M19.5 19.5h0M4.5 19.5h0"/><path d="M8 15l3-4 2 2.5 3-4.5"/>',
  water: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
  rock: '<path d="M3 18l4-8 4 3 3-6 7 11H3Z"/>',
  house: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19 13 11"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
};
export const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.leaf}</svg>`;

export function createHud() {
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const place = el('div', 'place glass', '<div class="row"><span class="chip">—</span></div><h1>Loading the estate…</h1><p></p>');
  const dock = el('div', 'dock glass'); dock.setAttribute('role', 'toolbar'); dock.setAttribute('aria-label', 'Controls');
  const pill = el('div', 'pill glass', '<span class="spin"></span><span>Loading terrain</span>');
  const veil = el('div', 'veil on', '<div class="veil-card glass"><span class="spin"></span><span>Arriving…</span></div>');
  const toast = el('div', 'toast glass', 'Drag to move · pinch or scroll to zoom · two fingers to rotate · <kbd>M</kbd> map');
  document.body.append(veil, place, dock, pill, toast);
  setTimeout(() => toast.classList.add('off'), 7000);

  const button = (name, label, onClick, { toggle = false, pressed = false } = {}) => {
    const b = el('button', 'ib', icon(name) + `<span class="tip">${label}</span>`); b.setAttribute('aria-label', label);
    if (toggle) b.setAttribute('aria-pressed', String(pressed));
    b.addEventListener('click', (e) => { if (toggle) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); onClick(e, b); });
    dock.append(b); return b;
  };
  const sep = () => dock.append(el('span', 'sep'));

  // popover menus anchored above a dock button: sections of { icon, label, sub?, flag?, value }
  let openPop = null;
  const closePop = () => { if (!openPop) return; openPop.pop.classList.remove('open'); openPop.btn.setAttribute('aria-expanded', 'false'); openPop = null; };
  addEventListener('pointerdown', (e) => { if (openPop && !openPop.pop.contains(e.target) && !openPop.btn.contains(e.target)) closePop(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closePop(); });
  function menu(btn, sections, onPick) {
    const pop = el('div', 'pop glass'); pop.setAttribute('role', 'menu'); document.body.append(pop);
    const render = (secs) => { pop.innerHTML = ''; for (const s of secs) { if (s.title) pop.append(el('h3', '', s.title));
      for (const it of s.items) { const b = el('button', 'item', `<span class="ico">${icon(it.icon)}</span><span><span class="lbl">${it.label}</span>${it.sub ? `<span class="sub">${it.sub}</span>` : ''}</span>${it.flag ? `<span class="flag">${it.flag}</span>` : ''}`); b.setAttribute('role', 'menuitem'); b.addEventListener('click', () => { closePop(); onPick(it.value); }); pop.append(b); } } };
    render(sections);
    btn.setAttribute('aria-haspopup', 'menu'); btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => {
      if (openPop?.pop === pop) return closePop();
      closePop(); const r = btn.getBoundingClientRect(), w = Math.min(280, innerWidth - 24);
      pop.style.width = w + 'px'; pop.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + 'px'; pop.style.bottom = (innerHeight - r.top + 10) + 'px';
      pop.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); openPop = { pop, btn }; pop.querySelector('.item')?.focus({ preventScroll: true });
    });
    return { update: render };
  }

  let last = '', veilT = 0;
  return {
    button, sep, menu,
    setPlace({ chip, title, text, flagged }) {
      const key = chip + title + text; if (key === last) return; last = key;
      place.querySelector('.chip').textContent = chip; place.querySelector('h1').textContent = title; place.querySelector('p').textContent = text; place.classList.toggle('flagged', !!flagged);
    },
    setLoading(on) { pill.classList.toggle('on', on); },
    // the veil only appears if a jump is still unfinished after a moment (cached places arrive without it)
    setVeil(on) { if (on) { veilT ||= performance.now(); if (performance.now() - veilT > 90 || veil.classList.contains('on')) veil.classList.add('on'); } else { veilT = 0; veil.classList.remove('on'); } },
  };
}
