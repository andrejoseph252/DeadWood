// Tile plans (world.md section 12, E3): what goes where in one 62.5 m tile, decided from the estate's 2D design
// (cover, brooks, trees, features) by rules, with a random stream seeded from the tile's coordinates, so a tile is
// identical every time it is built and does not depend on which tiles were built before it. Pure data: the
// renderer (src/estate-render/) turns a plan into meshes. Like a chunk generator: design in, contents out.
import { createRng } from '../core/random.js';
import { fbm } from '../core/noise.js';
import E from '../data/estate.json' with { type: 'json' };
import { generateEstate, coverAt, height, slope, HALF, COVERS, COVER_IDS } from './index.js';
import { pondW } from './terrain.js';

// Places that get a hand-authored template later; until then they are built from the generic rules and flagged.
// (Plot 01 has its template: the plot scene itself, built into tile (8, 8) by the estate page.)
export const BESPOKE = { farmstead: 'the field station', quarry: 'the old quarry' };   // the beaver pond and dam are built (src/estate-render/water-build.js)

// Ground cover per cover type: items per 100 m² (only built for near tiles)
const SCATTER = {
  ancient: { chip: 40, fern: 0.5, moss: 0.8, twig: 0.8 },
  mixedSouth: { chip: 30, fern: 0.35, grass: 18, moss: 0.4 },
  spruce1962: { needle: 45, cone: 3, bilberry: 0.25 },
  spruce1985: { needle: 50, cone: 3 },
  calamity: { grass: 260, bramble: 1.1, willowherb: 1.8, stump: 0.5, log: 0.12, needle: 10 },
  snags: { grass: 140, willowherb: 1, log: 0.3, bramble: 0.5, needle: 15 },
  ravine: { fern: 1.8, moss: 1.6, rock: 0.7, chip: 25 },
  coppice: { chip: 35, grass: 14, moss: 0.3 },
  crag: { rock: 2.2, grass: 30, bilberry: 0.7, moss: 1 },
  alderCarr: { ladyFern: 1.3, sedge: 3, grass: 40 },
  meadow: { grass: 480, flower: 14 },
  orchard: { grass: 380, flower: 7 },
  farmstead: { grass: 140 },
  quarry: { rock: 1.8, grass: 40 },
};
export { SCATTER };

// tree height (m, the game's compressed vertical scale) and crown radius from DBH: illustrative allometry for
// rendering only, until the simulation provides sourced growth curves
const HMAX = { beech: 11, oak: 10, spruce: 13, pine: 11, birch: 9, alder: 9, ash: 10.5, sycamore: 10.5, lime: 10, hornbeam: 8, holly: 4.5, rowan: 6, goatWillow: 6, apple: 5, pear: 6 };
export const CONIFER = new Set(['spruce', 'pine']);
export function treeShape(t) {
  const v = t.v ?? 0.5, k = (a) => 1 + (v - 0.5) * 2 * a;   // each tree its own: about +-12 % height, +-18 % crown
  const hmax = HMAX[t.kind] ?? 9, h = (1.3 + (hmax - 1.3) * (1 - Math.exp(-t.dbh / 22))) * k(0.12);
  const r = (CONIFER.has(t.kind) ? 0.55 + t.dbh * 0.032 : Math.min(5.5, 1.1 + t.dbh * 0.055)) * k(-0.18);   // broadleaf crowns spread wide
  return { h: +h.toFixed(2), r: +r.toFixed(2) };
}

const tileSeed = (i, j) => ((E.seed * 73856093) ^ ((i + 1) * 19349663) ^ ((j + 1) * 83492791)) >>> 0 || 1;
const byTile = new Map();   // tile key -> trees (the generated estate's, until the simulation supplies its own)
// the simulation's trees replace the generated ones: give all of them, or just the 3 x 3 tiles a build needs
export function useTrees(trees) { byTile.clear(); for (const t of trees) { const k = `${Math.floor((t.x + HALF) / E.tile)},${Math.floor((t.z + HALF) / E.tile)}`; if (!byTile.has(k)) byTile.set(k, []); byTile.get(k).push(t); } byTile.set('_sim', []); }
export const tileTrees = (i, j) => byTile.get(`${i},${j}`) || [];

// the plan for tile (i, j); near = include ground cover (the renderer asks for near plans only for tiles close to the camera)
export function planTile(i, j, { near = true } = {}) {
  const est = generateEstate();
  if (!byTile.size) indexTrees(est);
  const x0 = -HALF + i * E.tile, z0 = -HALF + j * E.tile, tile = est.tiles[j * (E.size / E.tile) + i];
  const trees = (byTile.get(`${i},${j}`) || []).map((t) => ({ ...t, ...treeShape(t) }));
  const bespoke = tile.covers.map((c) => BESPOKE[c] && c).filter(Boolean);
  const charcoal = est.charcoal.filter(([x, z]) => x >= x0 && x < x0 + E.tile && z >= z0 && z < z0 + E.tile);
  const plan = { i, j, x0, z0, size: E.tile, covers: tile.covers, compartment: tile.compartment, bespoke, trees, charcoal, scatter: [] };
  if (!near) return plan;

  // ground cover: for every 2.5 m cell, the cover there sets what grows; counts are Poisson-ish from the densities
  const { rnd, rr } = createRng(tileSeed(i, j)), C = 2.5, area = C * C / 100;
  const nearTree = (x, z, r) => trees.some((t) => Math.hypot(t.x - x, t.z - z) < r);
  for (let a = 0; a < E.tile / C; a++) for (let b = 0; b < E.tile / C; b++) {
    const cx = x0 + (a + 0.5) * C, cz = z0 + (b + 0.5) * C, cover = coverAt(cx, cz), S = SCATTER[cover]; if (!S) continue;
    const patchy = 0.4 + 1.2 * fbm(cx * 0.08 + 3, cz * 0.08);   // clumped, not uniform
    for (const [type, per100] of Object.entries(S)) {
      let n = per100 * area * (type === 'grass' || type === 'chip' || type === 'needle' ? 1 : patchy);
      for (; n > 0; n -= 1) {
        if (n < 1 && rnd() > n) break;
        const x = cx + rr(-C / 2, C / 2), z = cz + rr(-C / 2, C / 2);
        if (pondW(x, z) > 0.1) continue;
        if ((type === 'stump' || type === 'log' || type === 'rock' || type === 'bramble') && nearTree(x, z, 0.8)) continue;
        plan.scatter.push({ type, x: +x.toFixed(2), z: +z.toFixed(2), s: +rr(0.75, 1.3).toFixed(2), r: +rnd().toFixed(3) });
      }
    }
  }
  return plan;
}
// Field grids for one tile, so dense ground cover can be generated quickly: heights every 0.5 m, cover and canopy
// shade (and nearness to spruce) every 1 m. Shade splats each crown within reach, as the plot's canopyShade does.
const CLOSURE = { spruce1985: 0.95, spruce1962: 0.88, ancient: 0.82, ravine: 0.85, coppice: 0.75, mixedSouth: 0.75, alderCarr: 0.6 };
export function tileFields(i, j) {
  const est = generateEstate(), x0 = -HALF + i * E.tile, z0 = -HALF + j * E.tile, T = E.tile;
  const HN = Math.round(T / 0.5) + 1, CN = Math.round(T);
  const h = new Float32Array(HN * HN), cover = new Uint8Array(CN * CN), shade = new Float32Array(CN * CN), spruce = new Float32Array(CN * CN);
  for (let b = 0; b < HN; b++) for (let a = 0; a < HN; a++) h[b * HN + a] = height(x0 + a * 0.5, z0 + b * 0.5);
  for (let b = 0; b < CN; b++) for (let a = 0; a < CN; a++) cover[b * CN + a] = COVER_IDS.indexOf(coverAt(x0 + a + 0.5, z0 + b + 0.5));
  if (!byTile.size) indexTrees(est);
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) for (const t of byTile.get(`${i + di},${j + dj}`) || []) {
    if (t.status === 'snag') continue;
    const { r } = treeShape(t), R = r * 1.45, conifer = CONIFER.has(t.kind);
    for (let b = Math.max(0, Math.floor(t.z - z0 - R)); b <= Math.min(CN - 1, Math.ceil(t.z - z0 + R)); b++) for (let a = Math.max(0, Math.floor(t.x - x0 - R)); a <= Math.min(CN - 1, Math.ceil(t.x - x0 + R)); a++) {
      const d = Math.hypot(x0 + a + 0.5 - t.x, z0 + b + 0.5 - t.z), k = b * CN + a, w = d < r * 0.4 ? 1 : d > R ? 0 : 1 - (d - r * 0.4) / (R - r * 0.4);
      if (w > shade[k]) shade[k] = w; if (conifer && w > spruce[k]) spruce[k] = w;
    }
  }
  // a stand closes its canopy collectively: each wooded cover has a closure, lowered only where the stand generator
  // thinned trees out into gaps (the same noise field as in index.js), so grass grows in the real gaps
  for (let b = 0; b < CN; b++) for (let a = 0; a < CN; a++) {
    const k = b * CN + a, cl = CLOSURE[COVER_IDS[cover[k]]]; if (!cl) continue;
    const x = x0 + a + 0.5, z = z0 + b + 0.5, clump = Math.min(1, Math.max(0, (fbm(x * 0.045 + 9, z * 0.045) - 0.3) / 0.4));
    const w = cl * (0.25 + 0.75 * clump); if (w > shade[k]) shade[k] = w;
    if (COVER_IDS[cover[k]].startsWith('spruce') && w > spruce[k]) spruce[k] = w;
  }
  const hAt = (x, z) => { const fx = Math.min(HN - 1.001, Math.max(0, (x - x0) / 0.5)), fz = Math.min(HN - 1.001, Math.max(0, (z - z0) / 0.5)), a = Math.floor(fx), b = Math.floor(fz), u = fx - a, v = fz - b;
    return (h[b * HN + a] * (1 - u) + h[b * HN + a + 1] * u) * (1 - v) + (h[(b + 1) * HN + a] * (1 - u) + h[(b + 1) * HN + a + 1] * u) * v; };
  const cell = (x, z) => Math.min(CN - 1, Math.max(0, Math.floor(z - z0))) * CN + Math.min(CN - 1, Math.max(0, Math.floor(x - x0)));
  return { x0, z0, size: T, HN, CN, h, cover, shade, spruce, hAt, coverAt: (x, z) => COVER_IDS[cover[cell(x, z)]], shadeAt: (x, z) => shade[cell(x, z)], spruceAt: (x, z) => spruce[cell(x, z)] };
}
function indexTrees(est) { for (const t of est.trees) { const k = `${Math.floor((t.x + HALF) / E.tile)},${Math.floor((t.z + HALF) / E.tile)}`; if (!byTile.has(k)) byTile.set(k, []); byTile.get(k).push(t); } }
export { COVERS, coverAt, height, slope };
