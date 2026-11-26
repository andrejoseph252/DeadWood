// Research kit on the plot: corner stakes with flagging and a boundary string, a quadrat frame,
// numbered tree tags, and a camera trap.
import * as THREE from 'three';
import { C, toon, tm } from '../render/materials.js';
import { HALF, TREES, height } from './plot.js';

export function buildResearchKit({ scene }) {
  const wood = tm('#b88d58'), flagM = toon({ color: C('#ff6a1a'), side: THREE.DoubleSide }), white = tm('#f1ede2');
  const corners = [[-HALF + 0.35, -HALF + 0.35], [HALF - 0.35, -HALF + 0.35], [HALF - 0.35, HALF - 0.35], [-HALF + 0.35, HALF - 0.35]];
  corners.forEach(([x, z], i) => {
    const gy = height(x, z);
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08).translate(0, 0.6, 0), wood); st.position.set(x, gy, z); st.castShadow = true; scene.add(st);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.2), flagM); fl.position.set(x + 0.24, gy + 1.08, z); fl.castShadow = true; scene.add(fl);
    const [x2, z2] = corners[(i + 1) % 4];  // string between stakes
    const n = 40; for (let k = 0; k < n; k++) {
      if (k % 4 === 3) continue;
      const t = (k + 0.5) / n, sx = x + (x2 - x) * t, sz = z + (z2 - z) * t;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x2 - x) / n + 0.02, 0.02, Math.abs(z2 - z) / n + 0.02), white);
      seg.position.set(sx, Math.max(height(sx, sz) + 0.25, gy + 0.3 - Math.sin(t * Math.PI) * 0.1), sz); scene.add(seg);
    }
  });

  // 1 m quadrat frame
  const y0 = height(-1.2, -2.4) + 0.06;
  const frame = new THREE.Group(); frame.position.set(-1.2, y0, -2.4); frame.rotation.y = 0.2; scene.add(frame);
  [[0, -0.5, 1, 0.09], [0, 0.5, 1, 0.09], [-0.5, 0, 0.09, 1], [0.5, 0, 0.09, 1]].forEach(([dx, dz, w, d]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w + 0.09, 0.1, d + 0.09), white); b.position.set(dx, 0, dz); b.castShadow = true; frame.add(b); });

  // aluminium tags at breast height
  const tagM = tm('#d6d9d4');
  for (const t of TREES) { if (t.kind === 'snag') continue; const r = t.kind === 'birch' ? 0.19 : 0.4; const tag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), tagM); tag.position.set(t.x, height(t.x, t.z) + 1.3, t.z + r); scene.add(tag); }

  // camera trap strapped to the first beech
  const beech = TREES[0]; const cam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.16), tm('#3b4a2a')); cam.position.set(beech.x + 0.42, height(beech.x, beech.z) + 1.6, beech.z + 0.2); cam.rotation.y = 0.8; cam.castShadow = true; scene.add(cam);
}
