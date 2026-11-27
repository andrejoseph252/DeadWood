// What grows and lies in and beside the estate's water (world.md section 5, H4; section 7, 30-32; section 12):
// the brook banks (wet dark soil, pale gravel bars on inner bends, dark cut banks on outer bends, mossy stones,
// stones breaking the surface in riffles, pebbles at the edges of shallow beds) and the beaver pond (drowned grey
// snags in the shallows, the lodge on the north bank, sticks, logs and mud on the dam, reed and sedge margins,
// white water-lily pads on the still water). Data only, written into tile layers like the rest of tile-build.js
// (it runs in a worker). Big pieces (snags, the lodge) are placed once for the whole pond and each tile keeps the
// ones anchored inside it, so nothing is doubled or cut at tile edges.
import * as THREE from 'three';
import { fbm, sstep } from '../core/noise.js';
import { createRng } from '../core/random.js';
import { BROOKS, POND, pondR, DAM, damSide, HALF, inPlot, brookAt, height } from '../estate/terrain.js';

const C = (h) => new THREE.Color(h);
const WETSOIL = C('#2b2319'), SILT = C('#3a3226'), GRAVEL = C('#a39a84'), GRAVEL2 = C('#8c8270'), CUTBANK = C('#32241a'), BEDG = C('#6a604c');
const inPond = (x, z, r = 1) => damSide(x, z) < 0 && pondR(x, z) < r;

// ---------- bank colours: written over the ground colour c at (x, z) ----------
export function bankColor(c, x, z, n2) {
  if (inPlot(x, z, 0.4)) return;
  const k = brookAt(x, z, 2); if (!k) return;
  if (k.key === 'main' && inPond(x, z, 1.05)) return;   // under the pond; its own shore colours come from the cover
  const t = k.t + (n2 - 0.5) * 0.18;
  c.lerp(WETSOIL, sstep(2.0, 1.1, t) * 0.8);   // damp dark soil along the water
  c.lerp(SILT.clone().lerp(BEDG, k.riff), sstep(1.05, 0.8, t));   // the bed: silt in pools, gravel over riffles
  c.lerp(n2 > 0.55 ? GRAVEL2 : GRAVEL, k.inner * sstep(1.9, 1.35, t) * sstep(0.25, 0.6, t) * 0.95);   // gravel bar on the inside of a bend
  c.lerp(CUTBANK, k.outer * sstep(1.8, 1.2, t) * sstep(0.85, 1.02, t) * 0.9);   // raw earth on the outside, where the water cuts
}

// ---------- pond pieces placed once for the whole pond ----------
let POND_SET = null;
export function pondSet() {
  if (POND_SET) return POND_SET;
  const { rnd, rr } = createRng(424242), LV = POND.level, [cx, cz] = POND.centre, R = Math.max(POND.rx, POND.rz) * 1.1;
  const depth = (x, z) => LV - height(x, z);
  // drowned trees: alders and spruce killed when the water came up, standing in 0.2-0.9 m of water
  const snags = [];
  for (let tries = 0; tries < 4000 && snags.length < 18; tries++) {
    const x = cx + rr(-R, R), z = cz + rr(-R, R), r = pondR(x, z), d = depth(x, z);
    if (!inPond(x, z, 0.92) || r < 0.42 || d < 0.15 || d > 0.95) continue;
    if (snags.some((s) => Math.hypot(s.x - x, s.z - z) < 4.5)) continue;
    snags.push({ x, z, gy: height(x, z), h: rr(3.5, 8.5), r: rr(0.1, 0.2), v: rnd(), broken: rnd() < 0.45, lean: rr(-0.08, 0.08), la: rnd() * 6.28 });
  }
  // the lodge: on the north bank, where the water is still about half a metre deep (its entrances are under water)
  const yaw = POND.yaw, th = -Math.PI / 2 + 0.45;
  let lodge = null;
  for (let f = 1.1; f > 0.4; f -= 0.01) {
    const u = Math.cos(th) * POND.rx * f, v = Math.sin(th) * POND.rz * f, x = cx + u * Math.cos(yaw) - v * Math.sin(yaw), z = cz + u * Math.sin(yaw) + v * Math.cos(yaw);
    if (inPond(x, z, 1.2) && depth(x, z) > 0.15) { lodge = { x, z, gy: Math.min(height(x, z), LV - 0.2), r: 2.8, h: 1.5, a: th + yaw }; break; }
  }
  POND_SET = { snags, lodge };
  return POND_SET;
}

// all the water's pieces for one tile; put/putS/lay/rgb are tile-build.js's writers, Y the ground height there
export function waterFeatures({ x0, z0, size, near, Y, Y0, lay, put, putS, rgb, seed }) {
  const { rnd, rr } = createRng(seed), pick = (a) => a[Math.floor(rnd() * a.length)];
  const inT = (x, z) => x >= x0 && x < x0 + size && z >= z0 && z < z0 + size;
  const cx = x0 + size / 2, cz = z0 + size / 2;
  const LV = POND.level - Y0;

  // ---------- the pond ----------
  const P = pondSet(), pr = Math.max(POND.rx, POND.rz) * 1.5, [pcx, pcz] = POND.centre;
  const nearPond = Math.abs(cx - pcx) < pr + size / 2 && Math.abs(cz - pcz) < pr + size / 2;
  if (nearPond) {
    const GREY = ['#9a968c', '#8b877d', '#a39f94', '#7f7b72'];
    for (const s of P.snags) {
      if (!inT(s.x, s.z)) continue;
      const h = s.broken ? s.h * 0.55 : s.h, col = rgb(GREY[Math.floor(s.v * 4)]), lx = Math.cos(s.la) * s.lean, lz = Math.sin(s.la) * s.lean;
      put(lay('trunk'), s.x, s.gy - Y0 - 0.2, s.z, lx, 0, lz, s.r / 0.1, h + 0.2, s.r / 0.1, col);
      if (!near) continue;
      const nb = s.broken ? 3 : 8;
      for (let k = 0; k < nb; k++) { const y = rr(h * 0.35, h * 0.95), a = rnd() * 6.28; put(lay('stub'), s.x + Math.cos(a) * s.r + lx * y, s.gy - Y0 + y, s.z + Math.sin(a) * s.r + lz * y, 0, -a, -rr(1.0, 1.4), 1.4, rr(0.4, 1.3) * (1.15 - y / h), 1.4, col); }
      if (!s.broken) for (let b = 0; b < 2; b++) { const a = rnd() * 6.28; put(lay('branch'), s.x + lx * h * 0.8, s.gy - Y0 + h * 0.78, s.z + lz * h * 0.8, 0, -a, -rr(0.6, 0.9), 0.5, rr(1, 2), 0.5, col); }
      put(lay('collar'), s.x, LV - 0.08, s.z, 0, 0, 0, s.r * 9, 0.5, s.r * 9, rgb('#4a4a36'));   // a dark ring of algae and silt at the waterline
    }
    const L = P.lodge;
    if (L && inT(L.x, L.z)) {
      const MUD = ['#4a3a28', '#3e3022', '#55432e'], STICK = ['#b5a487', '#a08e70', '#7d6e5a', '#8a7a62', '#c4b494'];
      const base = L.gy - Y0, top = LV + L.h;
      put(lay('mound'), L.x, base, L.z, 0, L.a, 0, L.r, top - base, L.r * 0.85, rgb(MUD[0]));
      const ns = near ? 110 : 30;
      for (let k = 0; k < ns; k++) {   // sticks laid over the dome, mostly running down its sides, peeled pale by the beavers
        const az = rnd() * 6.28, el = Math.acos(Math.min(1, Math.sqrt(rnd()))), rx = Math.cos(az) * Math.sin(el), rz = Math.sin(az) * Math.sin(el);
        const px = L.x + (rx * Math.cos(L.a) - rz * Math.sin(L.a)) * L.r * 1.02, pz = L.z + (rx * Math.sin(L.a) + rz * Math.cos(L.a)) * L.r * 0.87, py = base + Math.cos(el) * (top - base) * 1.02;
        const dir = Math.atan2(pz - L.z, px - L.x) + rr(-0.9, 0.9), len = rr(0.9, 2.4);
        put(lay('limb'), px - Math.cos(dir) * len * 0.5, py + len * 0.2 * Math.cos(el), pz - Math.sin(dir) * len * 0.5, 0, -dir, -(Math.PI / 2 + Math.sin(el) * 0.6 * rr(0.6, 1.2)), rr(0.3, 0.55), len, rr(0.3, 0.55), rgb(pick(STICK)));
      }
      if (near) for (let k = 0; k < 14; k++) { const a = rnd() * 6.28, f = rr(0.3, 0.9); putS(lay('mud'), L.x + Math.cos(a) * L.r * f, base + (top - base) * Math.sqrt(1 - f * f) * 0.95, L.z + Math.sin(a) * L.r * 0.85 * f, rr(0.25, 0.5), rgb(pick(MUD))); }
    }
    // the margins, metre by metre: reeds and reedmace in the shallows, sedges at the water's edge, lily pads further out
    if (near) {
      const REED = ['#6f8a3a', '#7d9642', '#60793a', '#889c4a'], SEDGE = ['#3f6626', '#4a7330', '#56803a'], PAD = ['#3f6a2a', '#4a7a30', '#355a24', '#5a7d2e'];
      const ax0 = Math.max(x0, pcx - pr), ax1 = Math.min(x0 + size, pcx + pr), az0 = Math.max(z0, pcz - pr), az1 = Math.min(z0 + size, pcz + pr);
      for (let z = Math.floor(az0); z < az1; z++) for (let x = Math.floor(ax0); x < ax1; x++) {
        if (!inT(x + 0.5, z + 0.5) || damSide(x + 0.5, z + 0.5) > -1 || pondR(x + 0.5, z + 0.5) > 1.25) continue;
        const d = LV - Y(x + 0.5, z + 0.5), patch = fbm(x * 0.12 + 50, z * 0.12), lily = fbm(x * 0.09 + 80, z * 0.09);
        if (d > -0.05 && d < 0.45 && patch > 0.42) for (let k = Math.round((patch - 0.35) * 9); k > 0; k--) {
          const px = x + rnd(), pz = z + rnd(), s = rr(0.8, 1.2);
          put(lay('reed'), px, Y(px, pz), pz, 0, rnd() * 6.28, 0, s, s * rr(0.8, 1.15), s, rgb(pick(REED)));
          if (rnd() < 0.08) { const h = rr(1.4, 1.9); put(lay('stalk'), px, Y(px, pz), pz, 0, 0, 0, 1.4, h, 1.4, rgb('#5a7a2c')); put(lay('cattail'), px, Y(px, pz) + h - 0.05, pz, 0, 0, 0, 1, 1, 1, rgb('#5a3a22')); }
        }
        if (d > -0.4 && d < 0.12 && rnd() < 0.55) { const px = x + rnd(), pz = z + rnd(); put(lay('sedge'), px, Y(px, pz), pz, 0, rnd() * 6.28, 0, ...Array(3).fill(rr(0.9, 1.5)), rgb(pick(SEDGE))); }
        if (d > 0.35 && d < 1.15 && lily > 0.55) for (let k = Math.round((lily - 0.5) * 14); k > 0; k--) {
          const px = x + rnd(), pz = z + rnd(), s = rr(0.12, 0.2);
          put(lay('pad'), px, LV + 0.012, pz, 0, rnd() * 6.28, 0, s, 1, s, rgb(pick(PAD)));
          if (rnd() < 0.06) putS(lay('lily'), px + 0.05, LV + 0.03, pz, rr(0.7, 1), rgb(rnd() < 0.85 ? '#f4f0e4' : '#f2d27a'));
        }
      }
    }
  }

  // ---------- the dam: sticks pointing downstream, logs along it, mud packed on the upstream face ----------
  const D = DAM, dl = D.left, dr = D.right;
  if (Math.hypot(cx - D.x, cz - D.z) < size + Math.max(dl, dr)) {
    const STICK = ['#8a7a62', '#6e5e4a', '#a08e70', '#5e5040', '#b5a487'], MUD = ['#4a3a28', '#3e3022', '#55432e'];
    const at = (la, al) => [D.x - D.tz * la + D.tx * al, D.z + D.tx * la + D.tz * al], flow = Math.atan2(D.tz, D.tx);
    for (let la = -dr; la <= dl; la += near ? 0.3 : 1.2) {
      const [x, z] = at(la, 0); if (!inT(x, z)) continue;
      const notch = Math.abs(la - D.notch) < 0.9;
      for (let k = 0; k < (near ? 3 : 1); k++) {
        if (notch && rnd() < 0.6) continue;
        const al = rr(-1.4, 0.6), [px, pz] = at(la + rr(-0.15, 0.15), al), dir = flow + rr(-0.7, 0.7) + (rnd() < 0.2 ? Math.PI / 2 : 0), len = rr(1, 2.6);
        put(lay('limb'), px - Math.cos(dir) * len * 0.5, Y(px, pz) + rr(-0.02, 0.1), pz - Math.sin(dir) * len * 0.5, 0, -dir, -(Math.PI / 2 - rr(-0.25, 0.3)), rr(0.3, 0.7), len, rr(0.3, 0.7), rgb(pick(STICK)));
      }
      if (near && rnd() < 0.5) { const [px, pz] = at(la, rr(-1.6, -0.6)); put(lay('mud'), px, Y(px, pz) - 0.05, pz, 0, rnd() * 6, 0, rr(0.6, 1.1), rr(0.25, 0.4), rr(0.6, 1.1), rgb(pick(MUD))); }
    }
    // a few logs lying along the crest and on the downstream face
    const { rnd: r2, rr: q2 } = createRng(7771);
    for (let k = 0; k < 9; k++) {
      const la = q2(-dr * 0.8, dl * 0.8), al = q2(-0.3, 1.3), [x, z] = at(la, al), len = q2(2.2, 4.5), dir = flow + Math.PI / 2 + q2(-0.35, 0.35), w = q2(1.6, 2.8);
      if (!inT(x, z) || Math.abs(la - D.notch) < 1.4) continue;
      put(lay('limb'), x - Math.cos(dir) * len * 0.5, Y(x, z) + 0.05, z - Math.sin(dir) * len * 0.5, 0, -dir, -(Math.PI / 2 - q2(-0.08, 0.08)), w, len, w, rgb(r2() < 0.5 ? '#7a6e5e' : '#6a5a46'));
    }
  }

  // ---------- brook banks and beds ----------
  if (near) for (const b of Object.values(BROOKS)) {
    if (b.line.farFrom(cx, cz, size)) continue;
    const L = b.line.length;
    for (let s = 0.3; s < L; s += 0.6) {
      const [x, z] = b.line.at(s); if (!inT(x, z) || inPlot(x, z, -1.5) || Math.abs(x) > HALF - 1 || Math.abs(z) > HALF - 1) continue;
      if (b.key === 'main' && inPond(x, z, 1.15)) continue;
      const ii = Math.max(0, Math.min(b.bed.length - 1, Math.round(s))), hw = b.hw[ii], riff = b.riff[ii], kap = b.kap[ii], surf = b.surfaceAt(s) - Y0;
      const [tx, tz] = b.line.dir(s), mossy = fbm(x * 0.15 + 3, z * 0.15);
      // mossy stones on the banks, more on the outer bends and where the brook is steep
      if (rnd() < 0.12 + 0.25 * riff + 0.15 * mossy) {
        const side = rnd() < 0.5 ? -1 : 1, outer = side * kap < 0 ? Math.min(1, Math.abs(kap) * hw * 6) : 0, o = side * hw * rr(1.05, 1.6 + outer * 0.4), px = x + tz * o, pz = z - tx * o, sz = rr(0.18, 0.45) * (1 + outer * 0.4);
        const gy = Y(px, pz);
        put(lay('rock'), px, gy + sz * 0.15, pz, rr(-0.2, 0.2), rnd() * 6, 0, sz * 1.25, sz * 0.6, sz, rgb(pick(['#7a766c', '#8a867c', '#6e6a62', '#9a8a6e'])));
        if (mossy > 0.4 || rnd() < 0.5) put(lay('moss'), px, gy + sz * 0.45, pz, 0, rnd() * 6, 0, sz * 4.5, sz * 1.4, sz * 4, rgb(pick(['#3f6f22', '#4a7d26', '#3a661f', '#557f2c'])));
      }
      // stones breaking the surface over riffles, with foam round them from the water's own shader
      if (riff > 0.3 && rnd() < riff * 0.6) {
        const o = rr(-0.8, 0.8) * hw, px = x + tz * o, pz = z - tx * o, sz = rr(0.12, 0.28);
        if (surf - Y(px, pz) > 0.02) put(lay('rock'), px, surf - sz * 0.45, pz, rr(-0.2, 0.2), rnd() * 6, 0, sz * 1.3, sz * 0.62, sz, rgb(pick(['#5e5a52', '#6a665c', '#555248', '#4e5a3a'])));
      }
      // pebbles: where the bed runs out shallow at the edges and on the gravel bars
      const np = Math.round((1 + 3 * riff) * rr(0.3, 1.2));
      for (let k = 0; k < np; k++) {
        const side = rnd() < 0.5 ? -1 : 1, inner = side * kap > 0 ? Math.min(1, Math.abs(kap) * hw * 6) : 0, o = side * hw * rr(0.75, 1.15 + inner * 0.6), px = x + tz * o, pz = z - tx * o, gy = Y(px, pz);
        if (surf - gy > 0.06) continue;   // hidden under the water
        const sz = rr(0.04, 0.09);
        put(lay('pebble'), px, gy + sz * 0.2, pz, 0, rnd() * 6, 0, sz * 1.3, sz * 0.6, sz, rgb(pick(['#a39a84', '#8c8270', '#b5ab94', '#7a7262', '#9a8a6e'])));
      }
    }
  }
}
