// The plot: layout plus the ground fields everything else reads (height, gap, path, puddle, shade).
// Pure: no three.js, no DOM, so the simulation can use the same terrain the renderer draws.
import { vnoise, fbm, sstep } from '../core/noise.js';
import plot from '../data/plot01.json' with { type: 'json' };

export const HALF = plot.size / 2;   // the square runs from -14 to 14 m
export const TREES = plot.trees;
export const SAPLINGS = plot.saplings;
export const GAP = plot.gap;
export const PUDDLE = plot.puddle;

export const inside = (x, z, m = 0.3) => Math.abs(x) < HALF - m && Math.abs(z) < HALF - m;
export const sample = (rng, m = 0.3) => [rng.rr(-HALF + m, HALF - m), rng.rr(-HALF + m, HALF - m)];

// the trodden path that winds across the plot
export const pathZ = (x) => 1.2 + 2.6 * Math.sin(x / 5.5) - x * 0.3;
export const pathW = (x, z) => sstep(0.75, 0.3, Math.abs(z - pathZ(x)) + (vnoise(x * 0.9, z * 0.9) - 0.5) * 0.5);

// where the animals start; the ground there is kept clear of tall grass so they stay readable
export const SPOTS = { deer: [-1.6, pathZ(-1.6) + 0.5], fox: [-1.2, 11.2], boar: [6.4, 10.2], hare: [3.6, pathZ(3.6) + 0.15] };
const CLEAR = [[SPOTS.deer[0], SPOTS.deer[1], 1.8], [SPOTS.hare[0], SPOTS.hare[1], 0.9], [SPOTS.fox[0], SPOTS.fox[1], 1.1], [SPOTS.boar[0], SPOTS.boar[1], 2.4]];
export const clearW = (x, z) => CLEAR.reduce((m, [cx, cz, r]) => m * sstep(r * 0.5, r, Math.hypot(x - cx, z - cz)), 1);

export const rootedW = (x, z) => sstep(2.6, 1.2, Math.hypot(x - SPOTS.boar[0], (z - SPOTS.boar[1]) * 1.2) + (vnoise(x * 1.5, z * 1.5) - 0.5) * 1.2);
export const gapW = (x, z) => sstep(GAP.r + 1.5, GAP.r - 3.5, Math.hypot((x - GAP.x) * 0.95, (z - GAP.z) * 1.05) + (fbm(x * 0.3 + 3, z * 0.3) - 0.5) * 4.5);
export const puddleD = (x, z) => Math.hypot(x - PUDDLE.x, (z - PUDDLE.z) * 1.3) / PUDDLE.r + (vnoise(x * 2, z * 2) - 0.5) * 0.25;

// 0..1 shade under any crown (a stand-in until the sim computes light)
export function canopyShade(x, z) {
  let s = 0;
  for (const t of TREES) if (t.r) s = Math.max(s, sstep(t.r * 1.45, t.r * 0.4, Math.hypot(x - t.x, z - t.z)));
  return s;
}
// 0..1 nearness to any tree of a kind
export function nearKind(x, z, kind, f = 2.2) {
  let s = 0;
  for (const t of TREES) if (t.kind === kind) s = Math.max(s, sstep(t.r * f, t.r * 0.6, Math.hypot(x - t.x, z - t.z)));
  return s;
}

export function height(x, z) {
  let h = (fbm(x * 0.09 + 4, z * 0.09) - 0.5) * 1.4 + (vnoise(x * 0.4, z * 0.4) - 0.5) * 0.28;
  h -= pathW(x, z) * 0.1;
  h -= sstep(1.1, 0.2, puddleD(x, z)) * 0.32;
  return h;
}
export const WATER_Y = height(PUDDLE.x + PUDDLE.r * 1.05, PUDDLE.z) - 0.06;
