// Dead wood and stones: mossy rocks, the fallen log with bracket fungi, the stump with honey fungus,
// fallen branches, and the wood ant mound.
import * as THREE from 'three';
import { hash, vnoise } from '../core/noise.js';
import { C, toon, tm } from '../render/materials.js';
import { addBranch } from '../flora/trees.js';
import { MAP, height } from './plot.js';

// where the fallen log lies (the squirrel runs along it)
export const LOG = { x: -3, z: 6.8, len: 6.2, r: 0.42, yaw: -0.35 };

// a mossy rock; stone: [grey, grey, grey] body colours, lichen: crust colour on the sides; squash: height factor
export function makeRock({ scene, rng }, x, z, s, { stone = ['#7d807a', '#8a8c85', '#6e716c'], lichen = '#a7b38f', squash = 0.7, sink = 0.15 } = {}) {
  const { rnd, pick } = rng;
  const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), k = 1 + (hash(Math.round(vx * 10) + x, Math.round(vz * 10 + vy * 7) + z) - 0.5) * 0.45; p.setXYZ(i, vx * k * 1.2, vy * k * squash, vz * k); }
  g.computeVertexNormals(); const nn = g.attributes.normal; const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const top = nn.getY(i); const c = top > 0.45 ? C(pick(['#4e7a2a', '#5d8a2f'])) : top > 0.1 && rnd() < 0.3 ? C(lichen) : C(pick(stone)); col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(g, toon({ vertexColors: true })); mesh.scale.setScalar(s); mesh.position.set(x, height(x, z) + s * sink, z); mesh.rotation.y = rnd() * 6.28; mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
  return mesh;
}

export function buildDeadWood({ scene, rng, instances }) {
  const { rnd, rr, pick } = rng;

  const rock = (x, z, s) => makeRock({ scene, rng }, x, z, s);
  [[-7, 2.5, 0.85], [-6.1, 3.4, 0.42], [8.5, 9.4, 0.9], [1.6, 9.6, 0.45], [-10.5, -11, 0.7], [11.8, -5.2, 0.6], [-2.6, -9, 0.38], [12.4, 12.4, 0.5], [-12.6, 12.6, 0.55], [6.2, 3.6, 0.3]].forEach(([x, z, s]) => rock(x, z, s));

  // fallen log, mossy on top, with bracket fungi along one side
  const { len, r } = LOG;
  const g = new THREE.CylinderGeometry(r, r * 1.1, len, 10, 8); g.rotateZ(Math.PI / 2); g.computeVertexNormals();
  const p = g.attributes.position, nn = g.attributes.normal, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); const c = nn.getY(i) > 0.75 && vnoise(x * 1.6, 3) > 0.55 ? C(pick(['#4f7c2a', '#5d8b30'])) : (x > len / 2 - 0.4 ? C('#a66a36') : C(pick(['#4b3a2a', '#57442f']))); col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const logY = height(LOG.x, LOG.z);
  const log = new THREE.Mesh(g, toon({ vertexColors: true })); log.position.set(LOG.x, logY + 0.32, LOG.z); log.rotation.y = LOG.yaw; log.castShadow = log.receiveShadow = true; scene.add(log);
  for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), tm('#d7b071')); f.position.set(-4.5 + k * 0.9, logY + 0.25, 6.8 + 0.42 + k * 0.32); f.scale.set(1, 0.45, 0.8); f.castShadow = true; scene.add(f); }

  // cut stump ringed with honey fungus
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 0.7, 10), [tm('#5e4230'), tm('#c9a26a'), tm('#5e4230')]); stump.position.set(4.6, height(4.6, -0.6) + 0.3, -0.6); stump.castShadow = stump.receiveShadow = true; scene.add(stump);
  const honey = []; for (let k = 0; k < 9; k++) { const a = rr(-0.8, 0.8); honey.push({ x: 4.6 + Math.cos(a) * 0.78, y: height(4.6, -0.6) + rr(0.05, 0.3), z: -0.6 + Math.sin(a) * 0.78, s: rr(0.7, 1.1), c: pick(['#c79a4e', '#b5863f', '#d8ae62']) }); }
  const capG = new THREE.SphereGeometry(0.09, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2); capG.scale(1, 0.6, 1);
  instances(capG, toon(), honey, { cast: true });

  // fallen branches
  for (const [x, z, a, l] of [[-7.5, -4, 0.5, 2.2], [7.8, -7.5, 2.2, 1.8], [-10, 4.5, 1.3, 1.6], [2.5, -10.5, 0.2, 2.4]]) addBranch(scene, new THREE.Vector3(x, height(x, z) + 0.05, z), new THREE.Vector3(Math.cos(a), 0.06, Math.sin(a)), l, 0.06, tm('#5a4632'));
}

// red wood ant mound at the sunny south edge of the spruce plantation
export function buildAntMound({ scene, rng }) {
  const { rnd, rr } = rng;
  const { x, z, r } = MAP.antMound, gy = height(x, z);
  const mound = new THREE.Mesh(new THREE.ConeGeometry(r, 0.75, 12, 3), tm('#6a4629')); mound.position.set(x, gy + 0.3, z); mound.castShadow = mound.receiveShadow = true; scene.add(mound);
  // Ant positions are drawn but not rendered (single pixels read as noise). The draws are kept so the
  // seeded layout of everything built after this stays the same.
  for (let k = 0; k < 40; k++) { rnd(); rr(0.1, 1.2); }
}
