// The estate map (world.md section 12, E2): a field-notebook map of the 1 km² estate, drawn from the same data as
// the 3D: land cover in muted ink on paper, contours, brooks, the pond, roads, charcoal platforms, the compartment
// grid and place names. A minimap in the corner shows where the camera is; the full map (M) shows compartment
// details on hover; a click on either flies the camera there. DOM and canvas only, no three.js.
import E from '../data/estate.json' with { type: 'json' };
import { generateEstate, coverAt, height, COVERS, compOf, compName } from '../estate/index.js';
import { BESPOKE } from '../estate/tile-plan.js';
import { BROOKS, pondW, POND } from '../estate/terrain.js';
import { COVER_IDS } from '../estate/index.js';

// Map palette: soft natural tints (a hand-coloured survey map), laid over warm paper
// distinct, readable tints per stand type (broadleaf greens, conifer blue-greens, open ground in warm yellows and buffs)
const INK = { ancient: '#6f9a4a', mixedSouth: '#93ad5a', spruce1962: '#3f6e5e', spruce1985: '#5a8a74', calamity: '#d9b866', snags: '#b8a98c', ravine: '#4f9a86', coppice: '#a8b84e', crag: '#c8b89a', alderCarr: '#6aa8a0', pond: '#6fb0d4', meadow: '#dfe08a', orchard: '#c2d27a', farmstead: '#e6c890', quarry: '#d8c8a8', plot01: '#e08a4a' };
const CROWN = { spruce: '#2f4a3c', pine: '#3e5a3a', beech: '#4a6a34', oak: '#55703a', holly: '#2c4426', hornbeam: '#5a7a3a', sycamore: '#4e7034', ash: '#62803e', lime: '#557636', alder: '#3e5e42', birch: '#8a9a62', rowan: '#6a8a3e', goatWillow: '#7a8a52', apple: '#6e8e3e', pear: '#62803a' };
const PAPER = '#efe6cf', INKLINE = '#4a3f30', H = E.size / 2, N = 250, CELL = E.size / N;
const SERIF = 'ui-serif, "New York", Georgia, "Iowan Old Style", serif', SANS = '-apple-system, "SF Pro Text", Inter, system-ui, sans-serif';
const PLACES = [['Crags', -330, -410, 1], ['Ravine', -214, -250, 1], ['Oak coppice', -356, 118, 1], ['Calamity clearing', 318, -292, 1.1], ['Old orchard', -305, 288, 1], ['Alder carr', 175, 212, 0.9], ['Spruce plantations', 170, -110, 1.1], ['Ancient wood', -140, -110, 1.2], ['Hay meadows', -170, 420, 1]];
const FLAGS = [['Plot 01', ...E.plot.origin], ['Field station', ...E.units.farmstead.buildings], ['Beaver pond', ...E.pond.centre], ['Old quarry', ...E.units.quarry.centre]];

// grids shared by the minimap and the full map (computed once): heights, cover colours, pond and wet masks
let GRID = null;
function grids() {
  if (GRID) return GRID;
  const hs = new Float32Array((N + 1) * (N + 1)), col = new Float32Array(N * N * 3), pond = new Float32Array((N + 1) * (N + 1));
  const rgb = (c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const x = -H + i * CELL, z = -H + j * CELL; hs[j * (N + 1) + i] = height(x, z); pond[j * (N + 1) + i] = pondW(x, z); }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const c = rgb(INK[coverAt(-H + (i + 0.5) * CELL, -H + (j + 0.5) * CELL)] || '#999999'); col.set(c, (j * N + i) * 3); }
  // indicator field per cover type on the corner grid (1 inside), for tracing stand outlines
  const ids = new Int8Array((N + 1) * (N + 1)); for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) ids[j * (N + 1) + i] = COVER_IDS.indexOf(coverAt(-H + i * CELL, -H + j * CELL));
  const ind = []; for (const id of COVER_IDS) { if (id === 'plot01' || id === 'pond') continue; const k = COVER_IDS.indexOf(id), f = new Float32Array(ids.length); let any = false; for (let q = 0; q < ids.length; q++) if (ids[q] === k) { f[q] = 1; any = true; } if (any) ind.push([id, f]); }
  GRID = { hs, col, pond, ind };
  return GRID;
}

// marching squares: line segments where a grid field crosses `level`; returns polylines (joined, then smoothed)
function isolines(field, n, level) {
  const segs = [], at = (i, j) => field[j * (n + 1) + i], lerp = (a, b) => (level - a) / (b - a);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1), k = (a > level) | ((b > level) << 1) | ((c > level) << 2) | ((d > level) << 3);
    if (k === 0 || k === 15) continue;
    const e = { t: [i + lerp(a, b), j], r: [i + 1, j + lerp(b, c)], b: [i + lerp(d, c), j + 1], l: [i, j + lerp(a, d)] };
    const T = { 1: ['l', 't'], 2: ['t', 'r'], 3: ['l', 'r'], 4: ['r', 'b'], 5: ['l', 't', 'r', 'b'], 6: ['t', 'b'], 7: ['l', 'b'], 8: ['b', 'l'], 9: ['b', 't'], 10: ['t', 'r', 'b', 'l'], 11: ['b', 'r'], 12: ['r', 'l'], 13: ['r', 't'], 14: ['t', 'l'] }[k];
    for (let q = 0; q < T.length; q += 2) segs.push([e[T[q]], e[T[q + 1]]]);
  }
  // join segments into polylines by matching endpoints
  const key = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`, ends = new Map();
  segs.forEach((sg, k) => { for (const p of sg) { const kk = key(p); if (!ends.has(kk)) ends.set(kk, []); ends.get(kk).push(k); } });
  const used = new Uint8Array(segs.length), lines = [];
  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue; used[k] = 1; const line = [segs[k][0], segs[k][1]];
    for (const dir of [1, 0]) for (;;) {
      const tip = dir ? line[line.length - 1] : line[0], next = (ends.get(key(tip)) || []).find((q) => !used[q]); if (next == null) break;
      used[next] = 1; const sg = segs[next], p = key(sg[0]) === key(tip) ? sg[1] : sg[0]; if (dir) line.push(p); else line.unshift(p);
    }
    lines.push(line);
  }
  return lines;
}
// a smooth path through points (midpoint quadratic curves): no corners
function smoothPath(g, pts, f, closed = false) {
  if (pts.length < 2) return;
  const P = pts.map(f); g.moveTo(...(closed ? mid(P[P.length - 1], P[0]) : P[0]));
  for (let k = closed ? 0 : 1; k < P.length - (closed ? 0 : 1); k++) { const a = P[k], b = P[(k + 1) % P.length]; g.quadraticCurveTo(a[0], a[1], ...mid(a, b)); }
  if (!closed) g.lineTo(...P[P.length - 1]); else g.closePath();
}
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const shadeHex = (h, k) => '#' + [1, 3, 5].map((q) => Math.round(parseInt(h.slice(q, q + 2), 16) * k).toString(16).padStart(2, '0')).join('');

// draw the map into a canvas of size px (square); returns the canvas
function drawMap(px, { labels = true } = {}) {
  const cv = document.createElement('canvas'); cv.width = cv.height = px;
  const g = cv.getContext('2d'), S = px / E.size, X = (x) => (x + H) * S, Z = (z) => (z + H) * S, est = generateEstate(), G = grids();
  const u = px / 1000, contourLabels = [];   // line weights and type scale with the map size
  // text with a paper halo, so labels read over any colour
  const halo = (text, x, y, font, fill, w = 3) => { g.font = font; g.lineJoin = 'round'; g.strokeStyle = 'rgba(244,238,220,0.85)'; g.lineWidth = w * u; g.strokeText(text, x, y); g.fillStyle = fill; g.fillText(text, x, y); };
  // 1. paper with a faint grain
  g.fillStyle = PAPER; g.fillRect(0, 0, px, px);
  // 2. land cover, hill-shaded, upscaled smoothly and softened so stand edges blend like watercolour
  const tint = document.createElement('canvas'); tint.width = tint.height = N;
  const tg = tint.getContext('2d'), img = tg.createImageData(N, N), hAt = (i, j) => G.hs[Math.min(N, j) * (N + 1) + Math.min(N, i)];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = (j * N + i) * 3, dx = hAt(i + 1, j) - hAt(Math.max(0, i - 1), j), dz = hAt(i, j + 1) - hAt(i, Math.max(0, j - 1));
    const shade = Math.max(0.74, Math.min(1.16, 1 + (-dx - dz) * 0.09)), q = (j * N + i) * 4;   // light from the north-west
    for (let c = 0; c < 3; c++) img.data[q + c] = (G.col[k + c] * 0.92 + 239 * 0.08) * shade;
    img.data[q + 3] = 255;
  }
  tg.putImageData(img, 0, 0);
  g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.filter = `blur(${Math.max(0.6, 0.9 * u)}px)`; g.drawImage(tint, -1 * u, -1 * u, px + 2 * u, px + 2 * u); g.restore();
  // 2b. a fine outline where one stand type meets another, traced from the cover grid and smoothed
  if (px >= 600) { g.save(); g.lineJoin = g.lineCap = 'round'; for (const [id, f] of G.ind) { g.strokeStyle = shadeHex(INK[id] || '#888888', 0.62); g.globalAlpha = 0.8; g.lineWidth = 1.1 * u; for (const line of isolines(f, N, 0.5)) { if (line.length < 5) continue; g.beginPath(); smoothPath(g, line, ([i, j]) => [i * CELL * S, j * CELL * S], line.length > 8 && dist(line[0], line[line.length - 1]) < 1.5); g.stroke(); } } g.restore(); }
  // 3. tree crowns as soft stipple: the texture of the forest itself, from the estate's tree records
  if (px >= 600) {
    g.save();
    for (const t of est.trees) {
      if (t.status === 'snag') { g.fillStyle = 'rgba(235,228,210,0.85)'; g.fillRect(X(t.x) - 0.6 * u, Z(t.z) - 0.6 * u, 1.2 * u, 1.2 * u); continue; }
      const r = Math.max(0.7, Math.min(3.4, (t.kind === 'spruce' || t.kind === 'pine' ? 0.6 + t.dbh * 0.03 : 1 + t.dbh * 0.05))) * S * 0.9;
      g.globalAlpha = 0.2; g.fillStyle = CROWN[t.kind] || '#4a6a34'; g.beginPath(); g.arc(X(t.x), Z(t.z), r, 0, 6.283); g.fill();
    }
    g.restore();
  } else {   // minimap: a light grain instead of 38k crowns
    g.save(); g.globalAlpha = 0.18; for (let k = 0; k < 2600; k++) { const t = est.trees[(k * 7919) % est.trees.length]; g.fillStyle = CROWN[t.kind] || '#4a6a34'; g.fillRect(X(t.x), Z(t.z), 1.2, 1.2); } g.restore();
  }
  // 4. contours: smooth lines every 5 m, a firmer line every 25 m
  g.save(); g.lineJoin = g.lineCap = 'round';
  let lo = Infinity, hi = -Infinity; for (const v of G.hs) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  for (let lv = Math.ceil(lo / 5) * 5; lv < hi; lv += 5) {
    const major = lv % 25 === 0; g.strokeStyle = major ? 'rgba(96,62,30,0.72)' : 'rgba(96,62,30,0.36)'; g.lineWidth = (major ? 1.7 : 0.85) * u * (px < 600 ? 1.15 : 1);
    for (const line of isolines(G.hs, N, lv)) {
      if (line.length < 4) continue; const f = ([i, j]) => [i * CELL * S, j * CELL * S];
      g.beginPath(); smoothPath(g, line, f); g.stroke();
      if (major && labels && line.length > 60) contourLabels.push({ lv, at: f(line[Math.floor(line.length * 0.37)]), next: f(line[Math.floor(line.length * 0.37) + 2]) });
    }
  }
  g.restore();
  // 5. water: the pond's real shoreline (traced from the terrain), brooks as smooth tapering curves
  g.save(); g.lineJoin = g.lineCap = 'round';
  for (const line of isolines(G.pond, N, 0.5)) { if (line.length < 6) continue; const f = ([i, j]) => [i * CELL * S, j * CELL * S];
    g.beginPath(); smoothPath(g, line, f, true); g.fillStyle = '#86b6cc'; g.fill(); g.strokeStyle = 'rgba(52,96,124,0.7)'; g.lineWidth = 1.2 * u; g.stroke();
    g.beginPath(); smoothPath(g, line, f, true); g.save(); g.clip(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3 * u; g.stroke(); g.restore(); }
  for (const b of Object.values(BROOKS)) {
    const n = Math.max(2, Math.round(b.line.length / 6)), pts = Array.from({ length: n + 1 }, (_, k) => b.line.at((k / n) * b.line.length));
    for (const [w, c] of [[b.halfWidth * 2.6 + 2.2, 'rgba(255,250,236,0.55)'], [b.halfWidth * 2.2 + 0.6, '#4e88a8']]) {
      g.strokeStyle = c; g.lineWidth = Math.max(1, w * S * (px < 600 ? 1.6 : 1)); g.beginPath(); smoothPath(g, pts, ([x, z]) => [X(x), Z(z)]); g.stroke();
    }
  }
  g.restore();
  // 6. roads: a soft cased line, curving smoothly
  g.save(); g.lineJoin = g.lineCap = 'round';
  for (const r of Object.values(E.roads).filter(Array.isArray)) for (const [w, c] of [[5.6, 'rgba(110,88,58,0.75)'], [3.6, '#f6eed8']]) { g.strokeStyle = c; g.lineWidth = Math.max(1, w * S * (px < 600 ? 1.5 : 1)); g.beginPath(); smoothPath(g, r, ([x, z]) => [X(x), Z(z)]); g.stroke(); }
  g.restore();
  // 7. charcoal platforms: small dark rings, as on a survey sheet
  g.save(); g.strokeStyle = 'rgba(40,32,24,0.75)'; g.fillStyle = 'rgba(40,32,24,0.35)'; g.lineWidth = 1 * u;
  for (const [x, z] of est.charcoal) { g.beginPath(); g.arc(X(x), Z(z), Math.max(1.4, 4.5 * S), 0, 6.283); g.fill(); g.stroke(); }
  g.restore();
  // 7b. labels along the land: index-contour heights (rotated with the line), spot heights, brook and road names
  if (labels) {
    g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const { lv, at, next } of contourLabels) { let a = Math.atan2(next[1] - at[1], next[0] - at[0]); if (a > Math.PI / 2 || a < -Math.PI / 2) a += Math.PI;
      g.save(); g.translate(at[0], at[1]); g.rotate(a); g.font = `600 ${Math.round(10 * u)}px ${SANS}`; g.fillStyle = PAPER; g.fillRect(-15 * u, -6 * u, 30 * u, 12 * u); g.fillStyle = 'rgba(96,62,30,0.95)'; g.fillText(`${lv}`, 0, 0.5 * u); g.restore(); }
    let top = { h: -Infinity }; for (let j = 0; j <= N; j += 2) for (let i = 0; i <= N; i += 2) { const h = G.hs[j * (N + 1) + i]; if (h > top.h) top = { h, i, j }; }
    const spot = (x, y, text) => { g.fillStyle = INKLINE; g.beginPath(); g.moveTo(x, y - 4 * u); g.lineTo(x + 3.6 * u, y + 2.6 * u); g.lineTo(x - 3.6 * u, y + 2.6 * u); g.closePath(); g.fill(); halo(text, x + 26 * u, y, `600 ${Math.round(11 * u)}px ${SANS}`, INKLINE, 3); };
    spot(top.i * CELL * S, top.j * CELL * S, `${Math.round(top.h)} m`);
    { const [px0, pz0] = E.pond.centre; spot(X(px0) - 24 * u, Z(pz0) + 26 * u, `${Math.round(POND.level)} m`); }
    const along = (pts, text, frac, size, fill) => { const n = pts.length, k = Math.min(n - 2, Math.max(0, Math.floor(n * frac))), a0 = pts[k], a1 = pts[k + 1]; let a = Math.atan2(Z(a1[1]) - Z(a0[1]), X(a1[0]) - X(a0[0])); if (a > Math.PI / 2 || a < -Math.PI / 2) a += Math.PI;
      g.save(); g.translate(X(a0[0]), Z(a0[1])); g.rotate(a); halo(text, 0, -9 * u, `italic 500 ${Math.round(size * u)}px ${SERIF}`, fill, 3.2); g.restore(); };
    along(E.brooks.main.points, 'Mühlbach', 0.28, 14, '#2e6a8e'); along(E.brooks.gorge.points, 'Klingenbach', 0.4, 12, '#2e6a8e'); along(E.brooks.eastSpring.points, 'Quellbach', 0.35, 12, '#2e6a8e');
    along(E.roads.north, 'forest road', 0.52, 11.5, 'rgba(110,84,50,0.95)');
    g.restore();
  }
  // 8. compartment grid: faint dotted lines; labels in small caps
  g.save(); g.strokeStyle = 'rgba(74,63,48,0.28)'; g.lineWidth = 0.8 * u; g.setLineDash([1.5 * u, 4 * u]); g.lineCap = 'round';
  for (let k = 1; k < 8; k++) { const v = k * E.compartment * S; g.beginPath(); g.moveTo(v, 0); g.lineTo(v, px); g.moveTo(0, v); g.lineTo(px, v); g.stroke(); }
  g.restore();
  if (labels) {
    g.textBaseline = 'top'; for (const c of est.compartments) halo(c.id, X(c.x - E.compartment / 2) + 6 * u, Z(c.z - E.compartment / 2) + 6 * u, `600 ${Math.round(11 * u)}px ${SANS}`, 'rgba(74,63,48,0.62)', 2.4);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [name, x, z, k] of PLACES) halo(name, X(x), Z(z), `italic ${Math.round(17 * k * u)}px ${SERIF}`, 'rgba(56,44,30,0.88)', 4);
    g.textAlign = 'left';
  }
  // 9. places still to be hand-made: a small pennant
  for (const [name, x, z] of FLAGS) {
    const fx = X(x), fz = Z(z), h = 16 * u * (px < 600 ? 1.6 : 1);
    g.strokeStyle = INKLINE; g.lineWidth = 1.3 * u; g.beginPath(); g.moveTo(fx, fz); g.lineTo(fx, fz - h); g.stroke();
    g.fillStyle = '#e8743c'; g.beginPath(); g.moveTo(fx, fz - h); g.quadraticCurveTo(fx + h * 0.5, fz - h * 0.85, fx + h * 0.62, fz - h * 0.7); g.quadraticCurveTo(fx + h * 0.4, fz - h * 0.62, fx, fz - h * 0.52); g.fill();
    g.fillStyle = INKLINE; g.beginPath(); g.arc(fx, fz, 1.8 * u, 0, 6.283); g.fill();
    if (labels) { g.textBaseline = 'middle'; halo(name, fx + h * 0.75, fz - h * 0.72, `600 ${Math.round(13 * u)}px ${SANS}`, '#8a3e14', 3.4); }
  }
  // 10. compass and scale bar (full map only); a soft vignette
  if (labels) {
    const cx = px - 56 * u, cy = px - 60 * u, r = 26 * u;   // bottom right, clear of the close button
    g.save(); g.translate(cx, cy); g.fillStyle = 'rgba(244,238,220,0.82)'; g.beginPath(); g.arc(0, 0, r + 8 * u, 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(74,63,48,0.45)'; g.lineWidth = u; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.stroke();
    g.fillStyle = INKLINE; g.beginPath(); g.moveTo(0, -r + 3 * u); g.lineTo(6 * u, 4 * u); g.lineTo(0, 0); g.lineTo(-6 * u, 4 * u); g.closePath(); g.fill();
    g.fillStyle = 'rgba(74,63,48,0.35)'; g.beginPath(); g.moveTo(0, r - 3 * u); g.lineTo(6 * u, -4 * u); g.lineTo(0, 0); g.lineTo(-6 * u, -4 * u); g.closePath(); g.fill();
    g.font = `700 ${Math.round(11 * u)}px ${SANS}`; g.textAlign = 'center'; g.fillStyle = INKLINE; g.fillText('N', 0, -r - 1 * u); g.restore();
    const bx = 30 * u, by = px - 34 * u, len = 200 * S;
    g.save(); g.fillStyle = 'rgba(244,238,220,0.82)'; g.beginPath(); g.roundRect(bx - 12 * u, by - 22 * u, len + 24 * u, 38 * u, 10 * u); g.fill();
    for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? 'rgba(74,63,48,0.85)' : 'rgba(244,238,220,1)'; g.fillRect(bx + (k * len) / 4, by, len / 4, 5 * u); }
    g.strokeStyle = 'rgba(74,63,48,0.85)'; g.lineWidth = u; g.strokeRect(bx, by, len, 5 * u);
    g.font = `500 ${Math.round(10.5 * u)}px ${SANS}`; g.fillStyle = INKLINE; g.textAlign = 'center'; g.textBaseline = 'bottom';
    for (const [m, v] of [[0, '0'], [100, '100'], [200, '200 m']]) g.fillText(v, bx + m * S, by - 4 * u);
    g.restore();
  }
  const vg = g.createRadialGradient(px / 2, px / 2, px * 0.38, px / 2, px / 2, px * 0.75); vg.addColorStop(0, 'rgba(60,44,24,0)'); vg.addColorStop(1, 'rgba(60,44,24,0.16)');
  g.fillStyle = vg; g.fillRect(0, 0, px, px);
  return cv;
}

function legendHTML() {
  const groups = [['Woodland', ['ancient', 'mixedSouth', 'coppice', 'ravine', 'alderCarr']], ['Conifers', ['spruce1962', 'spruce1985']], ['Open ground', ['calamity', 'snags', 'meadow', 'orchard', 'crag', 'quarry', 'farmstead']]];
  return `<div class="eyebrow">Estate map</div><h2>1 × 1 km · 100 ha</h2><p class="muted">Hover a compartment to read it. Click anywhere to go there. M or Esc closes.</p>` +
    groups.map(([t, ids]) => `<div class="eyebrow" style="margin-top:12px">${t}</div><ul>${ids.map((k) => `<li><i style="background:${INK[k]}"></i>${COVERS[k].name}</li>`).join('')}</ul>`).join('') +
    `<div class="eyebrow" style="margin-top:12px">Symbols</div><ul><li><i style="background:#4e88a8;height:3px;border-radius:2px"></i>Brook</li><li><i style="background:#f6eed8;border:1px solid #6e583a"></i>Forest road</li><li><i style="background:rgba(40,32,24,.5);border-radius:50%;border:1px solid #28201a"></i>Charcoal platform</li><li><i style="background:none;border-top:2px solid rgba(96,62,30,.7)"></i>Contour, 5 m (labelled every 25 m)</li><li><i style="background:#e8743c;border-radius:2px 6px 6px 2px"></i>To be hand-made</li></ul>`;
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
  full.innerHTML = `<div class="sheet"></div><div class="info">${legendHTML()}</div>`;
  const sheet = full.querySelector('.sheet'), info = full.querySelector('.info'), closeBtn = Object.assign(document.createElement('button'), { className: 'close', innerHTML: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>' }); closeBtn.setAttribute('aria-label', 'Close map');
  sheet.append(closeBtn);
  document.body.append(mini, full);
  const miniOver = document.createElement('canvas'), fullOver = document.createElement('canvas');
  miniOver.width = miniOver.height = 400; fullOver.width = fullOver.height = 1600;
  let ready = false;

  // draw the maps once the 3D is up (they take a moment to compute); the minimap first, the full map a moment later
  setTimeout(() => { mini.prepend(drawMap(400, { labels: false })); mini.insertBefore(miniOver, mini.querySelector('.north')); ready = true;
    setTimeout(() => { sheet.prepend(drawMap(1600)); sheet.append(fullOver); }, 400); }, 50);

  const toWorld = (el, e) => { const r = el.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * E.size - H, (e.clientY - r.top) / r.height * E.size - H]; };
  mini.addEventListener('click', (e) => onJump(...toWorld(mini, e)));
  sheet.addEventListener('click', (e) => { if (e.target === closeBtn) return; onJump(...toWorld(sheet, e)); close(); });
  closeBtn.addEventListener('click', () => close());
  let hover = null;   // the compartment under the pointer, outlined on the full map
  sheet.addEventListener('mousemove', (e) => { const [x, z] = toWorld(sheet, e); hover = compOf(x, z); showInfo(x, z); update(); });
  sheet.addEventListener('mouseleave', () => { hover = null; info.innerHTML = legendHTML(); update(); });
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
  // where you are: a soft view cone in the direction the camera looks, the view's footprint as a rounded glow, a dot
  function drawMarker(cv) {
    const g = cv.getContext('2d'), s = cv.width / E.size, v = view(), u = cv.width / 1000; g.clearRect(0, 0, cv.width, cv.height);
    if (cv === fullOver && hover) { const C2 = E.compartment * s, inset = 3 * u; g.fillStyle = 'rgba(255,248,225,0.22)'; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2.4 * u; g.beginPath(); g.roundRect(hover[0] * C2 + inset, hover[1] * C2 + inset, C2 - 2 * inset, C2 - 2 * inset, 14 * u); g.fill(); g.stroke(); }
    const X = (v.x + H) * s, Z = (v.z + H) * s, w = v.w * s, d = v.d * s;
    g.save(); g.translate(X, Z); g.rotate(Math.atan2(v.dx, -v.dz));
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.6 * u;
    g.beginPath(); g.roundRect(-w / 2, -d / 2, w, d, Math.min(w, d) * 0.22); g.fill(); g.stroke();
    const cone = g.createLinearGradient(0, 0, 0, -d / 2 - 14 * u); cone.addColorStop(0, 'rgba(10,132,255,0.5)'); cone.addColorStop(1, 'rgba(10,132,255,0)');
    g.fillStyle = cone; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, d / 2 + 14 * u, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); g.closePath(); g.fill();
    g.restore();
    const r = Math.max(4.5, 7 * u);
    g.fillStyle = 'rgba(10,132,255,0.22)'; g.beginPath(); g.arc(X, Z, r * 2.1, 0, 6.283); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(X, Z, r + 1.6 * u, 0, 6.283); g.fill();
    g.fillStyle = '#0a84ff'; g.beginPath(); g.arc(X, Z, r, 0, 6.283); g.fill();
  }
  function update() { if (!ready) return; drawMarker(miniOver); if (full.classList.contains('open') && fullOver.parentNode) drawMarker(fullOver); }
  function open() { full.classList.add('open'); update(); }
  function close() { full.classList.remove('open'); }
  function toggle() { if (full.classList.contains('open')) close(); else open(); }
  return { update, open, close, toggle };
}
