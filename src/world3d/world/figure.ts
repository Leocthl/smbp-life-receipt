import type { Builder } from './kit';

/** A small chunky bystander (about 1.1 tall) made of a few blobs. */
export interface FigureLook { top: number; pants: number; hair: number; skin?: number; scale?: number; pack?: number; hat?: number }

export const TOPS = [0xd8504a, 0x3c6ea8, 0xffd27a, 0x4f8a6b, 0xff8ad1, 0xf4f1e6, 0x9c84d4, 0xe0a050];
export const PANTS = [0x23263a, 0x3a3f5c, 0x2a3f6e, 0x6b3f2a];
export const HAIR = [0x14161f, 0x23263a, 0x6b3f2a, 0x14161f];
const SKIN = [0xffd2b0, 0xe8b48a, 0xc98f62];

export function figure(b: Builder, x: number, z: number, look: FigureLook): void {
  const s = look.scale ?? 1, skin = look.skin ?? SKIN[Math.floor(b.rnd() * SKIN.length)];
  b.blob(x - 0.06 * s, 0.17 * s, z, 0.08 * s, 0.2 * s, 0.08 * s, 8, look.pants, 0.045 * s);
  b.blob(x + 0.06 * s, 0.17 * s, z, 0.08 * s, 0.2 * s, 0.08 * s, 8, look.pants, 0.045 * s);
  b.blob(x, 0.5 * s, z, 0.17 * s, 0.22 * s, 0.13 * s, 26, look.top, 0.06 * s);
  if (look.pack !== undefined) b.blob(x - 0.05 * s, 0.5 * s, z - 0.14 * s, 0.12 * s, 0.17 * s, 0.07 * s, 12, look.pack, 0.05 * s);
  b.blob(x, 0.84 * s, z, 0.13 * s, 0.13 * s, 0.13 * s, 18, skin, 0.05 * s);
  b.blob(x, 0.92 * s, z - 0.01 * s, 0.14 * s, 0.09 * s, 0.14 * s, 12, look.hair, 0.05 * s);
  if (look.hat !== undefined) b.blob(x, 0.99 * s, z, 0.17 * s, 0.04 * s, 0.17 * s, 8, look.hat, 0.05 * s);
}

/** A random bystander with an optional override. */
export function bystander(b: Builder, x: number, z: number, o: Partial<FigureLook> = {}): void {
  const pick = <T,>(a: T[]) => a[Math.floor(b.rnd() * a.length)];
  figure(b, x, z, { top: pick(TOPS), pants: pick(PANTS), hair: pick(HAIR), ...o });
}
