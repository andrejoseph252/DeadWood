// The forest simulation (src/sim/forest.js): deterministic, plausible, sound numbers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateEstate } from '../src/estate/index.js';
import { createForest, SPECIES, heightOf, lightResponse } from '../src/sim/forest.js';

const fresh = () => { const e = generateEstate(); return { ...e, trees: e.trees.map((t) => ({ ...t })) }; };

test('every simulated species has sourced growth parameters', async () => {
  const sp = (await import('../src/data/species.json', { with: { type: 'json' } })).default;
  for (const k of Object.keys(SPECIES)) { assert.ok(sp.trees[k].sources.length >= 1, k); assert.ok(SPECIES[k].G > 0, k); }
});

test('allometry and light response behave', () => {
  const b = SPECIES.beech; assert.ok(heightOf(b, 60) > 25 && heightOf(b, 60) < 45);
  assert.ok(lightResponse(b, 0.1) > lightResponse(SPECIES.birch, 0.1), 'beech copes with shade better than birch');
  assert.ok(lightResponse(SPECIES.birch, 1) > lightResponse(b, 1), 'birch grows faster than beech in full sun');
});

test('twenty years: deterministic, no bad numbers, basal area stays in a realistic range', () => {
  const a = createForest(fresh()), b = createForest(fresh());
  for (let y = 0; y < 20; y++) { a.stepYear(); b.stepYear(); }
  assert.deepEqual(a.stats(), b.stats());
  const s = a.stats(); assert.ok(s.basalArea > 20 && s.basalArea < 60, `${s.basalArea.toFixed(1)} m²/ha`);
});
