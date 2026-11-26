// Estate terrain (world.md section 12): a sandstone ridge in the north-west with a cliff band on its south-east
// face, a brook valley crossing to the south-east, carved side valleys and a gorge, and brook beds that never run
// uphill. Pure: no three.js, no DOM. Heights are metres above sea level.
import { fbm, vnoise, sstep } from '../core/noise.js';
import E from '../data/estate.json' with { type: 'json' };
import { height as plotHeight } from '../world/fields.js';

export const HALF = E.size / 2;

// ---------- polylines ----------
// Nearest-point queries go through a grid of segment buckets, so long, finely sampled lines stay cheap.
// near(x, z, maxD) returns { d, s, o, k }: distance, distance along, signed offset (> 0 on the left of the direction
// of travel, seen from above with +z south) and segment index; with maxD, points further than maxD may get d = Infinity.
// Options: G, the bucket size; sv, the distance-along value at each point (default: arc length).
export function polyline(points, { G = 8, sv = null } = {}) {
  const segs = []; let s0 = 0;
  for (let i = 1; i < points.length; i++) { const [x0, z0] = points[i - 1], [x1, z1] = points[i], dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz) || 1e-6, sl = sv ? sv[i] - sv[i - 1] : len; s0 = sv ? sv[i - 1] : s0; segs.push({ x0, z0, dx, dz, len, s0, sl }); s0 += sl; }
  const length = s0;
  const xs = points.map((p) => p[0]), zs = points.map((p) => p[1]);
  const box = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
  const gx = Math.floor((box[2] - box[0]) / G) + 1, gz = Math.floor((box[3] - box[1]) / G) + 1, cells = Array.from({ length: gx * gz }, () => []);
  segs.forEach((g, k) => {
    const a0 = Math.floor((Math.min(g.x0, g.x0 + g.dx) - box[0]) / G), a1 = Math.floor((Math.max(g.x0, g.x0 + g.dx) - box[0]) / G);
    const b0 = Math.floor((Math.min(g.z0, g.z0 + g.dz) - box[1]) / G), b1 = Math.floor((Math.max(g.z0, g.z0 + g.dz) - box[1]) / G);
    for (let b = b0; b <= b1; b++) for (let a = a0; a <= a1; a++) cells[b * gx + a].push(k);
  });
  function near(x, z, maxD = Infinity) {
    let d = Infinity, s = 0, o = 0, kk = 0;
    const test = (k) => { const g = segs[k], t = Math.max(0, Math.min(1, ((x - g.x0) * g.dx + (z - g.z0) * g.dz) / (g.len * g.len))), ex = x - g.x0 - g.dx * t, ez = z - g.z0 - g.dz * t, dd = Math.hypot(ex, ez);
      if (dd < d) { d = dd; s = g.s0 + t * g.sl; o = ex * g.dz - ez * g.dx; kk = k; } };
    // rings of cells around the query: after ring r every unseen segment is at least r * G away
    // (short lines, or when the rings would cost more than looking at every segment, are searched directly)
    const ca = Math.floor((x - box[0]) / G), cb = Math.floor((z - box[1]) / G), rmax = Math.max(ca, gx - 1 - ca, cb, gz - 1 - cb, 0);
    if (segs.length < 24) { for (let k = 0; k < segs.length; k++) test(k); return { d, s, o: o < 0 ? -d : d, k: kk }; }
    for (let r = 0; r <= rmax; r++) {
      if (r > 0 && (d <= (r - 1) * G || (r - 1) * G > maxD)) break;
      if ((2 * r + 1) ** 2 > segs.length * 2) { for (let k = 0; k < segs.length; k++) test(k); break; }
      for (let b = cb - r; b <= cb + r; b++) {
        if (b < 0 || b >= gz) continue;
        const step = b === cb - r || b === cb + r ? 1 : 2 * r;
        for (let a = ca - r; a <= ca + r; a += step) { if (a >= 0 && a < gx) for (const k of cells[b * gx + a]) test(k); if (!step) break; }
      }
    }
    return { d, s, o: o < 0 ? -d : d, k: kk };
  }
  function seg(s) { let lo = 0, hi = segs.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (s > segs[m].s0 + segs[m].sl) lo = m + 1; else hi = m; } return segs[lo]; }
  function at(s) { const g = seg(s), t = Math.max(0, Math.min(1, (s - g.s0) / g.sl)); return [g.x0 + g.dx * t, g.z0 + g.dz * t]; }
  function dir(s) { const g = seg(s); return [g.dx / g.len, g.dz / g.len]; }
  const farFrom = (x, z, r) => x < box[0] - r || x > box[2] + r || z < box[1] - r || z > box[3] + r;
  return { segs, length, near, at, dir, farFrom, box };
}

// a centripetal Catmull-Rom curve through the points, sampled about every `step` metres (it passes through each point)
function spline(P, step) {
  const n = P.length; if (n < 3) return P.map((p) => [...p]);
  const ext = (i) => (i < 0 ? [2 * P[0][0] - P[1][0], 2 * P[0][1] - P[1][1]] : i >= n ? [2 * P[n - 1][0] - P[n - 2][0], 2 * P[n - 1][1] - P[n - 2][1]] : P[i]);
  const tj = (a, b) => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])) || 1e-4, out = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = ext(i - 1), p1 = P[i], p2 = P[i + 1], p3 = ext(i + 2), t1 = tj(p0, p1), t2 = t1 + tj(p1, p2), t3 = t2 + tj(p2, p3);
    const m = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let q = 0; q < m; q++) {
      const t = t1 + ((t2 - t1) * q) / m, L = (a, b, ta, tb) => [a[0] + ((b[0] - a[0]) * (t - ta)) / (tb - ta), a[1] + ((b[1] - a[1]) * (t - ta)) / (tb - ta)];
      const A1 = L(p0, p1, 0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3), B1 = L(A1, A2, 0, t2), B2 = L(A2, A3, t1, t3);
      out.push(L(B1, B2, t1, t2));
    }
  }
  out.push([...P[n - 1]]);
  return out;
}

// Brook centre lines: the hand-drawn points smoothed into a curve, then given meanders (a wavelength of roughly
// 12-15 channel widths, as in small gravel-bed streams) that fade out at both ends and near the places where
// tributaries join, so confluences and Plot 01's stream still meet exactly.
const MEANDER = { main: [4.5, 46], gorge: [1.0, 17], plot01: [1.6, 21], eastSpring: [2.2, 26] };
function meander(key, b, pins) {
  const base = polyline(spline(b.points, 2), { G: 32 }), [amp, lam] = MEANDER[key] || [b.halfWidth * 1.5, b.halfWidth * 28], out = [];
  const ph = vnoise(key.length * 3.1, 5) * 6.28, L = base.length, sv = [];
  for (let s = 0; s <= L + 1.49; s += 1.5) {
    s = Math.min(s, L); sv.push(s);
    const [x, z] = base.at(s), [tx, tz] = base.dir(s);
    let fade = sstep(0, lam * 0.75, s) * sstep(L, L - lam * 0.75, s);
    for (const [px, pz] of pins) fade *= sstep(lam * 0.3, lam * 1.1, Math.hypot(x - px, z - pz));
    const w = (Math.sin((s / lam) * 6.283 + ph) * 0.75 + Math.sin((s / (lam * 0.43)) * 6.283 + ph * 1.7) * 0.25) * (0.55 + 0.9 * vnoise(s / lam + 3, key.length));
    out.push([x - tz * amp * fade * w, z + tx * amp * fade * w]);
  }
  out[out.length - 1] = [...b.points[b.points.length - 1]];
  return { base, line: polyline(out, { sv }) };
}
const RAW = Object.fromEntries(Object.entries(E.brooks).filter(([, b]) => b.points));
const ENDS = Object.values(RAW).map((b) => b.points[b.points.length - 1]);
export const BROOKS = Object.fromEntries(Object.entries(RAW).map(([k, b]) => {
  const pins = ENDS.filter((p) => p !== b.points[b.points.length - 1]);
  if (k === 'plot01') pins.push(...b.points.filter(([x, z]) => Math.max(Math.abs(x - E.plot.origin[0]), Math.abs(z - E.plot.origin[1])) < 34));   // straight where it leaves Plot 01
  const { base, line } = meander(k, b, pins);
  return [k, { ...b, key: k, line, axis: base }];   // line: the channel; axis: the smooth valley line (same distance along)
}));

// ---------- the land before the brooks are cut ----------
const R = E.relief, RG = R.ridge;
const ridgeLine = polyline([RG.from, RG.to]);
// signed side of the ridge line: > 0 on the south-east (valley) side
const ridgeSide = (() => { const [x0, z0] = RG.from, [x1, z1] = RG.to, dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz); return (x, z) => ((x - x0) * -dz + (z - z0) * dx) / l * -1; })();

function landRaw(x, z) {
  let h = R.base + R.tilt * (-x - z);
  // the ridge: a broad rise, steepened into a cliff band on its south-east face
  const { d } = ridgeLine.near(x, z), side = ridgeSide(x, z);
  h += RG.height * Math.exp(-((d / RG.width) ** 2)) * (side < 0 ? 1 : 1 - 0.0);
  h += RG.cliff * sstep(60, 30, side + (vnoise(x * 0.02, z * 0.02) - 0.5) * 30) * sstep(RG.width * 1.6, RG.width * 0.4, d);
  for (const [scale, amp] of R.noise) h += (fbm(x / scale + 11, z / scale + 3) - 0.5) * 2 * amp;
  // valleys carved around every brook (a smooth U, wider and deeper for the main brook); where two valleys meet the
  // deeper one wins, so a confluence is not a pit
  let cut = 0;
  for (const b of Object.values(BROOKS)) {
    const v = b.valley; if (b.axis.farFrom(x, z, v.width * 2)) continue;
    const { d: bd } = b.axis.near(x, z, v.width * 2); cut = Math.max(cut, v.depth * Math.exp(-((bd / v.width) ** 2)));
  }
  return h - cut;
}

// ---------- Plot 01 (E4): inside its 60 m square the ground is the plot's own terrain, raised by PLOT.C to the
// estate's elevation; over a 16 m band around it the estate's ground eases into it, so there is no step ----------
const [PX, PZ] = E.plot.origin, PH = 30, BLEND = 16;
const PLOT_C = (() => { let s = 0, n = 0; for (let k = 0; k < 240; k++) { const t = (k / 240) * 4, side = Math.floor(t), f = t - side, u = -PH + 2 * PH * f;
  const [lx, lz] = [[u, -PH], [PH, u], [-u, PH], [-PH, -u]][side]; s += landRaw(PX + lx, PZ + lz) - plotHeight(lx, lz); n++; } return s / n; })();
export const PLOT = { x: PX, z: PZ, half: PH, C: PLOT_C };
export const inPlot = (x, z, m = 0) => Math.abs(x - PX) < PH - m && Math.abs(z - PZ) < PH - m;
function landHeight(x, z) {
  const h = landRaw(x, z), lx = x - PX, lz = z - PZ, m = Math.max(Math.abs(lx), Math.abs(lz));
  if (m > PH + BLEND) return h;
  return h + (plotHeight(lx, lz) + PLOT_C - h) * sstep(PH + BLEND, PH, m);
}

// ---------- brook beds: the land along each centre line, lowered by the channel depth, never rising downstream ----------
// Every metre along each brook: the bed, and the channel's character there. Riffles are where the bed drops
// (narrow, shallow, broken water); pools where it is level (wider, deeper, still); bends have a steep cut bank on
// the outside and a gravel bar on the inside.
const STEP = 1;
const idx = (b, s) => Math.max(0, Math.min(b.bed.length - 1, Math.round(s / STEP)));
for (const b of Object.values(BROOKS)) {
  const bed = [], land = []; let lo = Infinity;
  for (let s = 0; s <= b.line.length + STEP; s += STEP) { const [x, z] = b.line.at(s), h = landHeight(x, z); lo = Math.min(lo, h - b.depth); bed.push(lo); land.push(h); }
  b.bed = bed; b.land = land;
  b.bedAt = (s) => { const i = Math.max(0, Math.min(bed.length - 2, Math.floor(s / STEP))), f = Math.max(0, Math.min(1, s / STEP - i)); return bed[i] + (bed[i + 1] - bed[i]) * f; };
}
// a tributary meets the brook it joins at that brook's level: its bed is never below the junction's, and it eases
// down to it over the last stretch (both keep the bed from rising downstream)
for (const b of Object.values(BROOKS)) {
  const end = b.points[b.points.length - 1];
  for (const o of Object.values(BROOKS)) {
    if (o === b) continue; const n = o.line.near(...end); if (n.d > 3) continue;
    const J = o.bedAt(n.s), L = b.line.length; b.joins = { key: o.key, s: n.s, J };
    for (let i = 0; i < b.bed.length; i++) { b.bed[i] = Math.max(b.bed[i], J); if (L - i * STEP < 30) b.bed[i] = Math.min(b.bed[i], J + Math.max(0, L - i * STEP) * 0.03); }
  }
}
for (const b of Object.values(BROOKS)) {
  const n = b.bed.length, hw = new Float32Array(n), pool = new Float32Array(n), riff = new Float32Array(n), kap = new Float32Array(n), seed = b.key.length * 7.3;
  const head = []; let prev = null;
  for (let i = 0; i < n; i++) { const [tx, tz] = b.line.dir(Math.min(b.line.length, i * STEP)); let a = Math.atan2(tz, tx); if (prev !== null) { while (a - prev > Math.PI) a -= 2 * Math.PI; while (a - prev < -Math.PI) a += 2 * Math.PI; } head.push(a); prev = a; }
  let excess = 0;
  for (let i = 0; i < n; i++) {
    const g = (b.bed[Math.max(0, i - 4)] - b.bed[Math.min(n - 1, i + 4)]) / 8, ri = sstep(0.006, 0.035, g) * (0.6 + 0.4 * vnoise(i / 9 + seed, 2));
    const po = (1 - ri) * sstep(0.4, 0.72, vnoise(i / 29 + 9, seed));
    riff[i] = ri; pool[i] = po;
    hw[i] = b.halfWidth * (0.8 + 0.42 * vnoise(i / 23 + seed, 1.7)) * (1 - 0.25 * ri + 0.22 * po);
    const i0 = Math.max(0, i - 5), i1 = Math.min(n - 1, i + 5); kap[i] = i1 > i0 ? -(head[i1] - head[i0]) / ((i1 - i0) * STEP) : 0;
    excess = Math.max(excess, b.land[i] - b.bed[i] - b.depth * 0.5);
  }
  Object.assign(b, { hw, pool, riff, kap, reach: b.halfWidth * 2.2 + excess / 0.3 + 1 });
  b.surfaceAt = (s) => b.bedAt(s) + b.depth * 0.5;   // the water surface: a constant height over the bed, so it never rises downstream either
}

// The channel at a signed offset o from brook b's centre line, s along it: the target ground height (the bed
// profile, then the banks) and what the place is like.
function channelAt(b, o, s) {
  const i = idx(b, s), hw = b.hw[i], kap = b.kap[i], a = Math.min(1, Math.abs(kap) * hw * 6), inner = o * kap > 0 ? a : 0, outer = o * kap > 0 ? 0 : a;
  const wet = hw * (1 + 0.45 * inner - 0.2 * outer), bed = b.bedAt(s), surf = bed + b.depth * 0.5;
  const floor = bed - b.pool[i] * b.depth * 0.55 + b.riff[i] * b.depth * 0.22 - outer * b.depth * 0.25 + inner * b.depth * 0.2;
  const t = Math.abs(o) / wet;
  const T = t < 1 ? floor + (surf - floor) * t ** (1.6 + 1.6 * outer - 0.6 * inner) : surf + (Math.abs(o) - wet) * (0.4 + 1.3 * outer - 0.22 * inner);
  return { T, t, wet, inner, outer, surf, bed, pool: b.pool[i], riff: b.riff[i], hw };
}
// the brook whose channel (x, z) is most inside, with its channel there; null if none within `reach` metres of a bank
export function brookAt(x, z, reach = 0) {
  let best = null;
  for (const b of Object.values(BROOKS)) {
    const r = b.halfWidth * 1.6 + reach; if (b.line.farFrom(x, z, r)) continue;
    const n = b.line.near(x, z, r); if (n.d > r) continue;
    const c = channelAt(b, n.o, n.s); if (!best || c.t < best.t) best = Object.assign(c, { b, key: b.key, d: n.d, o: n.o, s: n.s });
  }
  return best;
}

// ---------- the beaver pond: water held at one level behind the dam ----------
const P = E.pond;
export const POND = { ...P, level: null };
// normalised distance from the pond's middle, with bays and points so the shore is not an ellipse
export function pondR(x, z) {
  const c = Math.cos(P.yaw), s = Math.sin(P.yaw), dx = x - P.centre[0], dz = z - P.centre[1];
  const u = (dx * c + dz * s) / P.rx, v = (-dx * s + dz * c) / P.rz, th = Math.atan2(v, u);
  return Math.hypot(u, v) * (1 + 0.07 * Math.sin(3 * th + 1.2) + 0.05 * Math.sin(5 * th + 0.4)) + (vnoise(x * 0.05, z * 0.05) - 0.5) * 0.25 + (vnoise(x * 0.16 + 7, z * 0.16) - 0.5) * 0.08;
}
export const pondW = (x, z) => sstep(1.05, 0.85, pondR(x, z));
{ const m = BROOKS.main; POND.level = m.bedAt(m.line.near(...P.dam).s) + 1.4; }   // the dam holds water about 1.4 m above the bed

// ---------- the dam: a bank of sticks and mud across the brook at the pond's outflow, a notch where it spills ----------
export const DAM = (() => {
  const m = BROOKS.main, { s } = m.line.near(...P.dam), [x, z] = m.line.at(s), [tx, tz] = m.line.dir(s), crest = POND.level + 0.18;
  // how far it runs each way: until the valley side rises above the crest
  const ext = (sg) => { for (let l = 1; l < 60; l += 0.5) if (landHeight(x - tz * l * sg, z + tx * l * sg) > crest + 0.25) return l + 1; return 60; };
  return { x, z, tx, tz, s, crest, left: ext(1), right: ext(-1), notch: 0.4 };
})();
function damH(x, z) {
  const D = DAM, dx = x - D.x, dz = z - D.z, al = dx * D.tx + dz * D.tz, la = -dx * D.tz + dz * D.tx;
  if (Math.abs(al) > 5) return -Infinity;
  const lim = la > 0 ? D.left : D.right; if (Math.abs(la) > lim + 6) return -Infinity;
  const top = D.crest + (vnoise(la * 0.7, 3) - 0.5) * 0.14 - 0.26 * sstep(1.5, 0.5, Math.abs(la - D.notch));
  const f = Math.max(0, Math.abs(al) - 0.45);
  return top - f * f * (al > 0 ? 1.1 : 0.7) - 2.5 * sstep(lim, lim + 6, Math.abs(la));
}
// which side of the dam (x, z) is on: < 0 upstream (the pond side)
export const damSide = (x, z) => (x - DAM.x) * DAM.tx + (z - DAM.z) * DAM.tz;

const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export function height(x, z) {
  if (inPlot(x, z)) return landHeight(x, z);   // the plot's own terrain (its stream is cut in it already)
  let h = landHeight(x, z);
  const pm = Math.max(Math.abs(x - PX), Math.abs(z - PZ)), e = sstep(PH, PH + 5, pm);   // the channels ease in past Plot 01's edge, where its own channel ends
  for (const b of Object.values(BROOKS)) {
    if (b.line.farFrom(x, z, b.reach)) continue;
    const n = b.line.near(x, z, b.reach); if (n.d > b.reach) continue;
    const { T } = channelAt(b, n.o, n.s); h += (smin(h, T, 0.3) - h) * e;
  }
  const r = pondR(x, z), p = sstep(1.05, 0.85, r);
  if (p > 0) h += (Math.min(h, POND.level - 0.22 - 1.0 * sstep(0.95, 0.45, r)) - h) * p;   // shallow margins, about 1.2 m in the middle
  const dh = damH(x, z); if (dh > h - 0.3) h = -smin(-h, -dh, 0.3);
  return h;
}

// slope magnitude (rise per metre), for cliffs and wet flats
export const slope = (x, z, e = 2) => Math.hypot(height(x + e, z) - height(x - e, z), height(x, z + e) - height(x, z - e)) / (2 * e);
// distance to the nearest brook centre line (and which brook)
export function brookNear(x, z, reach = 60) {
  let best = { d: Infinity, key: null, s: 0 };
  for (const [key, b] of Object.entries(BROOKS)) { if (b.line.farFrom(x, z, reach)) continue; const n = b.line.near(x, z, reach); if (n.d < best.d) best = { d: n.d, key, s: n.s }; }
  return best;
}
export { ridgeSide, ridgeLine };
