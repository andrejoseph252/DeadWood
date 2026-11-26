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
export function createStreamer(scene, shared, { nearRing = 1, farRing = 2, onBuild = () => {}, onDrop = () => {}, workerUrl = 'estate-worker.js', cacheNear = 22, cacheFar = 60 } = {}) {
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

  const keyOf = (i, j, lod) => `${i},${j}|${lod}`;
  function request(i, j, lod) {
    const key = keyOf(i, j, lod); if (cache.has(key) || pending.has(key)) return false;
    if (fallback) { pending.set(key, true); setTimeout(() => ready.push({ key, data: buildTileData(i, j, lod, shared.detail) }), 0); return true; }
    const w = idle.pop(); if (!w) return false;
    const id = nextId++; jobs.set(id, { key }); pending.set(key, true);
    w.postMessage({ id, i, j, lod, detail: shared.detail });
    return true;
  }

  // ---------- each frame ----------
  function update(x, z, budgetMs = 6) {
    const ci = Math.floor((x + HALF) / E.tile), cj = Math.floor((z + HALF) / E.tile), now = performance.now();
    if (lastC) { vel = [vel[0] * 0.9 + (x - lastC[0]) * 0.1, vel[1] * 0.9 + (z - lastC[1]) * 0.1]; } lastC = [x, z];
    // 1. turn finished data into meshes, within the time budget
    const t0 = performance.now();
    while (ready.length && performance.now() - t0 < budgetMs) {
      const { key, data } = ready.shift(); pending.delete(key);
      const built = tileMeshes(data, shared); cache.set(key, { built, used: now });
    }
    // 2. what should be shown, nearest first; request what is missing
    const want = [];
    for (let dj = -farRing; dj <= farRing; dj++) for (let di = -farRing; di <= farRing; di++) {
      const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= N || j >= N) continue;
      want.push({ i, j, lod: Math.max(Math.abs(di), Math.abs(dj)) <= nearRing ? 'near' : 'far', d: Math.hypot(di, dj) });
    }
    want.sort((a, b) => a.d - b.d);
    for (const w of want) { if (!cache.has(keyOf(w.i, w.j, 'far'))) request(w.i, w.j, 'far'); }   // far versions first: something to show quickly
    for (const w of want) if (w.lod === 'near') request(w.i, w.j, 'near');
    // prefetch: tiles ahead of the movement
    const sp = Math.hypot(vel[0], vel[1]);
    if (sp > 0.02) { const ux = vel[0] / sp, uz = vel[1] / sp, ai = Math.round(ci + ux * 2), aj = Math.round(cj + uz * 2); for (const [di, dj] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const i = ai + di, j = aj + dj; if (i >= 0 && j >= 0 && i < N && j < N) request(i, j, 'near'); } }
    // 3. show the best available version of each wanted tile; hide the rest
    const keep = new Set();
    for (const w of want) {
      const k = `${w.i},${w.j}`, best = cache.get(keyOf(w.i, w.j, w.lod)) || cache.get(keyOf(w.i, w.j, w.lod === 'near' ? 'far' : 'near'));
      if (!best) continue;
      keep.add(k); best.used = now;
      const cur = shown.get(k);
      if (cur?.built === best.built) continue;
      if (cur) detach(cur);
      scene.add(best.built.group); best.built.crowns.forEach((m) => { m.visible = shared.canopy; crowns.add(m); });
      const lod = cache.get(keyOf(w.i, w.j, 'near'))?.built === best.built ? 'near' : 'far';
      shown.set(k, { i: w.i, j: w.j, lod, built: best.built }); onBuild(w.i, w.j, lod);
    }
    for (const [k, s] of shown) if (!keep.has(k)) { detach(s); shown.delete(k); onDrop(s.i, s.j); }
    // 4. trim the cache: least recently used first, never what is on screen
    for (const [lod, max] of [['near', cacheNear], ['far', cacheFar]]) {
      const list = [...cache.entries()].filter(([key]) => key.endsWith(lod)).sort((a, b) => a[1].used - b[1].used);
      for (const [key, c] of list.slice(0, Math.max(0, list.length - max))) { if ([...shown.values()].some((s) => s.built === c.built)) continue; c.built.dispose(); cache.delete(key); }
    }
    return pending.size + ready.length;
  }
  function detach(s) { scene.remove(s.built.group); s.built.crowns.forEach((m) => crowns.delete(m)); }
  function setCanopy(on) { shared.canopy = on; crowns.forEach((m) => { m.visible = on; }); }
  return { update, setCanopy, tiles: shown, crowns, get usingWorkers() { return !fallback; } };
}
