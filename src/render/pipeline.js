// The pixel-art pipeline: render the scene into a low-resolution target, then a post pass
// upscales it nearest-neighbour with depth outlines, a background and a colour grade.
import * as THREE from 'three';

const postVertex = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const postFragment = `
  uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 res; uniform vec2 sub; uniform float depthRange; varying vec2 vUv;
  float D(vec2 uv){ return texture2D(tDepth, uv).r; }
  void main(){
    // sub: the camera's sub-pixel remainder (the scene is rendered from a camera snapped to the pixel grid, so it
    // does not shimmer); shifting the lookup by it keeps motion smooth
    vec2 px = 1.0 / res; vec2 uv = (floor(vUv * res + sub) + 0.5) * px;
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
  }`;

export function createPipeline(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();

  const rt = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type: THREE.HalfFloatType });
  rt.depthTexture = new THREE.DepthTexture(2, 2); rt.depthTexture.type = THREE.UnsignedIntType;

  const post = new THREE.ShaderMaterial({
    uniforms: { tColor: { value: rt.texture }, tDepth: { value: rt.depthTexture }, res: { value: new THREE.Vector2(1, 1) }, sub: { value: new THREE.Vector2(0, 0) }, depthRange: { value: 300 } },
    vertexShader: postVertex,
    fragmentShader: postFragment,
  });
  const postScene = new THREE.Scene(); postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // w, h: canvas size in CSS px; pix: screen pixels per art pixel
  function setSize(w, h, pix, camera) {
    renderer.setSize(w, h, false);
    const lw = Math.ceil(w / pix), lh = Math.ceil(h / pix); rt.setSize(lw, lh); post.uniforms.res.value.set(lw, lh);
    post.uniforms.depthRange.value = camera.far - camera.near;
  }

  // Pixel snapping: an orthographic camera that moves by less than one art pixel makes every edge crawl. Render
  // from the camera moved onto the art-pixel grid (along its own right and up axes), then shift the upscale by
  // the remainder, so the image moves smoothly without shimmer.
  const R = new THREE.Vector3(), U = new THREE.Vector3(), keep = new THREE.Vector3();
  function render(camera) {
    camera.updateMatrixWorld();
    R.setFromMatrixColumn(camera.matrixWorld, 0); U.setFromMatrixColumn(camera.matrixWorld, 1);
    const res = post.uniforms.res.value, upp = (camera.top - camera.bottom) / camera.zoom / res.y;
    const a = camera.position.dot(R) / upp, b = camera.position.dot(U) / upp, fa = a - Math.round(a), fb = b - Math.round(b);
    keep.copy(camera.position); camera.position.addScaledVector(R, -fa * upp).addScaledVector(U, -fb * upp); camera.updateMatrixWorld();
    post.uniforms.sub.value.set(fa, fb);
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    camera.position.copy(keep); camera.updateMatrixWorld();
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  }

  return { renderer, scene, setSize, render };
}
