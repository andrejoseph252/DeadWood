// Tree layout of the Stage A map: the hand-placed trees around the gap (data/plot01.json) plus stands generated
// from the habitat rules in docs/world.md (sections 3, 5 and 10/S3). Pure and seeded with its own stream
// (map.layoutSeed), so the forest does not move when a render builder changes how many random numbers it draws.
//
// Every tree is a record { id, kind, x, z, h, r, ... } before it is a mesh; the simulation will own these later.
// Heights are in the prototype's compressed vertical scale (a veteran beech is ~10 m here, ~32 m in reality),
// which keeps crowns readable from the map camera. Optional fields:
//   dead (rust-brown crown), ivy, crownBase (fraction of height where a conifer crown starts),
//   stems (extra stems of a coppice stool), thin (0..1 crown loss, e.g. ash dieback), clumps (crown clump count)
// Stumps from the 1990s thinning are separate records in STUMPS.
import { createRng } from '../core/random.js';
import plot from '../data/plot01.json' with { type: 'json' };
import fauna from '../data/fauna.json' with { type: 'json' };
import { MAP, HALF, SPOTS, inside, gapW, pathW, habitatW, wallX, streamD, STREAM, charcoalW, settBankW, outcropEdge, outcropW, PLATES, SPRING } from './fields.js';

// the animals' routes as segments { x, z, dx, dz, len } for corridor checks
const ROUTES = [[fauna.species.deer.stops, false], [fauna.species.fox.route, true], [fauna.species.badger.route, false]].flatMap(([pts, loop]) => {
  const all = loop ? [...pts, pts[0]] : pts;
  return all.slice(1).map(([x1, z1], i) => { const [x, z] = all[i], len = Math.hypot(x1 - x, z1 - z); return { x, z, dx: (x1 - x) / len, dz: (z1 - z) / len, len }; });
});

export function generateLayout(seed = MAP.layoutSeed) {
  const { rnd, rr } = createRng(seed);
  const trees = plot.trees.map((t) => ({ ...t }));
  const stumps = [];
  const free = (x, z, r, f = 0.8) => trees.every((t) => Math.hypot(t.x - x, t.z - z) > Math.max(1.2, (t.r + r) * f));
  const keepIn = (x, z, r) => inside(x, z, Math.max(1.2, r * 0.45));
  // open ground kept for the boar's wallow and rooting patch, where the sow, piglets and robin move, and corridors
  // along the animals' routes (data/fauna.json), so a reshuffled forest never puts a trunk in an animal's way
  const clearOf = (x, z) => Math.hypot(x - SPOTS.boar[0], z - SPOTS.boar[1]) > 3.6 && pathW(x, z) < 0.05 && ROUTES.every((s) => segD(x, z, s) > 1.1) && streamD(x, z) > 1.0 && Math.abs(x - wallX(z)) > 1.1 && settBankW(x, z) < 0.05
    && Math.hypot(x - MAP.antMound.x, z - MAP.antMound.z) > 1.6 && PLATES.every((p) => Math.hypot(x - p.x, z - p.z) > p.r + 1.2 && segD(x, z, p) > 0.9);

  // H2 spruce plantation (1962): rows N-S, 2 m planting thinned in the 1990s to ~2.2 x 2.6 m, gaps where trees died.
  // Trees near the windthrow edge are beetle-killed: recent ones keep a rust-brown crown, older ones are grey snags.
  for (let x = 13.7; x < HALF - 0.8; x += 2.6) {
    for (let z = -HALF + 1.2; z < MAP.zones.plantationSouth - 0.6; z += 2.2) {
      const tx = x + rr(-0.25, 0.25), tz = z + rr(-0.2, 0.2);
      if (tx < wallX(tz) + 1.6 || !clearOf(tx, tz)) continue;
      if (habitatW(tx, tz)[1] < 0.3) continue;
      const edge = tz > MAP.zones.plantationSouth - 5.5, roll = rnd();
      if (roll < 0.14) { stumps.push({ x: tx, z: tz, r: rr(0.16, 0.22), rot: rnd() < 0.35 }); continue; }   // thinned, some with root rot
      if (edge && roll < 0.3) { trees.push({ kind: 'snag', x: tx, z: tz, h: rr(7.5, 10), r: 0, spruce: true }); continue; }
      trees.push({ kind: 'spruce', x: tx, z: tz, h: rr(11.5, 13.5), r: rr(1.5, 1.8), crownBase: 0.48, dead: edge && roll < 0.5, plantation: true });
    }
  }

  // H4 alder and ash along the stream banks, alternating sides; one ash shows dieback.
  let side = 1, ash = 0;
  for (let i = 0, d = 1.5; i < STREAM.length - 1; i++) {
    const [x0, z0] = STREAM[i], [x1, z1] = STREAM[i + 1], len = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
    for (; d < len; d += rr(3.0, 4.2)) {
      const off = rr(1.3, 2.0) * side; side = -side;
      const x = x0 + (x1 - x0) * d / len + nx * off, z = z0 + (z1 - z0) * d / len + nz * off;
      const isAsh = rnd() < 0.25 && ash < 3, r = isAsh ? rr(2.8, 3.2) : rr(2.3, 2.8);
      if (!keepIn(x, z, r) || outcropW(x, z) > 0.1 || gapW(x, z) > 0.3 || pathW(x, z) > 0.05 || !free(x, z, r, 0.7)) continue;
      if (isAsh) ash++;
      trees.push(isAsh ? { kind: 'ash', x, z, h: rr(9.5, 10.5), r, thin: ash === 1 ? 0.45 : 0.15 } : { kind: 'alder', x, z, h: rr(8, 9.5), r });
    }
    d -= len;
  }

  // H1 old beech-oak stand: veterans with wide spacing, the odd oak (ivy on half of them), two coppice stools.
  let coppice = 0;
  for (let i = 0; i < 6000; i++) {
    const x = rr(-HALF + 1, HALF - 1), z = rr(-HALF + 1, HALF - 1), r = rr(3.8, 4.8);
    if (habitatW(x, z)[0] < 0.7 || charcoalW(x, z) > 0.2 || !clearOf(x, z) || !keepIn(x, z, r) || !free(x, z, r, 0.9)) continue;
    if (Math.hypot(x - plot.gap.x, z - plot.gap.z) < plot.gap.r + r * 0.7) continue;   // crowns stay off the gap
    const oak = rnd() < 0.18, far = Math.hypot(x - plot.gap.x, z - plot.gap.z) > 13;
    const t = { kind: oak ? 'oak' : 'beech', x, z, h: rr(9.5, 11.5), r };
    if (oak && rnd() < 0.5) t.ivy = true;
    if (!oak && far && coppice < 4) { t.stems = 2 + (coppice % 2); coppice++; }
    trees.push(t);
  }
  // holly in the understorey of the beech stand
  for (let i = 0, n = 0; i < 2000 && n < 12; i++) {
    const x = rr(-HALF + 1, wallX(0) - 2), z = rr(-HALF + 1, HALF - 1), r = rr(1.2, 1.6);
    if (habitatW(x, z)[0] < 0.7 || gapW(x, z) > 0.1 || charcoalW(x, z) > 0.1 || !clearOf(x, z) || !keepIn(x, z, r)) continue;
    if (!trees.every((t) => Math.hypot(t.x - x, t.z - z) > (t.kind === 'holly' ? 3 : 1.6))) continue;
    trees.push({ kind: 'holly', x, z, h: rr(3.4, 4.6), r }); n++;
  }

  // H5 pioneer edge (former pasture, never planted): birch, rowan and a young oak.
  for (let i = 0, n = 0; i < 1500 && n < 15; i++) {
    const x = rr(wallX(15) + 1.2, HALF - 1), z = rr(MAP.zones.windthrowSouth, MAP.zones.hedgeNorth - 1);
    const kind = n % 3 === 1 ? 'rowan' : n === 5 ? 'oak' : 'birch';
    const r = kind === 'birch' ? rr(1.8, 2.2) : kind === 'rowan' ? rr(1.4, 1.7) : 2.2;
    if (habitatW(x, z)[4] < 0.55 || !clearOf(x, z) || !keepIn(x, z, r) || !free(x, z, r, 0.9)) continue;
    trees.push({ kind, x, z, h: kind === 'birch' ? rr(7, 8.8) : kind === 'rowan' ? rr(4.5, 5.5) : 5.5, r }); n++;
  }
  // H7 regrowth in the windthrow: a few young birches
  for (let i = 0, n = 0; i < 1000 && n < 7; i++) {
    const x = rr(wallX(5) + 1.5, HALF - 1), z = rr(MAP.zones.plantationSouth + 1, MAP.zones.windthrowSouth - 1), r = rr(1.2, 1.5);
    if (habitatW(x, z)[6] < 0.6 || !clearOf(x, z) || !keepIn(x, z, r) || !free(x, z, r, 1)) continue;
    trees.push({ kind: 'birch', x, z, h: rr(4.5, 5.5), r }); n++;
  }
  // H6 stunted oaks on the outcrop top
  for (let i = 0, n = 0; i < 800 && n < 5; i++) {
    const z = rr(MAP.outcrop.zStart + 3, HALF - 2), x = rr(-HALF + 1.4, outcropEdge(z) - 1.2), r = rr(1.9, 2.3);
    if (outcropW(x, z) < 0.9 || Math.hypot(x - SPRING.x, z - SPRING.z) < 3 || !free(x, z, r, 1)) continue;
    trees.push({ kind: 'oak', x, z, h: rr(4.6, 5.4), r, stunted: true }); n++;
  }

  trees.forEach((t, i) => { t.id = `t${String(i + 1).padStart(3, '0')}`; if (t.kind !== 'snag') t.tag = i + 1; });
  return { trees, stumps };
}

// distance from (x, z) to a segment { x, z, dx, dz (unit), len }: a windthrown trunk or a route leg
function segD(x, z, p) {
  const t = Math.max(0, Math.min(p.len, (x - p.x) * p.dx + (z - p.z) * p.dz));
  return Math.hypot(x - p.x - p.dx * t, z - p.z - p.dz * t);
}
