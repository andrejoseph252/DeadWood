// Estate animals on screen (world.md section 12, E3): every animal from src/estate/fauna.js moves all the time;
// those within reach of the camera get a rig (the same rigs as in Plot 01) and are animated, others are only data.
// Leaders wander their home range on walkable ground; followers (fawns, piglets, kits) keep near their leader;
// buzzards soar; beavers swim the pond.
import { createRng } from '../core/random.js';
import { generateFauna, walkable, lineWalkable, height } from '../estate/fauna.js';
import { POND } from '../estate/terrain.js';
import { makeDeer, makeFox, makeBoar, makeHare, makeSquirrel, makeBadger, makeBeaver } from '../fauna/rigs.js';
import { makeBuzzard } from '../fauna/rigs-birds.js';
import { damp, angLerp, headingTo, trot, lift } from '../fauna/motion.js';

const RIG = {
  doe: () => [makeDeer(), 1.2], buck: () => [makeDeer(), 1.3], yearling: (s) => (s === 'boar' ? [makeBoar(false), 0.8] : [makeDeer(), 1.0]), fawn: () => [makeDeer(), 0.65],
  sow: () => [makeBoar(false), 1.1], piglet: () => [makeBoar(true), 0.42], badger: () => [makeBadger(), 1.3], fox: () => [makeFox(), 1.35], hare: () => [makeHare(), 1.4],
  squirrel: () => [makeSquirrel(), 1.4], beaver: () => [makeBeaver(), 1.3], kit: () => [makeBeaver(), 0.75], buzzard: () => [makeBuzzard(), 1.4],
};
const LABEL = { deer: 'Roe deer', boar: 'Wild boar', badger: 'Badger', fox: 'Red fox', hare: 'Hare', squirrel: 'Red squirrel', beaver: 'Beaver', buzzard: 'Buzzard' };
export { LABEL };

export function createEstateFauna(scene, { Y0, spawn = 95, despawn = 115 }) {
  const animals = generateFauna(), byGroup = new Map();
  for (const a of animals) { a.rng = createRng(a.seed); a.yaw = a.rng.rnd() * 6.28; a.mode = 'pause'; a.timer = a.rng.rr(1, 6); a.speedNow = 0; a.phase = 0; a.tx = a.x; a.tz = a.z; a.ang = a.rng.rnd() * 6.28; if (!byGroup.has(a.group)) byGroup.set(a.group, []); byGroup.get(a.group).push(a); }
  let forced = null;
  const yAt = (x, z) => height(x, z) - Y0;

  function think(a, dt) {
    const { rnd, rr } = a.rng;
    if (a.flies) { a.ang += dt * a.speed / 45; a.x = a.home[0] + Math.cos(a.ang) * 45; a.z = a.home[1] + Math.sin(a.ang) * 45; a.yaw = headingTo(-Math.sin(a.ang), Math.cos(a.ang)); return; }
    if (!a.leader) {   // keep near the leader
      const L = byGroup.get(a.group)[0], off = 1.2 + (a.id.charCodeAt(a.id.length - 1) % 5) * 0.5, ang = L.yaw + 2.6 + (a.id.charCodeAt(a.id.length - 1) % 3) * 0.5;
      a.tx = L.x - Math.cos(ang) * off; a.tz = L.z + Math.sin(ang) * off;
      if (Math.hypot(a.tx - a.x, a.tz - a.z) > 15) { a.x = a.tx; a.z = a.tz; }
      a.mode = Math.hypot(a.tx - a.x, a.tz - a.z) > 0.4 ? 'walk' : 'pause';
    } else if (a.mode === 'pause' && (a.timer -= dt) < 0) {   // pick somewhere new in the home range, reachable in a straight line
      for (let k = 0; k < 6; k++) {
        const ang = rnd() * 6.28, d = rr(3, a.swim ? 12 : 25), x = a.x + Math.cos(ang) * d, z = a.z + Math.sin(ang) * d;
        if (Math.hypot(x - a.home[0], z - a.home[1]) > a.range) continue;
        if (walkable(x, z, { swim: a.swim }) && lineWalkable([a.x, a.z], [x, z], { swim: a.swim })) { a.tx = x; a.tz = z; a.mode = 'walk'; break; }
      }
      a.timer = rr(2, 8);
    }
    if (a.mode === 'walk') {
      const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz), sp = a.leader ? a.speed : a.speed * 1.6;
      if (d < 0.1) { a.mode = 'pause'; a.speedNow = damp(a.speedNow, 0, 6, dt); }
      else { a.speedNow = damp(a.speedNow, sp, 3, dt); const st = Math.min(d, a.speedNow * dt); a.x += dx / d * st; a.z += dz / d * st; a.yaw = angLerp(a.yaw, headingTo(dx, dz), 4, dt); }
    } else a.speedNow = damp(a.speedNow, 0, 6, dt);
  }

  function pose(a, t) {
    const r = a.rig, s = a.speedNow;
    if (a.flies) { r.root.position.set(a.x, yAt(a.x, a.z) + 18 + Math.sin(a.ang * 2) * 0.8, a.z); r.root.rotation.set(0.3, a.yaw, 0); r.wings.forEach((w, i) => w.rotation.set(lift(i, 0.1 + Math.sin(t * 0.7) * 0.04), 0, 0)); return; }
    const y = a.swim ? POND.level - Y0 - 0.12 : yAt(a.x, a.z);
    r.root.position.set(a.x, y, a.z); r.root.rotation.set(0, a.yaw, 0);
    a.phase += 0.016 * s * (a.species === 'hare' || a.species === 'squirrel' ? 14 : 8);
    if (r.legs?.length && !a.swim) trot({ rig: r, phase: a.phase }, Math.min(0.5, s * 0.7));
    if (r.neck) r.neck.rotation.z = damp(r.neck.rotation.z, a.mode === 'pause' && a.species === 'deer' ? 1.2 : 0.15, 3, 0.016);   // deer graze when they stop
    if (a.species === 'boar' && r.head) r.head.rotation.z = 0.6 + (a.mode === 'pause' ? Math.abs(Math.sin(t * 3 + a.seed)) * 0.2 : 0);
    if (a.species === 'badger' && r.head) r.head.rotation.z = a.mode === 'pause' ? 0.55 + Math.abs(Math.sin(t * 7)) * 0.12 : 0.3;
    if (a.swim && r.tail) r.tail.rotation.z = Math.sin(t * 3 + a.seed) * 0.15 * (s > 0.05 ? 1 : 0.3);
    if (a.species === 'hare' || a.species === 'squirrel') r.root.position.y += s > 0.1 ? Math.abs(Math.sin(a.phase)) * 0.12 : 0;
  }

  function update(dt, t, cx, cz) {
    for (const a of animals) {
      think(a, dt);
      const d = Math.hypot(a.x - cx, a.z - cz), want = a === forced || d < spawn, drop = a !== forced && d > despawn;
      if (!a.rig && want) { const [rig, scale] = RIG[a.role](a.species); rig.root.scale.setScalar(scale); a.rig = rig; scene.add(rig.root); }
      else if (a.rig && drop) { scene.remove(a.rig.root); a.rig.root.traverse((o) => o.geometry?.dispose()); a.rig = null; }
      if (a.rig) pose(a, t);
    }
  }
  // the nearest animal of a species, given a rig so the camera can follow it
  function nearest(species, cx, cz) {
    let best = null; for (const a of animals) if (a.species === species && a.leader && (!best || Math.hypot(a.x - cx, a.z - cz) < Math.hypot(best.x - cx, best.z - cz))) best = a;
    if (best) { forced = best; update(0, 0, cx, cz); }
    return best;
  }
  return { animals, update, nearest, species: [...new Set(animals.map((a) => a.species))] };
}
