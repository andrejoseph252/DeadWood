// Builds estate tile data off the main thread (world.md section 12, E3). Message in: { id, i, j, lod, detail, trees? };
// message out: { id, data } with every typed array transferred, not copied.
import { buildTileData, transferables } from './estate-render/tile-build.js';
import { useTrees } from './estate/tile-plan.js';

self.onmessage = (e) => {
  const { id, i, j, lod, detail, trees } = e.data;
  try { if (trees) useTrees(trees);   // the simulation's trees for this tile and its neighbours
    const data = buildTileData(i, j, lod, detail); self.postMessage({ id, data }, transferables(data)); }
  catch (err) { self.postMessage({ id, error: String(err && err.stack || err) }); }
};
