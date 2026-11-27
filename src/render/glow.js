// A soft glow around one tree: a rim-lit shell around its crown and trunk (fresnel, additive), gently pulsing.
// It is not part of the cutaway, so the selected tree stays visible even when crowns around it dissolve.
import * as THREE from 'three';
import species from '../data/species.json' with { type: 'json' };
import { uTime } from './wind.js';

const mat = new THREE.ShaderMaterial({
  uniforms: { uTime, uColor: { value: new THREE.Color('#ffd27a') } },
  vertexShader: `varying vec3 vN; varying vec3 vV;
    void main() { vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uTime; uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
    void main() { float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); float pulse = 0.78 + 0.22 * sin(uTime * 3.2);
      gl_FragColor = vec4(uColor * (0.12 + 0.9 * rim) * pulse, 1.0); }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
});
const SPHERE = new THREE.IcosahedronGeometry(1, 3), CONE = new THREE.ConeGeometry(1, 1, 24, 1, true).translate(0, 0.5, 0), CYL = new THREE.CylinderGeometry(1, 1.15, 1, 16, 1, true).translate(0, 0.5, 0);

// t: a tree record with { kind, x, z, dbh, v } and its shape { h, r } (the estate's compressed vertical scale); gy: ground height
export function createGlow(scene) {
  const g = new THREE.Group(), crown = new THREE.Mesh(SPHERE, mat), trunk = new THREE.Mesh(CYL, mat);
  crown.renderOrder = trunk.renderOrder = 20; g.add(crown, trunk); g.visible = false; scene.add(g);
  return {
    show(t, shape, gy) {
      const conifer = t.kind === 'spruce' || t.kind === 'pine', v = t.v ?? 0.5, R = species.trees[t.kind]?.render, tr = Math.max(0.06, t.dbh / 200) * 1.6;
      const lean = (v - 0.5) * 0.12, la = v * 40, ox = lean * shape.h * Math.cos(la), oz = lean * shape.h * Math.sin(la);
      if (t.status === 'snag') { crown.visible = false; trunk.scale.set(tr, shape.h * 0.85, tr); }
      else if (conifer) { const cb = t.kind === 'pine' ? 0.6 : 0.3 + v * 0.25; crown.geometry = CONE; crown.visible = true; crown.position.set(ox * 0.6, shape.h * cb, oz * 0.6); crown.scale.set(shape.r * 1.18, shape.h * (1 - cb) * 1.08, shape.r * 1.18); trunk.scale.set(tr, shape.h * cb, tr); }
      else { const sq = R?.crown?.squash ?? 0.9; crown.geometry = SPHERE; crown.visible = true; crown.position.set(ox, shape.h - shape.r * 0.75, oz); crown.scale.set(shape.r * 1.12, shape.r * sq * 1.12, shape.r * 1.12); trunk.scale.set(tr, shape.h * (R?.trunk?.heightFrac ?? 0.55), tr); }
      g.position.set(t.x, gy, t.z); g.visible = true;
    },
    hide() { g.visible = false; },
  };
}
