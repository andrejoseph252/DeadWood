// Herb layer: gap flowers on stems, wood sorrel, foxglove and rosebay willowherb spikes, nettles, ferns.
import * as THREE from 'three';
import { fbm } from '../core/noise.js';
import { toon } from '../render/materials.js';
import { PUDDLE, height, sample, gapW, pathW, puddleD, clearW, canopyShade } from '../world/plot.js';

export function buildFlowers({ rng, tex, instances, sprites }) {
  const { rnd, rr, pick } = rng;
  const fl = [];
  for (let i = 0; i < 1800; i++) {
    const [x, z] = sample(rng); const gap = gapW(x, z);
    if (rnd() > gap * 0.9 || pathW(x, z) > 0.3 || puddleD(x, z) < 1.1) continue;
    if (clearW(x, z) < 0.5) continue;
    fl.push({ x, y: height(x, z) + rr(0.2, 0.45), z, c: pick(['#f3efe1', '#f3efe1', '#f4d34a', '#c9a4e6', '#e98fb4', '#ffffff', '#f6a63a']), s: rr(0.14, 0.2) });
  }
  sprites(tex.dot, fl);
  const stemG = new THREE.CylinderGeometry(0.012, 0.016, 1, 4); stemG.translate(0, 0.5, 0);
  instances(stemG, toon(), fl.map((f) => ({ x: f.x, y: height(f.x, f.z), z: f.z, sx: 1, sy: f.y - height(f.x, f.z) + 0.05, sz: 1, c: '#4f7a2c' })), { wind: { strength: 0.05, grass: true } });
  // wood sorrel: clover-like leaves in the shade, some in flower
  const clover = [];
  for (let i = 0; i < 1400 && clover.length < 380; i++) { const [x, z] = sample(rng); if (canopyShade(x, z) < 0.35 || gapW(x, z) > 0.5 || pathW(x, z) > 0.2 || fbm(x * 0.5 + 21, z * 0.5) < 0.55) continue; clover.push({ x, y: height(x, z) + 0.02, z, c: pick(['#5f9a38', '#6aa83e', '#56902f']), s: rr(0.16, 0.24) }); }
  sprites(tex.clover, clover);
  const sorrelFl = clover.filter(() => rnd() < 0.25).map((c) => ({ ...c, y: c.y + 0.12, c: '#f4eef2', s: 0.09 }));
  sprites(tex.dot, sorrelFl);
}

// tall herbs: foxglove and rosebay willowherb spikes, nettle patch by the puddle
export function buildTallHerbs({ rng, instances }) {
  const { rnd, rr } = rng;
  const spikes = [], bells = [];
  const tall = (x, z, kind) => {
    const gy = height(x, z), h = kind === 'fox' ? rr(1.0, 1.5) : rr(1.2, 1.7);
    spikes.push({ x, y: gy, z, sx: 1, sy: h, sz: 1, c: '#4f7d2c' });
    for (let k = 0; k < 10; k++) { const a = k * 2.1; bells.push({ x: x + Math.cos(a) * 0.07, y: gy + h * (0.45 + k * 0.055), z: z + Math.sin(a) * 0.07, s: kind === 'fox' ? 1 : 0.8, c: kind === 'fox' ? (k % 3 ? '#d0609f' : '#e993c4') : (k % 2 ? '#d35d9a' : '#b9478a') }); }
  };
  for (const [x, z] of [[6.8, 5.5], [7.3, 6.3], [-8.5, -1], [3.2, -8], [-6, 7.6], [9.5, -2.5]]) tall(x, z, 'fox');
  for (let i = 0; i < 300 && spikes.length < 34; i++) { const [x, z] = sample(rng, 1); const g = gapW(x, z); if (g < 0.35 || g > 0.75 || pathW(x, z) > 0.2 || fbm(x * 0.4 + 31, z * 0.4) < 0.55) continue; tall(x, z, 'willow'); }
  const stemG = new THREE.CylinderGeometry(0.025, 0.035, 1, 5); stemG.translate(0, 0.5, 0);
  instances(stemG, toon(), spikes, { cast: true, wind: { strength: 0.04 } });
  const bellG = new THREE.SphereGeometry(0.08, 6, 4); bellG.scale(1, 1.3, 1);
  instances(bellG, toon(), bells, { cast: true });
  const nettle = [];  // nitrogen-rich, damp ground
  for (let i = 0; i < 40; i++) { const a = rnd() * 6.28, d = rr(1.4, 2.4); const x = PUDDLE.x + Math.cos(a) * d, z = PUDDLE.z + Math.sin(a) * d * 0.8; if (pathW(x, z) > 0.2) continue; nettle.push({ x, y: height(x, z), z, ry: rnd() * 6, sx: 1, sy: rr(0.6, 1.0), sz: 1, c: '#3f6e2a' }); }
  const ng = new THREE.BufferGeometry(); const NP = [], NN = [];
  for (let k = 0; k < 5; k++) { const y = 0.25 + k * 0.17, a = k * 1.6, w = 0.18 - k * 0.025; NP.push(0, y, 0, Math.cos(a) * w, y - 0.04, Math.sin(a) * w, Math.cos(a + 0.5) * w * 0.6, y + 0.06, Math.sin(a + 0.5) * w * 0.6, 0, y, 0, -Math.cos(a) * w, y - 0.04, -Math.sin(a) * w, -Math.cos(a + 0.5) * w * 0.6, y + 0.06, -Math.sin(a + 0.5) * w * 0.6); for (let j = 0; j < 6; j++) NN.push(0, 1, 0); }
  NP.push(0.01, 0, 0, -0.01, 0, 0, 0, 1.05, 0); NN.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  ng.setAttribute('position', new THREE.Float32BufferAttribute(NP, 3)); ng.setAttribute('normal', new THREE.Float32BufferAttribute(NN, 3));
  instances(ng, toon({ side: THREE.DoubleSide }), nettle, { cast: true, wind: { strength: 0.06 } });
}

export function buildFerns({ rng, instances }) {
  const { rnd, rr, pick } = rng;
  const frond = new THREE.BufferGeometry(); const P = [], N = [], I = []; const SEGS = 8;
  for (let k = 0; k <= SEGS; k++) { const t = k / SEGS, w = Math.sin(Math.PI * Math.min(1, t * 1.1)) * 0.16 * (1 - t * 0.4), y = Math.sin(t * 1.9) * 0.55, x = t; P.push(x, y, -w, x, y + 0.02, w); N.push(0, 1, 0, 0, 1, 0); if (k < SEGS) { const b = k * 2; I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } }
  frond.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); frond.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); frond.setIndex(I);
  const spots = [];
  for (let i = 0; i < 900 && spots.length < 46; i++) { const [x, z] = sample(rng, 1); if (canopyShade(x, z) < 0.4 || gapW(x, z) > 0.5 || pathW(x, z) > 0.2) continue; spots.push([x, z, rr(0.8, 1.4)]); }
  spots.push([-3.5, 8, 1.2], [7.5, 6.5, 1.3], [-8, 1.5, 1.4], [8.6, 3.4, 1.1]);
  const list = [];
  for (const [x, z, s] of spots) for (let f = 0; f < 9; f++) list.push({ x, y: height(x, z), z, ry: f / 9 * Math.PI * 2 + rnd() * 0.4, s: s * rr(0.75, 1.1), c: pick(['#4f8a2e', '#5b9834', '#447a28', '#62a03a']) });
  instances(frond, toon({ side: THREE.DoubleSide }), list, { cast: true, wind: { strength: 0.06 } });
}
