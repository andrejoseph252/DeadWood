// Tile data (world.md section 12, E3): everything one estate tile needs, as plain number arrays, so it can be
// generated off the main thread (src/estate-worker.js) and handed to the GPU with no per-item work. The rules are
// Plot 01's: its palettes, crown construction and ground-cover densities. No scene objects are created here.
//
// Output: { i, j, lod, ground: { pos, col, nrm, idx }, water: { pos, flow, wet, idx } or null, borders: [{ pos, col, idx }],
//           stakes: [[x, y, z]], layers: { key: { n, m (4x4 per instance), c (linear rgb), a (aNormal, clumps) } } }
import * as THREE from 'three';
import species from '../data/species.json' with { type: 'json' };
import { fbm, vnoise, sstep, hash } from '../core/noise.js';
import { createRng } from '../core/random.js';
import { planTile, tileFields, CONIFER, coverAt, height } from '../estate/tile-plan.js';
import { BROOKS, POND, pondW, pondR, DAM, damSide, HALF, PLOT, inPlot } from '../estate/terrain.js';
import { waterBuf, addStrip, addPool, addSection, finish } from '../world/water-data.js';
import { roadD } from '../estate/cover.js';
import { groundColor as plotGroundColor } from '../world/ground.js';
import { bankColor, waterFeatures } from './water-build.js';

export const Y0 = 390;
const yAt = (x, z) => height(x, z) - Y0;
const GROUND = {
  ancient: ['#5a4029', '#6e4f30', '#86643c'], mixedSouth: ['#5e4630', '#6a5234', '#86643c'], spruce1962: ['#4d3222', '#5e3d29', '#3f2a1c'], spruce1985: ['#4d3222', '#5a3a26', '#3f2a1c'],
  calamity: ['#6a6a34', '#7a7438', '#5a4a2e'], snags: ['#6a6436', '#5e5030', '#7a7a3a'], ravine: ['#3e4a2a', '#4a5530', '#3a3424'], coppice: ['#5e4a2e', '#6a5432', '#7a5c36'],
  crag: ['#857e66', '#6f6a58', '#5a6a36'], alderCarr: ['#3b3324', '#30291e', '#3e5428'], pond: ['#3a3020', '#30281c', '#3a3020'], meadow: ['#5f7d2c', '#7f9636', '#9aa543'],
  orchard: ['#5f7d2c', '#768f36', '#8a9a3e'], farmstead: ['#8a7a5a', '#7a8a40', '#6a7a36'], quarry: ['#a89c80', '#8f846c', '#6e7a46'], plot01: ['#5f7d2c', '#6e4f30', '#7f9636'],
};
const WOOD = new Set(['ancient', 'mixedSouth', 'spruce1962', 'spruce1985', 'ravine', 'coppice', 'alderCarr']);
const C = (h) => new THREE.Color(h);
const pal = Object.fromEntries(Object.entries(GROUND).map(([k, v]) => [k, v.map(C)]));
const GRASS = ['#5f7d2c', '#7f9636', '#9aa543'].map(C), MOSS = ['#3f6b22', '#56862a'].map(C), NEEDLE = ['#4d3222', '#5e3d29'].map(C);
const ROAD = C('#a2906c'), CHAR = C('#262019'), SEED = C('#a89a6a');
const tileSeed = (i, j, k) => ((i + 7) * 92837111 ^ (j + 3) * 689287499 ^ k * 283923481) >>> 0 || 1;

// ---------- fast colours: hex -> linear rgb, cached; per-tree tints in HSL ----------
const lin = new Map(), tc = new THREE.Color(), hsl = {};
function rgb(hex) { let v = lin.get(hex); if (!v) { tc.set(hex); v = [tc.r, tc.g, tc.b]; lin.set(hex, v); } return v; }
function tinted(hex, v, amt) { const [r, g, b] = rgb(hex); tc.setRGB(r, g, b).getHSL(hsl); tc.setHSL(hsl.h + (v - 0.5) * amt * 0.6, Math.min(1, Math.max(0, hsl.s + (v - 0.5) * amt)), Math.min(1, Math.max(0, hsl.l + (v - 0.5) * amt))); return [tc.r, tc.g, tc.b]; }

// ---------- a layer of instances written straight into arrays ----------
function layer() { return { n: 0, m: [], c: [], a: [] }; }
// T * R(XYZ euler) * S, column-major like three's Matrix4.elements
function put(L, x, y, z, rx, ry, rz, sx, sy, sz, col) {
  const a = Math.cos(rx), b = Math.sin(rx), c = Math.cos(ry), d = Math.sin(ry), e = Math.cos(rz), f = Math.sin(rz);
  const ae = a * e, af = a * f, be = b * e, bf = b * f;
  L.m.push(c * e * sx, (af + be * d) * sx, (bf - ae * d) * sx, 0, -c * f * sy, (ae - bf * d) * sy, (be + af * d) * sy, 0, d * sz, -b * c * sz, a * c * sz, 0, x, y, z, 1);
  L.c.push(col[0], col[1], col[2]); L.n++;
}
const putS = (L, x, y, z, s, col) => { L.m.push(s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, x, y, z, 1); L.c.push(col[0], col[1], col[2]); L.n++; };   // uniform scale, no rotation
const putClump = (L, x, y, z, s, col, nx, ny, nz) => { const l = Math.hypot(nx, ny, nz) || 1; putS(L, x, y, z, s, col); L.a.push(nx / l, ny / l, nz / l); };

export function buildTileData(i, j, lod, detail = 1) {
  const near = lod === 'near', plan = planTile(i, j, { near: false }), R = createRng(tileSeed(i, j, near ? 1 : 2)), { rnd, rr } = R;
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const F = near ? tileFields(i, j) : null, { x0, z0, size } = plan, cx = x0 + size / 2, cz = z0 + size / 2;
  const Y = F ? (x, z) => F.hAt(x, z) - Y0 : yAt, L = {}, lay = (k) => (L[k] ||= layer());
  const out = { i, j, lod, water: null, borders: [], stakes: [], layers: L, bespoke: plan.bespoke };

  // ---------- ground ----------
  const SEG = near ? 125 : 40, g = new THREE.PlaneGeometry(size, size, SEG, SEG); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color(), tmp = new THREE.Color();
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k), cover = F ? F.coverAt(x, z) : coverAt(x, z), P = pal[cover] || pal.ancient, n = fbm(x * 0.6, z * 0.6), n2 = vnoise(x * 2.1, z * 2.1);
    pos.setY(k, Y(x, z) - (inPlot(x, z, 0.4) ? 0.08 : 0));   // under Plot 01's own ground
    c.copy(P[0]).lerp(P[1], n).lerp(P[2], sstep(0.6, 0.9, n2) * 0.7);
    if (F && WOOD.has(cover)) {
      const sh = F.shadeAt(x, z), sp = F.spruceAt(x, z), gapT = cover.startsWith('spruce') ? 0.12 : cover === 'ancient' ? 0.22 : 0.35;   // closed stands stay brown
      c.lerp(NEEDLE[n2 > 0.5 ? 1 : 0], sstep(0.3, 0.7, sp) * 0.85);
      c.lerp(tmp.copy(GRASS[0]).lerp(GRASS[1], n), sstep(gapT + 0.2, gapT, sh + (n2 - 0.5) * 0.2) * 0.9);
      c.lerp(MOSS[n2 > 0.5 ? 1 : 0], sstep(0.6, 0.7, fbm(x * 0.35 + 11, z * 0.35)) * sh * 0.8);
    }
    bankColor(c, x, z, n2);   // wet soil, gravel bars and cut banks along the brooks
    c.lerp(ROAD, sstep(2.6, 1.6, roadD(x, z) + (n2 - 0.5) * 0.6));
    for (const [px, pz] of plan.charcoal) c.lerp(CHAR, sstep(5.2, 3.8, Math.hypot(x - px, z - pz) + (n2 - 0.5)) * 0.85);
    const pm = Math.max(Math.abs(x - PLOT.x), Math.abs(z - PLOT.z)); if (pm < 38) c.lerp(plotGroundColor(x - PLOT.x, z - PLOT.z, tmp), sstep(38, 30, pm));
    col.set([c.r, c.g, c.b], k * 3);
  }
  g.computeVertexNormals();
  out.ground = { pos: pos.array, col, nrm: g.attributes.normal.array, idx: g.index.array };
  if (Math.abs(x0) >= HALF - 0.01 || Math.abs(x0 + size) >= HALF - 0.01 || Math.abs(z0) >= HALF - 0.01 || Math.abs(z0 + size) >= HALF - 0.01) out.borders = borderSides(x0, z0, size);

  // ---------- water: brook ribbons (following the channel, depth from the ground under them), the pond as a grid
  // of still water held at the dam's level, and cross-sections where a brook runs out through the estate's cut face ----------
  out.water = buildWater(x0, z0, size, near, Y);

  // ---------- trees ----------
  // per tree, which instances are its own (trunk, branches, leaves or needles), so the page can light one tree up
  const RANGE_LAYERS = ['trunk', 'branch', 'leaves', 'needles'], ids = [], ranges = [];
  const mark = () => RANGE_LAYERS.map((k) => L[k]?.n || 0);
  for (const t of plan.trees) {
    const m0 = mark();
    (() => {
    const Rr = species.trees[t.kind]?.render, gy = Y(t.x, t.z), v = t.v ?? 0.5, tr = Math.max(0.06, t.dbh / 200), conifer = CONIFER.has(t.kind), lean = (v - 0.5) * 0.12, la = v * 40;
    const bark = Rr?.bark || '#6a5a48';
    if (t.status === 'snag') {   // beetle-killed spruce, years dead: grey, bark flaking, branch stubs
      put(lay('trunk'), t.x, gy - 0.1, t.z, Math.cos(la) * lean * 0.5, 0, Math.sin(la) * lean * 0.5, tr / 0.1, t.h * (0.7 + v * 0.25), tr / 0.1, rgb(pick(['#9a968c', '#8b877d', '#a39f94'])));
      if (near) for (let k = 0; k < 10; k++) { const y = rr(1.5, t.h * 0.8), a = rnd() * 6.28; put(lay('stub'), t.x + Math.cos(a) * tr, gy + y, t.z + Math.sin(a) * tr, 0, -a, -1.25, 1, rr(0.25, 0.7) * (1.1 - y / t.h), 1, rgb('#8b877d')); }
      return;
    }
    const dying = t.status === 'dying', leaves = dying ? (Rr?.deadNeedles || ['#a5622f', '#b8763c']) : (Rr?.leaves || Rr?.needles || ['#4a7a2e']);
    const trunkH = conifer ? t.h * 0.92 : t.h * (Rr?.trunk?.heightFrac ?? 0.55);
    put(lay('trunk'), t.x, gy - 0.12, t.z, Math.cos(la) * lean * 0.3, 0, Math.sin(la) * lean * 0.3, tr / 0.1, trunkH, tr / 0.1, tinted(bark, v, 0.06));
    if (!near) {
      if (conifer) { const w = t.r * (0.85 + v * 0.3); put(lay('cone'), t.x, gy + t.h * (0.22 + v * 0.12), t.z, 0, v * 6, 0, w, t.h * (0.62 + v * 0.16), w, tinted(pick(leaves), v, 0.08)); }
      else put(lay('blob'), t.x, gy + t.h - t.r * 0.7, t.z, 0, rnd() * 6, 0, t.r, t.r * 0.78 * (Rr?.crown?.squash ?? 0.9), t.r * (0.85 + v * 0.3), tinted(pick(leaves), v, 0.08));
      return;
    }
    const tints = leaves.map((h) => tinted(h, v, 0.07));   // this tree's own shades, computed once
    if (t.dbh > 38) put(lay('flare'), t.x, gy - 0.05, t.z, 0, 0, 0, tr * 1.9 / 0.1, 0.7, tr * 1.9 / 0.1, tinted(bark, v, 0.06));
    if (conifer) {
      const cb = t.kind === 'pine' ? 0.6 : 0.3 + v * 0.25, n = Math.max(30, Math.min(240, Math.round(7.5 * t.h * t.r)));
      for (let k = 0; k < 6 + Math.round(v * 6); k++) { const y = rr(1.2, t.h * cb), a = rnd() * 6.28; put(lay('stub'), t.x + Math.cos(a) * tr, gy + y, t.z + Math.sin(a) * tr, 0, -a, -1.35, 1, rr(0.3, 0.75), 1, rgb('#6e5a48')); }
      const NL = lay('needles');
      for (let k = 0; k < n; k++) {
        const f = rnd(); if (dying && rnd() < 0.45) return;
        const y = t.h * (cb + (1 - cb) * f), rad = (t.kind === 'pine' ? t.r * (0.6 + 0.4 * rnd()) : t.r * (1 - f) * (0.55 + 0.45 * Math.sqrt(rnd())) + 0.18), a = rnd() * 6.28, ox = lean * y * Math.cos(la), oz = lean * y * Math.sin(la);
        putClump(NL, t.x + Math.cos(a) * rad + ox, gy + y - rad * 0.25, t.z + Math.sin(a) * rad + oz, rr(0.9, 1.4) * (0.7 + (1 - f) * 0.5) * Math.min(1, t.r / 2), pick(tints), Math.cos(a), 0.55, Math.sin(a));
      }
    } else {
      const sq = Rr?.crown?.squash ?? 0.9, n = Math.max(30, Math.min(280, Math.round(13 * t.r * t.r))), cy = gy + t.h - t.r * 0.75, ox = lean * t.h * Math.cos(la), oz = lean * t.h * Math.sin(la), barkC = rgb(bark);
      for (let b = 0; b < 4; b++) { const a = b * 1.7 + t.x; put(lay('branch'), t.x, gy + trunkH * 0.85, t.z, 0, -a, -Math.atan2(1, 1.1), Math.max(0.6, tr * 6), t.r * 0.75, Math.max(0.6, tr * 6), barkC); }
      const CL = lay('leaves'), cs = (Rr?.crown?.clumpScale ?? 0.9) * Math.min(1, t.r / 2);
      for (let k = 0; k < n; k++) {
        const u = rnd() * 2 - 1, th = rnd() * 6.28, rad = Math.pow(rnd(), 0.35), sx = Math.sqrt(1 - u * u) * Math.cos(th), sz = Math.sqrt(1 - u * u) * Math.sin(th), lump = 0.82 + 0.3 * vnoise(sx * 2 + t.x, u * 2 + sz * 2);
        putClump(CL, t.x + ox + sx * t.r * rad * lump, cy + u * t.r * sq * rad * lump, t.z + oz + sz * t.r * rad * lump, rr(1.3, 2.0) * cs, pick(tints), sx, u * 1.2 + 0.25, sz);
      }
      if (Rr?.lenticels) for (let k = 0; k < 12; k++) put(lay('lenticel'), t.x, gy + rr(0.3, trunkH), t.z, 0, rnd() * 6.28, 0, tr / 0.18, rr(0.6, 1.4), tr / 0.18, rgb('#2a2724'));
      if (t.dbh > 25 && t.kind !== 'holly') for (let k = 0; k < 4; k++) { const a = rnd() * 6.28; put(lay('collar'), t.x + Math.cos(a) * tr * 1.4, gy - 0.02, t.z + Math.sin(a) * tr * 1.4, 0, 0, 0, 1.1, 0.6, 1.1, rgb(pick(['#4f8a26', '#5e9a2c', '#3f6f22']))); }
      if ((t.kind === 'beech' || t.kind === 'oak') && t.dbh > 50) for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28 + v; put(lay('root'), t.x, gy + 0.05, t.z, 0, -a, -1.42, tr * 3, rr(0.9, 1.5), tr * 3, barkC); }
      if (t.kind === 'oak' && v > 0.55 && t.dbh > 30) for (let k = 0; k < 40; k++) { const a = rr(-1.6, 1.2); putS(lay('ivy'), t.x + Math.cos(a) * (tr + 0.04), gy + rr(0.2, trunkH * 0.9), t.z + Math.sin(a) * (tr + 0.04), rr(0.18, 0.28), rgb(pick(['#24451f', '#2f5628', '#3a6630']))); }
    }
      })();
    const m1 = mark(); ids.push(t.id); ranges.push(...m0.flatMap((a, k) => [a, m1[k] - a]));
  }
  if (near) groundCover(plan, F, lay, detail, R, pick);
  out.treeIds = ids; out.treeRanges = new Int32Array(ranges); out.rangeLayers = RANGE_LAYERS;
  // the pond's snags, lodge, dam sticks, reeds and lily pads; stones and pebbles along the brooks (own random stream)
  waterFeatures({ x0, z0, size, near, Y, Y0, lay, put, putS, rgb, seed: tileSeed(i, j, 3) });
  if (plan.bespoke.length) { const cx2 = x0 + size / 2, cz2 = z0 + size / 2; for (const [dx, dz] of [[-2, -2], [2, -2], [0, 2.4]]) out.stakes.push([cx2 + dx, yAt(cx2 + dx, cz2 + dz), cz2 + dz]); }
  for (const k of Object.keys(L)) { const l = L[k]; L[k] = { n: l.n, m: new Float32Array(l.m), c: new Float32Array(l.c), a: l.a.length ? new Float32Array(l.a) : null }; }
  return out;
}

function buildWater(x0, z0, size, near, Y) {
  const B = waterBuf(), cx = x0 + size / 2, cz = z0 + size / 2, ds = near ? 0.5 : 2;
  const inT = (x, z, m) => x >= x0 - m && x <= x0 + size + m && z >= z0 - m && z <= z0 + size + m;
  const LV = POND.level;
  for (const b of Object.values(BROOKS)) {
    if (b.line.farFrom(cx, cz, size)) continue;
    const K = near ? Math.max(4, Math.ceil((b.halfWidth * 4) / 0.35)) : 3, L = b.line.length, J = b.joins && BROOKS[b.joins.key];
    let rows = [];
    const flush = () => { addStrip(B, rows); rows = []; };
    for (let s = 0; s <= L; s += ds) {
      const [x, z] = b.line.at(s);
      if (!inT(x, z, 1) || inPlot(x, z, -0.3) || Math.abs(x) > HALF || Math.abs(z) > HALF) { flush(); continue; }
      const i = Math.max(0, Math.min(b.bed.length - 1, Math.round(s))), riff = b.riff[i], pool = b.pool[i], hw = b.hw[i];
      let y = b.surfaceAt(s), rough = riff * 0.8, foamC = 0;
      if (J && L - s < 6) y += (J.surfaceAt(b.joins.s) - y) * ((s - (L - 6)) / 6);
      if (J && J.line.near(x, z, 6).d < J.halfWidth * 0.7) { flush(); continue; }   // the brook it joins carries on from here
      if (b.key === 'main' && s > DAM.s - 0.8 && s < DAM.s + 2.6) { const f = Math.min(1, Math.max(0, (s - DAM.s + 0.4) / 2.6)); y = LV + 0.005 + (b.surfaceAt(DAM.s + 2.6) - LV) * f * f * (3 - 2 * f); rough = 1; foamC = 0.4 + 0.6 * f; }
      else if (y < LV + 0.02 && pondR(x, z) < 1.4 && damSide(x, z) < 0) { flush(); continue; }   // under the pond
      const [ax, az] = b.line.dir(Math.max(0, s - 0.75)), [bx, bz] = b.line.dir(Math.min(L, s + 0.75)), tl = Math.hypot(ax + bx, az + bz) || 1, tx = (ax + bx) / tl, tz = (az + bz) / tl;
      const wR = hw * 1.55, row = [], speed = 0.35 + 0.5 * riff - 0.2 * pool;
      for (let c = 0; c <= K; c++) {
        const o = -wR + (2 * wR * c) / K, vx = x + tz * o, vz = z - tx * o, gy = Y(vx, vz) + Y0;
        row.push([vx, y - Y0, vz, s, o, speed, rough, y - gy, foamC * (1 - Math.abs(o) / wR * 0.5)]);
      }
      rows.push(row);
    }
    flush();
    // where the brook leaves the estate, its water shows in the cut face
    if (Math.abs(b.points[b.points.length - 1][0]) > HALF || Math.abs(b.points[b.points.length - 1][1]) > HALF) {
      let s0 = null; for (let s = 0; s <= L; s += 0.25) { const [x, z] = b.line.at(s); if (Math.abs(x) > HALF || Math.abs(z) > HALF) { s0 = s; break; } }
      if (s0 !== null) {
        const [x, z] = b.line.at(s0), y = b.surfaceAt(s0), onX = Math.abs(x) > HALF - 0.5, pts = [];
        const ex = onX ? Math.sign(x) * (HALF + 0.02) : null, ez = onX ? null : Math.sign(z) * (HALF + 0.02);
        if (inT(onX ? ex : x, onX ? z : ez, 0.1)) {
          for (let u = -b.halfWidth * 3; u <= b.halfWidth * 3; u += 0.25) { const px = onX ? ex : x + u, pz = onX ? z + u : ez; pts.push([px, pz, height(Math.max(-HALF, Math.min(HALF, px)), Math.max(-HALF, Math.min(HALF, pz))) - Y0]); }
          addSection(B, pts, y - Y0);
        }
      }
    }
  }
  // the pond: every point upstream of the dam and near the pond where the ground lies below the water level
  const pr = Math.max(POND.rx, POND.rz) * 1.5, [pcx, pcz] = POND.centre;
  const px0 = Math.max(x0, pcx - pr), px1 = Math.min(x0 + size, pcx + pr), pz0 = Math.max(z0, pcz - pr), pz1 = Math.min(z0 + size, pcz + pr);
  if (px1 > px0 && pz1 > pz0) addPool(B, px0, pz0, px1, pz1, near ? 1 : 2.5, LV - Y0, (x, z) => LV - (Y(x, z) + Y0), (x, z) => damSide(x, z) < 0 && pondR(x, z) < 1.45);
  return finish(B);
}

// Ground cover at Plot 01's density, cell by cell (1 m), from the cover and canopy shade there. Per m² at detail 1.
function groundCover(plan, F, lay, det, { rnd, rr }, pick) {
  const gc = new THREE.Color(), tmp = new THREE.Color();
  const nearTree = (x, z, r) => plan.trees.some((t) => Math.abs(t.x - x) < r + 0.5 && Math.abs(t.z - z) < r + 0.5 && Math.hypot(t.x - x, t.z - z) < Math.max(0.06, t.dbh / 200) + r);
  const brooks = Object.values(BROOKS).filter((b) => !b.line.farFrom(F.x0 + F.size / 2, F.z0 + F.size / 2, F.size));
  const brookD = (x, z) => { let d = Infinity; for (const b of brooks) if (!b.line.farFrom(x, z, 3)) d = Math.min(d, b.line.near(x, z).d - b.halfWidth); return d; };
  const count = (perM2) => { let n = Math.floor(perM2); if (rnd() < perM2 - n) n++; return n; };
  const CHIP = ['#a87a45', '#8a6034', '#bf9258', '#6e4a2c', '#9a6c3c', '#54392a', '#c9a76a'].map(rgb), NEEDLES = ['#6a4429', '#7d5232', '#59381f'].map(rgb), WET = ['#4a3a28', '#3d3122', '#5a4630'].map(rgb);
  const cl = (h) => rgb(h);
  const low = lay('low'), dots = lay('dot'), stalks = lay('stalk');
  for (let b = 0; b < F.CN; b++) for (let a = 0; a < F.CN; a++) {
    const cx = F.x0 + a, cz = F.z0 + b, cover = F.coverAt(cx + 0.5, cz + 0.5), sh = F.shadeAt(cx + 0.5, cz + 0.5), sp = F.spruceAt(cx + 0.5, cz + 0.5);
    if (cover === 'pond' || cover === 'plot01' || inPlot(cx + 0.5, cz + 0.5, -1)) continue;
    const wood = WOOD.has(cover), open = 1 - sh, patch = fbm(cx * 0.3 + 2, cz * 0.3), mossy = fbm(cx * 0.35 + 11, cz * 0.35), sorrel = fbm(cx * 0.5 + 21, cz * 0.5);
    const at = () => { const x = cx + rnd(), z = cz + rnd(); return [x, z, F.hAt(x, z) - Y0]; };
    const P = GROUND[cover] || GROUND.ancient, nearBrook = brooks.length && brookD(cx + 0.5, cz + 0.5) < 2.5;
    // litter
    const chips = wood ? 14 * (1 - open * 0.6) : cover === 'crag' || cover === 'quarry' ? 2 : cover === 'calamity' || cover === 'snags' ? 3 : 0;
    for (let k = count(chips * det); k > 0; k--) { const [x, z, y] = at(); if (nearBrook && brookD(x, z) < 0.2) continue;
      put(lay('chip'), x, y + 0.03, z, rr(-0.2, 0.2), rnd() * 6.28, 0, ...Array(3).fill(rr(0.7, 1.4)), sp > 0.5 || (cover.startsWith('spruce') && rnd() < 0.7) ? pick(NEEDLES) : cover === 'alderCarr' ? pick(WET) : pick(CHIP)); }
    // grass
    const openT = cover.startsWith('spruce') ? 0.85 : cover === 'ancient' ? 0.75 : 0.6;
    const grass = cover === 'meadow' || cover === 'orchard' ? 18 : cover === 'farmstead' ? 10 : cover === 'calamity' || cover === 'snags' ? 9 * (0.4 + patch) : cover === 'crag' || cover === 'quarry' ? 3 * patch : wood ? Math.max(0, open - openT) * 40 + sstep(0.72, 0.9, patch) * 1.5 * (1 - sp) : 0;
    const meadowish = cover === 'meadow' || cover === 'orchard', clearing = cover === 'calamity' || cover === 'snags';
    for (let k = count(grass * det); k > 0; k--) { const [x, z, y] = at(); if ((nearBrook && brookD(x, z) < 0.4) || roadD(x, z) < 1.6) continue;
      gc.copy(GRASS[0]).lerp(GRASS[1], fbm(x * 0.6, z * 0.6)).lerp(GRASS[2], sstep(0.55, 0.85, fbm(x * 0.2 + 7, z * 0.2)) * 0.8).offsetHSL(rr(-0.02, 0.02), 0.05, rr(0, 0.08));
      if (clearing) gc.lerp(tmp.set(P[1]), 0.35);
      if (meadowish) gc.lerp(SEED, sstep(0.55, 0.75, fbm(x * 0.08 + 40, z * 0.08)) * rr(0.2, 0.6));   // patches of flowering, seeding grass
      const s = rr(0.7, 1.35) * (meadowish ? 1.15 : wood ? 0.8 : 1);
      put(lay('grass'), x, y, z, 0, rnd() * 6.28, 0, s, s * rr(0.8, 1.3), s, [gc.r, gc.g, gc.b]); }
    if ((wood || cover === 'crag') && mossy > 0.58 && rnd() < 0.09 * det) { const [x, z, y] = at(); put(lay('moss'), x, y - 0.05, z, 0, rnd() * 6, 0, rr(0.5, 1.1), rr(0.5, 0.8), rr(0.5, 1.1), cl(pick(['#3f6f22', '#4a7d26', '#3a661f', '#557f2c']))); }
    if ((wood && sh > 0.35 && sorrel > 0.55 && !cover.startsWith('spruce19')) || (sp > 0.3 && sp < 0.6 && sorrel > 0.6)) for (let k = count(0.35 * det); k > 0; k--) { const [x, z, y] = at(); putS(lay('clover'), x, y + 0.02, z, rr(0.16, 0.24), cl(pick(['#5f9a38', '#6aa83e', '#56902f']))); }
    const fernP = cover === 'ravine' ? 0.06 : cover === 'ancient' || cover === 'mixedSouth' || cover === 'coppice' ? 0.012 * (sh > 0.4 ? 1 : 0) : cover === 'alderCarr' ? 0.04 : 0;
    if (rnd() < fernP * det) { const [x, z, y] = at(); const lady = cover === 'alderCarr' || (nearBrook && brookD(x, z) < 2.5), s = rr(0.8, 1.35);
      for (let f = 0; f < 9; f++) put(lay('fern'), x, y, z, 0, f / 9 * 6.28 + rnd() * 0.4, 0, ...Array(3).fill(s * rr(0.75, 1.1)), cl(lady ? pick(['#79b043', '#6aa23c', '#86bb4c']) : pick(['#4f8a2e', '#5b9834', '#447a28', '#62a03a']))); }
    if ((cover === 'alderCarr' && rnd() < 0.1 * det) || (wood && sh > 0.4 && rnd() < 0.006 * det)) { const [x, z, y] = at(); put(lay('sedge'), x, y, z, 0, rnd() * 6.28, 0, ...Array(3).fill(rr(0.8, 1.3)), cl(pick(['#3f6626', '#4a7330', '#56803a']))); }
    if (wood && rnd() < 0.025 * det) { const [x, z, y] = at(); put(lay('twig'), x, y + 0.03, z, 0, rnd() * 6.28, Math.PI / 2, 1, rr(0.4, 1.3), 1, cl(pick(['#4a3626', '#5c4532', '#3a2a1e']))); }
    if ((cover === 'ancient' || cover === 'ravine' || cover === 'mixedSouth') && sh > 0.5 && rnd() < 0.003) { const [x, z, y] = at(); if (!nearTree(x, z, 1)) { const w = rr(0.8, 1.4); put(lay('limb'), x, y + 0.08, z, 0, rnd() * 6.28, Math.PI / 2, w, rr(2, 4.5), w, cl(pick(['#5a4632', '#77705f', '#8a857a']))); } }
    if (sp > 0.5 && rnd() < 0.15 * det) { const [x, z, y] = at(); put(lay('pinecone'), x, y + 0.04, z, 0, rnd() * 6.28, 0, 1, 1, 1, cl(pick(['#7b4e2e', '#6a4026']))); }
    const bil = (cover === 'spruce1962' && sh < 0.8 && fbm(cx * 0.4 + 9, cz * 0.4) > 0.6) || (cover === 'crag' && fbm(cx * 0.4 + 9, cz * 0.4) > 0.5);
    if (bil && rnd() < 0.08 * det) { const [x, z, y] = at(); for (let k = 0; k < 9; k++) { const a2 = rnd() * 6.28, d = Math.sqrt(rnd()) * rr(0.4, 0.65); putClump(low, x + Math.cos(a2) * d, y + rr(0.07, 0.35), z + Math.sin(a2) * d, rr(0.42, 0.6), cl(pick(['#4c7d34', '#5a8c3a'])), Math.cos(a2), 0.8, Math.sin(a2)); if (rnd() < 0.2) putS(dots, x + Math.cos(a2) * d, y + 0.32, z + Math.sin(a2) * d, 0.07, cl('#8aa04a')); } }
    if (clearing && fbm(cx * 0.3 + 5, cz * 0.3) > 0.5 && rnd() < 0.05 * det) { const [x, z, y] = at(); if (!nearTree(x, z, 0.6)) { const R2 = rr(0.6, 1.1), H = rr(0.6, 1); for (let k = 0; k < 14; k++) { const a2 = rnd() * 6.28, d = Math.sqrt(rnd()) * R2, px = x + Math.cos(a2) * d, py = y + H * rr(0.3, 1), pz = z + Math.sin(a2) * d; putClump(low, px, py, pz, rr(0.42, 0.65), cl(pick(['#3f6a2a', '#365e25', '#4a7a30'])), Math.cos(a2), 0.8, Math.sin(a2)); if (rnd() < 0.5) putS(dots, px, py + 0.08, pz, 0.1, cl(pick(['#f2e8ee', '#f4dce4', '#7a9a3a']))); } } }
    if (clearing && fbm(cx * 0.4 + 31, cz * 0.4) > 0.5 && rnd() < 0.06 * det) { const [x, z, y] = at(); const h = rr(1.2, 1.7); put(stalks, x, y, z, 0, 0, 0, 2, h, 2, cl('#4f7d2c')); for (let k = 5; k < 10; k++) putS(dots, x + Math.cos(k * 2.1) * 0.04, y + h * (0.45 + k * 0.055), z + Math.sin(k * 2.1) * 0.04, 0.08, cl(k % 2 ? '#7a4a5a' : '#8a5a6a')); }
    if (clearing && rnd() < 0.006) { const [x, z, y] = at(); if (!nearTree(x, z, 0.5)) put(lay('stump'), x, y, z, 0, 0, 0, 1, rr(0.25, 0.45), 1, cl(pick(['#8f8270', '#9c8c74', '#7a6a58']))); }
    if (clearing && rnd() < 0.0015) { const [x, z, y] = at(); if (!nearTree(x, z, 1)) put(lay('limb'), x, y + 0.2, z, 0, rnd() * 6.28, Math.PI / 2, 2.2, rr(3, 6), 2.2, cl(pick(['#8a857a', '#9a958a', '#6a4430']))); }
    if (meadowish) for (let k = count((fbm(cx * 0.12 + 33, cz * 0.12) > 0.45 ? 1.1 : 0.25) * det); k > 0; k--) { const [x, z, y] = at(), kk = rnd(), h = rr(0.7, 0.95); put(stalks, x, y, z, 0, 0, 0, 1, h, 1, cl('#5a7a2c')); putS(dots, x, y + h, z, kk < 0.45 ? 0.32 : kk < 0.75 ? 0.22 : 0.14, cl(kk < 0.45 ? '#f0ece0' : kk < 0.75 ? '#9a5aa8' : '#3a3020')); }
    if (cover === 'meadow' && rnd() < 0.002) { const [x, z, y] = at(); put(lay('molehill'), x, y - 0.05, z, 0, rnd() * 6, 0, rr(1.4, 1.9), rr(0.7, 1), rr(1.4, 1.9), cl(pick(['#5a4030', '#4e3828']))); }
    if ((cover === 'crag' || cover === 'quarry' || cover === 'ravine') && rnd() < (cover === 'ravine' ? 0.01 : 0.035)) { const [x, z, y] = at(); if (!nearTree(x, z, 0.6)) { const s = rr(0.3, 0.9); put(lay('rock'), x, y + s * 0.1, z, 0, rnd() * 6, 0, s * 1.2, s * 0.6, s, cl(rnd() < 0.4 ? pick(['#4e7a2a', '#5d8a2f']) : pick(['#8a867c', '#9b968a', '#a89878', '#9a8a6e']))); } }
  }
}

// the cut soil faces where the estate ends
function borderSides(x0, z0, size) {
  const BASE = -40, strata = [[0.2, C('#2a1d14')], [0.7, C('#4a3324')], [1.5, C('#6b4b33')], [2.6, C('#7d6448')], [999, C('#6e6a60')]], out = [];
  const x1 = x0 + size, z1 = z0 + size, edges = [];
  if (z0 <= -HALF + 0.01) edges.push([[x0, z0], [x1, z0]]); if (x1 >= HALF - 0.01) edges.push([[x1, z0], [x1, z1]]);
  if (z1 >= HALF - 0.01) edges.push([[x1, z1], [x0, z1]]); if (x0 <= -HALF + 0.01) edges.push([[x0, z1], [x0, z0]]);
  for (const [[ax, az], [bx, bz]] of edges) {
    const N = 60, ROWS = 12, P = [], CL = [], I = [];
    for (let i = 0; i <= N; i++) { const t = i / N, x = ax + (bx - ax) * t, z = az + (bz - az) * t, top = yAt(x, z);
      for (let j = 0; j <= ROWS; j++) { const f = j / ROWS, y = top + (BASE - top) * f * f, d = top - y + (vnoise(t * 30, j) - 0.5) * 0.3, cc = strata.find((s) => d < s[0])[1].clone().multiplyScalar(0.9 + hash(i, j) * 0.15); P.push(x, y, z); CL.push(cc.r, cc.g, cc.b);
        if (i < N && j < ROWS) { const a = i * (ROWS + 1) + j, b = a + ROWS + 1; I.push(a, b, a + 1, b, b + 1, a + 1); } } }
    out.push({ pos: new Float32Array(P), col: new Float32Array(CL), idx: new Uint32Array(I) });
  }
  return out;
}

// all the typed arrays in a tile's data, for transferring from a worker without copying
export function transferables(d) {
  // (treeIds is a plain array and is copied; treeRanges is transferred)
  const t = [d.ground.pos.buffer, d.ground.col.buffer, d.ground.nrm.buffer, d.ground.idx.buffer];
  if (d.water) t.push(d.water.pos.buffer, d.water.flow.buffer, d.water.wet.buffer, d.water.idx.buffer);
  for (const b of d.borders) t.push(b.pos.buffer, b.col.buffer, b.idx.buffer);
  for (const l of Object.values(d.layers)) { t.push(l.m.buffer, l.c.buffer); if (l.a) t.push(l.a.buffer); }
  if (d.treeRanges) t.push(d.treeRanges.buffer);
  return t;
}
