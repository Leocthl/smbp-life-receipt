import * as THREE from 'three';
import { INK, rampTexture } from './materials';
import { CLEAN, FINAL, VERT } from './pixelShaders';

// Pixel-art pass: the scene is drawn at art-pixel size (no multisampling, so every pixel is ONE splat's ramp colour and
// carries its material code in alpha), cleaned of single-pixel specks, outlined where depth jumps, then blown up with
// nearest-neighbour sampling. The camera is snapped to the pixel grid so still scenery does not shimmer when it pans.
// There is no global palette snap and no per-surface dithering: the palette is the material ramps (materials.ts).

/** Kept for callers that want the old swatch list: the bright daytime palette the ramps were built around. */
export const PALETTE = [
  0x2b3a55, 0x4a5578, 0x1f2a44, 0x6b789c, 0x9aa8c4, 0xc9d3e6, 0xfff6dc, 0xffffff,
  0x8fd3ff, 0xcdeeff, 0x4cc3d9, 0x2a9fc0, 0x3d7fc4,
  0x7ed07a, 0xb6e88a, 0x3f9f5a, 0x2a6f4a, 0xe4f5b0,
  0xff8a6b, 0xffc29b, 0xd9553f, 0xffe0c8,
  0xffd85a, 0xf2a93a, 0xfff0a0,
  0xb9a7ff, 0x8a73e0, 0xe4dcff,
  0xa8744a, 0x6f4a32, 0xff9ec4, 0xe8a77a,
];

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
const ART_ROWS = Number(new URLSearchParams(window.location.search).get('px')) || 400;

/** One art pixel in device pixels: about 1/ART_ROWS of the short side, at least 2. */
function pixelSizeFor(w: number, h: number): number {
  return Math.max(2, Math.round(Math.min(w, h) / ART_ROWS));
}

function makeTarget(w: number, h: number, withDepth: boolean): THREE.WebGLRenderTarget {
  const target = new THREE.WebGLRenderTarget(w, h, { samples: 0, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, type: THREE.UnsignedByteType });
  if (withDepth) {
    target.depthTexture = new THREE.DepthTexture(w, h);
    target.depthTexture.minFilter = THREE.NearestFilter; target.depthTexture.magFilter = THREE.NearestFilter;
  }
  return target;
}

function pass(fragmentShader: string, uniforms: Record<string, THREE.IUniform>): { scene: THREE.Scene; material: THREE.ShaderMaterial; quad: THREE.Mesh } {
  const material = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, uniforms, vertexShader: VERT, fragmentShader, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  return { scene, material, quad };
}

export function createPixelRenderer(container: HTMLElement): PixelRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true, premultipliedAlpha: false });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'ml-world__canvas';
  container.appendChild(renderer.domElement);
  const low = new THREE.Vector2(4, 4);
  let target = makeTarget(4, 4, true), cleaned = makeTarget(4, 4, false);
  const sky = new THREE.Vector3(...srgb(0x8fd3ff).toArray());
  const shared = { lowSize: { value: low }, uSky: { value: sky } };
  const uniforms: Record<string, THREE.IUniform> = {
    ...shared, map: { value: cleaned.texture }, depthMap: { value: target.depthTexture }, ramps: { value: rampTexture() },
    // kept for the stage: the fade to a colour, and the old vignette/dither knobs (the look no longer uses them)
    dither: { value: 0 }, vignette: { value: 0 }, fade: { value: 0 }, fadeColor: { value: srgb(0x2b3a55) },
    uSkyBands: { value: 1 }, uNear: { value: -200 }, uFar: { value: 400 }, uOrtho: { value: 1 }, uGap: { value: 0.9 }, uInk: { value: srgb(INK) },
    uTime: { value: 0 }, uCursor: { value: new THREE.Vector2(0, 0) }, uYaw: { value: Math.PI / 4 }, uAgeK: { value: 0 }, uIndoor: { value: 1 },
  };
  const cleanPass = pass(CLEAN, { ...shared, map: { value: target.texture } });
  const finalPass = pass(FINAL, uniforms);
  const flatCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const clear = new THREE.Color();
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
      target.dispose(); cleaned.dispose();
      target = makeTarget(low.x, low.y, true); cleaned = makeTarget(low.x, low.y, false);
      uniforms.map.value = cleaned.texture; uniforms.depthMap.value = target.depthTexture;
      cleanPass.material.uniforms.map.value = target.texture;
    },
    render(scene, camera) {
      rampTexture();
      const background = scene.background;
      if (background instanceof THREE.Color) sky.copy(srgb(background.getHex()));
      clear.setRGB(sky.x, sky.y, sky.z, THREE.LinearSRGBColorSpace); // raw display values: the target holds sRGB, not linear light
      renderer.setClearColor(clear, 0);
      scene.background = null;
      const ortho = (camera as THREE.OrthographicCamera).isOrthographicCamera === true;
      const cam = camera as THREE.OrthographicCamera;
      uniforms.uNear.value = cam.near; uniforms.uFar.value = cam.far; uniforms.uOrtho.value = ortho ? 1 : 0;
      try {
        renderer.setRenderTarget(target);
        renderer.clear();
        renderer.render(scene, camera);
        renderer.setRenderTarget(cleaned);
        renderer.render(cleanPass.scene, flatCam);
      } finally {
        scene.background = background;
        renderer.setRenderTarget(null);
      }
      renderer.render(finalPass.scene, flatCam);
    },
    dispose() {
      target.dispose(); cleaned.dispose(); cleanPass.material.dispose(); finalPass.material.dispose();
      cleanPass.quad.geometry.dispose(); finalPass.quad.geometry.dispose(); renderer.dispose();
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
