// Ground mesh coloured by the plot's fields and habitats, the cut sides of the diorama block, and the water
// (puddle, spring pool, stream and backwater).
import * as THREE from 'three';
import { fbm, vnoise, sstep, hash } from '../core/noise.js';
import { C, toon, tm } from '../render/materials.js';
import { HALF, PUDDLE, WATER_Y, height, gapW, pathW, puddleD, rootedW, nearKind, habitatW, habitatAt, channelW, charcoalW, spoilW, pitW,
  outcropW, wallX, SPRING, BACKWATER, STREAM_LEN, streamAt, streamNear, waterAt } from './plot.js';

const PAL = {
  grass: [C('#5f7d2c'), C('#7f9636'), C('#9aa543')],
  litter: [C('#5a4029'), C('#6e4f30'), C('#86643c')],
  needle: [C('#4d3222'), C('#5e3d29')],
  path: [C('#8a7454'), C('#a28b66')],
  moss: [C('#3f6b22'), C('#56862a')],
  mud: C('#3e3022'),
};
// base ground of the other habitats (H1 litter and the H3 gap use the prototype's blend above)
const HPAL = {
  1: [C('#4a3020'), C('#583826'), C('#3e2a1c')],   // H2 needle floor
  3: [C('#3b3324'), C('#30291e'), C('#3e5428')],   // H4 wet dark soil, mossy
  4: [C('#6a7834'), C('#7b8a3c'), C('#5f6a30')],   // H5 grassy edge on old pasture soil
  5: [C('#6f6a58'), C('#857e66'), C('#5a6a36')],   // H6 thin soil, lichen and moss on rock
  6: [C('#4d3a28'), C('#5c4630'), C('#4b5a2a')],   // H7 churned soil, old needles, regrowth
};
const SANDSTONE = [C('#8d8068'), C('#9e8f72'), C('#7a6f5c')];
const CHARCOAL = [C('#1e1915'), C('#2b231b')], SPOIL = [C('#8c6c46'), C('#a07e52')], BED = C('#5a5040');
const DEBUG = ['#3d7a2a', '#1f4a3a', '#c9d65a', '#3a7fc0', '#e0a040', '#9a9a9a', '#b04a3a'].map(C);   // ?debug=habitats
const tmp = new THREE.Color();

// ground colour at (x, z), written into `out`; grass blades reuse it so they take the ground's light
export function groundColor(x, z, out) {
  const gap = gapW(x, z), pw = pathW(x, z), n = fbm(x * 0.6, z * 0.6), n2 = vnoise(x * 2.1, z * 2.1);
  out.copy(PAL.litter[0]).lerp(PAL.litter[1], n).lerp(PAL.litter[2], sstep(0.6, 0.9, n2) * 0.7);
  out.lerp(PAL.needle[n2 > 0.5 ? 1 : 0], sstep(0.3, 0.7, nearKind(x, z, 'spruce')) * 0.85);
  const g = new THREE.Color().copy(PAL.grass[0]).lerp(PAL.grass[1], n).lerp(PAL.grass[2], sstep(0.55, 0.85, fbm(x * 0.2 + 7, z * 0.2)) * 0.8);
  out.lerp(g, sstep(0.35, 0.6, gap + (n2 - 0.5) * 0.3));
  out.lerp(PAL.moss[n2 > 0.5 ? 1 : 0], sstep(0.6, 0.7, fbm(x * 0.35 + 11, z * 0.35)) * (1 - gap) * 0.9);
  // the other habitats, blended by weight over the H1/H3 colour
  const w = habitatW(x, z), keep = w[0] + w[2];
  let r = out.r * keep, g2 = out.g * keep, b = out.b * keep;
  for (const k of [1, 3, 4, 5, 6]) {
    if (w[k] < 0.001) continue;
    const P = HPAL[k]; tmp.copy(P[0]).lerp(P[1], n).lerp(P[2], sstep(0.55, 0.85, fbm(x * 0.5 + k * 13, z * 0.5)) * 0.8);
    r += tmp.r * w[k]; g2 += tmp.g * w[k]; b += tmp.b * w[k];
  }
  out.setRGB(r, g2, b);
  const o = outcropW(x, z), face = 4 * o * (1 - o);   // the sandstone step
  out.lerp(SANDSTONE[n2 > 0.6 ? 1 : n2 < 0.3 ? 2 : 0], sstep(0.35, 0.75, face));
  out.lerp(CHARCOAL[n2 > 0.5 ? 1 : 0], charcoalW(x, z) * 0.85);
  out.lerp(SPOIL[n2 > 0.5 ? 1 : 0], sstep(0.15, 0.5, spoilW(x, z)));
  out.lerp(PAL.mud, sstep(0.1, 0.6, pitW(x, z)) * 0.8);
  out.lerp(PAL.moss[n2 > 0.4 ? 1 : 0], sstep(0.9, 0.3, Math.abs(x - wallX(z))) * 0.7);   // moss over the wall
  out.lerp(BED, sstep(0.3, 0.8, channelW(x, z)));
  out.lerp(PAL.path[n2 > 0.55 ? 1 : 0], pw);
  out.lerp(PAL.mud, sstep(1.35, 1.0, puddleD(x, z)));
  out.lerp(n2 > 0.5 ? C('#3b2a1c') : C('#4e3825'), rootedW(x, z) * 0.9);   // ground turned over by wild boar
  return out;
}

export function buildGround({ scene, rng, debug }) {
  const { rnd, rr, pick } = rng;

  const SEG = Math.round(HALF * 14);   // ~7 cm per cell
  const gGeo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, SEG, SEG); gGeo.rotateX(-Math.PI / 2);
  const gPos = gGeo.attributes.position, gCol = new Float32Array(gPos.count * 3);
  const gc = new THREE.Color();
  for (let i = 0; i < gPos.count; i++) {
    const x = gPos.getX(i), z = gPos.getZ(i);
    gPos.setY(i, height(x, z)); if (debug === 'habitats') gc.copy(DEBUG[habitatAt(x, z)]); else groundColor(x, z, gc); gCol.set([gc.r, gc.g, gc.b], i * 3);
  }
  gGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3)); gGeo.computeVertexNormals();
  const ground = new THREE.Mesh(gGeo, toon({ vertexColors: true })); ground.receiveShadow = true; scene.add(ground);

  // the cut sides of the plot: soil horizons, roots and stones
  {
    const BASE = -4.6, N = Math.round(HALF * 8.6), ROWS = 16;
    const strata = [[0.18, C('#2a1d14')], [0.6, C('#4a3324')], [1.3, C('#6b4b33')], [2.2, C('#7d6448')], [9, C('#6e6a60')]];
    const sides = [[[-HALF, -HALF], [HALF, -HALF]], [[HALF, -HALF], [HALF, HALF]], [[HALF, HALF], [-HALF, HALF]], [[-HALF, HALF], [-HALF, -HALF]]];
    for (const [[x0, z0], [x1, z1]] of sides) {
      const P = [], CL = [], I = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, top = height(x, z);
        for (let j = 0; j <= ROWS; j++) {
          const y = top + (BASE - top) * (j / ROWS);
          const d = top - y + (vnoise(t * 30, j * 0.7) - 0.5) * 0.35;
          const c = strata.find((s) => d < s[0])[1].clone().multiplyScalar(0.9 + hash(i, j) * 0.18);
          P.push(x, y, z); CL.push(c.r, c.g, c.b);
          if (i < N && j < ROWS) { const a = i * (ROWS + 1) + j, b = a + ROWS + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3)); g.setIndex(I); g.computeVertexNormals();
      const m = new THREE.Mesh(g, toon({ vertexColors: true, side: THREE.DoubleSide })); m.receiveShadow = true; scene.add(m);
      for (let k = 0; k < Math.round(HALF); k++) {  // roots and stones in the cut face
        const t = rnd(), x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = height(x, z) - rr(0.2, 2.4);
        const out = new THREE.Vector3(z1 - z0, 0, -(x1 - x0)).normalize();
        if (rnd() < 0.55) {
          const len = rr(0.4, 1.1);
          const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, len, 4), tm('#5a4030'));
          r.position.set(x + out.x * 0.05, y, z + out.z * 0.05); r.rotation.set(rr(-1, 1), 0, rr(-1, 1)); scene.add(r);
        } else {
          const st = new THREE.Mesh(new THREE.IcosahedronGeometry(rr(0.12, 0.28), 0), tm(pick(['#8a867c', '#76726a', '#9b968a'])));
          st.position.set(x, y, z); scene.add(st);
        }
      }
    }
  }

  buildWater(scene, rng);

  // puddle with sky reflections
  {
    const water = new THREE.Mesh(new THREE.CircleGeometry(PUDDLE.r * 1.15, 24), new THREE.MeshBasicMaterial({ color: C('#3d6676') }));
    water.rotation.x = -Math.PI / 2; water.scale.y = 1 / 1.3; water.position.set(PUDDLE.x, WATER_Y, PUDDLE.z); water.receiveShadow = false; scene.add(water);
    const glint = new THREE.MeshBasicMaterial({ color: C('#a9d4dc') });
    for (let i = 0; i < 6; i++) { const g = new THREE.Mesh(new THREE.PlaneGeometry(rr(0.2, 0.5), 0.05), glint); g.rotation.x = -Math.PI / 2; g.position.set(PUDDLE.x + rr(-0.7, 0.7), WATER_Y + 0.01, PUDDLE.z + rr(-0.5, 0.5)); scene.add(g); }
  }
}

// The stream as a ribbon of water following the channel, plus the spring pool and the backwater.
// The surface never rises downstream, so a bump in the bed reads as a riffle instead of water flowing uphill.
function buildWater(scene, { rnd, rr }) {
  const waterM = new THREE.MeshBasicMaterial({ color: C('#3f6a78'), side: THREE.DoubleSide }), poolM = new THREE.MeshBasicMaterial({ color: C('#2f5260') });
  const pts = [];
  for (let s = 0; s < STREAM_LEN; s += 0.2) {
    const [x, z] = streamAt(s), [x2, z2] = streamAt(Math.min(STREAM_LEN, s + 0.2)), l = Math.hypot(x2 - x, z2 - z) || 1;
    if (Math.abs(x) > HALF - 0.02 || Math.abs(z) > HALF - 0.02) continue;
    const wob = 1 + (vnoise(s * 0.6, 7) - 0.5) * 0.4;   // width varies along the stream
    pts.push({ x, z, y: waterAt(s), nx: -(z2 - z) / l * wob, nz: (x2 - x) / l * wob });
  }
  const P = [], I = [], W = 0.5;
  pts.forEach((p, i) => { P.push(p.x + p.nx * W, p.y, p.z + p.nz * W, p.x - p.nx * W, p.y, p.z - p.nz * W); if (i) { const a = (i - 1) * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  scene.add(new THREE.Mesh(g, waterM));
  for (const pool of [SPRING, BACKWATER]) {   // still pools, darker than the running water
    const m = new THREE.Mesh(new THREE.CircleGeometry(pool.r * 1.15, 20), poolM); m.rotation.x = -Math.PI / 2;
    m.position.set(pool.x, waterAt(streamNear(pool.x, pool.z).s) + 0.005, pool.z); scene.add(m);
  }
  // glints where the water catches the sky; pale riffles over the shallows
  const glint = new THREE.MeshBasicMaterial({ color: C('#a9d4dc') }), foam = new THREE.MeshBasicMaterial({ color: C('#d9ece8') });
  for (let i = 0; i < pts.length; i += 7) {
    const p = pts[i], riffle = rnd() < 0.25;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(riffle ? 0.4 : rr(0.15, 0.35), 0.05), riffle ? foam : glint);
    m.rotation.set(-Math.PI / 2, 0, Math.atan2(p.nx, p.nz) + rr(-0.3, 0.3)); const o = rr(-0.18, 0.18);
    m.position.set(p.x + p.nx * o, p.y + 0.01, p.z + p.nz * o); scene.add(m);
  }
}
