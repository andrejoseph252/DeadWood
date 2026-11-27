// The estate view (world.md section 12, E3): the 1 km² forest block around Plot 01, streamed tile by tile at the
// plot's aesthetic. ?at=x,z starts somewhere else; ?still freezes time; ?canopy=off hides the crowns; ?detail=0.5 thins
// the ground cover.
import * as THREE from 'three';
import { CUT, cutaway } from './render/cutaway.js';
import { TREES as PLOT_TREES, height as plotH } from './world/plot.js';
import { createPipeline } from './render/pipeline.js';
import { createCameraRig } from './render/camera.js';
import { addLights } from './render/lights.js';
import { createTextures } from './render/textures.js';
import { uTime } from './render/wind.js';
import { createRng } from './core/random.js';
import { createKeys } from './ui/input.js';
import { createStreamer } from './estate-render/stream.js';
import { Y0 } from './estate-render/tile-build.js';
import { BESPOKE } from './estate/tile-plan.js';
import { generateEstate, coverAt, height, COVERS, compOf, compName } from './estate/index.js';
import { createEstateMap } from './estate-render/map.js';
import { createHud } from './ui/hud.js';
import { buildPlotSteps } from './world/build-plot.js';
import { createEstateFauna, LABEL } from './estate-render/fauna.js';
import { PLOT } from './estate/terrain.js';
import E from './data/estate.json' with { type: 'json' };

const params = new URLSearchParams(location.search), still = params.has('still');
const container = document.getElementById('app');
const pipeline = createPipeline(container), { scene } = pipeline;
const keys = createKeys();
const HOME = 0.42;   // the plot's overview zoom: one pixel ~15-20 cm, a screen ~60-100 m
const rig = createCameraRig(pipeline.renderer.domElement, { half: 470, keys, overview: HOME });
const { sun } = addLights(scene, { lite: false, half: 45 });   // a shadow box that follows the camera
generateEstate();

// ?detail=0.5 halves the ground-cover density (for slower machines)
const shared = { tex: createTextures(createRng(9)), canopy: params.get('canopy') !== 'off', detail: Math.min(1, Math.max(0.2, Number(params.get('detail')) || 1)) };
// Plot 01 (E4): the plot scene itself, built once into its tile when that tile first comes into range, raised to
// the estate's elevation; it keeps its hand-placed detail and its own animals
let plot = null;
const [PI, PJ] = E.plot.tile;
const streamer = createStreamer(scene, shared, {
  onBuild(i, j) {
    if (i !== PI || j !== PJ) return;
    // built one builder per frame (buildPlotSteps) so the page never freezes while it fills in
    if (!plot) { const group = new THREE.Group(); group.position.set(PLOT.x, PLOT.C - Y0, PLOT.z); plot = { group, steps: buildPlotSteps(group), done: false }; }
    if (!plot.group.parent) scene.add(plot.group);
  },
  onDrop(i, j) { if (plot && i === PI && j === PJ) scene.remove(plot.group); },
});
const yAt = (x, z) => height(x, z) - Y0;
// a jump arrives under a short veil until every tile in view is at full detail (no veil if they are already cached)
const goto = (x, z, zoom = HOME) => { rig.lookAt(x, yAt(x, z) + 0.4, z); rig.camera.zoom = zoom; rig.camera.updateProjectionMatrix(); arriving = true; };
let arriving = true;   // also covers the first load

// the tiles the screen covers: the four screen corners cast along the view onto the ground plane at the target's
// height (orthographic camera), as a range of tile indices; a little slack for trees standing above the ground
const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3();
function viewTiles() {
  const c = rig.camera, t = rig.controls.target; c.updateMatrixWorld();
  c.getWorldDirection(_d); _r.setFromMatrixColumn(c.matrixWorld, 0); _u.setFromMatrixColumn(c.matrixWorld, 1);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [sx, sy] of [[c.left, c.top], [c.right, c.top], [c.left, c.bottom], [c.right, c.bottom]]) for (const lift of [-4, 12]) {
    _o.copy(c.position).addScaledVector(_r, sx / c.zoom).addScaledVector(_u, sy / c.zoom);
    const k = (t.y + lift - _o.y) / (_d.y || -1e-6), gx = _o.x + _d.x * k, gz = _o.z + _d.z * k;
    x0 = Math.min(x0, gx); x1 = Math.max(x1, gx); z0 = Math.min(z0, gz); z1 = Math.max(z1, gz);
  }
  const T = E.tile, Hh = E.size / 2;
  return { i0: Math.floor((x0 + Hh) / T), i1: Math.floor((x1 + Hh) / T), j0: Math.floor((z0 + Hh) / T), j1: Math.floor((z1 + Hh) / T) };
}
const [sx, sz] = (params.get('at') || '-40,20').split(',').map(Number);
goto(sx, sz);
// no waiting: the page shows at once and tiles stream in, nearest first, from the worker pool

// ---------- the interface (src/ui/hud.js): place card, dock, menus ----------
const hud = createHud();
function updateLabel() {
  const t = rig.controls.target, cover = coverAt(t.x, t.z), [ci, cj] = compOf(t.x, t.z);
  hud.setPlace({ chip: compName(ci, cj), title: COVERS[cover].name, text: BESPOKE[cover] ? `Flagged: ${BESPOKE[cover]} gets its own hand-made version later.` : COVERS[cover].history.replace(/^./, (c) => c.toUpperCase()) + '.', flagged: !!BESPOKE[cover] });
}
const fauna = createEstateFauna(scene, { Y0 });   // animals across the estate: rigs near the camera, data elsewhere
const ANIMAL_ICON = { deer: 'deer', boar: 'boar', badger: 'badger', fox: 'fox', hare: 'hare', squirrel: 'squirrel', beaver: 'beaver', buzzard: 'buzzard' };
const ANIMAL_SUB = { deer: 'Capreolus capreolus', boar: 'Sus scrofa', badger: 'Meles meles', fox: 'Vulpes vulpes', hare: 'Lepus europaeus', squirrel: 'Sciurus vulgaris', beaver: 'Castor fiber', buzzard: 'Buteo buteo' };
const PLACES = [
  { title: 'Woods', items: [['Ancient beech–oak wood', -40, 20, 'leaf'], ['Plot 01, the research plot', 31, 31, 'plot'], ['Ravine gorge', -246, -200, 'water'], ['Oak coppice', -356, 118, 'leaf'], ['Spruce plantation', 140, -150, 'tree']] },
  { title: 'Open ground and water', items: [['Calamity clearing', 318, -292, 'tree'], ['Dead spruce reserve', 250, -330, 'tree'], ['Crags', -300, -330, 'rock'], ['Main brook', -120, 110, 'water'], ['Alder carr', 160, 215, 'water'], ['Old orchard', -305, 300, 'leaf']] },
  { title: 'To be hand-made', items: [['Beaver pond', 238, 246, 'beaver', 'Soon'], ['Old quarry', 362, -40, 'rock', 'Soon'], ['Field station', -196, 330, 'house', 'Soon']] },
];
hud.button('map', 'Map', () => map.toggle());
const followBtn = hud.button('follow', 'Follow an animal', () => {});
hud.menu(followBtn, [{ title: 'Follow the nearest', items: fauna.species.map((s) => ({ icon: ANIMAL_ICON[s], label: LABEL[s], sub: ANIMAL_SUB[s], value: s })) }], (s) => {
  const t = rig.controls.target, a = fauna.nearest(s, t.x, t.z);
  if (a) { goto(a.x, a.z, 1.6); rig.follow(a.rig.root); followed = a.rig.root; }   // the cutaway opens the canopy around it
});
const gotoBtn = hud.button('pin', 'Go to a place', () => {});
hud.menu(gotoBtn, PLACES.map((sec) => ({ title: sec.title, items: sec.items.map(([label, x, z, ic, flag]) => ({ icon: ic, label, flag, value: [x, z] })) })), ([x, z]) => goto(x, z));
hud.sep();
const canopyBtn = hud.button('tree', 'Canopy', (e, b) => streamer.setCanopy(b.getAttribute('aria-pressed') === 'true'), { toggle: true, pressed: shared.canopy });
hud.button('rotL', 'Rotate left', () => rig.rotateBy(-1));
hud.button('rotR', 'Rotate right', () => rig.rotateBy(1));
hud.button('home', 'Home zoom', () => { rig.camera.zoom = HOME; rig.camera.updateProjectionMatrix(); });

// ---------- the estate map: minimap in the corner, full map on M or the Map button ----------
const map = createEstateMap({
  view() {
    const t = rig.controls.target, c = rig.camera, dx = t.x - c.position.x, dz = t.z - c.position.z, hz = Math.hypot(dx, dz) || 1, elev = Math.atan2(c.position.y - t.y, hz);
    return { x: t.x, z: t.z, dx: dx / hz, dz: dz / hz, w: (c.right - c.left) / c.zoom, d: (c.top - c.bottom) / c.zoom / Math.max(0.3, Math.sin(elev)) };
  },
  onJump: (x, z) => goto(Math.max(-470, Math.min(470, x)), Math.max(-470, Math.min(470, z)), rig.camera.zoom),
});
window.__view = async (x, z, zoom, canopy = true) => { goto(x, z, zoom ?? HOME); streamer.setCanopy(canopy); for (let k = 0; k < 2400 && (streamer.update(x, z, 50, viewTiles()) > 0 || !streamer.viewReady); k++) await new Promise((r) => setTimeout(r, 25)); streamer.update(x, z, 50, viewTiles()); while (plot && !plot.done && plot.group.parent) stepPlot(); };   // screenshot hook: waits for the tiles
window.__estate = { streamer, rig, fauna };

// ---------- the canopy cutaway (render/cutaway.js) ----------
// Zoomed out you see the canopy; as you zoom in, crowns dissolve in a circle around the cursor (on a mouse), the
// animal you follow, or the view centre (on touch), so the forest floor shows where you are looking.
let followed = null, pointer = null, pointerT = -1e9;
rig.onFollowReleased(() => { followed = null; });
const raycaster = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ndc = new THREE.Vector2(), hit = new THREE.Vector3(), cutGoal = new THREE.Vector3();
container.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const r = container.getBoundingClientRect(); pointer = [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1]; pointerT = performance.now(); });
container.addEventListener('pointerleave', () => { pointer = null; });
function updateCutaway(dt) {
  const z = rig.camera.zoom, t = rig.controls.target;
  const R = Math.min(1, Math.max(0, (z - 0.55) / 0.75)) * 10 + Math.min(1, Math.max(0, (z - 1.3) / 1.6)) * 5;   // metres
  CUT.uCutR.value += (R - CUT.uCutR.value) * Math.min(1, dt * 8 || 1);
  if (followed) cutGoal.set(followed.position.x, followed.position.y, followed.position.z);
  else if (pointer && performance.now() - pointerT < 4000) { plane.constant = -t.y; ndc.set(pointer[0], pointer[1]); raycaster.setFromCamera(ndc, rig.camera); if (raycaster.ray.intersectPlane(plane, hit)) cutGoal.set(hit.x, yAt(hit.x, hit.z), hit.z); }
  else cutGoal.set(t.x, yAt(t.x, t.z), t.z);
  const c = CUT.uCutC.value; if (c.y < -1e3 || dt === 0) c.copy(cutGoal); else c.lerp(cutGoal, Math.min(1, dt * 14));
}

function stepPlot() {
  const r = plot.steps.next(); if (!r.done) return;
  Object.assign(plot, r.value, { done: true }); plot.crowns.forEach((m) => { m.visible = shared.canopy; streamer.crowns.add(m); });
  // Plot 01's crowns join the cutaway, and its trees get crown outlines on the ground like the estate's
  const mats = new Set(); plot.crowns.forEach((c) => c.traverse((o) => { if (o.isMesh) mats.add(o.material); })); mats.forEach((m) => cutaway(m));
  const trees = PLOT_TREES.filter((t) => t.r > 0), ring = new THREE.InstancedMesh(new THREE.RingGeometry(0.93, 1, 40).rotateX(-Math.PI / 2), cutaway(new THREE.MeshBasicMaterial({ color: '#fff4d6' }), 'ring'), trees.length), d = new THREE.Object3D();
  trees.forEach((t, k) => { d.position.set(t.x, plotH(t.x, t.z) + 0.06, t.z); d.scale.set(t.r, 1, t.r); d.updateMatrix(); ring.setMatrixAt(k, d.matrix); });
  ring.visible = shared.canopy; plot.group.add(ring); streamer.crowns.add(ring);
  window.__rigs = plot.fauna.rigs;   // tools/scene-fingerprint.js checks Plot 01 against its baseline
}

// ---------- size and loop ----------
function resize() {
  const w = container.clientWidth, h = container.clientHeight;
  pipeline.setSize(w, h, Math.max(2, Math.round(h / 420)), rig.camera); rig.setAspect(w / h); rig.camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(container); resize();
const sunDir = sun.position.clone().normalize();
let last = performance.now(), elapsed = 0;
pipeline.renderer.setAnimationLoop((now) => {
  const dt = still ? 0 : Math.max(0, Math.min((now - last) / 1000, 0.05)); last = now; elapsed += dt;
  uTime.value = elapsed;
  rig.update(dt);
  const t = rig.controls.target, sx2 = Math.round(t.x), sz2 = Math.round(t.z);   // the shadow box follows, snapped to whole metres
  sun.target.position.set(sx2, t.y, sz2); sun.position.set(sx2, t.y, sz2).addScaledVector(sunDir, 80); sun.target.updateMatrixWorld();
  // under the veil there is no animation to keep smooth, so finished tiles are turned into meshes faster
  const busy = streamer.update(t.x, t.z, arriving ? 40 : 6, viewTiles()) > 0, plotting = plot && !plot.done && plot.group.parent;
  if (arriving && plotting) for (let k = 0; k < 4 && !plot.done; k++) stepPlot();
  if (arriving && streamer.viewReady && !plotting) arriving = false;
  hud.setVeil(arriving); hud.setLoading(busy && !arriving);
  updateCutaway(dt);
  if (plot && !plot.done) stepPlot(); else if (plot?.group.parent) plot.fauna.update(dt, elapsed);
  fauna.update(dt, elapsed, t.x, t.z);
  updateLabel(); map.update();
  pipeline.render(rig.camera);
});
document.body.classList.add('ready');
