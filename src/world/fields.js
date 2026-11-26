// Ground fields of the Stage A map (40 x 40 m): terrain height, the stream, the wall, the outcrop and the
// seven habitat weights. Pure: no three.js, no DOM, no trees (tree-dependent fields live in plot.js), so the
// tree layout can be generated from these without a cycle and the simulation can read the same ground.
import { vnoise, fbm, sstep } from '../core/noise.js';
import plot from '../data/plot01.json' with { type: 'json' };
import map from '../data/map.json' with { type: 'json' };

export const MAP = map;
export const HALF = map.size / 2;   // the square runs from -20 to 20 m
export const GAP = plot.gap;
export const PUDDLE = plot.puddle;

export const inside = (x, z, m = 0.3) => Math.abs(x) < HALF - m && Math.abs(z) < HALF - m;
export const sample = (rng, m = 0.3) => [rng.rr(-HALF + m, HALF - m), rng.rr(-HALF + m, HALF - m)];

// ---------- the deer path ----------
// The prototype's winding path across the gap (|x| < 10 unchanged), bending at either end: west along the
// north foot of the outcrop, east through the wall and between the spruce plantation and the windthrow.
const pathCore = (x) => 1.2 + 2.6 * Math.sin(x / 5.5) - x * 0.3;
const pathEnds = (x) => (x > 0 ? -0.6 - (x - 12) * 0.05 : 2.4 - (-12 - x) * 0.35);
export const pathZ = (x) => { const b = sstep(10, 14, Math.abs(x)); return pathCore(x) * (1 - b) + pathEnds(x) * b; };
export const pathW = (x, z) => sstep(0.75, 0.3, Math.abs(z - pathZ(x)) + (vnoise(x * 0.9, z * 0.9) - 0.5) * 0.5);

// ---------- gap, puddle, boar ----------
// where the animals start; the ground there is kept clear of tall grass so they stay readable
export const SPOTS = { deer: [-1.6, pathZ(-1.6) + 0.5], fox: [-1.2, 11.2], boar: [6.4, 10.2], hare: [3.6, pathZ(3.6) + 0.15] };
const CLEAR = [[SPOTS.deer[0], SPOTS.deer[1], 1.8], [SPOTS.hare[0], SPOTS.hare[1], 0.9], [SPOTS.fox[0], SPOTS.fox[1], 1.1], [SPOTS.boar[0], SPOTS.boar[1], 2.4]];
export const clearW = (x, z) => CLEAR.reduce((m, [cx, cz, r]) => m * sstep(r * 0.5, r, Math.hypot(x - cx, z - cz)), 1);
export const rootedW = (x, z) => sstep(2.6, 1.2, Math.hypot(x - SPOTS.boar[0], (z - SPOTS.boar[1]) * 1.2) + (vnoise(x * 1.5, z * 1.5) - 0.5) * 1.2);
export const gapW = (x, z) => sstep(GAP.r + 1.5, GAP.r - 3.5, Math.hypot((x - GAP.x) * 0.95, (z - GAP.z) * 1.05) + (fbm(x * 0.3 + 3, z * 0.3) - 0.5) * 4.5);
export const puddleD = (x, z) => Math.hypot(x - PUDDLE.x, (z - PUDDLE.z) * 1.3) / PUDDLE.r + (vnoise(x * 2, z * 2) - 0.5) * 0.25;

// ---------- wall ----------
const W = map.wall;
export const wallX = (z) => W.x0 + W.a1 * Math.sin(W.f1 * z + W.p1) + W.a2 * Math.sin(W.f2 * z);

// ---------- stream ----------
export const STREAM = map.stream.points;
export const SPRING = map.spring;
export const BACKWATER = map.backwater;
const SEG = STREAM.slice(1).map(([x1, z1], i) => { const [x0, z0] = STREAM[i]; const dx = x1 - x0, dz = z1 - z0; return { x0, z0, dx, dz, l2: dx * dx + dz * dz }; });
// distance from (x, z) to the stream centre line
export function streamD(x, z) {
  let best = Infinity;
  for (const s of SEG) {
    const t = Math.max(0, Math.min(1, ((x - s.x0) * s.dx + (z - s.z0) * s.dz) / s.l2));
    best = Math.min(best, Math.hypot(x - s.x0 - s.dx * t, z - s.z0 - s.dz * t));
  }
  return best;
}
// 0..1 how much of the channel / pools is cut at (x, z); 1 = the bed
export function channelW(x, z) {
  const wob = (vnoise(x * 0.8, z * 0.8) - 0.5) * 0.25;
  const ch = sstep(map.stream.halfWidth, 0.15, streamD(x, z) + wob);
  const pool = sstep(SPRING.r, SPRING.r * 0.3, Math.hypot(x - SPRING.x, z - SPRING.z) + wob);
  const back = sstep(BACKWATER.r, BACKWATER.r * 0.35, Math.hypot((x - BACKWATER.x) * 0.8, z - BACKWATER.z) + wob);
  return Math.max(ch, pool, back);
}

// ---------- outcrop, charcoal platform, sett ----------
const O = map.outcrop;
export const outcropEdge = (z) => O.edge + 0.7 * Math.sin(z * 0.5) + 0.5 * Math.sin(z * 1.3 + 2);
// 0..1 on top of the outcrop (the step is the 0..1 transition)
export const outcropW = (x, z) => sstep(0.35, -0.45, x - outcropEdge(z)) * sstep(O.zStart - 1, O.zStart + 2.5, z);

const CH = map.charcoal;
export const charcoalW = (x, z) => sstep(CH.r + 0.6, CH.r - 0.8, Math.hypot(x - CH.x, z - CH.z) + (vnoise(x * 0.7, z * 0.7) - 0.5) * 1.2);

const SB = map.sett.bank;
export const SETT = map.sett;
export const settBankW = (x, z) => sstep(1, 0.2, Math.hypot((x - SB.x) / SB.rx, (z - SB.z) / SB.rz));
// spoil heaps: bare soil thrown out in front of each entrance (downhill, +z)
export const spoilW = (x, z) => SETT.entrances.reduce((m, [ex, ez]) => Math.max(m, sstep(1.0, 0.3, Math.hypot((x - ex) * 0.9, z - ez - 0.9))), 0);

// ---------- windthrow ----------
export const PLATES = map.windthrow.plates.map((p) => ({ ...p, dx: Math.cos(p.yaw), dz: Math.sin(p.yaw) }));
// the pit each root plate tore out lies on the plate's upwind (SW) side
export const pitW = (x, z) => PLATES.reduce((m, p) => Math.max(m, sstep(p.r * 1.05, p.r * 0.3, Math.hypot(x - (p.x - p.dx * p.r * 0.9), z - (p.z - p.dz * p.r * 0.9)))), 0);

// ---------- height ----------
const slope = (x, z) => -(x + z) * map.slope.perM;
const flat = (x, z, cx, cz, r) => sstep(r, r * 0.55, Math.hypot(x - cx, z - cz));   // 1 near a level spot
const PUD_FLAT = (x, z) => flat(x, z, PUDDLE.x, PUDDLE.z, PUDDLE.r * 2.2);
const CH_LEVEL = slope(CH.x, CH.z);

export function height(x, z) {
  // regional slope, levelled under the puddle so its water lies flat
  let s = slope(x, z); s += (slope(PUDDLE.x, PUDDLE.z) - s) * PUD_FLAT(x, z);
  let h = s + (fbm(x * 0.09 + 4, z * 0.09) - 0.5) * 1.4 + (vnoise(x * 0.4, z * 0.4) - 0.5) * 0.28;
  // the charcoal platform: cut level into the slope
  const cw = charcoalW(x, z); h += (CH_LEVEL + (fbm(CH.x * 0.09 + 4, CH.z * 0.09) - 0.5) * 1.4 - h) * cw * 0.92;
  h -= pathW(x, z) * 0.1;
  h -= sstep(1.1, 0.2, puddleD(x, z)) * 0.32;
  // outcrop: a stepped sandstone shelf with a rough top
  const o = outcropW(x, z); h += o * (O.height + (vnoise(x * 0.6, z * 0.6) - 0.5) * 0.5);
  // stream channel and pools
  h -= channelW(x, z) * map.stream.depth;
  // wall ridge (cut where the stream runs through it)
  const dw = Math.abs(x - wallX(z)); h += sstep(W.halfWidth * 1.8, W.halfWidth * 0.4, dw) * W.height * sstep(0.9, 2.2, streamD(x, z));
  // sett bank and spoil heaps
  h += settBankW(x, z) * SB.h + spoilW(x, z) * 0.32;
  // windthrow pits
  h -= pitW(x, z) * 0.45;
  return h;
}
export const WATER_Y = height(PUDDLE.x + PUDDLE.r * 1.05, PUDDLE.z) - 0.06;

// ---------- habitats ----------
// H1 old beech-oak stand, H2 spruce plantation, H3 canopy gap, H4 spring and stream, H5 forest edge,
// H6 rock outcrop, H7 windthrow (docs/world.md section 5). Returns weights that sum to 1.
export const HABITATS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7'];
const Z = map.zones;
export function habitatW(x, z) {
  const n = (fbm(x * 0.15 + 40, z * 0.15) - 0.5) * 3;
  const o = sstep(0.2, 0.8, outcropW(x, z));
  const st = sstep(3.2, 1.4, streamD(x, z) + n * 0.4) * (1 - o);
  const gap = sstep(0.25, 0.6, gapW(x, z)) * (1 - o) * (1 - st);
  const rest = 1 - o - st - gap;
  const east = sstep(-1.2, 1.2, x - wallX(z) + n * 0.3);
  const plant = sstep(1.5, -1.5, z - Z.plantationSouth + n);
  const edge = sstep(-1.5, 1.5, z - Z.windthrowSouth + n);
  const wt = (1 - plant) * (1 - edge);
  return [rest * (1 - east), rest * east * plant, gap, st, rest * east * edge, o, rest * east * wt];
}
export function habitatAt(x, z) {
  const w = habitatW(x, z); let k = 0;
  for (let i = 1; i < w.length; i++) if (w[i] > w[k]) k = i;
  return k;   // index into HABITATS
}
