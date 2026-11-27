// The estate view (world.md section 12, E3): the 1 km² forest block around Plot 01, streamed tile by tile at the
// plot's aesthetic. ?at=x,z starts somewhere else; ?still freezes time; ?canopy=off hides the crowns; ?detail=0.5 thins
// the ground cover.
import * as THREE from 'three';
import { CUT, cutaway } from './render/cutaway.js';
import { createForest } from './sim/forest.js';
import { useTrees, tileTrees, treeShape } from './estate/tile-plan.js';
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
  { title: 'Open ground and water', items: [['Beaver pond', 238, 246, 'beaver'], ['Calamity clearing', 318, -292, 'tree'], ['Dead spruce reserve', 250, -330, 'tree'], ['Crags', -300, -330, 'rock'], ['Main brook', -120, 110, 'water'], ['Alder carr', 160, 215, 'water'], ['Old orchard', -305, 300, 'leaf']] },
  { title: 'To be hand-made', items: [['Old quarry', 362, -40, 'rock', 'Soon'], ['Field station', -196, 330, 'house', 'Soon']] },
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
const cutBtn = hud.button('xray', 'See through the canopy as you zoom (C)', (e, b) => { cutawayOn = b.getAttribute('aria-pressed') === 'true'; }, { toggle: true, pressed: true });
addEventListener('keydown', (e) => { if ((e.key === 'c' || e.key === 'C') && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) cutBtn.click(); });

// ---------- the estate map: minimap in the corner, full map on M or the Map button ----------
const map = createEstateMap({
  view() {
    const t = rig.controls.target, c = rig.camera, dx = t.x - c.position.x, dz = t.z - c.position.z, hz = Math.hypot(dx, dz) || 1, elev = Math.atan2(c.position.y - t.y, hz);
    return { x: t.x, z: t.z, dx: dx / hz, dz: dz / hz, w: (c.right - c.left) / c.zoom, d: (c.top - c.bottom) / c.zoom / Math.max(0.3, Math.sin(elev)) };
  },
  onJump: (x, z) => goto(Math.max(-470, Math.min(470, x)), Math.max(-470, Math.min(470, z)), rig.camera.zoom),
});
window.__view = async (x, z, zoom, canopy = true) => { goto(x, z, zoom ?? HOME); streamer.setCanopy(canopy); for (let k = 0; k < 2400 && (streamer.update(x, z, 50, viewTiles()) > 0 || !streamer.viewReady); k++) await new Promise((r) => setTimeout(r, 25)); streamer.update(x, z, 50, viewTiles()); while (plot && !plot.done && plot.group.parent) stepPlot(); };   // screenshot hook: waits for the tiles
window.__estate = { streamer, rig, fauna, get forest() { return forest; } };

// ---------- the canopy cutaway (render/cutaway.js) ----------
// Zoomed out you see the canopy; as you zoom in, crowns dissolve in a circle around the cursor (on a mouse), the
// animal you follow, or the view centre (on touch), so the forest floor shows where you are looking.
let followed = null, pointer = null, pointerT = -1e9, cutawayOn = true;
rig.onFollowReleased(() => { followed = null; });
const raycaster = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ndc = new THREE.Vector2(), hit = new THREE.Vector3(), cutGoal = new THREE.Vector3();
container.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const r = container.getBoundingClientRect(); pointer = [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1]; pointerT = performance.now(); });
container.addEventListener('pointerleave', () => { pointer = null; });
function updateCutaway(dt) {
  const z = rig.camera.zoom, t = rig.controls.target;
  const R = cutawayOn ? Math.min(1, Math.max(0, (z - 0.55) / 0.75)) * 10 + Math.min(1, Math.max(0, (z - 1.3) / 1.6)) * 5 : 0;   // metres
  CUT.uCutR.value += (R - CUT.uCutR.value) * Math.min(1, dt * 8 || 1);
  if (followed) cutGoal.set(followed.position.x, followed.position.y, followed.position.z);
  else if (pointer && performance.now() - pointerT < 4000) { plane.constant = -t.y; ndc.set(pointer[0], pointer[1]); raycaster.setFromCamera(ndc, rig.camera); if (raycaster.ray.intersectPlane(plane, hit)) cutGoal.set(hit.x, yAt(hit.x, hit.z), hit.z); }
  else cutGoal.set(t.x, yAt(t.x, t.z), t.z);
  const c = CUT.uCutC.value; if (c.y < -1e3 || dt === 0) c.copy(cutGoal); else c.lerp(cutGoal, Math.min(1, dt * 14));
}

// ---------- seasons as turns (the forest simulation: sim/forest.js) ----------
// Time moves a season at a time. "Next season" plays it out over a few seconds while the dial sweeps through the
// months; growth happens in summer, so the forest is simulated as summer turns to autumn and the 3D world refreshes
// to the new year. Auto keeps going. Progress runs 0..1 from 1 March (the start of spring).
const SEASONS = [['Spring', 0], ['Summer', 0.25], ['Autumn', 0.5], ['Winter', 0.75]], SEASON_SECONDS = 5;
let forest = null, yearRun = null, auto = false, autoT = 0, shownYear = 3;
const cal = { si: 1, year: 2026, p: 0.305, from: 0, to: 0, t: -1, growth: null };   // a June evening, study year 3
const seasons = hud.seasonControl({ onNext: nextSeason, onAuto: (on) => { auto = on; if (on && cal.t < 0) nextSeason(); } });
seasons.set('Summer', cal.year, cal.p);
const treesFor = (i, j) => { const out = []; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) out.push(...tileTrees(i + di, j + dj)); return out; };
function nextSeason() {
  if (cal.t >= 0) return;
  if (!forest) forest = createForest(generateEstate());
  const nsi = (cal.si + 1) % 4; cal.from = cal.p; cal.to = SEASONS[nsi][1] + (nsi === 0 ? 1 : 0); cal.t = 0; cal.nsi = nsi;
  if (cal.si === 1) { cal.growth = { before: forest.stats() }; yearRun = forest.yearSteps(); }   // summer is the growing season
  seasons.busy(true);
}
function stepTime(dt) {
  if (yearRun) { const t0 = performance.now(); while (performance.now() - t0 < 8) { const r = yearRun.next(); if (r.done) { cal.growth.result = r.value; yearRun = null; break; } } }
  if (cal.t >= 0) {
    cal.t = Math.min(1, cal.t + dt / SEASON_SECONDS);
    const e = cal.t < 0.5 ? 2 * cal.t * cal.t : 1 - (-2 * cal.t + 2) ** 2 / 2, p = cal.from + (cal.to - cal.from) * e;   // ease in and out
    if (cal.p < 0.833 && p % 1 >= 0.833 && cal.from < 0.833) cal.year += 1;   // 1 January
    cal.p = p % 1;
    seasons.set(SEASONS[cal.p >= 0.75 ? 3 : cal.p >= 0.5 ? 2 : cal.p >= 0.25 ? 1 : 0][0], cal.year, cal.p);
    if (cal.t >= 1 && !yearRun) endSeason();
  } else if (auto && performance.now() > autoT) nextSeason();
  if (forest && !yearRun && forest.year !== shownYear && !streamer.refreshing) { shownYear = forest.year; useTrees(generateEstate().trees); streamer.setGeneration(shownYear, treesFor); if (selected) { if (selected.fallen) clearSelection(); else showTree(selected); } }
}
function endSeason() {
  cal.t = -1; cal.si = cal.nsi; seasons.busy(false); autoT = performance.now() + 1800;
  const name = SEASONS[cal.si][0], lines = [];
  if (cal.growth) {
    const a = cal.growth.before, b = forest.stats(), r = cal.growth.result || { died: 0, born: 0 };
    lines.push(`The trees grew: basal area ${a.basalArea.toFixed(1)} → ${b.basalArea.toFixed(1)} m²/ha.`, `${r.died.toLocaleString()} trees died and stand as dead wood.`, `${r.born.toLocaleString()} saplings took hold in the gaps.`);
    cal.growth = null;
  } else lines.push({ Winter: 'Autumn is over: leaves fall and the trees go dormant.', Spring: 'Winter passes; the forest rests until spring.', Summer: 'Spring: buds break and the growing season begins.', Autumn: '' }[name]);
  seasons.summary({ title: `${name} ${cal.year}`, lines: lines.filter(Boolean) });
}

// ---------- inspect: click a tree to read it ----------
// Picking works on what you see: each nearby tree's crown is projected to the screen and the front-most crown under
// the pointer wins (a crown that the cutaway has dissolved is picked by its trunk instead). The chosen tree lights
// up through its own leaves and trunk, gently breathing, and is never cut away.
let selected = null, downAt = null, lit = null;
const pick = new THREE.Raycaster(), pickPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pickHit = new THREE.Vector3(), P0 = new THREE.Vector3(), P1 = new THREE.Vector3();
container.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY, performance.now()]; });
container.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6 || performance.now() - downAt[2] > 600) return;
  const r = container.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  ndc.set((mx / r.width) * 2 - 1, -(my / r.height) * 2 + 1); pick.setFromCamera(ndc, rig.camera);
  let gy = rig.controls.target.y; for (let k = 0; k < 3; k++) { pickPlane.constant = -gy; if (!pick.ray.intersectPlane(pickPlane, pickHit)) return; gy = yAt(pickHit.x, pickHit.z); }
  const Hh = E.size / 2, ti = Math.floor((pickHit.x + Hh) / E.tile), tj = Math.floor((pickHit.z + Hh) / E.tile);
  if (!forest) useTrees(generateEstate().trees);
  const c = rig.camera, k = r.height / ((c.top - c.bottom) / c.zoom), toScreen = (v) => { v.project(c); return [(v.x + 1) / 2 * r.width, (1 - v.y) / 2 * r.height, v.z]; };
  const cutR = CUT.uCutR.value, cc = CUT.uCutC.value;
  let best = null, bz = Infinity;
  for (const t of treesFor(ti, tj)) {
    const sh = treeShape(t), g = yAt(t.x, t.z), conifer = t.kind === 'spruce' || t.kind === 'pine', v = t.v ?? 0.5, tr = Math.max(0.06, t.dbh / 200);
    const crownHidden = cutR > 0.5 && Math.hypot(t.x - cc.x, t.z - cc.z) < cutR * 0.8 && selected !== t;
    if (t.status !== 'snag' && !crownHidden) {   // the crown as a disc on screen
      const cy = conifer ? g + sh.h * (0.62 + v * 0.06) : g + sh.h - sh.r * 0.75, [sx, sy, sz] = toScreen(P0.set(t.x, cy, t.z)), rad = sh.r * (conifer ? 0.82 : 1) * k;
      if (Math.hypot(mx - sx, my - sy) < rad && sz < bz) { bz = sz; best = t; continue; }
    }
    // the trunk as a line on screen
    const [ax, ay, az] = toScreen(P0.set(t.x, g, t.z)), [bx, by] = toScreen(P1.set(t.x, g + sh.h * (conifer ? 0.9 : 0.55), t.z));
    const dx = bx - ax, dy = by - ay, u = Math.max(0, Math.min(1, ((mx - ax) * dx + (my - ay) * dy) / (dx * dx + dy * dy || 1)));
    if (Math.hypot(mx - ax - dx * u, my - ay - dy * u) < Math.max(5, tr * k * 1.6) && az < bz) { bz = az; best = t; }
  }
  if (best) showTree(best); else clearSelection();
});
function showTree(t) {
  selected = t; hud.inspect((forest || createForest.preview).describe(t), clearSelection);
  CUT.uKeep.value.set(t.x, 0, t.z, treeShape(t).r * 1.05);
}
function clearSelection() { selected = null; CUT.uKeep.value.w = 0; hud.inspect(null); }
createForest.preview = { describe: (t) => createForest({ trees: [], patches: [] }).describe(t) };
// light the selected tree: warm and brighter, breathing slowly; restore the colours when it changes
const WARM = [0.72, 0.42, 0.05];   // a deep gold (linear colour), so the leaves glow warm rather than wash out
function updateHighlight(time) {
  const parts = selected ? streamer.treeParts(selected.id, selected.x, selected.z) : null;
  if (lit && lit.parts !== parts) { for (const [m, st, ct, orig] of lit.saved) { m.instanceColor.array.set(orig, st * 3); m.instanceColor.needsUpdate = true; } lit = null; }
  if (!parts) return;
  if (!lit) lit = { parts, saved: parts.map(([m, st, ct]) => [m, st, ct, m.instanceColor.array.slice(st * 3, (st + ct) * 3)]) };
  const b = 0.5 + 0.5 * Math.sin(time * 2.4), mix = 0.3 + 0.12 * b, gain = 1.12 + 0.12 * b;
  for (const [m, st, ct, orig] of lit.saved) {
    const a = m.instanceColor.array;
    for (let q = 0; q < ct * 3; q++) a[st * 3 + q] = (orig[q] * (1 - mix) + WARM[q % 3] * mix) * gain;
    m.instanceColor.needsUpdate = true;
  }
}

function stepPlot() {
  const r = plot.steps.next(); if (!r.done) return;
  Object.assign(plot, r.value, { done: true }); plot.crowns.forEach((m) => { m.visible = shared.canopy; streamer.crowns.add(m); });
  // Plot 01's crowns join the cutaway
  const mats = new Set(); plot.crowns.forEach((c) => c.traverse((o) => { if (o.isMesh) mats.add(o.material); })); mats.forEach((m) => cutaway(m));
  window.__rigs = plot.fauna.rigs;   // tools/scene-fingerprint.js checks Plot 01 against its baseline
}

// ---------- size and loop ----------
function resize() {
  const w = container.clientWidth, h = container.clientHeight;
  pipeline.setSize(w, h, Math.max(2, Math.round(h / 420)), rig.camera); rig.setAspect(w / h); rig.camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(container); resize();
const sunDir = sun.position.clone().normalize();
// The sun's shadow box covers the whole view at any zoom (sized in steps, so it does not breathe as you zoom), and
// its centre snaps to the shadow map's texel grid, so shadows do not shimmer as the camera moves.
const LX = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), sunDir).normalize(), LY = new THREE.Vector3().crossVectors(sunDir, LX), sc = new THREE.Vector3();
let shadowExt = 0;
function fitShadows(t) {
  const c = rig.camera, dx = t.x - c.position.x, dz = t.z - c.position.z, elev = Math.atan2(c.position.y - t.y, Math.hypot(dx, dz) || 1);
  const need = Math.max((c.right - c.left) / c.zoom, (c.top - c.bottom) / c.zoom / Math.max(0.35, Math.sin(elev))) * 0.62 + 18, ext = Math.ceil(need / 20) * 20;
  if (ext !== shadowExt) { shadowExt = ext; Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 240 }); sun.shadow.camera.updateProjectionMatrix(); }
  const texel = (2 * ext) / sun.shadow.mapSize.x; sc.set(t.x, t.y, t.z);
  const a = sc.dot(LX) / texel, b = sc.dot(LY) / texel; sc.addScaledVector(LX, (Math.round(a) - a) * texel).addScaledVector(LY, (Math.round(b) - b) * texel);
  sun.target.position.copy(sc); sun.position.copy(sc).addScaledVector(sunDir, 110); sun.target.updateMatrixWorld();
}
let last = performance.now(), elapsed = 0;
pipeline.renderer.setAnimationLoop((now) => {
  const dt = still ? 0 : Math.max(0, Math.min((now - last) / 1000, 0.05)); last = now; elapsed += dt;
  uTime.value = elapsed;
  rig.update(dt);
  const t = rig.controls.target;
  fitShadows(t);
  // under the veil there is no animation to keep smooth, so finished tiles are turned into meshes faster
  const busy = streamer.update(t.x, t.z, arriving ? 40 : 6, viewTiles()) > 0, plotting = plot && !plot.done && plot.group.parent;
  if (arriving && plotting) for (let k = 0; k < 4 && !plot.done; k++) stepPlot();
  if (arriving && streamer.viewReady && !plotting) arriving = false;
  hud.setVeil(arriving); hud.setLoading(busy && !arriving);
  updateCutaway(dt); stepTime(dt); updateHighlight(elapsed);
  if (plot && !plot.done) stepPlot(); else if (plot?.group.parent) plot.fauna.update(dt, elapsed);
  fauna.update(dt, elapsed, t.x, t.z);
  updateLabel(); map.update();
  pipeline.render(rig.camera);
});
document.body.classList.add('ready');
