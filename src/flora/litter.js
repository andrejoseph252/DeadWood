// Forest floor detail: leaf and needle chips, spruce cones, twigs; moss cushions.
import * as THREE from 'three';
import { fbm } from '../core/noise.js';
import { toon } from '../render/materials.js';
import { HALF, TREES, height, sample, gapW, pathW, puddleD, nearKind, habitatW, channelW, charcoalW } from '../world/plot.js';

const AREA = (HALF / 14) ** 2;   // counts were tuned on the 28 m prototype

export function buildLitter({ rng, lite, instances }) {
  const { rnd, rr, pick } = rng;
  const chip = new THREE.PlaneGeometry(0.15, 0.1); chip.rotateX(-Math.PI / 2);
  const list = [];
  for (let i = 0; i < (lite ? 7000 : 13000) * AREA; i++) {
    const [x, z] = sample(rng); if (gapW(x, z) > 0.6 && rnd() < 0.85) continue; if (puddleD(x, z) < 1 || channelW(x, z) > 0.2) continue;
    const w = habitatW(x, z); if ((w[5] > 0.6 || w[4] > 0.6) && rnd() < 0.7) continue;   // little litter on rock and in the grassy edge
    const pw = pathW(x, z), sp = nearKind(x, z, 'spruce'), ch = charcoalW(x, z);
    const c = pw > 0.5 ? pick(['#9d9384', '#b8ad9c', '#7d7468']) : ch > 0.5 && rnd() < 0.6 ? pick(['#16120f', '#241d17', '#2e2720']) : sp > 0.5 ? pick(['#6a4429', '#7d5232', '#59381f']) : w[3] > 0.6 ? pick(['#4a3a28', '#3d3122', '#5a4630']) : pick(['#a87a45', '#8a6034', '#bf9258', '#6e4a2c', '#9a6c3c', '#54392a', '#c9a76a']);
    list.push({ x, y: height(x, z) + 0.03, z, ry: rnd() * 6.28, rx: rr(-0.2, 0.2), s: rr(0.7, 1.4), c });
  }
  instances(chip, toon(), list);
  const cone = new THREE.CapsuleGeometry(0.035, 0.07, 2, 5); cone.rotateZ(Math.PI / 2);
  const cones = [];
  for (let i = 0; i < 1600 && cones.length < 300; i++) { const [x, z] = sample(rng); if (nearKind(x, z, 'spruce') < 0.5) continue; cones.push({ x, y: height(x, z) + 0.04, z, ry: rnd() * 6.28, c: pick(['#7b4e2e', '#6a4026']) }); }
  instances(cone, toon(), cones);
  const twig = new THREE.CylinderGeometry(0.015, 0.02, 1, 4); twig.rotateZ(Math.PI / 2);
  const twigs = [];
  for (let i = 0; i < 260 * AREA && twigs.length < 70 * AREA; i++) { const [x, z] = sample(rng); if (gapW(x, z) > 0.5 || pathW(x, z) > 0.3) continue; twigs.push({ x, y: height(x, z) + 0.03, z, ry: rnd() * 6.28, sx: rr(0.4, 1.3), sy: 1, sz: 1, c: pick(['#4a3626', '#5c4532', '#3a2a1e']) }); }
  instances(twig, toon(), twigs, { cast: true });
}

// moss cushions in damp shade and around the broadleaf tree bases
export function buildMoss({ rng, instances }) {
  const { rnd, rr, pick } = rng;
  const cushion = new THREE.SphereGeometry(0.2, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const list = [];
  for (let i = 0; i < 1500 * AREA && list.length < 200 * AREA; i++) { const [x, z] = sample(rng); if (fbm(x * 0.35 + 11, z * 0.35) < 0.58 || gapW(x, z) > 0.4 || pathW(x, z) > 0.2 || channelW(x, z) > 0.1) continue; list.push({ x, y: height(x, z) - 0.05, z, sx: rr(0.5, 1.1), sy: rr(0.5, 0.8), sz: rr(0.5, 1.1), ry: rnd() * 6, c: pick(['#3f6f22', '#4a7d26', '#3a661f', '#557f2c']) }); }
  for (const t of TREES) if (t.kind !== 'spruce' && t.kind !== 'snag' && t.kind !== 'holly') for (let k = 0; k < 5; k++) { const a = rnd() * 6.28; list.push({ x: t.x + Math.cos(a) * 0.6, y: height(t.x, t.z), z: t.z + Math.sin(a) * 0.6, sx: 1.2, sy: 0.7, sz: 1.2, c: pick(['#4f8a26', '#5e9a2c']) }); }
  instances(cushion, toon(), list, { cast: false });
}
