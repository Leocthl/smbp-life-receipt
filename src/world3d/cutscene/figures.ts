import type { Builder } from './props';
import { C } from './fx';

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

/** A small splat person standing at (x, y, z), facing +z. Same proportions as the stage's placeholder avatar. */
export function person(b: Builder, x: number, y: number, z: number, o: PersonLook) {
  const s = o.scale ?? 1, drop = o.sit ? 0.32 * s : 0;
  const skin = o.skin ?? 0xffd2b0, hair = o.hair ?? C.bark;
  if (!o.sit) b.blob(x, y + 0.24 * s, z, 0.16 * s, 0.26 * s, 0.14 * s, 36, C.ink, 0.1 * s);
  b.blob(x, y + 0.75 * s - drop, z, 0.3 * s, 0.42 * s, 0.24 * s, 70, o.shirt, 0.12 * s);
  b.blob(x, y + 1.3 * s - drop, z, 0.24 * s, 0.24 * s, 0.24 * s, 46, skin, 0.1 * s);
  b.blob(x, y + 1.46 * s - drop, z - 0.02 * s, 0.26 * s, 0.14 * s, 0.26 * s, 34, hair, 0.09 * s);
  if (o.cane) for (let i = 0; i < 12; i += 1) b.add({ p: [x + 0.42 * s, y + i * 0.07 * s, z + 0.1], s: [0.04, 0.05, 0.04], color: C.bark });
}

export const SHIRTS = [C.coral, C.teal, C.sun, C.violet, C.rose, C.leaf];
