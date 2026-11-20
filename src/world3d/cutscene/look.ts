import * as THREE from 'three';

// Sky and colour grading for cutscenes. Everything is a pure function of the cutscene clock.

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const smooth = (v: number) => { const k = clamp01(v); return k * k * (3 - 2 * k); };
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** 0 before a, up to 1 over a..b, stays 1 until c, back to 0 over c..d */
export const bump = (x: number, a: number, b: number, c: number, d: number) => smooth((x - a) / (b - a)) * (1 - smooth((x - c) / (d - c)));

const ca = new THREE.Color(), cb = new THREE.Color();
export function lerpHex(a: number, b: number, k: number): number {
  return ca.setHex(a).lerp(cb.setHex(b), clamp01(k)).getHex();
}

/** keys: [time, hex] sorted by time. */
export function skyAt(keys: ReadonlyArray<readonly [number, number]>, c: number): number {
  if (c <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i += 1) {
    if (c <= keys[i][0]) return lerpHex(keys[i - 1][1], keys[i][1], (c - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
  }
  return keys[keys.length - 1][1];
}

export function setSky(scene: THREE.Scene, hex: number) {
  if (scene.background instanceof THREE.Color) scene.background.setHex(hex);
  else scene.background = new THREE.Color(hex);
}

export interface Grade { sat: number; tint: readonly [number, number, number] }
export const NEUTRAL: Grade = { sat: 1, tint: [1, 1, 1] };
export const mixGrade = (a: Grade, b: Grade, k: number): Grade => ({
  sat: lerp(a.sat, b.sat, k),
  tint: [lerp(a.tint[0], b.tint[0], k), lerp(a.tint[1], b.tint[1], k), lerp(a.tint[2], b.tint[2], k)],
});

const bases = new WeakMap<object, { tint: THREE.Color; sat: number }>();

/** Scales the tint and saturation the world set at build time; NEUTRAL puts it back exactly. */
export function grade(scene: THREE.Scene, g: Grade) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.userData.mlProp) return;
    const u = (m.material as THREE.ShaderMaterial).uniforms;
    if (!u || !u.uSat || !u.uTint) return;
    let base = bases.get(u);
    if (!base) { base = { tint: (u.uTint.value as THREE.Color).clone(), sat: u.uSat.value as number }; bases.set(u, base); }
    (u.uTint.value as THREE.Color).setRGB(base.tint.r * g.tint[0], base.tint.g * g.tint[1], base.tint.b * g.tint[2]);
    u.uSat.value = base.sat * g.sat;
  });
}
