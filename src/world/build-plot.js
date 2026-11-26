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

// returns { crowns, fauna, tex }; opts: { seed, lite, debug }
export function buildPlot(scene, { seed = 9, lite = false, debug = null } = {}) {
  const rng = createRng(seed);
  const tex = createTextures(rng);
  const ctx = { scene, rng, tex, lite, debug, ...createInstancing(scene) };   // ?debug=habitats colours the ground by zone
  const clumps = { leaf: [], needle: [], low: [], lowNeedle: [] };   // tree crowns, and shrub / sapling foliage
  buildGround(ctx);
  buildLitter(ctx);
  buildGrass(ctx);
  buildFlowers(ctx);
  buildTrees(ctx, clumps);
  buildSaplings(ctx, clumps);
  buildShrubs(ctx, clumps);
  const hedgeNettles = buildHedge(ctx, clumps);
  const crowns = buildFoliage(ctx, clumps);
  const herbs = buildTallHerbs(ctx, hedgeNettles);
  buildFerns(ctx);
  buildMoss(ctx);
  buildDeadWood(ctx);
  buildAntMound(ctx);
  buildFeatures(ctx);
  buildDetails(ctx);
  ctx.sprites(ctx.tex.dot, [...herbs.webs, ...herbs.larvae]);   // peacock caterpillar tents on the nettles
  buildFungi(ctx);
  buildResearchKit(ctx);
  const fauna = createFauna(ctx, { foxgloves: herbs.foxgloves });
  return { crowns, fauna, tex };
}
