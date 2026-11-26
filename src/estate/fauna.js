// Animals across the estate (world.md section 12, E3): populations as data. Each animal has a home range on
// walkable ground and moves all the time; the renderer gives it a rig only when the camera is near. Pure: no
// three.js. Plot 01 keeps its own scripted animals, so estate animals stay out of its square.
//
// Numbers are a plausible June population for 100 ha of this kind of forest (roe deer ~10-20 per km², one boar
// sounder passing through, a second badger sett, a fox pair); illustrative until the simulation drives them.
import { createRng } from '../core/random.js';
import E from '../data/estate.json' with { type: 'json' };
import { generateEstate, coverAt, height, slope } from './index.js';
import { BROOKS, POND, pondW, inPlot, HALF } from './terrain.js';

// trunks bucketed by patch for quick collision checks
let trunkGrid = null;
function trunks() {
  if (trunkGrid) return trunkGrid;
  trunkGrid = new Map();
  for (const t of generateEstate().trees) { const k = `${Math.floor((t.x + HALF) / E.patch)},${Math.floor((t.z + HALF) / E.patch)}`; if (!trunkGrid.has(k)) trunkGrid.set(k, []); trunkGrid.get(k).push(t); }
  return trunkGrid;
}

// where an estate animal can stand. opts: { swim } for the beaver (the pond only)
export function walkable(x, z, { r = 0.3, swim = false } = {}) {
  if (Math.abs(x) > HALF - 20 || Math.abs(z) > HALF - 20) return false;
  if (swim) return pondW(x, z) > 0.7;
  if (inPlot(x, z, -3) || pondW(x, z) > 0.1 || slope(x, z) > 0.6) return false;
  for (const b of Object.values(BROOKS)) if (!b.line.farFrom(x, z, 3) && b.line.near(x, z).d < b.halfWidth + r) return false;
  const pi = Math.floor((x + HALF) / E.patch), pj = Math.floor((z + HALF) / E.patch), g = trunks();
  for (let a = pi - 1; a <= pi + 1; a++) for (let b = pj - 1; b <= pj + 1; b++) for (const t of g.get(`${a},${b}`) || []) if (Math.hypot(t.x - x, t.z - z) < t.dbh / 200 + r) return false;
  return true;
}
export function lineWalkable([x0, z0], [x1, z1], opts) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 1));
  for (let k = 1; k <= n; k++) if (!walkable(x0 + (x1 - x0) * k / n, z0 + (z1 - z0) * k / n, opts)) return false;
  return true;
}

// species: rig kind, speed (m/s), range (m), preferred covers, group makeup
const POPS = [
  { species: 'deer', groups: [['doe', 'fawn'], ['doe', 'fawn'], ['doe', 'fawn', 'fawn'], ['buck'], ['buck'], ['yearling', 'yearling'], ['doe', 'fawn']], speed: 0.8, range: 110, covers: ['calamity', 'meadow', 'mixedSouth', 'orchard', 'snags', 'coppice'] },
  { species: 'boar', groups: [['sow', 'piglet', 'piglet', 'piglet', 'piglet', 'piglet', 'yearling', 'yearling']], speed: 0.45, range: 160, covers: ['alderCarr', 'mixedSouth', 'spruce1985'] },
  { species: 'badger', groups: [['badger', 'badger', 'badger']], speed: 0.45, range: 120, covers: ['ancient'], sett: true },
  { species: 'fox', groups: [['fox'], ['fox']], speed: 1.4, range: 220, covers: ['meadow', 'calamity', 'mixedSouth', 'ancient'] },
  { species: 'hare', groups: [['hare'], ['hare'], ['hare'], ['hare']], speed: 1.2, range: 50, covers: ['meadow', 'orchard', 'calamity'] },
  { species: 'squirrel', groups: [['squirrel'], ['squirrel'], ['squirrel'], ['squirrel'], ['squirrel'], ['squirrel']], speed: 1.5, range: 25, covers: ['spruce1962', 'spruce1985', 'mixedSouth', 'ancient'] },
  { species: 'beaver', groups: [['beaver', 'beaver', 'kit', 'kit']], speed: 0.5, range: 40, covers: ['pond'], swim: true },
  { species: 'buzzard', groups: [['buzzard'], ['buzzard']], speed: 4, range: 140, covers: ['meadow', 'calamity'], flies: true },
];
export { POPS };

let cache = null;
export function generateFauna() {
  if (cache) return cache;
  const { rnd, rr } = createRng(E.seed + 77), animals = [];
  const findHome = (covers, swim) => {
    for (let k = 0; k < 5000; k++) {
      const x = swim ? POND.centre[0] + rr(-POND.rx, POND.rx) * 0.6 : rr(-HALF + 40, HALF - 40), z = swim ? POND.centre[1] + rr(-POND.rz, POND.rz) * 0.6 : rr(-HALF + 40, HALF - 40);
      if ((swim || covers.includes(coverAt(x, z))) && walkable(x, z, { swim })) return [x, z];
    }
    throw new Error(`no home for ${covers}`);
  };
  for (const P of POPS) {
    for (const members of P.groups) {
      const [hx, hz] = findHome(P.covers, P.swim), gid = `${P.species}${animals.length}`;
      members.forEach((role, m) => {
        let x = hx, z = hz;
        for (let k = 0; k < 40 && m > 0; k++) { const a = rnd() * 6.28, d = rr(0.8, 2.5); if (walkable(hx + Math.cos(a) * d, hz + Math.sin(a) * d, { swim: P.swim })) { x = hx + Math.cos(a) * d; z = hz + Math.sin(a) * d; break; } }
        animals.push({ id: `a${animals.length}`, species: P.species, role, group: gid, leader: m === 0, home: [+hx.toFixed(1), +hz.toFixed(1)], range: P.range, speed: P.speed, swim: !!P.swim, flies: !!P.flies, x, z, seed: Math.floor(rnd() * 1e9) });
      });
    }
  }
  cache = animals;
  return animals;
}
export { height };
