// Canopy cutaway: tree crowns dissolve inside a circle around a point (the cursor, the animal you follow, or the
// view centre) with an ordered-dither edge that suits the pixel-art look. The radius grows as you zoom in, so
// zoomed out you see the canopy and close up you see the forest floor. Shadows are untouched (the crowns' depth
// materials are not patched), so the floor keeps the canopy's shade. Ground rings ("crown outlines") use the
// inverse: they show only inside the cut, so you keep the "under that beech" context.
import * as THREE from 'three';

export const CUT = { uCutC: { value: new THREE.Vector3(0, -1e4, 0) }, uCutR: { value: 0 } };

const VERT = `
  vec4 cutW = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    cutW = instanceMatrix * cutW;
  #endif
  vCutW = (modelMatrix * cutW).xyz;`;
// 4x4 Bayer threshold on the (low-resolution) pixel grid
const BAYER = `
  float cutBayer(vec2 p) {
    ivec2 q = ivec2(mod(p, 4.0));
    int i = q.x + q.y * 4;
    int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
    return (float(m[i]) + 0.5) / 16.0;
  }`;

// mode 'crown': hide inside the circle (above ~2 m over the ground there); mode 'ring': show only inside
export function cutaway(mat, mode = 'crown') {
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey?.bind(mat);
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    sh.uniforms.uCutC = CUT.uCutC; sh.uniforms.uCutR = CUT.uCutR;
    sh.vertexShader = 'varying vec3 vCutW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>' + VERT);
    const test = mode === 'crown'
      ? 'float cutA = uCutR > 0.0 ? smoothstep(uCutR, uCutR * 0.62, length(vCutW.xz - uCutC.xz)) * step(uCutC.y + 1.8, vCutW.y) : 0.0; if (cutA > cutBayer(gl_FragCoord.xy)) discard;'
      : 'float cutA = uCutR > 0.0 ? smoothstep(uCutR * 1.02, uCutR * 0.7, length(vCutW.xz - uCutC.xz)) : 0.0; if (cutA <= cutBayer(gl_FragCoord.xy)) discard;';
    sh.fragmentShader = 'varying vec3 vCutW;\nuniform vec3 uCutC;\nuniform float uCutR;\n' + BAYER + '\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n' + test);
  };
  mat.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|cut-' + mode;
  mat.needsUpdate = true;
  return mat;
}
