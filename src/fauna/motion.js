// Shared motion helpers for animal behaviours: easing, steering on the ground, flying along an arc.
// Rigs face -x, so a heading of yaw means the head points along (-cos yaw, 0, sin yaw) ... see headingTo().
import { height } from '../world/plot.js';

export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const angLerp = (a, b, k, dt) => { const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * (1 - Math.exp(-k * dt)); };
export const headingTo = (dx, dz) => Math.atan2(dz, -dx);   // root.rotation.y that points a -x rig along (dx, dz)
export const flick = (p, axis, t, every, size) => { const c = (t % every) / every; p.rotation[axis] = c < 0.06 ? Math.sin(c / 0.06 * Math.PI) * size : 0; };

// a ground mover for a rig whose root is already placed
export function mover(rig, rnd, yOff = 0) {
  return { rig, x: rig.root.position.x, z: rig.root.position.z, y: rig.root.position.y, yaw: rig.root.rotation.y, yOff, phase: rnd() * 6, timer: 1 + rnd() * 3, mode: 'idle', tx: 0, tz: 0, speed: 0, i: 0 };
}
// walk towards (tx, tz); returns true on arrival
export function steer(m, tx, tz, speed, dt, k = 5) {
  const dx = tx - m.x, dz = tz - m.z, dist = Math.hypot(dx, dz);
  if (dist < 0.06) { m.speed = damp(m.speed, 0, 6, dt); return true; }
  m.speed = damp(m.speed, speed, 3, dt);
  const step = Math.min(dist, m.speed * dt); m.x += dx / dist * step; m.z += dz / dist * step;
  m.yaw = angLerp(m.yaw, headingTo(dx, dz), k, dt);
  return false;
}
export function settle(m, y) { m.rig.root.position.set(m.x, y ?? height(m.x, m.z) + m.yOff, m.z); m.rig.root.rotation.y = m.yaw; }
export function trot(m, amp, pairs = [0, Math.PI, Math.PI, 0]) { m.rig.legs.forEach((L, i) => { L.rotation.z = Math.sin(m.phase + (pairs[i] || 0)) * amp; }); }

// a point on a flight from a to b ([x, y, z]) at progress u (0..1), rising by `apex` in the middle
export function arc(a, b, u, apex) {
  const s = u * u * (3 - 2 * u);
  return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s + Math.sin(Math.PI * u) * apex, a[2] + (b[2] - a[2]) * s];
}
// wing pivots are built along -z (index 0) and +z (index 1): this rotation.x lifts both by `a` radians
export const lift = (i, a) => (i ? -1 : 1) * a;
// flap a rig's wings about a raised angle `base`; amp in radians
export function flap(rig, t, rate, amp, base = 0) { rig.wings?.forEach((w, i) => { w.rotation.x = lift(i, base + Math.sin(t * rate) * amp); }); }
