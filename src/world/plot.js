// The plot: ground fields (fields.js), the tree layout (layout.js), and the fields that depend on the trees
// (shade, nearness to a kind). Pure: no three.js, no DOM, so the simulation can use the same world the renderer draws.
import { sstep } from '../core/noise.js';
import plot from '../data/plot01.json' with { type: 'json' };
import { generateLayout } from './layout.js';

export * from './fields.js';

const layout = generateLayout();
export const TREES = layout.trees;
export const STUMPS = layout.stumps;
export const SAPLINGS = plot.saplings;

// trees bucketed in 4 m cells so the per-point fields below only look at nearby crowns
const CELL = 4, REACH = 2;   // a crown's influence reaches at most r * 2.2 < 8 m = 2 cells
const grid = new Map();
const key = (i, j) => i * 1000 + j;
for (const t of TREES) { const k = key(Math.floor(t.x / CELL), Math.floor(t.z / CELL)); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(t); }
function near(x, z, fn) {
  const ci = Math.floor(x / CELL), cj = Math.floor(z / CELL);
  for (let i = ci - REACH; i <= ci + REACH; i++) for (let j = cj - REACH; j <= cj + REACH; j++) { const b = grid.get(key(i, j)); if (b) for (const t of b) fn(t); }
}

// 0..1 shade under any crown (a stand-in until the sim computes light)
export function canopyShade(x, z) {
  let s = 0;
  near(x, z, (t) => { if (t.r) s = Math.max(s, sstep(t.r * 1.45, t.r * 0.4, Math.hypot(x - t.x, z - t.z))); });
  return s;
}
// 0..1 nearness to any tree of a kind
export function nearKind(x, z, kind, f = 2.2) {
  let s = 0;
  near(x, z, (t) => { if (t.kind === kind) s = Math.max(s, sstep(t.r * f, t.r * 0.6, Math.hypot(x - t.x, z - t.z))); });
  return s;
}
