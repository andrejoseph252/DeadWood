// Map-style orthographic camera: drag to pan across the ground, right-drag (or two fingers) to rotate and tilt,
// scroll zooms toward the cursor. Adds keyboard moves, eased rotation steps, and following an object.
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const startOffset = () => new THREE.Vector3().setFromSphericalCoords(90, THREE.MathUtils.degToRad(52), THREE.MathUtils.degToRad(35));

// half: half the plot width (the target is kept inside the plot); keys: a Set of pressed keys (lower case)
export function createCameraRig(domElement, { half, keys }) {
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 300);
  camera.position.copy(startOffset());
  const controls = new MapControls(camera, domElement);
  controls.target.set(0, 0.5, 0);
  controls.enableDamping = true; controls.dampingFactor = 0.1;
  controls.screenSpacePanning = false; controls.zoomToCursor = true; controls.zoomSpeed = 1.2;
  controls.minPolarAngle = THREE.MathUtils.degToRad(15); controls.maxPolarAngle = THREE.MathUtils.degToRad(72);
  controls.minZoom = 0.7; controls.maxZoom = 6;

  let follow = null, zoomGoal = null, rotGoal = 0, rotDone = 0, panGoal = null;
  let onFollowReleased = () => {};
  controls.addEventListener('start', () => { if (follow) { follow = null; onFollowReleased(); } zoomGoal = null; });

  const off = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
  function moveTarget(dx, dz) { controls.target.x += dx; controls.target.z += dz; camera.position.x += dx; camera.position.z += dz; }

  function update(dt) {
    // keyboard: WASD / arrows pan, Q/E rotate, +/- zoom
    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); right.crossVectors(fwd, camera.up).normalize();
    const sp = 14 * dt / camera.zoom; let kx = 0, kz = 0;
    if (keys.has('w') || keys.has('arrowup')) { kx += fwd.x; kz += fwd.z; }
    if (keys.has('s') || keys.has('arrowdown')) { kx -= fwd.x; kz -= fwd.z; }
    if (keys.has('d') || keys.has('arrowright')) { kx += right.x; kz += right.z; }
    if (keys.has('a') || keys.has('arrowleft')) { kx -= right.x; kz -= right.z; }
    if (kx || kz) { follow = null; moveTarget(kx * sp, kz * sp); }
    if (keys.has('q')) rotGoal -= dt * 1.4;
    if (keys.has('e')) rotGoal += dt * 1.4;
    if (keys.has('=') || keys.has('+')) { camera.zoom = Math.min(controls.maxZoom, camera.zoom * (1 + dt * 1.5)); camera.updateProjectionMatrix(); }
    if (keys.has('-')) { camera.zoom = Math.max(controls.minZoom, camera.zoom * (1 - dt * 1.5)); camera.updateProjectionMatrix(); }
    // eased rotation about the target
    const step = (rotGoal - rotDone) * (1 - Math.exp(-6 * dt));
    if (Math.abs(step) > 1e-5) { off.subVectors(camera.position, controls.target).applyAxisAngle(camera.up, step); camera.position.copy(controls.target).add(off); rotDone += step; }
    // follow an object, or glide to a requested point
    const goal = follow ? follow.position : panGoal;
    if (goal) { const k = 1 - Math.exp(-(follow ? 4 : 3) * dt); moveTarget((goal.x - controls.target.x) * k, (goal.z - controls.target.z) * k); if (!follow && Math.hypot(goal.x - controls.target.x, goal.z - controls.target.z) < 0.05) panGoal = null; }
    if (zoomGoal) { camera.zoom = damp(camera.zoom, zoomGoal, 3, dt); camera.updateProjectionMatrix(); if (Math.abs(camera.zoom - zoomGoal) < 0.01) zoomGoal = null; }
    // keep the view anchored on the plot
    const cx = THREE.MathUtils.clamp(controls.target.x, -half, half), cz = THREE.MathUtils.clamp(controls.target.z, -half, half);
    if (cx !== controls.target.x || cz !== controls.target.z) moveTarget(cx - controls.target.x, cz - controls.target.z);
    controls.update();
  }

  function setAspect(aspect) {
    const VIEW = aspect < 1 ? 16 / aspect : 15.5;
    camera.left = -VIEW * aspect; camera.right = VIEW * aspect; camera.top = VIEW; camera.bottom = -VIEW;
  }

  return {
    camera, controls, update, setAspect,
    overview() { follow = null; zoomGoal = 1; panGoal = new THREE.Vector3(0, 0.5, 0); },
    follow(object) { follow = object; zoomGoal = 3.2; },
    rotateBy(eighths) { rotGoal += eighths * Math.PI / 4; },
    lookAt(x, y, z) { controls.target.set(x, y, z); camera.position.copy(controls.target).add(startOffset()); },
    onFollowReleased(fn) { onFollowReleased = fn; },
  };
}
