// Plot 01 — a 28 m square of mixed forest around a sunlit gap, rendered as pixel art from a real 3D scene.
// Low-resolution render, banded light, crisp shadows, depth outlines, wind. 1 unit = 1 m.
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
const LITE = params.has('lite') || matchMedia('(pointer: coarse)').matches;

// ---------- seeded random + noise ----------
let seed = 9;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rr = (a, b) => a + (b - a) * rnd();
const pick = (a) => a[Math.floor(rnd() * a.length)];
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const sm = (t) => t * t * (3 - 2 * t);
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), v = sm(y - yi);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.03, y * 2.03) * 0.28 + vnoise(x * 4.1, y * 4.1) * 0.17;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const C = (h) => new THREE.Color(h);

// ---------- the plot ----------
const HALF = 14;                      // the square runs from -14 to 14 m
const inside = (x, z, m = 0.3) => Math.abs(x) < HALF - m && Math.abs(z) < HALF - m;
const sample = (m = 0.3) => [rr(-HALF + m, HALF - m), rr(-HALF + m, HALF - m)];
const TREES = [
  { kind: 'beech', x: -9, z: -8.5, h: 10.5, r: 4.6 },
  { kind: 'beech', x: 9.5, z: -9.5, h: 9.5, r: 4.2 },
  { kind: 'oak', x: -9.5, z: 8.5, h: 9, r: 4.6, ivy: true },
  { kind: 'spruce', x: 11.6, z: -3.2, h: 12, r: 2.7 },
  { kind: 'spruce', x: -6.2, z: -11.6, h: 11, r: 2.5 },
  { kind: 'spruce', x: -12, z: -0.5, h: 11.5, r: 2.6, dead: true },
  { kind: 'birch', x: -2.5, z: -11.4, h: 9, r: 2.2 },
  { kind: 'birch', x: 11.2, z: 9.6, h: 8.5, r: 2.0 },
  { kind: 'snag', x: 6.2, z: -4.8, h: 7, r: 0 },
];
const GAP = { x: 0.5, z: 1, r: 7.2 };
const PUDDLE = { x: 5.2, z: 5.0, r: 1.5 };
const pathZ = (x) => 1.2 + 2.6 * Math.sin(x / 5.5) - x * 0.3;
const pathW = (x, z) => sstep(0.75, 0.3, Math.abs(z - pathZ(x)) + (vnoise(x * 0.9, z * 0.9) - 0.5) * 0.5);
const SPOTS = { deer: [-1.6, pathZ(-1.6) + 0.5], fox: [-1.2, 11.2], boar: [6.4, 10.2], hare: [3.6, pathZ(3.6) + 0.15] };
const CLEAR = [[SPOTS.deer[0], SPOTS.deer[1], 1.8], [SPOTS.hare[0], SPOTS.hare[1], 0.9], [SPOTS.fox[0], SPOTS.fox[1], 1.1], [SPOTS.boar[0], SPOTS.boar[1], 2.4]];
const clearW = (x, z) => CLEAR.reduce((m, [cx, cz, r]) => m * sstep(r * 0.5, r, Math.hypot(x - cx, z - cz)), 1);
const rootedW = (x, z) => sstep(2.6, 1.2, Math.hypot(x - SPOTS.boar[0], (z - SPOTS.boar[1]) * 1.2) + (vnoise(x * 1.5, z * 1.5) - 0.5) * 1.2);
const gapW = (x, z) => sstep(GAP.r + 1.5, GAP.r - 3.5, Math.hypot((x - GAP.x) * 0.95, (z - GAP.z) * 1.05) + (fbm(x * 0.3 + 3, z * 0.3) - 0.5) * 4.5);
const puddleD = (x, z) => Math.hypot(x - PUDDLE.x, (z - PUDDLE.z) * 1.3) / PUDDLE.r + (vnoise(x * 2, z * 2) - 0.5) * 0.25;
function canopyShade(x, z) {
  let s = 0;
  for (const t of TREES) if (t.r) s = Math.max(s, sstep(t.r * 1.45, t.r * 0.4, Math.hypot(x - t.x, z - t.z)));
  return s;
}
function nearKind(x, z, kind, f = 2.2) {
  let s = 0;
  for (const t of TREES) if (t.kind === kind) s = Math.max(s, sstep(t.r * f, t.r * 0.6, Math.hypot(x - t.x, z - t.z)));
  return s;
}
function height(x, z) {
  let h = (fbm(x * 0.09 + 4, z * 0.09) - 0.5) * 1.4 + (vnoise(x * 0.4, z * 0.4) - 0.5) * 0.28;
  h -= pathW(x, z) * 0.1;
  h -= sstep(1.1, 0.2, puddleD(x, z)) * 0.32;
  return h;
}
const WATER_Y = height(PUDDLE.x + PUDDLE.r * 1.05, PUDDLE.z) - 0.06;

// ---------- renderer & low-res target ----------
const container = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);
const scene = new THREE.Scene();

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 300);
camera.position.setFromSphericalCoords(90, THREE.MathUtils.degToRad(52), THREE.MathUtils.degToRad(35));
// map-style camera: drag to pan across the ground, right-drag (or two fingers) to rotate and tilt, scroll zooms toward the cursor
const controls = new MapControls(camera, renderer.domElement);
controls.target.set(0, 0.5, 0);
controls.enableDamping = true; controls.dampingFactor = 0.1;
controls.screenSpacePanning = false; controls.zoomToCursor = true; controls.zoomSpeed = 1.2;
controls.minPolarAngle = THREE.MathUtils.degToRad(15); controls.maxPolarAngle = THREE.MathUtils.degToRad(72);
controls.minZoom = 0.7; controls.maxZoom = 6;

const rt = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type: THREE.HalfFloatType });
rt.depthTexture = new THREE.DepthTexture(2, 2); rt.depthTexture.type = THREE.UnsignedIntType;

// ---------- lights ----------
const SUN_DIR = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(40), THREE.MathUtils.degToRad(300));
const sun = new THREE.DirectionalLight(C('#ffe2b0'), 2.9);
sun.position.copy(SUN_DIR).multiplyScalar(60);
sun.castShadow = true; sun.shadow.mapSize.set(LITE ? 2048 : 4096, LITE ? 2048 : 4096);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 140 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(C('#a6c8ea'), C('#5e4e30'), 1.45));
const gradTex = (() => {
  const d = new Uint8Array([100, 100, 100, 255, 165, 165, 165, 255, 220, 220, 220, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const toon = (o = {}) => new THREE.MeshToonMaterial({ gradientMap: gradTex, ...o });
const matCache = {};
const tm = (hex) => matCache[hex] || (matCache[hex] = toon({ color: C(hex) }));

// ---------- wind ----------
const uTime = { value: 0 };
function windify(mat, { billboard = false, strength = 0.12, grass = false } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'uniform float uTime;\n' + (billboard ? 'attribute vec3 aNormal;\n' : '') + sh.vertexShader;
    if (billboard && sh.vertexShader.includes('#include <beginnormal_vertex>')) sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>', 'vec3 objectNormal = normalize(aNormal);');
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      ${billboard ? `vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 camU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        transformed = camR * position.x + camU * position.y;` : ''}
      #ifdef USE_INSTANCING
        vec3 ipos = instanceMatrix[3].xyz;
      #else
        vec3 ipos = vec3(0.0);
      #endif
      float ph = ipos.x * 0.37 + ipos.z * 0.23;
      float wave = sin(dot(ipos.xz, vec2(0.8, 0.6)) * 0.32 - uTime * 1.3) + 0.5 * sin(dot(ipos.xz, vec2(-0.3, 0.95)) * 0.21 - uTime * 0.7);
      float gust = 0.3 + 0.7 * smoothstep(-0.4, 1.2, wave);
      float sway = ${grass ? 'max(position.y, 0.0)' : '1.0'} * ${strength.toFixed(3)} * gust;
      transformed.x += sway * sin(uTime * 1.7 + ph);
      transformed.z += sway * 0.6 * cos(uTime * 1.3 + ph);`);
  };
}

// ---------- textures ----------
function canvasTex(size, draw) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t;
}
const leafTex = canvasTex(32, (g, s) => {
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * s * 0.36;
    const x = s / 2 + Math.cos(a) * d, y = s / 2 + Math.sin(a) * d;
    const v = 150 + Math.round(((s - x) + (s - y)) / (2 * s) * 105 + rr(-20, 20));
    g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.ellipse(x, y, rr(2.2, 3.6), rr(1.4, 2.4), rnd() * 3, 0, Math.PI * 2); g.fill();
  }
});
const needleTex = canvasTex(32, (g, s) => {
  for (let i = 0; i < 40; i++) {
    const x = rr(4, s - 4), y = rr(6, s * 0.7); const v = 140 + Math.round((1 - y / s) * 115);
    g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rr(-2, 2), y + rr(4, 9)); g.stroke();
  }
  g.fillStyle = 'rgb(230,230,230)'; g.fillRect(3, s * 0.22, s - 6, 3);
});
const dotTex = canvasTex(16, (g, s) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(s / 2, s / 2, s * 0.32, 0, Math.PI * 2); g.fill(); });
const umbelTex = canvasTex(16, (g, s) => { g.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(s / 2 + rr(-5, 5), s / 2 + rr(-3, 3), 1.6, 0, 7); g.fill(); } });
const cloverTex = canvasTex(16, (g, s) => { g.fillStyle = '#fff'; for (const [x, y] of [[8, 5], [5, 10], [11, 10]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); } });

// ---------- ground ----------
const SEG = 196;
const gGeo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, SEG, SEG); gGeo.rotateX(-Math.PI / 2);
const gPos = gGeo.attributes.position, gCol = new Float32Array(gPos.count * 3);
const PAL = {
  grass: [C('#5f7d2c'), C('#7f9636'), C('#9aa543')],
  litter: [C('#5a4029'), C('#6e4f30'), C('#86643c')],
  needle: [C('#4d3222'), C('#5e3d29')],
  path: [C('#8a7454'), C('#a28b66')],
  moss: [C('#3f6b22'), C('#56862a')],
  mud: C('#3e3022'),
};
function groundColor(x, z, out) {
  const gap = gapW(x, z), pw = pathW(x, z), n = fbm(x * 0.6, z * 0.6), n2 = vnoise(x * 2.1, z * 2.1);
  out.copy(PAL.litter[0]).lerp(PAL.litter[1], n).lerp(PAL.litter[2], sstep(0.6, 0.9, n2) * 0.7);
  out.lerp(PAL.needle[n2 > 0.5 ? 1 : 0], sstep(0.3, 0.7, nearKind(x, z, 'spruce')) * 0.85);
  const g = new THREE.Color().copy(PAL.grass[0]).lerp(PAL.grass[1], n).lerp(PAL.grass[2], sstep(0.55, 0.85, fbm(x * 0.2 + 7, z * 0.2)) * 0.8);
  out.lerp(g, sstep(0.35, 0.6, gap + (n2 - 0.5) * 0.3));
  out.lerp(PAL.moss[n2 > 0.5 ? 1 : 0], sstep(0.6, 0.7, fbm(x * 0.35 + 11, z * 0.35)) * (1 - gap) * 0.9);
  out.lerp(PAL.path[n2 > 0.55 ? 1 : 0], pw);
  out.lerp(PAL.mud, sstep(1.35, 1.0, puddleD(x, z)));
  out.lerp(n2 > 0.5 ? C('#3b2a1c') : C('#4e3825'), rootedW(x, z) * 0.9);   // ground turned over by wild boar
  return out;
}
const gc = new THREE.Color();
for (let i = 0; i < gPos.count; i++) {
  const x = gPos.getX(i), z = gPos.getZ(i);
  gPos.setY(i, height(x, z)); groundColor(x, z, gc); gCol.set([gc.r, gc.g, gc.b], i * 3);
}
gGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3)); gGeo.computeVertexNormals();
const ground = new THREE.Mesh(gGeo, toon({ vertexColors: true })); ground.receiveShadow = true; scene.add(ground);

// the cut sides of the plot: soil horizons, roots and stones
{
  const BASE = -3.2, N = 120, ROWS = 14;
  const strata = [[0.18, C('#2a1d14')], [0.6, C('#4a3324')], [1.3, C('#6b4b33')], [2.2, C('#7d6448')], [9, C('#6e6a60')]];
  const sides = [[[-HALF, -HALF], [HALF, -HALF]], [[HALF, -HALF], [HALF, HALF]], [[HALF, HALF], [-HALF, HALF]], [[-HALF, HALF], [-HALF, -HALF]]];
  for (const [[x0, z0], [x1, z1]] of sides) {
    const P = [], CL = [], I = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, top = height(x, z);
      for (let j = 0; j <= ROWS; j++) {
        const y = top + (BASE - top) * (j / ROWS);
        const d = top - y + (vnoise(t * 30, j * 0.7) - 0.5) * 0.35;
        const c = strata.find((s) => d < s[0])[1].clone().multiplyScalar(0.9 + hash(i, j) * 0.18);
        P.push(x, y, z); CL.push(c.r, c.g, c.b);
        if (i < N && j < ROWS) { const a = i * (ROWS + 1) + j, b = a + ROWS + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3)); g.setIndex(I); g.computeVertexNormals();
    const m = new THREE.Mesh(g, toon({ vertexColors: true, side: THREE.DoubleSide })); m.receiveShadow = true; scene.add(m);
    for (let k = 0; k < 14; k++) {  // roots and stones in the cut face
      const t = rnd(), x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = height(x, z) - rr(0.2, 2.4);
      const out = new THREE.Vector3(z1 - z0, 0, -(x1 - x0)).normalize();
      if (rnd() < 0.55) {
        const len = rr(0.4, 1.1);
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, len, 4), tm('#5a4030'));
        r.position.set(x + out.x * 0.05, y, z + out.z * 0.05); r.rotation.set(rr(-1, 1), 0, rr(-1, 1)); scene.add(r);
      } else {
        const st = new THREE.Mesh(new THREE.IcosahedronGeometry(rr(0.12, 0.28), 0), tm(pick(['#8a867c', '#76726a', '#9b968a'])));
        st.position.set(x, y, z); scene.add(st);
      }
    }
  }
}

// puddle with sky reflections
{
  const water = new THREE.Mesh(new THREE.CircleGeometry(PUDDLE.r * 1.15, 24), new THREE.MeshBasicMaterial({ color: C('#3d6676') }));
  water.rotation.x = -Math.PI / 2; water.scale.y = 1 / 1.3; water.position.set(PUDDLE.x, WATER_Y, PUDDLE.z); water.receiveShadow = false; scene.add(water);
  const glint = new THREE.MeshBasicMaterial({ color: C('#a9d4dc') });
  for (let i = 0; i < 6; i++) { const g = new THREE.Mesh(new THREE.PlaneGeometry(rr(0.2, 0.5), 0.05), glint); g.rotation.x = -Math.PI / 2; g.position.set(PUDDLE.x + rr(-0.7, 0.7), WATER_Y + 0.01, PUDDLE.z + rr(-0.5, 0.5)); scene.add(g); }
}

// ---------- instancing helpers ----------
const dummy = new THREE.Object3D(), tcol = new THREE.Color();
function instances(geo, mat, list, { cast = false, wind } = {}) {
  if (wind) windify(mat, wind);
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  list.forEach((it, i) => {
    dummy.position.set(it.x, it.y, it.z); dummy.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
    if (it.sx) dummy.scale.set(it.sx, it.sy, it.sz); else dummy.scale.setScalar(it.s || 1);
    dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, tcol.set(it.c || '#ffffff'));
  });
  im.castShadow = cast; im.receiveShadow = true; scene.add(im); return im;
}
function sprites(tex, list) {  // camera-facing little things: flowers, berries, umbels
  const q = new THREE.PlaneGeometry(1, 1); q.translate(0, 0.5, 0);
  const aN = new Float32Array(list.length * 3); for (let i = 0; i < list.length; i++) aN.set([0, 1, 0], i * 3);
  q.setAttribute('aNormal', new THREE.InstancedBufferAttribute(aN, 3));
  return instances(q, toon({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }), list, { wind: { billboard: true, strength: 0.04 } });
}

// ground chips: leaves, needles, pebbles; small cones under the spruces
{
  const chip = new THREE.PlaneGeometry(0.15, 0.1); chip.rotateX(-Math.PI / 2);
  const list = [];
  for (let i = 0; i < (LITE ? 7000 : 13000); i++) {
    const [x, z] = sample(); if (gapW(x, z) > 0.6 && rnd() < 0.85) continue; if (puddleD(x, z) < 1) continue;
    const pw = pathW(x, z), sp = nearKind(x, z, 'spruce');
    const c = pw > 0.5 ? pick(['#9d9384', '#b8ad9c', '#7d7468']) : sp > 0.5 ? pick(['#6a4429', '#7d5232', '#59381f']) : pick(['#a87a45', '#8a6034', '#bf9258', '#6e4a2c', '#9a6c3c', '#54392a', '#c9a76a']);
    list.push({ x, y: height(x, z) + 0.03, z, ry: rnd() * 6.28, rx: rr(-0.2, 0.2), s: rr(0.7, 1.4), c });
  }
  instances(chip, toon(), list);
  const cone = new THREE.CapsuleGeometry(0.035, 0.07, 2, 5); cone.rotateZ(Math.PI / 2);
  const cones = [];
  for (let i = 0; i < 400 && cones.length < 90; i++) { const [x, z] = sample(); if (nearKind(x, z, 'spruce') < 0.5) continue; cones.push({ x, y: height(x, z) + 0.04, z, ry: rnd() * 6.28, c: pick(['#7b4e2e', '#6a4026']) }); }
  instances(cone, toon(), cones);
  const twig = new THREE.CylinderGeometry(0.015, 0.02, 1, 4); twig.rotateZ(Math.PI / 2);
  const twigs = [];
  for (let i = 0; i < 260 && twigs.length < 70; i++) { const [x, z] = sample(); if (gapW(x, z) > 0.5 || pathW(x, z) > 0.3) continue; twigs.push({ x, y: height(x, z) + 0.03, z, ry: rnd() * 6.28, sx: rr(0.4, 1.3), sy: 1, sz: 1, c: pick(['#4a3626', '#5c4532', '#3a2a1e']) }); }
  instances(twig, toon(), twigs, { cast: true });
}

// grass: blades lit like the ground beneath them
{
  const blade = new THREE.BufferGeometry(); const P = [], CL = [], NR = [];
  for (let b = 0; b < 3; b++) {
    const a = b / 3 * Math.PI + rr(-0.3, 0.3), w = 0.06, h = rr(0.35, 0.6), lean = rr(-0.12, 0.12), dx = Math.cos(a) * w, dz = Math.sin(a) * w;
    P.push(-dx, 0, -dz, dx, 0, dz, lean, h, lean * 0.5); CL.push(0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 1.15, 1.15, 1.15); NR.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  blade.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); blade.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3)); blade.setAttribute('normal', new THREE.Float32BufferAttribute(NR, 3));
  const list = [], N = LITE ? 16000 : 40000;
  for (let i = 0; i < N * 4 && list.length < N; i++) {
    const [x, z] = sample(0.15); const gap = gapW(x, z), pw = pathW(x, z);
    const dens = Math.max(gap, sstep(0.68, 0.88, fbm(x * 0.3 + 2, z * 0.3)) * 0.4) * (1 - pw) * (puddleD(x, z) < 1.05 ? 0 : 1) * clearW(x, z);
    if (rnd() > dens) continue;
    const s = rr(0.7, 1.35) * (0.55 + gap * 0.75); groundColor(x, z, tcol); tcol.offsetHSL(rr(-0.02, 0.02), 0.05, rr(0, 0.08));
    list.push({ x, y: height(x, z), z, ry: rnd() * 6.28, sx: s, sy: s * rr(0.8, 1.3), sz: s, c: '#' + tcol.getHexString() });
  }
  instances(blade, toon({ vertexColors: true, side: THREE.DoubleSide }), list, { wind: { strength: 0.18, grass: true } });
  // sedge tussocks in the shade: longer, darker, arching
  const sedge = new THREE.BufferGeometry(); const S = [], SN = [], SC = [];
  for (let b = 0; b < 7; b++) {
    const a = b / 7 * Math.PI * 2, w = 0.04, h = rr(0.4, 0.6), out = rr(0.25, 0.4);
    S.push(-Math.sin(a) * w, 0, Math.cos(a) * w, Math.sin(a) * w, 0, -Math.cos(a) * w, Math.cos(a) * out, h, Math.sin(a) * out);
    SN.push(0, 1, 0, 0, 1, 0, 0, 1, 0); SC.push(0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 1.1, 1.1, 1.1);
  }
  sedge.setAttribute('position', new THREE.Float32BufferAttribute(S, 3)); sedge.setAttribute('normal', new THREE.Float32BufferAttribute(SN, 3)); sedge.setAttribute('color', new THREE.Float32BufferAttribute(SC, 3));
  const tus = [];
  for (let i = 0; i < 900 && tus.length < 120; i++) { const [x, z] = sample(); if (canopyShade(x, z) < 0.4 || gapW(x, z) > 0.4 || pathW(x, z) > 0.2) continue; tus.push({ x, y: height(x, z), z, ry: rnd() * 6.28, s: rr(0.8, 1.3), c: pick(['#3f6626', '#4a7330', '#56803a']) }); }
  instances(sedge, toon({ vertexColors: true, side: THREE.DoubleSide }), tus, { wind: { strength: 0.12, grass: true } });
}

// flowers, clover and herbs
{
  const fl = [];
  for (let i = 0; i < 1800; i++) {
    const [x, z] = sample(); const gap = gapW(x, z);
    if (rnd() > gap * 0.9 || pathW(x, z) > 0.3 || puddleD(x, z) < 1.1) continue;
    if (clearW(x, z) < 0.5) continue;
    fl.push({ x, y: height(x, z) + rr(0.2, 0.45), z, c: pick(['#f3efe1', '#f3efe1', '#f4d34a', '#c9a4e6', '#e98fb4', '#ffffff', '#f6a63a']), s: rr(0.14, 0.2) });
  }
  sprites(dotTex, fl);
  const stemG = new THREE.CylinderGeometry(0.012, 0.016, 1, 4); stemG.translate(0, 0.5, 0);
  instances(stemG, toon(), fl.map((f) => ({ x: f.x, y: height(f.x, f.z), z: f.z, sx: 1, sy: f.y - height(f.x, f.z) + 0.05, sz: 1, c: '#4f7a2c' })), { wind: { strength: 0.05, grass: true } });
  const clover = [];
  for (let i = 0; i < 1400 && clover.length < 380; i++) { const [x, z] = sample(); if (canopyShade(x, z) < 0.35 || gapW(x, z) > 0.5 || pathW(x, z) > 0.2 || fbm(x * 0.5 + 21, z * 0.5) < 0.55) continue; clover.push({ x, y: height(x, z) + 0.02, z, c: pick(['#5f9a38', '#6aa83e', '#56902f']), s: rr(0.16, 0.24) }); }
  sprites(cloverTex, clover);
  const sorrelFl = clover.filter(() => rnd() < 0.25).map((c) => ({ ...c, y: c.y + 0.12, c: '#f4eef2', s: 0.09 }));
  sprites(dotTex, sorrelFl);
}

// ---------- trees ----------
const clumps = { leaf: [], needle: [] };
const trunkMat = { beech: tm('#8d917f'), oak: tm('#5b4935'), spruce: tm('#6a3f28'), birch: tm('#e7e3d6'), snag: tm('#8a857a') };
function addTrunk(t, r0, r1, h, mat, lean = 0) {
  const g = new THREE.CylinderGeometry(r1, r0, h, 8, 5); g.translate(0, h / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); const flare = Math.max(0, 1 - y / 0.9) ** 2 * 0.35; p.setX(i, p.getX(i) * (1 + flare / r0) + Math.sin(y * 0.7 + t.x) * 0.06 + lean * y); p.setZ(i, p.getZ(i) * (1 + flare / r0) + Math.cos(y * 0.5 + t.z) * 0.06); }
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat); mesh.position.set(t.x, height(t.x, t.z) - 0.15, t.z); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
}
function addBranch(base, dir, len, r, mat) {
  const g = new THREE.CylinderGeometry(r * 0.5, r, len, 5); g.translate(0, len / 2, 0);
  const mesh = new THREE.Mesh(g, mat); mesh.position.copy(base); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); mesh.castShadow = true; scene.add(mesh);
}
const birchMarks = [];
for (const t of TREES) {
  const gy = height(t.x, t.z);
  if (t.kind === 'snag') {
    addTrunk(t, 0.3, 0.18, t.h, trunkMat.snag);
    addBranch(new THREE.Vector3(t.x, gy + t.h * 0.55, t.z), new THREE.Vector3(1, 0.6, 0.2), 1.5, 0.08, trunkMat.snag);
    addBranch(new THREE.Vector3(t.x, gy + t.h * 0.75, t.z), new THREE.Vector3(-0.8, 0.7, 0.3), 1.1, 0.06, trunkMat.snag);
    for (let k = 0; k < 4; k++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), tm(k % 2 ? '#c9a067' : '#a9844f'));
      const a = -0.6 + k * 0.7; f.position.set(t.x + Math.cos(a) * 0.27, gy + 1.0 + k * 0.6, t.z + Math.sin(a) * 0.27); f.scale.set(1, 0.42, 1); f.castShadow = true; scene.add(f);
    }
    continue;
  }
  if (t.kind === 'spruce') {
    addTrunk(t, 0.36, 0.11, t.h, trunkMat.spruce);
    for (let i = 0; i < 260; i++) {
      const f = rnd(), y = t.h * (0.18 + 0.82 * f), rad = t.r * (1 - f) * (0.55 + 0.45 * Math.sqrt(rnd())) + 0.2, a = rnd() * Math.PI * 2;
      if (t.dead && rnd() < 0.45) continue;
      clumps.needle.push({ p: new THREE.Vector3(t.x + Math.cos(a) * rad, gy + y - rad * 0.25, t.z + Math.sin(a) * rad), n: new THREE.Vector3(Math.cos(a), 0.55, Math.sin(a)).normalize(),
        s: rr(0.9, 1.4) * (0.7 + (1 - f) * 0.5), c: t.dead ? pick(['#a5622f', '#b8763c', '#8a4f27', '#c4884a']) : pick(['#2f5a3c', '#2a5236', '#36664a', '#284a33']) });
    }
    continue;
  }
  const trunkH = t.kind === 'birch' ? t.h * 0.75 : t.h * 0.55;
  addTrunk(t, t.kind === 'birch' ? 0.18 : 0.4, t.kind === 'birch' ? 0.09 : 0.25, trunkH, trunkMat[t.kind], t.kind === 'birch' ? 0.02 : 0);
  if (t.kind === 'birch') for (let k = 0; k < 14; k++) birchMarks.push({ x: t.x, y: gy + rr(0.3, trunkH), z: t.z, ry: rnd() * 6.28, sx: 1, sy: rr(0.6, 1.4), sz: 1, c: '#2a2724' });
  for (let k = 0; k < 4; k++) { const a = k * 1.7 + t.x; addBranch(new THREE.Vector3(t.x, gy + trunkH * 0.85, t.z), new THREE.Vector3(Math.cos(a), 1.1, Math.sin(a)), t.r * 0.7, 0.11, trunkMat[t.kind]); }
  const cy = gy + t.h - t.r * 0.75, count = t.kind === 'birch' ? 150 : 270, squash = t.kind === 'birch' ? 1.3 : 0.72;
  const palette = { beech: ['#5d8a2c', '#6c9a32', '#4f7a26', '#78a83a'], oak: ['#4f7428', '#5c822c', '#456823', '#6a8f33'], birch: ['#86a83c', '#9bbb4a', '#7a9a35', '#b0c95a'] }[t.kind];
  for (let i = 0; i < count; i++) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, rad = Math.pow(rnd(), 0.35);
    const sx = Math.sqrt(1 - u * u) * Math.cos(th), sz = Math.sqrt(1 - u * u) * Math.sin(th), lump = 0.82 + 0.3 * vnoise(sx * 2 + t.x, u * 2 + sz * 2);
    clumps.leaf.push({ p: new THREE.Vector3(t.x + sx * t.r * rad * lump, cy + u * t.r * squash * rad * lump, t.z + sz * t.r * rad * lump), n: new THREE.Vector3(sx, u * 1.2 + 0.25, sz).normalize(), s: rr(1.3, 2.0) * (t.kind === 'birch' ? 0.8 : 1), c: pick(palette) });
  }
}
{ // black lenticel marks on the birches
  const mk = new THREE.BoxGeometry(0.3, 0.04, 0.3); mk.scale(0.7, 1, 0.7);
  instances(mk, toon(), birchMarks);
}
// ivy climbing the oak, lichen on the snag and rocks later
{
  const ivy = [], oak = TREES.find((t) => t.ivy), gy = height(oak.x, oak.z);
  for (let i = 0; i < 70; i++) { const y = rr(0.2, oak.h * 0.5), a = rr(-1.6, 1.2); ivy.push({ x: oak.x + Math.cos(a) * 0.44, y: gy + y, z: oak.z + Math.sin(a) * 0.44, c: pick(['#24451f', '#2f5628', '#3a6630']), s: rr(0.18, 0.28) }); }
  sprites(cloverTex, ivy);
}

// saplings, shrubs and tall herbs — the regenerating gap
const SAPLINGS = [[-2.5, 3.5, 'beech', 2.4], [3, 3.2, 'birch', 3.4], [-4.8, -1.5, 'beech', 1.7], [1.8, -4.2, 'spruce', 2.1], [6.2, 1.2, 'oak', 1.3], [-1, 6.5, 'beech', 1.5], [-6, 4.5, 'rowan', 2.6], [4.2, -2, 'fir', 1.2], [0.2, -1, 'oak', 0.6], [-3.4, 0.6, 'beech', 0.5]];
for (const [x, z, kind, h] of SAPLINGS) {
  const gy = height(x, z);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, h, 5).translate(0, h / 2, 0), kind === 'birch' ? trunkMat.birch : trunkMat.oak); stem.position.set(x, gy, z); stem.castShadow = true; scene.add(stem);
  const n = Math.round(h * 10);
  for (let i = 0; i < n; i++) {
    const f = rnd(), a = rnd() * 6.28, conifer = kind === 'spruce' || kind === 'fir', rad = (conifer ? (1 - f) * 0.65 : 0.5) * Math.sqrt(rnd()) * (h < 1 ? 0.6 : 1);
    const p = new THREE.Vector3(x + Math.cos(a) * rad, gy + h * (0.35 + 0.65 * f), z + Math.sin(a) * rad);
    const col = conifer ? pick(['#3a6a45', '#2f5c3c']) : kind === 'rowan' ? pick(['#5f9a34', '#6faa3c']) : pick(['#7fae3c', '#8fbd48', '#6f9c34']);
    (conifer ? clumps.needle : clumps.leaf).push({ p, n: new THREE.Vector3(Math.cos(a), 0.6, Math.sin(a)).normalize(), s: rr(0.45, 0.75) * (h < 1 ? 0.6 : 1), c: col });
  }
}
const berries = [], umbels = [];
for (let i = 0; i < 900; i++) {  // bramble at the sunny edge, bilberry under the conifers, elder and raspberry at the margin
  const [x, z] = sample(0.8); const gap = gapW(x, z), sh = canopyShade(x, z);
  const bramble = gap > 0.25 && gap < 0.7 && fbm(x * 0.3 + 5, z * 0.3) > 0.56;
  const bil = sh > 0.5 && fbm(x * 0.4 + 9, z * 0.4) > 0.6;
  if (!(bramble || bil) || pathW(x, z) > 0.2 || puddleD(x, z) < 1.3) continue;
  const gy = height(x, z), R = bramble ? rr(0.6, 1.1) : rr(0.45, 0.7), H = bramble ? rr(0.6, 1.0) : rr(0.22, 0.38);
  for (let k = 0; k < (bramble ? 14 : 9); k++) {
    const a = rnd() * 6.28, d = Math.sqrt(rnd()) * R, p = new THREE.Vector3(x + Math.cos(a) * d, gy + H * rr(0.3, 1), z + Math.sin(a) * d);
    clumps.leaf.push({ p, n: new THREE.Vector3(Math.cos(a), 0.8, Math.sin(a)).normalize(), s: rr(0.42, 0.65), c: bramble ? pick(['#3f6a2a', '#365e25', '#4a7a30']) : pick(['#4c7d34', '#5a8c3a']) });
    if (rnd() < 0.5) berries.push({ x: p.x + rr(-0.15, 0.15), y: p.y + 0.08, z: p.z + rr(-0.15, 0.15), c: bramble ? pick(['#2a1430', '#3a1c40', '#f2e8ee', '#c43a3a']) : '#3b4f9a', s: 0.1 });
  }
}
for (const [x, z] of [[-11.5, 11], [12.2, 11.8]]) {  // elder shrubs with flat white flower heads
  const gy = height(x, z);
  for (let k = 0; k < 60; k++) {
    const a = rnd() * 6.28, d = Math.sqrt(rnd()) * 1.4, p = new THREE.Vector3(x + Math.cos(a) * d, gy + rr(0.6, 2.4), z + Math.sin(a) * d);
    clumps.leaf.push({ p, n: new THREE.Vector3(Math.cos(a), 0.7, Math.sin(a)).normalize(), s: rr(0.7, 1.0), c: pick(['#4d7a2c', '#5a8a32']) });
    if (rnd() < 0.3) umbels.push({ x: p.x, y: p.y + 0.3, z: p.z, c: '#f4f0dc', s: rr(0.3, 0.42) });
  }
}
sprites(dotTex, berries); sprites(umbelTex, umbels);

function clumpMesh(list, tex) {
  const q = new THREE.PlaneGeometry(1, 1);
  const aN = new Float32Array(list.length * 3); list.forEach((l, i) => aN.set([l.n.x, l.n.y, l.n.z], i * 3));
  q.setAttribute('aNormal', new THREE.InstancedBufferAttribute(aN, 3));
  const mat = toon({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }); windify(mat, { billboard: true, strength: 0.05 });
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5, side: THREE.DoubleSide }); windify(depth, { billboard: true, strength: 0.05 });
  const im = new THREE.InstancedMesh(q, mat, list.length); im.customDepthMaterial = depth;
  list.forEach((l, i) => { dummy.position.copy(l.p); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(l.s); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, tcol.set(l.c)); });
  im.castShadow = im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
}
clumpMesh(clumps.leaf, leafTex); clumpMesh(clumps.needle, needleTex);

// tall herbs: foxglove and rosebay willowherb spikes, nettle patch
{
  const spikes = [], bells = [];
  const tall = (x, z, kind) => {
    const gy = height(x, z), h = kind === 'fox' ? rr(1.0, 1.5) : rr(1.2, 1.7);
    spikes.push({ x, y: gy, z, sx: 1, sy: h, sz: 1, c: '#4f7d2c' });
    for (let k = 0; k < 10; k++) { const a = k * 2.1; bells.push({ x: x + Math.cos(a) * 0.07, y: gy + h * (0.45 + k * 0.055), z: z + Math.sin(a) * 0.07, s: kind === 'fox' ? 1 : 0.8, c: kind === 'fox' ? (k % 3 ? '#d0609f' : '#e993c4') : (k % 2 ? '#d35d9a' : '#b9478a') }); }
  };
  for (const [x, z] of [[6.8, 5.5], [7.3, 6.3], [-8.5, -1], [3.2, -8], [-6, 7.6], [9.5, -2.5]]) tall(x, z, 'fox');
  for (let i = 0; i < 300 && spikes.length < 34; i++) { const [x, z] = sample(1); const g = gapW(x, z); if (g < 0.35 || g > 0.75 || pathW(x, z) > 0.2 || fbm(x * 0.4 + 31, z * 0.4) < 0.55) continue; tall(x, z, 'willow'); }
  const stemG = new THREE.CylinderGeometry(0.025, 0.035, 1, 5); stemG.translate(0, 0.5, 0);
  instances(stemG, toon(), spikes, { cast: true, wind: { strength: 0.04 } });
  const bellG = new THREE.SphereGeometry(0.08, 6, 4); bellG.scale(1, 1.3, 1);
  instances(bellG, toon(), bells, { cast: true });
  const nettle = [];  // nettles by the puddle (nitrogen-rich, damp)
  for (let i = 0; i < 40; i++) { const a = rnd() * 6.28, d = rr(1.4, 2.4); const x = PUDDLE.x + Math.cos(a) * d, z = PUDDLE.z + Math.sin(a) * d * 0.8; if (pathW(x, z) > 0.2) continue; nettle.push({ x, y: height(x, z), z, ry: rnd() * 6, sx: 1, sy: rr(0.6, 1.0), sz: 1, c: '#3f6e2a' }); }
  const ng = new THREE.BufferGeometry(); const NP = [], NN = [];
  for (let k = 0; k < 5; k++) { const y = 0.25 + k * 0.17, a = k * 1.6, w = 0.18 - k * 0.025; NP.push(0, y, 0, Math.cos(a) * w, y - 0.04, Math.sin(a) * w, Math.cos(a + 0.5) * w * 0.6, y + 0.06, Math.sin(a + 0.5) * w * 0.6, 0, y, 0, -Math.cos(a) * w, y - 0.04, -Math.sin(a) * w, -Math.cos(a + 0.5) * w * 0.6, y + 0.06, -Math.sin(a + 0.5) * w * 0.6); for (let j = 0; j < 6; j++) NN.push(0, 1, 0); }
  NP.push(0.01, 0, 0, -0.01, 0, 0, 0, 1.05, 0); NN.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  ng.setAttribute('position', new THREE.Float32BufferAttribute(NP, 3)); ng.setAttribute('normal', new THREE.Float32BufferAttribute(NN, 3));
  instances(ng, toon({ side: THREE.DoubleSide }), nettle, { cast: true, wind: { strength: 0.06 } });
}

// ferns
{
  const frond = new THREE.BufferGeometry(); const P = [], N = [], I = []; const SEGS = 8;
  for (let k = 0; k <= SEGS; k++) { const t = k / SEGS, w = Math.sin(Math.PI * Math.min(1, t * 1.1)) * 0.16 * (1 - t * 0.4), y = Math.sin(t * 1.9) * 0.55, x = t; P.push(x, y, -w, x, y + 0.02, w); N.push(0, 1, 0, 0, 1, 0); if (k < SEGS) { const b = k * 2; I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } }
  frond.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); frond.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); frond.setIndex(I);
  const spots = [];
  for (let i = 0; i < 900 && spots.length < 46; i++) { const [x, z] = sample(1); if (canopyShade(x, z) < 0.4 || gapW(x, z) > 0.5 || pathW(x, z) > 0.2) continue; spots.push([x, z, rr(0.8, 1.4)]); }
  spots.push([-3.5, 8, 1.2], [7.5, 6.5, 1.3], [-8, 1.5, 1.4], [8.6, 3.4, 1.1]);
  const list = [];
  for (const [x, z, s] of spots) for (let f = 0; f < 9; f++) list.push({ x, y: height(x, z), z, ry: f / 9 * Math.PI * 2 + rnd() * 0.4, s: s * rr(0.75, 1.1), c: pick(['#4f8a2e', '#5b9834', '#447a28', '#62a03a']) });
  instances(frond, toon({ side: THREE.DoubleSide }), list, { cast: true, wind: { strength: 0.06 } });
}

// moss cushions on roots and stones, lichen patches
{
  const cushion = new THREE.SphereGeometry(0.2, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const list = [];
  for (let i = 0; i < 1500 && list.length < 200; i++) { const [x, z] = sample(); if (fbm(x * 0.35 + 11, z * 0.35) < 0.58 || gapW(x, z) > 0.4 || pathW(x, z) > 0.2) continue; list.push({ x, y: height(x, z) - 0.05, z, sx: rr(0.5, 1.1), sy: rr(0.5, 0.8), sz: rr(0.5, 1.1), ry: rnd() * 6, c: pick(['#3f6f22', '#4a7d26', '#3a661f', '#557f2c']) }); }
  for (const t of TREES) if (t.kind !== 'spruce' && t.kind !== 'snag') for (let k = 0; k < 5; k++) { const a = rnd() * 6.28; list.push({ x: t.x + Math.cos(a) * 0.6, y: height(t.x, t.z), z: t.z + Math.sin(a) * 0.6, sx: 1.2, sy: 0.7, sz: 1.2, c: pick(['#4f8a26', '#5e9a2c']) }); }
  instances(cushion, toon(), list, { cast: false });
}

// ---------- dead wood, stones, ant mound ----------
function rock(x, z, s) {
  const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), k = 1 + (hash(Math.round(vx * 10) + x, Math.round(vz * 10 + vy * 7) + z) - 0.5) * 0.45; p.setXYZ(i, vx * k * 1.2, vy * k * 0.7, vz * k); }
  g.computeVertexNormals(); const nn = g.attributes.normal; const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const top = nn.getY(i); const c = top > 0.45 ? C(pick(['#4e7a2a', '#5d8a2f'])) : top > 0.1 && rnd() < 0.3 ? C('#a7b38f') : C(pick(['#7d807a', '#8a8c85', '#6e716c'])); col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(g, toon({ vertexColors: true })); mesh.scale.setScalar(s); mesh.position.set(x, height(x, z) + s * 0.15, z); mesh.rotation.y = rnd() * 6.28; mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
}
[[-7, 2.5, 0.85], [-6.1, 3.4, 0.42], [8.5, 9.4, 0.9], [1.6, 9.6, 0.45], [-10.5, -11, 0.7], [11.8, -5.2, 0.6], [-2.6, -9, 0.38], [12.4, 12.4, 0.5], [-12.6, 12.6, 0.55], [6.2, 3.6, 0.3]].forEach(([x, z, s]) => rock(x, z, s));
{
  const len = 6.2, r = 0.42;
  const g = new THREE.CylinderGeometry(r, r * 1.1, len, 10, 8); g.rotateZ(Math.PI / 2); g.computeVertexNormals();
  const p = g.attributes.position, nn = g.attributes.normal, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); const c = nn.getY(i) > 0.75 && vnoise(x * 1.6, 3) > 0.55 ? C(pick(['#4f7c2a', '#5d8b30'])) : (x > len / 2 - 0.4 ? C('#a66a36') : C(pick(['#4b3a2a', '#57442f']))); col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const log = new THREE.Mesh(g, toon({ vertexColors: true })); log.position.set(-3, height(-3, 6.8) + 0.32, 6.8); log.rotation.y = -0.35; log.castShadow = log.receiveShadow = true; scene.add(log);
  for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), tm('#d7b071')); f.position.set(-4.5 + k * 0.9, height(-3, 6.8) + 0.25, 6.8 + 0.42 + k * 0.32); f.scale.set(1, 0.45, 0.8); f.castShadow = true; scene.add(f); }
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 0.7, 10), [tm('#5e4230'), tm('#c9a26a'), tm('#5e4230')]); stump.position.set(4.6, height(4.6, -0.6) + 0.3, -0.6); stump.castShadow = stump.receiveShadow = true; scene.add(stump);
  const honey = []; for (let k = 0; k < 9; k++) { const a = rr(-0.8, 0.8); honey.push({ x: 4.6 + Math.cos(a) * 0.78, y: height(4.6, -0.6) + rr(0.05, 0.3), z: -0.6 + Math.sin(a) * 0.78, s: rr(0.7, 1.1), c: pick(['#c79a4e', '#b5863f', '#d8ae62']) }); }
  const capG = new THREE.SphereGeometry(0.09, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2); capG.scale(1, 0.6, 1);
  instances(capG, toon(), honey, { cast: true });
  // fallen branches
  for (const [x, z, a, l] of [[-7.5, -4, 0.5, 2.2], [7.8, -7.5, 2.2, 1.8], [-10, 4.5, 1.3, 1.6], [2.5, -10.5, 0.2, 2.4]]) addBranch(new THREE.Vector3(x, height(x, z) + 0.05, z), new THREE.Vector3(Math.cos(a), 0.06, Math.sin(a)), l, 0.06, tm('#5a4632'));
}
{ // wood ant mound beside the spruce
  const x = 9.6, z = -0.8, gy = height(x, z);
  const mound = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.75, 12, 3), tm('#6a4629')); mound.position.set(x, gy + 0.3, z); mound.castShadow = mound.receiveShadow = true; scene.add(mound);
  const ants = []; for (let k = 0; k < 40; k++) { const a = rnd() * 6.28, d = rr(0.1, 1.2); ants.push({ x: x + Math.cos(a) * d, y: gy + Math.max(0.02, 0.68 - d * 0.6), z: z + Math.sin(a) * d, s: 1, c: '#120a06' }); }

}
// fungi on the forest floor
{
  const caps = [], stems = [], spots = [];
  const add = (x, z, k) => { const gy = height(x, z), s = rr(0.8, 1.2); stems.push({ x, y: gy, z, s, c: '#efe8d6' }); caps.push({ x, y: gy + 0.19 * s, z, s, c: k === 'red' ? '#d23a26' : k === 'white' ? '#efeadf' : '#7a4a26' }); if (k === 'red') for (let d = 0; d < 3; d++) spots.push({ x: x + rr(-0.06, 0.06), y: gy + 0.26 * s, z: z + rr(-0.06, 0.06), s: 1, c: '#fbf6ea' }); };
  [[-1.3, 8.2, 'red'], [-0.9, 8.6, 'red'], [-2.5, -10, 'red'], [-1.9, -10.4, 'red'], [-3, -10.2, 'red'], [-3.8, 6.2, 'brown'], [-3.3, 5.9, 'brown'], [10.4, -8.3, 'brown'], [9.8, -8.6, 'white'], [-8.4, -6.8, 'white'], [-8, -7.3, 'white']].forEach(([x, z, k]) => add(x, z, k));
  const st = new THREE.CylinderGeometry(0.04, 0.05, 0.2, 6); st.translate(0, 0.1, 0);
  const cp = new THREE.SphereGeometry(0.13, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2); cp.scale(1, 0.75, 1);
  instances(st, toon(), stems); instances(cp, toon(), caps, { cast: true }); instances(new THREE.SphereGeometry(0.025, 4, 3), toon(), spots);
}

// ---------- research kit: corner stakes with flagging and a boundary string, a quadrat, tags, camera trap ----------
{
  const wood = tm('#b88d58'), flagM = toon({ color: C('#ff6a1a'), side: THREE.DoubleSide }), white = tm('#f1ede2');
  const corners = [[-HALF + 0.35, -HALF + 0.35], [HALF - 0.35, -HALF + 0.35], [HALF - 0.35, HALF - 0.35], [-HALF + 0.35, HALF - 0.35]];
  corners.forEach(([x, z], i) => {
    const gy = height(x, z);
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08).translate(0, 0.6, 0), wood); st.position.set(x, gy, z); st.castShadow = true; scene.add(st);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.2), flagM); fl.position.set(x + 0.24, gy + 1.08, z); fl.castShadow = true; scene.add(fl);
    const [x2, z2] = corners[(i + 1) % 4];  // string between stakes
    const n = 40; for (let k = 0; k < n; k++) {
      if (k % 4 === 3) continue;
      const t = (k + 0.5) / n, sx = x + (x2 - x) * t, sz = z + (z2 - z) * t;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x2 - x) / n + 0.02, 0.02, Math.abs(z2 - z) / n + 0.02), white);
      seg.position.set(sx, Math.max(height(sx, sz) + 0.25, gy + 0.3 - Math.sin(t * Math.PI) * 0.1), sz); scene.add(seg);
    }
  });
  const y0 = height(-1.2, -2.4) + 0.06;
  const frame = new THREE.Group(); frame.position.set(-1.2, y0, -2.4); frame.rotation.y = 0.2; scene.add(frame);
  [[0, -0.5, 1, 0.09], [0, 0.5, 1, 0.09], [-0.5, 0, 0.09, 1], [0.5, 0, 0.09, 1]].forEach(([dx, dz, w, d]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w + 0.09, 0.1, d + 0.09), white); b.position.set(dx, 0, dz); b.castShadow = true; frame.add(b); });
  const tagM = tm('#d6d9d4');
  for (const t of TREES) { if (t.kind === 'snag') continue; const r = t.kind === 'birch' ? 0.19 : 0.4; const tag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), tagM); tag.position.set(t.x, height(t.x, t.z) + 1.3, t.z + r); scene.add(tag); }
  const beech = TREES[0]; const cam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.16), tm('#3b4a2a')); cam.position.set(beech.x + 0.42, height(beech.x, beech.z) + 1.6, beech.z + 0.2); cam.rotation.y = 0.8; cam.castShadow = true; scene.add(cam);
}

// ---------- the roe deer: one animal, properly built and rigged for motion ----------
// Built facing -x. Joints are pivot groups (neck, head, ears, tail, four legs) so walking and grazing can be animated next.
const DEER = (() => {
  const M = { coat: tm('#b4693a'), back: tm('#9a5730'), belly: tm('#d6a878'), leg: tm('#8e5a35'), muzzle: tm('#3a2a20'), white: tm('#f1ebde'), black: tm('#121010'), hoof: tm('#2a2018'), ear: tm('#a86036') };
  const sphere = new THREE.SphereGeometry(1, 14, 10);
  const ell = (parent, mat, p, r, rot = [0, 0, 0]) => { const m = new THREE.Mesh(sphere, mat); m.position.set(...p); m.scale.set(...r); m.rotation.set(...rot); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const seg = (parent, mat, a, b, r0, r1) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
    const g = new THREE.CylinderGeometry(r1, r0, len, 8); g.translate(0, len / 2, 0);
    const m = new THREE.Mesh(g, mat); m.position.copy(A); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const pivot = (parent, p) => { const g = new THREE.Group(); g.position.set(...p); parent.add(g); return g; };
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
  root.scale.setScalar(1.25);
  const x = -1.6, z = pathZ(-1.6) + 0.5;
  root.position.set(x, height(x, z) + 0.02, z); root.rotation.y = 0.6;
  scene.add(root);
  return { root, body, neck, head, tail, legs, ears, x, z };
})();
// ---------- more animals, each built facing -x with pivot joints ready for motion ----------
const SPH = new THREE.SphereGeometry(1, 12, 8);
function ell(parent, mat, p, r, rot = [0, 0, 0]) { const m = new THREE.Mesh(SPH, mat); m.position.set(...p); m.scale.set(...r); m.rotation.set(...rot); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
function seg(parent, mat, a, b, r0, r1) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r1, r0, len, 7); g.translate(0, len / 2, 0);
  const m = new THREE.Mesh(g, mat); m.position.copy(A); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function pivot(parent, p) { const g = new THREE.Group(); g.position.set(...p); parent.add(g); return g; }
function placeRig(rig, x, z, ry, scale, yOff = 0) { rig.root.scale.setScalar(scale); rig.root.position.set(x, height(x, z) + yOff, z); rig.root.rotation.y = ry; scene.add(rig.root); return rig; }

function makeFox() {
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

function makeBoar(piglet = false) {
  const M = piglet ? { coat: tm('#8a5e3a'), ridge: tm('#6a4428'), snout: tm('#a07a62'), leg: tm('#5a3d27') } : { coat: tm('#64544a'), ridge: tm('#3a3029'), snout: tm('#8c776a'), leg: tm('#3a3029') };
  const stripe = tm('#dcc89c'), disc = tm('#c79a8c'), black = tm('#111');
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);
  ell(body, M.coat, [0.05, 0.55, 0], [0.55, 0.28, 0.23]); ell(body, M.coat, [-0.28, 0.6, 0], [0.3, 0.3, 0.24]);   // body, heavy shoulders
  ell(body, M.ridge, [-0.12, 0.8, 0], [0.5, 0.07, 0.07]);                                                         // bristly mane along the back
  if (piglet) for (const y of [0.48, 0.58, 0.68]) ell(body, stripe, [0.02, y, 0], [0.5, 0.022, 0.238]);           // pale stripes
  const head = pivot(body, [-0.5, 0.6, 0]); head.rotation.z = 0.35;
  ell(head, M.coat, [-0.12, 0, 0], [0.24, 0.17, 0.15]);
  seg(head, M.snout, [-0.25, -0.03, 0], [-0.45, -0.07, 0].map((v, i) => v), 0.075, 0.06);
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

function makeHare() {
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

function makeSquirrel() {
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

function makeJay() {
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

function makeWoodpecker() {
  const black = tm('#151515'), white = tm('#efece4'), red = tm('#c4271f');
  const root = new THREE.Group(), body = pivot(root, [0, 0, 0]);   // clings upright: body along +y
  ell(body, black, [0, 0.11, 0], [0.045, 0.1, 0.05]); ell(body, white, [-0.03, 0.1, 0], [0.025, 0.07, 0.04]); ell(body, white, [0.01, 0.13, 0.045], [0.02, 0.03, 0.008]);
  ell(body, red, [-0.02, 0.02, 0], [0.025, 0.025, 0.03]);
  const head = pivot(body, [0, 0.22, 0]); ell(head, black, [0, 0, 0], [0.04, 0.038, 0.036]); ell(head, white, [-0.02, -0.005, 0.03], [0.02, 0.015, 0.008]); ell(head, red, [0.025, 0.01, 0], [0.012, 0.015, 0.02]);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.04, 4), tm('#3a3a3a')); beak.rotation.z = Math.PI / 2; beak.position.set(-0.055, 0, 0); head.add(beak);
  const tail = pivot(body, [0.01, 0, 0]); ell(tail, black, [0.01, -0.04, 0], [0.015, 0.05, 0.025]);
  return { kind: 'woodpecker', root, body, head, tail, legs: [] };
}

const RIGS = { deer: DEER };
RIGS.fox = placeRig(makeFox(), SPOTS.fox[0], SPOTS.fox[1], 0.6 + Math.PI, 1.35);
RIGS.boar = placeRig(makeBoar(false), SPOTS.boar[0], SPOTS.boar[1], 0.6, 1.1);
RIGS.boar.head.rotation.z = 0.75;    // snout down, rooting
RIGS.piglets = [[-1.2, 0.8, 0.4], [1.3, 1.1, -1.2], [0.6, -1.4, 1.9]].map(([dx, dz, r]) => placeRig(makeBoar(true), SPOTS.boar[0] + dx, SPOTS.boar[1] + dz, r, 0.42));
RIGS.hare = placeRig(makeHare(), SPOTS.hare[0], SPOTS.hare[1], 0.6, 1.4);
RIGS.squirrel = placeRig(makeSquirrel(), -2.0, 6.55, 0.6, 1.4, 0.68);
RIGS.jay = placeRig(makeJay(), 4.6, -0.6, 2.4, 1.4, 0.66);
{ const snag = TREES.find((t) => t.kind === 'snag'); RIGS.woodpecker = placeRig(makeWoodpecker(), snag.x + 0.26, snag.z + 0.05, 0, 1.4, 3.8); RIGS.woodpecker.root.rotation.y = -0.2; }
window.__rigs = RIGS;
const fliers = [];
const fallers = [];
// ---------- motion: simple behaviours for each animal ----------
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angLerp = (a, b, k, dt) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * (1 - Math.exp(-k * dt)); };
const TROT = [0, Math.PI, Math.PI, 0];   // leg order: front-left, hind-left, front-right, hind-right → diagonal pairs
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

// the roe deer walks the path from glade to glade, grazes, and looks up when something stirs
const DEER_STOPS = [-10, -6.5, -2, 2.5, 6.5, 10].map((x) => [x, pathZ(x) + 0.45]);
const deerM = Object.assign(mover(DEER), { mode: 'graze', timer: 6, stop: 2, dir: 1 });
function updateDeer(dt, t) {
  const m = deerM, r = m.rig;
  if (m.mode === 'walk') {
    const [tx, tz] = DEER_STOPS[m.stop];
    if (steer(m, tx, tz, 0.85, dt, 3)) { m.mode = rnd() < 0.7 ? 'graze' : 'alert'; m.timer = m.mode === 'graze' ? rr(5, 10) : rr(2, 4); }
  } else {
    m.speed = damp(m.speed, 0, 6, dt);
    if ((m.timer -= dt) < 0) {
      if (m.mode === 'graze' && rnd() < 0.4) { m.mode = 'alert'; m.timer = rr(2, 3.5); }
      else { m.mode = 'walk'; if (m.stop + m.dir < 0 || m.stop + m.dir >= DEER_STOPS.length) m.dir *= -1; m.stop += m.dir; }
    }
  }
  m.phase += dt * m.speed * 7.5;
  legs(m, Math.min(0.42, m.speed * 0.5));
  r.body.position.y = Math.abs(Math.sin(m.phase)) * 0.015 * Math.min(1, m.speed);
  const neckT = m.mode === 'graze' ? 1.25 : m.mode === 'alert' ? -0.15 : 0.15;
  r.neck.rotation.z = damp(r.neck.rotation.z, neckT, 3, dt);
  r.head.rotation.z = m.mode === 'graze' ? Math.sin(t * 5) * 0.06 : damp(r.head.rotation.z, 0, 4, dt);
  r.neck.rotation.y = damp(r.neck.rotation.y, m.mode === 'alert' ? Math.sin(t * 0.7) * 0.5 : 0, 2, dt);
  r.ears.forEach((e, i) => flick(e, 'x', t + i * 1.3, 2.6 + i, 0.6));
  flick(r.tail, 'z', t, 3.1, 0.6);
  settle(m);
}

// the fox trots a loop along the plot's front edge, pausing to sniff
const FOX_ROUTE = [[-1.2, 11.2], [3.5, 12.4], [8.5, 12.3], [10.2, 8.8], [7.6, 7.9], [2.8, 8.3], [-2.4, 9.6]];
const foxM = Object.assign(mover(RIGS.fox), { leg: 0 });
function updateFox(dt, t) {
  const m = foxM, r = m.rig;
  if (m.mode === 'trot') { const [tx, tz] = FOX_ROUTE[m.leg]; if (steer(m, tx, tz, 1.7, dt, 6)) { m.mode = 'sniff'; m.timer = rr(1.5, 4); } }
  else { m.speed = damp(m.speed, 0, 6, dt); if ((m.timer -= dt) < 0) { m.mode = 'trot'; m.leg = (m.leg + 1) % FOX_ROUTE.length; } }
  m.phase += dt * m.speed * 9;
  legs(m, Math.min(0.6, m.speed * 0.4));
  r.body.position.y = Math.abs(Math.sin(m.phase)) * 0.02 * Math.min(1, m.speed);
  r.neck.rotation.z = damp(r.neck.rotation.z, m.mode === 'sniff' ? 0.9 : 0, 4, dt);
  r.head.rotation.z = m.mode === 'sniff' ? Math.sin(t * 7) * 0.08 : 0;
  r.tail.rotation.z = Math.sin(t * 2 + m.phase * 0.3) * 0.15 - 0.1 * Math.min(1, m.speed);
  r.tail.rotation.y = Math.sin(t * 1.4) * 0.25;
  r.ears.forEach((e, i) => flick(e, 'x', t + i, 3.7, 0.4 * (i ? 1 : -1)));
  settle(m);
}

// the sow roots slowly about; the piglets trot after her
const boarM = mover(RIGS.boar); const home = { x: SPOTS.boar[0], z: SPOTS.boar[1] };
const pigM = RIGS.piglets.map((p, i) => Object.assign(mover(p), { off: [[-1.1, 0.7], [-1.0, -0.8], [-1.9, 0.1]][i] }));
function updateBoar(dt, t) {
  const m = boarM, r = m.rig;
  if (m.mode === 'walk') { if (steer(m, m.tx, m.tz, 0.35, dt, 2)) { m.mode = 'root'; m.timer = rr(3, 7); } }
  else { m.speed = damp(m.speed, 0, 5, dt); if ((m.timer -= dt) < 0) { m.mode = 'walk'; const a = rnd() * 6.28, d = rr(0.5, 2.2); m.tx = THREE.MathUtils.clamp(home.x + Math.cos(a) * d, -12.5, 12.5); m.tz = THREE.MathUtils.clamp(home.z + Math.sin(a) * d, -12.5, 12.8); } }
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
const hareM = Object.assign(mover(RIGS.hare), { mode: 'sit', hop: 0, base: { x: SPOTS.hare[0], z: SPOTS.hare[1] } });
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
const LOG = { x: -3, z: 6.8, y: height(-3, 6.8) + 0.32 + 0.4, ax: Math.cos(-0.35), az: -Math.sin(-0.35) };
const sqM = Object.assign(mover(RIGS.squirrel), { u: 1, tu: 1 });
function updateSquirrel(dt, t) {
  const m = sqM, r = m.rig;
  if (Math.abs(m.tu - m.u) > 0.02) { const d = Math.sign(m.tu - m.u); m.u += d * Math.min(Math.abs(m.tu - m.u), 2.6 * dt); m.yaw = angLerp(m.yaw, Math.atan2(LOG.az * d, -LOG.ax * d), 12, dt); m.phase += dt * 30; }
  else if ((m.timer -= dt) < 0) { m.tu = rr(-2.6, 2.6); m.timer = rr(1.5, 5); }
  const moving = Math.abs(m.tu - m.u) > 0.02;
  m.x = LOG.x + LOG.ax * m.u; m.z = LOG.z + LOG.az * m.u;
  r.body.position.y = moving ? Math.abs(Math.sin(m.phase)) * 0.05 : 0;
  r.tail.rotation.z = Math.sin(t * (moving ? 10 : 2.5)) * (moving ? 0.25 : 0.12);
  r.head.rotation.y = moving ? 0 : Math.sin(t * 1.7) * 0.6;
  settle(m, LOG.y);
}

// the jay hops about on the stump; the woodpecker drums in bursts
const jayM = Object.assign(mover(RIGS.jay), { cx: 4.6, cz: -0.6, y: RIGS.jay.root.position.y, hop: 1 });
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
function updateWoodpecker(dt, t) {
  const r = RIGS.woodpecker, c = t % 4.2;
  r.head.rotation.z = c < 1.1 ? Math.max(0, Math.sin(c * 95)) * 0.45 : Math.sin(t * 1.5) * 0.08;
  r.tail.rotation.z = c < 1.1 ? Math.sin(c * 95) * 0.05 : 0;
}
function updateAnimals(dt, t) { updateDeer(dt, t); updateFox(dt, t); updateBoar(dt, t); updateHare(dt, t); updateSquirrel(dt, t); updateJay(dt, t); updateWoodpecker(dt, t); }

// ---------- camera: pan, rotate, zoom to cursor, keyboard, follow an animal ----------
const keys = new Set();
addEventListener('keydown', (e) => { if (e.target.closest && e.target.closest('button')) return; keys.add(e.key.toLowerCase()); });
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
let follow = null; let zoomGoal = null;
const FOLLOW = { deer: () => DEER.root, fox: () => RIGS.fox.root, boar: () => RIGS.boar.root, hare: () => RIGS.hare.root, squirrel: () => RIGS.squirrel.root };
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  const v = b.dataset.view;
  document.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  if (v === 'overview') { follow = null; zoomGoal = 1; panTo(0, 0); } else { follow = FOLLOW[v]; zoomGoal = 3.2; }
}));
document.querySelectorAll('[data-rot]').forEach((b) => b.addEventListener('click', () => { rotGoal += +b.dataset.rot * Math.PI / 4; }));
controls.addEventListener('start', () => { if (follow) { follow = null; document.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', 'false')); } zoomGoal = null; });
let rotGoal = 0, rotDone = 0, panGoal = null;
function panTo(x, z) { panGoal = new THREE.Vector3(x, 0.5, z); }
const off = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
function moveTarget(dx, dz) { controls.target.x += dx; controls.target.z += dz; camera.position.x += dx; camera.position.z += dz; }
function updateCamera(dt) {
  // keyboard: WASD / arrows pan, Q/E rotate, +/- zoom
  camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); right.crossVectors(fwd, camera.up).normalize();
  const sp = 14 * dt / camera.zoom; let kx = 0, kz = 0;
  if (keys.has('w') || keys.has('arrowup')) { kx += fwd.x; kz += fwd.z; }
  if (keys.has('s') || keys.has('arrowdown')) { kx -= fwd.x; kz -= fwd.z; }
  if (keys.has('d') || keys.has('arrowright')) { kx += right.x; kz += right.z; }
  if (keys.has('a') || keys.has('arrowleft')) { kx -= right.x; kz -= right.z; }
  if (kx || kz) { follow = null; moveTarget(kx * sp, kz * sp); }
  if (keys.has('q')) rotGoal -= dt * 1.4; if (keys.has('e')) rotGoal += dt * 1.4;
  if (keys.has('=') || keys.has('+')) { camera.zoom = Math.min(controls.maxZoom, camera.zoom * (1 + dt * 1.5)); camera.updateProjectionMatrix(); }
  if (keys.has('-')) { camera.zoom = Math.max(controls.minZoom, camera.zoom * (1 - dt * 1.5)); camera.updateProjectionMatrix(); }
  // eased rotation about the target
  const step = (rotGoal - rotDone) * (1 - Math.exp(-6 * dt));
  if (Math.abs(step) > 1e-5) { off.subVectors(camera.position, controls.target).applyAxisAngle(camera.up, step); camera.position.copy(controls.target).add(off); rotDone += step; }
  // follow an animal, or glide to a requested point
  const goal = follow ? follow().position : panGoal;
  if (goal) { const k = 1 - Math.exp(-(follow ? 4 : 3) * dt); moveTarget((goal.x - controls.target.x) * k, (goal.z - controls.target.z) * k); if (!follow && Math.hypot(goal.x - controls.target.x, goal.z - controls.target.z) < 0.05) panGoal = null; }
  if (zoomGoal) { camera.zoom = damp(camera.zoom, zoomGoal, 3, dt); camera.updateProjectionMatrix(); if (Math.abs(camera.zoom - zoomGoal) < 0.01) zoomGoal = null; }
  // keep the view anchored on the plot
  const cx = THREE.MathUtils.clamp(controls.target.x, -HALF, HALF), cz = THREE.MathUtils.clamp(controls.target.z, -HALF, HALF);
  if (cx !== controls.target.x || cz !== controls.target.z) moveTarget(cx - controls.target.x, cz - controls.target.z);
}

// ---------- pixelating post pass: outlines, background, grade ----------
const post = new THREE.ShaderMaterial({
  uniforms: { tColor: { value: rt.texture }, tDepth: { value: rt.depthTexture }, res: { value: new THREE.Vector2(1, 1) }, depthRange: { value: 300 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 res; uniform float depthRange; varying vec2 vUv;
    float D(vec2 uv){ return texture2D(tDepth, uv).r; }
    void main(){
      vec2 px = 1.0 / res; vec2 uv = (floor(vUv * res) + 0.5) * px;
      float dr0 = D(uv);
      if (dr0 > 0.9999) {   // background: soft dark-green field with a faint warm glow behind the plot
        vec2 q = vUv - vec2(0.5, 0.56); float g = 1.0 - smoothstep(0.0, 0.75, length(q * vec2(1.3, 1.0)));
        vec3 bg = mix(vec3(0.035, 0.055, 0.045), vec3(0.11, 0.135, 0.09), g);
        float b = fract(sin(dot(floor(vUv * res), vec2(12.9898, 78.233))) * 43758.5453);
        bg += (b - 0.5) * 0.012;
        gl_FragColor = vec4(bg, 1.0);
        #include <colorspace_fragment>
        return;
      }
      vec3 c = texture2D(tColor, uv).rgb;
      float d = dr0 * depthRange;
      float dl = D(uv - vec2(px.x, 0.0)) * depthRange, drr = D(uv + vec2(px.x, 0.0)) * depthRange, du = D(uv + vec2(0.0, px.y)) * depthRange, dd = D(uv - vec2(0.0, px.y)) * depthRange;
      float edge = max(max(dl - d, drr - d), max(du - d, dd - d));
      if (edge > 1.0) c = c * vec3(0.62, 0.6, 0.68);
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, 1.1);
      c *= mix(vec3(0.86, 0.92, 1.08), vec3(1.07, 1.0, 0.9), smoothstep(0.15, 0.7, l));
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
    }`,
});
const postScene = new THREE.Scene(); postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

function resize() {
  const w = container.clientWidth, h = container.clientHeight;
  renderer.setSize(w, h, false);
  let PIX = Math.max(2, Math.round(h / 420)); if (params.has('pix')) PIX = +params.get('pix');
  const lw = Math.ceil(w / PIX), lh = Math.ceil(h / PIX); rt.setSize(lw, lh); post.uniforms.res.value.set(lw, lh);
  const aspect = w / h, VIEW = aspect < 1 ? 16 / aspect : 15.5;
  camera.left = -VIEW * aspect; camera.right = VIEW * aspect; camera.top = VIEW; camera.bottom = -VIEW;
  if (params.has('zoom')) camera.zoom = +params.get('zoom');
  if (params.has('look')) { const [lx, lz] = params.get('look').split(',').map(Number); controls.target.set(lx, height(lx, lz) + 0.4, lz); camera.position.copy(controls.target).add(new THREE.Vector3().setFromSphericalCoords(90, THREE.MathUtils.degToRad(52), THREE.MathUtils.degToRad(35))); }
  post.uniforms.depthRange.value = camera.far - camera.near; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(container); resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime; uTime.value = reduce ? t * 0.3 : t;
  for (const m of fallers) { m.position.y -= dt * m.userData.v; m.position.x += Math.sin(t * 1.4 + m.userData.ph) * dt * 0.5; m.rotation.set(t * 2 + m.userData.ph, t * 1.3, t * 0.7); if (m.position.y < height(m.position.x, m.position.z) || !inside(m.position.x, m.position.z)) { m.position.set(rr(-10, 10), rr(8, 11), rr(-10, 10)); } }
  for (const f of fliers) {
    const u = f.userData, a = t * (u.df ? 0.9 : 0.45) + u.ph;
    const x = u.c.x + Math.cos(a) * u.r + Math.sin(a * 2.3) * 0.4, z = u.c.z + Math.sin(a * 1.3) * u.r;
    f.position.set(x, (u.df ? WATER_Y + 0.4 : height(x, z) + 0.8) + Math.sin(a * 3) * 0.2, z); f.rotation.y = -a;
    if (!u.df) { const flap = Math.sin(t * 18 + u.ph) * 0.9; u[-1].rotation.y = flap; u[1].rotation.y = -flap; }
  }
  updateAnimals(dt, t);
  updateCamera(dt);
  controls.update();
  renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(postScene, postCam);
});
document.body.classList.add('ready');
