// Streams estate tiles around the camera (world.md section 12, E3) without freezing the page:
// - tile data is built in a pool of Web Workers (src/estate-worker.js) on other cores; the main thread only turns
//   finished arrays into GPU buffers (tile-mesh.js), within a small per-frame time budget;
// - tiles within one ring of the camera are 'near' (full detail), the next ring 'far'; a near tile shows its far
//   version until its near data arrives;
// - built tiles are kept in a cache (least recently used dropped first), so going back is instant;
// - tiles ahead of the camera's movement are fetched before they are needed.
// If workers cannot start (a strict page policy), tiles are built on the main thread, one per frame.
import { tileMeshes } from './tile-mesh.js';
import { buildTileData } from './tile-build.js';
import { HALF } from '../estate/terrain.js';
import E from '../data/estate.json' with { type: 'json' };

const N = E.size / E.tile;
export function createStreamer(scene, shared, { nearRing = 1, onBuild = () => {}, onDrop = () => {}, workerUrl = 'estate-worker.js', cacheNear = 70, cacheFar = 60 } = {}) {
  const cache = new Map();   // "i,j|lod" -> { built, used }
  const shown = new Map();   // "i,j" -> { i, j, lod, built }
  const crowns = new Set(), pending = new Map(), ready = [];   // pending: "i,j|lod" -> true; ready: finished data
  let workers = [], idle = [], nextId = 0, jobs = new Map(), fallback = false, lastC = null, vel = [0, 0];

  // ---------- the worker pool ----------
  try {
    const n = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
    for (let k = 0; k < n; k++) {
      const w = new Worker(workerUrl);
      w.onmessage = (e) => { const job = jobs.get(e.data.id); jobs.delete(e.data.id); idle.push(w); if (e.data.error) { console.warn('tile build failed', e.data.error); pending.delete(job.key); } else ready.push({ key: job.key, data: e.data.data }); };
      w.onerror = () => { fallback = true; for (const job of jobs.values()) pending.delete(job.key); jobs.clear(); };   // fall back to the main thread
      workers.push(w); idle.push(w);
    }
  } catch { fallback = true; }

  // generations: each simulated year the forest changes, so tiles are rebuilt; until a tile's new version arrives
  // its newest older version stays on screen (no flicker, no holes)
  let gen = 0, treesFor = null;
  const latest = new Map();   // "i,j|lod" -> newest cached key
  const keyOf = (i, j, lod, g = gen) => `${i},${j}|${lod}|${g}`;
  const newest = (i, j, lod) => cache.get(keyOf(i, j, lod)) || cache.get(latest.get(`${i},${j}|${lod}`));
  function request(i, j, lod) {
    const key = keyOf(i, j, lod); if (cache.has(key) || pending.has(key)) return false;
    if (fallback) { pending.set(key, true); setTimeout(() => ready.push({ key, data: buildTileData(i, j, lod, shared.detail) }), 0); return true; }
    const w = idle.pop(); if (!w) return false;
    const id = nextId++; jobs.set(id, { key }); pending.set(key, true);
    w.postMessage({ id, i, j, lod, detail: shared.detail, trees: treesFor ? treesFor(i, j) : undefined });
    return true;
  }

  // ---------- each frame ----------
  // view: { i0, i1, j0, j1 } the tiles the screen covers (from the camera's ground footprint); every one of them, plus a
  // one-tile margin, is wanted at full detail. Far versions are only a fallback, shown if you outrun the builders.
  let viewReady = false;
  function update(x, z, budgetMs = 6, view = null) {
    const ci = Math.floor((x + HALF) / E.tile), cj = Math.floor((z + HALF) / E.tile), now = performance.now();
    if (lastC) { vel = [vel[0] * 0.9 + (x - lastC[0]) * 0.1, vel[1] * 0.9 + (z - lastC[1]) * 0.1]; } lastC = [x, z];
    // 1. turn finished data into meshes, within the time budget
    const t0 = performance.now();
    while (ready.length && performance.now() - t0 < budgetMs) {
      const { key, data } = ready.shift(); pending.delete(key);
      const built = tileMeshes(data, shared), g = +key.split('|')[2], lk = key.split('|').slice(0, 2).join('|'); cache.set(key, { built, used: now, g });
      const prevKey = latest.get(lk); if (!prevKey || cache.get(prevKey)?.g <= g) latest.set(lk, key);
    }
    // 2. what should be shown: the view's tiles plus a margin, all at full detail, nearest first
    const v = view || { i0: ci - nearRing, i1: ci + nearRing, j0: cj - nearRing, j1: cj + nearRing };
    const want = [];
    for (let j = v.j0 - 1; j <= v.j1 + 1; j++) for (let i = v.i0 - 1; i <= v.i1 + 1; i++) {
      if (i < 0 || j < 0 || i >= N || j >= N) continue;
      const inView = i >= v.i0 && i <= v.i1 && j >= v.j0 && j <= v.j1;
      want.push({ i, j, lod: 'near', inView, d: Math.hypot(i - ci, j - cj) + (inView ? 0 : 100) });   // tiles in view before the margin
    }
    want.sort((a, b) => a.d - b.d);
    for (const w of want) if (w.inView) request(w.i, w.j, 'near');
    for (const w of want) if (w.inView && !newest(w.i, w.j, 'near')) request(w.i, w.j, 'far');   // cheap fallback, only while the near build is on its way
    for (const w of want) if (!w.inView) request(w.i, w.j, 'near');
    // prefetch: tiles ahead of the movement
    const sp = Math.hypot(vel[0], vel[1]);
    if (sp > 0.02) { const ux = vel[0] / sp, uz = vel[1] / sp, ai = Math.round(ci + ux * 2), aj = Math.round(cj + uz * 2); for (const [di, dj] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const i = ai + di, j = aj + dj; if (i >= 0 && j >= 0 && i < N && j < N) request(i, j, 'near'); } }
    // 3. show the best available version of each wanted tile; hide the rest
    const keep = new Set();
    for (const w of want) {
      const k = `${w.i},${w.j}`, best = newest(w.i, w.j, 'near') || newest(w.i, w.j, 'far');
      if (!best) continue;
      keep.add(k); best.used = now;
      const cur = shown.get(k);
      if (cur?.built === best.built) continue;
      if (cur) detach(cur);
      scene.add(best.built.group); best.built.crowns.forEach((m) => { m.visible = shared.canopy; crowns.add(m); });
      const lod = newest(w.i, w.j, 'near')?.built === best.built ? 'near' : 'far';
      shown.set(k, { i: w.i, j: w.j, lod, built: best.built }); onBuild(w.i, w.j, lod);
    }
    for (const [k, s] of shown) if (!keep.has(k)) { detach(s); shown.delete(k); onDrop(s.i, s.j); }
    // 4. trim the cache: drop tiles from earlier years once off screen; then least recently used first; never what is shown
    const onScreen = new Set([...shown.values()].map((q) => q.built)), drop = (key, c) => { c.built.dispose(); cache.delete(key); };
    for (const [key, c] of [...cache]) if (c.g < gen && !onScreen.has(c.built)) drop(key, c);
    for (const [lod, max] of [['near', cacheNear], ['far', cacheFar]]) {
      const list = [...cache].filter(([key]) => key.includes(`|${lod}|`)).sort((a, b) => a[1].used - b[1].used);
      for (const [key, c] of list.slice(0, Math.max(0, list.length - max))) if (!onScreen.has(c.built)) drop(key, c);
    }
    viewReady = want.every((w) => !w.inView || shown.get(`${w.i},${w.j}`)?.lod === 'near');
    return pending.size + ready.length;
  }
  function detach(s) { scene.remove(s.built.group); s.built.crowns.forEach((m) => crowns.delete(m)); }
  function setCanopy(on) { shared.canopy = on; crowns.forEach((m) => { m.visible = on; }); }
  // a new simulated year: every tile is wanted again, built from the simulation's trees (fn(i, j) -> trees of the 3 x 3 tiles)
  function setGeneration(g, fn) { gen = g; treesFor = fn; }
  // the parts of a tree as shown now: [[mesh, start, count]] or null
  function treeParts(id, x, z) { const s = shown.get(`${Math.floor((x + HALF) / E.tile)},${Math.floor((z + HALF) / E.tile)}`); return s?.built.trees?.get(id) || null; }
  return { update, setCanopy, setGeneration, treeParts, get refreshing() { return [...shown.values()].some((s) => cache.get(keyOf(s.i, s.j, s.lod))?.built !== s.built); }, tiles: shown, crowns, get usingWorkers() { return !fallback; }, get viewReady() { return viewReady; } };
}
