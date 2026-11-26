// Warm low sun with crisp shadows, plus a sky/ground hemisphere fill.
import * as THREE from 'three';
import { C } from './materials.js';

export function addLights(scene, { lite, half = 14 }) {
  const SUN_DIR = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(40), THREE.MathUtils.degToRad(300));
  const sun = new THREE.DirectionalLight(C('#ffe2b0'), 2.9);
  sun.position.copy(SUN_DIR).multiplyScalar(60);
  sun.castShadow = true; sun.shadow.mapSize.set(lite ? 2048 : 4096, lite ? 2048 : 4096);
  const ext = half * 1.6;   // covers the plot's diagonal and the trees' shadows
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 160 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(C('#a6c8ea'), C('#5e4e30'), 1.45));
  return { sun };
}
