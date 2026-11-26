// The Stage A map's built features: the dry-stone wall, the sandstone outcrop, stones in the stream, the
// windthrown spruces (root plates, trunks, pits), the badger sett entrances and the thinning stumps in the plantation.
// Positions come from data/map.json through plot.js; the ground shapes (ridge, step, pits, bank) are in fields.js.
import * as THREE from 'three';
import { C, toon, tm } from '../render/materials.js';
import { makeRock } from './props.js';
import { HALF, TREES, STUMPS, PLATES, SETT, STREAM, height, wallX, streamD, outcropEdge, MAP } from './plot.js';

const GREY = ['#8a867c', '#76726a', '#9b968a'], MOSS = ['#3f6b22', '#4e7a2a', '#5d8a2f', '#466f26'];
const SANDSTONE = { stone: ['#9a8a6e', '#a89878', '#8a7b62'], lichen: '#c4bf8c', squash: 0.8, sink: 0.05 };

export function buildFeatures(ctx) {
  buildWall(ctx); buildOutcrop(ctx); buildStreamStones(ctx); buildWindthrow(ctx); buildSett(ctx); buildStumps(ctx);
}

// a low collapsed ridge of mossy stones; gaps where the stream cut through and where trees grew on it
function buildWall({ rng, instances }) {
  const { rnd, rr, pick } = rng;
  const list = [], trunks = TREES.filter((t) => t.r);
  for (let z = -HALF + 0.25; z < HALF - 0.25; z += 0.3) {
    const cx = wallX(z);
    if (streamD(cx, z) < 1.3) continue;
    for (let k = 0; k < 3; k++) {
      const fallen = rnd() < 0.08, x = cx + (fallen ? rr(-1.3, 1.3) : rr(-0.45, 0.45)), zz = z + rr(-0.12, 0.12), s = rr(0.13, 0.28);
      if (trunks.some((t) => Math.hypot(t.x - x, t.z - zz) < 0.7)) continue;
      const mossy = rnd() < (fallen ? 0.4 : 0.7);
      list.push({ x, y: height(x, zz) - s * 0.15 + (fallen ? -0.05 : rr(0, 0.1)), z: zz, rx: rr(-0.4, 0.4), ry: rnd() * 6.28, sx: s * rr(1, 1.5), sy: s * rr(0.6, 0.9), sz: s, c: mossy ? pick(MOSS) : pick(GREY) });
    }
  }
  instances(new THREE.IcosahedronGeometry(1, 0), toon(), list, { cast: true });
}

// the sandstone step: big blocks along the face, boulders rolled to the foot, flat slabs on the top
function buildOutcrop(ctx) {
  const { rr } = ctx.rng, z0 = MAP.outcrop.zStart + 0.8;
  for (let z = z0; z < HALF - 0.6; z += rr(1.1, 1.6)) { const x = outcropEdge(z) + rr(-0.35, 0.05); makeRock(ctx, x, z, rr(0.85, 1.25), { ...SANDSTONE, sink: -0.1 }); }
  for (let i = 0; i < 9; i++) { const z = rr(z0, HALF - 0.8), x = outcropEdge(z) + rr(0.9, 2.4); if (streamD(x, z) < 1.2) continue; makeRock(ctx, x, z, rr(0.3, 0.6), SANDSTONE); }
  for (let i = 0; i < 6; i++) { const z = rr(z0 + 1, HALF - 1), x = rr(-HALF + 0.8, outcropEdge(z) - 1.4); makeRock(ctx, x, z, rr(0.4, 0.75), { ...SANDSTONE, squash: 0.35, sink: 0 }); }
}

// gravel and stones in the channel, mossy stones on the banks
function buildStreamStones({ rng, instances }) {
  const { rnd, rr, pick } = rng;
  const list = [];
  for (let i = 0; i < STREAM.length - 1; i++) {
    const [x0, z0] = STREAM[i], [x1, z1] = STREAM[i + 1], len = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
    for (let d = 0; d < len; d += rr(0.25, 0.6)) {
      const bank = rnd() < 0.3, o = bank ? rr(0.55, 0.9) * (rnd() < 0.5 ? -1 : 1) : rr(-0.35, 0.35);
      const x = x0 + (x1 - x0) * d / len + nx * o, z = z0 + (z1 - z0) * d / len + nz * o;
      if (Math.abs(x) > HALF - 0.2 || Math.abs(z) > HALF - 0.2) continue;
      const s = bank ? rr(0.1, 0.2) : rr(0.05, 0.13);
      list.push({ x, y: height(x, z) + s * 0.25, z, ry: rnd() * 6.28, sx: s * 1.3, sy: s * 0.6, sz: s, c: bank && rnd() < 0.6 ? pick(MOSS) : pick(['#8a867c', '#9b968a', '#6e6a62', '#a7a296']) });
    }
  }
  instances(new THREE.IcosahedronGeometry(1, 0), toon(), list, { cast: true });
}

// spruce thrown by the 2018 storm: the root plate stands on edge over its pit, the trunk lies towards the NE
function buildWindthrow({ scene, rng, instances }) {
  const { rnd, rr, pick } = rng;
  const stubs = [], roots = [];
  for (const p of PLATES) {
    // trunk length, cut short where it leaves the plot
    let len = p.len; for (let t = 0; t < p.len; t += 0.1) if (Math.abs(p.x + p.dx * t) > HALF - 0.3 || Math.abs(p.z + p.dz * t) > HALF - 0.3) { len = t; break; }
    const gy = height(p.x, p.z);
    // root plate: a soil disc on edge, facing along the trunk
    const g = new THREE.CylinderGeometry(p.r, p.r * 0.92, 0.38, 14, 1); g.rotateZ(Math.PI / 2);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), c = C(y > p.r * 0.75 ? pick(MOSS) : rnd() < 0.18 ? pick(GREY) : pick(['#4a3626', '#5a4330', '#3d2c1f', '#664c34'])); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const plate = new THREE.Mesh(g, toon({ vertexColors: true })); plate.position.set(p.x, gy + p.r * 0.72, p.z); plate.rotation.y = -p.yaw; plate.castShadow = plate.receiveShadow = true; scene.add(plate);
    // broken roots sticking out of the plate's rim
    for (let k = 0; k < 14; k++) { const a = rnd() * Math.PI * 2, rr0 = p.r * rr(0.8, 1.0); roots.push({ x: p.x - p.dz * Math.cos(a) * rr0, y: gy + p.r * 0.72 + Math.sin(a) * rr0, z: p.z + p.dx * Math.cos(a) * rr0, rx: rr(-0.5, 0.5), ry: -p.yaw + Math.PI / 2, rz: a - Math.PI / 2 + rr(-0.4, 0.4), sx: 1, sy: rr(0.3, 0.7), sz: 1, c: '#4a3626' }); }
    // trunk: from the plate's face to the ground at its tip, bark partly flaked off by woodpeckers
    const base = new THREE.Vector3(p.x + p.dx * 0.25, gy + 0.55, p.z + p.dz * 0.25);
    const tx = p.x + p.dx * len, tz = p.z + p.dz * len, tip = new THREE.Vector3(tx, height(tx, tz) + 0.14, tz);
    const dir = tip.clone().sub(base), L = dir.length();
    const tg = new THREE.CylinderGeometry(0.11, 0.24, L, 8, 6); tg.translate(0, L / 2, 0);
    const tp = tg.attributes.position, tcol = new Float32Array(tp.count * 3);
    for (let i = 0; i < tp.count; i++) { const c = C(rnd() < 0.3 ? '#a3998a' : pick(['#5e3a26', '#6a4430', '#553422'])); tcol.set([c.r, c.g, c.b], i * 3); }
    tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
    const trunk = new THREE.Mesh(tg, toon({ vertexColors: true })); trunk.position.copy(base); trunk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); trunk.castShadow = trunk.receiveShadow = true; scene.add(trunk);
    // grey dead branches along the upper trunk
    for (let k = 0; k < 18; k++) {
      const f = rr(0.35, 0.98), a = rnd() * Math.PI * 2, at = base.clone().addScaledVector(dir, L * f);
      stubs.push({ x: at.x, y: at.y + 0.05, z: at.z, rx: Math.cos(a) * 1.1, ry: -p.yaw, rz: Math.sin(a) * 1.1, sx: 1, sy: rr(0.4, 1.1) * (1.15 - f), sz: 1, c: '#8b877d' });
    }
  }
  const stub = new THREE.CylinderGeometry(0.012, 0.03, 1, 4); stub.translate(0, 0.5, 0);
  instances(stub, toon(), stubs, { cast: true });
  const root = new THREE.CylinderGeometry(0.02, 0.05, 1, 4); root.translate(0, 0.5, 0);
  instances(root, toon(), roots, { cast: true });
}

// dark entrances in the face of the sett bank, with bedding dragged out onto the spoil
function buildSett({ scene, rng, instances }) {
  const { rnd, rr, pick } = rng;
  const holeM = toon({ color: C('#120d0a') }), bedding = [];
  for (const [x, z] of SETT.entrances) {
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.24, 12, 0, Math.PI), holeM);
    hole.scale.set(1.35, 1, 1); hole.rotation.x = -0.35; hole.position.set(x, height(x, z - 0.15) - 0.02, z - 0.15); scene.add(hole);
    for (let k = 0; k < 6; k++) bedding.push({ x: x + rr(-0.5, 0.5), y: height(x, z + 0.6) + 0.04, z: z + rr(0.3, 1.2), ry: rnd() * 6.28, rx: rr(-0.3, 0.3), s: rr(0.8, 1.4), c: pick(['#c2a464', '#a8894f', '#d1b878']) });
  }
  const chip = new THREE.PlaneGeometry(0.16, 0.06); chip.rotateX(-Math.PI / 2);
  instances(chip, toon({ side: THREE.DoubleSide }), bedding);
}

// stumps from the 1990s thinning; some carry the small crust brackets of root rot (Heterobasidion annosum)
function buildStumps({ rng, instances }) {
  const { rr, pick } = rng;
  const sides = [], tops = [], brackets = [];
  for (const s of STUMPS) {
    const gy = height(s.x, s.z), h = rr(0.2, 0.35);
    sides.push({ x: s.x, y: gy, z: s.z, sx: s.r / 0.2, sy: h, sz: s.r / 0.2, c: '#5e4230' });
    tops.push({ x: s.x, y: gy + h + 0.005, z: s.z, s: s.r / 0.2, c: pick(['#8f8270', '#9c8c74']) });
    if (s.rot) for (let k = 0; k < 3; k++) { const a = k * 2.1 + s.x; brackets.push({ x: s.x + Math.cos(a) * s.r, y: gy + 0.04, z: s.z + Math.sin(a) * s.r, ry: -a, s: rr(0.7, 1), c: k ? '#7a5a3c' : '#e8dfcf' }); }
  }
  if (!sides.length) return;
  const side = new THREE.CylinderGeometry(0.18, 0.21, 1, 9); side.translate(0, 0.5, 0);
  instances(side, toon(), sides, { cast: true });
  const top = new THREE.CircleGeometry(0.19, 9); top.rotateX(-Math.PI / 2);
  instances(top, toon(), tops);
  if (brackets.length) { const b = new THREE.SphereGeometry(0.07, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2); b.scale(1, 0.4, 1.4); instances(b, toon(), brackets); }
}
