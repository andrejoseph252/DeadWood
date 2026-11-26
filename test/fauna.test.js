// Animals keep to where they can walk (world.md S5: "no animal walks through trees, rocks or water").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import F from '../src/data/fauna.json' with { type: 'json' };
import { lineBlocked, blocked } from '../src/world/obstacles.js';

const legs = (pts, loop) => { const all = loop ? [...pts, pts[0]] : pts; return all.slice(1).map((p, i) => [all[i], p]); };

test('every species has a scientific name and says what it is doing', () => {
  for (const [k, s] of Object.entries(F.species)) { assert.match(s.scientific, /^[A-Z][a-z]+ [a-z]+/, k); assert.ok(s.active, k); }
});

for (const [name, key, opts, loop] of [['deer', 'stops', { r: 0.3 }, false], ['fox', 'route', { r: 0.2, wall: true }, true], ['badger', 'route', { r: 0.2 }, false]]) {
  test(`${name} route is clear of trees, rocks, the wall and water`, () => {
    for (const [a, b] of legs(F.species[name][key], loop)) { const hit = lineBlocked(a, b, opts); assert.equal(hit, null, hit && `${name} ${a} -> ${b}: ${hit.why} at ${hit.x.toFixed(1)}, ${hit.z.toFixed(1)}`); }
  });
}

test('the boar and frog start on open ground', () => {
  assert.equal(blocked(...F.species.boar.home, { r: 0.3, water: true }), null);
  assert.equal(blocked(...F.species.frog.home, { r: 0.05 }), null);
});
