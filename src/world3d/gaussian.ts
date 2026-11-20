import * as THREE from 'three';

// A small 3D Gaussian splat renderer, written for this game.
// Every splat is an anisotropic 3D Gaussian (centre, per-axis scale, rotation, colour, opacity). Each frame its 3D
// covariance is projected to a 2D ellipse on screen (EWA splatting), drawn as a quad with a Gaussian falloff, and
// blended back to front with premultiplied alpha. Splat data lives in a float texture; only the draw order changes.

const VERTEX = /* glsl */ `
precision highp float;
precision highp sampler2D;
uniform sampler2D uData;
uniform int uWidth;
uniform vec2 uViewport;
uniform float uTime;
uniform float uReveal;
uniform float uSize;
uniform float uWind;
in float aIndex;
out vec4 vColor;
out vec2 vPos;
vec4 fetch(int i) { return texelFetch(uData, ivec2(i % uWidth, i / uWidth), 0); }
float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
void main() {
  int i = int(aIndex);
  vec4 t0 = fetch(i * 4);      // centre.xyz, sway
  vec4 t1 = fetch(i * 4 + 1);  // covariance xx xy xz yy
  vec4 t2 = fetch(i * 4 + 2);  // covariance yz zz, spare
  vec4 t3 = fetch(i * 4 + 3);  // colour (linear) and opacity
  float seed = hash(aIndex + 1.0);
  // reveal: splats arrive in a random order and grow in, so a changed world assembles itself
  float p = clamp(uReveal * 1.6 - seed * 0.6, 0.0, 1.0);
  float grow = p * p * (3.0 - 2.0 * p);
  vec3 centre = t0.xyz;
  centre.x += sin(uTime * 1.6 + centre.x * 0.4 + centre.z * 0.3) * t0.w * (0.4 + uWind);
  centre.z += cos(uTime * 1.2 + centre.z * 0.35) * t0.w * 0.5 * (0.4 + uWind);
  centre.y -= (1.0 - grow) * (0.6 + seed * 1.2);
  vec4 view = modelViewMatrix * vec4(centre, 1.0);
  vec4 clip = projectionMatrix * view;
  mat3 cov = mat3(t1.x, t1.y, t1.z, t1.y, t1.w, t2.x, t1.z, t2.x, t2.y) * (uSize * uSize * grow * grow);
  mat3 W = mat3(modelViewMatrix);
  mat3 vcov = W * cov * transpose(W);
  // Jacobian of the projection, in render-target pixels
  float fx = projectionMatrix[0][0] * uViewport.x * 0.5;
  float fy = projectionMatrix[1][1] * uViewport.y * 0.5;
  mat3 J;
  if (projectionMatrix[3][3] > 0.5) {
    J = mat3(fx, 0.0, 0.0, 0.0, fy, 0.0, 0.0, 0.0, 0.0);
  } else {
    float z = -view.z;
    J = mat3(fx / z, 0.0, 0.0, 0.0, fy / z, 0.0, fx * view.x / (z * z), fy * view.y / (z * z), 0.0);
  }
  mat3 c2 = J * vcov * transpose(J);
  float a = c2[0][0] + 0.3, b = c2[0][1], c = c2[1][1] + 0.3; // + low-pass so tiny splats still cover a pixel
  float mid = 0.5 * (a + c);
  float rad = length(vec2(0.5 * (a - c), b));
  float l1 = mid + rad, l2 = max(mid - rad, 0.05);
  vec2 v1 = abs(b) < 1e-6 ? (a >= c ? vec2(1.0, 0.0) : vec2(0.0, 1.0)) : normalize(vec2(b, l1 - a));
  vec2 v2 = vec2(-v1.y, v1.x);
  float k = 2.6; // draw out to 2.6 standard deviations
  vec2 offset = position.x * v1 * sqrt(l1) * k + position.y * v2 * sqrt(l2) * k;
  gl_Position = clip + vec4(offset / uViewport * 2.0 * clip.w, 0.0, 0.0);
  vPos = position.xy * k;
  vColor = t3;
  if (t3.a * grow < 0.004 || clip.w <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uTint;
uniform float uSat;
uniform float uGlow;
uniform float uOpacity;
in vec4 vColor;
in vec2 vPos;
out vec4 outColor;
void main() {
  float power = -0.5 * dot(vPos, vPos);
  float alpha = min(0.99, vColor.a * uOpacity * exp(power));
#ifdef DEPTH_ONLY
  // depth pre-pass: only the dense core of a splat occludes other splat meshes
  if (alpha < 0.55) discard;
  outColor = vec4(0.0);
  return;
#endif
  if (alpha < 1.0 / 255.0) discard;
  vec3 col = vColor.rgb * uTint;
  col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, uSat) + vColor.rgb * uGlow;
  outColor = vec4(col * alpha, alpha);
}`;

export interface GaussianInput {
  /** centre in local units */
  p: [number, number, number];
  /** standard deviation along the splat's local x, y, z */
  s: [number, number, number];
  /** rotation; identity when omitted */
  q?: THREE.Quaternion;
  /** colour as a hex number (sRGB) */
  color: number;
  opacity?: number;
  /** how far wind moves it */
  sway?: number;
}

export interface GaussianMesh {
  mesh: THREE.Mesh;
  uniforms: {
    uTime: THREE.IUniform<number>; uReveal: THREE.IUniform<number>; uSize: THREE.IUniform<number>; uWind: THREE.IUniform<number>;
    uTint: THREE.IUniform<THREE.Color>; uSat: THREE.IUniform<number>; uGlow: THREE.IUniform<number>; uOpacity: THREE.IUniform<number>;
    uViewport: THREE.IUniform<THREE.Vector2>;
  };
  count: number;
  /** re-sorts back to front if the view direction changed since the last sort */
  sort(camera: THREE.Camera): void;
  dispose(): void;
}

const TEX_WIDTH = 2048;
const zAxis = new THREE.Vector3(0, 0, 1);

/** Collects Gaussians, then builds one sortable mesh from them. */
export function createGaussianBuilder(seed = 1) {
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const items: GaussianInput[] = [];
  const hsl = { h: 0, s: 0, l: 0 };
  const tmp = new THREE.Color();

  /** Small hue/lightness jitter so neighbouring splats never match exactly. */
  function vary(hex: number, amount: number, shade = 1): number {
    tmp.setHex(hex).getHSL(hsl);
    tmp.setHSL(hsl.h + (rnd() - 0.5) * amount * 0.3, hsl.s, Math.max(0, Math.min(1, hsl.l * shade + (rnd() - 0.5) * amount)));
    return tmp.getHex();
  }

  return {
    rnd,
    vary,
    add(g: GaussianInput) { items.push(g); },
    /** Fills an ellipsoid with round Gaussians: foliage, clouds, bodies, smoke. */
    blob(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, count: number, color: number | ((x: number, y: number, z: number) => number), size: number, o: { opacity?: number; sway?: number; jitter?: number } = {}) {
      for (let i = 0; i < count; i += 1) {
        const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, ring = Math.sqrt(1 - u * u), r = Math.cbrt(rnd());
        const x = ring * Math.cos(t) * r, y = u * r, z = ring * Math.sin(t) * r;
        const hex = typeof color === 'function' ? color(x, y, z) : color;
        const sz = size * (0.6 + rnd() * 0.8);
        // lit from above: tops are a little lighter
        items.push({ p: [cx + x * rx, cy + y * ry, cz + z * rz], s: [sz, sz * (0.7 + rnd() * 0.6), sz], q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3)), color: vary(hex, o.jitter ?? 0.06, 0.62 + 0.5 * (y * 0.5 + 0.5)), opacity: o.opacity ?? 0.9, sway: o.sway ?? 0 });
      }
    },
    /**
     * Covers every mesh under root with flat Gaussians lying in the surface (thin along the normal), the way a trained
     * splat scene represents walls and ground. density = splats per square unit; size = their standard deviation.
     */
    surface(root: THREE.Object3D, { density = 20, size = 0.12, jitter = 0.05, opacity = 0.95, sway = 0 }: { density?: number; size?: number; jitter?: number; opacity?: number; sway?: number } = {}) {
      root.updateMatrixWorld(true);
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();
      const light = new THREE.Vector3(-0.4, 0.85, 0.35).normalize();
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshBasicMaterial;
        const hex = mat.color.getHex();
        const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
        const index = mesh.geometry.index;
        const total = index ? index.count : pos.count;
        const at = (i: number, out: THREE.Vector3) => out.fromBufferAttribute(pos, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
        for (let i = 0; i + 2 < total; i += 3) {
          at(i, a); at(i + 1, b); at(i + 2, c);
          ab.subVectors(b, a); ac.subVectors(c, a); n.crossVectors(ab, ac);
          const area = n.length() / 2;
          if (area < 1e-9) continue;
          n.normalize();
          const q = new THREE.Quaternion().setFromUnitVectors(zAxis, n);
          const shade = 0.62 + 0.38 * Math.max(0, n.dot(light));
          const wanted = area * density;
          const count = Math.floor(wanted) + (rnd() < wanted % 1 ? 1 : 0);
          for (let k = 0; k < count; k += 1) {
            let u = rnd(), v = rnd();
            if (u + v > 1) { u = 1 - u; v = 1 - v; }
            const sz = size * (0.7 + rnd() * 0.6);
            items.push({ p: [a.x + ab.x * u + ac.x * v, a.y + ab.y * u + ac.y * v, a.z + ab.z * u + ac.z * v], s: [sz * (0.8 + rnd() * 0.5), sz * (0.8 + rnd() * 0.5), sz * 0.12], q: q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(zAxis, rnd() * Math.PI)), color: vary(hex, jitter, shade), opacity, sway });
          }
        }
      });
    },
    count: () => items.length,
    build(): GaussianMesh { return buildMesh(items); },
  };
}

function buildMesh(items: GaussianInput[]): GaussianMesh {
  const count = items.length;
  const rows = Math.max(1, Math.ceil((count * 4) / TEX_WIDTH));
  const data = new Float32Array(TEX_WIDTH * rows * 4);
  const centres = new Float32Array(count * 3);
  const m = new THREE.Matrix3(), r = new THREE.Matrix3(), sc = new THREE.Matrix3(), m4 = new THREE.Matrix4();
  const color = new THREE.Color();
  items.forEach((g, i) => {
    m4.makeRotationFromQuaternion(g.q ?? new THREE.Quaternion());
    r.setFromMatrix4(m4);
    sc.set(g.s[0], 0, 0, 0, g.s[1], 0, 0, 0, g.s[2]);
    m.multiplyMatrices(r, sc); // M = R S, covariance = M M^T
    const e = m.elements; // column-major
    const cov = (row: number, col: number) => e[row] * e[col] + e[row + 3] * e[col + 3] + e[row + 6] * e[col + 6];
    color.setHex(g.color); // sRGB hex -> linear
    const o = i * 16;
    data.set([g.p[0], g.p[1], g.p[2], g.sway ?? 0, cov(0, 0), cov(0, 1), cov(0, 2), cov(1, 1), cov(1, 2), cov(2, 2), 0, 0, color.r, color.g, color.b, g.opacity ?? 1], o);
    centres.set(g.p, i * 3);
  });
  const texture = new THREE.DataTexture(data, TEX_WIDTH, rows, THREE.RGBAFormat, THREE.FloatType);
  texture.needsUpdate = true;
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const order = new Float32Array(count);
  for (let i = 0; i < count; i += 1) order[i] = i;
  const orderAttr = new THREE.InstancedBufferAttribute(order, 1);
  orderAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aIndex', orderAttr);
  geometry.instanceCount = count;
  const uniforms = {
    uData: { value: texture }, uWidth: { value: TEX_WIDTH }, uViewport: { value: new THREE.Vector2(320, 200) },
    uTime: { value: 0 }, uReveal: { value: 1 }, uSize: { value: 1 }, uWind: { value: 0 },
    uTint: { value: new THREE.Color(1, 1, 1) }, uSat: { value: 1 }, uGlow: { value: 0 }, uOpacity: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms,
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  // Separate splat meshes (world, people, water) can't be sorted against each other, so the dense cores of every
  // splat write depth first (opaque pass) and the blended pass then tests against them.
  const depthMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, defines: { DEPTH_ONLY: 1 },
    colorWrite: false, depthWrite: true, depthTest: true,
  });
  const depthMesh = new THREE.Mesh(geometry, depthMaterial);
  depthMesh.frustumCulled = false;
  mesh.add(depthMesh);
  // counting sort on 16-bit depth keys: fast enough to run whenever the view direction changes
  const keys = new Uint16Array(count);
  const counts = new Uint32Array(65536);
  const dir = new THREE.Vector3(), lastDir = new THREE.Vector3(9, 9, 9), local = new THREE.Vector3();
  const inv = new THREE.Matrix4();
  function sort(camera: THREE.Camera) {
    mesh.updateMatrixWorld();
    camera.getWorldDirection(dir);
    // view direction in the mesh's own space, so a moving or turning mesh also re-sorts
    inv.copy(mesh.matrixWorld).invert();
    local.copy(dir).transformDirection(inv);
    if (local.distanceToSquared(lastDir) < 1e-8) return;
    lastDir.copy(local);
    let min = Infinity, max = -Infinity;
    const depth = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const d = centres[i * 3] * local.x + centres[i * 3 + 1] * local.y + centres[i * 3 + 2] * local.z;
      depth[i] = d;
      if (d < min) min = d;
      if (d > max) max = d;
    }
    const scale = max > min ? 65535 / (max - min) : 0;
    counts.fill(0);
    // far first: larger depth along the view direction is further away
    for (let i = 0; i < count; i += 1) { const k = 65535 - Math.round((depth[i] - min) * scale); keys[i] = k; counts[k] += 1; }
    for (let k = 1; k < 65536; k += 1) counts[k] += counts[k - 1];
    for (let i = count - 1; i >= 0; i -= 1) order[--counts[keys[i]]] = i;
    orderAttr.needsUpdate = true;
  }
  return {
    mesh, uniforms, count, sort,
    dispose() { geometry.dispose(); material.dispose(); depthMaterial.dispose(); texture.dispose(); },
  };
}
