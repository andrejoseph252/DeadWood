// Build one estate tile from its plan (src/estate/tile-plan.js) with the plot's art kit: toon materials, instancing,
// leaf-clump crowns. Two levels of detail: 'near' (clump crowns, ground cover) and 'far' (cheap crown blobs, no
// ground cover). Ground and water come from the estate's height and cover functions, so neighbouring tiles meet
// without seams. Heights are shown relative to Y0.
import * as THREE from 'three';
import species from '../data/species.json' with { type: 'json' };
import { fbm, vnoise, sstep, hash } from '../core/noise.js';
import { createRng } from '../core/random.js';
import { C, toon, tm } from '../render/materials.js';
import { createInstancing } from '../render/instancing.js';
import { planTile, CONIFER, BESPOKE, coverAt, height } from '../estate/tile-plan.js';
import { BROOKS, POND, pondW, HALF, PLOT, inPlot } from '../estate/terrain.js';
import { groundColor as plotGroundColor } from '../world/ground.js';
import { roadD } from '../estate/cover.js';

export const Y0 = 390;
const yAt = (x, z) => height(x, z) - Y0;
const GROUND = {
  ancient: ['#5a4029', '#6e4f30', '#86643c'], mixedSouth: ['#5e4630', '#6a5234', '#5a6a30'], spruce1962: ['#4a3020', '#583826', '#3e2a1c'], spruce1985: ['#4a3020', '#5a3a26', '#3e2a1c'],
  calamity: ['#6a6a34', '#7a7438', '#5a4a2e'], snags: ['#6a6436', '#5e5030', '#7a7a3a'], ravine: ['#3e4a2a', '#4a5530', '#3a3424'], coppice: ['#5e4a2e', '#6a5432', '#6a7434'],
  crag: ['#857e66', '#6f6a58', '#5a6a36'], alderCarr: ['#3b3324', '#30291e', '#3e5428'], pond: ['#3a3020', '#30281c', '#3a3020'], meadow: ['#6f8a34', '#7f9636', '#8a9a3e'],
  orchard: ['#6a8432', '#768f36', '#5f7a30'], farmstead: ['#8a7a5a', '#7a8a40', '#6a7a36'], quarry: ['#a89c80', '#8f846c', '#6e7a46'], plot01: ['#5f7d2c', '#6e4f30', '#7f9636'],
};
const pal = Object.fromEntries(Object.entries(GROUND).map(([k, v]) => [k, v.map((h) => C(h))]));
const ROAD = C('#a2906c'), BED = C('#5a5040'), CHAR = C('#262019'), tmpC = new THREE.Color();
const tileSeed = (i, j, k) => ((i + 7) * 92837111 ^ (j + 3) * 689287499 ^ k * 283923481) >>> 0 || 1;

// shared: { tex, canopy: boolean }; returns { group, crowns, dispose }
export function buildTile(i, j, lod, shared) {
  const near = lod === 'near', plan = planTile(i, j, { near }), group = new THREE.Group(), crowns = [];
  const inst = createInstancing(group), { rnd, rr, pick } = createRng(tileSeed(i, j, near ? 1 : 2));
  const { x0, z0, size } = plan, cx = x0 + size / 2, cz = z0 + size / 2;

  // ---------- ground ----------
  const SEG = near ? 100 : 40, g = new THREE.PlaneGeometry(size, size, SEG, SEG); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k), P = pal[coverAt(x, z)] || pal.ancient, n = fbm(x * 0.5, z * 0.5), n2 = vnoise(x * 2.1, z * 2.1);
    pos.setY(k, yAt(x, z) - (inPlot(x, z, 0.4) ? 0.08 : 0));   // under Plot 01's own ground
    c.copy(P[0]).lerp(P[1], n).lerp(P[2], sstep(0.55, 0.85, fbm(x * 0.2 + 7, z * 0.2)) * 0.7);
    for (const b of Object.values(BROOKS)) { if (b.line.farFrom(x, z, 4)) continue; c.lerp(BED, sstep(b.halfWidth * 1.3, b.halfWidth * 0.5, b.line.near(x, z).d)); }
    c.lerp(ROAD, sstep(2.6, 1.6, roadD(x, z) + (n2 - 0.5) * 0.6));
    for (const [px, pz] of plan.charcoal) c.lerp(CHAR, sstep(5.2, 3.8, Math.hypot(x - px, z - pz) + (n2 - 0.5)) * 0.85);
    const pm = Math.max(Math.abs(x - PLOT.x), Math.abs(z - PLOT.z)); if (pm < 38) c.lerp(plotGroundColor(x - PLOT.x, z - PLOT.z, tmpC), sstep(38, 30, pm));   // blend into the plot's ground colours
    col.set([c.r, c.g, c.b], k * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const ground = new THREE.Mesh(g, toon({ vertexColors: true })); ground.receiveShadow = true; group.add(ground);
  if (Math.abs(x0) >= HALF - 0.01 || Math.abs(x0 + size) >= HALF - 0.01 || Math.abs(z0) >= HALF - 0.01 || Math.abs(z0 + size) >= HALF - 0.01) group.add(borderSides(plan));

  // ---------- water: brook ribbons through the tile, and the pond ----------
  const waterM = new THREE.MeshBasicMaterial({ color: C('#3f6a78'), side: THREE.DoubleSide });
  for (const b of Object.values(BROOKS)) {
    if (b.line.farFrom(cx, cz, size)) continue;
    let run = [];
    const flush = () => { if (run.length > 1) group.add(ribbon(run, b.halfWidth * 0.8, waterM)); run = []; };
    for (let s = 0; s <= b.line.length; s += 0.5) {
      const [x, z] = b.line.at(s);
      if (x < x0 - 0.5 || x > x0 + size + 0.5 || z < z0 - 0.5 || z > z0 + size + 0.5 || pondW(x, z) > 0.6 || inPlot(x, z, -0.3)) { flush(); continue; }
      const [x2, z2] = b.line.at(s + 0.5), l = Math.hypot(x2 - x, z2 - z) || 1;
      run.push({ x, z, y: b.bedAt(s) + b.depth * 0.55 - Y0, nx: -(z2 - z) / l, nz: (x2 - x) / l });
    }
    flush();
  }
  if (POND.centre[0] >= x0 && POND.centre[0] < x0 + size && POND.centre[1] >= z0 && POND.centre[1] < z0 + size) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: C('#2f5a68') }));
    p.rotation.set(-Math.PI / 2, 0, -POND.yaw); p.scale.set(POND.rx * 1.02, POND.rz * 1.02, 1); p.position.set(POND.centre[0], POND.level - Y0, POND.centre[1]); group.add(p);
  }

  // ---------- trees ----------
  const trunks = [], blobs = [], cones = [], clumps = [], lowClumps = [];
  for (const t of plan.trees) {
    const R = species.trees[t.kind]?.render, gy = yAt(t.x, t.z), tr = Math.max(0.06, t.dbh / 200), conifer = CONIFER.has(t.kind);
    if (t.status === 'snag') { trunks.push({ x: t.x, y: gy - 0.1, z: t.z, sx: tr / 0.1, sy: t.h * 0.85, sz: tr / 0.1, c: '#9a968c' }); continue; }
    const trunkH = conifer ? t.h * 0.9 : t.h * (R?.trunk?.heightFrac ?? 0.55);
    trunks.push({ x: t.x, y: gy - 0.1, z: t.z, sx: tr / 0.1, sy: trunkH, sz: tr / 0.1, c: R?.bark || '#6a5a48' });
    const leaves = R?.leaves || R?.needles || ['#4a7a2e'], col0 = pick(leaves);
    if (!near) {
      if (conifer) cones.push({ x: t.x, y: gy + t.h * 0.3, z: t.z, sx: t.r, sy: t.h * 0.72, sz: t.r, c: col0 });
      else blobs.push({ x: t.x, y: gy + t.h - t.r * 0.7, z: t.z, sx: t.r, sy: t.r * 0.78 * (R?.crown?.squash ?? 0.9), sz: t.r, ry: rnd() * 6, c: col0 });
      continue;
    }
    if (conifer) {
      const n = Math.max(14, Math.min(80, Math.round(t.h * t.r * 4))), cb = t.kind === 'pine' ? 0.6 : 0.45;
      for (let k = 0; k < n; k++) { const f = rnd(), y = t.h * (cb + (1 - cb) * f), rad = (t.kind === 'pine' ? t.r * (0.6 + 0.4 * rnd()) : t.r * (1 - f)) * Math.sqrt(rnd()) + 0.15, a = rnd() * 6.28;
        clumps.push({ p: new THREE.Vector3(t.x + Math.cos(a) * rad, gy + y, t.z + Math.sin(a) * rad), n: new THREE.Vector3(Math.cos(a), 0.55, Math.sin(a)).normalize(), s: rr(0.8, 1.2) * Math.min(1, t.r / 1.4), c: pick(leaves), needle: true }); }
    } else {
      const n = Math.max(14, Math.min(110, Math.round(11 * t.r * t.r))), cy = gy + t.h - t.r * 0.75, sq = R?.crown?.squash ?? 0.9;
      for (let k = 0; k < n; k++) { const u = rnd() * 2 - 1, th = rnd() * 6.28, rad = Math.pow(rnd(), 0.35), sx = Math.sqrt(1 - u * u) * Math.cos(th), sz = Math.sqrt(1 - u * u) * Math.sin(th);
        clumps.push({ p: new THREE.Vector3(t.x + sx * t.r * rad, cy + u * t.r * sq * rad, t.z + sz * t.r * rad), n: new THREE.Vector3(sx, u * 1.2 + 0.25, sz).normalize(), s: rr(1.2, 1.8) * Math.min(1, t.r / 2.2), c: pick(leaves) }); }
    }
  }
  if (trunks.length) inst.instances(new THREE.CylinderGeometry(0.07, 0.1, 1, 6).translate(0, 0.5, 0), toon(), trunks, { cast: true });
  if (blobs.length) crowns.push(inst.instances(new THREE.IcosahedronGeometry(1, 1), toon(), blobs, { cast: true }));
  if (cones.length) crowns.push(inst.instances(new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0), toon(), cones, { cast: true }));
  const leafC = clumps.filter((q) => !q.needle), needleC = clumps.filter((q) => q.needle);
  if (leafC.length) crowns.push(inst.clumpMesh(leafC, shared.tex.leaf));
  if (needleC.length) crowns.push(inst.clumpMesh(needleC, shared.tex.needle));
  crowns.forEach((m) => { m.visible = shared.canopy; });

  // ---------- ground cover (near tiles) ----------
  if (near) buildScatter(plan, inst, shared, lowClumps, { rnd, rr, pick });
  if (lowClumps.length) inst.clumpMesh(lowClumps, shared.tex.leaf);

  // ---------- places that get a hand-made template later: flagged with survey stakes ----------
  if (plan.bespoke.length) group.add(markBespoke(plan));

  return { group, crowns, plan, dispose() { group.traverse((o) => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach((m) => { if (m.map !== shared.tex.leaf && m.map !== shared.tex.needle) m.dispose(); }); }); } };
}

function ribbon(run, w, mat) {
  const P = [], I = [];
  run.forEach((p, k) => { P.push(p.x + p.nx * w, p.y, p.z + p.nz * w, p.x - p.nx * w, p.y, p.z - p.nz * w); if (k) { const a = (k - 1) * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  return new THREE.Mesh(g, mat);
}

const FROND = (() => { const g = new THREE.BufferGeometry(), P = [], N = [], I = [], S = 6;
  for (let k = 0; k <= S; k++) { const t = k / S, w = Math.sin(Math.PI * Math.min(1, t * 1.1)) * 0.16 * (1 - t * 0.4), y = Math.sin(t * 1.9) * 0.55; P.push(t, y, -w, t, y + 0.02, w); N.push(0, 1, 0, 0, 1, 0); if (k < S) { const b = k * 2; I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(I); return g; })();
const BLADE = (() => { const g = new THREE.BufferGeometry(), P = [], CL = [], NR = [];
  for (let b = 0; b < 3; b++) { const a = b / 3 * Math.PI + (b - 1) * 0.25, w = 0.06, h = 0.45 + b * 0.06, l = (b - 1) * 0.1, dx = Math.cos(a) * w, dz = Math.sin(a) * w; P.push(-dx, 0, -dz, dx, 0, dz, l, h, l * 0.5); CL.push(0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 1.15, 1.15, 1.15); NR.push(0, 1, 0, 0, 1, 0, 0, 1, 0); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(NR, 3)); return g; })();

function buildScatter(plan, inst, shared, lowClumps, { rnd, rr, pick }) {
  const L = {}, push = (k, v) => (L[k] ||= []).push(v), gc = new THREE.Color();
  for (const s of plan.scatter) {
    const y = yAt(s.x, s.z), cover = coverAt(s.x, s.z), P = GROUND[cover] || GROUND.ancient;
    switch (s.type) {
      case 'chip': push('chip', { x: s.x, y: y + 0.03, z: s.z, ry: s.r * 6.28, s: s.s, c: pick(['#a87a45', '#8a6034', '#bf9258', '#6e4a2c', '#9a6c3c', '#54392a']) }); break;
      case 'needle': push('chip', { x: s.x, y: y + 0.03, z: s.z, ry: s.r * 6.28, s: s.s * 0.8, c: pick(['#6a4429', '#7d5232', '#59381f']) }); break;
      case 'grass': { gc.set(pick(P)).lerp(C('#7f9636'), 0.45).offsetHSL(rr(-0.02, 0.02), 0.05, rr(0, 0.08)); const k = cover === 'meadow' || cover === 'orchard' ? 1.25 : 1; push('grass', { x: s.x, y, z: s.z, ry: s.r * 6.28, sx: s.s * k, sy: s.s * k * rr(0.8, 1.3), sz: s.s * k, c: '#' + gc.getHexString() }); break; }
      case 'fern': case 'ladyFern': for (let f = 0; f < 8; f++) push('fern', { x: s.x, y, z: s.z, ry: f / 8 * 6.28 + s.r, s: s.s * (s.type === 'ladyFern' ? 0.9 : 1.1), c: s.type === 'ladyFern' ? pick(['#79b043', '#6aa23c']) : pick(['#4f8a2e', '#5b9834', '#447a28']) }); break;
      case 'moss': push('moss', { x: s.x, y: y - 0.04, z: s.z, sx: s.s, sy: 0.6, sz: s.s, ry: s.r * 6, c: pick(['#3f6f22', '#4a7d26', '#557f2c']) }); break;
      case 'twig': case 'log': { const big = s.type === 'log'; push('log', { x: s.x, y: y + (big ? 0.2 : 0.03), z: s.z, ry: s.r * 6.28, rz: Math.PI / 2, sx: big ? 2.2 : 0.25, sy: big ? rr(3, 6) : rr(0.6, 1.4), sz: big ? 2.2 : 0.25, c: big ? pick(['#8a857a', '#9a958a', '#6a4430']) : pick(['#4a3626', '#5c4532']) }); break; }
      case 'rock': push('rock', { x: s.x, y: y + 0.05, z: s.z, ry: s.r * 6, sx: s.s * 0.5, sy: s.s * 0.35, sz: s.s * 0.45, c: s.r < 0.4 ? pick(['#4e7a2a', '#5d8a2f']) : pick(['#8a867c', '#9b968a', '#76726a', '#a89878']) }); break;
      case 'stump': push('stump', { x: s.x, y, z: s.z, sx: 1, sy: rr(0.25, 0.45), sz: 1, c: pick(['#8f8270', '#9c8c74', '#7a6a58']) }); break;
      case 'cone': push('cone', { x: s.x, y: y + 0.04, z: s.z, ry: s.r * 6, c: pick(['#7b4e2e', '#6a4026']) }); break;
      case 'sedge': push('sedge', { x: s.x, y, z: s.z, ry: s.r * 6, s: s.s, c: pick(['#3f6626', '#4a7330']) }); break;
      case 'flower': { const h = rr(0.6, 0.9); push('stalk', { x: s.x, y, z: s.z, sx: 1, sy: h, sz: 1, c: '#5a7a2c' }); push('dot', { x: s.x, y: y + h, z: s.z, s: 0.16, c: pick(['#f0ece0', '#f0ece0', '#8a4a9a', '#f4d34a']) }); break; }
      case 'willowherb': { const h = rr(1.1, 1.6); push('stalk', { x: s.x, y, z: s.z, sx: 2, sy: h, sz: 2, c: '#4f7d2c' }); for (let k = 0; k < 4; k++) push('dot', { x: s.x, y: y + h * (0.75 + k * 0.06), z: s.z, s: 0.09, c: k % 2 ? '#7a4a5a' : '#8a5a6a' }); break; }
      case 'bramble': case 'bilberry': { const bram = s.type === 'bramble', R = bram ? rr(0.6, 1.1) : rr(0.4, 0.6), H = bram ? rr(0.6, 1) : rr(0.22, 0.36);
        for (let k = 0; k < (bram ? 12 : 8); k++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * R; lowClumps.push({ p: new THREE.Vector3(s.x + Math.cos(a) * d, y + H * rr(0.3, 1), s.z + Math.sin(a) * d), n: new THREE.Vector3(Math.cos(a), 0.8, Math.sin(a)).normalize(), s: rr(0.42, 0.65), c: bram ? pick(['#3f6a2a', '#365e25']) : pick(['#4c7d34', '#5a8c3a']) }); if (bram && rnd() < 0.4) push('dot', { x: s.x + Math.cos(a) * d, y: y + H + 0.05, z: s.z + Math.sin(a) * d, s: 0.1, c: '#f2e8ee' }); }
        break; }
      default: break;
    }
  }
  const t = toon(), ts = toon({ side: THREE.DoubleSide });
  if (L.chip) inst.instances(new THREE.PlaneGeometry(0.15, 0.1).rotateX(-Math.PI / 2), t, L.chip);
  if (L.grass) inst.instances(BLADE, toon({ vertexColors: true, side: THREE.DoubleSide }), L.grass, { wind: { strength: 0.18, grass: true } });
  if (L.fern) inst.instances(FROND, ts, L.fern, { cast: true, wind: { strength: 0.06 } });
  if (L.moss) inst.instances(new THREE.SphereGeometry(0.2, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), t, L.moss);
  if (L.log) inst.instances(new THREE.CylinderGeometry(0.08, 0.1, 1, 6).translate(0, 0.5, 0), t, L.log, { cast: true });
  if (L.rock) inst.instances(new THREE.IcosahedronGeometry(1, 0), t, L.rock, { cast: true });
  if (L.stump) inst.instances(new THREE.CylinderGeometry(0.18, 0.22, 1, 8).translate(0, 0.5, 0), t, L.stump, { cast: true });
  if (L.cone) inst.instances(new THREE.CapsuleGeometry(0.035, 0.07, 2, 5).rotateZ(Math.PI / 2), t, L.cone);
  if (L.sedge) inst.instances(BLADE, toon({ vertexColors: true, side: THREE.DoubleSide }), L.sedge, { wind: { strength: 0.12, grass: true } });
  if (L.stalk) inst.instances(new THREE.CylinderGeometry(0.012, 0.016, 1, 4).translate(0, 0.5, 0), t, L.stalk, { wind: { strength: 0.05, grass: true } });
  if (L.dot) inst.sprites(shared.tex.dot, L.dot);
}

// orange-flagged survey stakes around a place still waiting for its hand-made template (Plot 01: its corner stakes)
function markBespoke(plan) {
  const g = new THREE.Group(), wood = tm('#b88d58'), flag = toon({ color: C('#ff6a1a'), side: THREE.DoubleSide });
  const stake = (x, z) => { const y = yAt(x, z), s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08).translate(0, 0.6, 0), wood); s.position.set(x, y, z); s.castShadow = true; g.add(s);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.2), flag); f.position.set(x + 0.24, y + 1.08, z); g.add(f); };
  const cx = plan.x0 + plan.size / 2, cz = plan.z0 + plan.size / 2;
  if (plan.bespoke.includes('plot01')) { for (const [dx, dz] of [[-30, -30], [30, -30], [30, 30], [-30, 30]]) stake(cx + dx, cz + dz); }
  else for (const [dx, dz] of [[-2, -2], [2, -2], [0, 2.4]]) stake(cx + dx, cz + dz);
  return g;
}

// the cut soil faces where the estate ends
function borderSides(plan) {
  const g = new THREE.Group(), BASE = -40, strata = [[0.2, C('#2a1d14')], [0.7, C('#4a3324')], [1.5, C('#6b4b33')], [2.6, C('#7d6448')], [999, C('#6e6a60')]];
  const { x0, z0, size } = plan, x1 = x0 + size, z1 = z0 + size, edges = [];
  if (z0 <= -HALF + 0.01) edges.push([[x0, z0], [x1, z0]]); if (x1 >= HALF - 0.01) edges.push([[x1, z0], [x1, z1]]);
  if (z1 >= HALF - 0.01) edges.push([[x1, z1], [x0, z1]]); if (x0 <= -HALF + 0.01) edges.push([[x0, z1], [x0, z0]]);
  for (const [[ax, az], [bx, bz]] of edges) {
    const N = 60, ROWS = 12, P = [], CL = [], I = [];
    for (let i = 0; i <= N; i++) { const t = i / N, x = ax + (bx - ax) * t, z = az + (bz - az) * t, top = yAt(x, z);
      for (let j = 0; j <= ROWS; j++) { const f = j / ROWS, y = top + (BASE - top) * f * f, d = top - y + (vnoise(t * 30, j) - 0.5) * 0.3, cc = strata.find((s) => d < s[0])[1].clone().multiplyScalar(0.9 + hash(i, j) * 0.15); P.push(x, y, z); CL.push(cc.r, cc.g, cc.b);
        if (i < N && j < ROWS) { const a = i * (ROWS + 1) + j, b = a + ROWS + 1; I.push(a, b, a + 1, b, b + 1, a + 1); } } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3)); geo.setIndex(I); geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, toon({ vertexColors: true, side: THREE.DoubleSide })));
  }
  return g;
}
export { BESPOKE };
