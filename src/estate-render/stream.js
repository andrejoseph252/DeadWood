// Streams estate tiles around the camera (world.md section 12, E3): tiles within one ring of the camera's tile are
// built 'near' (full detail), the next ring 'far' (crown blobs, no ground cover), and tiles further away are
// disposed. At most one tile is built per update, nearest first, so the frame rate stays even while you pan.
import { buildTile } from './tile.js';
import { HALF } from '../estate/terrain.js';
import E from '../data/estate.json' with { type: 'json' };

const N = E.size / E.tile;
export function createStreamer(scene, shared, { nearRing = 1, farRing = 2 } = {}) {
  const tiles = new Map();   // "i,j" -> { i, j, lod, built }
  const crowns = new Set();
  function update(x, z, budget = 1) {
    const ci = Math.floor((x + HALF) / E.tile), cj = Math.floor((z + HALF) / E.tile), want = [];
    for (let dj = -farRing; dj <= farRing; dj++) for (let di = -farRing; di <= farRing; di++) {
      const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= N || j >= N) continue;
      const ring = Math.max(Math.abs(di), Math.abs(dj)), lod = ring <= nearRing ? 'near' : 'far', cur = tiles.get(`${i},${j}`);
      if (!cur || cur.lod !== lod) want.push({ i, j, lod, d: Math.hypot(di, dj) });
    }
    want.sort((a, b) => a.d - b.d);
    for (const w of want.slice(0, budget)) {
      const key = `${w.i},${w.j}`, old = tiles.get(key), built = buildTile(w.i, w.j, w.lod, shared);
      scene.add(built.group); built.crowns.forEach((m) => crowns.add(m));
      if (old) drop(old);
      tiles.set(key, { i: w.i, j: w.j, lod: w.lod, built });
    }
    for (const [key, t] of tiles) if (Math.max(Math.abs(t.i - ci), Math.abs(t.j - cj)) > farRing + 1) { drop(t); tiles.delete(key); }
    return want.length - Math.min(want.length, budget);   // tiles still to build
  }
  function drop(t) { scene.remove(t.built.group); t.built.crowns.forEach((m) => crowns.delete(m)); t.built.dispose(); }
  function setCanopy(on) { shared.canopy = on; crowns.forEach((m) => { m.visible = on; }); }
  return { update, setCanopy, tiles };
}
