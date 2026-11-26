// Stylised toon water, shared by the estate's brooks and pond and by Plot 01's stream, pools and puddle.
// One material for every water mesh; per-vertex data says what the water is like there:
//   aFlow = (s, across, speed, rough): metres along and across the flow (still water: world x, z), how fast it runs
//           downstream (0 = still) and how broken it is (riffles, spills);
//   aWet  = (depth, foam): water depth over the ground at that vertex (negative where the bank rises above it,
//           which is hidden under the ground) and white water (0..1); foam -1 marks a cut-face cross-section.
// The look: depth bands from clear golden shallows to dark pools, the warm evening sky and the canopy reflected,
// flow lines drifting downstream, foam round stones and spills, a pale line at the water's edge, and sun sparkles
// only where the surface is in sunlight (it takes the toon light and the tree shadows like the ground does).
// All motion is in the shader from uTime (src/render/wind.js), which stays 0 under ?still, so stills are frozen.
import * as THREE from 'three';
import { toon } from './materials.js';
import { uTime } from './wind.js';

const col = (h) => ({ value: new THREE.Color(h) });
const U = {
  uTime,
  uShallow: col('#8a7f55'), uMid: col('#3c6a66'), uDeep: col('#1a3a42'),
  uSky: col('#9cbfd6'), uGold: col('#f0c88c'), uCanopy: col('#203320'),
  uLine: col('#cfe4dc'), uFoam: col('#eef2e6'), uEdge: col('#b8c49a'), uSpark: col('#fff3d2'),
};

let shared = null;
export function waterMaterial() {
  if (shared) return shared;
  const m = toon({ color: 0xffffff, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'attribute vec4 aFlow;\nattribute vec2 aWet;\nvarying vec4 vFlow;\nvarying vec2 vWet;\nvarying vec3 vWPos;\n' + sh.vertexShader
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlow = aFlow; vWet = aWet; vWPos = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = `uniform float uTime; uniform vec3 uShallow, uMid, uDeep, uSky, uGold, uCanopy, uLine, uFoam, uEdge, uSpark;
varying vec4 vFlow; varying vec2 vWet; varying vec3 vWPos;
float wh(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float wn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wh(i), wh(i + vec2(1.0, 0.0)), f.x), mix(wh(i + vec2(0.0, 1.0)), wh(i + vec2(1.0, 1.0)), f.x), f.y); }
` + sh.fragmentShader
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
        float wd = vWet.x, sect = step(vWet.y, -0.5);
        float wk = clamp(wd / 0.9, 0.0, 1.0);
        wk = mix(floor(wk * 4.0 + 0.35) / 4.0, clamp(wd / 0.7, 0.0, 1.0), sect);   // depth in crisp bands; a cut face shades smoothly
        vec3 body = mix(uShallow, uMid, smoothstep(0.0, 0.5, wk));
        body = mix(body, uDeep, smoothstep(0.45, 1.0, wk));
        vec4 diffuseColor = vec4(body, opacity);`)
      .replace('#include <opaque_fragment>', `
        {
          float lum0 = max(dot(diffuseColor.rgb, vec3(0.3333)), 1e-3);
          float lit = smoothstep(0.25, 0.65, dot(reflectedLight.directDiffuse, vec3(0.3333)) / lum0 * 3.14159 / 2.9);
          float sp = vFlow.z, rough = vFlow.w, run = step(0.001, sp), t = uTime;
          vec2 fq = vec2(vFlow.x - t * sp, vFlow.y);
          // the sky and the canopy reflected: warm cloud patches in the open, dark leaves in the shade
          float cloud = wn(vWPos.xz * 0.045 + vec2(t * 0.01, 0.0)) * 0.7 + wn(vWPos.xz * 0.11) * 0.3;
          vec3 refl = mix(uSky, uGold, smoothstep(0.5, 0.72, cloud));
          refl = mix(uCanopy, refl, 0.25 + 0.75 * lit);
          float R = mix(0.34, 0.24, run) * (1.0 - sect);
          vec3 c = mix(outgoingLight, refl, R);
          // flow lines drifting downstream (still water: faint wind ripples)
          float st = wn(fq * vec2(0.8, 3.4)) * 0.62 + wn(fq * vec2(1.7, 6.0) + 3.1) * 0.38;
          float lines = smoothstep(0.69 - rough * 0.2, 0.72 - rough * 0.2, st) * run;
          float rip = smoothstep(0.80, 0.83, wn(vWPos.xz * vec2(0.9, 2.2) + vec2(t * 0.12, t * 0.05))) * (1.0 - run);
          c = mix(c, uLine, (lines * 0.75 + rip * 0.45) * (0.45 + 0.55 * lit) * (1.0 - sect));
          // white water: round stones, over riffles and spills
          float fn = wn(vec2(fq.x * 1.9, fq.y * 3.0)) * 0.6 + wn(vec2(fq.x * 4.1, fq.y * 5.0) + 7.0) * 0.4;
          float foam = step(0.55, vWet.y * (0.55 + 0.75 * fn)) + step(0.9 - rough * 0.16, fn) * step(0.35, rough);
          c = mix(c, uFoam, clamp(foam, 0.0, 1.0) * (1.0 - sect) * (0.75 + 0.25 * lit));
          // a pale line where the water meets the bank
          float edge = 1.0 - smoothstep(0.0, fwidth(wd) * 1.6 + 0.004, wd);
          c = mix(c, uEdge * (0.6 + 0.4 * lit), edge * 0.65 * (1.0 - sect));
          // sun sparkles, only in sunlight
          vec2 sq = run > 0.5 ? vec2(fq.x * 2.2, fq.y * 2.6) : vWPos.xz * 1.4 + vec2(floor(t * 2.0) * 3.7, 0.0);
          float spark = step(mix(0.975, 0.955, run * rough + (1.0 - run) * 0.2), wh(floor(sq))) * step(0.5, wn(sq * 0.5 + 9.0)) * lit * (1.0 - sect);
          c = mix(c, uSpark, spark);
          // a cut face: the top of the water, then darker with depth
          c = mix(c, c * (1.0 - 0.35 * clamp(wd / 0.8, 0.0, 1.0)), sect);
          outgoingLight = c;
        }
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'deadwood-water-1';
  shared = m;
  return m;
}

// Attribute names and sizes of a water mesh (positions plus these two)
export const WATER_ATTRS = { aFlow: 4, aWet: 2 };
export function waterGeometry({ pos, flow, wet, idx }) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aFlow', new THREE.BufferAttribute(flow, 4));
  g.setAttribute('aWet', new THREE.BufferAttribute(wet, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}
