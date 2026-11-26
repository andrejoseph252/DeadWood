// Plot 01 — a small realistic forest clearing.
// Trees: EZ-Tree by Daniel Greenheck (MIT).
// Ground textures and scanned models: Poly Haven (CC0), via the zuujis-cc0 GitHub mirrors.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { Tree } from '@dgreenheck/ez-tree';
import { simplex2d } from './noise.js';

const status = document.getElementById('status');
const setStatus = (t) => { status.textContent = t; status.hidden = !t; };
const frame = () => new Promise((r) => requestAnimationFrame(r));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LOW = matchMedia('(pointer: coarse)').matches; // phones and tablets get a lighter scene
const Q = LOW ? 0.45 : 1;

// ---------- seeded random and noise ----------
let seed = 20261126;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rr = (a, b) => a + (b - a) * rnd();
const pick = (a) => a[Math.floor(rnd() * a.length)];
const v2 = new THREE.Vector2();
const noise = (x, z) => simplex2d(v2.set(x, z)); // -1..1
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- terrain shape ----------
// 1 unit is about half a metre. The plot is the clearing within ~110 units of the centre.
function height(x, z) {
  let h = 4.5 * noise(x / 160, z / 160) + 1.6 * noise(x / 55 + 7, z / 55 - 3) + 0.35 * noise(x / 14, z / 14) + 0.08 * noise(x / 3, z / 3);
  h += Math.max(0, -z - 40) * 0.09;
  const r = Math.hypot(x, z);
  h *= 0.55 + 0.45 * Math.min(1, r / 60);
  return h - 0.35 * trailW(x, z); // the footpath is worn slightly into the ground
}
const trailCenter = (x) => 20 + 16 * Math.sin(x / 38) - x * 0.18 + 3 * noise(x / 20, 4.2);
function trailW(x, z) {
  const w = 2.3 + 0.8 * noise(x / 17, 9.1);
  return sstep(w, w * 0.35, Math.abs(z - trailCenter(x)));
}

// ---------- renderer, scene, camera ----------
const container = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 4000);
camera.position.set(58, 76, 70);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 8, 4);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 12;
controls.maxDistance = 230;
controls.minPolarAngle = 0.35;
controls.maxPolarAngle = 1.38;
controls.enablePan = false;
controls.autoRotate = !reduce;
controls.autoRotateSpeed = 0.18;
controls.addEventListener('start', () => { controls.autoRotate = false; });
{ // debug: ?cam=x,y,z,tx,ty,tz
  const m = location.search.match(/cam=([-\d.,]+)/);
  if (m) { const v = m[1].split(',').map(Number); camera.position.set(v[0], v[1], v[2]); controls.target.set(v[3], v[4], v[5]); controls.autoRotate = false; }
}

// ---------- sky, sun and image-based light ----------
const SUN_ELEV = 26, SUN_AZ = 100;
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - SUN_ELEV), THREE.MathUtils.degToRad(SUN_AZ));
const sky = new Sky();
sky.scale.setScalar(3000);
const su = sky.material.uniforms;
su.turbidity.value = 7; su.rayleigh.value = 1.4; su.mieCoefficient.value = 0.006; su.mieDirectionalG.value = 0.86;
su.sunPosition.value.copy(sunDir);
scene.add(sky);
{
  const pm = new THREE.PMREMGenerator(renderer);
  const skyScene = new THREE.Scene();
  skyScene.add(sky.clone());
  scene.environment = pm.fromScene(skyScene, 0.02).texture;
  scene.environmentIntensity = 0.55;
}
scene.fog = new THREE.FogExp2(0xc9b994, 0.0019);
const sun = new THREE.DirectionalLight(0xffd59e, 4.6);
sun.position.copy(sunDir).multiplyScalar(220);
sun.castShadow = true;
sun.shadow.mapSize.set(LOW ? 2048 : 4096, LOW ? 2048 : 4096);
Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 20, far: 520 });
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.5;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0xc9dcff, 0x5d5634, 0.6));
scene.add(new THREE.AmbientLight(0xfff4e0, 0.45));

// ---------- loaders ----------
const texLoader = new THREE.TextureLoader();
const gltf = new GLTFLoader();
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const tex = async (url, srgb = true) => {
  const t = await texLoader.loadAsync(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
};
// Each Poly Haven model is one self-contained glTF (.json). Its top-level nodes are variants.
// The page may not fetch data: URIs, so the geometry (base64 in the JSON) is unpacked here into a GLB;
// textures are ordinary .webp files next to it.
function toGLB(json) {
  const bins = (json.buffers || []).map((b) => Uint8Array.from(atob(b.uri.split(',')[1]), (c) => c.charCodeAt(0)));
  let total = 0;
  const offsets = bins.map((b) => { const o = total; total += Math.ceil(b.length / 4) * 4; return o; });
  const bin = new Uint8Array(total);
  bins.forEach((b, i) => bin.set(b, offsets[i]));
  for (const v of json.bufferViews || []) { v.byteOffset = (v.byteOffset || 0) + offsets[v.buffer || 0]; v.buffer = 0; }
  json.buffers = [{ byteLength: total }];
  let jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jlen = Math.ceil(jsonBytes.length / 4) * 4;
  const out = new Uint8Array(12 + 8 + jlen + 8 + total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
  dv.setUint32(12, jlen, true); dv.setUint32(16, 0x4E4F534A, true);
  out.fill(0x20, 20, 20 + jlen); out.set(jsonBytes, 20);
  dv.setUint32(20 + jlen, total, true); dv.setUint32(24 + jlen, 0x004E4942, true);
  out.set(bin, 28 + jlen);
  return out.buffer;
}
async function loadSet(name) {
  const json = await (await fetch(`models/${name}.json`)).json();
  const g = await gltf.parseAsync(toGLB(json), 'models/');
  return g.scene.children.map((n) => {
    n.position.set(0, 0, 0);
    n.updateMatrixWorld(true);
    const parts = [];
    n.traverse((o) => { if (o.isMesh) parts.push(o); });
    const box = new THREE.Box3().setFromObject(n);
    return { node: n, parts, minY: box.min.y };
  });
}

// ---------- wind for instanced plants ----------
const windTime = { value: 0 };
function addWind(material, strength) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <project_vertex>', `
      vec4 mvPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      vec3 wp = (modelMatrix * mvPosition).xyz;
      float ph = wp.x * 0.045 + wp.z * 0.03;
      float gust = 0.6 + 0.4 * sin(uTime * 0.35 + wp.x * 0.004);
      float hgt = max(position.y, 0.0);
      mvPosition.x += hgt * ${strength.toFixed(3)} * gust * sin(uTime * 1.3 + ph) * cos(uTime * 1.7 + ph * 1.3);
      mvPosition.z += hgt * ${(strength * 0.7).toFixed(3)} * gust * cos(uTime * 1.1 + ph);
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;`);
  };
}

// ---------- tree layout (decided first: the forest floor depends on where the canopies are) ----------
const CANOPY = { 'Pine Large': 13, 'Pine Medium': 10, 'Pine Small': 5, 'Aspen Small': 5, 'Aspen Medium': 9, 'Aspen Large': 11,
  'Ash Medium': 13, 'Ash Large': 15, 'Oak Medium': 12, 'Bush 1': 3, 'Bush 2': 3, 'Bush 3': 2.5 };
const plan = [];
const placed = [];
const free = (x, z, d) => placed.every((p) => Math.hypot(p.x - x, p.z - z) > Math.max(d, p.d));
const addAt = (preset, x, z, s = 1, d = 12) => { placed.push({ x, z, d }); plan.push({ preset, x, z, s, canopy: CANOPY[preset] * s }); };
addAt('Pine Large', -6, 4, 1.0, 16);
addAt('Pine Small', 22, -18, 0.9);
addAt('Pine Medium', -34, -8, 0.85);
addAt('Pine Small', 14, 36, 0.9);
addAt('Bush 1', -18, 30, 1.1, 8);
addAt('Bush 2', 30, 4, 0.9, 8);
addAt('Bush 3', -30, 34, 0.8, 8);
addAt('Pine Small', -12, -34, 0.8);
const ring = (n, rMin, rMax, presets, d, sMin, sMax) => {
  let made = 0, tries = 0;
  while (made < n && tries++ < n * 80) {
    const a = rnd() * Math.PI * 2, r = rMin + (rMax - rMin) * Math.sqrt(rnd());
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.9 - 10;
    if (!free(x, z, d) || trailW(x, z) > 0.02) continue;
    addAt(pick(presets), x, z, rr(sMin, sMax), d); made++;
  }
};
ring(26, 46, 95, ['Pine Medium', 'Pine Large', 'Pine Medium', 'Aspen Medium', 'Ash Medium', 'Pine Small', 'Oak Medium'], 15, 0.85, 1.15);
ring(10, 40, 90, ['Bush 1', 'Bush 2', 'Bush 3'], 9, 0.7, 1.2);
ring(70, 95, 330, ['Pine Large', 'Pine Medium', 'Pine Large', 'Aspen Large', 'Ash Large'], 16, 0.9, 1.3);

// ---------- what covers the ground where ----------
// litter: needles and dead leaves under canopies; dirt: bare, pebbly patches; trail: the worn footpath.
function cover(x, z) {
  let shade = 0;
  const wob = 1 + 0.35 * noise(x / 6, z / 6) + 0.15 * noise(x / 2, z / 2);
  for (const p of plan) {
    const d = Math.hypot(x - p.x, z - p.z) * wob;
    if (d < p.canopy * 1.8) shade = Math.max(shade, sstep(p.canopy * 1.45, p.canopy * 0.3, d) * Math.min(1, p.canopy / 9));
  }
  const n1 = noise(x / 9 + 3, z / 9), n2 = noise(x / 3.5, z / 3.5 + 7);
  const litter = Math.min(1, Math.max(0, shade * (0.85 + 0.45 * n1) - 0.15 + 0.18 * n2 + 0.3 * sstep(0.2, 0.8, noise(x / 60 - 4, z / 60))));
  const dirtN = 0.5 + 0.5 * noise(x / 42, z / 42) + 0.16 * noise(x / 8, z / 8) + 0.1 * n2 + 0.08 * noise(x / 1.6, z / 1.6);
  const dirt = sstep(0.74, 0.86, dirtN) * (1 - 0.7 * shade);
  const trail = Math.min(1, trailW(x, z) * (0.9 + 0.25 * n2 + 0.2 * noise(x / 1.5, z / 1.5)));
  return [litter, dirt, trail];
}

// ---------- ground material: 4 scanned layers, height-blended, no visible tiling ----------
const SPLAT_SIZE = 440, SPLAT_RES = 640;
function makeSplat() {
  const data = new Uint8Array(SPLAT_RES * SPLAT_RES * 4);
  for (let j = 0; j < SPLAT_RES; j++) for (let i = 0; i < SPLAT_RES; i++) {
    const x = -SPLAT_SIZE / 2 + (i + 0.5) / SPLAT_RES * SPLAT_SIZE;
    const z = -SPLAT_SIZE / 2 + (j + 0.5) / SPLAT_RES * SPLAT_SIZE;
    const [l, d, t] = cover(x, z);
    const k = (j * SPLAT_RES + i) * 4;
    data[k] = l * 255; data[k + 1] = d * 255; data[k + 2] = t * 255; data[k + 3] = 255;
  }
  const t = new THREE.DataTexture(data, SPLAT_RES, SPLAT_RES, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

function groundMaterial(layers, splat) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, envMapIntensity: 0.7 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uSplat: { value: splat }, uSplatSize: { value: SPLAT_SIZE },
      uC0: { value: layers[0].c }, uN0: { value: layers[0].n },
      uC1: { value: layers[1].c }, uN1: { value: layers[1].n },
      uC2: { value: layers[2].c }, uN2: { value: layers[2].n },
      uC3: { value: layers[3].c }, uN3: { value: layers[3].n },
      uTile: { value: new THREE.Vector4(6.0, 5.0, 6.5, 5.5) },
    });
    shader.vertexShader = 'varying vec3 vWP; varying vec3 vWN;\n' + shader.vertexShader
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWN = normalize(mat3(modelMatrix) * objectNormal);`);
    shader.fragmentShader = `
      varying vec3 vWP; varying vec3 vWN;
      uniform sampler2D uSplat; uniform float uSplatSize;
      uniform sampler2D uC0, uC1, uC2, uC3, uN0, uN1, uN2, uN3;
      uniform vec4 uTile;
      float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y); }
      // Two differently rotated/offset samples blended by a slow noise hide the texture's repeat.
      mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
      vec4 g_c; vec4 g_n;
      void sampleLayer(sampler2D C, sampler2D N, vec2 p, float tile, float seed, float m, out vec4 c, out vec4 n){
        vec2 uvA = p / tile;
        vec2 uvB = rot(1.7 + seed) * (p / (tile * 1.31)) + vec2(0.37, 0.71) * seed;
        vec4 cA = texture2D(C, uvA), cB = texture2D(C, uvB);
        vec4 nA = texture2D(N, uvA), nB = texture2D(N, uvB);
        // rotate the second sample's normal back into world orientation
        vec2 nbxy = nB.xy * 2.0 - 1.0; nbxy = transpose(rot(1.7 + seed)) * nbxy; nB.xy = nbxy * 0.5 + 0.5;
        c = mix(cA, cB, m); n = mix(nA, nB, m);
      }
      ` + shader.fragmentShader
      .replace('#include <map_fragment>', `
        vec2 p = vec2(vWP.x, -vWP.z);
        float macro = vnoise(vWP.xz / 23.0) * 0.6 + vnoise(vWP.xz / 7.0) * 0.4;
        float m = smoothstep(0.3, 0.7, vnoise(vWP.xz / 13.0 + 5.0));
        vec2 suv = vWP.xz / uSplatSize + 0.5;
        vec3 sp = texture2D(uSplat, suv).rgb;
        float inside = 1.0 - smoothstep(0.46, 0.5, max(abs(suv.x - 0.5), abs(suv.y - 0.5)));
        sp = mix(vec3(0.75, 0.0, 0.0), sp, inside);   // beyond the mapped area: forest floor
        vec4 c0, c1, c2, c3, n0, n1, n2, n3;
        sampleLayer(uC0, uN0, p, uTile.x, 0.0, m, c0, n0);
        sampleLayer(uC1, uN1, p, uTile.y, 1.0, m, c1, n1);
        sampleLayer(uC2, uN2, p, uTile.z, 2.0, m, c2, n2);
        sampleLayer(uC3, uN3, p, uTile.w, 3.0, m, c3, n3);
        // layer weights, then height-based blending so stones and leaves poke through edges
        vec4 w = vec4(1.0, sp.r, sp.g, sp.b);
        w.yzw = clamp(w.yzw, 0.0, 1.0);
        w.x = max(0.0, 1.0 - max(max(w.y, w.z), w.w));
        vec4 hgt = vec4(c0.a, c1.a, c2.a, c3.a);
        vec4 hw = w * 1.3 + hgt * 0.4 * step(0.001, w);
        float ma = max(max(hw.x, hw.y), max(hw.z, hw.w)) - 0.32;
        vec4 b = max(hw - ma, 0.0);
        b /= max(dot(b, vec4(1.0)), 1e-4);
        float dryN = smoothstep(0.25, 0.75, vnoise(vWP.xz / 38.0 + 17.0) * 0.7 + vnoise(vWP.xz / 11.0) * 0.3);
        vec3 grassC = c0.rgb * mix(vec3(0.82, 0.9, 0.7), vec3(1.3, 1.12, 0.78), dryN);
        vec3 albedo = grassC * b.x + c1.rgb * vec3(0.9, 0.84, 0.78) * b.y + c2.rgb * vec3(0.84, 0.74, 0.62) * b.z + c3.rgb * vec3(0.8, 0.71, 0.6) * b.w;
        albedo *= 0.78 + 0.42 * macro;
        vec4 nn = n0 * b.x + n1 * b.y + n2 * b.z + n3 * b.w;
        g_c = vec4(albedo, 1.0); g_n = nn;
        diffuseColor.rgb *= albedo;`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(0.25 + g_n.b * 0.85, 0.78, 1.0);')
      .replace('#include <normal_fragment_maps>', `
        {
          vec3 tn; tn.xy = (g_n.xy * 2.0 - 1.0) * 1.35; tn.z = sqrt(max(1.0 - dot(tn.xy, tn.xy), 0.0));
          vec3 N = normalize(vWN);
          vec3 T = normalize(vec3(1.0, 0.0, 0.0) - N * N.x);
          vec3 B = normalize(cross(N, T));
          vec3 wn = normalize(T * tn.x + B * tn.y + N * tn.z);
          normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
        }`)
      .replace('#include <aomap_fragment>', `
        float aoT = mix(1.0, g_n.a, 0.85);
        reflectedLight.indirectDiffuse *= aoT;
        reflectedLight.indirectSpecular *= aoT;
        reflectedLight.directDiffuse *= mix(1.0, aoT, 0.45);`);
  };
  return mat;
}

// ---------- scatter scanned models as instances ----------
function scatter(variants, count, accept, opts = {}) {
  const { scale = [1, 1], sink = 0, tilt = 0.08, radius = 115, cast = true, wind = 0, yaw = true } = opts;
  const groups = variants.map(() => []);
  let made = 0, tries = 0;
  while (made < count && tries++ < count * 200) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * radius;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!accept(x, z)) continue;
    groups[Math.floor(rnd() * variants.length)].push([x, z, rr(scale[0], scale[1])]);
    made++;
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), pos = new THREE.Vector3();
  variants.forEach((v, vi) => {
    const list = groups[vi];
    if (!list.length) return;
    for (const part of v.parts) {
      if (wind) addWind(part.material, wind);
      const im = new THREE.InstancedMesh(part.geometry, part.material, list.length);
      list.forEach(([x, z, k], i) => {
        e.set(rr(-tilt, tilt), yaw ? rnd() * Math.PI * 2 : 0, rr(-tilt, tilt));
        q.setFromEuler(e);
        s.setScalar(k);
        pos.set(x, height(x, z) - v.minY * k - sink * k, z);
        m.compose(pos, q, s).multiply(part.matrixWorld);
        im.setMatrixAt(i, m);
      });
      im.castShadow = cast;
      im.receiveShadow = true;
      scene.add(im);
    }
  });
}
// place one model variant at an exact spot
function place(v, x, z, k, yawA, sink = 0, tiltX = 0, tiltZ = 0) {
  const g = v.node.clone();
  g.scale.setScalar(k);
  g.rotation.set(tiltX, yawA, tiltZ);
  g.position.set(x, height(x, z) - v.minY * k - sink, z);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  scene.add(g);
  return g;
}

async function build() {
  setStatus('Loading ground…');
  const L = (n) => Promise.all([tex(`tex_${n}_c.webp`), tex(`tex_${n}_n.webp`, false)]).then(([c, n2]) => ({ c, n: n2 }));
  const [layers, barkTex, barkNormal] = await Promise.all([
    Promise.all(['grass', 'litter', 'dirt', 'trail'].map(L)),
    tex('pine_color_1k.jpg'), tex('pine_normal_1k.jpg', false),
  ]);
  const splat = makeSplat();
  await frame();

  const gGeo = new THREE.PlaneGeometry(1400, 1400, 480, 480);
  gGeo.rotateX(-Math.PI / 2);
  const gp = gGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setY(i, height(gp.getX(i), gp.getZ(i)));
  gGeo.computeVertexNormals();
  const ground = new THREE.Mesh(gGeo, groundMaterial(layers, splat));
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- trees ----------
  const variants = {};
  const presetNames = [...new Set(plan.map((p) => p.preset))];
  const VARIANTS = 3;
  let done = 0;
  const total = presetNames.length * VARIANTS;
  for (const name of presetNames) {
    variants[name] = [];
    for (let i = 0; i < VARIANTS; i++) {
      const t = new Tree();
      t.loadPreset(name);
      t.options.seed = Math.floor(rnd() * 100000);
      if (name.startsWith('Pine')) t.options.leaves.tint = 0xf2f6e0;
      if (name.startsWith('Aspen') || name.startsWith('Ash')) t.options.leaves.tint = 0xfff2c0;
      t.generate();
      t.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      variants[name].push(t);
      setStatus(`Growing trees… ${Math.round((++done / total) * 100)}%`);
      await frame();
    }
  }
  const TARGET = { 'Pine Large': 50, 'Pine Medium': 38, 'Pine Small': 18, 'Aspen Small': 16, 'Aspen Medium': 34, 'Aspen Large': 44,
    'Ash Medium': 34, 'Ash Large': 44, 'Oak Medium': 30, 'Bush 1': 5.5, 'Bush 2': 5, 'Bush 3': 4 };
  const box = new THREE.Box3(), size = new THREE.Vector3();
  const base = new Map();
  for (const [name, list] of Object.entries(variants)) for (const v of list) {
    box.setFromObject(v).getSize(size);
    base.set(v, (TARGET[name] || 30) / Math.max(size.y, 1));
  }
  for (const p of plan) {
    const src = pick(variants[p.preset]);
    const t = src.clone();
    t.position.set(p.x, height(p.x, p.z) - 0.3, p.z);
    t.rotation.y = rnd() * Math.PI * 2;
    t.scale.setScalar(p.s * base.get(src));
    scene.add(t);
  }

  // ---------- scanned ground detail ----------
  setStatus('Scattering the forest floor…');
  const [grassClumps, ferns, celandine, branches, bark, pebbles, mossA, mossB, boulder, trunk, stump, roots] = await Promise.all(
    ['grass_medium_02', 'fern_02', 'celandine_01', 'dry_branches_medium_01', 'bark_debris_01', 'stone_01',
      'rock_moss_set_01', 'rock_moss_set_02', 'boulder_01', 'dead_tree_trunk_02', 'tree_stump_01', 'pine_roots'].map(loadSet));
  await frame();
  const M = 2; // models are in metres; the world is in half-metres
  const nearTree = (x, z, f = 0.25) => plan.some((p) => p.preset.startsWith('Pine') || p.preset.startsWith('Ash') || p.preset.startsWith('Oak') || p.preset.startsWith('Aspen') ? Math.hypot(x - p.x, z - p.z) < p.canopy * f : false);

  // focal pieces, set by hand
  place(roots[0], -6, 4, M * 1.9, 0.4, 0.12);
  place(roots[1], -6, 4, M * 1.7, 2.6, 0.12);
  place(trunk[0], -27, 18, M * 1.0, 0.75, 0.55, 0, 0.03);
  place(stump[0], 15, 31, M * 0.75, 1.2, 0.15);
  place(stump[0], -19, -15, M * 0.9, 3.4, 0.15);
  place(boulder[0], -40, -2, M * 2.2, 0.9, 1.0);
  const rocks = [...mossA, ...mossB];
  [[-31, -5, 1.0], [-44, 6, 0.8], [34, -28, 1.1], [44, -4, 0.9], [-8, 40, 0.7], [-52, -30, 1.3], [8, -46, 0.9], [26, 44, 0.8], [-62, 18, 1.0], [58, 22, 1.1], [-20, -52, 0.9], [62, -40, 1.0]]
    .forEach(([x, z, k], i) => { while (trailW(x, z) > 0 || trailW(x, z + 4) > 0 || trailW(x, z - 4) > 0) z += 3; place(rocks[i % rocks.length], x, z, M * k, rnd() * 6.28, 0.6 * k); });

  // living layer
  scatter(ferns, 110, (x, z) => { const [l, d, t] = cover(x, z); return l > 0.45 && t < 0.05 && d < 0.3 && !nearTree(x, z, 0.12); },
    { scale: [M * 2.2, M * 3.6], wind: 0.25, sink: 0.02 });
  for (const set of [grassClumps, celandine]) set.forEach((v) => v.parts.forEach((p) => { Object.assign(p.material, { transparent: false, alphaTest: 0.45, depthWrite: true, side: THREE.DoubleSide }); }));
  grassClumps.forEach((v) => v.parts.forEach((p) => { p.material.color.setRGB(0.8, 0.78, 0.62); p.material.envMapIntensity = 0.5; }));
  scatter(grassClumps, Math.round(3600 * Q), (x, z) => { const [l, d, t] = cover(x, z); return l < 0.4 && d < 0.3 && t < 0.1 && rnd() < 0.25 + 0.75 * sstep(-0.2, 0.5, noise(x / 14 + 2, z / 14)); },
    { scale: [M * 1.8, M * 3.0], wind: 0.5, cast: false, radius: 125 });
  scatter(celandine, 260, (x, z) => { const [l, d, t] = cover(x, z); return l > 0.2 && l < 0.7 && t < 0.05 && noise(x / 18, z / 18) > 0.25; },
    { scale: [M * 1.4, M * 2.0], wind: 0.5, cast: false });
  // dead material
  scatter(branches, 70, (x, z) => { const [l, , t] = cover(x, z); return l > 0.35 && t < 0.2; }, { scale: [M * 0.8, M * 1.3], tilt: 0.04 });
  scatter(bark, 45, (x, z) => { const [l, , t] = cover(x, z); return l > 0.5 && t < 0.2; }, { scale: [M * 0.8, M * 1.2], tilt: 0.04, cast: false });
  pebbles.forEach((v) => v.parts.forEach((p) => p.material.color.setRGB(0.55, 0.56, 0.56)));
  ferns.forEach((v) => v.parts.forEach((p) => p.material.color.setRGB(0.72, 0.74, 0.5)));
  scatter(pebbles, Math.round(650 * Q), (x, z) => { const [l, d, t] = cover(x, z); return d + t > 0.35 && l < 0.5; },
    { scale: [M * 0.8, M * 2.6], sink: 0.02, tilt: 0.6, cast: false });

  // ---------- fine grass blades (procedural, wind-blown) to soften the open ground ----------
  const tuft = (() => {
    const p = [], c = [], idx = [];
    for (let b = 0; b < 6; b++) {
      const a = rnd() * Math.PI * 2, lean = rr(0.2, 0.7), hgt = rr(0.35, 0.75), w = rr(0.025, 0.04);
      const ox = Math.cos(a) * rr(0, 0.2), oz = Math.sin(a) * rr(0, 0.2), dx = Math.cos(a), dz = Math.sin(a);
      const k0 = p.length / 3;
      for (let i = 0; i <= 2; i++) {
        const t = i / 2, bend = lean * t * t * hgt, y = hgt * t, hw = w * (1 - t * 0.92);
        const cx = ox + dx * bend, cz = oz + dz * bend;
        p.push(cx + dz * hw, y, cz - dx * hw, cx - dz * hw, y, cz + dx * hw);
        const v = 0.24 + 0.34 * t;
        c.push(v, v, v, v, v, v);
        if (i < 2) { const k = k0 + i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(p.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setIndex(idx);
    return g;
  })();
  const bladeMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.95, envMapIntensity: 0.45 });
  addWind(bladeMat, 0.16);
  const BLADES = Math.round(48000 * Q);
  const blades = new THREE.InstancedMesh(tuft, bladeMat, BLADES);
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  let bi = 0;
  for (let i = 0; i < BLADES * 5 && bi < BLADES; i++) {
    const a = rnd() * Math.PI * 2, r = 3 + Math.sqrt(rnd()) * 130;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const [l, d, t] = cover(x, z);
    if (rnd() < l * 1.4 + d * 1.8 + t * 4) continue;
    if (rnd() < 0.35 * (0.5 + 0.5 * noise(x / 7 + 1, z / 7))) continue;
    dummy.position.set(x, height(x, z) - 0.05, z);
    dummy.rotation.set(0, rnd() * Math.PI * 2, 0);
    const k = rr(0.7, 1.25) * (0.75 + 0.5 * (0.5 + 0.5 * noise(x / 25, z / 25)));
    dummy.scale.set(k, k, k);
    dummy.updateMatrix();
    blades.setMatrixAt(bi, dummy.matrix);
    const dry = 0.5 + 0.5 * noise(x / 33 + 11, z / 33);
    { const dryN = 0.5 + 0.5 * (0.7 * noise(x / 38 + 17, z / 38) + 0.3 * noise(x / 11, z / 11)); col.setRGB(rr(0.4, 0.48) + dryN * 0.22, rr(0.38, 0.44) + dryN * 0.08, rr(0.12, 0.16)); }
    blades.setColorAt(bi++, col);
  }
  blades.count = bi;
  blades.receiveShadow = true;
  scene.add(blades);

  // ---------- log pile ----------
  barkTex.repeat.set(2, 3); barkNormal.repeat.set(2, 3);
  const barkMat = new THREE.MeshStandardMaterial({ map: barkTex, normalMap: barkNormal, roughness: 0.95, color: 0xb9a58c });
  const ecv = document.createElement('canvas'); ecv.width = ecv.height = 256;
  { const g = ecv.getContext('2d'); const gr = g.createRadialGradient(128, 128, 4, 128, 128, 128);
    gr.addColorStop(0, '#8a6a42'); gr.addColorStop(0.15, '#b38e5e'); gr.addColorStop(0.85, '#a7814f'); gr.addColorStop(0.93, '#5d4128'); gr.addColorStop(1, '#3d2a1a');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    for (let r = 6; r < 118; r += 3 + Math.random() * 5) { g.strokeStyle = `rgba(70,45,20,${0.12 + Math.random() * 0.18})`; g.lineWidth = 1 + Math.random(); g.beginPath(); g.ellipse(128 + Math.random() * 3, 128 + Math.random() * 3, r, r * (0.96 + Math.random() * 0.06), Math.random(), 0, Math.PI * 2); g.stroke(); }
    for (let i = 0; i < 9; i++) { const a = Math.random() * Math.PI * 2; g.strokeStyle = 'rgba(50,32,15,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(128 + Math.cos(a) * 20, 128 + Math.sin(a) * 20); g.lineTo(128 + Math.cos(a) * (60 + Math.random() * 50), 128 + Math.sin(a) * (60 + Math.random() * 50)); g.stroke(); } }
  const endTex = new THREE.CanvasTexture(ecv); endTex.colorSpace = THREE.SRGBColorSpace;
  const cutMat = new THREE.MeshStandardMaterial({ map: endTex, roughness: 0.9, color: 0xb8a690 });
  const pile = new THREE.Group();
  [7, 6, 5].forEach((n, row) => {
    for (let i = 0; i < n; i++) {
      const r = rr(0.36, 0.46);
      const log = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, 9 * rr(0.94, 1.04), 18, 1), [barkMat, cutMat, cutMat]);
      log.rotation.z = Math.PI / 2;
      log.rotation.x = rr(-0.02, 0.02);
      log.position.set(rr(-0.3, 0.3), 0.42 + row * 0.72, (i - (n - 1) / 2) * 0.86);
      log.castShadow = log.receiveShadow = true;
      pile.add(log);
    }
  });
  pile.position.set(24, height(24, 10) - 0.05, 10);
  pile.rotation.y = -0.55;
  scene.add(pile);

  // ---------- drifting dust in the light ----------
  const DUST = 400, dp = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) dp.set([rr(-80, 80), rr(2, 45), rr(-80, 80)], i * 3);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const cx = cv.getContext('2d'), grd = cx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,240,210,1)'); grd.addColorStop(1, 'rgba(255,240,210,0)');
  cx.fillStyle = grd; cx.fillRect(0, 0, 32, 32);
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.35, map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  window.__plot = { scene, camera, controls };
  return { variants, dust, dp };
}

// ---------- post-processing: ambient occlusion grounds everything ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const ao = new GTAOPass(scene, camera, 1, 1);
ao.output = GTAOPass.OUTPUT.Default;
ao.blendIntensity = 0.85;
ao.updateGtaoMaterial({ radius: 2.5, distanceExponent: 1.5, thickness: 2.0, scale: 1.0, samples: 16, distanceFallOff: 1.0, screenSpaceRadius: false });
ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
const AO_ON = !LOW && !location.search.includes('noao');
if (AO_ON) composer.addPass(ao);
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.16, 0.6, 0.92);
composer.addPass(bloom);
const smaa = new SMAAPass(1, 1);
composer.addPass(smaa);
composer.addPass(new OutputPass());

function resize() {
  const w = container.clientWidth, h = container.clientHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  ao.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = Math.max(42, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(21)) * 1.25 / camera.aspect)) * 0.85);
  camera.updateProjectionMatrix();
}
const ro = new ResizeObserver(resize);
ro.observe(container);
resize();

build().then(({ variants, dust, dp }) => {
  setStatus('');
  document.body.classList.add('ready');
  const clock = new THREE.Clock();
  const speed = reduce ? 0.35 : 1;
  const all = Object.values(variants).flat();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime * speed;
    windTime.value = t;
    for (const v of all) v.update(t);
    for (let i = 0; i < dp.length; i += 3) {
      dp[i] += Math.sin(t * 0.3 + i) * dt * 0.4;
      dp[i + 1] += dt * 0.25 * speed;
      if (dp[i + 1] > 45) dp[i + 1] = 2;
    }
    dust.geometry.attributes.position.needsUpdate = true;
    controls.update();
    composer.render();
  });
}).catch((e) => {
  console.error(e);
  setStatus('Something went wrong while building the scene. Try reloading.');
});
