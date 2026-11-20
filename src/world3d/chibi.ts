import { createGaussianBuilder } from './gaussian';
import { INK } from './materials';

type B = ReturnType<typeof createGaussianBuilder>;

// Chunky people, shared by the hero (avatar.ts), the street's bystanders (world/figure.ts) and the cutscenes. A person is
// readable at a glance when: the head is about a third of the height, the face is two dark eye dots and a mouth, the outfit
// is two or three big colour blocks, and the silhouette gets an ink outline from the pixel pass (docs/LOOK_RULES.md rules 10-12).
// Part drawers take s = 1 for the hero (2.8 tall). Everything is placed relative to the part's own pivot.

export const HERO_HEIGHT = 2.8;
export const SKINS = [0xffc29b, 0xe8a77a, 0xa8744a];

export interface Outfit { top: number; pants: number; shoes: number; hair: number; skin: number }

/** A solid ellipsoid of splats whose count follows its surface, so every size stays gap-free. */
export function lump(b: B, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, color: number | ((x: number, y: number, z: number) => number), spacing: number, o: { fx?: boolean } = {}): void {
  const area = 4 * Math.PI * Math.pow((Math.pow(rx * ry, 1.6) + Math.pow(rx * rz, 1.6) + Math.pow(ry * rz, 1.6)) / 3, 1 / 1.6);
  const count = Math.max(6, Math.round(area / (spacing * spacing)));
  b.blob(cx, cy, cz, rx, ry, rz, count, color, spacing * 0.62, { opacity: 0.98, fx: o.fx });
}

/** A face detail: a small flat dot that is never cleaned away. */
export function dot(b: B, x: number, y: number, z: number, w: number, h: number, color: number): void {
  b.add({ p: [x, y, z], s: [w, h, 0.02], color, opacity: 1, detail: true });
}

export function legPart(b: B, s: number, o: Outfit, sp: number, patch = false): void {
  lump(b, 0, -0.46 * s, 0, 0.19 * s, 0.5 * s, 0.19 * s, o.pants, sp);
  lump(b, 0, -0.88 * s, 0.1 * s, 0.22 * s, 0.12 * s, 0.3 * s, o.shoes, sp);
  if (patch) lump(b, 0.05 * s, -0.4 * s, 0.17 * s, 0.1 * s, 0.1 * s, 0.04 * s, 0xf2a93a, sp * 0.6);
}

export function armPart(b: B, s: number, o: Outfit, sleeve: number, sp: number): void {
  lump(b, 0, -0.3 * s, 0, 0.14 * s, 0.36 * s, 0.14 * s, sleeve, sp);
  lump(b, 0, -0.72 * s, 0.02 * s, 0.13 * s, 0.13 * s, 0.13 * s, o.skin, sp);
}

export function torsoPart(b: B, s: number, o: Outfit, sp: number): void {
  lump(b, 0, 0.02 * s, 0, 0.42 * s, 0.17 * s, 0.3 * s, o.pants, sp);
  lump(b, 0, 0.42 * s, 0, 0.48 * s, 0.42 * s, 0.34 * s, o.top, sp);
}

export interface Face { mood: number; eyeBags?: boolean; shades?: boolean; hairStyle?: 'short' | 'thin' | 'bun' }

/** Head about 0.5 tall on a 1.6 body: a third of the height. Eyes, mouth and blush sit on the front (+z). */
export function headPart(b: B, s: number, o: Outfit, f: Face, sp: number): void {
  const cy = 0.5 * s;
  lump(b, 0, cy, 0, 0.5 * s, 0.5 * s, 0.46 * s, o.skin, sp);
  const hair = f.hairStyle ?? 'short';
  if (hair === 'thin') lump(b, 0, cy + 0.34 * s, -0.04 * s, 0.54 * s, 0.26 * s, 0.5 * s, o.hair, sp); // the short cap without the fringe (a thin-hair lump z-fought the head)
  else { lump(b, 0, cy + 0.34 * s, -0.04 * s, 0.54 * s, 0.26 * s, 0.5 * s, o.hair, sp); lump(b, 0, cy + 0.04 * s, -0.18 * s, 0.52 * s, 0.42 * s, 0.34 * s, o.hair, sp); }
  if (hair !== 'thin') lump(b, 0, cy + 0.3 * s, 0.3 * s, 0.36 * s, 0.1 * s, 0.14 * s, o.hair, sp);
  if (hair === 'bun') lump(b, 0, cy + 0.72 * s, -0.1 * s, 0.2 * s, 0.2 * s, 0.2 * s, o.hair, sp);
  lump(b, 0.5 * s, cy - 0.02 * s, 0, 0.07 * s, 0.1 * s, 0.07 * s, o.skin, sp * 0.7);
  lump(b, -0.5 * s, cy - 0.02 * s, 0, 0.07 * s, 0.1 * s, 0.07 * s, o.skin, sp * 0.7);
  face(b, s, cy, f, o);
}

function face(b: B, s: number, cy: number, f: Face, o: Outfit): void {
  const z = 0.43 * s, eyeY = cy - 0.02 * s, big = s >= 0.8, ex = big ? 0.2 : 0.27;
  for (const x of [-ex, ex]) {
    if (!f.shades) {
      dot(b, x * s, eyeY, z, 0.042 * s, (f.mood < -0.3 ? 0.036 : 0.066) * s, INK);
      if (big) dot(b, (x - 0.014) * s, eyeY + 0.035 * s, z + 0.01, 0.014 * s, 0.017 * s, 0xffffff);
    }
    if (f.eyeBags) dot(b, x * s, eyeY - 0.12 * s, z - 0.02, 0.05 * s, 0.018 * s, 0x8a73e0);
    if (big) dot(b, x * 1.55 * s, cy - 0.16 * s, z - 0.12 * s, 0.045 * s, 0.028 * s, 0xff9ec4);
  }
  if (f.shades) dot(b, 0, eyeY, z + 0.01, 0.23 * s, 0.05 * s, INK);
  if (s >= 0.75) for (let i = -2; i <= 2; i += 1) dot(b, i * 0.045 * s, cy - 0.26 * s + 0.026 * s * (i * i - 1.5) * f.mood, z - 0.02, 0.026 * s, 0.02 * s, 0xc0453f);
  if (f.mood < -0.3 || f.eyeBags) for (const x of [-0.2, 0.2]) dot(b, x * s, eyeY + 0.13 * s, z - 0.01, 0.06 * s, 0.016 * s, o.hair);
}

/** The same builder, with everything shifted: lets the part drawers (made for pivots at the origin) place a whole person. */
function shifted(b: B, ox: number, oy: number, oz: number): B {
  return {
    ...b,
    blob: (cx: number, cy: number, cz: number, ...rest: [number, number, number, number, number | ((x: number, y: number, z: number) => number), number, { opacity?: number; sway?: number; jitter?: number; fx?: boolean }?]) => b.blob(cx + ox, cy + oy, cz + oz, ...rest),
    add: (g: Parameters<B['add']>[0]) => b.add({ ...g, p: [g.p[0] + ox, g.p[1] + oy, g.p[2] + oz], clip: g.clip && { lo: [g.clip.lo[0] + ox, g.clip.lo[1] + oy, g.clip.lo[2] + oz], hi: [g.clip.hi[0] + ox, g.clip.hi[1] + oy, g.clip.hi[2] + oz] } }),
  } as B;
}

export interface Standing { sit?: boolean; cane?: boolean; pack?: number; hat?: number; face?: Partial<Face>; sleeve?: number }

/** A whole standing (or seated) person with feet at (x, y, z), facing +z; s = 1 is the hero's size. */
export function standing(b: B, x: number, y: number, z: number, s: number, o: Outfit, opt: Standing = {}): void {
  const sp = 0.1 + 0.1 * s, hip = (opt.sit ? 0.6 : 0.95) * s, face: Face = { mood: 0.6, ...opt.face };
  if (!opt.sit) for (const side of [-1, 1]) legPart(shifted(b, x + side * 0.22 * s, y + hip, z), s, o, sp);
  else for (const side of [-1, 1]) lump(b, x + side * 0.22 * s, y + 0.5 * s, z + 0.3 * s, 0.19 * s, 0.17 * s, 0.4 * s, o.pants, sp);
  torsoPart(shifted(b, x, y + hip, z), s, o, sp);
  for (const side of [-1, 1]) armPart(shifted(b, x + side * 0.62 * s, y + hip + 0.68 * s, z), s, o, opt.sleeve ?? o.top, sp);
  headPart(shifted(b, x, y + hip + 0.86 * s, z), s, o, face, sp);
  if (opt.pack !== undefined) lump(b, x, y + hip + 0.46 * s, z - 0.42 * s, 0.3 * s, 0.34 * s, 0.16 * s, opt.pack, sp);
  if (opt.hat !== undefined) lump(b, x, y + hip + 0.86 * s + 0.95 * s, z, 0.56 * s, 0.1 * s, 0.52 * s, opt.hat, sp);
  if (opt.cane) lump(b, x + 0.78 * s, y + 0.55 * s, z + 0.1 * s, 0.05 * s, 0.55 * s, 0.05 * s, 0x6f4a32, sp * 0.7);
}
