// Plot 01: a 40 m square of Central European forest around a sunlit gap, rendered as pixel art from a real 3D scene.
// 1 unit = 1 m. This file wires the pieces together; see CLAUDE.md for the module map.
import { createRng } from './core/random.js';
import { HALF, height } from './world/plot.js';
import { createPipeline } from './render/pipeline.js';
import { createCameraRig } from './render/camera.js';
import { addLights } from './render/lights.js';
import { createTextures } from './render/textures.js';
import { createInstancing } from './render/instancing.js';
import { uTime } from './render/wind.js';
import { buildGround } from './world/ground.js';
import { buildDeadWood, buildAntMound } from './world/props.js';
import { buildFeatures } from './world/features.js';
import { buildResearchKit } from './world/kit.js';
import { buildLitter, buildMoss } from './flora/litter.js';
import { buildGrass } from './flora/grass.js';
import { buildFlowers, buildTallHerbs, buildFerns } from './flora/herbs.js';
import { buildTrees, buildSaplings, buildFoliage } from './flora/trees.js';
import { buildShrubs } from './flora/shrubs.js';
import { buildFungi } from './flora/fungi.js';
import { createFauna } from './fauna/index.js';
import { createKeys } from './ui/input.js';
import { bindToolbar } from './ui/toolbar.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);   // ?lite  ?pix=N  ?zoom=N  ?look=x,z  ?seed=N  ?still  ?debug=habitats
const lite = params.has('lite') || matchMedia('(pointer: coarse)').matches;

const container = document.getElementById('app');
const pipeline = createPipeline(container);
const { scene } = pipeline;
const keys = createKeys();
const rig = createCameraRig(pipeline.renderer.domElement, { half: HALF, keys });
addLights(scene, { lite, half: HALF });

// ---------- build the scene ----------
// Every builder draws from one seeded stream. KEEP THIS ORDER: moving a call (or adding random draws to one)
// re-seeds everything after it, and the plot no longer regenerates identically.
// ?seed=N regenerates the plot from another seed (an integer from 1 to 2147483646; anything else falls back to 9).
const seedParam = Number(params.get('seed'));
const seed = Number.isInteger(seedParam) && seedParam >= 1 && seedParam < 2147483647 ? seedParam : 9;
const rng = createRng(seed);
const tex = createTextures(rng);
const ctx = { scene, rng, tex, lite, debug: params.get('debug'), ...createInstancing(scene) };   // ?debug=habitats colours the ground by zone
const clumps = { leaf: [], needle: [], low: [], lowNeedle: [] };   // tree crowns, and shrub / sapling foliage
buildGround(ctx);
buildLitter(ctx);
buildGrass(ctx);
buildFlowers(ctx);
buildTrees(ctx, clumps);
buildSaplings(ctx, clumps);
buildShrubs(ctx, clumps);
const crowns = buildFoliage(ctx, clumps);
buildTallHerbs(ctx);
buildFerns(ctx);
buildMoss(ctx);
buildDeadWood(ctx);
buildAntMound(ctx);
buildFeatures(ctx);
buildFungi(ctx);
buildResearchKit(ctx);
const fauna = createFauna(ctx);
window.__rigs = fauna.rigs;   // debugging handle (tools/scene-fingerprint.js uses it)
window.__seed = seed;

bindToolbar(rig, fauna.followable, crowns);
// debugging/screenshot hook: jump the camera (x, z = null for the overview) and show or hide the crowns
window.__view = (x, z, zoom, canopy = true) => {
  if (x == null) rig.lookAt(0, 0.5, 0); else rig.lookAt(x, height(x, z) + 0.4, z);
  rig.camera.zoom = zoom ?? rig.overviewZoom; rig.camera.updateProjectionMatrix();
  crowns.forEach((m) => { m.visible = canopy; });
};
if (params.get('canopy') === 'off') document.querySelector('[data-canopy]')?.click();   // ?canopy=off hides the tree crowns

// ---------- size and loop ----------
function resize() {
  const w = container.clientWidth, h = container.clientHeight;
  let pix = Math.max(2, Math.round(h / 420)); if (params.has('pix')) pix = +params.get('pix');
  pipeline.setSize(w, h, pix, rig.camera);
  rig.setAspect(w / h);
  if (params.has('zoom')) rig.camera.zoom = +params.get('zoom');
  if (params.has('look')) { const [lx, lz] = params.get('look').split(',').map(Number); rig.lookAt(lx, height(lx, lz) + 0.4, lz); }
  rig.camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(container); resize();

// ?still freezes time (no wind, animals hold their starting pose) so screenshots are comparable run to run.
const still = params.has('still');
let last = performance.now(), elapsed = 0;
pipeline.renderer.setAnimationLoop((now) => {
  const dt = still ? 0 : Math.min((now - last) / 1000, 0.05); last = now; elapsed += dt;
  uTime.value = reduceMotion ? elapsed * 0.3 : elapsed;
  fauna.update(dt, elapsed);
  rig.update(dt);
  pipeline.render(rig.camera);
});
document.body.classList.add('ready');
