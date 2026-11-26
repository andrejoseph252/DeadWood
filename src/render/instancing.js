// Instanced-mesh helpers bound to one scene: plain instances, camera-facing sprites, and leaf-clump crowns.
import * as THREE from 'three';
import { toon } from './materials.js';
import { windify } from './wind.js';

const dummy = new THREE.Object3D(), tcol = new THREE.Color();

export function createInstancing(scene) {
  // list items: { x, y, z, rx?, ry?, rz?, s? | sx, sy, sz, c? }
  function instances(geo, mat, list, { cast = false, wind } = {}) {
    if (wind) windify(mat, wind);
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z); dummy.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
      if (it.sx) dummy.scale.set(it.sx, it.sy, it.sz); else dummy.scale.setScalar(it.s || 1);
      dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, tcol.set(it.c || '#ffffff'));
    });
    im.castShadow = cast; im.receiveShadow = true; scene.add(im); return im;
  }

  // camera-facing little things: flowers, berries, umbels
  function sprites(tex, list) {
    const q = new THREE.PlaneGeometry(1, 1); q.translate(0, 0.5, 0);
    const aN = new Float32Array(list.length * 3); for (let i = 0; i < list.length; i++) aN.set([0, 1, 0], i * 3);
    q.setAttribute('aNormal', new THREE.InstancedBufferAttribute(aN, 3));
    return instances(q, toon({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }), list, { wind: { billboard: true, strength: 0.04 } });
  }

  // billboard leaf clumps lit with sphere-like normals; list items: { p: Vector3, n: Vector3, s, c }
  function clumpMesh(list, tex) {
    const q = new THREE.PlaneGeometry(1, 1);
    const aN = new Float32Array(list.length * 3); list.forEach((l, i) => aN.set([l.n.x, l.n.y, l.n.z], i * 3));
    q.setAttribute('aNormal', new THREE.InstancedBufferAttribute(aN, 3));
    const mat = toon({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }); windify(mat, { billboard: true, strength: 0.05 });
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5, side: THREE.DoubleSide }); windify(depth, { billboard: true, strength: 0.05 });
    const im = new THREE.InstancedMesh(q, mat, list.length); im.customDepthMaterial = depth;
    list.forEach((l, i) => { dummy.position.copy(l.p); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(l.s); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, tcol.set(l.c)); });
    im.castShadow = im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
    return im;
  }

  return { instances, sprites, clumpMesh };
}
