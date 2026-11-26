// Places the animals on the plot and wires up their behaviours. Sizes: mammals at 1.1-1.4x and birds at 1.4-1.8x
// life size, small animals at 2-2.2x, so each reads at the plot's pixel scale (see rigs-small.js).
import * as THREE from 'three';
import { toon } from '../render/materials.js';
import { height, TREES, SPOTS, MAP, BACKWATER } from '../world/plot.js';
import F from '../data/fauna.json' with { type: 'json' };
import { makeDeer, makeFox, makeBoar, makeHare, makeSquirrel, makeJay, makeWoodpecker, makeBadger } from './rigs.js';
import { makeOwl, makeRobin, makeWren, makeNuthatch, makeBuzzard } from './rigs-birds.js';
import { makeFrog, makeLarva, makeLizard, makeSlowWorm, makeButterfly, makeDemoiselle, makeDragonfly, makeBee } from './rigs-small.js';
import { createBehaviours } from './behaviours.js';
import { createMoreBehaviours } from './behaviours-more.js';
import { headingTo } from './motion.js';

// returns { rigs, update(dt, t), followable: { name: [label, Object3D] } }
// extra: { foxgloves: [[x, z, height]] } from the herb builder, for the bumblebees
export function createFauna({ scene, rng }, extra = {}) {
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

  // added for the 40 m map (data/fauna.json)
  const [bx, bz] = F.species.badger.route[0];
  rigs.badger = place(makeBadger(), bx, bz, headingTo(0, 1), 1.3);
  { // the owl roosts on the camera side of the tallest holly in the beech wood
    const holly = TREES.filter((t) => t.kind === 'holly').sort((a, b) => b.h - a.h)[0], d = [0.57, 0.82];
    rigs.owl = place(makeOwl(), holly.x + d[0] * holly.r * 0.5, holly.z + d[1] * holly.r * 0.5, headingTo(d[0], d[1]), 1.5, holly.h * 0.55);
  }
  rigs.robin = place(makeRobin(), SPOTS.boar[0] + 1.2, SPOTS.boar[1] - 0.6, 0, 1.6);
  rigs.wren = place(makeWren(), 15, 6, 0, 1.8);
  rigs.nuthatch = place(makeNuthatch(), -9, 8.5, 0, 1.6);
  rigs.buzzard = place(makeBuzzard(), 8, 6, 0, 1.4, 15);
  rigs.frog = place(makeFrog(), ...F.species.frog.home, 0, 2);
  rigs.larvae = [0, 1, 2, 3].map(() => place(makeLarva(), BACKWATER.x, BACKWATER.z, 0, 2));
  rigs.lizard = place(makeLizard(), -17, 4, 0, 2);
  rigs.slowworm = place(makeSlowWorm(), -15, 8, 0, 2);
  rigs.butterflies = [0, 1].map(() => place(makeButterfly(), 0, 0, 0, 2.2));
  rigs.demoiselles = [0, 1, 2].map(() => place(makeDemoiselle(), 0, 0, 0, 2));
  rigs.dragonfly = place(makeDragonfly(), 0, 0, 0, 2);
  rigs.bees = [0, 1, 2].map(() => place(makeBee(), 0, 0, 0, 2.2));
  // red wood ants: tiny instanced specks, moved every frame (zoom-only detail)
  const antN = 50, ants = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 0.008, 0.01), toon({ color: '#3a1e12' }), antN);
  ants.frustumCulled = false; scene.add(ants);

  const update1 = createBehaviours(rigs, rng);
  const update2 = createMoreBehaviours(rigs, rng, { foxgloves: extra.foxgloves || [], ants: { mesh: ants, n: antN } });
  const update = (dt, t) => { update1(dt, t); update2(dt, t); };
  const followable = {
    deer: ['Roe deer', rigs.deer.root], fox: ['Red fox', rigs.fox.root], boar: ['Wild boar', rigs.boar.root], badger: ['Badger', rigs.badger.root],
    hare: ['Hare', rigs.hare.root], squirrel: ['Red squirrel', rigs.squirrel.root], woodpecker: ['Woodpecker', rigs.woodpecker.root], buzzard: ['Buzzard', rigs.buzzard.root],
    owl: ['Tawny owl', rigs.owl.root], robin: ['Robin', rigs.robin.root], wren: ['Wren', rigs.wren.root], nuthatch: ['Nuthatch', rigs.nuthatch.root],
    frog: ['Common frog', rigs.frog.root], lizard: ['Common lizard', rigs.lizard.root], slowworm: ['Slow worm', rigs.slowworm.root], dragonfly: ['Golden-ringed dragonfly', rigs.dragonfly.root],
  };
  return { rigs, update, followable };
}
