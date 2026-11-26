// The estate view (world.md section 12, E3): the 1 km² forest block around Plot 01, streamed tile by tile at the
// plot's aesthetic. ?at=x,z starts somewhere else; ?still freezes time; ?canopy=off hides the crowns.
import * as THREE from 'three';
import { createPipeline } from './render/pipeline.js';
import { createCameraRig } from './render/camera.js';
import { addLights } from './render/lights.js';
import { createTextures } from './render/textures.js';
import { uTime } from './render/wind.js';
import { createRng } from './core/random.js';
import { createKeys } from './ui/input.js';
import { createStreamer } from './estate-render/stream.js';
import { Y0 } from './estate-render/tile.js';
import { BESPOKE } from './estate/tile-plan.js';
import { generateEstate, coverAt, height, COVERS, compOf, compName } from './estate/index.js';
import { createEstateMap } from './estate-render/map.js';
import { buildPlot } from './world/build-plot.js';
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

const shared = { tex: createTextures(createRng(9)), canopy: params.get('canopy') !== 'off' };
// Plot 01 (E4): the plot scene itself, built once into its tile when that tile first comes into range, raised to
// the estate's elevation; it keeps its hand-placed detail and its own animals
let plot = null;
const [PI, PJ] = E.plot.tile;
const streamer = createStreamer(scene, shared, {
  onBuild(i, j) {
    if (i !== PI || j !== PJ) return;
    if (!plot) { const group = new THREE.Group(); group.position.set(PLOT.x, PLOT.C - Y0, PLOT.z); plot = { group, ...buildPlot(group) }; plot.crowns.forEach((m) => { m.visible = shared.canopy; streamer.crowns.add(m); }); }
    if (!plot.group.parent) scene.add(plot.group);
  },
  onDrop(i, j) { if (plot && i === PI && j === PJ) scene.remove(plot.group); },
});
const yAt = (x, z) => height(x, z) - Y0;
const goto = (x, z, zoom = HOME) => { rig.lookAt(x, yAt(x, z) + 0.4, z); rig.camera.zoom = zoom; rig.camera.updateProjectionMatrix(); };
const [sx, sz] = (params.get('at') || '-40,20').split(',').map(Number);
goto(sx, sz);
// build the tiles around the start before the first frame
while (streamer.update(sx, sz, 99) > 0);

// ---------- toolbar and the label ----------
const tag = document.querySelector('.tag'), label = { b: tag.querySelector('b'), span: tag.querySelector('span') };
let lastKey = '';
function updateLabel() {
  const t = rig.controls.target, cover = coverAt(t.x, t.z), [ci, cj] = compOf(t.x, t.z), key = `${ci},${cj},${cover}`;
  if (key === lastKey) return; lastKey = key;
  label.b.textContent = `Estate · compartment ${compName(ci, cj)} · ${COVERS[cover].name}`;
  label.span.textContent = BESPOKE[cover] ? `Flagged: ${BESPOKE[cover]} gets its own hand-made tile later` : COVERS[cover].history;
}
document.querySelector('[data-view]')?.addEventListener('click', () => { rig.camera.zoom = HOME; rig.camera.updateProjectionMatrix(); });
document.querySelectorAll('[data-rot]').forEach((b) => b.addEventListener('click', () => rig.rotateBy(+b.dataset.rot)));
const canopyBtn = document.querySelector('[data-canopy]');
canopyBtn?.setAttribute('aria-pressed', String(shared.canopy));
canopyBtn?.addEventListener('click', () => { const on = canopyBtn.getAttribute('aria-pressed') !== 'true'; canopyBtn.setAttribute('aria-pressed', String(on)); streamer.setCanopy(on); });
const go = document.querySelector('[data-goto]');
go?.addEventListener('change', () => { if (!go.value) return; const [x, z] = go.value.split(',').map(Number); goto(x, z); go.value = ''; });
// ---------- animals across the estate: rigs near the camera, data elsewhere; Follow picks the nearest of a kind ----------
const fauna = createEstateFauna(scene, { Y0 });
const follow = document.querySelector('[data-follow]');
if (follow) {
  for (const s of fauna.species) follow.append(Object.assign(document.createElement('option'), { value: s, textContent: LABEL[s] }));
  follow.addEventListener('change', () => { if (!follow.value) return; const t = rig.controls.target, a = fauna.nearest(follow.value, t.x, t.z); if (a) { goto(a.x, a.z, 1.6); rig.follow(a.rig.root); streamer.setCanopy(false); document.querySelector('[data-canopy]')?.setAttribute('aria-pressed', 'false'); } follow.value = ''; });   // crowns off so the animal shows (until the visibility tools, E5)
}

// ---------- the estate map: minimap in the corner, full map on M or the Map button ----------
const map = createEstateMap({
  view() {
    const t = rig.controls.target, c = rig.camera, dx = t.x - c.position.x, dz = t.z - c.position.z, hz = Math.hypot(dx, dz) || 1, elev = Math.atan2(c.position.y - t.y, hz);
    return { x: t.x, z: t.z, dx: dx / hz, dz: dz / hz, w: (c.right - c.left) / c.zoom, d: (c.top - c.bottom) / c.zoom / Math.max(0.3, Math.sin(elev)) };
  },
  onJump: (x, z) => goto(Math.max(-470, Math.min(470, x)), Math.max(-470, Math.min(470, z)), rig.camera.zoom),
});
document.querySelector('[data-map]')?.addEventListener('click', () => map.toggle());
window.__view = (x, z, zoom, canopy = true) => { goto(x, z, zoom ?? HOME); streamer.setCanopy(canopy); while (streamer.update(x, z, 99) > 0); };   // screenshot hook
window.__estate = { streamer, rig, fauna };

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
  streamer.update(t.x, t.z, 1);
  if (plot?.group.parent) plot.fauna.update(dt, elapsed);
  fauna.update(dt, elapsed, t.x, t.z);
  updateLabel(); map.update();
  pipeline.render(rig.camera);
});
document.body.classList.add('ready');
