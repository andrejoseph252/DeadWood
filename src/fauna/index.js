// Places the animals on the plot and wires up their behaviours.
import { height, TREES, SPOTS } from '../world/plot.js';
import { makeDeer, makeFox, makeBoar, makeHare, makeSquirrel, makeJay, makeWoodpecker } from './rigs.js';
import { createBehaviours } from './behaviours.js';

// returns { rigs, update(dt, t), followable: { name: Object3D } }
export function createFauna({ scene, rng }) {
  const place = (rig, x, z, ry, scale, yOff = 0) => { rig.root.scale.setScalar(scale); rig.root.position.set(x, height(x, z) + yOff, z); rig.root.rotation.y = ry; scene.add(rig.root); return rig; };

  const rigs = {};
  rigs.deer = place(makeDeer(), SPOTS.deer[0], SPOTS.deer[1], 0.6, 1.25, 0.02);
  rigs.fox = place(makeFox(), SPOTS.fox[0], SPOTS.fox[1], 0.6 + Math.PI, 1.35);
  rigs.boar = place(makeBoar(false), SPOTS.boar[0], SPOTS.boar[1], 0.6, 1.1);
  rigs.boar.head.rotation.z = 0.75;    // snout down, rooting
  rigs.piglets = [[-1.2, 0.8, 0.4], [1.3, 1.1, -1.2], [0.6, -1.4, 1.9]].map(([dx, dz, r]) => place(makeBoar(true), SPOTS.boar[0] + dx, SPOTS.boar[1] + dz, r, 0.42));
  rigs.hare = place(makeHare(), SPOTS.hare[0], SPOTS.hare[1], 0.6, 1.4);
  rigs.squirrel = place(makeSquirrel(), -2.0, 6.55, 0.6, 1.4, 0.68);   // on the log
  rigs.jay = place(makeJay(), 4.6, -0.6, 2.4, 1.4, 0.66);              // on the stump
  const snag = TREES.find((t) => t.kind === 'snag');
  rigs.woodpecker = place(makeWoodpecker(), snag.x + 0.26, snag.z + 0.05, 0, 1.4, 3.8); rigs.woodpecker.root.rotation.y = -0.2;

  const update = createBehaviours(rigs, rng);
  const followable = { deer: rigs.deer.root, fox: rigs.fox.root, boar: rigs.boar.root, hare: rigs.hare.root, squirrel: rigs.squirrel.root };
  return { rigs, update, followable };
}
