// Bird rigs, built facing -x with pivots for head, wings, tail and legs (like the jay and woodpecker in rigs.js).
import * as THREE from 'three';
import { tm } from '../render/materials.js';
import { createParts } from './parts.js';

const { ell, seg, pivot } = createParts({ sphere: [10, 7], radial: 5 });
const cone = (parent, mat, r, l, p, rz = Math.PI / 2) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, l, 4), mat); m.rotation.z = rz; m.position.set(...p); parent.add(m); return m; };
const legsFor = (body, mat, y, w, len) => [-1, 1].map((s) => { const L = pivot(body, [0, y, w * s]); seg(L, mat, [0, 0, 0], [0, -len, 0], 0.005, 0.004); return L; });

// small songbird body shared by robin, wren and nuthatch: colours and proportions differ
function songbird({ back, front, belly, size, tailLen, tailUp, beakLen, extras }) {
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]), k = size;
  ell(body, back, [0.005 * k, 0.07 * k, 0], [0.06 * k, 0.045 * k, 0.04 * k], [0, 0, 0.2]);
  ell(body, front, [-0.03 * k, 0.065 * k, 0], [0.04 * k, 0.04 * k, 0.036 * k]);
  ell(body, belly, [0.005 * k, 0.05 * k, 0], [0.045 * k, 0.025 * k, 0.034 * k]);
  const head = pivot(body, [-0.05 * k, 0.1 * k, 0]); ell(head, back, [0, 0, 0], [0.032 * k, 0.03 * k, 0.029 * k]);
  cone(head, tm('#2a2622'), 0.006 * k, beakLen * k, [-(0.03 + beakLen / 2) * k, -0.004 * k, 0]);
  for (const s of [-1, 1]) ell(head, tm('#0e0e0e'), [-0.015 * k, 0.006 * k, 0.025 * k * s], [0.006 * k, 0.006 * k, 0.004 * k]);
  const wings = [-1, 1].map((s) => { const w = pivot(body, [0.0, 0.085 * k, 0.034 * k * s]); ell(w, back, [0.03 * k, 0, 0], [0.045 * k, 0.018 * k, 0.008 * k]); return w; });
  const tail = pivot(body, [0.055 * k, 0.075 * k, 0]); tail.rotation.z = tailUp; ell(tail, back, [tailLen / 2 * k, 0, 0], [tailLen / 2 * k, 0.008 * k, 0.02 * k]);
  const legs = legsFor(body, tm('#6a5a4a'), 0.035 * k, 0.012 * k, 0.035 * k);
  if (extras) extras({ body, head, k });
  return { root, body, head, wings, tail, legs };
}

// European robin: olive-brown back, orange face and breast, whitish belly
export function makeRobin() { return { kind: 'robin', ...songbird({ back: tm('#7a6a4c'), front: tm('#e0702a'), belly: tm('#ece4d4'), size: 1, tailLen: 0.06, tailUp: 0.15, beakLen: 0.014, extras: ({ head, k }) => ell(head, tm('#e0702a'), [-0.016 * k, -0.006 * k, 0], [0.022 * k, 0.02 * k, 0.026 * k]) }) }; }
// wren: tiny, warm brown, tail cocked straight up
export function makeWren() { return { kind: 'wren', ...songbird({ back: tm('#7a5634'), front: tm('#9a7450'), belly: tm('#b8976e'), size: 0.75, tailLen: 0.05, tailUp: 1.25, beakLen: 0.018, extras: ({ head, k }) => ell(head, tm('#d8c3a0'), [-0.006 * k, 0.012 * k, 0], [0.026 * k, 0.006 * k, 0.03 * k]) }) }; }
// nuthatch: blue-grey back, buff-orange underside, black stripe through the eye, long straight beak
export function makeNuthatch() {
  return { kind: 'nuthatch', ...songbird({ back: tm('#6a7a8e'), front: tm('#e8dcc8'), belly: tm('#d08a52'), size: 1, tailLen: 0.04, tailUp: 0.1, beakLen: 0.024,
    extras: ({ head, k }) => { for (const s of [-1, 1]) ell(head, tm('#141414'), [-0.006 * k, 0.004 * k, 0.026 * k * s], [0.03 * k, 0.005 * k, 0.004 * k]); } }) };
}

// tawny owl: round, mottled brown, big head with a pale facial disc and dark eyes
export function makeOwl() {
  const brown = tm('#7a5838'), mottle = tm('#9a7650'), disc = tm('#b8956a'), dark = tm('#1a1410');
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);   // perches upright
  ell(body, brown, [0, 0.13, 0], [0.09, 0.13, 0.085]); ell(body, mottle, [-0.04, 0.12, 0], [0.06, 0.1, 0.07]);
  const head = pivot(body, [0, 0.27, 0]); ell(head, brown, [0, 0, 0], [0.085, 0.075, 0.085]);
  ell(head, disc, [-0.05, -0.005, 0], [0.04, 0.06, 0.07]);
  for (const s of [-1, 1]) ell(head, dark, [-0.085, 0.005, 0.028 * s], [0.012, 0.018, 0.016]);
  cone(head, tm('#d8c070'), 0.01, 0.025, [-0.09, -0.025, 0], Math.PI / 2 + 0.6);
  const wings = [-1, 1].map((s) => { const w = pivot(body, [0.02, 0.2, 0.075 * s]); ell(w, mottle, [0.0, -0.07, 0], [0.06, 0.1, 0.02]); return w; });
  const tail = pivot(body, [0.03, 0.02, 0]); ell(tail, brown, [0.02, -0.04, 0], [0.025, 0.05, 0.04]);
  const legs = legsFor(body, tm('#c8b898'), 0.02, 0.03, 0.02);
  return { kind: 'owl', root, body, head, wings, tail, legs };
}

// common buzzard: broad wings (inner and outer pivots for soaring and flapping), brown with a pale chest band
export function makeBuzzard() {
  const brown = tm('#5e4430'), dark = tm('#3e2c1e'), pale = tm('#d8c6a4');
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);
  ell(body, brown, [0, 0.12, 0], [0.2, 0.08, 0.08]); ell(body, pale, [-0.08, 0.09, 0], [0.06, 0.05, 0.065]);
  const head = pivot(body, [-0.19, 0.16, 0]); ell(head, brown, [0, 0, 0], [0.055, 0.05, 0.05]);
  cone(head, tm('#2a2622'), 0.014, 0.035, [-0.065, -0.01, 0], Math.PI / 2 + 0.4);
  for (const s of [-1, 1]) ell(head, tm('#3a2a10'), [-0.03, 0.01, 0.04 * s], [0.01, 0.01, 0.006]);
  const wings = [], tips = [];
  for (const s of [-1, 1]) {
    const w = pivot(body, [-0.02, 0.15, 0.06 * s]); ell(w, brown, [0, 0, 0.16 * s], [0.1, 0.012, 0.17]); ell(w, pale, [0.03, -0.005, 0.18 * s], [0.05, 0.01, 0.12]);
    const t = pivot(w, [0, 0, 0.32 * s]); ell(t, dark, [0.01, 0, 0.13 * s], [0.08, 0.01, 0.14]); wings.push(w); tips.push(t);
  }
  const tail = pivot(body, [0.18, 0.13, 0]); ell(tail, brown, [0.09, 0, 0], [0.1, 0.01, 0.07]);
  const legs = legsFor(body, tm('#d8b850'), 0.06, 0.04, 0.06);
  return { kind: 'buzzard', root, body, head, wings, tips, tail, legs };
}
