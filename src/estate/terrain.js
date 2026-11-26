// Estate terrain (world.md section 12): a sandstone ridge in the north-west with a cliff band on its south-east
// face, a brook valley crossing to the south-east, carved side valleys and a gorge, and brook beds that never run
// uphill. Pure: no three.js, no DOM. Heights are metres above sea level.
import { fbm, vnoise, sstep } from '../core/noise.js';
import E from '../data/estate.json' with { type: 'json' };

export const HALF = E.size / 2;

// ---------- polylines ----------
export function polyline(points) {
  const segs = []; let s0 = 0;
  for (let i = 1; i < points.length; i++) { const [x0, z0] = points[i - 1], [x1, z1] = points[i], dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz); segs.push({ x0, z0, dx, dz, len, s0 }); s0 += len; }
  const length = s0;
  // nearest point: distance d, distance along s
  function near(x, z) {
    let d = Infinity, s = 0;
    for (const g of segs) { const t = Math.max(0, Math.min(1, ((x - g.x0) * g.dx + (z - g.z0) * g.dz) / (g.len * g.len))), dd = Math.hypot(x - g.x0 - g.dx * t, z - g.z0 - g.dz * t); if (dd < d) { d = dd; s = g.s0 + t * g.len; } }
    return { d, s };
  }
  function at(s) { const g = segs.find((q) => s <= q.s0 + q.len) || segs[segs.length - 1], t = Math.max(0, Math.min(1, (s - g.s0) / g.len)); return [g.x0 + g.dx * t, g.z0 + g.dz * t]; }
  // cheap rejection box for distance queries
  const xs = points.map((p) => p[0]), zs = points.map((p) => p[1]);
  const box = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
  const farFrom = (x, z, r) => x < box[0] - r || x > box[2] + r || z < box[1] - r || z > box[3] + r;
  return { segs, length, near, at, farFrom };
}

export const BROOKS = Object.fromEntries(Object.entries(E.brooks).filter(([, b]) => b.points).map(([k, b]) => [k, { ...b, line: polyline(b.points) }]));

// ---------- the land before the brooks are cut ----------
const R = E.relief, RG = R.ridge;
const ridgeLine = polyline([RG.from, RG.to]);
// signed side of the ridge line: > 0 on the south-east (valley) side
const ridgeSide = (() => { const [x0, z0] = RG.from, [x1, z1] = RG.to, dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz); return (x, z) => ((x - x0) * -dz + (z - z0) * dx) / l * -1; })();

function landHeight(x, z) {
  let h = R.base + R.tilt * (-x - z);
  // the ridge: a broad rise, steepened into a cliff band on its south-east face
  const { d } = ridgeLine.near(x, z), side = ridgeSide(x, z);
  h += RG.height * Math.exp(-((d / RG.width) ** 2)) * (side < 0 ? 1 : 1 - 0.0);
  h += RG.cliff * sstep(60, 30, side + (vnoise(x * 0.02, z * 0.02) - 0.5) * 30) * sstep(RG.width * 1.6, RG.width * 0.4, d);
  for (const [scale, amp] of R.noise) h += (fbm(x / scale + 11, z / scale + 3) - 0.5) * 2 * amp;
  // valleys carved around every brook (a smooth U, wider and deeper for the main brook)
  for (const b of Object.values(BROOKS)) {
    const v = b.valley; if (b.line.farFrom(x, z, v.width * 2)) continue;
    const { d: bd } = b.line.near(x, z); h -= v.depth * Math.exp(-((bd / v.width) ** 2));
  }
  return h;
}

// ---------- brook beds: the land along each centre line, lowered by the channel depth, never rising downstream ----------
const STEP = 1;
for (const b of Object.values(BROOKS)) {
  const bed = []; let lo = Infinity;
  for (let s = 0; s <= b.line.length + STEP; s += STEP) { const [x, z] = b.line.at(s); lo = Math.min(lo, landHeight(x, z) - b.depth); bed.push(lo); }
  b.bed = bed;
  b.bedAt = (s) => { const i = Math.max(0, Math.min(bed.length - 2, Math.floor(s / STEP))), f = Math.min(1, s / STEP - i); return bed[i] + (bed[i + 1] - bed[i]) * f; };
}

// ---------- the beaver pond: water held at one level behind the dam ----------
const P = E.pond;
export const POND = { ...P, level: null };
export function pondW(x, z) {
  const c = Math.cos(P.yaw), s = Math.sin(P.yaw), dx = x - P.centre[0], dz = z - P.centre[1];
  const u = (dx * c + dz * s) / P.rx, v = (-dx * s + dz * c) / P.rz;
  return sstep(1.05, 0.85, Math.hypot(u, v) + (vnoise(x * 0.05, z * 0.05) - 0.5) * 0.25);
}
{ const m = BROOKS.main; POND.level = m.bedAt(m.line.near(...P.dam).s) + 1.4; }   // the dam holds water about 1.4 m above the bed

// 0..1 how much of a brook channel is cut at (x, z), and the bed height there
function channel(x, z) {
  let best = 0, bedH = 0;
  for (const b of Object.values(BROOKS)) {
    if (b.line.farFrom(x, z, b.halfWidth * 2)) continue;
    const { d, s } = b.line.near(x, z), w = sstep(b.halfWidth, b.halfWidth * 0.25, d);
    if (w > best) { best = w; bedH = b.bedAt(s); }
  }
  return { w: best, bed: bedH };
}

export function height(x, z) {
  let h = landHeight(x, z);
  const c = channel(x, z); if (c.w > 0) h += (Math.min(h, c.bed) - h) * c.w;
  const p = pondW(x, z); if (p > 0) h += (Math.min(h, POND.level - 0.8) - h) * p;   // the flooded valley floor, under 0.8 m of water
  return h;
}

// slope magnitude (rise per metre), for cliffs and wet flats
export const slope = (x, z, e = 2) => Math.hypot(height(x + e, z) - height(x - e, z), height(x, z + e) - height(x, z - e)) / (2 * e);
// distance to the nearest brook centre line (and which brook)
export function brookNear(x, z, reach = 60) {
  let best = { d: Infinity, key: null, s: 0 };
  for (const [key, b] of Object.entries(BROOKS)) { if (b.line.farFrom(x, z, reach)) continue; const n = b.line.near(x, z); if (n.d < best.d) best = { d: n.d, key, s: n.s }; }
  return best;
}
export { ridgeSide, ridgeLine };
