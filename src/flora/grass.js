// Grass in the gap (blades lit like the ground beneath them) and sedge tussocks in the shade.
import * as THREE from 'three';
import { fbm, sstep } from '../core/noise.js';
import { toon } from '../render/materials.js';
import { groundColor } from '../world/ground.js';
import { HALF, height, sample, gapW, pathW, puddleD, clearW, canopyShade, habitatW, channelW, outcropW, spoilW, pitW, charcoalW, meadowW } from '../world/plot.js';

const AREA = (HALF / 14) ** 2;   // counts were tuned on the 28 m prototype

export function buildGrass({ rng, lite, instances }) {
  const { rnd, rr, pick } = rng;
  const tcol = new THREE.Color();

  const blade = new THREE.BufferGeometry(); const P = [], CL = [], NR = [];
  for (let b = 0; b < 3; b++) {
    const a = b / 3 * Math.PI + rr(-0.3, 0.3), w = 0.06, h = rr(0.35, 0.6), lean = rr(-0.12, 0.12), dx = Math.cos(a) * w, dz = Math.sin(a) * w;
    P.push(-dx, 0, -dz, dx, 0, dz, lean, h, lean * 0.5); CL.push(0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 1.15, 1.15, 1.15); NR.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  blade.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); blade.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3)); blade.setAttribute('normal', new THREE.Float32BufferAttribute(NR, 3));
  const list = [], N = Math.round((lite ? 16000 : 40000) * AREA);
  for (let i = 0; i < N * 4 && list.length < N; i++) {
    const [x, z] = sample(rng, 0.15); const gap = gapW(x, z), pw = pathW(x, z);
    const w = habitatW(x, z), o = outcropW(x, z);
    const patch = sstep(0.68, 0.88, fbm(x * 0.3 + 2, z * 0.3)) * 0.4 * (1 - w[1] * 0.9) * (1 - w[3] * 0.5);
    const mw = meadowW(x, z);   // the meadow strip: a closed sward
    const open = Math.max(w[4] * 0.75 * sstep(0.35, 0.6, fbm(x * 0.4 + 9, z * 0.4) + 0.2), mw * 0.97, w[6] * 0.35, w[5] * 0.3 * sstep(0.5, 0.7, fbm(x * 0.6, z * 0.6 + 4)));
    const dens = Math.max(gap, patch, open) * (1 - pw) * (puddleD(x, z) < 1.05 ? 0 : 1) * clearW(x, z)
      * (channelW(x, z) > 0.05 ? 0 : 1) * (1 - sstep(0.15, 0.4, 4 * o * (1 - o))) * (1 - sstep(0.1, 0.4, spoilW(x, z) + pitW(x, z))) * (1 - charcoalW(x, z) * 0.7);
    if (rnd() > dens) continue;
    const s = rr(0.7, 1.35) * (0.55 + Math.max(gap * 0.75, mw * 1.05)); groundColor(x, z, tcol); tcol.offsetHSL(rr(-0.02, 0.02), 0.05, rr(0, 0.08));
    list.push({ x, y: height(x, z), z, ry: rnd() * 6.28, sx: s, sy: s * rr(0.8, 1.3), sz: s, c: '#' + tcol.getHexString() });
  }
  instances(blade, toon({ vertexColors: true, side: THREE.DoubleSide }), list, { wind: { strength: 0.18, grass: true } });

  // sedge tussocks in the shade: longer, darker, arching
  const sedge = new THREE.BufferGeometry(); const S = [], SN = [], SC = [];
  for (let b = 0; b < 7; b++) {
    const a = b / 7 * Math.PI * 2, w = 0.04, h = rr(0.4, 0.6), out = rr(0.25, 0.4);
    S.push(-Math.sin(a) * w, 0, Math.cos(a) * w, Math.sin(a) * w, 0, -Math.cos(a) * w, Math.cos(a) * out, h, Math.sin(a) * out);
    SN.push(0, 1, 0, 0, 1, 0, 0, 1, 0); SC.push(0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 1.1, 1.1, 1.1);
  }
  sedge.setAttribute('position', new THREE.Float32BufferAttribute(S, 3)); sedge.setAttribute('normal', new THREE.Float32BufferAttribute(SN, 3)); sedge.setAttribute('color', new THREE.Float32BufferAttribute(SC, 3));
  const tus = [];
  for (let i = 0; i < 900 * AREA && tus.length < 120 * AREA; i++) { const [x, z] = sample(rng); if (canopyShade(x, z) < 0.4 || gapW(x, z) > 0.4 || pathW(x, z) > 0.2 || channelW(x, z) > 0.1) continue; tus.push({ x, y: height(x, z), z, ry: rnd() * 6.28, s: rr(0.8, 1.3), c: pick(['#3f6626', '#4a7330', '#56803a']) }); }
  instances(sedge, toon({ vertexColors: true, side: THREE.DoubleSide }), tus, { wind: { strength: 0.12, grass: true } });
}
