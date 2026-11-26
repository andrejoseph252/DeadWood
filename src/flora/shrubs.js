// Shrubs: bramble at the sunny gap edge, bilberry under the conifers, elder with flat white flower heads.
import * as THREE from 'three';
import { fbm } from '../core/noise.js';
import { HALF, MAP, height, sample, gapW, canopyShade, pathW, puddleD, habitatW, channelW, wallX, hedgeW, streamD } from '../world/plot.js';
import { toon } from '../render/materials.js';

const AREA = (HALF / 14) ** 2;   // counts were tuned on the 28 m prototype

export function buildShrubs({ rng, tex, sprites }, clumps) {
  const { rnd, rr, pick } = rng;
  const berries = [], umbels = [];
  for (let i = 0; i < 900 * AREA; i++) {
    const [x, z] = sample(rng, 0.8); const gap = gapW(x, z), w = habitatW(x, z);
    // bramble at the gap's sunny edge and over the windthrow and pioneer edge; bilberry on acid soil under spruce and on the rock
    const bramble = (gap > 0.25 && gap < 0.7 && fbm(x * 0.3 + 5, z * 0.3) > 0.56) || ((w[6] + w[4]) > 0.55 && fbm(x * 0.3 + 5, z * 0.3) > 0.5);
    const bil = (w[1] > 0.5 && fbm(x * 0.4 + 9, z * 0.4) > 0.6) || (w[5] > 0.6 && fbm(x * 0.4 + 9, z * 0.4) > 0.5);
    if (!(bramble || bil) || pathW(x, z) > 0.2 || puddleD(x, z) < 1.3 || channelW(x, z) > 0.05 || Math.abs(x - wallX(z)) < 0.7) continue;
    const gy = height(x, z), R = bramble ? rr(0.6, 1.1) : rr(0.45, 0.7), H = bramble ? rr(0.6, 1.0) : rr(0.22, 0.38);
    for (let k = 0; k < (bramble ? 14 : 9); k++) {
      const a = rnd() * 6.28, d = Math.sqrt(rnd()) * R, p = new THREE.Vector3(x + Math.cos(a) * d, gy + H * rr(0.3, 1), z + Math.sin(a) * d);
      clumps.low.push({ p, n: new THREE.Vector3(Math.cos(a), 0.8, Math.sin(a)).normalize(), s: rr(0.42, 0.65), c: bramble ? pick(['#3f6a2a', '#365e25', '#4a7a30']) : pick(['#4c7d34', '#5a8c3a']) });
      // June: bramble in flower with hard green fruit; bilberry fruit still green (ripens in July)
      if (rnd() < (bramble ? 0.5 : 0.25)) berries.push({ x: p.x + rr(-0.15, 0.15), y: p.y + 0.08, z: p.z + rr(-0.15, 0.15), c: bramble ? pick(['#f2e8ee', '#f4dce4', '#f2e8ee', '#7a9a3a']) : '#8aa04a', s: bramble ? 0.1 : 0.07 });
    }
  }
  for (const [x, z] of [[5.0, -11.6], [14.2, 14.2]]) {  // elder: by the sett (badgers scratch it; nitrogen-rich soil) and on the old pasture
    const gy = height(x, z);
    for (let k = 0; k < 60; k++) {
      const a = rnd() * 6.28, d = Math.sqrt(rnd()) * 1.4, p = new THREE.Vector3(x + Math.cos(a) * d, gy + rr(0.6, 2.4), z + Math.sin(a) * d);
      clumps.low.push({ p, n: new THREE.Vector3(Math.cos(a), 0.7, Math.sin(a)).normalize(), s: rr(0.7, 1.0), c: pick(['#4d7a2c', '#5a8a32']) });
      if (rnd() < 0.3) umbels.push({ x: p.x, y: p.y + 0.3, z: p.z, c: '#f4f0dc', s: rr(0.3, 0.42) });
    }
  }
  sprites(tex.dot, berries); sprites(tex.umbel, umbels);
}

// The hedge (shrub mantle) between the pioneer belt and the meadow, world.md section 3 and H5. June: hawthorn and
// blackthorn have finished flowering and carry small green fruit; dog rose is in flower; elder in flower; hazel nuts
// are still small and green. Each shrub is a few stems under a dome of leaf clumps.
const HEDGE = {
  hawthorn: { leaves: ['#2f5a24', '#3a6a2a', '#2a5020'], h: [2.4, 3.4], r: [1.1, 1.5], fruit: '#7a9a3a', n: 70 },   // Crataegus monogyna
  blackthorn: { leaves: ['#26441e', '#2e5224', '#223c1a'], h: [1.8, 2.8], r: [0.9, 1.3], fruit: '#5a7a3a', n: 55 },  // Prunus spinosa
  hazel: { leaves: ['#4a7a2e', '#568a34', '#40702a'], h: [3.2, 4.4], r: [1.3, 1.8], fruit: '#8aa04a', n: 80 },      // Corylus avellana
  rose: { leaves: ['#3e6a2c', '#4a7832'], h: [1.4, 2.2], r: [0.9, 1.2], flower: '#f2b8c6', n: 40 },                 // Rosa canina
  elder: { leaves: ['#4d7a2c', '#5a8a32'], h: [2.6, 3.4], r: [1.2, 1.5], umbel: '#f4f0dc', n: 60 },                 // Sambucus nigra
};
export function buildHedge({ rng, tex, sprites, instances }, clumps) {
  const { rnd, rr, pick } = rng;
  const stems = [], dots = [], umbels = [], nettles = [];
  const kinds = ['hawthorn', 'hawthorn', 'blackthorn', 'hazel', 'hawthorn', 'rose', 'blackthorn', 'hazel', 'elder', 'hawthorn', 'rose', 'blackthorn'];
  let k = 0;
  for (let x = wallX(23) + 1.6; x < HALF - 0.8; x += rr(1.3, 1.9)) {
    for (const row of [0, 1]) {   // two staggered rows make the mantle about 4 m deep
      const z = MAP.zones.hedgeNorth + 1.4 + row * 1.9 + rr(-0.5, 0.5), xx = x + row * 0.8, kind = kinds[k++ % kinds.length], K = HEDGE[kind];
      if (hedgeW(xx, z) < 0.5 || channelW(xx, z) > 0.02 || streamD(xx, z) < 1.4) continue;
      const gy = height(xx, z), H = rr(...K.h), R = rr(...K.r);
      for (let s = 0; s < (kind === 'hazel' ? 6 : 3); s++) { const a = rnd() * 6.28; stems.push({ x: xx + Math.cos(a) * 0.15, y: gy, z: z + Math.sin(a) * 0.15, rx: Math.sin(a) * 0.25, rz: Math.cos(a) * 0.25, sx: 1, sy: H * 0.75, sz: 1, c: kind === 'hazel' ? '#7a6a52' : '#4a3a2a' }); }
      for (let i = 0; i < K.n; i++) {
        const u = rnd() * 2 - 1, th = rnd() * 6.28, rad = Math.pow(rnd(), 0.4), sx = Math.sqrt(1 - u * u) * Math.cos(th), sz = Math.sqrt(1 - u * u) * Math.sin(th);
        const p = new THREE.Vector3(xx + sx * R * rad, gy + H * 0.55 + u * H * 0.45 * rad, z + sz * R * rad);
        clumps.low.push({ p, n: new THREE.Vector3(sx, u + 0.3, sz).normalize(), s: rr(0.55, 0.85), c: pick(K.leaves) });
        if (K.fruit && rnd() < 0.12) dots.push({ x: p.x, y: p.y + 0.05, z: p.z, c: K.fruit, s: 0.07 });
        if (K.flower && rnd() < 0.3) dots.push({ x: p.x, y: p.y + 0.06, z: p.z, c: rnd() < 0.7 ? K.flower : '#f8e8ec', s: 0.13 });
        if (K.umbel && u > 0 && rnd() < 0.3) umbels.push({ x: p.x, y: p.y + 0.25, z: p.z, c: K.umbel, s: rr(0.3, 0.4) });
      }
    }
  }
  // herb fringe: a band of nettles along the hedge's sunny inner side
  for (let x = wallX(21) + 1.2; x < HALF - 0.8; x += rr(0.25, 0.5)) {
    const z = MAP.zones.hedgeNorth + rr(-0.4, 0.6); if (hedgeW(x, z + 1.5) < 0.4 || pathW(x, z) > 0.2 || channelW(x, z) > 0.02 || fbm(x * 0.4, z * 0.4 + 7) < 0.4) continue;
    nettles.push({ x, y: height(x, z), z, ry: rnd() * 6, sx: 1, sy: rr(0.7, 1.15), sz: 1, c: pick(['#3f6e2a', '#386526']) });
  }
  const stem = new THREE.CylinderGeometry(0.025, 0.04, 1, 5); stem.translate(0, 0.5, 0);
  instances(stem, toon(), stems, { cast: true });
  sprites(tex.dot, dots); sprites(tex.umbel, umbels);
  return nettles;   // drawn with the other nettles (herbs.js)
}
