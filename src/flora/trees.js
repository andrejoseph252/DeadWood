// Trees, saplings and the ivy on the oak. Crowns are collected as billboard clumps and drawn together
// by buildFoliage once the shrubs have added theirs.
import * as THREE from 'three';
import species from '../data/species.json' with { type: 'json' };
import { vnoise } from '../core/noise.js';
import { tm, toon } from '../render/materials.js';
import { TREES, SAPLINGS, height } from '../world/plot.js';

const SNAG_WOOD = '#8a857a';
const bark = (kind) => tm(species.trees[kind].render.bark);

function addTrunk(scene, t, r0, r1, h, mat, lean = 0) {
  const g = new THREE.CylinderGeometry(r1, r0, h, 8, 5); g.translate(0, h / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); const flare = Math.max(0, 1 - y / 0.9) ** 2 * 0.35; p.setX(i, p.getX(i) * (1 + flare / r0) + Math.sin(y * 0.7 + t.x) * 0.06 + lean * y); p.setZ(i, p.getZ(i) * (1 + flare / r0) + Math.cos(y * 0.5 + t.z) * 0.06); }
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat); mesh.position.set(t.x, height(t.x, t.z) - 0.15, t.z); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
}

export function addBranch(scene, base, dir, len, r, mat) {
  const g = new THREE.CylinderGeometry(r * 0.5, r, len, 5); g.translate(0, len / 2, 0);
  const mesh = new THREE.Mesh(g, mat); mesh.position.copy(base); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); mesh.castShadow = true; scene.add(mesh);
}

// clumps: { leaf: [], needle: [] } collects crown billboards for buildFoliage
export function buildTrees({ scene, rng, tex, instances, sprites }, clumps) {
  const { rnd, rr, pick } = rng;
  const birchMarks = [];
  for (const t of TREES) {
    const gy = height(t.x, t.z);
    if (t.kind === 'snag') {
      const wood = tm(SNAG_WOOD);
      addTrunk(scene, t, 0.3, 0.18, t.h, wood);
      addBranch(scene, new THREE.Vector3(t.x, gy + t.h * 0.55, t.z), new THREE.Vector3(1, 0.6, 0.2), 1.5, 0.08, wood);
      addBranch(scene, new THREE.Vector3(t.x, gy + t.h * 0.75, t.z), new THREE.Vector3(-0.8, 0.7, 0.3), 1.1, 0.06, wood);
      for (let k = 0; k < 4; k++) {  // bracket fungi up the snag
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), tm(k % 2 ? '#c9a067' : '#a9844f'));
        const a = -0.6 + k * 0.7; f.position.set(t.x + Math.cos(a) * 0.27, gy + 1.0 + k * 0.6, t.z + Math.sin(a) * 0.27); f.scale.set(1, 0.42, 1); f.castShadow = true; scene.add(f);
      }
      continue;
    }
    const R = species.trees[t.kind].render;
    if (t.kind === 'spruce') {
      addTrunk(scene, t, R.trunk.r0, R.trunk.r1, t.h, bark(t.kind));
      for (let i = 0; i < R.crown.clumps; i++) {
        const f = rnd(), y = t.h * (0.18 + 0.82 * f), rad = t.r * (1 - f) * (0.55 + 0.45 * Math.sqrt(rnd())) + 0.2, a = rnd() * Math.PI * 2;
        if (t.dead && rnd() < 0.45) continue;   // beetle-killed: thin, rust-brown crown
        clumps.needle.push({ p: new THREE.Vector3(t.x + Math.cos(a) * rad, gy + y - rad * 0.25, t.z + Math.sin(a) * rad), n: new THREE.Vector3(Math.cos(a), 0.55, Math.sin(a)).normalize(),
          s: rr(0.9, 1.4) * (0.7 + (1 - f) * 0.5), c: t.dead ? pick(R.deadNeedles) : pick(R.needles) });
      }
      continue;
    }
    // broadleaf: trunk, four main branches, a lumpy ellipsoid crown
    const trunkH = t.h * R.trunk.heightFrac;
    addTrunk(scene, t, R.trunk.r0, R.trunk.r1, trunkH, bark(t.kind), R.trunk.lean);
    if (R.lenticels) for (let k = 0; k < 14; k++) birchMarks.push({ x: t.x, y: gy + rr(0.3, trunkH), z: t.z, ry: rnd() * 6.28, sx: 1, sy: rr(0.6, 1.4), sz: 1, c: '#2a2724' });
    for (let k = 0; k < 4; k++) { const a = k * 1.7 + t.x; addBranch(scene, new THREE.Vector3(t.x, gy + trunkH * 0.85, t.z), new THREE.Vector3(Math.cos(a), 1.1, Math.sin(a)), t.r * 0.7, 0.11, bark(t.kind)); }
    const cy = gy + t.h - t.r * 0.75, count = R.crown.clumps, squash = R.crown.squash;
    for (let i = 0; i < count; i++) {
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, rad = Math.pow(rnd(), 0.35);
      const sx = Math.sqrt(1 - u * u) * Math.cos(th), sz = Math.sqrt(1 - u * u) * Math.sin(th), lump = 0.82 + 0.3 * vnoise(sx * 2 + t.x, u * 2 + sz * 2);
      clumps.leaf.push({ p: new THREE.Vector3(t.x + sx * t.r * rad * lump, cy + u * t.r * squash * rad * lump, t.z + sz * t.r * rad * lump), n: new THREE.Vector3(sx, u * 1.2 + 0.25, sz).normalize(), s: rr(1.3, 2.0) * R.crown.clumpScale, c: pick(R.leaves) });
    }
  }
  { // black lenticel marks on the birches
    const mk = new THREE.BoxGeometry(0.3, 0.04, 0.3); mk.scale(0.7, 1, 0.7);
    instances(mk, toon(), birchMarks);
  }
  { // ivy climbing the oak
    const ivy = [], oak = TREES.find((t) => t.ivy), gy = height(oak.x, oak.z);
    for (let i = 0; i < 70; i++) { const y = rr(0.2, oak.h * 0.5), a = rr(-1.6, 1.2); ivy.push({ x: oak.x + Math.cos(a) * 0.44, y: gy + y, z: oak.z + Math.sin(a) * 0.44, c: pick(['#24451f', '#2f5628', '#3a6630']), s: rr(0.18, 0.28) }); }
    sprites(tex.clover, ivy);
  }
}

// saplings regenerating in the gap
export function buildSaplings({ scene, rng }, clumps) {
  const { rnd, rr, pick } = rng;
  for (const { x, z, kind, h } of SAPLINGS) {
    const S = species.trees[kind].render.sapling, gy = height(x, z);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, h, 5).translate(0, h / 2, 0), tm(S.stem)); stem.position.set(x, gy, z); stem.castShadow = true; scene.add(stem);
    const n = Math.round(h * 10);
    for (let i = 0; i < n; i++) {
      const f = rnd(), a = rnd() * 6.28, conifer = S.conifer, rad = (conifer ? (1 - f) * 0.65 : 0.5) * Math.sqrt(rnd()) * (h < 1 ? 0.6 : 1);
      const p = new THREE.Vector3(x + Math.cos(a) * rad, gy + h * (0.35 + 0.65 * f), z + Math.sin(a) * rad);
      const col = pick(S.leaves);
      (conifer ? clumps.needle : clumps.leaf).push({ p, n: new THREE.Vector3(Math.cos(a), 0.6, Math.sin(a)).normalize(), s: rr(0.45, 0.75) * (h < 1 ? 0.6 : 1), c: col });
    }
  }
}

export function buildFoliage({ tex, clumpMesh }, clumps) {
  clumpMesh(clumps.leaf, tex.leaf); clumpMesh(clumps.needle, tex.needle);
}
