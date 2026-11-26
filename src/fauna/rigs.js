// Animal rigs. Each is built facing -x, with pivot joints (neck, head, ears, tail, legs, wings) for animation.
// A rig is { kind, root, body, head, ears?, neck?, tail, legs, wings? }; root is unplaced and not yet in a scene.
import * as THREE from 'three';
import { tm } from '../render/materials.js';
import { createParts } from './parts.js';

const { ell, seg, pivot } = createParts();

// the roe deer: the most detailed rig (finer sphere and limbs)
export function makeDeer() {
  const { ell, seg, pivot } = createParts({ sphere: [14, 10], radial: 8 });
  const M = { coat: tm('#b4693a'), back: tm('#9a5730'), belly: tm('#d6a878'), leg: tm('#8e5a35'), muzzle: tm('#3a2a20'), white: tm('#f1ebde'), black: tm('#121010'), hoof: tm('#2a2018'), ear: tm('#a86036') };
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);
  ell(body, M.coat, [-0.28, 0.8, 0], [0.22, 0.23, 0.165]);
  ell(body, M.coat, [0.02, 0.8, 0], [0.42, 0.2, 0.158]);
  ell(body, M.coat, [0.3, 0.84, 0], [0.21, 0.215, 0.16]);
  ell(body, M.back, [0.0, 0.9, 0], [0.4, 0.09, 0.12]);
  ell(body, M.belly, [-0.02, 0.67, 0], [0.32, 0.08, 0.125]);
  ell(body, M.white, [0.47, 0.86, 0], [0.05, 0.11, 0.115]);
  const neck = pivot(body, [-0.36, 0.9, 0]);
  seg(neck, M.coat, [0, 0, 0], [-0.2, 0.28, 0], 0.09, 0.065);
  ell(neck, M.belly, [-0.12, 0.08, 0], [0.06, 0.11, 0.06], [0, 0, 0.6]);
  const head = pivot(neck, [-0.22, 0.31, 0]);
  ell(head, M.coat, [-0.05, 0.0, 0], [0.12, 0.075, 0.068], [0, 0, 0.25]);
  ell(head, M.muzzle, [-0.16, -0.035, 0], [0.055, 0.042, 0.043], [0, 0, 0.25]);
  ell(head, M.black, [-0.205, -0.04, 0], [0.022, 0.022, 0.03]);
  ell(head, M.white, [-0.14, -0.075, 0], [0.04, 0.018, 0.035]);
  const ears = [];
  for (const s of [-1, 1]) {
    ell(head, M.black, [-0.07, 0.025, 0.058 * s], [0.017, 0.017, 0.012]);
    const ear = pivot(head, [0.03, 0.06, 0.05 * s]); ear.rotation.set(0.5 * s, 0, -0.25); ears.push(ear);
    ell(ear, M.ear, [0, 0.07, 0], [0.028, 0.08, 0.045]);
    ell(ear, M.white, [0.004, 0.075, 0.004 * s], [0.014, 0.055, 0.03]);
  }
  const tail = pivot(body, [0.5, 0.92, 0]); ell(tail, M.coat, [0.02, -0.03, 0], [0.03, 0.05, 0.03]);
  const legs = [];
  for (const s of [-1, 1]) {
    const fl = pivot(body, [-0.3, 0.74, 0.085 * s]);
    seg(fl, M.coat, [0, 0, 0], [0.02, -0.3, 0], 0.045, 0.03);
    seg(fl, M.leg, [0.02, -0.3, 0], [0.0, -0.67, 0], 0.024, 0.02);
    ell(fl, M.hoof, [-0.01, -0.69, 0], [0.032, 0.025, 0.024]);
    const hl = pivot(body, [0.32, 0.78, 0.085 * s]);
    ell(hl, M.coat, [-0.01, -0.12, 0], [0.11, 0.16, 0.075]);
    seg(hl, M.coat, [0, -0.1, 0], [0.09, -0.42, 0], 0.05, 0.03);
    seg(hl, M.leg, [0.09, -0.42, 0], [0.05, -0.71, 0], 0.023, 0.02);
    ell(hl, M.hoof, [0.045, -0.73, 0], [0.032, 0.025, 0.024]);
    legs.push(fl, hl);
  }
  return { kind: 'deer', root, body, neck, head, tail, legs, ears };
}

export function makeFox() {
  const M = { coat: tm('#cf6427'), flank: tm('#e0823e'), white: tm('#f2ebdf'), black: tm('#21160f'), dark: tm('#3a2216') };
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);
  ell(body, M.coat, [-0.12, 0.34, 0], [0.2, 0.13, 0.11]); ell(body, M.coat, [0.13, 0.35, 0], [0.19, 0.12, 0.1]);
  ell(body, M.flank, [0.0, 0.3, 0], [0.26, 0.08, 0.105]); ell(body, M.white, [-0.25, 0.3, 0], [0.07, 0.1, 0.08]);
  const neck = pivot(body, [-0.26, 0.4, 0]); seg(neck, M.coat, [0, 0, 0], [-0.08, 0.1, 0], 0.075, 0.065);
  const head = pivot(neck, [-0.1, 0.12, 0]);
  ell(head, M.coat, [-0.02, 0, 0], [0.085, 0.072, 0.075]); ell(head, M.white, [-0.06, -0.035, 0], [0.06, 0.035, 0.06]);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 7), M.coat); snout.rotation.z = Math.PI / 2; snout.position.set(-0.13, -0.015, 0); snout.castShadow = true; head.add(snout);
  ell(head, M.black, [-0.19, -0.015, 0], [0.016, 0.016, 0.018]);
  const ears = [];
  for (const s of [-1, 1]) {
    ell(head, M.black, [-0.06, 0.02, 0.05 * s], [0.012, 0.012, 0.01]);
    const ear = pivot(head, [0.02, 0.06, 0.042 * s]); ear.rotation.x = 0.25 * s;
    const e = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), M.dark); e.position.y = 0.04; e.castShadow = true; ear.add(e); ears.push(ear);
  }
  const tail = pivot(body, [0.3, 0.36, 0]);
  ell(tail, M.coat, [0.1, -0.03, 0], [0.12, 0.055, 0.055], [0, 0, -0.35]); ell(tail, M.coat, [0.22, -0.09, 0], [0.09, 0.06, 0.06], [0, 0, -0.5]); ell(tail, M.white, [0.31, -0.14, 0], [0.04, 0.04, 0.04]);
  const legs = [];
  for (const s of [-1, 1]) for (const [lx, front] of [[-0.2, true], [0.2, false]]) {
    const L = pivot(body, [lx, 0.28, 0.06 * s]);
    seg(L, M.coat, [0, 0, 0], [front ? 0 : 0.03, -0.12, 0], 0.035, 0.025); seg(L, M.black, [front ? 0 : 0.03, -0.12, 0], [0, -0.27, 0], 0.022, 0.018);
    legs.push(L);
  }
  return { kind: 'fox', root, body, neck, head, ears, tail, legs };
}

export function makeBoar(piglet = false) {
  const M = piglet ? { coat: tm('#8a5e3a'), ridge: tm('#6a4428'), snout: tm('#a07a62'), leg: tm('#5a3d27') } : { coat: tm('#64544a'), ridge: tm('#3a3029'), snout: tm('#8c776a'), leg: tm('#3a3029') };
  const stripe = tm('#dcc89c'), disc = tm('#c79a8c'), black = tm('#111');
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);
  ell(body, M.coat, [0.05, 0.55, 0], [0.55, 0.28, 0.23]); ell(body, M.coat, [-0.28, 0.6, 0], [0.3, 0.3, 0.24]);   // body, heavy shoulders
  ell(body, M.ridge, [-0.12, 0.8, 0], [0.5, 0.07, 0.07]);                                                         // bristly mane along the back
  if (piglet) for (const y of [0.48, 0.58, 0.68]) ell(body, stripe, [0.02, y, 0], [0.5, 0.022, 0.238]);           // pale stripes
  const head = pivot(body, [-0.5, 0.6, 0]); head.rotation.z = 0.35;
  ell(head, M.coat, [-0.12, 0, 0], [0.24, 0.17, 0.15]);
  seg(head, M.snout, [-0.25, -0.03, 0], [-0.45, -0.07, 0], 0.075, 0.06);
  const d = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10), disc); d.rotation.z = Math.PI / 2; d.position.set(-0.455, -0.07, 0); head.add(d);
  const ears = [];
  for (const s of [-1, 1]) {
    ell(head, black, [-0.2, 0.05, 0.09 * s], [0.015, 0.015, 0.012]);
    const ear = pivot(head, [-0.02, 0.13, 0.08 * s]); ear.rotation.x = 0.4 * s; ell(ear, M.ridge, [0, 0.04, 0], [0.04, 0.06, 0.025]); ears.push(ear);
  }
  const tail = pivot(body, [0.58, 0.6, 0]); seg(tail, M.ridge, [0, 0, 0], [0.05, -0.18, 0], 0.015, 0.01);
  const legs = [];
  for (const s of [-1, 1]) for (const lx of [-0.32, 0.36]) {
    const L = pivot(body, [lx, 0.36, 0.13 * s]); seg(L, M.leg, [0, 0, 0], [0, -0.34, 0], 0.06, 0.035); ell(L, black, [-0.01, -0.35, 0], [0.04, 0.025, 0.035]); legs.push(L);
  }
  return { kind: piglet ? 'piglet' : 'boar', root, body, head, ears, tail, legs };
}

export function makeHare() {
  const M = { coat: tm('#8f7552'), dark: tm('#6b553a'), belly: tm('#e5d9c0'), black: tm('#141110'), white: tm('#f4efe6') };
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);
  ell(body, M.coat, [0.02, 0.17, 0], [0.17, 0.14, 0.11]); ell(body, M.dark, [0.0, 0.25, 0], [0.13, 0.05, 0.08]); ell(body, M.belly, [-0.06, 0.12, 0], [0.09, 0.07, 0.08]);
  ell(body, M.coat, [0.1, 0.13, 0.07], [0.1, 0.09, 0.04]); ell(body, M.coat, [0.1, 0.13, -0.07], [0.1, 0.09, 0.04]);     // haunches
  const head = pivot(body, [-0.15, 0.3, 0]);
  ell(head, M.coat, [-0.02, 0, 0], [0.075, 0.065, 0.06]); ell(head, M.black, [-0.04, 0.015, 0.05], [0.014, 0.014, 0.01]); ell(head, M.black, [-0.04, 0.015, -0.05], [0.014, 0.014, 0.01]);
  const ears = [];
  for (const s of [-1, 1]) { const ear = pivot(head, [0.02, 0.05, 0.025 * s]); ear.rotation.set(0.15 * s, 0, -0.35); ell(ear, M.coat, [0, 0.1, 0], [0.022, 0.1, 0.03]); ell(ear, M.black, [0, 0.19, 0], [0.018, 0.02, 0.025]); ears.push(ear); }
  const tail = pivot(body, [0.2, 0.17, 0]); ell(tail, M.white, [0.01, 0, 0], [0.035, 0.035, 0.035]);
  const legs = [];
  for (const s of [-1, 1]) { const F = pivot(body, [-0.12, 0.14, 0.05 * s]); seg(F, M.coat, [0, 0, 0], [-0.02, -0.14, 0], 0.02, 0.016); legs.push(F); const H = pivot(body, [0.12, 0.05, 0.07 * s]); ell(H, M.dark, [-0.03, -0.035, 0], [0.08, 0.02, 0.025]); legs.push(H); }
  return { kind: 'hare', root, body, head, ears, tail, legs };
}

export function makeSquirrel() {
  const red = tm('#b9532a'), cream = tm('#efe0c4'), black = tm('#111');
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);
  ell(body, red, [0, 0.1, 0], [0.09, 0.08, 0.06], [0, 0, 0.5]); ell(body, cream, [-0.04, 0.08, 0], [0.05, 0.06, 0.045], [0, 0, 0.5]);
  const head = pivot(body, [-0.08, 0.18, 0]); ell(head, red, [0, 0, 0], [0.05, 0.045, 0.04]); ell(head, black, [-0.03, 0.01, 0.03], [0.01, 0.01, 0.008]);
  const ears = [];
  for (const s of [-1, 1]) { const e = pivot(head, [0.01, 0.04, 0.025 * s]); const c = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 4), red); c.position.y = 0.025; e.add(c); ears.push(e); }
  const tail = pivot(body, [0.07, 0.06, 0]);
  ell(tail, red, [0.05, 0.06, 0], [0.04, 0.09, 0.04], [0, 0, -0.4]); ell(tail, red, [0.06, 0.17, 0], [0.045, 0.06, 0.045]); ell(tail, red, [0.02, 0.22, 0], [0.04, 0.04, 0.04]);
  const legs = []; for (const s of [-1, 1]) { const L = pivot(body, [0.03, 0.04, 0.04 * s]); ell(L, red, [0, 0, 0], [0.04, 0.03, 0.02]); legs.push(L); }
  return { kind: 'squirrel', root, body, head, ears, tail, legs };
}

export function makeJay() {
  const M = { body: tm('#b88e7b'), crown: tm('#d8c4b8'), black: tm('#161616'), white: tm('#f3efe7'), blue: tm('#3f72c8') };
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);
  ell(body, M.body, [0, 0.1, 0], [0.11, 0.07, 0.065], [0, 0, 0.25]); ell(body, M.white, [0.09, 0.07, 0], [0.03, 0.03, 0.04]);
  const head = pivot(body, [-0.1, 0.15, 0]); ell(head, M.crown, [0, 0, 0], [0.05, 0.045, 0.042]); ell(head, M.black, [-0.02, -0.02, 0.035], [0.025, 0.01, 0.005]); ell(head, M.black, [-0.02, -0.02, -0.035], [0.025, 0.01, 0.005]);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 4), M.black); beak.rotation.z = Math.PI / 2; beak.position.set(-0.06, -0.005, 0); head.add(beak);
  const wings = [];
  for (const s of [-1, 1]) { const w = pivot(body, [0.0, 0.12, 0.06 * s]); ell(w, M.black, [0.04, 0, 0], [0.08, 0.035, 0.012]); ell(w, M.blue, [-0.01, 0.005, 0.004 * s], [0.025, 0.022, 0.012]); ell(w, M.white, [0.02, -0.01, 0.006 * s], [0.02, 0.012, 0.01]); wings.push(w); }
  const tail = pivot(body, [0.1, 0.09, 0]); ell(tail, M.black, [0.07, -0.02, 0], [0.08, 0.014, 0.03], [0, 0, -0.2]);
  const legs = []; for (const s of [-1, 1]) { const L = pivot(body, [0, 0.04, 0.02 * s]); seg(L, tm('#8a6f60'), [0, 0, 0], [0, -0.04, 0], 0.006, 0.006); legs.push(L); }
  return { kind: 'jay', root, body, head, wings, tail, legs };
}

export function makeWoodpecker() {
  const black = tm('#151515'), white = tm('#efece4'), red = tm('#c4271f');
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);   // clings upright: body along +y
  ell(body, black, [0, 0.11, 0], [0.045, 0.1, 0.05]); ell(body, white, [-0.03, 0.1, 0], [0.025, 0.07, 0.04]); ell(body, white, [0.01, 0.13, 0.045], [0.02, 0.03, 0.008]);
  ell(body, red, [-0.02, 0.02, 0], [0.025, 0.025, 0.03]);
  const head = pivot(body, [0, 0.22, 0]); ell(head, black, [0, 0, 0], [0.04, 0.038, 0.036]); ell(head, white, [-0.02, -0.005, 0.03], [0.02, 0.015, 0.008]); ell(head, red, [0.025, 0.01, 0], [0.012, 0.015, 0.02]);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.04, 4), tm('#3a3a3a')); beak.rotation.z = Math.PI / 2; beak.position.set(-0.055, 0, 0); head.add(beak);
  const tail = pivot(body, [0.01, 0, 0]); ell(tail, black, [0.01, -0.04, 0], [0.015, 0.05, 0.025]);
  return { kind: 'woodpecker', root, body, head, tail, legs: [] };
}

// the badger: low, wedge-shaped, grey with a black-and-white striped face
export function makeBadger() {
  const M = { grey: tm('#8a8680'), dark: tm('#4a4744'), black: tm('#121110'), white: tm('#efece6'), nose: tm('#1a1818') };
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);
  ell(body, M.grey, [0.06, 0.24, 0], [0.33, 0.15, 0.17]); ell(body, M.grey, [-0.18, 0.23, 0], [0.18, 0.13, 0.14]);
  ell(body, M.dark, [0.02, 0.15, 0], [0.32, 0.07, 0.15]);   // dark belly and flanks low down
  const head = pivot(body, [-0.34, 0.22, 0]); head.rotation.z = 0.25;
  ell(head, M.white, [-0.06, 0, 0], [0.11, 0.075, 0.075]);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 8), M.white); snout.rotation.z = Math.PI / 2; snout.position.set(-0.17, -0.02, 0); snout.castShadow = true; head.add(snout);
  for (const s of [-1, 1]) ell(head, M.black, [-0.07, 0.01, 0.035 * s], [0.13, 0.03, 0.022], [0, 0, 0.12]);   // the stripes through the eyes
  ell(head, M.nose, [-0.24, -0.025, 0], [0.022, 0.02, 0.025]);
  const ears = [];
  for (const s of [-1, 1]) { const e = pivot(head, [0.02, 0.05, 0.06 * s]); ell(e, M.black, [0, 0.015, 0], [0.018, 0.022, 0.02]); ell(e, M.white, [0, 0.03, 0], [0.012, 0.01, 0.018]); ears.push(e); }
  const tail = pivot(body, [0.38, 0.27, 0]); ell(tail, M.grey, [0.04, -0.02, 0], [0.06, 0.03, 0.04], [0, 0, -0.3]);
  const legs = [];
  for (const s of [-1, 1]) for (const lx of [-0.2, 0.22]) { const L = pivot(body, [lx, 0.17, 0.1 * s]); seg(L, M.black, [0, 0, 0], [-0.02, -0.16, 0], 0.045, 0.035); ell(L, M.black, [-0.04, -0.165, 0], [0.045, 0.018, 0.03]); legs.push(L); }
  return { kind: 'badger', root, body, head, ears, tail, legs };
}
