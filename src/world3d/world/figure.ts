import type { Builder } from './kit';
import { SKINS, standing } from '../chibi';
import { INK } from '../materials';

/** A chunky bystander (about 1.7 tall, head a third of it): big colour blocks and a face, so it reads even when small. */
export interface FigureLook { top: number; pants: number; hair: number; skin?: number; scale?: number; pack?: number; hat?: number }

export const TOPS = [0xd9553f, 0x3d7fc4, 0xffd85a, 0x7ed07a, 0xff9ec4, 0x4cc3d9, 0xb9a7ff, 0xf2a93a];
export const PANTS = [0x2b3a55, 0x6b789c, 0x3d7fc4, 0x6f4a32];
export const HAIR = [0x2b3a55, 0x2b3a55, 0x6f4a32, 0x2b3a55];
const FIGURE_SCALE = 0.6;

export function figure(b: Builder, x: number, z: number, look: FigureLook): void {
  const s = FIGURE_SCALE * (look.scale ?? 1), skin = look.skin ?? SKINS[Math.floor(b.rnd() * SKINS.length)];
  standing(b, x, 0, z, s, { top: look.top, pants: look.pants, shoes: INK, hair: look.hair, skin }, { pack: look.pack, hat: look.hat });
}

/** A random bystander with an optional override. */
export function bystander(b: Builder, x: number, z: number, o: Partial<FigureLook> = {}): void {
  const pick = <T,>(a: T[]) => a[Math.floor(b.rnd() * a.length)];
  figure(b, x, z, { top: pick(TOPS), pants: pick(PANTS), hair: pick(HAIR), ...o });
}
