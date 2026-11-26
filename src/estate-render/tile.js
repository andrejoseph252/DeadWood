// Build one estate tile from its plan (src/estate/tile-plan.js) at Plot 01's level of detail, with the plot's art
// kit: toon materials, instancing, leaf-clump crowns, the plot's palettes and ground-cover rules.
// Two levels: 'near' (full crowns with branches, buttresses, moss collars, ivy; ground cover at the plot's density,
// generated from per-tile field grids) and 'far' (crown blobs and cones, no ground cover). Every tree varies in
// size, lean and tint. Ground and water come from the estate's functions, so neighbouring tiles meet without
// seams. Heights are shown relative to Y0. `shared.detail` (0..1, ?detail=) scales the ground-cover density.
import * as THREE from 'three';
import species from '../data/species.json' with { type: 'json' };
import { fbm, vnoise, sstep, hash } from '../core/noise.js';
import { createRng } from '../core/random.js';
import { C, toon, tm } from '../render/materials.js';
import { createInstancing } from '../render/instancing.js';
import { planTile, tileFields, CONIFER, BESPOKE, coverAt, height } from '../estate/tile-plan.js';
import { BROOKS, POND, pondW, HALF, PLOT, inPlot } from '../estate/terrain.js';
import { roadD } from '../estate/cover.js';
import { groundColor as plotGroundColor } from '../world/ground.js';

export const Y0 = 390;
const yAt = (x, z) => height(x, z) - Y0;
const GROUND = {
  ancient: ['#5a4029', '#6e4f30', '#86643c'], mixedSouth: ['#5e4630', '#6a5234', '#86643c'], spruce1962: ['#4d3222', '#5e3d29', '#3f2a1c'], spruce1985: ['#4d3222', '#5a3a26', '#3f2a1c'],
  calamity: ['#6a6a34', '#7a7438', '#5a4a2e'], snags: ['#6a6436', '#5e5030', '#7a7a3a'], ravine: ['#3e4a2a', '#4a5530', '#3a3424'], coppice: ['#5e4a2e', '#6a5432', '#7a5c36'],
  crag: ['#857e66', '#6f6a58', '#5a6a36'], alderCarr: ['#3b3324', '#30291e', '#3e5428'], pond: ['#3a3020', '#30281c', '#3a3020'], meadow: ['#5f7d2c', '#7f9636', '#9aa543'],
  orchard: ['#5f7d2c', '#768f36', '#8a9a3e'], farmstead: ['#8a7a5a', '#7a8a40', '#6a7a36'], quarry: ['#a89c80', '#8f846c', '#6e7a46'], plot01: ['#5f7d2c', '#6e4f30', '#7f9636'],
};
const WOOD = new Set(['ancient', 'mixedSouth', 'spruce1962', 'spruce1985', 'ravine', 'coppice', 'alderCarr']);
const OPEN = new Set(['meadow', 'orchard', 'farmstead', 'calamity', 'snags', 'quarry', 'crag']);
const pal = Object.fromEntries(Object.entries(GROUND).map(([k, v]) => [k, v.map((h) => C(h))]));
const GRASS = ['#5f7d2c', '#7f9636', '#9aa543'].map(C), MOSS = ['#3f6b22', '#56862a'].map(C), NEEDLE = ['#4d3222', '#5e3d29'].map(C);
const ROAD = C('#a2906c'), BED = C('#5a5040'), CHAR = C('#262019'), tmpC = new THREE.Color(), tint = new THREE.Color();
const tileSeed = (i, j, k) => ((i + 7) * 92837111 ^ (j + 3) * 689287499 ^ k * 283923481) >>> 0 || 1;

// shared: { tex, canopy, detail }; returns { group, crowns, plan, dispose }
export function buildTile(i, j, lod, shared) {
  const near = lod === 'near', plan = planTile(i, j, { near: false }), group = new THREE.Group(), crowns = [];
  const inst = createInstancing(group, { chunk: 1000 }), R = createRng(tileSeed(i, j, near ? 1 : 2)), { rnd, rr, pick } = R;
  const F = near ? tileFields(i, j) : null, { x0, z0, size } = plan, cx = x0 + size / 2, cz = z0 + size / 2;
  const Y = F ? (x, z) => F.hAt(x, z) - Y0 : yAt;

  // ---------- ground: the plot's palettes, moss pockets in shade, needles under spruce, grass in the open ----------
  const SEG = near ? 125 : 40, g = new THREE.PlaneGeometry(size, size, SEG, SEG); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k), cover = F ? F.coverAt(x, z) : coverAt(x, z), P = pal[cover] || pal.ancient, n = fbm(x * 0.6, z * 0.6), n2 = vnoise(x * 2.1, z * 2.1);
    pos.setY(k, Y(x, z) - (inPlot(x, z, 0.4) ? 0.08 : 0));   // under Plot 01's own ground
    c.copy(P[0]).lerp(P[1], n).lerp(P[2], sstep(0.6, 0.9, n2) * 0.7);
    if (F && WOOD.has(cover)) {
      const sh = F.shadeAt(x, z), sp = F.spruceAt(x, z);
      c.lerp(NEEDLE[n2 > 0.5 ? 1 : 0], sstep(0.3, 0.7, sp) * 0.85);
      const gapT = cover.startsWith('spruce') ? 0.12 : cover === 'ancient' ? 0.22 : 0.35;   // closed stands stay brown: only real gaps go green
      c.lerp(tmpC.copy(GRASS[0]).lerp(GRASS[1], n), sstep(gapT + 0.2, gapT, sh + (n2 - 0.5) * 0.2) * 0.9);   // grass where the canopy opens
      c.lerp(MOSS[n2 > 0.5 ? 1 : 0], sstep(0.6, 0.7, fbm(x * 0.35 + 11, z * 0.35)) * sh * 0.8);
    }
    for (const b of Object.values(BROOKS)) { if (b.line.farFrom(x, z, 4)) continue; c.lerp(BED, sstep(b.halfWidth * 1.3, b.halfWidth * 0.5, b.line.near(x, z).d)); }
    c.lerp(ROAD, sstep(2.6, 1.6, roadD(x, z) + (n2 - 0.5) * 0.6));
    for (const [px, pz] of plan.charcoal) c.lerp(CHAR, sstep(5.2, 3.8, Math.hypot(x - px, z - pz) + (n2 - 0.5)) * 0.85);
    const pm = Math.max(Math.abs(x - PLOT.x), Math.abs(z - PLOT.z)); if (pm < 38) c.lerp(plotGroundColor(x - PLOT.x, z - PLOT.z, tmpC), sstep(38, 30, pm));
    col.set([c.r, c.g, c.b], k * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const ground = new THREE.Mesh(g, toon({ vertexColors: true })); ground.receiveShadow = true; group.add(ground);
  if (Math.abs(x0) >= HALF - 0.01 || Math.abs(x0 + size) >= HALF - 0.01 || Math.abs(z0) >= HALF - 0.01 || Math.abs(z0 + size) >= HALF - 0.01) group.add(borderSides(plan));

  // ---------- water ----------
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
  const T = { trunks: [], flares: [], branches: [], stubs: [], blobs: [], cones: [], lenticels: [], collars: [], roots: [], ivy: [] }, clumps = [], needles = [];
  const shade = (hex, v, amt = 0.05) => '#' + tint.set(hex).offsetHSL((v - 0.5) * amt * 0.6, (v - 0.5) * amt, (v - 0.5) * amt).getHexString();   // a per-tree tint
  for (const t of plan.trees) {
    const Rr = species.trees[t.kind]?.render, gy = Y(t.x, t.z), v = t.v ?? 0.5, tr = Math.max(0.06, t.dbh / 200), conifer = CONIFER.has(t.kind), lean = (v - 0.5) * 0.12, la = v * 40;
    if (t.status === 'snag') {   // beetle-killed spruce, years dead: grey, bark flaking, branch stubs
      T.trunks.push({ x: t.x, y: gy - 0.1, z: t.z, rx: Math.cos(la) * lean * 0.5, rz: Math.sin(la) * lean * 0.5, sx: tr / 0.1, sy: t.h * (0.7 + v * 0.25), sz: tr / 0.1, c: pick(['#9a968c', '#8b877d', '#a39f94']) });
      if (near) for (let k = 0; k < 10; k++) { const y = rr(1.5, t.h * 0.8), a = rnd() * 6.28; T.stubs.push({ x: t.x + Math.cos(a) * tr, y: gy + y, z: t.z + Math.sin(a) * tr, ry: -a, rz: -1.25, sx: 1, sy: rr(0.25, 0.7) * (1.1 - y / t.h), sz: 1, c: '#8b877d' }); }
      continue;
    }
    const dying = t.status === 'dying', leaves = dying ? (Rr?.deadNeedles || ['#a5622f', '#b8763c']) : (Rr?.leaves || Rr?.needles || ['#4a7a2e']);
    const trunkH = conifer ? t.h * 0.92 : t.h * (Rr?.trunk?.heightFrac ?? 0.55);
    T.trunks.push({ x: t.x, y: gy - 0.12, z: t.z, rx: Math.cos(la) * lean * 0.3, rz: Math.sin(la) * lean * 0.3, sx: tr / 0.1, sy: trunkH, sz: tr / 0.1, c: shade(Rr?.bark || '#6a5a48', v, 0.06) });
    if (!near) {
      if (conifer) T.cones.push({ x: t.x, y: gy + t.h * (0.22 + v * 0.12), z: t.z, sx: t.r * (0.85 + v * 0.3), sy: t.h * (0.62 + v * 0.16), sz: t.r * (0.85 + v * 0.3), ry: v * 6, c: shade(pick(leaves), v, 0.08) });
      else T.blobs.push({ x: t.x, y: gy + t.h - t.r * 0.7, z: t.z, sx: t.r, sy: t.r * 0.78 * (Rr?.crown?.squash ?? 0.9), sz: t.r * (0.85 + v * 0.3), ry: rnd() * 6, c: shade(pick(leaves), v, 0.08) });
      continue;
    }
    if (t.dbh > 38) T.flares.push({ x: t.x, y: gy - 0.05, z: t.z, sx: tr * 1.9 / 0.1, sy: 0.7, sz: tr * 1.9 / 0.1, c: shade(Rr?.bark || '#6a5a48', v, 0.06) });
    if (conifer) {
      // plantation spruce shed their lower branches (self-pruning): the crown starts higher, with dead stubs below
      const cb = t.kind === 'pine' ? 0.6 : 0.3 + v * 0.25, n = Math.max(30, Math.min(240, Math.round(7.5 * t.h * t.r)));
      for (let k = 0; k < 6 + Math.round(v * 6); k++) { const y = rr(1.2, t.h * cb), a = rnd() * 6.28; T.stubs.push({ x: t.x + Math.cos(a) * tr, y: gy + y, z: t.z + Math.sin(a) * tr, ry: -a, rz: -1.35, sx: 1, sy: rr(0.3, 0.75), sz: 1, c: '#6e5a48' }); }
      for (let k = 0; k < n; k++) {
        const f = rnd(); if (dying && rnd() < 0.45) continue;
        const y = t.h * (cb + (1 - cb) * f), rad = (t.kind === 'pine' ? t.r * (0.6 + 0.4 * rnd()) : t.r * (1 - f) * (0.55 + 0.45 * Math.sqrt(rnd())) + 0.18), a = rnd() * 6.28, ox = lean * y * Math.cos(la), oz = lean * y * Math.sin(la);
        needles.push({ p: new THREE.Vector3(t.x + Math.cos(a) * rad + ox, gy + y - rad * 0.25, t.z + Math.sin(a) * rad + oz), n: new THREE.Vector3(Math.cos(a), 0.55, Math.sin(a)).normalize(), s: rr(0.9, 1.4) * (0.7 + (1 - f) * 0.5) * Math.min(1, t.r / 2), c: shade(pick(leaves), v, 0.07) });
      }
    } else {
      const sq = Rr?.crown?.squash ?? 0.9, n = Math.max(30, Math.min(280, Math.round(13 * t.r * t.r))), cy = gy + t.h - t.r * 0.75, ox = lean * t.h * Math.cos(la), oz = lean * t.h * Math.sin(la);
      for (let b = 0; b < 4; b++) { const a = b * 1.7 + t.x, hz = Math.hypot(Math.cos(a), Math.sin(a)); T.branches.push({ x: t.x, y: gy + trunkH * 0.85, z: t.z, ry: -a, rz: -Math.atan2(hz, 1.1), sx: Math.max(0.6, tr * 6), sy: t.r * 0.75, sz: Math.max(0.6, tr * 6), c: Rr?.bark || '#6a5a48' }); }
      for (let k = 0; k < n; k++) {
        const u = rnd() * 2 - 1, th = rnd() * 6.28, rad = Math.pow(rnd(), 0.35), sx = Math.sqrt(1 - u * u) * Math.cos(th), sz = Math.sqrt(1 - u * u) * Math.sin(th), lump = 0.82 + 0.3 * vnoise(sx * 2 + t.x, u * 2 + sz * 2);
        clumps.push({ p: new THREE.Vector3(t.x + ox + sx * t.r * rad * lump, cy + u * t.r * sq * rad * lump, t.z + oz + sz * t.r * rad * lump), n: new THREE.Vector3(sx, u * 1.2 + 0.25, sz).normalize(), s: rr(1.3, 2.0) * (Rr?.crown?.clumpScale ?? 0.9) * Math.min(1, t.r / 2), c: shade(pick(leaves), v, 0.07) });
      }
      if (Rr?.lenticels) for (let k = 0; k < 12; k++) T.lenticels.push({ x: t.x, y: gy + rr(0.3, trunkH), z: t.z, ry: rnd() * 6.28, sx: tr / 0.18, sy: rr(0.6, 1.4), sz: tr / 0.18, c: '#2a2724' });
      if (t.dbh > 25 && t.kind !== 'holly') for (let k = 0; k < 4; k++) { const a = rnd() * 6.28; T.collars.push({ x: t.x + Math.cos(a) * tr * 1.4, y: gy - 0.02, z: t.z + Math.sin(a) * tr * 1.4, sx: 1.1, sy: 0.6, sz: 1.1, c: pick(['#4f8a26', '#5e9a2c', '#3f6f22']) }); }
      if ((t.kind === 'beech' || t.kind === 'oak') && t.dbh > 50) for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28 + v; T.roots.push({ x: t.x, y: gy + 0.05, z: t.z, ry: -a, rz: -1.42, sx: tr * 3, sy: rr(0.9, 1.5), sz: tr * 3, c: Rr?.bark || '#6a5a48' }); }
      if (t.kind === 'oak' && v > 0.55 && t.dbh > 30) for (let k = 0; k < 40; k++) { const a = rr(-1.6, 1.2); T.ivy.push({ x: t.x + Math.cos(a) * (tr + 0.04), y: gy + rr(0.2, trunkH * 0.9), z: t.z + Math.sin(a) * (tr + 0.04), c: pick(['#24451f', '#2f5628', '#3a6630']), s: rr(0.18, 0.28) }); }
    }
  }
  const stick = (r0, r1, sides = 6) => new THREE.CylinderGeometry(r1, r0, 1, sides).translate(0, 0.5, 0);
  if (T.trunks.length) inst.instances(stick(0.1, 0.065, 8), toon(), T.trunks, { cast: true });
  if (T.flares.length) inst.instances(new THREE.ConeGeometry(0.1, 1, 8).translate(0, 0.5, 0), toon(), T.flares, { cast: true });
  if (T.branches.length) inst.instances(stick(0.11, 0.05, 5), toon(), T.branches, { cast: true });
  if (T.stubs.length) inst.instances(stick(0.03, 0.012, 4), toon(), T.stubs, { cast: true });
  if (T.roots.length) inst.instances(stick(0.12, 0.03, 5), toon(), T.roots, { cast: true });
  if (T.lenticels.length) inst.instances(new THREE.BoxGeometry(0.21, 0.04, 0.21), toon(), T.lenticels);
  if (T.collars.length) inst.instances(new THREE.SphereGeometry(0.2, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), toon(), T.collars);
  if (T.ivy.length) inst.sprites(shared.tex.clover, T.ivy);
  if (T.blobs.length) crowns.push(inst.instances(new THREE.IcosahedronGeometry(1, 1), toon(), T.blobs, { cast: true }));
  if (T.cones.length) crowns.push(inst.instances(new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0), toon(), T.cones, { cast: true }));
  if (clumps.length) crowns.push(inst.clumpMesh(clumps, shared.tex.leaf));
  if (needles.length) crowns.push(inst.clumpMesh(needles, shared.tex.needle));
  crowns.forEach((m) => { m.visible = shared.canopy; });

  if (near) buildGroundCover(plan, F, inst, shared, R);
  if (plan.bespoke.length) group.add(markBespoke(plan));
  return { group, crowns, plan, dispose() { group.traverse((o) => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach((m) => { if (m.map !== shared.tex.leaf && m.map !== shared.tex.needle) m.dispose(); }); }); } };
}

function ribbon(run, w, mat) {
  const P = [], I = [];
  run.forEach((p, k) => { P.push(p.x + p.nx * w, p.y, p.z + p.nz * w, p.x - p.nx * w, p.y, p.z - p.nz * w); if (k) { const a = (k - 1) * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  return new THREE.Mesh(g, mat);
}

const FROND = (() => { const g = new THREE.BufferGeometry(), P = [], N = [], I = [], S = 8;
  for (let k = 0; k <= S; k++) { const t = k / S, w = Math.sin(Math.PI * Math.min(1, t * 1.1)) * 0.16 * (1 - t * 0.4), y = Math.sin(t * 1.9) * 0.55; P.push(t, y, -w, t, y + 0.02, w); N.push(0, 1, 0, 0, 1, 0); if (k < S) { const b = k * 2; I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(I); return g; })();
function tuftGeo(blades, w, hMin, hMax, out, seed) { const g = new THREE.BufferGeometry(), P = [], CL = [], NR = [], { rr } = createRng(seed);
  for (let b = 0; b < blades; b++) { const a = b / blades * Math.PI * 2, h = rr(hMin, hMax), o = out ? rr(out * 0.6, out) : 0, dx = Math.cos(a) * w, dz = Math.sin(a) * w, lean = out ? 0 : rr(-0.12, 0.12);
    P.push(-dz, 0, dx, dz, 0, -dx, o ? Math.cos(a) * o : lean, h, o ? Math.sin(a) * o : lean * 0.5); CL.push(0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 1.15, 1.15, 1.15); NR.push(0, 1, 0, 0, 1, 0, 0, 1, 0); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(NR, 3)); return g; }
const BLADE = tuftGeo(3, 0.06, 0.35, 0.6, 0, 3), SEDGE = tuftGeo(7, 0.04, 0.4, 0.6, 0.35, 5);

// Ground cover at Plot 01's density, cell by cell (1 m), from the cover and canopy shade there. Per m² at detail 1.
function buildGroundCover(plan, F, inst, shared, { rnd, rr, pick }) {
  const det = shared.detail ?? 1, L = {}, push = (k, v) => (L[k] ||= []).push(v), gc = new THREE.Color();
  const nearTree = (x, z, r) => plan.trees.some((t) => Math.abs(t.x - x) < r + 0.5 && Math.abs(t.z - z) < r + 0.5 && Math.hypot(t.x - x, t.z - z) < Math.max(0.06, t.dbh / 200) + r);
  const brookD = (x, z) => { let d = Infinity; for (const b of Object.values(BROOKS)) if (!b.line.farFrom(x, z, 3)) d = Math.min(d, b.line.near(x, z).d - b.halfWidth); return d; };
  const count = (perM2) => { let n = Math.floor(perM2), f = perM2 - n; if (rnd() < f) n++; return n; };
  for (let b = 0; b < F.CN; b++) for (let a = 0; a < F.CN; a++) {
    const cx = F.x0 + a, cz = F.z0 + b, cover = F.coverAt(cx + 0.5, cz + 0.5), sh = F.shadeAt(cx + 0.5, cz + 0.5), sp = F.spruceAt(cx + 0.5, cz + 0.5);
    if (cover === 'pond' || cover === 'plot01' || inPlot(cx + 0.5, cz + 0.5, -1)) continue;
    const wood = WOOD.has(cover), open = 1 - sh, patch = fbm(cx * 0.3 + 2, cz * 0.3), mossy = fbm(cx * 0.35 + 11, cz * 0.35), sorrel = fbm(cx * 0.5 + 21, cz * 0.5);
    const at = () => { const x = cx + rnd(), z = cz + rnd(); return [x, z, F.hAt(x, z) - Y0]; };
    const P = GROUND[cover] || GROUND.ancient;
    // litter: chips of last year's leaves, needles under spruce, black flecks on charcoal platforms
    const chips = wood ? 14 * (1 - open * 0.6) : cover === 'crag' || cover === 'quarry' ? 2 : cover === 'calamity' || cover === 'snags' ? 3 : 0;
    for (let k = count(chips * det); k > 0; k--) { const [x, z, y] = at(); if (brookD(x, z) < 0.2) continue;
      push('chip', { x, y: y + 0.03, z, ry: rnd() * 6.28, rx: rr(-0.2, 0.2), s: rr(0.7, 1.4), c: sp > 0.5 || cover.startsWith('spruce') && rnd() < 0.7 ? pick(['#6a4429', '#7d5232', '#59381f']) : cover === 'alderCarr' ? pick(['#4a3a28', '#3d3122', '#5a4630']) : pick(['#a87a45', '#8a6034', '#bf9258', '#6e4a2c', '#9a6c3c', '#54392a', '#c9a76a']) }); }
    // grass: a sward in the open, tufts where the canopy breaks, patches under light shade
    const openT = cover.startsWith('spruce') ? 0.85 : cover === 'ancient' ? 0.75 : 0.6;   // how open before grass takes hold
    const grass = cover === 'meadow' || cover === 'orchard' ? 18 : cover === 'farmstead' ? 10 : cover === 'calamity' || cover === 'snags' ? 9 * (0.4 + patch) : cover === 'crag' || cover === 'quarry' ? 3 * patch : wood ? Math.max(0, open - openT) * 40 + sstep(0.72, 0.9, patch) * 1.5 * (1 - sp) : 0;
    for (let k = count(grass * det); k > 0; k--) { const [x, z, y] = at(); if (brookD(x, z) < 0.4 || roadD(x, z) < 1.6) continue;
      gc.copy(GRASS[0]).lerp(GRASS[1], fbm(x * 0.6, z * 0.6)).lerp(GRASS[2], sstep(0.55, 0.85, fbm(x * 0.2 + 7, z * 0.2)) * 0.8).offsetHSL(rr(-0.02, 0.02), 0.05, rr(0, 0.08));
      if (cover === 'calamity' || cover === 'snags') gc.lerp(tmpC.set(P[1]), 0.35);
      if (cover === 'meadow' || cover === 'orchard') gc.lerp(tmpC.set('#a89a6a'), sstep(0.55, 0.75, fbm(x * 0.08 + 40, z * 0.08)) * rr(0.2, 0.6));   // patches of flowering, seeding grass
      const s = rr(0.7, 1.35) * (cover === 'meadow' || cover === 'orchard' ? 1.15 : wood ? 0.8 : 1);
      push('grass', { x, y, z, ry: rnd() * 6.28, sx: s, sy: s * rr(0.8, 1.3), sz: s, c: '#' + gc.getHexString() }); }
    // moss cushions in damp shade
    if ((wood || cover === 'crag') && mossy > 0.58 && rnd() < 0.09 * det) { const [x, z, y] = at(); push('moss', { x, y: y - 0.05, z, sx: rr(0.5, 1.1), sy: rr(0.5, 0.8), sz: rr(0.5, 1.1), ry: rnd() * 6, c: pick(['#3f6f22', '#4a7d26', '#3a661f', '#557f2c']) }); }
    // wood sorrel in shade (leaves only in June), ferns, sedge tussocks
    if (wood && sh > 0.35 && sorrel > 0.55 && !cover.startsWith('spruce19') || (sp > 0.3 && sp < 0.6 && sorrel > 0.6)) for (let k = count(0.35 * det); k > 0; k--) { const [x, z, y] = at(); push('clover', { x, y: y + 0.02, z, c: pick(['#5f9a38', '#6aa83e', '#56902f']), s: rr(0.16, 0.24) }); }
    const fernP = cover === 'ravine' ? 0.06 : cover === 'ancient' || cover === 'mixedSouth' || cover === 'coppice' ? 0.012 * (sh > 0.4 ? 1 : 0) : cover === 'alderCarr' ? 0.04 : 0;
    if (rnd() < fernP * det) { const [x, z, y] = at(); const lady = cover === 'alderCarr' || brookD(x, z) < 2.5, s = rr(0.8, 1.35);
      for (let f = 0; f < 9; f++) push('fern', { x, y, z, ry: f / 9 * 6.28 + rnd() * 0.4, s: s * rr(0.75, 1.1), c: lady ? pick(['#79b043', '#6aa23c', '#86bb4c']) : pick(['#4f8a2e', '#5b9834', '#447a28', '#62a03a']) }); }
    if ((cover === 'alderCarr' && rnd() < 0.1 * det) || (wood && sh > 0.4 && rnd() < 0.006 * det)) { const [x, z, y] = at(); push('sedge', { x, y, z, ry: rnd() * 6.28, s: rr(0.8, 1.3), c: pick(['#3f6626', '#4a7330', '#56803a']) }); }
    // twigs, fallen limbs, spruce cones
    if (wood && rnd() < 0.025 * det) { const [x, z, y] = at(); push('twig', { x, y: y + 0.03, z, ry: rnd() * 6.28, rz: Math.PI / 2, sx: 1, sy: rr(0.4, 1.3), sz: 1, c: pick(['#4a3626', '#5c4532', '#3a2a1e']) }); }
    if ((cover === 'ancient' || cover === 'ravine' || cover === 'mixedSouth') && sh > 0.5 && rnd() < 0.003) { const [x, z, y] = at(); if (!nearTree(x, z, 1)) push('limb', { x, y: y + 0.08, z, ry: rnd() * 6.28, rz: Math.PI / 2, sx: rr(0.8, 1.4), sy: rr(2, 4.5), sz: rr(0.8, 1.4), c: pick(['#5a4632', '#77705f', '#8a857a']) }); }
    if (sp > 0.5 && rnd() < 0.15 * det) { const [x, z, y] = at(); push('cone', { x, y: y + 0.04, z, ry: rnd() * 6.28, c: pick(['#7b4e2e', '#6a4026']) }); }
    // bilberry on acid ground (lighter spots under spruce, the crags), bramble and willowherb in the clearing
    const bil = (cover === 'spruce1962' && sh < 0.8 && fbm(cx * 0.4 + 9, cz * 0.4) > 0.6) || (cover === 'crag' && fbm(cx * 0.4 + 9, cz * 0.4) > 0.5);
    if (bil && rnd() < 0.08 * det) { const [x, z, y] = at(); push('bilberry', { x, y, z }); }
    if ((cover === 'calamity' || cover === 'snags') && fbm(cx * 0.3 + 5, cz * 0.3) > 0.5 && rnd() < 0.05 * det) { const [x, z, y] = at(); if (!nearTree(x, z, 0.6)) push('bramble', { x, y, z }); }
    if ((cover === 'calamity' || cover === 'snags') && fbm(cx * 0.4 + 31, cz * 0.4) > 0.5 && rnd() < 0.06 * det) { const [x, z, y] = at(); push('willowherb', { x, y, z }); }
    if ((cover === 'calamity' || cover === 'snags') && rnd() < 0.006) { const [x, z, y] = at(); if (!nearTree(x, z, 0.5)) push('stump', { x, y, z, sx: 1, sy: rr(0.25, 0.45), sz: 1, c: pick(['#8f8270', '#9c8c74', '#7a6a58']) }); }
    if ((cover === 'calamity' || cover === 'snags') && rnd() < 0.0015) { const [x, z, y] = at(); if (!nearTree(x, z, 1)) push('limb', { x, y: y + 0.2, z, ry: rnd() * 6.28, rz: Math.PI / 2, sx: 2.2, sy: rr(3, 6), sz: 2.2, c: pick(['#8a857a', '#9a958a', '#6a4430']) }); }
    // meadow flowers (yarrow, knapweed, ribwort), molehills; rocks on the crags and in the quarry
    if ((cover === 'meadow' || cover === 'orchard')) for (let k = count((fbm(cx * 0.12 + 33, cz * 0.12) > 0.45 ? 1.1 : 0.25) * det); k > 0; k--) { const [x, z, y] = at(); push('flower', { x, y, z, k: rnd() }); }   // drifts of flowers, not an even sprinkle
    if (cover === 'meadow' && rnd() < 0.002) { const [x, z, y] = at(); push('molehill', { x, y: y - 0.05, z, sx: rr(1.4, 1.9), sy: rr(0.7, 1), sz: rr(1.4, 1.9), ry: rnd() * 6, c: pick(['#5a4030', '#4e3828']) }); }
    if ((cover === 'crag' || cover === 'quarry' || cover === 'ravine') && rnd() < (cover === 'ravine' ? 0.01 : 0.035)) { const [x, z, y] = at(); if (!nearTree(x, z, 0.6)) { const s = rr(0.3, 0.9); push('rock', { x, y: y + s * 0.1, z, ry: rnd() * 6, sx: s * 1.2, sy: s * 0.6, sz: s, c: rnd() < 0.4 ? pick(['#4e7a2a', '#5d8a2f']) : pick(['#8a867c', '#9b968a', '#a89878', '#9a8a6e']) }); } }
  }
  // turn the lists into instanced meshes (low shrubs as leaf clumps, flowers and spikes as stems with dots)
  const low = [], dots = [], stalks = [];
  for (const s of L.bilberry || []) for (let k = 0; k < 9; k++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * rr(0.4, 0.65); low.push({ p: new THREE.Vector3(s.x + Math.cos(a) * d, s.y + rr(0.07, 0.35), s.z + Math.sin(a) * d), n: new THREE.Vector3(Math.cos(a), 0.8, Math.sin(a)).normalize(), s: rr(0.42, 0.6), c: pick(['#4c7d34', '#5a8c3a']) }); if (rnd() < 0.2) dots.push({ x: s.x + Math.cos(a) * d, y: s.y + 0.32, z: s.z + Math.sin(a) * d, s: 0.07, c: '#8aa04a' }); }
  for (const s of L.bramble || []) { const R = rr(0.6, 1.1), H = rr(0.6, 1); for (let k = 0; k < 14; k++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * R, p = new THREE.Vector3(s.x + Math.cos(a) * d, s.y + H * rr(0.3, 1), s.z + Math.sin(a) * d); low.push({ p, n: new THREE.Vector3(Math.cos(a), 0.8, Math.sin(a)).normalize(), s: rr(0.42, 0.65), c: pick(['#3f6a2a', '#365e25', '#4a7a30']) }); if (rnd() < 0.5) dots.push({ x: p.x, y: p.y + 0.08, z: p.z, s: 0.1, c: pick(['#f2e8ee', '#f4dce4', '#7a9a3a']) }); } }
  for (const s of L.willowherb || []) { const h = rr(1.2, 1.7); stalks.push({ x: s.x, y: s.y, z: s.z, sx: 2, sy: h, sz: 2, c: '#4f7d2c' }); for (let k = 5; k < 10; k++) dots.push({ x: s.x + Math.cos(k * 2.1) * 0.04, y: s.y + h * (0.45 + k * 0.055), z: s.z + Math.sin(k * 2.1) * 0.04, s: 0.5 * 0.16, c: k % 2 ? '#7a4a5a' : '#8a5a6a' }); }
  for (const s of L.flower || []) { const h = rr(0.7, 0.95); stalks.push({ x: s.x, y: s.y, z: s.z, sx: 1, sy: h, sz: 1, c: '#5a7a2c' }); dots.push({ x: s.x, y: s.y + h, z: s.z, s: s.k < 0.45 ? 0.32 : s.k < 0.75 ? 0.22 : 0.14, c: s.k < 0.45 ? '#f0ece0' : s.k < 0.75 ? '#9a5aa8' : '#3a3020' }); }
  const t = toon(), ts = toon({ side: THREE.DoubleSide });
  if (L.chip) inst.instances(new THREE.PlaneGeometry(0.15, 0.1).rotateX(-Math.PI / 2), t, L.chip);
  if (L.grass) inst.instances(BLADE, toon({ vertexColors: true, side: THREE.DoubleSide }), L.grass, { wind: { strength: 0.18, grass: true } });
  if (L.sedge) inst.instances(SEDGE, toon({ vertexColors: true, side: THREE.DoubleSide }), L.sedge, { wind: { strength: 0.12, grass: true } });
  if (L.fern) inst.instances(FROND, ts, L.fern, { cast: true, wind: { strength: 0.06 } });
  if (L.moss) inst.instances(new THREE.SphereGeometry(0.2, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), t, L.moss);
  if (L.molehill) inst.instances(new THREE.SphereGeometry(0.16, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), t, L.molehill, { cast: true });
  if (L.twig) inst.instances(new THREE.CylinderGeometry(0.015, 0.02, 1, 4).translate(0, 0.5, 0), t, L.twig, { cast: true });
  if (L.limb) inst.instances(new THREE.CylinderGeometry(0.07, 0.1, 1, 6).translate(0, 0.5, 0), t, L.limb, { cast: true });
  if (L.rock) inst.instances(new THREE.IcosahedronGeometry(1, 0), t, L.rock, { cast: true });
  if (L.stump) inst.instances(new THREE.CylinderGeometry(0.18, 0.22, 1, 8).translate(0, 0.5, 0), t, L.stump, { cast: true });
  if (L.cone) inst.instances(new THREE.CapsuleGeometry(0.035, 0.07, 2, 5).rotateZ(Math.PI / 2), t, L.cone);
  if (L.clover) inst.sprites(shared.tex.clover, L.clover);
  if (stalks.length) inst.instances(new THREE.CylinderGeometry(0.012, 0.016, 1, 4).translate(0, 0.5, 0), t, stalks, { wind: { strength: 0.05, grass: true } });
  if (dots.length) inst.sprites(shared.tex.dot, dots);
  if (low.length) inst.clumpMesh(low, shared.tex.leaf);
}

// orange-flagged survey stakes around a place still waiting for its hand-made template
function markBespoke(plan) {
  const g = new THREE.Group(), wood = tm('#b88d58'), flag = toon({ color: C('#ff6a1a'), side: THREE.DoubleSide });
  const stake = (x, z) => { const y = yAt(x, z), s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08).translate(0, 0.6, 0), wood); s.position.set(x, y, z); s.castShadow = true; g.add(s);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.2), flag); f.position.set(x + 0.24, y + 1.08, z); g.add(f); };
  const cx = plan.x0 + plan.size / 2, cz = plan.z0 + plan.size / 2;
  for (const [dx, dz] of [[-2, -2], [2, -2], [0, 2.4]]) stake(cx + dx, cz + dz);
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
