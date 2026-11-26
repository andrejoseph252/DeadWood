// Toon materials with a 4-step light ramp: the banded pixel-art shading.
import * as THREE from 'three';

export const C = (h) => new THREE.Color(h);

const gradTex = (() => {
  const d = new Uint8Array([100, 100, 100, 255, 165, 165, 165, 255, 220, 220, 220, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();

export const toon = (o = {}) => new THREE.MeshToonMaterial({ gradientMap: gradTex, ...o });

// one shared toon material per colour
const matCache = {};
export const tm = (hex) => matCache[hex] || (matCache[hex] = toon({ color: C(hex) }));
