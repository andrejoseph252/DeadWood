// Ground mesh coloured by the plot's fields, the cut sides of the diorama block, and the puddle.
import * as THREE from 'three';
import { fbm, vnoise, sstep, hash } from '../core/noise.js';
import { C, toon, tm } from '../render/materials.js';
import { HALF, PUDDLE, WATER_Y, height, gapW, pathW, puddleD, rootedW, nearKind } from './plot.js';

const PAL = {
  grass: [C('#5f7d2c'), C('#7f9636'), C('#9aa543')],
  litter: [C('#5a4029'), C('#6e4f30'), C('#86643c')],
  needle: [C('#4d3222'), C('#5e3d29')],
  path: [C('#8a7454'), C('#a28b66')],
  moss: [C('#3f6b22'), C('#56862a')],
  mud: C('#3e3022'),
};

// ground colour at (x, z), written into `out`; grass blades reuse it so they take the ground's light
export function groundColor(x, z, out) {
  const gap = gapW(x, z), pw = pathW(x, z), n = fbm(x * 0.6, z * 0.6), n2 = vnoise(x * 2.1, z * 2.1);
  out.copy(PAL.litter[0]).lerp(PAL.litter[1], n).lerp(PAL.litter[2], sstep(0.6, 0.9, n2) * 0.7);
  out.lerp(PAL.needle[n2 > 0.5 ? 1 : 0], sstep(0.3, 0.7, nearKind(x, z, 'spruce')) * 0.85);
  const g = new THREE.Color().copy(PAL.grass[0]).lerp(PAL.grass[1], n).lerp(PAL.grass[2], sstep(0.55, 0.85, fbm(x * 0.2 + 7, z * 0.2)) * 0.8);
  out.lerp(g, sstep(0.35, 0.6, gap + (n2 - 0.5) * 0.3));
  out.lerp(PAL.moss[n2 > 0.5 ? 1 : 0], sstep(0.6, 0.7, fbm(x * 0.35 + 11, z * 0.35)) * (1 - gap) * 0.9);
  out.lerp(PAL.path[n2 > 0.55 ? 1 : 0], pw);
  out.lerp(PAL.mud, sstep(1.35, 1.0, puddleD(x, z)));
  out.lerp(n2 > 0.5 ? C('#3b2a1c') : C('#4e3825'), rootedW(x, z) * 0.9);   // ground turned over by wild boar
  return out;
}

export function buildGround({ scene, rng }) {
  const { rnd, rr, pick } = rng;

  const SEG = 196;
  const gGeo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, SEG, SEG); gGeo.rotateX(-Math.PI / 2);
  const gPos = gGeo.attributes.position, gCol = new Float32Array(gPos.count * 3);
  const gc = new THREE.Color();
  for (let i = 0; i < gPos.count; i++) {
    const x = gPos.getX(i), z = gPos.getZ(i);
    gPos.setY(i, height(x, z)); groundColor(x, z, gc); gCol.set([gc.r, gc.g, gc.b], i * 3);
  }
  gGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3)); gGeo.computeVertexNormals();
  const ground = new THREE.Mesh(gGeo, toon({ vertexColors: true })); ground.receiveShadow = true; scene.add(ground);

  // the cut sides of the plot: soil horizons, roots and stones
  {
    const BASE = -3.2, N = 120, ROWS = 14;
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
      for (let k = 0; k < 14; k++) {  // roots and stones in the cut face
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

  // puddle with sky reflections
  {
    const water = new THREE.Mesh(new THREE.CircleGeometry(PUDDLE.r * 1.15, 24), new THREE.MeshBasicMaterial({ color: C('#3d6676') }));
    water.rotation.x = -Math.PI / 2; water.scale.y = 1 / 1.3; water.position.set(PUDDLE.x, WATER_Y, PUDDLE.z); water.receiveShadow = false; scene.add(water);
    const glint = new THREE.MeshBasicMaterial({ color: C('#a9d4dc') });
    for (let i = 0; i < 6; i++) { const g = new THREE.Mesh(new THREE.PlaneGeometry(rr(0.2, 0.5), 0.05), glint); g.rotation.x = -Math.PI / 2; g.position.set(PUDDLE.x + rr(-0.7, 0.7), WATER_Y + 0.01, PUDDLE.z + rr(-0.5, 0.5)); scene.add(g); }
  }
}
