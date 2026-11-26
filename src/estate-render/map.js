// The estate map (world.md section 12, E2): a field-notebook map of the 1 km² estate, drawn from the same data as
// the 3D: land cover in muted ink on paper, contours, brooks, the pond, roads, charcoal platforms, the compartment
// grid and place names. A minimap in the corner shows where the camera is; the full map (M) shows compartment
// details on hover; a click on either flies the camera there. DOM and canvas only, no three.js.
import E from '../data/estate.json' with { type: 'json' };
import { generateEstate, coverAt, height, COVERS, compOf, compName } from '../estate/index.js';
import { BESPOKE } from '../estate/tile-plan.js';

const INK = { ancient: '#6f8f4e', mixedSouth: '#7f9a5a', spruce1962: '#4a6a58', spruce1985: '#587a62', calamity: '#c2b27a', snags: '#b4aa92', ravine: '#6a9478', coppice: '#94a85a', crag: '#b8ae98', alderCarr: '#6a9488', pond: '#6a98b0', meadow: '#c8d08a', orchard: '#a8bc72', farmstead: '#d2bc92', quarry: '#cabfa4', plot01: '#e07a3a' };
const PAPER = '#efe7d2', H = E.size / 2, N = 250, CELL = E.size / N;
const PLACES = [['Crags', -330, -400], ['Ravine', -228, -250], ['Oak coppice', -356, 118], ['Calamity clearing', 318, -292], ['Old orchard', -305, 300], ['Alder carr', 175, 205], ['Spruce plantations', 160, -110], ['Ancient wood', -140, -110]];
const FLAGS = [['Plot 01', ...E.plot.origin], ['Field station', ...E.units.farmstead.buildings], ['Beaver pond', ...E.pond.centre], ['Old quarry', ...E.units.quarry.centre]];

// draw the static map into a canvas of size px (square); returns the canvas
function drawMap(px, { labels = true } = {}) {
  const cv = document.createElement('canvas'); cv.width = cv.height = px;
  const g = cv.getContext('2d'), S = px / E.size, X = (x) => (x + H) * S, Z = (z) => (z + H) * S;
  const est = generateEstate();
  // cover and hillshade on a 4 m grid, scaled up crisply
  const grid = document.createElement('canvas'); grid.width = grid.height = N;
  const gg = grid.getContext('2d'), img = gg.createImageData(N, N), hs = new Float32Array((N + 1) * (N + 1));
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) hs[j * (N + 1) + i] = height(-H + i * CELL, -H + j * CELL);
  const hAt = (i, j) => hs[Math.min(N, j) * (N + 1) + Math.min(N, i)], rgb = (c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)), paper = rgb(PAPER);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const c = rgb(INK[coverAt(-H + (i + 0.5) * CELL, -H + (j + 0.5) * CELL)] || '#999999');
    const shade = Math.max(0.78, Math.min(1.12, 1 + (-(hAt(i + 1, j) - hAt(i, j)) - (hAt(i, j + 1) - hAt(i, j))) * 0.12));
    const contour = Math.floor(hAt(i, j) / 5) !== Math.floor(hAt(i + 1, j) / 5) || Math.floor(hAt(i, j) / 5) !== Math.floor(hAt(i, j + 1) / 5);
    const major = contour && (Math.floor(hAt(i, j) / 25) !== Math.floor(hAt(i + 1, j) / 25) || Math.floor(hAt(i, j) / 25) !== Math.floor(hAt(i, j + 1) / 25));
    const k = (j * N + i) * 4;
    for (let q = 0; q < 3; q++) { let v = (c[q] * 0.7 + paper[q] * 0.3) * shade; if (contour) v *= major ? 0.72 : 0.86; img.data[k + q] = v; }
    img.data[k + 3] = 255;
  }
  gg.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = false; g.drawImage(grid, 0, 0, px, px);
  // roads, brooks, pond
  g.lineCap = g.lineJoin = 'round';
  const line = (pts) => { g.beginPath(); pts.forEach(([x, z], k) => (k ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)))); g.stroke(); };
  for (const r of Object.values(E.roads).filter(Array.isArray)) { g.strokeStyle = '#7a6a4a'; g.lineWidth = Math.max(2, 5 * S); line(r); g.strokeStyle = '#f2e8cc'; g.lineWidth = Math.max(1, 3 * S); line(r); }
  for (const b of Object.values(E.brooks).filter((b) => b.points)) { g.strokeStyle = '#3a6a8a'; g.lineWidth = Math.max(1.2, b.halfWidth * 2.2 * S); line(b.points); }
  { const p = E.pond; g.save(); g.translate(X(p.centre[0]), Z(p.centre[1])); g.rotate(p.yaw); g.fillStyle = '#7aa6be'; g.strokeStyle = '#3a6a8a'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, 0, p.rx * S, p.rz * S, 0, 0, 7); g.fill(); g.stroke(); g.restore(); }
  // charcoal platforms
  g.fillStyle = '#2a241c'; for (const [x, z] of est.charcoal) { g.beginPath(); g.arc(X(x), Z(z), Math.max(1.5, 4 * S), 0, 7); g.fill(); }
  // compartment grid
  g.strokeStyle = 'rgba(60,45,30,0.55)'; g.lineWidth = 1; g.setLineDash([4, 3]);
  for (let k = 0; k <= 8; k++) { const v = k * E.compartment * S; g.beginPath(); g.moveTo(v, 0); g.lineTo(v, px); g.moveTo(0, v); g.lineTo(px, v); g.stroke(); }
  g.setLineDash([]);
  if (labels) {
    g.fillStyle = 'rgba(50,38,26,0.8)'; g.font = `${Math.round(px / 70)}px -apple-system, "SF Pro Text", Inter, system-ui, sans-serif`;
    for (const c of est.compartments) g.fillText(c.id, X(c.x - E.compartment / 2) + 4, Z(c.z - E.compartment / 2) + px / 60);
    g.font = `italic ${Math.round(px / 62)}px -apple-system, "SF Pro Text", Inter, system-ui, sans-serif`; g.fillStyle = 'rgba(40,30,20,0.85)'; g.textAlign = 'center';
    for (const [name, x, z] of PLACES) g.fillText(name, X(x), Z(z));
    g.textAlign = 'left';
  }
  // places still waiting for their hand-made templates: an orange flag
  for (const [name, x, z] of FLAGS) {
    g.strokeStyle = '#3a2a1a'; g.lineWidth = Math.max(1, px / 500); g.beginPath(); g.moveTo(X(x), Z(z)); g.lineTo(X(x), Z(z) - px / 45); g.stroke();
    g.fillStyle = '#ff6a1a'; g.beginPath(); g.moveTo(X(x), Z(z) - px / 45); g.lineTo(X(x) + px / 70, Z(z) - px / 55); g.lineTo(X(x), Z(z) - px / 70); g.fill();
    if (labels) { g.fillStyle = '#7a3a10'; g.font = `bold ${Math.round(px / 66)}px -apple-system, "SF Pro Text", Inter, system-ui, sans-serif`; g.fillText(name, X(x) + px / 60, Z(z) - px / 70); }
  }
  return cv;
}

// view: () => ({ x, z, dx, dz, w, d }) the camera target, the direction it looks along the ground, and the view's
// ground footprint (width across, depth along); onJump(x, z)
export function createEstateMap({ view, onJump }) {
  const css = `
  .mini{position:fixed;top:calc(16px + env(safe-area-inset-top,0px));right:16px;width:168px;height:168px;border-radius:22px;overflow:hidden;cursor:pointer;background:${PAPER};border:.5px solid rgba(255,255,255,.22);box-shadow:0 18px 50px rgba(0,0,0,.28),0 2px 8px rgba(0,0,0,.18);transition:transform .15s}
  .mini:hover{transform:scale(1.02)}.mini:active{transform:scale(.98)}
  .mini canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:auto}
  .mini .north{position:absolute;top:8px;left:8px;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:rgba(24,28,26,.62);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#f7f6f2;font:600 11px var(--font)}
  .mapfull{position:fixed;inset:0;display:flex;z-index:8;align-items:center;justify-content:center;gap:16px;padding:24px;background:rgba(10,14,12,.38);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);opacity:0;pointer-events:none;transition:opacity .2s}
  .mapfull.open{opacity:1;pointer-events:auto}
  .mapfull .sheet{position:relative;height:min(88vh,calc(92vw - 320px));aspect-ratio:1;max-width:92vw;border-radius:26px;overflow:hidden;background:${PAPER};border:.5px solid rgba(255,255,255,.22);box-shadow:0 30px 80px rgba(0,0,0,.4);cursor:crosshair;transform:scale(.98);transition:transform .25s cubic-bezier(.2,.8,.2,1)}
  .mapfull.open .sheet{transform:none}
  .mapfull .sheet canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:auto}
  .mapfull .info{width:300px;max-width:90vw;align-self:center;max-height:88vh;overflow:auto;padding:18px 20px;border-radius:22px;background:rgba(26,30,28,.78);-webkit-backdrop-filter:saturate(170%) blur(22px);backdrop-filter:saturate(170%) blur(22px);border:.5px solid rgba(255,255,255,.14);box-shadow:0 18px 50px rgba(0,0,0,.28);color:#f7f6f2;font:400 14px/1.45 var(--font)}
  .mapfull .info .eyebrow{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:rgba(247,246,242,.42)}
  .mapfull .info h2{margin:2px 0 2px;font-size:22px;font-weight:650;letter-spacing:-.02em}
  .mapfull .info .muted{color:rgba(247,246,242,.62);font-size:13px}
  .mapfull .info .stats{display:flex;gap:18px;margin:12px 0 14px}.mapfull .info .stats b{display:block;font-size:20px;font-weight:600;font-variant-numeric:tabular-nums}.mapfull .info .stats span{font-size:12px;color:rgba(247,246,242,.55)}
  .mapfull .info .bar{display:flex;height:8px;border-radius:999px;overflow:hidden;margin:4px 0 10px;background:rgba(255,255,255,.08)}.mapfull .info .bar i{display:block;height:100%}
  .mapfull .info ul{list-style:none;margin:0 0 12px;padding:0}.mapfull .info li{display:flex;align-items:center;gap:8px;padding:3px 0;font-size:13px}.mapfull .info li i{width:10px;height:10px;border-radius:3px;flex:none}.mapfull .info li em{margin-left:auto;font-style:normal;color:rgba(247,246,242,.55);font-variant-numeric:tabular-nums}
  .mapfull .info p{margin:0 0 10px}
  .mapfull .close{position:absolute;top:14px;right:14px;display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:50%;background:rgba(24,28,26,.62);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#f7f6f2;cursor:pointer}
  .mapfull .close svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}
  @media (max-width:760px){.mini{width:116px;height:116px;border-radius:18px}.mapfull{flex-direction:column;padding:12px}.mapfull .sheet{height:auto;width:94vw}.mapfull .info{width:94vw;max-height:32vh}}`;
  document.head.append(Object.assign(document.createElement('style'), { textContent: css }));
  const mini = document.createElement('div'); mini.className = 'mini'; mini.title = 'Tap to go there · M opens the map'; mini.innerHTML = '<span class="north">N</span>';
  const full = document.createElement('div'); full.className = 'mapfull'; full.setAttribute('role', 'dialog'); full.setAttribute('aria-label', 'Estate map');
  full.innerHTML = '<div class="sheet"></div><div class="info"><div class="eyebrow">Estate map</div><h2>1 × 1 km</h2><p class="muted">Hover a compartment to read it. Click anywhere to go there. M or Esc closes.</p></div>';
  const sheet = full.querySelector('.sheet'), info = full.querySelector('.info'), closeBtn = Object.assign(document.createElement('button'), { className: 'close', innerHTML: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>' }); closeBtn.setAttribute('aria-label', 'Close map');
  sheet.append(closeBtn);
  document.body.append(mini, full);
  const miniOver = document.createElement('canvas'), fullOver = document.createElement('canvas');
  miniOver.width = miniOver.height = 400; fullOver.width = fullOver.height = 1000;
  let ready = false;

  // draw the maps once the 3D is up (they take a moment to compute)
  setTimeout(() => { mini.prepend(drawMap(400, { labels: false })); mini.insertBefore(miniOver, mini.querySelector('.north')); sheet.prepend(drawMap(1000)); sheet.append(fullOver); ready = true; }, 50);

  const toWorld = (el, e) => { const r = el.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * E.size - H, (e.clientY - r.top) / r.height * E.size - H]; };
  mini.addEventListener('click', (e) => onJump(...toWorld(mini, e)));
  sheet.addEventListener('click', (e) => { if (e.target === closeBtn) return; onJump(...toWorld(sheet, e)); close(); });
  closeBtn.addEventListener('click', () => close());
  sheet.addEventListener('mousemove', (e) => showInfo(...toWorld(sheet, e)));
  addEventListener('keydown', (e) => { if (e.key === 'm' || e.key === 'M') toggle(); else if (e.key === 'Escape') close(); });

  function showInfo(x, z) {
    const est = generateEstate(), [ci, cj] = compOf(x, z), c = est.compartments.find((q) => q.i === ci && q.j === cj); if (!c) return;
    const here = coverAt(x, z), shares = Object.entries(c.share).sort((a, b) => b[1] - a[1]);
    info.innerHTML = `<div class="eyebrow">Compartment</div><h2>${c.id} · ${COVERS[c.dominant].name}</h2>
      <div class="stats"><div><b>${c.areaHa.toFixed(2)}</b><span>hectares</span></div><div><b>${c.stems.toLocaleString()}</b><span>trees ≥ 7 cm</span></div></div>
      <div class="bar">${shares.map(([k, v]) => `<i style="width:${v * 100}%;background:${INK[k]}"></i>`).join('')}</div>
      <ul>${shares.slice(0, 4).map(([k, v]) => `<li><i style="background:${INK[k]}"></i>${COVERS[k].name}<em>${Math.round(v * 100)}%</em></li>`).join('')}</ul>
      <p>${COVERS[c.dominant].history.replace(/^./, (q) => q.toUpperCase())}.</p>
      <p class="muted">Under the cursor: ${COVERS[here].name}${BESPOKE[here] ? ` — flagged: ${BESPOKE[here]} gets its own hand-made version later` : ''}.</p>`;
  }

  // the camera marker: a dot, the facing, and the ground footprint of the view
  function drawMarker(cv) {
    const g = cv.getContext('2d'), s = cv.width / E.size, v = view(); g.clearRect(0, 0, cv.width, cv.height);
    const X = (v.x + H) * s, Z = (v.z + H) * s;
    g.save(); g.translate(X, Z); g.rotate(Math.atan2(v.dx, -v.dz));   // the footprint's far edge points the way the camera looks
    g.strokeStyle = '#ff6a1a'; g.lineWidth = Math.max(2, cv.width / 250); g.strokeRect(-v.w / 2 * s, -v.d / 2 * s, v.w * s, v.d * s);
    g.fillStyle = '#ff6a1a'; g.beginPath(); g.moveTo(0, -v.d / 2 * s - cv.width / 60); g.lineTo(-cv.width / 90, -v.d / 2 * s); g.lineTo(cv.width / 90, -v.d / 2 * s); g.fill();
    g.restore();
  }
  function update() { if (!ready) return; drawMarker(miniOver); if (full.classList.contains('open')) drawMarker(fullOver); }
  function open() { full.classList.add('open'); update(); }
  function close() { full.classList.remove('open'); }
  function toggle() { if (full.classList.contains('open')) close(); else open(); }
  return { update, open, close, toggle };
}
