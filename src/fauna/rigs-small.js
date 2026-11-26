// Rigs for the small animals: amphibians, reptiles and insects. Built facing -x with pivots like the others.
// They are placed at 1.5-2x life size (as the mammals are at 1.1-1.4x) so they read at the plot's pixel scale.
import * as THREE from 'three';
import { tm, toon, C } from '../render/materials.js';
import { createParts } from './parts.js';

const { ell, seg, pivot } = createParts({ sphere: [8, 6], radial: 5 });

// common frog: olive-brown, dark patch behind the eye, hind legs folded for the hop
export function makeFrog() {
  const skin = tm('#7a6a3a'), dark = tm('#3e3420'), belly = tm('#c8b88a');
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);
  ell(body, skin, [0, 0.022, 0], [0.04, 0.018, 0.025], [0, 0, 0.25]); ell(body, belly, [-0.005, 0.014, 0], [0.034, 0.01, 0.02]);
  const head = pivot(body, [-0.035, 0.03, 0]); ell(head, skin, [-0.01, 0, 0], [0.02, 0.012, 0.02]);
  for (const s of [-1, 1]) { ell(head, tm('#1a1810'), [-0.01, 0.008, 0.013 * s], [0.006, 0.006, 0.005]); ell(head, dark, [0.004, 0.002, 0.016 * s], [0.008, 0.005, 0.003]); }
  const legs = [];
  for (const s of [-1, 1]) { const F = pivot(body, [-0.02, 0.012, 0.018 * s]); seg(F, skin, [0, 0, 0], [-0.01, -0.012, 0.006 * s], 0.004, 0.003); legs.push(F);
    const H = pivot(body, [0.03, 0.015, 0.02 * s]); ell(H, skin, [0.0, -0.004, 0.006 * s], [0.025, 0.008, 0.009], [0, 0, 0.2]); ell(H, dark, [0.024, -0.01, 0.008 * s], [0.016, 0.004, 0.007]); legs.push(H); }
  return { kind: 'frog', root, body, head, legs, tail: pivot(body, [0.04, 0.02, 0]) };
}

// fire salamander larva: small, dark olive, a pale spot at each leg base, feathery gills
export function makeLarva() {
  const skin = tm('#4a4630'), pale = tm('#c8b860');
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);
  ell(body, skin, [0, 0, 0], [0.022, 0.006, 0.007]);
  const head = pivot(body, [-0.022, 0, 0]); ell(head, skin, [-0.006, 0, 0], [0.008, 0.005, 0.008]);
  for (const s of [-1, 1]) ell(head, tm('#8a5a4a'), [0.002, 0.002, 0.009 * s], [0.004, 0.003, 0.004]);
  for (const s of [-1, 1]) ell(body, pale, [-0.012, -0.002, 0.007 * s], [0.002, 0.002, 0.002]);
  const tail = pivot(body, [0.02, 0, 0]); ell(tail, skin, [0.012, 0, 0], [0.014, 0.004, 0.002]);
  return { kind: 'larva', root, body, head, tail, legs: [] };
}

// common lizard: small, brown with darker side stripes, long tapering tail
export function makeLizard() {
  const skin = tm('#6e5a3a'), stripe = tm('#3e3222'), belly = tm('#c8a860');
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);
  ell(body, skin, [0, 0.012, 0], [0.035, 0.01, 0.014]); for (const s of [-1, 1]) ell(body, stripe, [0, 0.013, 0.011 * s], [0.032, 0.005, 0.004]);
  ell(body, belly, [0, 0.006, 0], [0.03, 0.005, 0.011]);
  const head = pivot(body, [-0.035, 0.013, 0]); ell(head, skin, [-0.01, 0, 0], [0.014, 0.007, 0.009]);
  const tail = pivot(body, [0.034, 0.011, 0]); ell(tail, skin, [0.022, 0, 0], [0.026, 0.006, 0.007]); const tip = pivot(tail, [0.046, 0, 0]); ell(tip, stripe, [0.02, 0, 0], [0.022, 0.003, 0.004]);
  const legs = [];
  for (const s of [-1, 1]) for (const lx of [-0.022, 0.022]) { const L = pivot(body, [lx, 0.008, 0.012 * s]); seg(L, skin, [0, 0, 0], [0, -0.008, 0.012 * s], 0.003, 0.0025); legs.push(L); }
  return { kind: 'lizard', root, body, head, tail, tip, legs };
}

// slow worm: a legless lizard, smooth and bronze; a chain of segments that bends in a travelling wave
export function makeSlowWorm(n = 10) {
  const skin = tm('#9a7040'), dark = tm('#5a3e22');
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]), segs = [];
  let parent = body;
  for (let i = 0; i < n; i++) {
    const r = 0.011 * (i < 2 ? 0.9 : 1 - Math.max(0, i - 5) * 0.12), p = pivot(parent, [i ? 0.034 : 0, 0.01, 0]);
    ell(p, i % 3 === 1 ? dark : skin, [0.017, 0, 0], [0.02, r, r]); segs.push(p); parent = p;
  }
  ell(segs[0], tm('#1a1410'), [0.0, 0.004, 0.008], [0.003, 0.003, 0.002]); ell(segs[0], tm('#1a1410'), [0.0, 0.004, -0.008], [0.003, 0.003, 0.002]);
  return { kind: 'slowworm', root, body, head: segs[0], segs, tail: segs[n - 1], legs: [] };
}

// a butterfly: two wing pivots that clap open and shut; speckled wood colours by default
export function makeButterfly({ wing = '#5a4630', spot = '#e0cc88' } = {}) {
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);
  ell(body, tm('#2a2018'), [0, 0, 0], [0.014, 0.003, 0.003]);
  const wings = [-1, 1].map((s) => {
    const w = pivot(body, [0, 0.002, 0.002 * s]), m = toon({ color: C(wing), side: THREE.DoubleSide });
    const f = new THREE.Mesh(new THREE.CircleGeometry(0.014, 8), m); f.rotation.x = -Math.PI / 2; f.position.set(-0.004, 0, 0.013 * s); f.scale.set(1, 0.9, 1); w.add(f);
    const h = new THREE.Mesh(new THREE.CircleGeometry(0.011, 8), m); h.rotation.x = -Math.PI / 2; h.position.set(0.008, -0.001, 0.01 * s); w.add(h);
    for (const [dx, dz] of [[-0.006, 0.016], [0.004, 0.012], [0.009, 0.006]]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.0025, 5), toon({ color: C(spot), side: THREE.DoubleSide })); d.rotation.x = -Math.PI / 2; d.position.set(dx, 0.0005, dz * s); w.add(d); }
    return w;
  });
  return { kind: 'butterfly', root, body, wings, legs: [], tail: body, head: body };
}

// beautiful demoiselle: slender metallic blue-green body, dark wings held together over the back at rest
export function makeDemoiselle() {
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);
  seg(body, tm('#2a6a7a'), [-0.008, 0, 0], [0.04, 0, 0], 0.0022, 0.0016); ell(body, tm('#1e4e5a'), [-0.008, 0, 0], [0.005, 0.004, 0.005]);
  const wmat = toon({ color: C('#2a2420'), side: THREE.DoubleSide });
  const wings = [-1, 1].map((s) => { const w = pivot(body, [0, 0.002, 0]); for (const dx of [-0.003, 0.003]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.008, 0.026), wmat); m.rotation.x = -Math.PI / 2; m.position.set(dx, 0, 0.014 * s); w.add(m); } return w; });
  return { kind: 'demoiselle', root, body, wings, legs: [], head: body, tail: body };
}

// golden-ringed dragonfly: long black body ringed yellow, four clear wings held flat
export function makeDragonfly() {
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);
  ell(body, tm('#1a1a14'), [-0.008, 0, 0], [0.01, 0.007, 0.007]);
  for (let i = 0; i < 7; i++) ell(body, i % 2 ? tm('#d8b830') : tm('#1a1a14'), [0.006 + i * 0.008, 0, 0], [0.0055, 0.0035, 0.0035]);
  ell(body, tm('#3a7a5a'), [-0.017, 0.002, 0], [0.006, 0.005, 0.008]);   // big green eyes
  const wmat = toon({ color: C('#d8dccc'), side: THREE.DoubleSide });
  const wings = [-1, 1].map((s) => { const w = pivot(body, [-0.003, 0.004, 0]); for (const dx of [-0.004, 0.006]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.009, 0.042), wmat); m.rotation.x = -Math.PI / 2; m.position.set(dx, 0, 0.022 * s); w.add(m); } return w; });
  return { kind: 'dragonfly', root, body, wings, legs: [], head: body, tail: body };
}

// bumblebee: fuzzy black body with a yellow collar and a white tail
export function makeBee() {
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);
  ell(body, tm('#1a1612'), [0, 0, 0], [0.012, 0.009, 0.009]); ell(body, tm('#e0b830'), [-0.007, 0.002, 0], [0.005, 0.008, 0.009]); ell(body, tm('#f0ece0'), [0.011, 0, 0], [0.004, 0.006, 0.006]);
  const wmat = toon({ color: C('#c8ccc0'), side: THREE.DoubleSide });
  const wings = [-1, 1].map((s) => { const w = pivot(body, [-0.002, 0.008, 0]); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.008, 0.014), wmat); m.rotation.x = -Math.PI / 2; m.position.set(0.004, 0, 0.007 * s); w.add(m); return w; });
  return { kind: 'bee', root, body, wings, legs: [], head: body, tail: body };
}
