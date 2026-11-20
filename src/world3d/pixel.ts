import * as THREE from 'three';

// Pixel-art pass: the scene is drawn small (with multisampling, so splats melt together), then blown up with
// nearest-neighbour sampling, ordered dithering and a limited palette. The camera is snapped to the pixel grid so
// still scenery does not shimmer when the camera pans.

/** Limited palette: Hong Kong at dusk. Night teals, tram green, neon red and pink, cha chaan teng cream, harbour blue. */
export const PALETTE = [
  0x14161f, 0x23263a, 0x3a3f5c, 0x5b6488, 0x8a95b8, 0xc4cbe0, 0xf4f1e6, 0xffffff,
  0x1d3b3a, 0x2f5d50, 0x4f8a6b, 0x8cbf7a, 0xd6e8a8,
  0x2a3f6e, 0x3c6ea8, 0x6fb0d8, 0xb5e2f0,
  0x5a2a2e, 0x9b3b3b, 0xd8504a, 0xff7b6b, 0xffb3a7,
  0x6b3f2a, 0xa86a3a, 0xe0a050, 0xffd27a, 0xfff0b8,
  0x6e2a5e, 0xc0458f, 0xff8ad1, 0x5a4a8a, 0x9c84d4,
];

const FRAGMENT = `
uniform sampler2D map; uniform vec2 lowSize; uniform vec3 palette[${PALETTE.length}]; uniform float dither; uniform float vignette; uniform float fade; uniform vec3 fadeColor;
varying vec2 vUv;
float bayer(vec2 p) {
  // 4x4 ordered dither, in 0..1
  int x = int(mod(p.x, 4.0)); int y = int(mod(p.y, 4.0)); int i = x + y * 4;
  float m[16];
  m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
  for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16.0;
  return 0.0;
}
void main() {
  vec2 cell = floor(vUv * lowSize);
  // the target holds linear light; compare and dither in display (sRGB) space, where the palette was picked
  vec3 c = pow(max(texture2D(map, (cell + 0.5) / lowSize).rgb, 0.0), vec3(1.0 / 2.2));
  vec2 q = vUv - 0.5;
  c *= 1.0 - dot(q, q) * vignette;
  c += (bayer(cell) - 0.5) * dither;
  vec3 best = palette[0]; float bestD = 1e9;
  for (int k = 0; k < ${PALETTE.length}; k++) { vec3 d = c - palette[k]; float dd = dot(d * vec3(0.3, 0.59, 0.11), d); if (dd < bestD) { bestD = dd; best = palette[k]; } }
  best = mix(best, fadeColor, fade);
  gl_FragColor = vec4(best, 1.0);
}`;

export interface PixelRenderer {
  renderer: THREE.WebGLRenderer;
  /** size of one art pixel in screen pixels */
  pixel: number;
  low: THREE.Vector2;
  uniforms: Record<string, THREE.IUniform>;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  resize(): void;
  dispose(): void;
}

/** A hex colour as raw display (sRGB) components, with no colour management applied. */
export function srgb(hex: number): THREE.Vector3 {
  return new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
}

/** Art pixels across the screen's short side; ?px=N overrides it for tuning. */
const ART_ROWS = Number(new URLSearchParams(window.location.search).get('px')) || 360;

/** One art pixel in device pixels: about 1/ART_ROWS of the short side, at least 2. */
function pixelSizeFor(w: number, h: number): number {
  return Math.max(2, Math.round(Math.min(w, h) / ART_ROWS));
}

export function createPixelRenderer(container: HTMLElement): PixelRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'ml-world__canvas';
  container.appendChild(renderer.domElement);
  const low = new THREE.Vector2(4, 4);
  const target = new THREE.WebGLRenderTarget(4, 4, { samples: 4, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const uniforms: Record<string, THREE.IUniform> = {
    map: { value: target.texture }, lowSize: { value: low }, dither: { value: 0.03 }, vignette: { value: 0.3 },
    palette: { value: PALETTE.map(srgb) }, fade: { value: 0 }, fadeColor: { value: srgb(0x14161f) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, fragmentShader: FRAGMENT,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const flat = new THREE.Scene();
  flat.add(quad);
  const flatCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const api: PixelRenderer = {
    renderer, pixel: 3, low, uniforms,
    resize() {
      // work in device pixels so phones (DPR 3) get a sharp picture, not a blurry upscale
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const w = Math.round((container.clientWidth || window.innerWidth) * dpr), h = Math.round((container.clientHeight || window.innerHeight) * dpr);
      api.pixel = pixelSizeFor(w, h);
      low.set(Math.ceil(w / api.pixel), Math.ceil(h / api.pixel));
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      target.setSize(low.x, low.y);
    },
    render(scene, camera) {
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(flat, flatCam);
    },
    dispose() {
      target.dispose(); material.dispose(); quad.geometry.dispose(); renderer.dispose();
      renderer.domElement.remove();
    },
  };
  api.resize();
  return api;
}

/**
 * An orthographic "diorama" camera looking down at 30 degrees, whose position is snapped to whole art pixels so
 * the picture moves in clean pixel steps instead of shimmering.
 */
export function createDioramaCamera(viewHeight = 18) {
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 400);
  const target = new THREE.Vector3();
  const state = { viewHeight, yaw: Math.PI / 4, pitch: Math.atan(1 / Math.sqrt(2)), distance: 60, lowHeight: 200 };
  const right = new THREE.Vector3(), up = new THREE.Vector3(), offset = new THREE.Vector3();
  function update(aspect: number, lowHeight: number) {
    state.lowHeight = lowHeight;
    const hh = state.viewHeight / 2;
    camera.left = -hh * aspect; camera.right = hh * aspect; camera.top = hh; camera.bottom = -hh;
    camera.updateProjectionMatrix();
    offset.set(Math.sin(state.yaw) * Math.cos(state.pitch), Math.sin(state.pitch), Math.cos(state.yaw) * Math.cos(state.pitch)).multiplyScalar(state.distance);
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    // snap along the camera's own right/up axes to the size of one art pixel in world units
    const texel = state.viewHeight / lowHeight;
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    const r = camera.position.dot(right), u = camera.position.dot(up);
    camera.position.addScaledVector(right, Math.round(r / texel) * texel - r).addScaledVector(up, Math.round(u / texel) * texel - u);
    camera.updateMatrixWorld();
  }
  return { camera, target, state, update };
}
