// Behaviours of the animals added for the 40 m map: badger, owl, robin, wren, nuthatch, buzzard, frog, salamander
// larvae, lizard, slow worm, butterflies, demoiselles, dragonfly, bumblebees and wood ants. Scripted moments from
// world.md section 7 are noted by interaction number. Data (routes, homes) comes from data/fauna.json.
import * as THREE from 'three';
import F from '../data/fauna.json' with { type: 'json' };
import { MAP, TREES, PLATES, BACKWATER, height, streamAt, streamNear, waterAt, STREAM_LEN, outcropEdge } from '../world/plot.js';
import { blocked } from '../world/obstacles.js';
import { damp, headingTo, flick, mover, steer, settle, trot, arc, flap, lift } from './motion.js';

export function createMoreBehaviours(rigs, rng, extra) {
  const { rnd, rr } = rng;
  const S = F.species, ups = [];

  // ---------- badger: out of the sett, a scratch, then foraging along its trail to the gap and back (13) ----------
  if (rigs.badger) {
    const R = S.badger.route, m = Object.assign(mover(rigs.badger, rnd), { mode: 'emerge', timer: 2.5, i: 0, dir: 1, sink: 0.3 });
    m.x = R[0][0]; m.z = R[0][1] - 0.35; m.yaw = headingTo(0, 1);
    ups.push((dt, t) => {
      const r = m.rig;
      if (m.mode === 'emerge') { m.sink = damp(m.sink, 0, 1.5, dt); steer(m, R[0][0], R[0][1], 0.25, dt, 3); if ((m.timer -= dt) < 0) { m.mode = 'scratch'; m.timer = rr(3, 5); } }
      else if (m.mode === 'scratch') { m.speed = 0; r.legs[3].rotation.z = Math.sin(t * 16) * 0.7; r.head.rotation.z = 0.5; if ((m.timer -= dt) < 0) { r.legs[3].rotation.z = 0; m.mode = 'walk'; } }
      else if (m.mode === 'walk') {
        const [tx, tz] = R[m.i];
        if (steer(m, tx, tz, 0.45, dt, 4)) { m.mode = 'snuffle'; m.timer = rr(2, 5); }
      } else if (m.mode === 'snuffle') {   // nose in the litter for worms
        m.speed = damp(m.speed, 0, 6, dt); r.head.rotation.z = 0.55 + Math.abs(Math.sin(t * 7)) * 0.15;
        if ((m.timer -= dt) < 0) {
          if (m.i + m.dir >= R.length || m.i + m.dir < 0) m.dir *= -1;
          m.i += m.dir; m.mode = m.i === 0 ? 'home' : 'walk';
        }
      } else if (m.mode === 'home') { if (steer(m, R[0][0], R[0][1], 0.45, dt, 4)) { m.mode = 'scratch'; m.timer = rr(4, 7); m.dir = 1; } }
      if (m.mode === 'walk' || m.mode === 'home') r.head.rotation.z = damp(r.head.rotation.z, 0.3, 4, dt);
      m.phase += dt * m.speed * 12; if (m.mode !== 'scratch') trot(m, Math.min(0.5, m.speed * 1.1));
      settle(m, height(m.x, m.z) - m.sink);
    });
  }

  // ---------- tawny owl: roosting close to the trunk of a holly, eyes half shut, head turning now and then ----------
  if (rigs.owl) {
    const r = rigs.owl; let goal = 0, next = 3;
    ups.push((dt, t) => { if ((next -= dt) < 0) { goal = rnd() < 0.4 ? 0 : rr(-1.6, 1.6); next = rr(3, 9); } r.head.rotation.y = damp(r.head.rotation.y, goal, 3, dt); r.body.scale.y = 1 + Math.sin(t * 1.3) * 0.01; });
  }

  // ---------- robin: hops along behind the rooting sow for what she turns up (11), sings from a rock ----------
  if (rigs.robin && rigs.boar) {
    const m = Object.assign(mover(rigs.robin, rnd), { mode: 'wait', hop: 1 }), sow = rigs.boar.root.position, song = [8.5, 9.4];
    ups.push((dt, t) => {
      const r = m.rig;
      if (m.hop < 1) { m.hop = Math.min(1, m.hop + dt * 4); steer(m, m.tx, m.tz, 1.6, dt, 14); }
      else if ((m.timer -= dt) < 0) {
        if (m.mode !== 'sing' && rnd() < 0.12) { m.mode = 'sing'; m.tx = song[0]; m.tz = song[1]; m.timer = rr(5, 9); m.hop = 0; }
        else { m.mode = 'forage'; const a = rnd() * 6.28, d = rr(0.7, 1.4); const x = sow.x + Math.cos(a) * d, z = sow.z + Math.sin(a) * d; if (!blocked(x, z, { r: 0.05, water: true })) { m.tx = x; m.tz = z; m.hop = 0; } m.timer = rr(0.4, 1.4); }
      }
      const onRock = m.mode === 'sing' && Math.hypot(m.x - song[0], m.z - song[1]) < 0.2;
      r.head.rotation.z = m.mode === 'forage' && m.hop >= 1 ? Math.max(0, Math.sin(t * 9)) * 0.9 : onRock ? -0.3 + Math.sin(t * 20) * 0.05 : 0;
      if (m.hop < 1) r.tail.rotation.z = 0.45; else { flick(r.tail, 'z', t, 2.2, 0.4); r.tail.rotation.z += 0.15; }
      flap(r, t, 30, m.hop < 1 ? 0.6 : 0, 0);
      const up = m.hop < 1 ? Math.sin(m.hop * Math.PI) * (m.mode === 'sing' ? 0.5 : 0.06) : 0;
      settle(m, height(m.x, m.z) + up + (onRock ? 0.55 : 0));
    });
  }

  // ---------- wren: hops between the log, the plate's rim and the nest hollow; tail cocked, loud song ----------
  if (rigs.wren) {
    const p = PLATES.reduce((b, q) => (q.r > b.r ? q : b)), gy = height(p.x, p.z);
    const logAt = (u) => { const x = p.x + p.dx * u, z = p.z + p.dz * u; return [x, (gy + 0.55) + (height(x, z) + 0.14 - (gy + 0.55)) * (u / p.len) + 0.22, z]; };
    const spots = [logAt(1.4), logAt(2.6), [p.x - p.dz * 0.9 - p.dx * 0.7, gy + 0.02, p.z + p.dx * 0.9 - p.dz * 0.7], [p.x - p.dz * 0.45 - p.dx * 0.25, gy + p.r * 0.5, p.z + p.dx * 0.45 - p.dz * 0.25]];
    const r = rigs.wren; let at = spots[0], from = at, to = at, u = 1, wait = 2;
    ups.push((dt, t) => {
      if (u < 1) { u = Math.min(1, u + dt * 1.8); at = arc(from, to, u, 0.25); flap(r, t, 40, 0.8); }
      else { flap(r, t, 0, 0); if ((wait -= dt) < 0) { from = at; to = spots[Math.floor(rnd() * spots.length)]; u = 0; wait = rr(1.5, 4); r.root.rotation.y = headingTo(to[0] - from[0], to[2] - from[2]); } }
      r.tail.rotation.z = 1.25 + Math.sin(t * 3) * 0.1; r.body.position.y = u >= 1 && (t % 6) < 2.5 ? Math.sin(t * 60) * 0.002 : 0;   // the trilling song shakes it
      r.root.position.set(...at);
    });
  }

  // ---------- nuthatch: works head-first down the ivy-clad oak, then flits back up ----------
  if (rigs.nuthatch) {
    const oak = TREES.find((t) => t.ivy), gy = height(oak.x, oak.z), R = 0.44, r = rigs.nuthatch;
    let a = 0.6, y = 3.2, mode = 'down', u = 0;
    ups.push((dt, t) => {
      if (mode === 'down') { y -= dt * (Math.sin(t * 3) > 0 ? 0.25 : 0.02); a += dt * 0.25; r.head.rotation.z = Math.max(0, Math.sin(t * 6)) * 0.4; if (y < 1.0) { mode = 'up'; u = 0; } }
      else { u += dt * 1.4; y = 1.0 + u * 2.2; a -= dt * 0.8; flap(r, t, 40, 0.8); if (u >= 1) { mode = 'down'; flap(r, t, 0, 0); } }
      r.root.position.set(oak.x + Math.cos(a) * R, gy + y, oak.z + Math.sin(a) * R);
      r.root.rotation.set(0, Math.PI - a, mode === 'down' ? Math.PI / 2 : -Math.PI / 2);   // belly to the bark, head down (or up)
    });
  }

  // ---------- buzzard: soars in wide circles, then glides down to the snag to watch the grass (8) ----------
  if (rigs.buzzard) {
    const r = rigs.buzzard, B = S.buzzard, sn = TREES.find((t) => t.id === B.perch), perch = [sn.x + 0.05, height(sn.x, sn.z) + sn.h + 0.02, sn.z];
    const C = B.soar.centre, rad = B.soar.r, H = height(C[0], C[1]) + B.soar.height;
    let mode = 'soar', ang = 0, timer = 25, u = 0, from = null, to = null;
    const circ = (a) => [C[0] + Math.cos(a) * rad, H + Math.sin(a * 2) * 0.8, C[1] + Math.sin(a) * rad];
    ups.push((dt, t) => {
      if (mode === 'soar') {
        ang += dt * 0.22; const p = circ(ang), q = circ(ang + 0.05); r.root.position.set(...p);
        r.root.rotation.set(0.35, headingTo(q[0] - p[0], q[2] - p[2]), 0);   // banked into the turn
        r.wings.forEach((w, i) => { w.rotation.set(lift(i, 0.1 + Math.sin(t * 0.7) * 0.04), 0, 0); }); r.tips.forEach((w, i) => { w.rotation.x = lift(i, 0.12); });   // a shallow V
        if ((timer -= dt) < 0) { mode = 'glide'; u = 0; from = p; to = perch; }
      } else if (mode === 'glide' || mode === 'climb') {
        u = Math.min(1, u + dt * (mode === 'glide' ? 0.09 : 0.12)); const p = arc(from, to, u, mode === 'glide' ? 1 : 3); r.root.position.set(...p);
        r.root.rotation.set(0, headingTo(to[0] - from[0], to[2] - from[2]), 0);
        const flaps = mode === 'climb' && u < 0.6, pull = mode === 'glide' && u > 0.85;
        r.wings.forEach((w, i) => { w.rotation.set(lift(i, flaps ? Math.sin(t * 9) * 0.6 : pull ? 0.6 : 0.1), 0, 0); }); r.tips.forEach((w, i) => { w.rotation.x = lift(i, 0.1); });
        if (u >= 1) { if (mode === 'glide') { mode = 'perch'; timer = rr(14, 22); } else { mode = 'soar'; timer = rr(25, 40); ang = Math.atan2(to[2] - C[1], to[0] - C[0]); } }
      } else {   // perched: wings folded along the body, head scanning the ground
        r.root.position.set(...perch); r.root.rotation.set(0, r.root.rotation.y, 0);
        r.wings.forEach((w, i) => { w.rotation.set(lift(i, -0.15), (i ? 1 : -1) * 1.45, 0); }); r.tips.forEach((w) => { w.rotation.x = 0; });   // folded back along the body
        r.head.rotation.y = Math.sin(t * 0.6) * 0.8; r.head.rotation.z = 0.3;
        if ((timer -= dt) < 0) { mode = 'climb'; u = 0; from = perch; to = circ(ang); r.head.rotation.set(0, 0, 0); }
      }
    });
  }

  // ---------- common frog: short hops in the damp grass by the backwater ----------
  if (rigs.frog) {
    const H = S.frog.home, m = Object.assign(mover(rigs.frog, rnd), { hop: 1 });
    ups.push((dt, t) => {
      const r = m.rig;
      if (m.hop < 1) { m.hop = Math.min(1, m.hop + dt * 2.2); steer(m, m.tx, m.tz, 0.9, dt, 20); }
      else if ((m.timer -= dt) < 0) { const a = rnd() * 6.28, d = rr(0.25, 0.6), x = m.x + Math.cos(a) * d, z = m.z + Math.sin(a) * d; if (Math.hypot(x - H[0], z - H[1]) < S.frog.range && !blocked(x, z, { r: 0.05 })) { m.tx = x; m.tz = z; m.hop = 0; } m.timer = rr(1.5, 5); }
      const s = m.hop < 1 ? Math.sin(m.hop * Math.PI) : 0;
      r.legs.forEach((L, i) => { L.rotation.z = i % 2 ? -s * 1.1 : s * 0.4; }); r.body.rotation.z = s * 0.3;
      settle(m, height(m.x, m.z) + s * 0.12);
    });
  }

  // ---------- fire salamander larvae: drifting and wriggling in the shallows of the backwater ----------
  if (rigs.larvae) {
    const wy = waterAt(streamNear(BACKWATER.x, BACKWATER.z).s) + 0.004;
    rigs.larvae.forEach((r, i) => { const m = { a: i * 1.6, d: BACKWATER.r * rr(0.55, 0.85), yaw: rnd() * 6 };
      ups.push((dt, t) => { m.a += dt * 0.05 * (i % 2 ? 1 : -1); m.yaw += Math.sin(t * 0.5 + i) * dt * 0.6; r.root.position.set(BACKWATER.x + Math.cos(m.a) * m.d, wy, BACKWATER.z + Math.sin(m.a) * m.d * 0.8); r.root.rotation.y = m.yaw; r.tail.rotation.y = Math.sin(t * 9 + i) * 0.5; }); });
  }

  // ---------- common lizard: basking on the warm stone on the outcrop; a quick dart and back ----------
  if (rigs.lizard) {
    const z0 = MAP.outcrop.zStart + 2.6, x0 = outcropEdge(z0) - 1.0, top = [x0, height(x0, z0) + 0.16, z0], r = rigs.lizard;
    let mode = 'bask', timer = rr(6, 12), u = 0, from = top, to = top;
    r.root.rotation.y = 2.4;
    ups.push((dt, t) => {
      if (mode === 'bask') { r.root.position.set(...top); r.head.rotation.z = (t % 4) < 0.25 ? -0.25 : 0; if ((timer -= dt) < 0) { const a = rnd() * 6.28, x = x0 + Math.cos(a) * 0.55, z = z0 + Math.sin(a) * 0.55; from = top; to = [x, height(x, z) + 0.005, z]; mode = 'dart'; u = 0; r.root.rotation.y = headingTo(to[0] - from[0], to[2] - from[2]); } }
      else if (mode === 'pause') { if ((timer -= dt) < 0) { from = to; to = top; mode = 'back'; u = 0; r.root.rotation.y = headingTo(to[0] - from[0], to[2] - from[2]); } }
      else { u = Math.min(1, u + dt * 2.5); r.root.position.set(...arc(from, to, u, 0.02)); r.legs.forEach((L, i) => { L.rotation.y = Math.sin(t * 40 + i * 1.6) * 0.6; }); r.tail.rotation.y = Math.sin(t * 30) * 0.3;
        if (u >= 1) { if (mode === 'dart') { mode = 'pause'; timer = rr(2, 4); } else { mode = 'bask'; timer = rr(8, 16); r.root.rotation.y = 2.4; } } }
    });
  }

  // ---------- slow worm: a slow travelling wave along the foot of the outcrop ----------
  if (rigs.slowworm) {
    const r = rigs.slowworm, za = MAP.outcrop.zStart + 5, zb = za + 3.5; let z = za, dir = 1;
    ups.push((dt, t) => {
      z += dir * dt * 0.06; if (z > zb || z < za) dir *= -1;
      const x = outcropEdge(z) + 0.9; r.root.position.set(x, height(x, z) + 0.008, z); r.root.rotation.y = headingTo(0, dir);
      r.segs.forEach((s, i) => { if (i) s.rotation.y = Math.sin(t * 1.6 - i * 0.9) * 0.28; });
    });
  }

  // ---------- speckled wood: each male holds a sunfleck at the gap rim, spiralling up at intruders ----------
  (rigs.butterflies || []).forEach((r, i) => {
    const home = [[-4.2, -4.6], [5.4, -3.6]][i % 2], m = { a: rnd() * 6, rest: 0, y: 0.6 };
    ups.push((dt, t) => {
      const gy = height(home[0], home[1]);
      if (m.rest > 0) { m.rest -= dt; r.wings.forEach((w, k) => { w.rotation.x = lift(k, 0.05); }); return; }
      m.a += dt * (1.6 + Math.sin(t * 0.7 + i) * 0.6); m.y = 0.5 + Math.abs(Math.sin(t * 0.4 + i * 2)) * 1.1;
      const rad = 0.5 + Math.sin(t * 0.9 + i) * 0.3, x = home[0] + Math.cos(m.a) * rad, z = home[1] + Math.sin(m.a) * rad;
      r.root.position.set(x, gy + m.y + Math.sin(t * 9) * 0.03, z); r.root.rotation.y = headingTo(-Math.sin(m.a), Math.cos(m.a));
      r.wings.forEach((w, k) => { w.rotation.x = lift(k, 0.7 + Math.sin(t * 22 + i) * 0.7); });
      if (rnd() < dt * 0.06) { m.rest = rr(3, 7); r.root.position.y = gy + 0.08; }
    });
  });

  // ---------- beautiful demoiselles: short fluttering flights between perches over the shaded stream ----------
  (rigs.demoiselles || []).forEach((r, i) => {
    const s0 = 7 + i * 5, perch = () => { const s = Math.min(STREAM_LEN - 1, Math.max(1, s0 + rr(-2, 2))), [x, z] = streamAt(s); const o = rr(-0.5, 0.5); return [x + o, waterAt(s) + rr(0.25, 0.45), z + o * 0.6]; };
    let at = perch(), from = at, to = at, u = 1, wait = rr(1, 4);
    ups.push((dt, t) => {
      if (u < 1) { u = Math.min(1, u + dt * 0.8); at = arc(from, to, u, 0.2); at[1] += Math.sin(t * 6 + i) * 0.03; r.wings.forEach((w, k) => { w.rotation.x = lift(k, 0.6 + Math.sin(t * 14 + i) * 0.8); }); }
      else { r.wings.forEach((w, k) => { w.rotation.x = lift(k, 1.45); });   // at rest the wings close together over the back
        if ((wait -= dt) < 0) { from = at; to = perch(); u = 0; wait = rr(2, 6); r.root.rotation.y = headingTo(to[0] - from[0], to[2] - from[2]); } }
      r.root.position.set(...at);
    });
  });

  // ---------- golden-ringed dragonfly: low patrols up and down the stream with hovering pauses ----------
  if (rigs.dragonfly) {
    const r = rigs.dragonfly; let s = 4, dir = 1, hover = 0;
    ups.push((dt, t) => {
      if (hover > 0) hover -= dt; else { s += dir * dt * 1.8; if (s > STREAM_LEN - 3 || s < 2) dir *= -1; if (rnd() < dt * 0.3) hover = rr(0.8, 2); }
      const [x, z] = streamAt(s), [x2, z2] = streamAt(s + dir * 0.3);
      r.root.position.set(x, waterAt(s) + 0.4 + Math.sin(t * 2) * 0.05, z); r.root.rotation.y = headingTo(x2 - x, z2 - z);
      r.wings.forEach((w, k) => { w.rotation.x = lift(k, Math.sin(t * 50) * 0.25); });
    });
  }

  // ---------- bumblebees: from foxglove spike to spike, hovering at the bells (38) ----------
  if (rigs.bees && extra.foxgloves?.length) {
    const fg = extra.foxgloves;
    rigs.bees.forEach((r, i) => {
      const bell = (k) => { const [x, z, h] = fg[k]; return [x - 0.12, height(x, z) + h * rr(0.55, 0.85), z]; };
      let k = i % fg.length, at = bell(k), from = at, to = at, u = 1, wait = rr(0.5, 2);
      ups.push((dt, t) => {
        if (u < 1) { u = Math.min(1, u + dt * (Math.hypot(to[0] - from[0], to[2] - from[2]) > 3 ? 0.25 : 1.2)); at = arc(from, to, u, 0.4); }
        else if ((wait -= dt) < 0) { from = at; if (rnd() < 0.6) to = bell(k); else { k = Math.floor(rnd() * fg.length); to = bell(k); } u = 0; wait = rr(0.8, 2.5); r.root.rotation.y = headingTo(to[0] - from[0], to[2] - from[2]); }
        r.root.position.set(at[0], at[1] + Math.sin(t * 13 + i) * 0.01, at[2]);
        r.wings.forEach((w, q) => { w.rotation.x = lift(q, Math.sin(t * 70) * 0.5); });
      });
    });
  }

  // ---------- red wood ants: specks moving along a trail from the mound up the nearest spruce (33) ----------
  if (extra.ants) {
    const { mesh, n } = extra.ants, A = MAP.antMound, sp = TREES.filter((t) => t.kind === 'spruce').reduce((b, t) => (Math.hypot(t.x - A.x, t.z - A.z) < Math.hypot(b.x - A.x, b.z - A.z) ? t : b));
    const sy = height(sp.x, sp.z), d = Math.hypot(sp.x - A.x, sp.z - A.z), ux = (sp.x - A.x) / d, uz = (sp.z - A.z) / d, groundLen = d - A.r - 0.3, climb = 2.2;
    const total = groundLen + climb, dummy = new THREE.Object3D(), off = Array.from({ length: n }, () => [rnd() * total, rr(-0.06, 0.06), rnd() < 0.5 ? 1 : -1]);
    ups.push((dt) => {
      off.forEach((o, i) => {
        o[0] = (o[0] + o[2] * dt * 0.05 + total) % total; const s = o[0];
        if (s < groundLen) { const x = A.x + ux * (A.r + s) - uz * o[1], z = A.z + uz * (A.r + s) + ux * o[1]; dummy.position.set(x, height(x, z) + 0.01, z); dummy.rotation.set(0, headingTo(ux * o[2], uz * o[2]), 0); }
        else { const c = s - groundLen, x = sp.x - ux * 0.22 - uz * o[1], z = sp.z - uz * 0.22 + ux * o[1]; dummy.position.set(x, sy + c, z); dummy.rotation.set(0, headingTo(ux, uz), o[2] * Math.PI / 2); }
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  return (dt, t) => { for (const u of ups) u(dt, t); };
}
