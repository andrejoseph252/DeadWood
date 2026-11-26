// Ground fungi in June: a few early brown and white caps. Fly agaric fruits Aug-Oct, so it is absent now (world.md 6.4);
// bracket and honey fungi live with the dead wood.
import * as THREE from 'three';
import { toon } from '../render/materials.js';
import { height } from '../world/plot.js';

export function buildFungi({ rng, instances }) {
  const { rr } = rng;
  const caps = [], stems = [], spots = [];
  const add = (x, z, k) => { const gy = height(x, z), s = rr(0.8, 1.2); stems.push({ x, y: gy, z, s, c: '#efe8d6' }); caps.push({ x, y: gy + 0.19 * s, z, s, c: k === 'red' ? '#d23a26' : k === 'white' ? '#efeadf' : '#7a4a26' }); if (k === 'red') for (let d = 0; d < 3; d++) spots.push({ x: x + rr(-0.06, 0.06), y: gy + 0.26 * s, z: z + rr(-0.06, 0.06), s: 1, c: '#fbf6ea' }); };
  [[-3.8, 6.2, 'brown'], [-3.3, 5.9, 'brown'], [10.4, -8.3, 'brown'], [9.8, -8.6, 'white'], [-8.4, -6.8, 'white'], [-8, -7.3, 'white']].forEach(([x, z, k]) => add(x, z, k));
  const st = new THREE.CylinderGeometry(0.04, 0.05, 0.2, 6); st.translate(0, 0.1, 0);
  const cp = new THREE.SphereGeometry(0.13, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2); cp.scale(1, 0.75, 1);
  instances(st, toon(), stems); instances(cp, toon(), caps, { cast: true }); instances(new THREE.SphereGeometry(0.025, 4, 3), toon(), spots);
}
