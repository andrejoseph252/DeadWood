// Small details that make each habitat recognisable up close (Setting Build S4, from docs/stage-a-details.md),
// and the hand-placed micro-scenes. Scene is June. Zoom-only details are kept sparse so they don't turn into
// stray pixels in the overview.
import * as THREE from 'three';
import { fbm } from '../core/noise.js';
import { C, toon, tm } from '../render/materials.js';
import { makeRock } from '../world/props.js';
import { trunkR } from './trees.js';
import { HALF, MAP, TREES, PLATES, SETT, SPRING, BACKWATER, height, sample, habitatW, canopyShade, pathW, channelW, streamNear, waterAt, wallX,
  outcropW, outcropEdge, charcoalW, gapW, GAP, meadowW } from '../world/plot.js';

const flat = (w, l) => { const g = new THREE.PlaneGeometry(w, l); g.rotateX(-Math.PI / 2); return g; };
const stick = (r0, r1) => { const g = new THREE.CylinderGeometry(r1, r0, 1, 5); g.translate(0, 0.5, 0); return g; };
const halfDisc = (r) => { const g = new THREE.SphereGeometry(r, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.35, 0.8); return g; };

export function buildDetails(ctx) {
  const { scene, rng, tex, instances, sprites } = ctx;
  const { rnd, rr, pick } = rng;
  const L = { molehills: [], flatLeaf: [], lime: [], dust: [], roots: [], limbs: [], brackets: [], cushions: [], tufts: [], tuftTops: [], umbels: [], marigold: [], ivy: [], cones: [], scales: [], cores: [], dark: [], mudBand: [] };
  const veterans = TREES.filter((t) => (t.kind === 'beech' || t.kind === 'oak') && t.h > 8);

  // ---------- H1 old beech-oak stand ----------
  // root buttresses with moss collars on the veterans
  for (const t of veterans) {
    const gy = height(t.x, t.z), n = t.kind === 'beech' ? 6 : 4;
    for (let k = 0; k < n; k++) { const a = k / n * 6.28 + rr(-0.3, 0.3); L.roots.push({ x: t.x, y: gy + 0.05, z: t.z, ry: -a, rz: -1.42, sx: 1.4, sy: rr(0.9, 1.4), sz: 1.4, c: t.kind === 'beech' ? '#8d917f' : '#5b4935' }); }
  }
  // fallen limbs in the stand, greying and mossy, with turkey tail (Trametes versicolor) tiers on some
  for (let i = 0, n = 0; i < 400 && n < 9; i++) {
    const [x, z] = sample(rng, 2); const w = habitatW(x, z);
    if (w[0] < 0.7 || canopyShade(x, z) < 0.5 || pathW(x, z) > 0.1 || charcoalW(x, z) > 0.2) continue;
    const a = rnd() * 6.28, len = rr(2, 4.5), r = rr(0.07, 0.14), gy = height(x, z);
    L.limbs.push({ x, y: gy + r * 0.6, z, ry: -a, rz: -Math.PI / 2, sx: r / 0.1, sy: len, sz: r / 0.1, c: pick(['#5a4632', '#77705f', '#8a857a']) });
    if (n % 3 === 0) for (let k = 0; k < 4; k++) { const d = len * (0.3 + k * 0.1); L.brackets.push({ x: x + Math.cos(a) * d, y: height(x + Math.cos(a) * d, z + Math.sin(a) * d) + r * 0.9, z: z + Math.sin(a) * d + 0.06, ry: -a, s: rr(0.8, 1.1), c: pick(['#6b5a4a', '#a89a84', '#3e3a36']) }); }
    n++;
  }
  // sterile ivy carpeting the ground around the ivy-clad oaks
  for (const t of TREES.filter((t) => t.ivy)) for (let k = 0; k < 70; k++) {
    const a = rnd() * 6.28, d = rr(0.5, 2.6), x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
    if (pathW(x, z) > 0.2 || channelW(x, z) > 0.05) continue;
    L.ivy.push({ x, y: height(x, z) + 0.02, z, c: pick(['#24451f', '#2f5628', '#3a6630']), s: rr(0.16, 0.24) });
  }
  // the black woodpecker's oval hole, high in the biggest beech away from the gap (stock doves use it)
  { const big = veterans.filter((t) => t.kind === 'beech' && Math.hypot(t.x - GAP.x, t.z - GAP.z) > 11).sort((a, b) => b.h - a.h)[0];
    if (big) { const r = trunkR(big) * 0.75, a = 2.2, hole = new THREE.Mesh(new THREE.CircleGeometry(0.07, 8), tm('#1a1410')); hole.scale.set(1, 1.35, 1); hole.position.set(big.x + Math.cos(a) * r, height(big.x, big.z) + big.h * 0.5, big.z + Math.sin(a) * r); hole.rotation.y = Math.PI / 2 - a; scene.add(hole); } }

  // ---------- H2 spruce plantation ----------
  const plant = TREES.filter((t) => t.plantation);
  // Polytrichum moss carpets and wavy hair-grass (flowering, bronze tips) in the lighter spots
  for (let i = 0, n = 0; i < 1500 && n < 22; i++) { const [x, z] = sample(rng, 0.8); if (habitatW(x, z)[1] < 0.6 || fbm(x * 0.5 + 70, z * 0.5) < 0.6 || pathW(x, z) > 0.1) continue; L.cushions.push({ x, y: height(x, z) - 0.04, z, sx: rr(1.5, 3.5), sy: 0.3, sz: rr(1.5, 3.5), ry: rnd() * 6, c: pick(['#2f5a2a', '#3d6a2c']) }); n++; }
  const tuft = (x, z) => { const s = rr(0.5, 0.8), gy = height(x, z); L.tufts.push({ x, y: gy, z, ry: rnd() * 6.28, s, c: pick(['#6f7a3a', '#8a8f48']) }); L.tuftTops.push({ x: x + rr(-0.05, 0.05), y: gy + 0.24 * s, z: z + rr(-0.05, 0.05), s: 0.12, c: pick(['#8a6a5a', '#9a7a62']) }); };
  for (let i = 0, n = 0; i < 3000 && n < 70; i++) {
    const [x, z] = sample(rng, 0.6), w = habitatW(x, z);
    const ok = (w[1] > 0.5 && canopyShade(x, z) < 0.75 && fbm(x * 0.6 + 80, z * 0.6) > 0.55) || (outcropW(x, z) > 0.9 && fbm(x * 0.7, z * 0.7 + 3) > 0.5) || (charcoalW(x, z) > 0.6 && rnd() < 0.5);
    if (!ok || pathW(x, z) > 0.15) continue; tuft(x, z); n++;
  }
  // resin runs on a few trunks; boring dust and fresh woodpecker flaking on the beetle-killed (rust-crowned) trees
  for (const t of plant) {
    const gy = height(t.x, t.z), r = trunkR(t) * 0.85;
    if (rnd() < 0.18) { const a = rnd() * 6.28; L.dark.push({ x: t.x + Math.cos(a) * r, y: gy + rr(0.6, 1.6), z: t.z + Math.sin(a) * r, ry: Math.PI / 2 - a, sx: 0.5, sy: rr(1, 1.8), sz: 1, c: '#d9b25a' }); }
    if (t.dead) {
      for (let k = 0; k < 12; k++) { const a = rnd() * 6.28, d = rr(r, r + 0.35); L.dust.push({ x: t.x + Math.cos(a) * d, y: height(t.x, t.z) + 0.03, z: t.z + Math.sin(a) * d, ry: rnd() * 6, s: rr(0.6, 1), c: '#9a6a3c' }); }
      for (let k = 0; k < 4; k++) { const a = rnd() * 6.28; L.dark.push({ x: t.x + Math.cos(a) * r, y: gy + rr(1.5, 5), z: t.z + Math.sin(a) * r, ry: Math.PI / 2 - a, sx: rr(1, 1.6), sy: rr(1.5, 2.5), sz: 1, c: pick(['#b0703a', '#c98a4a']) }); }
    }
  }
  // the boar rubbing tree: the plantation spruce nearest the deer path, mud band at knee height
  { const rub = plant.filter((t) => !t.dead).reduce((b, t) => (pathW(t.x, t.z + 1) + pathW(t.x, t.z + 2) > pathW(b.x, b.z + 1) + pathW(b.x, b.z + 2) || Math.abs(t.z) < Math.abs(b.z) ? t : b), plant[0]);
    if (rub) { const gy = height(rub.x, rub.z), r = trunkR(rub) * 0.8 + 0.03; const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, 0.5, 9, 1, true), toon({ color: C('#6a5a44'), side: THREE.DoubleSide })); band.position.set(rub.x, gy + 0.55, rub.z); scene.add(band);
      for (let k = 0; k < 14; k++) { const a = rnd() * 6.28, d = rr(r, r + 0.7); L.dust.push({ x: rub.x + Math.cos(a) * d, y: height(rub.x + Math.cos(a) * d, rub.z + Math.sin(a) * d) + 0.03, z: rub.z + Math.sin(a) * d, ry: rnd() * 6, s: rr(1.2, 2), c: pick(['#4e3825', '#3e3022']) }); } } }

  // ---------- H3 gap rim ----------
  // first-year foxglove rosettes in the half-shade of the rim (flat leaves radiating from a centre)
  for (let i = 0, n = 0; i < 800 && n < 9; i++) {
    const [x, z] = sample(rng, 1), g = gapW(x, z); if (g < 0.3 || g > 0.7 || pathW(x, z) > 0.1) continue;
    const gy = height(x, z); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28 + rr(-0.2, 0.2); L.flatLeaf.push({ x: x + Math.cos(a) * 0.1, y: gy + 0.04, z: z + Math.sin(a) * 0.1, ry: Math.PI / 2 - a, rx: -0.15, sx: 1, sy: 1, sz: rr(0.9, 1.3), c: pick(['#5f8a3a', '#557d33']) }); } n++;
  }

  // ---------- H4 spring and stream ----------
  // opposite-leaved golden saxifrage: lime mats on the wet flush below the spring and along the water's edge
  for (let i = 0, n = 0; i < 4000 && n < 170; i++) {
    const near = rnd() < 0.55, [x, z] = near ? [SPRING.x + rr(-1.5, 3.5), SPRING.z + rr(-1, 3.5)] : sample(rng, 0.5);
    const { d } = streamNear(x, z); if (d < 0.45 || d > (near ? 3 : 1.1) || channelW(x, z) > 0.2 || pathW(x, z) > 0.1 || outcropW(x, z) > 0.3 || fbm(x * 1.2 + 90, z * 1.2) < 0.5) continue;
    L.lime.push({ x, y: height(x, z) + 0.015, z, ry: rnd() * 6, s: rr(0.8, 1.6), c: pick(['#9aa83a', '#b8b84a', '#a8b040']) }); n++;
  }
  // marsh marigold, leaves only in June, at the spring
  for (let k = 0; k < 5; k++) { const cx = SPRING.x + rr(-0.4, 2.2), cz = SPRING.z + rr(0.6, 2.2); if (channelW(cx, cz) > 0.3) continue; for (let j = 0; j < 7; j++) { const x = cx + rr(-0.18, 0.18), z = cz + rr(-0.18, 0.18); L.marigold.push({ x, y: height(x, z) + 0.03, z, c: pick(['#3f7a2a', '#4f8a30']), s: rr(0.22, 0.3) }); } }
  // ramsons dying back on the moist banks: yellowing flattened leaves, a few seed heads
  for (let p = 0; p < 4; p++) {
    const s0 = rr(4, 20); let x0 = 0, z0 = 0;
    for (let t = 0; t < 40; t++) { const [x, z] = sample(rng, 1); const { d, s } = streamNear(x, z); if (d > 1.3 && d < 3 && Math.abs(s - s0) < 4 && habitatW(x, z)[3] > 0.3) { x0 = x; z0 = z; break; } }
    if (!x0) continue;
    for (let k = 0; k < 26; k++) { const x = x0 + rr(-0.9, 0.9), z = z0 + rr(-0.7, 0.7); if (channelW(x, z) > 0.1) continue; L.flatLeaf.push({ x, y: height(x, z) + 0.03, z, ry: rnd() * 6.28, rx: rr(-0.2, 0.1), sx: 1.2, sy: 1, sz: rr(0.8, 1.1), c: pick(['#a8a24a', '#8c8a3a', '#c2b55a']) }); }
    for (let k = 0; k < 4; k++) { const x = x0 + rr(-0.6, 0.6), z = z0 + rr(-0.5, 0.5); L.tuftTops.push({ x, y: height(x, z) + 0.3, z, s: 0.1, c: '#9aa05a' }); }
  }
  // alder roots arching into the water, last year's black cones on the banks
  for (const t of TREES.filter((t) => t.kind === 'alder')) {
    const { d } = streamNear(t.x, t.z); if (d > 3.2) continue;
    const gy = height(t.x, t.z); let best = 0, bd = 9; for (let a = 0; a < 6.28; a += 0.2) { const dd = streamNear(t.x + Math.cos(a) * 1.5, t.z + Math.sin(a) * 1.5).d; if (dd < bd) { bd = dd; best = a; } }
    for (let k = 0; k < 5; k++) { const a = best + rr(-0.6, 0.6); L.roots.push({ x: t.x, y: gy + 0.12, z: t.z, ry: -a, rz: -1.75, sx: 0.9, sy: Math.min(d + 0.2, 2.4) * rr(0.7, 1), sz: 0.9, c: '#4a4238' }); }
    for (let k = 0; k < 10; k++) { const a = rnd() * 6.28, r = rr(0.4, 2.2), x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r; if (channelW(x, z) > 0.3) continue; L.cones.push({ x, y: height(x, z) + 0.02, z, ry: rnd() * 6, s: 0.55, c: '#2a2420' }); }
  }
  // the salamander backwater: a few floating leaves on the still pool and a flat stone half in the water
  { const wy = waterAt(streamNear(BACKWATER.x, BACKWATER.z).s) + 0.012;
    for (let k = 0; k < 8; k++) { const a = rnd() * 6.28, r = rr(0.1, BACKWATER.r * 0.8); L.flatLeaf.push({ x: BACKWATER.x + Math.cos(a) * r, y: wy, z: BACKWATER.z + Math.sin(a) * r * 0.8, ry: rnd() * 6, sx: 1, sy: 1, sz: 0.6, c: pick(['#6e4f30', '#86643c', '#5a4029']) }); }
    makeRock(ctx, BACKWATER.x + BACKWATER.r * 0.85, BACKWATER.z + 0.5, 0.36, { squash: 0.35, sink: -0.05 }); }

  // ---------- H5 pioneer edge ----------
  // rowan in flower (creamy flat heads, May-June) on the upper crown
  for (const t of TREES.filter((t) => t.kind === 'rowan')) { const gy = height(t.x, t.z); for (let k = 0; k < 16; k++) { const a = rnd() * 6.28, u = rr(0.2, 1), r = t.r * 0.85 * Math.sqrt(1 - u * u); L.umbels.push({ x: t.x + Math.cos(a) * r, y: gy + t.h - t.r * 0.75 + u * t.r * 0.9, z: t.z + Math.sin(a) * r, c: '#efe6c8', s: rr(0.2, 0.26) }); } }

  // ---------- H5 meadow strip: June flowers in the sward, and molehills ----------
  // yarrow (Achillea millefolium) flat white heads; common knapweed (Centaurea nigra) purple; ribwort plantain
  // (Plantago lanceolata) dark heads on bare stalks; molehills where the mole (Talpa europaea) pushes up soil
  { const stalks = [];
    for (let i = 0, n = 0; i < 6000 && n < 260; i++) {
      const [x, z] = sample(rng, 0.5); if (meadowW(x, z) < 0.7 || channelW(x, z) > 0.02 || fbm(x * 0.5 + 33, z * 0.5) < 0.42) continue;
      const kind = rnd(), gy = height(x, z), h = rr(0.4, 0.75);
      stalks.push({ x, y: gy, z, sx: 1, sy: h, sz: 1, c: '#5a7a2c' });
      if (kind < 0.4) L.umbels.push({ x, y: gy + h, z, c: '#f0ece0', s: rr(0.14, 0.2) });
      else if (kind < 0.7) L.tuftTops.push({ x, y: gy + h, z, c: pick(['#8a4a9a', '#9a5aa8']), s: 0.11 });
      else L.tuftTops.push({ x, y: gy + h, z, c: '#3a3020', s: 0.08 });
      n++;
    }
    instances(stick(0.012, 0.01), toon(), stalks, { wind: { strength: 0.08, grass: true } });
    for (let i = 0, n = 0; i < 500 && n < 9; i++) { const [x, z] = sample(rng, 1); if (meadowW(x, z) < 0.8 || pathW(x, z) > 0.1) continue; L.molehills.push({ x, y: height(x, z) - 0.05, z, sx: rr(1.4, 1.9), sy: rr(0.7, 1), sz: rr(1.4, 1.9), ry: rnd() * 6, c: pick(['#5a4030', '#4e3828']) }); n++; } }

  // ---------- H6 rock outcrop ----------
  for (let i = 0, n = 0; i < 600 && n < 20; i++) { const z = rr(MAP.outcrop.zStart + 1, HALF - 0.8), x = rr(-HALF + 0.6, outcropEdge(z) - 0.3); if (outcropW(x, z) < 0.85) continue; L.cushions.push({ x, y: height(x, z) - 0.03, z, sx: rr(0.8, 1.8), sy: rr(0.5, 0.8), sz: rr(0.8, 1.8), ry: rnd() * 6, c: pick(['#3f6b22', '#56862a', '#4a7a26']) }); n++; }
  // a flat sun-warmed basking stone on the sunny SE corner of the top (the lizard's spot)
  { const z = MAP.outcrop.zStart + 2.6, x = outcropEdge(z) - 1.0; makeRock(ctx, x, z, 0.5, { stone: ['#b8a888', '#a8987a'], lichen: '#c2c46a', squash: 0.28, sink: 0.02 }); }

  // ---------- the wall: ivy sheets over a few sections ----------
  for (const z0 of [-16.5, -4.5, 8.5]) for (let k = 0; k < 45; k++) { const z = z0 + rr(-1.6, 1.6), x = wallX(z) + rr(-0.5, 0.5); L.ivy.push({ x, y: height(x, z) + rr(0.15, 0.35), z, c: pick(['#24451f', '#2f5628', '#3a6630']), s: rr(0.18, 0.26) }); }

  // ---------- badger sett: latrine pits at the wall foot ----------
  for (const [x, z] of MAP.latrines) { const gy = height(x, z); L.dark.push({ x, y: gy + 0.02, z, rx: -Math.PI / 2, sx: 1.4, sy: 1.1, sz: 1, c: '#3e3022' }); for (let k = 0; k < 3; k++) L.cones.push({ x: x + rr(-0.06, 0.06), y: gy + 0.04, z: z + rr(-0.06, 0.06), ry: rnd() * 6, s: 0.9, c: '#3a2a1c' }); }

  // ---------- charcoal platform: moss, an old stake ----------
  { const { x: cx, z: cz, r } = MAP.charcoal; for (let i = 0, n = 0; i < 300 && n < 11; i++) { const a = rnd() * 6.28, d = rr(0, r * 0.9), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (pathW(x, z) > 0.1) continue; L.cushions.push({ x, y: height(x, z) - 0.04, z, sx: rr(0.6, 1.4), sy: 0.45, sz: rr(0.6, 1.4), ry: rnd() * 6, c: pick(['#2f5a2a', '#3f6b22']) }); n++; }
    L.limbs.push({ x: cx + 1.6, y: height(cx + 1.6, cz - 0.8), z: cz - 0.8, rx: 0.12, sx: 0.7, sy: 0.4, sz: 0.7, c: '#6e6458' }); }

  // ---------- micro-scene: the woodpecker anvil and the squirrel's feeding perch (plantation edge) ----------
  { const ax = 14.3, az = -4.3, px = 13.2, pz = -5.6;
    for (const [x, z] of [[ax, az], [px, pz]]) { const gy = height(x, z), st = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.3, 9), [tm('#5e4230'), tm('#8f8270'), tm('#5e4230')]); st.position.set(x, gy + 0.15, z); st.castShadow = true; scene.add(st); }
    L.cones.push({ x: ax + 0.05, y: height(ax, az) + 0.33, z: az, rz: 0.9, s: 1, c: '#7b4e2e' });   // cone wedged in the anvil
    for (let k = 0; k < 32; k++) { const a = rnd() * 6.28, d = rr(0.25, 0.7); L.cones.push({ x: ax + Math.cos(a) * d, y: height(ax, az) + 0.04, z: az + Math.sin(a) * d, ry: rnd() * 6, rx: rr(-0.4, 0.4), s: 1, c: pick(['#7b4e2e', '#8a5a34', '#6a4026']) }); }   // hacked cones heap
    for (let k = 0; k < 7; k++) { const a = rnd() * 6.28, d = rr(0.25, 0.6); L.cores.push({ x: px + Math.cos(a) * d, y: height(px, pz) + 0.03, z: pz + Math.sin(a) * d, ry: rnd() * 6, rz: Math.PI / 2, s: 1, c: '#b89a6a' }); }   // squirrel-stripped cores
    for (let k = 0; k < 40; k++) { const a = rnd() * 6.28, d = rr(0.2, 0.9); L.scales.push({ x: px + Math.cos(a) * d, y: height(px, pz) + 0.025, z: pz + Math.sin(a) * d, ry: rnd() * 6, s: rr(0.7, 1.1), c: pick(['#7b4e2e', '#8a5a34']) }); } }

  // ---------- micro-scene: the wren's root plate (the biggest plate) ----------
  { const p = PLATES.reduce((b, q) => (q.r > b.r ? q : b)), gy = height(p.x, p.z);
    const nest = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), tm('#4a7d26')); nest.scale.set(1, 0.85, 1); nest.position.set(p.x - p.dz * 0.45 - p.dx * 0.22, gy + p.r * 0.55, p.z + p.dx * 0.45 - p.dz * 0.22); nest.castShadow = true; scene.add(nest);
    // the pit on the plate's upwind side still holds a shallow pool in June
    const px = p.x - p.dx * p.r * 0.9, pz = p.z - p.dz * p.r * 0.9, pool = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), new THREE.MeshBasicMaterial({ color: C('#3d6676') }));
    pool.rotation.x = -Math.PI / 2; pool.scale.set(1.15, 0.85, 1); pool.position.set(px, height(px, pz) + 0.09, pz); scene.add(pool); }

  // ---------- the crossing: stones knocked off the wall where deer cross ----------
  { const z0 = -0.1, x0 = wallX(z0); for (const [dx, dz, s] of [[1.0, 0.5, 0.24], [1.3, -0.6, 0.2], [-0.9, 0.9, 0.16]]) makeRock(ctx, x0 + dx, z0 + dz, s, { sink: 0.0 }); }

  // ---------- draw ----------
  instances(stick(0.12, 0.03), toon(), L.roots, { cast: true });
  instances(stick(0.1, 0.07), toon(), L.limbs, { cast: true });
  instances(halfDisc(0.07), toon(), L.brackets);
  instances(new THREE.SphereGeometry(0.2, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), toon(), L.cushions);
  instances(new THREE.SphereGeometry(0.16, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), toon(), L.molehills, { cast: true });
  { const g = new THREE.BufferGeometry(), P = [], N = [], CL = [];   // thin, short tufts
    for (let b = 0; b < 9; b++) { const a = b / 9 * Math.PI * 2, w = 0.02, h = rr(0.25, 0.35), out = rr(0.06, 0.14); P.push(-Math.sin(a) * w, 0, Math.cos(a) * w, Math.sin(a) * w, 0, -Math.cos(a) * w, Math.cos(a) * out, h, Math.sin(a) * out); N.push(0, 1, 0, 0, 1, 0, 0, 1, 0); CL.push(0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 1.1, 1.1, 1.1); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3));
    instances(g, toon({ vertexColors: true, side: THREE.DoubleSide }), L.tufts, { wind: { strength: 0.1, grass: true } }); }
  sprites(tex.dot, L.tuftTops);
  { const g = flat(0.08, 0.22); g.translate(0, 0, 0.11); instances(g, toon({ side: THREE.DoubleSide }), L.flatLeaf); }
  instances(flat(0.18, 0.14), toon({ side: THREE.DoubleSide }), L.lime);
  instances(flat(0.12, 0.08), toon({ side: THREE.DoubleSide }), L.dust);
  instances(flat(0.025, 0.02), toon({ side: THREE.DoubleSide }), L.scales);
  instances(new THREE.PlaneGeometry(0.14, 0.14), toon({ side: THREE.DoubleSide }), L.dark);
  { const cone = new THREE.CapsuleGeometry(0.035, 0.07, 2, 5); cone.rotateZ(Math.PI / 2); instances(cone, toon(), L.cones); }
  instances(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 4), toon(), L.cores);
  sprites(tex.clover, [...L.ivy, ...L.marigold]);
  sprites(tex.umbel, L.umbels);
}
