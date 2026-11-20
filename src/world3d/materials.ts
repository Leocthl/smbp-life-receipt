import * as THREE from 'three';

// Material ramps: every splat belongs to one material, and its colour is a step on that material's ramp chosen by
// light, never random jitter. A ramp runs shadow -> highlight, five steps, shadows cool and highlights warm
// (docs/LOOK_RULES.md rule 2). This file touches no window/DOM state so tests can import it.

export const RAMP_STEPS = 5;
/** index of the "as authored" step */
export const BASE_STEP = 2;
/** codes 201-250 are face details, so ramp ids must stay below 50 */
export const MAX_RAMPS = 50;
/** the outline and eye colour */
export const INK = 0x2b3a55;

type Ramp = readonly [number, number, number, number, number];

/** Bright, hopeful palette: the one table every look in the game comes from. */
export const MATERIALS: Readonly<Record<string, Ramp>> = {
  ink: [0x151d33, 0x1f2a44, 0x2b3a55, 0x3b4a6b, 0x4a5578],
  slate: [0x2b3a55, 0x4a5578, 0x6b789c, 0x9aa8c4, 0xc9d3e6],
  stone: [0x6b789c, 0x9aa8c4, 0xb4c0d8, 0xc9d3e6, 0xdfe6f2],
  white: [0x9aa8c4, 0xc9d3e6, 0xe9eefa, 0xf6f8ff, 0xffffff],
  cream: [0xc7b0a8, 0xe3cbb8, 0xfff6dc, 0xfffbec, 0xffffff],
  sand: [0xc89a86, 0xe4b79b, 0xffc29b, 0xffe0c8, 0xfff0e2],
  peach: [0xd9856f, 0xf0a384, 0xffc29b, 0xffd8bc, 0xffe9d6],
  coral: [0x9e3a3a, 0xd9553f, 0xff8a6b, 0xffa88c, 0xffc9b0],
  red: [0x7f2a3a, 0xa53a45, 0xc0453f, 0xd9553f, 0xe8745e],
  sun: [0xd9953a, 0xf2a93a, 0xffd85a, 0xffe786, 0xfff0a0],
  gold: [0xb9742a, 0xd9953a, 0xf2a93a, 0xffc352, 0xffdc7a],
  lemon: [0xd8c25a, 0xf0dc72, 0xfff0a0, 0xfff6c4, 0xfffbe0],
  wood: [0x4f3426, 0x6f4a32, 0x8f5f3e, 0xa8744a, 0xc08a58],
  tan: [0x8a5d44, 0xa8744a, 0xc08a58, 0xd9a874, 0xe8c196],
  skinLight: [0xd9856f, 0xf0a384, 0xffc29b, 0xffd5b8, 0xffe3d0],
  skinMid: [0xa8644a, 0xc9825e, 0xe8a77a, 0xf2bb92, 0xffcfae],
  skinDark: [0x5a3a2a, 0x7e5238, 0xa8744a, 0xc08a58, 0xd49e6c],
  pink: [0xc2658f, 0xe27fa8, 0xff9ec4, 0xffb8d4, 0xffd0e2],
  lilac: [0x6a5ab0, 0x8a73e0, 0xb9a7ff, 0xd0c4ff, 0xe4dcff],
  purple: [0x3f3478, 0x5a4aa0, 0x8a73e0, 0xa690f0, 0xc4b4ff],
  mist: [0x6b789c, 0x8e9cc6, 0xb4c0e6, 0xd2dcf6, 0xe8eeff],
  sky: [0x5a95d8, 0x6fb0f0, 0x8fd3ff, 0xb4e4ff, 0xcdeeff],
  azure: [0x2c5c9e, 0x3d7fc4, 0x5a9fe0, 0x7ab8f0, 0x9ad0ff],
  turquoise: [0x1f7e9e, 0x2a9fc0, 0x4cc3d9, 0x78d8e8, 0xa0e8f2],
  teal: [0x1a5a6e, 0x23768f, 0x2a9fc0, 0x4cc3d9, 0x78d8e8],
  leaf: [0x3f9f5a, 0x5cba68, 0x7ed07a, 0xa0e080, 0xc8f2a0],
  grass: [0x2a6f4a, 0x3f9f5a, 0x62b866, 0x8fd484, 0xb6e88a],
  pine: [0x173f3a, 0x205a4a, 0x2a6f4a, 0x3f8a58, 0x5aa86a],
  lime: [0x7aaf4a, 0x9ccf62, 0xb6e88a, 0xd0f4a4, 0xe4f5b0],
};

const NAMES = Object.keys(MATERIALS);
const ramps: Ramp[] = NAMES.map((n) => MATERIALS[n]);
const cache = new Map<number, { ramp: number; step: number }>();
let texture: THREE.DataTexture | null = null;
let dirty = true;

const rgb = (hex: number) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255] as const;
/** weighted RGB distance, close to how the eye sorts colours */
function distance(a: number, b: number): number {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b);
  const rm = (r1 + r2) / 2, dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

const tmp = new THREE.Color(), hsl = { h: 0, s: 0, l: 0 };
const toHex = (h: number, s: number, l: number) => tmp.setHSL(((h % 1) + 1) % 1, Math.max(0, Math.min(1, s)), Math.max(0, Math.min(1, l))).getHex();

/** A ramp for a colour the table does not cover: cooler and darker for shade, warmer and lighter for light. */
function generate(hex: number): Ramp {
  tmp.setHex(hex).getHSL(hsl);
  const { h, s, l } = hsl;
  return [toHex(h + 0.04, s, l * 0.55), toHex(h + 0.02, s, l * 0.78), hex, toHex(h - 0.01, s, l + (1 - l) * 0.35), toHex(h - 0.02, s, l + (1 - l) * 0.7)];
}

/** The ramp (and the step on it) a hex colour belongs to. The nearest table step wins; far-off colours get their own ramp. */
export function rampFor(hex: number): { ramp: number; step: number } {
  const hit = cache.get(hex);
  if (hit) return hit;
  let best = { ramp: 0, step: BASE_STEP }, bestD = Infinity;
  ramps.forEach((r, i) => r.forEach((c, s) => { const d = distance(hex, c) - (s === BASE_STEP ? 3 : 0); if (d < bestD) { bestD = d; best = { ramp: i, step: s }; } }));
  if (bestD > 60 && ramps.length < MAX_RAMPS) {
    ramps.push(generate(hex));
    dirty = true;
    best = { ramp: ramps.length - 1, step: BASE_STEP };
  }
  cache.set(hex, best);
  return best;
}

/** Ramp lookup by material name, for authored props. */
export function materialId(name: string): number {
  const i = NAMES.indexOf(name);
  return i < 0 ? 0 : i;
}

export const rampColor = (ramp: number, step: number): number => ramps[ramp]?.[Math.max(0, Math.min(RAMP_STEPS - 1, step))] ?? INK;

/** One 8-bit texel per ramp step, shared by every splat mesh and by the pixel pass. */
export function rampTexture(): THREE.DataTexture {
  if (!texture) {
    texture = new THREE.DataTexture(new Uint8Array(RAMP_STEPS * 128 * 4), RAMP_STEPS, 128, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.minFilter = THREE.NearestFilter; texture.magFilter = THREE.NearestFilter;
  }
  if (dirty) {
    const data = texture.image.data as Uint8Array;
    ramps.forEach((r, i) => r.forEach((c, s) => { const o = (i * RAMP_STEPS + s) * 4; const [R, G, B] = rgb(c); data[o] = R; data[o + 1] = G; data[o + 2] = B; data[o + 3] = 255; }));
    texture.needsUpdate = true;
    dirty = false;
  }
  return texture;
}
