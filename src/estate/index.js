// The estate in data (world.md section 12, step E1): tiles, compartments, patches with their trees, charcoal
// platforms. Generated once from the seed in data/estate.json. Pure: no three.js, no DOM, so the simulation and
// the tests can use it, and the map view and the streaming 3D read it.
//
// Tree sizes and densities here are an illustrative starting state per cover type, not yet sourced parameters;
// growth and mortality with published gap-model parameters come with the simulation (roadmap step 1).
import { createRng } from '../core/random.js';
import { fbm } from '../core/noise.js';
import E from '../data/estate.json' with { type: 'json' };
import { HALF, height, slope, BROOKS, POND, pondW } from './terrain.js';
import { COVERS, COVER_IDS, coverAt, roadD } from './cover.js';

export { COVERS, COVER_IDS, coverAt, height, slope, BROOKS, POND, HALF };
export const TILES = E.size / E.tile, COMPS = E.size / E.compartment, PATCHES = E.size / E.patch;

// Starting stands, per cover: stems per hectare (trees >= 7 cm DBH), species mix, DBH range in cm, and age range.
// shape 'reverseJ' (many small, few big: uneven-aged) or 'even' (one cohort: plantations).
const STANDS = {
  ancient: { perHa: 230, mix: { beech: 0.74, oak: 0.2, holly: 0.06 }, dbh: [7, 110], age: [20, 260], shape: 'reverseJ' },
  mixedSouth: { perHa: 380, mix: { beech: 0.45, spruce: 0.3, oak: 0.15, sycamore: 0.1 }, dbh: [10, 55], age: [60, 75], shape: 'even' },
  spruce1962: { perHa: 560, mix: { spruce: 0.95, beech: 0.03, birch: 0.02 }, dbh: [16, 52], age: [64, 64], shape: 'even' },
  spruce1985: { perHa: 950, mix: { spruce: 0.97, birch: 0.02, rowan: 0.01 }, dbh: [8, 32], age: [41, 41], shape: 'even' },
  calamity: { perHa: 260, mix: { birch: 0.6, rowan: 0.25, goatWillow: 0.1, spruce: 0.05 }, dbh: [7, 12], age: [5, 8], shape: 'even', snagsPerHa: 6 },
  snags: { perHa: 40, mix: { birch: 0.7, rowan: 0.3 }, dbh: [7, 10], age: [5, 7], shape: 'even', snagsPerHa: 420 },
  ravine: { perHa: 300, mix: { sycamore: 0.35, ash: 0.25, lime: 0.2, beech: 0.2 }, dbh: [7, 80], age: [20, 180], shape: 'reverseJ' },
  coppice: { perHa: 520, mix: { hornbeam: 0.75, oak: 0.25 }, dbh: [7, 30], age: [70, 75], shape: 'even', standardsPerHa: 35 },
  crag: { perHa: 140, mix: { oak: 0.55, pine: 0.45 }, dbh: [7, 40], age: [40, 200], shape: 'reverseJ' },
  alderCarr: { perHa: 420, mix: { alder: 0.85, ash: 0.1, goatWillow: 0.05 }, dbh: [7, 45], age: [15, 80], shape: 'reverseJ' },
  orchard: { perHa: 70, mix: { apple: 0.65, pear: 0.35 }, dbh: [20, 50], age: [90, 125], shape: 'even' },
};
export { STANDS };

// tile, compartment and patch indices of a point
export const tileOf = (x, z) => [Math.floor((x + HALF) / E.tile), Math.floor((z + HALF) / E.tile)];
export const compOf = (x, z) => [Math.floor((x + HALF) / E.compartment), Math.floor((z + HALF) / E.compartment)];
export const compName = (i, j) => `${String.fromCharCode(65 + j)}${i + 1}`;   // rows A-H north to south, columns 1-8 west to east

let cache = null;
export function generateEstate() {
  if (cache) return cache;
  const rng = createRng(E.seed), { rnd, rr } = rng;
  const pick = (mix) => { let u = rnd(); for (const [k, p] of Object.entries(mix)) { if ((u -= p) <= 0) return k; } return Object.keys(mix)[0]; };

  // ---------- patches: cover (majority of a 4 x 4 sample), mean elevation and slope ----------
  const patches = [];
  for (let j = 0; j < PATCHES; j++) for (let i = 0; i < PATCHES; i++) {
    const x0 = -HALF + i * E.patch, z0 = -HALF + j * E.patch, votes = {};
    let hs = 0;
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) { const x = x0 + (a + 0.5) * E.patch / 4, z = z0 + (b + 0.5) * E.patch / 4, c = coverAt(x, z); votes[c] = (votes[c] || 0) + 1; hs += height(x, z); }
    const cover = Object.entries(votes).sort((p, q) => q[1] - p[1])[0][0];
    patches.push({ id: `p${i}-${j}`, i, j, x: x0 + E.patch / 2, z: z0 + E.patch / 2, cover, elevation: hs / 16, slope: slope(x0 + E.patch / 2, z0 + E.patch / 2, 6), mix: votes, trees: [] });
  }

  // ---------- trees: drawn per patch from its cover's starting stand; plot 01 keeps its own hand-placed trees ----------
  const trees = [];
  const okSpot = (x, z, cover) => coverAt(x, z) === cover && pondW(x, z) < 0.05 && roadD(x, z) > 3.5 && !Object.values(BROOKS).some((b) => !b.line.farFrom(x, z, 4) && b.line.near(x, z).d < 1.6);
  const add = (p, t) => { t.id = `e${trees.length}`; t.patch = p.id; trees.push(t); p.trees.push(t.id); };
  for (const p of patches) {
    const S = STANDS[p.cover]; if (!S) continue;
    const area = (E.patch * E.patch) / 1e4, n = Math.round(S.perHa * area * (0.8 + 0.4 * fbm(p.x * 0.01, p.z * 0.01)));
    for (let k = 0, tries = 0; k < n && tries < n * 14; tries++) {
      const x = p.x + rr(-0.5, 0.5) * E.patch, z = p.z + rr(-0.5, 0.5) * E.patch;
      if (rnd() > 0.15 + 0.85 * Math.min(1, Math.max(0, (fbm(x * 0.045 + 9, z * 0.045) - 0.3) / 0.4))) continue;   // clumps and gaps, not an even spread
      if (!okSpot(x, z, p.cover)) continue;
      const kind = pick(S.mix), u = rnd();
      // uneven-aged stands: many small, few big; planted stands: one cohort, but dominant, co-dominant and suppressed trees
      const dbh = S.shape === 'reverseJ' ? S.dbh[0] + (S.dbh[1] - S.dbh[0]) * u ** 2.2 : S.dbh[0] + (S.dbh[1] - S.dbh[0]) * Math.min(1, Math.max(0, 0.5 + (u + rnd() - 1) * 0.75));
      const age = S.shape === 'reverseJ' ? Math.round(S.age[0] + (S.age[1] - S.age[0]) * (dbh - S.dbh[0]) / (S.dbh[1] - S.dbh[0])) : Math.round(rr(S.age[0], S.age[1]));
      // v: this tree's own variation (height, crown, tint); a few spruce dying back (drought, beetles), more near the calamity
      const dying = kind === 'spruce' && rnd() < (p.cover === 'spruce1962' && Math.hypot(x - E.units.calamity.centre[0], z - E.units.calamity.centre[1]) < 230 ? 0.06 : 0.015);
      add(p, { kind, x, z, dbh: +dbh.toFixed(1), age, status: dying ? 'dying' : 'alive', v: +rnd().toFixed(3) }); k++;
    }
    for (let k = 0; k < Math.round((S.snagsPerHa || 0) * area); k++) { const x = p.x + rr(-0.5, 0.5) * E.patch, z = p.z + rr(-0.5, 0.5) * E.patch; if (okSpot(x, z, p.cover)) add(p, { kind: 'spruce', x, z, dbh: +rr(26, 44).toFixed(1), age: 64, status: 'snag' }); }
    for (let k = 0; k < Math.round((S.standardsPerHa || 0) * area); k++) { const x = p.x + rr(-0.5, 0.5) * E.patch, z = p.z + rr(-0.5, 0.5) * E.patch; if (okSpot(x, z, p.cover)) add(p, { kind: 'oak', x, z, dbh: +rr(55, 85).toFixed(1), age: Math.round(rr(150, 200)), status: 'alive', standard: true }); }
  }

  // ---------- charcoal platforms: flat terraces scattered through the ancient wood, never too close together ----------
  const charcoal = [];
  for (let k = 0; k < 4000 && charcoal.length < E.charcoal.count; k++) {
    const x = rr(-HALF + 20, HALF - 20), z = rr(-HALF + 20, HALF - 20);
    if (coverAt(x, z) !== 'ancient' || slope(x, z) > 0.25 || charcoal.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < E.charcoal.minSpacing)) continue;
    charcoal.push([+x.toFixed(1), +z.toFixed(1)]);
  }

  // ---------- compartments: 2 x 2 tiles; cover shares, stems, the dominant stand ----------
  const compartments = [];
  for (let j = 0; j < COMPS; j++) for (let i = 0; i < COMPS; i++) {
    const own = patches.filter((p) => Math.floor(p.i / 4) === i && Math.floor(p.j / 4) === j), share = {};
    for (const p of own) share[p.cover] = (share[p.cover] || 0) + 1 / own.length;
    const dominant = Object.entries(share).sort((a, b) => b[1] - a[1])[0][0];
    const stems = own.reduce((n, p) => n + p.trees.length, 0);
    compartments.push({ id: compName(i, j), i, j, x: -HALF + (i + 0.5) * E.compartment, z: -HALF + (j + 0.5) * E.compartment, areaHa: (E.compartment ** 2) / 1e4, dominant, share, stems, history: COVERS[dominant].history });
  }

  // ---------- tiles ----------
  const tiles = [];
  for (let j = 0; j < TILES; j++) for (let i = 0; i < TILES; i++) {
    const own = patches.filter((p) => Math.floor(p.i / 2) === i && Math.floor(p.j / 2) === j);
    tiles.push({ i, j, x: -HALF + (i + 0.5) * E.tile, z: -HALF + (j + 0.5) * E.tile, covers: [...new Set(own.map((p) => p.cover))], compartment: compName(Math.floor(i / 2), Math.floor(j / 2)), plot01: i === E.plot.tile[0] && j === E.plot.tile[1] });
  }

  cache = { seed: E.seed, tiles, compartments, patches, trees, charcoal, pond: POND };
  return cache;
}
