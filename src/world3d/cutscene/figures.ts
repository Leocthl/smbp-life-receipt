import type { Builder } from './props';
import { C } from './fx';
import { standing } from '../chibi';
import { INK } from '../materials';

export interface PersonLook {
  shirt: number;
  hair?: number;
  skin?: number;
  /** 1 = adult (1.5 tall), kids about 0.6 */
  scale?: number;
  /** seated at a table or bench: no legs, body lowered */
  sit?: boolean;
  /** a walking stick, for the 65-year-old */
  cane?: boolean;
}

/** A chunky splat person standing at (x, y, z), facing +z; the head is a third of the height. */
export function person(b: Builder, x: number, y: number, z: number, o: PersonLook) {
  const s = 0.55 * (o.scale ?? 1);
  standing(b, x, y, z, s, { top: o.shirt, pants: C.ink, shoes: INK, hair: o.hair ?? C.bark, skin: o.skin ?? 0xffc29b }, { sit: o.sit, cane: o.cane, sleeve: o.shirt, face: { mood: 0.7 } });
}

export const SHIRTS = [C.coral, C.teal, C.sun, C.violet, C.rose, C.leaf];
