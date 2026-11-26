// The estate in data (world.md section 12, E1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import E from '../src/data/estate.json' with { type: 'json' };
import map from '../src/data/map.json' with { type: 'json' };
import { generateEstate, COVERS, BROOKS, HALF, height, coverAt, TILES, COMPS, PATCHES } from '../src/estate/index.js';

const est = generateEstate();

test('grid sizes: 16 x 16 tiles, 8 x 8 compartments, 32 x 32 patches', () => {
  assert.equal(TILES, 16); assert.equal(COMPS, 8); assert.equal(PATCHES, 32);
  assert.equal(est.tiles.length, 256); assert.equal(est.compartments.length, 64); assert.equal(est.patches.length, 1024);
  assert.equal(new Set(est.compartments.map((c) => c.id)).size, 64);
});

test('every patch has a known cover; compartment shares sum to 1', () => {
  for (const p of est.patches) assert.ok(COVERS[p.cover], p.id);
  for (const c of est.compartments) assert.ok(Math.abs(Object.values(c.share).reduce((a, b) => a + b, 0) - 1) < 1e-9, c.id);
});

test('Plot 01 sits in tile (8, 8) and its stream continues the plot map', () => {
  const t = est.tiles.find((q) => q.plot01); assert.deepEqual([t.i, t.j], E.plot.tile);
  assert.equal(coverAt(...E.plot.origin), 'plot01');
  const [ox, oz] = E.plot.origin;
  map.stream.points.forEach(([x, z], k) => assert.deepEqual(E.brooks.plot01.points[k], [+(x + ox).toFixed(2), +(z + oz).toFixed(2)]));
});

test('brook beds never run uphill', () => {
  for (const [k, b] of Object.entries(BROOKS)) for (let i = 1; i < b.bed.length; i++) assert.ok(b.bed[i] <= b.bed[i - 1] + 1e-9, `${k} rises at ${i} m`);
});

test('relief stays in the low-mountain range (world.md section 12)', () => {
  let lo = Infinity, hi = -Infinity;
  for (let x = -HALF; x <= HALF; x += 20) for (let z = -HALF; z <= HALF; z += 20) { const h = height(x, z); lo = Math.min(lo, h); hi = Math.max(hi, h); }
  assert.ok(lo > 340 && hi < 470 && hi - lo > 60, `${lo.toFixed(0)}-${hi.toFixed(0)} m`);
});

test('trees: unique ids, inside the estate, in their own patch, none in Plot 01 (it keeps its own)', () => {
  assert.equal(new Set(est.trees.map((t) => t.id)).size, est.trees.length);
  const byId = new Map(est.patches.map((p) => [p.id, p]));
  for (const t of est.trees) {
    assert.ok(Math.abs(t.x) < HALF && Math.abs(t.z) < HALF, t.id);
    const p = byId.get(t.patch); assert.ok(Math.abs(t.x - p.x) <= E.patch / 2 && Math.abs(t.z - p.z) <= E.patch / 2, t.id);
    assert.notEqual(coverAt(t.x, t.z), 'plot01', t.id);
  }
  assert.ok(est.trees.length > 20000 && est.trees.length < 80000, `${est.trees.length} trees`);
});

test('charcoal platforms: in the ancient wood, spaced apart', () => {
  assert.equal(est.charcoal.length, E.charcoal.count);
  for (const [i, [x, z]] of est.charcoal.entries()) { assert.equal(coverAt(x, z), 'ancient'); for (const [x2, z2] of est.charcoal.slice(i + 1)) assert.ok(Math.hypot(x - x2, z - z2) >= E.charcoal.minSpacing); }
});
