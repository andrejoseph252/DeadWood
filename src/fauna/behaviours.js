// Simple per-animal behaviours: small state machines that steer each rig and pose its joints.
// Visual only for now; when animals start to matter (roadmap step 4) their positions and states move into sim/.
import * as THREE from 'three';
import { HALF, height, pathZ, SPOTS } from '../world/plot.js';
import { LOG } from '../world/props.js';
import { blocked } from '../world/obstacles.js';
import F from '../data/fauna.json' with { type: 'json' };

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angLerp = (a, b, k, dt) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * (1 - Math.exp(-k * dt)); };
const TROT = [0, Math.PI, Math.PI, 0];   // leg order: front-left, hind-left, front-right, hind-right → diagonal pairs

// rigs: placed rigs from fauna/index.js; returns update(dt, t)
export function createBehaviours(rigs, rng) {
  const { rnd, rr } = rng;

  function mover(rig, yOff = 0) { return { rig, x: rig.root.position.x, z: rig.root.position.z, yaw: rig.root.rotation.y, yOff, phase: rnd() * 6, timer: rr(1, 4), mode: 'idle', tx: 0, tz: 0, speed: 0 }; }
  function steer(m, tx, tz, speed, dt, k = 5) {
    const dx = tx - m.x, dz = tz - m.z, dist = Math.hypot(dx, dz);
    if (dist < 0.06) { m.speed = damp(m.speed, 0, 6, dt); return true; }
    m.speed = damp(m.speed, speed, 3, dt);
    const step = Math.min(dist, m.speed * dt); m.x += dx / dist * step; m.z += dz / dist * step;
    m.yaw = angLerp(m.yaw, Math.atan2(dz, -dx), k, dt);
    return false;
  }
  function settle(m, y) { m.rig.root.position.set(m.x, y ?? height(m.x, m.z) + m.yOff, m.z); m.rig.root.rotation.y = m.yaw; }
  function legs(m, amp) { m.rig.legs.forEach((L, i) => { L.rotation.z = Math.sin(m.phase + (TROT[i] || 0)) * amp; }); }
  function flick(p, axis, t, every, size) { const c = (t % every) / every; p.rotation[axis] = c < 0.06 ? Math.sin(c / 0.06 * Math.PI) * size : 0; }

  // the roe deer walks the path from glade to glade, grazes, looks up when something stirs, and at one stop
  // browses the oak sapling (world.md interaction 1: roe deer prefer oak, fir and rowan to beech)
  const DEER_STOPS = F.species.deer.stops, BROWSE = F.species.deer.browse;
  const deerM = Object.assign(mover(rigs.deer), { mode: 'graze', timer: 6, stop: 2, dir: 1 });
  function updateDeer(dt, t) {
    const m = deerM, r = m.rig;
    if (m.mode === 'walk') {
      const [tx, tz] = DEER_STOPS[m.stop];
      if (steer(m, tx, tz, 0.85, dt, 3)) {
        if (m.stop === BROWSE.stop) { m.mode = 'browse'; m.timer = rr(7, 11); }
        else { m.mode = rnd() < 0.7 ? 'graze' : 'alert'; m.timer = m.mode === 'graze' ? rr(5, 10) : rr(2, 4); }
      }
    } else {
      m.speed = damp(m.speed, 0, 6, dt);
      if ((m.timer -= dt) < 0) {
        if ((m.mode === 'graze' || m.mode === 'browse') && rnd() < 0.4) { m.mode = 'alert'; m.timer = rr(2, 3.5); }
        else { m.mode = 'walk'; if (m.stop + m.dir < 0 || m.stop + m.dir >= DEER_STOPS.length) m.dir *= -1; m.stop += m.dir; }
      }
    }
    if (m.mode === 'browse') m.yaw = angLerp(m.yaw, Math.atan2(BROWSE.sapling[1] - m.z, -(BROWSE.sapling[0] - m.x)), 3, dt);
    m.phase += dt * m.speed * 7.5;
    legs(m, Math.min(0.42, m.speed * 0.5));
    r.body.position.y = Math.abs(Math.sin(m.phase)) * 0.015 * Math.min(1, m.speed);
    const neckT = m.mode === 'graze' ? 1.25 : m.mode === 'browse' ? 0.6 : m.mode === 'alert' ? -0.15 : 0.15;
    r.neck.rotation.z = damp(r.neck.rotation.z, neckT, 3, dt);
    r.head.rotation.z = m.mode === 'graze' ? Math.sin(t * 5) * 0.06 : m.mode === 'browse' ? 0.3 + Math.max(0, Math.sin(t * 3.5)) * 0.25 : damp(r.head.rotation.z, 0, 4, dt);
    r.neck.rotation.y = damp(r.neck.rotation.y, m.mode === 'alert' ? Math.sin(t * 0.7) * 0.5 : 0, 2, dt);
    r.ears.forEach((e, i) => flick(e, 'x', t + i * 1.3, 2.6 + i, 0.6));
    flick(r.tail, 'z', t, 3.1, 0.6);
    settle(m);
  }

  // the fox trots a loop from the gap over the wall into the pioneer edge, pausing to sniff; in the long grass it
  // stalks and pounces on voles (the mousing jump)
  const FOX_ROUTE = F.species.fox.route, POUNCE = new Set(F.species.fox.pounce);
  const foxM = Object.assign(mover(rigs.fox), { leg: 0 });
  function updateFox(dt, t) {
    const m = foxM, r = m.rig; let up = 0;
    if (m.mode === 'trot') { const [tx, tz] = FOX_ROUTE[m.leg]; if (steer(m, tx, tz, 1.7, dt, 6)) { m.mode = POUNCE.has(m.leg) ? 'stalk' : 'sniff'; m.timer = POUNCE.has(m.leg) ? rr(1.5, 2.5) : rr(1.5, 4); } }
    else if (m.mode === 'stalk') { m.speed = damp(m.speed, 0, 6, dt); if ((m.timer -= dt) < 0) { const lx = m.x - Math.cos(m.yaw) * 0.9, lz = m.z + Math.sin(m.yaw) * 0.9; if (blocked(lx, lz, { r: 0.2, wall: true })) { m.mode = 'sniff'; m.timer = 2; } else { m.mode = 'leap'; m.u = 0; m.from = [m.x, m.z]; m.to = [lx, lz]; } } }
    else if (m.mode === 'leap') { m.u = Math.min(1, m.u + dt * 1.6); m.x = m.from[0] + (m.to[0] - m.from[0]) * m.u; m.z = m.from[1] + (m.to[1] - m.from[1]) * m.u; up = Math.sin(m.u * Math.PI) * 0.45; r.body.rotation.z = (0.5 - m.u) * 0.9; if (m.u >= 1) { r.body.rotation.z = 0; m.mode = 'sniff'; m.timer = rr(2, 3.5); } }
    else { m.speed = damp(m.speed, 0, 6, dt); if ((m.timer -= dt) < 0) { m.mode = 'trot'; m.leg = (m.leg + 1) % FOX_ROUTE.length; } }
    m.phase += dt * m.speed * 9;
    legs(m, Math.min(0.6, m.speed * 0.4));
    r.body.position.y = Math.abs(Math.sin(m.phase)) * 0.02 * Math.min(1, m.speed);
    r.neck.rotation.z = damp(r.neck.rotation.z, m.mode === 'sniff' ? 0.9 : 0, 4, dt);
    r.head.rotation.z = m.mode === 'sniff' ? Math.sin(t * 7) * 0.08 : 0;
    r.tail.rotation.z = Math.sin(t * 2 + m.phase * 0.3) * 0.15 - 0.1 * Math.min(1, m.speed);
    r.tail.rotation.y = Math.sin(t * 1.4) * 0.25;
    r.ears.forEach((e, i) => flick(e, 'x', t + i, 3.7, 0.4 * (i ? 1 : -1)));
    if (m.mode === 'stalk') { r.body.position.y = -0.04; r.neck.rotation.z = -0.2; }   // crouched, ears forward
    settle(m, height(m.x, m.z) + up);
  }

  // the sow roots slowly about; the piglets trot after her
  const boarM = mover(rigs.boar); const home = { x: SPOTS.boar[0], z: SPOTS.boar[1] };
  const pigM = rigs.piglets.map((p, i) => Object.assign(mover(p), { off: [[-1.1, 0.7], [-1.0, -0.8], [-1.9, 0.1]][i] }));
  const edge = HALF - 1.5;
  function updateBoar(dt, t) {
    const m = boarM, r = m.rig;
    if (m.mode === 'walk') { if (steer(m, m.tx, m.tz, 0.35, dt, 2)) { m.mode = 'root'; m.timer = rr(3, 7); } }
    else { m.speed = damp(m.speed, 0, 5, dt); if ((m.timer -= dt) < 0) { m.mode = 'walk'; const a = rnd() * 6.28, d = rr(0.5, 2.2); m.tx = THREE.MathUtils.clamp(home.x + Math.cos(a) * d, -edge, edge); m.tz = THREE.MathUtils.clamp(home.z + Math.sin(a) * d, -edge, 12.8); } }
    m.phase += dt * m.speed * 9; legs(m, Math.min(0.35, m.speed * 0.9));
    r.head.rotation.z = 0.7 + (m.mode === 'root' ? Math.abs(Math.sin(t * 3.2)) * 0.18 : 0.05);
    r.tail.rotation.x = Math.sin(t * 6) * 0.5;
    settle(m);
    for (const p of pigM) {
      const c = Math.cos(m.yaw), s = Math.sin(m.yaw), back = -p.off[0], side = p.off[1];   // offsets in the sow's own frame
      const tx = m.x + back * c + side * s, tz = m.z - back * s + side * c;
      const arrived = steer(p, tx, tz, 1.3, dt, 6);
      p.phase += dt * p.speed * 14; legs(p, Math.min(0.5, p.speed * 0.6));
      p.rig.head.rotation.z = 0.5 + (arrived ? Math.abs(Math.sin(t * 4 + p.off[0])) * 0.25 : 0);
      p.rig.tail.rotation.x = Math.sin(t * 8 + p.off[1]) * 0.6;
      settle(p);
    }
  }

  // the hare sits, twitches, then makes a run of small hops
  const hareM = Object.assign(mover(rigs.hare), { mode: 'sit', hop: 0, base: { x: SPOTS.hare[0], z: SPOTS.hare[1] } });
  function updateHare(dt, t) {
    const m = hareM, r = m.rig; let lift = 0;
    if (m.mode === 'hop') {
      const done = steer(m, m.tx, m.tz, 1.6, dt, 8); m.hop += dt * 2.6;
      lift = Math.abs(Math.sin(m.hop * Math.PI)) * 0.22;
      r.body.rotation.z = Math.sin(m.hop * Math.PI * 2) * 0.25;
      r.legs.forEach((L, i) => { L.rotation.z = (i % 2 ? 1 : -1) * Math.sin(m.hop * Math.PI * 2) * 0.6; });
      if (done) { m.mode = 'sit'; m.timer = rr(3, 8); r.body.rotation.z = 0; }
    } else if ((m.timer -= dt) < 0) {
      m.mode = 'hop'; m.hop = 0; const nx = THREE.MathUtils.clamp(m.base.x + rr(-2.5, 2.5), -12, 12); m.tx = nx; m.tz = pathZ(nx) + rr(-0.6, 0.6);
    }
    r.ears.forEach((e, i) => { e.rotation.z = -0.35 + (m.mode === 'sit' ? Math.sin(t * 0.9 + i) * 0.12 : -0.4); });
    r.head.rotation.z = m.mode === 'sit' ? Math.sin(t * 11) * 0.02 : 0;
    settle(m, height(m.x, m.z) + lift);
  }

  // the squirrel scampers along the log in bursts
  const run = { x: LOG.x, z: LOG.z, y: height(LOG.x, LOG.z) + 0.32 + 0.4, ax: Math.cos(LOG.yaw), az: -Math.sin(LOG.yaw) };
  const sqM = Object.assign(mover(rigs.squirrel), { u: 1, tu: 1 });
  function updateSquirrel(dt, t) {
    const m = sqM, r = m.rig;
    if (Math.abs(m.tu - m.u) > 0.02) { const d = Math.sign(m.tu - m.u); m.u += d * Math.min(Math.abs(m.tu - m.u), 2.6 * dt); m.yaw = angLerp(m.yaw, Math.atan2(run.az * d, -run.ax * d), 12, dt); m.phase += dt * 30; }
    else if ((m.timer -= dt) < 0) { m.tu = rr(-2.6, 2.6); m.timer = rr(1.5, 5); }
    const moving = Math.abs(m.tu - m.u) > 0.02;
    m.x = run.x + run.ax * m.u; m.z = run.z + run.az * m.u;
    r.body.position.y = moving ? Math.abs(Math.sin(m.phase)) * 0.05 : 0;
    r.tail.rotation.z = Math.sin(t * (moving ? 10 : 2.5)) * (moving ? 0.25 : 0.12);
    r.head.rotation.y = moving ? 0 : Math.sin(t * 1.7) * 0.6;
    settle(m, run.y);
  }

  // the jay hops about on the stump; the woodpecker drums in bursts
  const jayM = Object.assign(mover(rigs.jay), { cx: 4.6, cz: -0.6, y: rigs.jay.root.position.y, hop: 1 });
  function updateJay(dt, t) {
    const m = jayM, r = m.rig;
    if (m.hop < 1) { m.hop += dt * 3; steer(m, m.tx, m.tz, 1.2, dt, 14); }
    else if ((m.timer -= dt) < 0) { const a = rnd() * 6.28, d = rr(0, 0.3); m.tx = m.cx + Math.cos(a) * d; m.tz = m.cz + Math.sin(a) * d; m.hop = 0; m.timer = rr(0.8, 3); }
    const lift = m.hop < 1 ? Math.sin(m.hop * Math.PI) * 0.12 : 0;
    r.head.rotation.y = Math.sin(t * 2.3) * 0.7 * (m.hop < 1 ? 0 : 1);
    r.tail.rotation.z = Math.sin(t * 9) * 0.08;
    r.wings.forEach((w, i) => { w.rotation.x = m.hop < 1 ? Math.sin(m.hop * Math.PI) * (i ? 0.9 : -0.9) : 0; });
    settle(m, m.y + lift);
  }
  // the woodpecker drums on the dead beech, then flies to its cone anvil at the plantation edge to hack at a cone
  // wedged in the stump (world.md interaction 20), and back
  const wp = rigs.woodpecker.root, wpHome = { p: wp.position.toArray(), ry: wp.rotation.y };
  const [ax, az] = F.species.woodpecker.anvil, anvil = [ax + 0.2, height(ax, az) + 0.16, az];
  const wpM = { mode: 'drum', timer: rr(15, 25), u: 0, from: wpHome.p, to: anvil };
  function updateWoodpecker(dt, t) {
    const r = rigs.woodpecker, c = t % 4.2;
    if (wpM.mode === 'fly') {
      wpM.u = Math.min(1, wpM.u + dt * 0.12); wp.position.set(...arc(wpM.from, wpM.to, wpM.u, 2.5 + Math.sin(wpM.u * 18) * 0.15));   // bounding flight
      wp.rotation.set(0, Math.atan2(wpM.to[2] - wpM.from[2], -(wpM.to[0] - wpM.from[0])), Math.PI / 2);
      if (wpM.u >= 1) { const atAnvil = wpM.to === anvil; wpM.mode = atAnvil ? 'hack' : 'drum'; wpM.timer = atAnvil ? rr(10, 16) : rr(18, 30); wp.rotation.set(0, atAnvil ? Math.PI : wpHome.ry, 0); }
      return;
    }
    r.head.rotation.z = c < 1.1 || wpM.mode === 'hack' ? Math.max(0, Math.sin((wpM.mode === 'hack' ? t * 0.7 : c) * 95)) * 0.45 : Math.sin(t * 1.5) * 0.08;
    r.tail.rotation.z = c < 1.1 ? Math.sin(c * 95) * 0.05 : 0;
    if ((wpM.timer -= dt) < 0) { wpM.mode = 'fly'; wpM.u = 0; wpM.from = wp.position.toArray(); wpM.to = wpM.from[0] === anvil[0] ? wpHome.p : anvil; r.head.rotation.z = 0; }
  }
  const arc = (a, b, u, apex) => { const s = u * u * (3 - 2 * u); return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s + Math.sin(Math.PI * u) * apex, a[2] + (b[2] - a[2]) * s]; };

  return function update(dt, t) { updateDeer(dt, t); updateFox(dt, t); updateBoar(dt, t); updateHare(dt, t); updateSquirrel(dt, t); updateJay(dt, t); updateWoodpecker(dt, t); };
}
