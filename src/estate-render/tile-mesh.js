// Turn tile data (tile-build.js) into meshes: the arrays become GPU buffers directly. Geometry and materials are
// created once and shared by every tile; only per-tile buffers are created and freed. Far tiles cast no shadows.
import * as THREE from 'three';
import { C, toon, tm } from '../render/materials.js';
import { windify } from '../render/wind.js';
import { waterMaterial, waterGeometry } from '../render/water.js';
import { createRng } from '../core/random.js';
import { cutaway } from '../render/cutaway.js';

const stick = (r0, r1, sides) => new THREE.CylinderGeometry(r1, r0, 1, sides).translate(0, 0.5, 0);
const half = (r) => new THREE.SphereGeometry(r, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2);
function tuftGeo(blades, w, hMin, hMax, out, seed) { const g = new THREE.BufferGeometry(), P = [], CL = [], NR = [], { rr } = createRng(seed);
  for (let b = 0; b < blades; b++) { const a = b / blades * Math.PI * 2, h = rr(hMin, hMax), o = out ? rr(out * 0.6, out) : 0, dx = Math.cos(a) * w, dz = Math.sin(a) * w, lean = out ? 0 : rr(-0.12, 0.12);
    P.push(-dz, 0, dx, dz, 0, -dx, o ? Math.cos(a) * o : lean, h, o ? Math.sin(a) * o : lean * 0.5); CL.push(0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 1.15, 1.15, 1.15); NR.push(0, 1, 0, 0, 1, 0, 0, 1, 0); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(NR, 3)); return g; }
const FROND = (() => { const g = new THREE.BufferGeometry(), P = [], N = [], I = [], S = 8;
  for (let k = 0; k <= S; k++) { const t = k / S, w = Math.sin(Math.PI * Math.min(1, t * 1.1)) * 0.16 * (1 - t * 0.4), y = Math.sin(t * 1.9) * 0.55; P.push(t, y, -w, t, y + 0.02, w); N.push(0, 1, 0, 0, 1, 0); if (k < S) { const b = k * 2; I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(I); return g; })();

// layer key -> { geo, mat (or factory), cast, kind: 'mesh' | 'clump' | 'sprite', crown }
let KIT = null;
function kit(tex) {
  if (KIT) return KIT;
  const plain = toon();
  const grassM = toon({ vertexColors: true, side: THREE.DoubleSide }); windify(grassM, { strength: 0.18, grass: true });
  const clumpMat = (map) => { const m = toon({ map, alphaTest: 0.5, side: THREE.DoubleSide }); windify(m, { billboard: true, strength: 0.05 }); const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5, side: THREE.DoubleSide }); windify(d, { billboard: true, strength: 0.05 }); return { m, d }; };
  const spriteMat = (map) => { const m = toon({ map, alphaTest: 0.5, side: THREE.DoubleSide }); windify(m, { billboard: true, strength: 0.04 }); return m; };
  // crowns dissolve in the cutaway (render/cutaway.js); low shrubs and saplings keep their own, uncut material
  const leaf = clumpMat(tex.leaf), needle = clumpMat(tex.needle), lowLeaf = clumpMat(tex.leaf), crownPlain = cutaway(toon());
  cutaway(leaf.m); cutaway(needle.m);
  const ringM = cutaway(new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4d6') }), 'ring');
  const ringG = new THREE.RingGeometry(0.93, 1, 40).rotateX(-Math.PI / 2);
  const quad = new THREE.PlaneGeometry(1, 1), spr = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const w = (strength, grass) => { const m = toon({ side: THREE.DoubleSide }); windify(m, { strength, grass }); return m; };
  const stalkM = toon(); windify(stalkM, { strength: 0.05, grass: true });
  const sedgeM = toon({ vertexColors: true, side: THREE.DoubleSide }); windify(sedgeM, { strength: 0.12, grass: true });
  KIT = {
    trunk: { geo: stick(0.1, 0.065, 8), mat: plain, cast: true }, flare: { geo: new THREE.ConeGeometry(0.1, 1, 8).translate(0, 0.5, 0), mat: plain, cast: true },
    branch: { geo: stick(0.11, 0.05, 5), mat: plain, cast: true }, stub: { geo: stick(0.03, 0.012, 4), mat: plain, cast: true }, root: { geo: stick(0.12, 0.03, 5), mat: plain, cast: true },
    lenticel: { geo: new THREE.BoxGeometry(0.21, 0.04, 0.21), mat: plain }, collar: { geo: half(0.2), mat: plain },
    blob: { geo: new THREE.IcosahedronGeometry(1, 1), mat: crownPlain, cast: true, crown: true }, cone: { geo: new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0), mat: crownPlain, cast: true, crown: true },
    ring: { geo: ringG, mat: ringM, crown: true },
    leaves: { geo: quad, mat: leaf.m, depth: leaf.d, cast: true, kind: 'clump', crown: true }, needles: { geo: quad, mat: needle.m, depth: needle.d, cast: true, kind: 'clump', crown: true },
    low: { geo: quad, mat: lowLeaf.m, depth: lowLeaf.d, cast: true, kind: 'clump' },
    ivy: { geo: spr, mat: spriteMat(tex.clover), kind: 'sprite' }, clover: { geo: spr, mat: spriteMat(tex.clover), kind: 'sprite' }, dot: { geo: spr, mat: spriteMat(tex.dot), kind: 'sprite' },
    chip: { geo: new THREE.PlaneGeometry(0.15, 0.1).rotateX(-Math.PI / 2), mat: plain }, grass: { geo: tuftGeo(3, 0.06, 0.35, 0.6, 0, 3), mat: grassM },
    sedge: { geo: tuftGeo(7, 0.04, 0.4, 0.6, 0.35, 5), mat: sedgeM }, fern: { geo: FROND, mat: w(0.06), cast: true },
    moss: { geo: half(0.2), mat: plain }, molehill: { geo: half(0.16), mat: plain, cast: true },
    twig: { geo: new THREE.CylinderGeometry(0.015, 0.02, 1, 4).translate(0, 0.5, 0), mat: plain, cast: true }, limb: { geo: new THREE.CylinderGeometry(0.07, 0.1, 1, 6).translate(0, 0.5, 0), mat: plain, cast: true },
    rock: { geo: new THREE.IcosahedronGeometry(1, 0), mat: plain, cast: true }, stump: { geo: new THREE.CylinderGeometry(0.18, 0.22, 1, 8).translate(0, 0.5, 0), mat: plain, cast: true },
    pinecone: { geo: new THREE.CapsuleGeometry(0.035, 0.07, 2, 5).rotateZ(Math.PI / 2), mat: plain }, stalk: { geo: new THREE.CylinderGeometry(0.012, 0.016, 1, 4).translate(0, 0.5, 0), mat: stalkM },
    // water margins (src/estate-render/water-build.js): lodge and dam mud, reeds and reedmace, lily pads and flowers, pebbles
    mound: { geo: new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat: plain, cast: true }, mud: { geo: new THREE.SphereGeometry(1, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), mat: plain },
    reed: { geo: tuftGeo(6, 0.025, 1.3, 2.0, 0.22, 9), mat: sedgeM }, cattail: { geo: new THREE.CapsuleGeometry(0.035, 0.2, 2, 5), mat: plain },
    pad: { geo: new THREE.CircleGeometry(1, 9, 0.35, Math.PI * 2 - 0.7).rotateX(-Math.PI / 2), mat: plain }, lily: { geo: new THREE.IcosahedronGeometry(0.06, 0).scale(1, 0.6, 1), mat: plain },
    pebble: { geo: new THREE.IcosahedronGeometry(1, 0), mat: plain },
    _ground: toon({ vertexColors: true }),
    _border: toon({ vertexColors: true, side: THREE.DoubleSide }), _stake: tm('#b88d58'), _flag: toon({ color: C('#ff6a1a'), side: THREE.DoubleSide }), _stakeG: new THREE.BoxGeometry(0.08, 1.2, 0.08).translate(0, 0.6, 0), _flagG: new THREE.PlaneGeometry(0.45, 0.2),
  };
  return KIT;
}

// data -> { group, crowns, dispose }; shared: { tex, canopy }
export function tileMeshes(d, shared) {
  const K = kit(shared.tex), group = new THREE.Group(), crowns = [], own = [], far = d.lod === 'far';
  const geo = (attrs, idx) => { const g = new THREE.BufferGeometry(); for (const [k, [a, n]] of Object.entries(attrs)) g.setAttribute(k, new THREE.BufferAttribute(a, n)); if (idx) g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeBoundingSphere(); own.push(g); return g; };
  const ground = new THREE.Mesh(geo({ position: [d.ground.pos, 3], color: [d.ground.col, 3], normal: [d.ground.nrm, 3] }, d.ground.idx), K._ground); ground.receiveShadow = true; group.add(ground);
  for (const b of d.borders) { const g = geo({ position: [b.pos, 3], color: [b.col, 3] }, b.idx); g.computeVertexNormals(); group.add(new THREE.Mesh(g, K._border)); }
  if (d.water) { const g = waterGeometry(d.water); own.push(g); const w = new THREE.Mesh(g, waterMaterial()); w.receiveShadow = true; group.add(w); }
  for (const [x, y, z] of d.stakes) { const s = new THREE.Mesh(K._stakeG, K._stake); s.position.set(x, y, z); s.castShadow = true; group.add(s); const f = new THREE.Mesh(K._flagG, K._flag); f.position.set(x + 0.24, y + 1.08, z); group.add(f); }
  for (const [key, L] of Object.entries(d.layers)) {
    const k = K[key]; if (!k || !L.n) continue;
    let g = k.geo;
    if (k.kind === 'clump' || k.kind === 'sprite') {   // per-instance light normal for billboards: a small per-tile geometry sharing the base buffers
      g = new THREE.BufferGeometry(); for (const [name, attr] of Object.entries(k.geo.attributes)) g.setAttribute(name, attr); g.setIndex(k.geo.index);
      const a = L.a || new Float32Array(L.n * 3).map((_, q) => (q % 3 === 1 ? 1 : 0));
      g.setAttribute('aNormal', new THREE.InstancedBufferAttribute(a, 3)); own.push(g);
    }
    const im = new THREE.InstancedMesh(g, k.mat, L.n);
    im.instanceMatrix = new THREE.InstancedBufferAttribute(L.m, 16); im.instanceColor = new THREE.InstancedBufferAttribute(L.c, 3);
    if (k.depth) im.customDepthMaterial = k.depth;
    im.computeBoundingSphere(); im.boundingSphere.radius += k.kind === 'clump' ? 2 : 0.5;
    im.castShadow = !!k.cast && !far; im.receiveShadow = true; group.add(im);
    if (k.crown) { im.visible = shared.canopy; crowns.push(im); }
  }
  return { group, crowns, dispose() { group.traverse((o) => { if (o.isInstancedMesh) o.dispose(); }); own.forEach((g) => g.dispose()); } };
}
