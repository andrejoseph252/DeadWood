// Builds estate tile data off the main thread (world.md section 12, E3). Message in: { id, i, j, lod, detail };
// message out: { id, data } with every typed array transferred, not copied.
import { buildTileData, transferables } from './estate-render/tile-build.js';

self.onmessage = (e) => {
  const { id, i, j, lod, detail } = e.data;
  try { const data = buildTileData(i, j, lod, detail); self.postMessage({ id, data }, transferables(data)); }
  catch (err) { self.postMessage({ id, error: String(err && err.stack || err) }); }
};
