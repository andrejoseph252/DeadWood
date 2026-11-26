// Building blocks for animal rigs: ellipsoids, tapered limb segments, and pivot groups (the joints).
import * as THREE from 'three';

// sphere: [width, height] segments of the shared unit sphere; radial: sides of limb segments
export function createParts({ sphere = [12, 8], radial = 7 } = {}) {
  const SPH = new THREE.SphereGeometry(1, sphere[0], sphere[1]);
  const ell = (parent, mat, p, r, rot = [0, 0, 0]) => { const m = new THREE.Mesh(SPH, mat); m.position.set(...p); m.scale.set(...r); m.rotation.set(...rot); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const seg = (parent, mat, a, b, r0, r1) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
    const g = new THREE.CylinderGeometry(r1, r0, len, radial); g.translate(0, len / 2, 0);
    const m = new THREE.Mesh(g, mat); m.position.copy(A); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const pivot = (parent, p) => { const g = new THREE.Group(); g.position.set(...p); parent.add(g); return g; };
  return { ell, seg, pivot };
}
