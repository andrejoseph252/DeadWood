// Builds Plot 01's scene (ground, plants, features, research kit, animals) into a target object: the plot page's
// scene, or a group inside the estate (world.md section 12, E4). Every builder draws from one seeded stream.
// KEEP THIS ORDER: moving a call (or adding random draws to one) re-seeds everything after it, and the plot no
// longer regenerates identically.
import { createRng } from '../core/random.js';
import { createTextures } from '../render/textures.js';
import { createInstancing } from '../render/instancing.js';
import { buildGround } from './ground.js';
import { buildDeadWood, buildAntMound } from './props.js';
import { buildFeatures } from './features.js';
import { buildResearchKit } from './kit.js';
import { buildLitter, buildMoss } from '../flora/litter.js';
import { buildGrass } from '../flora/grass.js';
import { buildFlowers, buildTallHerbs, buildFerns } from '../flora/herbs.js';
import { buildTrees, buildSaplings, buildFoliage } from '../flora/trees.js';
import { buildShrubs, buildHedge } from '../flora/shrubs.js';
import { buildFungi } from '../flora/fungi.js';
import { buildDetails } from '../flora/details.js';
import { createFauna } from '../fauna/index.js';

// The same build as a sequence of steps, so the estate can spread it over frames (one builder per frame) instead of
// freezing while the plot builds. The result is identical to buildPlot.
export function* buildPlotSteps(scene, { seed = 9, lite = false, debug = null } = {}) {
  const rng = createRng(seed);
  const tex = createTextures(rng);
  const ctx = { scene, rng, tex, lite, debug, ...createInstancing(scene) };   // ?debug=habitats colours the ground by zone
  const clumps = { leaf: [], needle: [], low: [], lowNeedle: [] };   // tree crowns, and shrub / sapling foliage
  buildGround(ctx);
  yield;
  buildLitter(ctx);
  yield;
  buildGrass(ctx);
  yield;
  buildFlowers(ctx);
  yield;
  buildTrees(ctx, clumps);
  yield;
  buildSaplings(ctx, clumps);
  yield;
  buildShrubs(ctx, clumps);
  yield;
  const hedgeNettles = buildHedge(ctx, clumps);
  yield;
  const crowns = buildFoliage(ctx, clumps);
  yield;
  const herbs = buildTallHerbs(ctx, hedgeNettles);
  yield;
  buildFerns(ctx);
  yield;
  buildMoss(ctx);
  yield;
  buildDeadWood(ctx);
  yield;
  buildAntMound(ctx);
  yield;
  buildFeatures(ctx);
  yield;
  buildDetails(ctx);
  yield;
  ctx.sprites(ctx.tex.dot, [...herbs.webs, ...herbs.larvae]);   // peacock caterpillar tents on the nettles
  buildFungi(ctx);
  yield;
  buildResearchKit(ctx);
  yield;
  const fauna = createFauna(ctx, { foxgloves: herbs.foxgloves });
  yield;
  return { crowns, fauna, tex };
}

// returns { crowns, fauna, tex }; opts: { seed, lite, debug }
export function buildPlot(scene, opts) {
  const steps = buildPlotSteps(scene, opts);
  for (;;) { const r = steps.next(); if (r.done) return r.value; }
}
