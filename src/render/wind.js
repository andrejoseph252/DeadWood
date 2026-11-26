// Wind: travelling gust waves added in the vertex shader. Also turns quads into camera-facing billboards.
export const uTime = { value: 0 };

export function windify(mat, { billboard = false, strength = 0.12, grass = false } = {}) {
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
