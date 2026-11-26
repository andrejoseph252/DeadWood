// Land cover of the estate: what stands where and why (world.md sections 4 and 12). Each cover type carries its
// history and the habitat code (H1-H7, world.md section 5) it renders as. Pure.
import { fbm, vnoise, sstep } from '../core/noise.js';
import E from '../data/estate.json' with { type: 'json' };
import { HALF, height, slope, pondW, brookNear, ridgeLine, ridgeSide, polyline, BROOKS } from './terrain.js';

// id: { name, habitat, history }
export const COVERS = {
  ancient: { name: 'Ancient beech–oak wood', habitat: 'H1', history: 'continuously wooded for centuries; coppiced for charcoal c. 1700–1860' },
  mixedSouth: { name: 'Beech–oak with spruce, 1950s', habitat: 'H1', history: 'woodland cut over after 1945 and regrown, with planted spruce' },
  spruce1962: { name: 'Spruce plantation, 1962', habitat: 'H2', history: 'pasture until the 1950s; planted 1962, thinned in the 1990s' },
  spruce1985: { name: 'Spruce plantation, 1985', habitat: 'H2', history: 'pasture, then planted 1985; first thinning 2008' },
  calamity: { name: 'Bark-beetle calamity clearing', habitat: 'H7', history: '1962 spruce killed by drought and Ips typographus 2019–22; salvage-logged 2020–22, birch and rowan regrowth' },
  snags: { name: 'Standing dead spruce (left unlogged)', habitat: 'H7', history: 'part of the calamity area kept as a dead-wood reserve' },
  ravine: { name: 'Ravine forest', habitat: 'H1', history: 'steep gorge never cleared; sycamore, ash and lime on unstable slopes' },
  coppice: { name: 'Oak coppice-with-standards', habitat: 'H1', history: 'hornbeam and oak cut for firewood every 20–30 years until 1950, under big oak standards' },
  crag: { name: 'Crag and dry oak–pine', habitat: 'H6', history: 'sandstone cliffs and crest; thin acid soil never worth clearing' },
  alderCarr: { name: 'Alder carr', habitat: 'H4', history: 'waterlogged valley floor; black alder on tussocks' },
  pond: { name: 'Beaver pond', habitat: 'H4', history: 'flooded since beavers dammed the brook in 2016' },
  meadow: { name: 'Hay meadow', habitat: 'H5', history: 'mown since the farm was cleared; now cut once a year by the station' },
  orchard: { name: 'Old orchard', habitat: 'H5', history: 'apple and pear planted c. 1900, unpruned since the 1950s' },
  farmstead: { name: 'Field station', habitat: 'H5', history: 'the last farm, given up in the 1950s; the station took it over' },
  quarry: { name: 'Old sandstone quarry', habitat: 'H6', history: 'building stone until 1930; faces, spoil and a pond' },
  plot01: { name: 'Plot 01 (research plot)', habitat: 'H3', history: 'the station\'s permanent plot: see world.md sections 1–9' },
};
export const COVER_IDS = Object.keys(COVERS);

// noise-perturbed ellipse membership: 1 inside, 0 outside
function blob(u, x, z, wobble = 0.22) {
  const c = Math.cos(u.yaw || 0), s = Math.sin(u.yaw || 0), dx = x - u.centre[0], dz = z - u.centre[1];
  return Math.hypot((dx * c + dz * s) / u.rx, (-dx * s + dz * c) / u.rz) + (fbm(x * 0.012 + u.centre[0] * 0.01, z * 0.012) - 0.5) * wobble * 2;
}
export const wallLineX = (z) => E.wallLine.x0 + E.wallLine.amp * Math.sin(z * E.wallLine.freq) * sstep(40, 140, Math.abs(z - 31));   // straight through Plot 01, wandering beyond it
const U = E.units;
const gorge = polyline(E.brooks.gorge.points);
const main = polyline(E.brooks.main.points);
const roads = Object.values(E.roads).filter(Array.isArray).map(polyline);
export const roadD = (x, z) => Math.min(...roads.map((r) => (r.farFrom(x, z, 20) ? Infinity : r.near(x, z).d)));

// the cover at (x, z); the first rule that matches wins
export function coverAt(x, z) {
  const [px, pz] = E.plot.origin, t = E.tile;
  if (Math.abs(x - px) < t / 2 && Math.abs(z - pz) < t / 2) return 'plot01';
  if (pondW(x, z) > 0.5) return 'pond';
  if (blob(U.quarry, x, z) < 1) return 'quarry';
  // the farm clearing: buildings, orchard, meadows
  if (blob(U.farmstead, x, z) < 1) {
    if (Math.hypot(x - U.farmstead.buildings[0], z - U.farmstead.buildings[1]) < 26) return 'farmstead';
    if (Math.hypot(x - U.farmstead.orchard.centre[0], z - U.farmstead.orchard.centre[1]) + (vnoise(x * 0.05, z * 0.05) - 0.5) * 16 < U.farmstead.orchard.r) return 'orchard';
    return 'meadow';
  }
  // crags: the ridge's south-east face and crest
  const { d: rd } = ridgeLine.near(x, z), side = ridgeSide(x, z);
  // crags: the cliff band where the ridge's face is steep, and patchy bare rock along the crest
  if (x < -90 && rd < 130 && (slope(x, z) > 0.3 || (side < -12 && rd < 60 && fbm(x * 0.025 + 7, z * 0.025) > 0.52))) return 'crag';
  if (!gorge.farFrom(x, z, 60) && gorge.near(x, z).d < 42 + (vnoise(x * 0.03, z * 0.03) - 0.5) * 16 && z < 10) return 'ravine';
  if (blob(U.coppice, x, z) < 1) return 'coppice';
  // wet valley floor along the main brook (east of the gorge) and around the pond
  // wet valley floor: ground less than ~2.5 m above the main brook's bed, east of the gorge, and the pond's rim
  const mb = main.near(x, z);
  if (x > -200 && ((mb.d < 45 && height(x, z) - BROOKS.main.bedAt(mb.s) < 2.4 + (vnoise(x * 0.03, z * 0.03) - 0.5) * 1.6) || pondW(x, z) > 0.05)) return 'alderCarr';
  // north of the brook: the old wall line separates ancient wood (west) from former pasture (east)
  const northOfBrook = z < mainZ(x) - 10;
  if (northOfBrook && x > wallLineX(z) + (fbm(x * 0.02, z * 0.02) - 0.5) * 4) {
    if (blob(U.calamity, x, z) < 1) return Math.hypot(x - U.calamity.snags.centre[0], z - U.calamity.snags.centre[1]) < U.calamity.snags.r ? 'snags' : 'calamity';
    return z < -60 + (fbm(x * 0.01, z * 0.01) - 0.5) * 60 ? 'spruce1962' : 'spruce1985';
  }
  if (northOfBrook) return 'ancient';
  return x > -40 + (fbm(x * 0.008 + 5, z * 0.008) - 0.5) * 120 ? 'mixedSouth' : 'ancient';
}
// z of the main brook at a given x (it runs west to east)
const MAIN_PTS = E.brooks.main.points;
export function mainZ(x) {
  for (let i = 1; i < MAIN_PTS.length; i++) { const [x0, z0] = MAIN_PTS[i - 1], [x1, z1] = MAIN_PTS[i]; if (x <= x1) return z0 + (z1 - z0) * Math.max(0, Math.min(1, (x - x0) / (x1 - x0))); }
  return MAIN_PTS[MAIN_PTS.length - 1][1];
}
export { HALF, height, brookNear };
