import * as THREE from 'three';
import { BASE_STEP, rampFor, rampTexture } from './materials';
import { FRAGMENT, VERTEX } from './gaussianShaders';

// A small 3D Gaussian splat renderer, written for this game.
// Every splat is an anisotropic 3D Gaussian (centre, per-axis scale, rotation). Each frame its 3D covariance is projected
// to a 2D ellipse (EWA splatting) and drawn as a quad. Colour does not live in the splat: a splat names a material ramp
// (rampFor(hex)) and the shader picks the ramp step from the surface normal, so a wall is one clean colour and a ball
// gets clean light bands. See materials.ts and shaders in gaussianShaders.ts. Splat data lives in a float texture.

export interface GaussianInput {
  /** centre in local units */
  p: [number, number, number];
  /** standard deviation along the splat's local x, y, z */
  s: [number, number, number];
  /** rotation; identity when omitted */
  q?: THREE.Quaternion;
  /** colour as a hex number (sRGB); snapped to the nearest material ramp */
  color: number;
  opacity?: number;
  /** how far wind moves it */
  sway?: number;
  /** flat surface normal, in local space: the ramp step follows the light. Omit for an unlit splat (the authored colour). */
  n?: [number, number, number];
  /** part of a rounded form: centre and radii of the ellipsoid, so the normal is smooth across the splat */
  round?: { c: [number, number, number]; r: [number, number, number] };
  /** flat splats are cut to this box (local space): panels and boxes get crisp edges instead of round splat rims */
  clip?: { lo: [number, number, number]; hi: [number, number, number] };
  /** thin effect (rain, sparks, dust): never outlined or cleaned up */
  fx?: boolean;
  /** face detail (eyes, mouth): drawn just in front of its surface and protected from speck cleanup */
  detail?: boolean;
}

export interface GaussianMesh {
  mesh: THREE.Mesh;
  uniforms: {
    uTime: THREE.IUniform<number>; uReveal: THREE.IUniform<number>; uSize: THREE.IUniform<number>; uWind: THREE.IUniform<number>;
    uTint: THREE.IUniform<THREE.Color>; uSat: THREE.IUniform<number>; uGlow: THREE.IUniform<number>; uOpacity: THREE.IUniform<number>;
    uViewport: THREE.IUniform<THREE.Vector2>;
  };
  count: number;
  /** re-sorts the translucent splats back to front if the view direction changed since the last sort */
  sort(camera: THREE.Camera): void;
  dispose(): void;
}

const TEX_WIDTH = 2048;
const TEXELS = 7;
const zAxis = new THREE.Vector3(0, 0, 1);
/** light from the upper left, so the left wall is lit and the right one is in shade */
const LIGHT = new THREE.Vector3(0.18, 0.72, 0.67).normalize();

const hsl = { h: 0, s: 0, l: 0 };
const tmp = new THREE.Color();
/** the same hue with its lightness scaled: only used where a caller asks for a darker or lighter variant */
function tone(hex: number, shade: number): number {
  tmp.setHex(hex).getHSL(hsl);
  return tmp.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l * shade))).getHex();
}

/** Collects Gaussians, then builds one mesh from them. */
export function createGaussianBuilder(seed = 1) {
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const items: GaussianInput[] = [];

  return {
    rnd,
    /** Formerly a random colour jitter. Colours now come from ramps, so this only applies an explicit shade. */
    vary(hex: number, _amount = 0, shade = 1): number { return Math.abs(shade - 1) > 0.08 ? tone(hex, shade) : hex; },
    add(g: GaussianInput) { items.push(g); },
    /** Fills the shell of an ellipsoid with round splats: foliage, clouds, bodies. The light bands follow the ellipsoid. */
    blob(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, count: number, color: number | ((x: number, y: number, z: number) => number), size: number, o: { opacity?: number; sway?: number; jitter?: number; fx?: boolean } = {}) {
      const c: [number, number, number] = [cx, cy, cz], r: [number, number, number] = [Math.max(rx, 1e-3), Math.max(ry, 1e-3), Math.max(rz, 1e-3)];
      for (let i = 0; i < count; i += 1) {
        // golden-angle spiral: even coverage, so neighbouring splats agree and no hole shows
        const u = 1 - (2 * (i + 0.5)) / count, t = i * 2.399963 + rnd() * 0.5, ring = Math.sqrt(1 - u * u), d = 0.78 + rnd() * 0.22;
        const x = ring * Math.cos(t) * d, y = u * d, z = ring * Math.sin(t) * d;
        const hex = typeof color === 'function' ? color(x, y, z) : color;
        const sz = size * (0.8 + rnd() * 0.4);
        items.push({ p: [cx + x * rx, cy + y * ry, cz + z * rz], s: [sz, sz, sz], color: hex, opacity: o.opacity ?? 0.9, sway: o.sway ?? 0, round: { c, r }, fx: o.fx });
      }
    },
    /**
     * Covers every mesh under root with flat Gaussians lying in the surface (thin along the normal), the way a trained
     * splat scene represents walls and ground. density = splats per square unit; size = their standard deviation.
     */
    surface(root: THREE.Object3D, { density = 20, size = 0.12, opacity = 0.95, sway = 0 }: { density?: number; size?: number; jitter?: number; opacity?: number; sway?: number } = {}) {
      root.updateMatrixWorld(true);
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshBasicMaterial;
        const hex = mat.color.getHex();
        const box = new THREE.Box3().setFromObject(mesh).expandByScalar(0.03);
        const clip = { lo: box.min.toArray() as [number, number, number], hi: box.max.toArray() as [number, number, number] };
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
          if (n.x + n.y + n.z < 0) n.negate(); // thin shells are seen from the camera's side
          const wanted = area * density;
          const count = Math.floor(wanted) + (rnd() < wanted % 1 ? 1 : 0);
          for (let k = 0; k < count; k += 1) {
            let u = rnd(), v = rnd();
            if (u + v > 1) { u = 1 - u; v = 1 - v; }
            const sz = size * (0.8 + rnd() * 0.4);
            items.push({ p: [a.x + ab.x * u + ac.x * v, a.y + ab.y * u + ac.y * v, a.z + ab.z * u + ac.z * v], s: [sz, sz, sz * 0.12], q: q.clone(), color: hex, opacity, sway, n: [n.x, n.y, n.z], clip });
          }
        }
      });
    },
    count: () => items.length,
    build(): GaussianMesh { return buildMesh(items); },
  };
}

/** Writes one splat's five texels. */
function pack(g: GaussianInput, data: Float32Array, o: number, m: THREE.Matrix3, r: THREE.Matrix3, sc: THREE.Matrix3, m4: THREE.Matrix4): void {
  m4.makeRotationFromQuaternion(g.q ?? new THREE.Quaternion());
  r.setFromMatrix4(m4);
  sc.set(g.s[0], 0, 0, 0, g.s[1], 0, 0, 0, g.s[2]);
  m.multiplyMatrices(r, sc); // M = R S, covariance = M M^T
  const e = m.elements; // column-major
  const cov = (row: number, col: number) => e[row] * e[col] + e[row + 3] * e[col + 3] + e[row + 6] * e[col + 6];
  const opacity = g.opacity ?? 1;
  const { ramp, step } = rampFor(g.color);
  const second = [...g.s].sort((x, y) => y - x)[1];
  const fx = g.fx ?? (!g.detail && (opacity < 0.9 || second < 0.035));
  let flags = (g.round ? 1 : g.n ? 2 : 0) | (fx ? 4 : 0) | (g.detail ? 8 : 0) | (g.clip ? 16 : 0);
  let v: [number, number, number] = [0, 0, 0], inv: [number, number, number] = [0, 0, 0];
  if (g.round) { v = [g.p[0] - g.round.c[0], g.p[1] - g.round.c[1], g.p[2] - g.round.c[2]]; inv = [1 / (g.round.r[0] ** 2), 1 / (g.round.r[1] ** 2), 1 / (g.round.r[2] ** 2)]; }
  else if (g.n) v = g.n;
  else {
    flags &= ~3;
    // an unlit flat splat (water, decals, rugs) still lies in a plane: its depth must follow the plane, not jump per splat
    const lo3 = Math.min(g.s[0], g.s[1], g.s[2]), mid = [...g.s].sort((x, y) => x - y)[1];
    if (lo3 < mid * 0.5) {
      const axis = g.s.indexOf(lo3);
      const nrm = new THREE.Vector3(axis === 0 ? 1 : 0, axis === 1 ? 1 : 0, axis === 2 ? 1 : 0).applyQuaternion(g.q ?? new THREE.Quaternion());
      v = [nrm.x, nrm.y, nrm.z]; flags |= 32;
    }
  }
  const lo = g.clip ? g.clip.lo.map((v, k) => v - g.p[k]) : [0, 0, 0], hi = g.clip ? g.clip.hi.map((v, k) => v - g.p[k]) : [0, 0, 0];
  data.set([g.p[0], g.p[1], g.p[2], g.sway ?? 0, cov(0, 0), cov(0, 1), cov(0, 2), cov(1, 1), cov(1, 2), cov(2, 2), opacity, flags, v[0], v[1], v[2], ramp * 8 + (step ?? BASE_STEP), inv[0], inv[1], inv[2], 0, lo[0], lo[1], lo[2], 0, hi[0], hi[1], hi[2], 0], o);
}

function makeMaterial(uniforms: Record<string, THREE.IUniform>, soft: boolean): THREE.ShaderMaterial {
  const base = { glslVersion: THREE.GLSL3, vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, defines: soft ? { SOFT: 1 } : {} };
  if (!soft) return new THREE.ShaderMaterial({ ...base, transparent: false, depthWrite: true, depthTest: true, blending: THREE.NoBlending });
  return new THREE.ShaderMaterial({
    ...base, transparent: true, depthWrite: false, depthTest: true,
    // colour blends; the alpha channel (the pixel pass's material code) is left alone
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
}

function buildMesh(items: GaussianInput[]): GaussianMesh {
  const count = items.length;
  const rows = Math.max(1, Math.ceil((count * TEXELS) / TEX_WIDTH));
  const data = new Float32Array(TEX_WIDTH * rows * 4);
  const centres = new Float32Array(count * 3);
  const m = new THREE.Matrix3(), r = new THREE.Matrix3(), sc = new THREE.Matrix3(), m4 = new THREE.Matrix4();
  items.forEach((g, i) => { pack(g, data, i * TEXELS * 4, m, r, sc, m4); centres.set(g.p, i * 3); });
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
    uData: { value: texture }, uWidth: { value: TEX_WIDTH }, uViewport: { value: new THREE.Vector2(320, 200) }, uRamps: { value: rampTexture() },
    uTime: { value: 0 }, uReveal: { value: 1 }, uSize: { value: 1 }, uWind: { value: 0 },
    uTint: { value: new THREE.Color(1, 1, 1) }, uSat: { value: 1 }, uGlow: { value: 0 }, uOpacity: { value: 1 },
    uLight: { value: LIGHT.clone() }, uLo: { value: 0.3 }, uHi: { value: 0.7 },
  };
  const material = makeMaterial(uniforms, false), softMaterial = makeMaterial(uniforms, true);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const softMesh = new THREE.Mesh(geometry, softMaterial);
  softMesh.frustumCulled = false;
  mesh.add(softMesh);
  // counting sort on 16-bit depth keys: only the translucent splats care, but it is cheap enough to run on any view change
  const keys = new Uint16Array(count);
  const counts = new Uint32Array(65536);
  const depth = new Float32Array(count);
  const dir = new THREE.Vector3(), lastDir = new THREE.Vector3(9, 9, 9), local = new THREE.Vector3();
  const inv = new THREE.Matrix4();
  function sort(camera: THREE.Camera) {
    mesh.updateMatrixWorld();
    camera.getWorldDirection(dir);
    inv.copy(mesh.matrixWorld).invert();
    local.copy(dir).transformDirection(inv);
    if (local.distanceToSquared(lastDir) < 1e-8) return;
    lastDir.copy(local);
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < count; i += 1) {
      const d = centres[i * 3] * local.x + centres[i * 3 + 1] * local.y + centres[i * 3 + 2] * local.z;
      depth[i] = d;
      if (d < min) min = d;
      if (d > max) max = d;
    }
    const scale = max > min ? 65535 / (max - min) : 0;
    counts.fill(0);
    for (let i = 0; i < count; i += 1) { const k = 65535 - Math.round((depth[i] - min) * scale); keys[i] = k; counts[k] += 1; }
    for (let k = 1; k < 65536; k += 1) counts[k] += counts[k - 1];
    for (let i = count - 1; i >= 0; i -= 1) order[--counts[keys[i]]] = i;
    orderAttr.needsUpdate = true;
  }
  return {
    mesh, uniforms, count, sort,
    dispose() { geometry.dispose(); material.dispose(); softMaterial.dispose(); texture.dispose(); },
  };
}
