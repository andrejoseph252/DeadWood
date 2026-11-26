// Shrubs: bramble at the sunny gap edge, bilberry under the conifers, elder with flat white flower heads.
import * as THREE from 'three';
import { fbm } from '../core/noise.js';
import { height, sample, gapW, canopyShade, pathW, puddleD } from '../world/plot.js';

export function buildShrubs({ rng, tex, sprites }, clumps) {
  const { rnd, rr, pick } = rng;
  const berries = [], umbels = [];
  for (let i = 0; i < 900; i++) {
    const [x, z] = sample(rng, 0.8); const gap = gapW(x, z), sh = canopyShade(x, z);
    const bramble = gap > 0.25 && gap < 0.7 && fbm(x * 0.3 + 5, z * 0.3) > 0.56;
    const bil = sh > 0.5 && fbm(x * 0.4 + 9, z * 0.4) > 0.6;
    if (!(bramble || bil) || pathW(x, z) > 0.2 || puddleD(x, z) < 1.3) continue;
    const gy = height(x, z), R = bramble ? rr(0.6, 1.1) : rr(0.45, 0.7), H = bramble ? rr(0.6, 1.0) : rr(0.22, 0.38);
    for (let k = 0; k < (bramble ? 14 : 9); k++) {
      const a = rnd() * 6.28, d = Math.sqrt(rnd()) * R, p = new THREE.Vector3(x + Math.cos(a) * d, gy + H * rr(0.3, 1), z + Math.sin(a) * d);
      clumps.leaf.push({ p, n: new THREE.Vector3(Math.cos(a), 0.8, Math.sin(a)).normalize(), s: rr(0.42, 0.65), c: bramble ? pick(['#3f6a2a', '#365e25', '#4a7a30']) : pick(['#4c7d34', '#5a8c3a']) });
      if (rnd() < 0.5) berries.push({ x: p.x + rr(-0.15, 0.15), y: p.y + 0.08, z: p.z + rr(-0.15, 0.15), c: bramble ? pick(['#2a1430', '#3a1c40', '#f2e8ee', '#c43a3a']) : '#3b4f9a', s: 0.1 });
    }
  }
  for (const [x, z] of [[-11.5, 11], [12.2, 11.8]]) {  // elder
    const gy = height(x, z);
    for (let k = 0; k < 60; k++) {
      const a = rnd() * 6.28, d = Math.sqrt(rnd()) * 1.4, p = new THREE.Vector3(x + Math.cos(a) * d, gy + rr(0.6, 2.4), z + Math.sin(a) * d);
      clumps.leaf.push({ p, n: new THREE.Vector3(Math.cos(a), 0.7, Math.sin(a)).normalize(), s: rr(0.7, 1.0), c: pick(['#4d7a2c', '#5a8a32']) });
      if (rnd() < 0.3) umbels.push({ x: p.x, y: p.y + 0.3, z: p.z, c: '#f4f0dc', s: rr(0.3, 0.42) });
    }
  }
  sprites(tex.dot, berries); sprites(tex.umbel, umbels);
}
