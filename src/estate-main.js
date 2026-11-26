// The estate view (world.md section 12, E3): the 1 km² forest block around Plot 01, streamed tile by tile at the
// plot's aesthetic. ?at=x,z starts somewhere else; ?still freezes time; ?canopy=off hides the crowns; ?detail=0.5 thins
// the ground cover.
import * as THREE from 'three';
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
const goto = (x, z, zoom = HOME) => { rig.lookAt(x, yAt(x, z) + 0.4, z); rig.camera.zoom = zoom; rig.camera.updateProjectionMatrix(); };
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
  if (a) { goto(a.x, a.z, 1.6); rig.follow(a.rig.root); streamer.setCanopy(false); canopyBtn.setAttribute('aria-pressed', 'false'); }   // crowns off so the animal shows (until the visibility tools, E5)
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
window.__view = async (x, z, zoom, canopy = true) => { goto(x, z, zoom ?? HOME); streamer.setCanopy(canopy); for (let k = 0; k < 1200 && streamer.update(x, z, 50) > 0; k++) await new Promise((r) => setTimeout(r, 25)); streamer.update(x, z, 50); while (plot && !plot.done && plot.group.parent) stepPlot(); };   // screenshot hook: waits for the tiles
window.__estate = { streamer, rig, fauna };

function stepPlot() {
  const r = plot.steps.next(); if (!r.done) return;
  Object.assign(plot, r.value, { done: true }); plot.crowns.forEach((m) => { m.visible = shared.canopy; streamer.crowns.add(m); });
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
  hud.setLoading(streamer.update(t.x, t.z, 6) > 0);
  if (plot && !plot.done) stepPlot(); else if (plot?.group.parent) plot.fauna.update(dt, elapsed);
  fauna.update(dt, elapsed, t.x, t.z);
  updateLabel(); map.update();
  pipeline.render(rig.camera);
});
document.body.classList.add('ready');
