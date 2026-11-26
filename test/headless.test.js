// Headless modules load and behave in plain Node.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/random.js';
import { HALF, TREES, height, gapW, WATER_Y } from '../src/world/plot.js';
import { createSim } from '../src/sim/index.js';

test('seeded random is deterministic', () => {
  const a = createRng(9), b = createRng(9);
  const seqA = Array.from({ length: 5 }, a.rnd), seqB = Array.from({ length: 5 }, b.rnd);
  assert.deepEqual(seqA, seqB);
  // pin the first value so an accidental change to the generator is caught
  assert.equal(createRng(9).rnd(), (9 * 16807 - 1) / 2147483646);
});

test('plot layout and terrain fields load headless', () => {
  assert.equal(HALF, 14);
  assert.ok(TREES.length > 0);
  for (const t of TREES) assert.ok(Math.abs(t.x) < HALF && Math.abs(t.z) < HALF, `tree outside plot: ${t.kind}`);
  assert.ok(Number.isFinite(height(0, 0)) && Number.isFinite(WATER_Y));
  assert.ok(gapW(0.5, 1) > 0.9, 'gap centre should be open');
});

test('sim steps without a renderer', () => {
  const sim = createSim();
  sim.step(3);
  assert.equal(sim.state.day, 3);
});
