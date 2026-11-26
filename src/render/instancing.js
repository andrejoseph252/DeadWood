// Instanced-mesh helpers bound to one scene: plain instances, camera-facing sprites, and leaf-clump crowns.
// Long lists are split into 15 m chunks, each its own InstancedMesh with a bounding sphere, so the renderer skips
// chunks outside the view (frustum culling). Each helper returns a Group holding its chunks.
import * as THREE from 'three';
import { toon } from './materials.js';
import { windify } from './wind.js';

const dummy = new THREE.Object3D(), tcol = new THREE.Color();
const CHUNK = 15;
// group list items by chunk; pos(item) gives [x, z]
function chunked(list, pos) {
  const m = new Map();
  for (const it of list) { const [x, z] = pos(it), k = Math.floor(x / CHUNK) * 1000 + Math.floor(z / CHUNK); if (!m.has(k)) m.set(k, []); m.get(k).push(it); }
  return [...m.values()];
}

export function createInstancing(scene) {
  // list items: { x, y, z, rx?, ry?, rz?, s? | sx, sy, sz, c? }
  function instances(geo, mat, list, { cast = false, wind } = {}) {
    if (wind) windify(mat, wind);
    const group = new THREE.Group(); scene.add(group);
    for (const part of chunked(list, (it) => [it.x, it.z])) {
      const im = new THREE.InstancedMesh(geo, mat, part.length);
      part.forEach((it, i) => {
        dummy.position.set(it.x, it.y, it.z); dummy.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
        if (it.sx) dummy.scale.set(it.sx, it.sy, it.sz); else dummy.scale.setScalar(it.s || 1);
        dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, tcol.set(it.c || '#ffffff'));
      });
      im.computeBoundingSphere(); im.boundingSphere.radius += 0.5;   // room for wind sway
      im.castShadow = cast; im.receiveShadow = true; group.add(im);
    }
    return group;
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
    const mat = toon({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }); windify(mat, { billboard: true, strength: 0.05 });
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5, side: THREE.DoubleSide }); windify(depth, { billboard: true, strength: 0.05 });
    const group = new THREE.Group(); scene.add(group);
    for (const part of chunked(list, (l) => [l.p.x, l.p.z])) {
      const q = new THREE.PlaneGeometry(1, 1), aN = new Float32Array(part.length * 3);   // per-chunk geometry: aNormal follows the chunk's instances
      part.forEach((l, i) => aN.set([l.n.x, l.n.y, l.n.z], i * 3)); q.setAttribute('aNormal', new THREE.InstancedBufferAttribute(aN, 3));
      const im = new THREE.InstancedMesh(q, mat, part.length); im.customDepthMaterial = depth;
      part.forEach((l, i) => { dummy.position.copy(l.p); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(l.s); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, tcol.set(l.c)); });
      im.computeBoundingSphere(); im.boundingSphere.radius += 2;   // billboards face the camera: allow their full size
      im.castShadow = im.receiveShadow = true; group.add(im);
    }
    return group;
  }

  return { instances, sprites, clumpMesh };
}
