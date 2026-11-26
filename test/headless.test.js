// Headless modules load and behave in plain Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/random.js';
import { HALF, TREES, height, gapW, WATER_Y, habitatW, HABITATS } from '../src/world/plot.js';
import { generateLayout } from '../src/world/layout.js';
import { createSim } from '../src/sim/index.js';

test('seeded random is deterministic', () => {
  const a = createRng(9), b = createRng(9);
  const seqA = Array.from({ length: 5 }, a.rnd), seqB = Array.from({ length: 5 }, b.rnd);
  assert.deepEqual(seqA, seqB);
  // pin the first value so an accidental change to the generator is caught
  assert.equal(createRng(9).rnd(), (9 * 16807 - 1) / 2147483646);
});

test('plot layout and terrain fields load headless', () => {
  assert.equal(HALF, 20);
  assert.ok(TREES.length > 0);
  for (const t of TREES) assert.ok(Math.abs(t.x) < HALF && Math.abs(t.z) < HALF, `tree outside plot: ${t.kind}`);
  assert.ok(Number.isFinite(height(0, 0)) && Number.isFinite(WATER_Y));
  assert.ok(gapW(0.5, 1) > 0.9, 'gap centre should be open');
});

test('habitat weights sum to 1 and every habitat is present', () => {
  const seen = new Set();
  for (let x = -19.5; x < 20; x += 1) for (let z = -19.5; z < 20; z += 1) {
    const w = habitatW(x, z); assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-9);
    seen.add(w.indexOf(Math.max(...w)));
  }
  assert.equal(seen.size, HABITATS.length);
});

test('tree layout is deterministic, has unique ids, and keeps trunks inside the plot', () => {
  const a = generateLayout(), b = generateLayout();
  assert.deepEqual(a, b);
  assert.equal(new Set(a.trees.map((t) => t.id)).size, a.trees.length);
  for (const t of a.trees) assert.ok(Math.abs(t.x) < HALF - 0.6 && Math.abs(t.z) < HALF - 0.6, `${t.id} ${t.kind} too close to the edge`);
});

test('sim steps without a renderer', () => {
  const sim = createSim();
  sim.step(3);
  assert.equal(sim.state.day, 3);
});
