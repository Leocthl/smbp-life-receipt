import type { createGaussianBuilder } from './gaussian';
import { INK } from './materials';
import { pixelBlock, vbox } from './voxel';

type B = ReturnType<typeof createGaussianBuilder>;

// The voxel head: a cube a little wider than tall (1.2 x 1.1 x 1.1 at s = 1), a block-cap of hair with a stepped fringe, and a face
// painted in pixel blocks on the front (+z). Eyes can be drawn on their own so the hero can blink by swapping two tiny meshes.

export interface Outfit { top: number; pants: number; shoes: number; hair: number; skin: number }
export type HairStyle = 'short' | 'thin' | 'bun' | 'bob' | 'tail';
export interface Face { mood: number; eyeBags?: boolean; shades?: boolean; hairStyle?: HairStyle; /** leave the eyes out (drawn by eyesPart) */ noEyes?: boolean }

export const HEAD = { w: 1.2, h: 1.1, d: 1.1 };
/** eye row height above the head's base, at s = 1 */
export const EYE_Y = 0.5;
const FZ = HEAD.d / 2 + 0.005;
const MOUTH = 0xa53a45, MOUTH_DARK = 0x7f2a3a, BLUSH = 0xff9ec4, BAGS = 0x8a73e0;

/** Hair as boxes, in head units (1 = the 1.1 cube); each style has its own silhouette. */
function hair(b: B, u: number, color: number, style: HairStyle): void {
  const hb = (x: number, y: number, z: number, w: number, h: number, d: number) => vbox(b, x * u, y * u, z * u, w * u, h * u, d * u, color);
  if (style === 'thin') {
    for (const x of [-0.625, 0.625]) hb(x, 0.72, -0.1, 0.07, 0.4, 0.8); // grey above the ears only
    hb(0, 0.76, -0.56, 1.2, 0.36, 0.08);
    hb(0, 1.12, -0.36, 1.2, 0.04, 0.4); // the back half of the crown; the front half stays bare
    return;
  }
  hb(0, 1.03, -0.02, 1.24, 0.18, 1.16); // the cap: a thin layer flush on the head, one voxel of overhang
  if (style === 'bob') {
    hb(0, 0.85, 0.58, 1.2, 0.2, 0.05);
    for (const x of [-0.65, 0.65]) hb(x, 0.5, -0.02, 0.1, 0.74, 1.0);
    hb(0, 0.52, -0.6, 1.3, 0.7, 0.12);
    return;
  }
  hb(-0.24, 0.85, 0.58, 0.66, 0.24, 0.05); // the stepped fringe: long on the left, short on the right
  hb(0.28, 0.87, 0.58, 0.52, 0.2, 0.05);
  for (const x of [-0.635, 0.635]) hb(x, 0.74, -0.1, 0.07, 0.42, 0.74); // short sides, down to eye level
  hb(0, 0.8, -0.56, 1.2, 0.34, 0.08);
  if (style === 'bun') hb(0, 1.27, -0.12, 0.4, 0.3, 0.4);
  if (style === 'tail') { hb(0.7, 0.92, -0.2, 0.12, 0.12, 0.12); hb(0.74, 0.62, -0.2, 0.22, 0.5, 0.22); }
}

/** The eyes about (0, y0): open blocks, or a thin line when closed. z is the head's front plane. */
export function eyesPart(b: B, s: number, f: Face, closed = false, k = 1, y0 = 0): void {
  const u = s * k, tired = f.mood < -0.3 || f.eyeBags;
  if (f.shades) {
    pixelBlock(b, 0, y0, FZ * u, 0.9 * u, 0.2 * u, INK);
    if (s * k >= 0.75) pixelBlock(b, -0.28 * u, y0 + 0.04 * u, (FZ + 0.012) * u, 0.07 * u, 0.05 * u, 0xe9eefa);
    return;
  }
  for (const x of [-0.27, 0.27]) {
    if (closed) { pixelBlock(b, x * u, y0 - 0.04 * u, FZ * u, 0.16 * u, 0.04 * u, INK); continue; }
    pixelBlock(b, x * u, y0, FZ * u, 0.14 * u, (tired ? 0.14 : 0.24) * u, INK);
    if (s * k >= 0.75 && !tired) pixelBlock(b, (x - 0.025) * u, y0 + 0.06 * u, (FZ + 0.012) * u, 0.05 * u, 0.06 * u, 0xffffff);
  }
}

function mouth(b: B, u: number, mood: number): void {
  const y = 0.25 * u, z = FZ * u;
  if (mood > 0.75) { pixelBlock(b, 0, y, z, 0.2 * u, 0.09 * u, MOUTH_DARK); return; }
  if (mood > 0.15) { pixelBlock(b, 0, y, z, 0.18 * u, 0.05 * u, MOUTH); for (const x of [-0.115, 0.115]) pixelBlock(b, x * u, y + 0.05 * u, z, 0.05 * u, 0.05 * u, MOUTH); return; }
  if (mood < -0.3) { pixelBlock(b, 0, y, z, 0.18 * u, 0.05 * u, MOUTH); for (const x of [-0.115, 0.115]) pixelBlock(b, x * u, y - 0.05 * u, z, 0.05 * u, 0.05 * u, MOUTH); return; }
  pixelBlock(b, 0, y, z, 0.16 * u, 0.05 * u, MOUTH);
}

/** The whole head with its base at the origin, facing +z. s = the person's scale, k = head size (kids have bigger heads). */
export function headBlock(b: B, s: number, o: Outfit, f: Face, k = 1): void {
  const u = s * k;
  vbox(b, 0, (HEAD.h / 2) * u, 0, HEAD.w * u, HEAD.h * u, HEAD.d * u, o.skin);
  hair(b, u, o.hair, f.hairStyle ?? 'short');
  if (u >= 0.5) mouth(b, u, f.mood);
  if (!f.noEyes) {
    eyesPart(b, s, f, false, k, EYE_Y * u);
  }
  if (f.eyeBags && !f.shades) for (const x of [-0.27, 0.27]) pixelBlock(b, x * u, (EYE_Y - 0.17) * u, FZ * u, 0.16 * u, 0.04 * u, BAGS);
  if (u >= 0.75 && !f.shades) for (const x of [-0.43, 0.43]) pixelBlock(b, x * u, 0.33 * u, FZ * u, 0.14 * u, 0.07 * u, BLUSH);
}
