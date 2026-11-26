// Where an animal can't walk: trunks, water, the wall (except its breaches), rocks, the outcrop face, root plates
// and fallen trunks, the gap log and stump, the ant mound and the plot edge. Pure, so tests can check every route.
// The hand-placed rocks and the outcrop's foot boulders live here so the renderer and the checks agree.
import { createRng } from '../core/random.js';
import species from '../data/species.json' with { type: 'json' };
import { MAP, HALF, TREES, PLATES, channelW, puddleD, outcropW, outcropEdge, wallX, pathZ, streamD } from './plot.js';

export const LOG = { x: -3, z: 6.8, len: 6.2, r: 0.42, yaw: -0.35 };   // the veteran beech's fallen trunk in the gap
export const STUMP = { x: 4.6, z: -0.6, r: 0.72 };                       // its stump, with honey fungus
export const ROCKS = [[-7, 2.5, 0.85], [-6.1, 3.4, 0.42], [8.5, 9.4, 0.9], [1.6, 9.6, 0.45], [-10.5, -11, 0.7], [11.8, -5.2, 0.6], [-2.6, -9, 0.38], [12.4, 12.4, 0.5], [-12.6, 12.6, 0.55], [6.2, 3.6, 0.3]];
// boulders rolled to the foot of the outcrop: [x, z, size]
export const BOULDERS = (() => {
  const { rr } = createRng(MAP.layoutSeed + 1), out = [], z0 = MAP.outcrop.zStart + 0.8;
  for (let i = 0; i < 9; i++) { const z = rr(z0, HALF - 0.8), x = outcropEdge(z) + rr(0.9, 2.4), s = rr(0.3, 0.6); if (streamD(x, z) >= 1.2) out.push([x, z, s]); }
  return out;
})();

const trunkR = (t) => (t.kind === 'snag' ? 0.25 : species.trees[t.kind].render.trunk.r0 * (t.h < 8 ? Math.max(0.45, t.h / 9) : 1));
const logD = (x, z, p, len) => { const t = Math.max(0, Math.min(len, (x - p.x) * p.dx + (z - p.z) * p.dz)); return Math.hypot(x - p.x - p.dx * t, z - p.z - p.dz * t); };
const LOG_DIR = { x: LOG.x - Math.cos(LOG.yaw) * LOG.len / 2, z: LOG.z + Math.sin(LOG.yaw) * LOG.len / 2, dx: Math.cos(LOG.yaw), dz: -Math.sin(LOG.yaw) };

// opts: { r: body clearance (m), water: may wade (puddle, shallow pools), wall: may cross the wall anywhere,
//         log: may cross the gap log, edge: margin to the plot edge }
export function blocked(x, z, { r = 0.25, water = false, wall = false, log = false, edge = 0.5 } = {}) {
  if (Math.abs(x) > HALF - edge || Math.abs(z) > HALF - edge) return 'edge';
  for (const t of TREES) { const tr = t.kind === 'holly' ? t.r * 0.6 : trunkR(t); if (Math.hypot(x - t.x, z - t.z) < tr + r) return 'tree'; }
  if (!water && (channelW(x, z) > 0.35 || puddleD(x, z) < 0.85)) return 'water';
  const o = outcropW(x, z); if (o > 0.12 && o < 0.88) return 'rock face';
  if (!wall && Math.abs(x - wallX(z)) < 0.6 + r && Math.abs(z - pathZ(x)) > 0.8 && streamD(x, z) > 1.3) return 'wall';
  for (const [rx, rz, s] of [...ROCKS, ...BOULDERS]) if (Math.hypot(x - rx, z - rz) < s * 1.1 + r) return 'rock';
  for (const p of PLATES) { if (Math.hypot(x - p.x, z - p.z) < p.r * 0.6 + r || logD(x, z, p, p.len) < 0.3 + r) return 'windthrow'; }
  if (!log && logD(x, z, LOG_DIR, LOG.len) < LOG.r + r) return 'log';
  if (Math.hypot(x - STUMP.x, z - STUMP.z) < STUMP.r + r) return 'stump';
  if (Math.hypot(x - MAP.antMound.x, z - MAP.antMound.z) < MAP.antMound.r + r) return 'ant mound';
  return null;
}

// the first blocked point on the straight line a -> b (sampled every 10 cm), or null if the line is clear
export function lineBlocked([x0, z0], [x1, z1], opts) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.1));
  for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n, why = blocked(x, z, opts); if (why) return { x, z, why }; }
  return null;
}
