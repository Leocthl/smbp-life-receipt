import { createGaussianBuilder } from './gaussian';
import { eyesPart as eyes, headBlock, type Face, type Outfit } from './chibiHead';
import { vbox } from './voxel';

export { EYE_Y, HEAD, type Face, type HairStyle, type Outfit } from './chibiHead';
export { eyes as eyesPart };

type B = ReturnType<typeof createGaussianBuilder>;

// Blocky voxel-chibi people, shared by the hero (avatar.ts), the street's bystanders (world/figure.ts) and the cutscenes.
// A person is a cube head (about 40% of the height), a box torso, box arms flush at the shoulders, short box legs and small box
// hands and feet. Every face is one flat splat, so a person costs about a hundred splats and the light bands land per face
// (docs/LOOK_RULES.md rule 14). Part drawers take s = 1 for the hero (2.8 tall) and draw around the part's own pivot.

export const HERO_HEIGHT = 2.8;
export const SKINS = [0xffc29b, 0xe8a77a, 0xa8744a];
/** the body's rig at s = 1: where the pivots sit */
export const RIG = { hip: 0.85, neck: 0.85, shoulderX: 0.625, shoulderY: 0.74, legX: 0.23 };
const TORSO = { w: 0.95, d: 0.6 };

/** A solid ellipsoid of splats; kept for round props (a bun of bread, a lamp), people are boxes now. */
export function lump(b: B, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, color: number | ((x: number, y: number, z: number) => number), spacing: number, o: { fx?: boolean } = {}): void {
  const area = 4 * Math.PI * Math.pow((Math.pow(rx * ry, 1.6) + Math.pow(rx * rz, 1.6) + Math.pow(ry * rz, 1.6)) / 3, 1 / 1.6);
  const count = Math.max(6, Math.round(area / (spacing * spacing)));
  b.blob(cx, cy, cz, rx, ry, rz, count, color, spacing * 0.62, { opacity: 0.98, fx: o.fx });
}

/** A face detail: a small flat dot that is never cleaned away. */
export function dot(b: B, x: number, y: number, z: number, w: number, h: number, color: number): void {
  b.add({ p: [x, y, z], s: [w, h, 0.02], color, opacity: 1, detail: true });
}

/** A leg from the hip pivot down: trousers, then a shoe with its toe forward. */
export function legPart(b: B, s: number, o: Outfit, _sp: number, patch = false): void {
  vbox(b, 0, -0.32 * s, 0, 0.4 * s, 0.68 * s, 0.44 * s, o.pants, { skip: ['top', 'bottom'] });
  vbox(b, 0, -0.75 * s, 0.09 * s, 0.42 * s, 0.2 * s, 0.62 * s, o.shoes);
  if (patch) vbox(b, 0.05 * s, -0.3 * s, 0.23 * s, 0.2 * s, 0.2 * s, 0.04 * s, 0xf2a93a, { skip: ['bottom', 'back', 'left'] });
}

/** An arm from the shoulder pivot down: a sleeve block and a small hand block. */
export function armPart(b: B, s: number, o: Outfit, sleeve: number, _sp: number): void {
  vbox(b, 0, -0.23 * s, 0, 0.3 * s, 0.58 * s, 0.32 * s, sleeve);
  vbox(b, 0, -0.62 * s, 0, 0.26 * s, 0.2 * s, 0.26 * s, o.skin);
}

/** Belt-height trousers band under a coloured top, on the hip pivot. */
export function torsoPart(b: B, s: number, o: Outfit, _sp: number): void {
  vbox(b, 0, 0.1 * s, 0, TORSO.w * s, 0.2 * s, TORSO.d * s, o.pants, { skip: ['top', 'bottom'] });
  vbox(b, 0, 0.525 * s, 0, TORSO.w * s, 0.65 * s, TORSO.d * s, o.top);
}

/** Head on the neck pivot. sp is ignored (kept for the old call shape); k scales the head (kids). */
export function headPart(b: B, s: number, o: Outfit, f: Face, _sp: number, k = 1): void {
  headBlock(b, s, o, f, k);
}

/** The same builder with everything moved by an offset, so the part drawers (made for pivots at the origin) can place a whole person. */
function shifted(b: B, ox: number, oy: number, oz: number): B {
  return {
    ...b,
    blob: (cx: number, cy: number, cz: number, ...rest: [number, number, number, number, number | ((x: number, y: number, z: number) => number), number, { opacity?: number; sway?: number; jitter?: number; fx?: boolean }?]) => b.blob(cx + ox, cy + oy, cz + oz, ...rest),
    add: (g: Parameters<B['add']>[0]) => b.add({ ...g, p: [g.p[0] + ox, g.p[1] + oy, g.p[2] + oz], clip: g.clip && { lo: [g.clip.lo[0] + ox, g.clip.lo[1] + oy, g.clip.lo[2] + oz], hi: [g.clip.hi[0] + ox, g.clip.hi[1] + oy, g.clip.hi[2] + oz] } }),
  } as B;
}

export interface Standing { sit?: boolean; cane?: boolean; pack?: number; hat?: number; tie?: number; kid?: boolean; face?: Partial<Face>; sleeve?: number }

function seatedLegs(b: B, x: number, y: number, z: number, s: number, o: Outfit): void {
  for (const side of [-1, 1]) {
    const lx = x + side * RIG.legX * s;
    vbox(b, lx, y + 0.43 * s, z + 0.3 * s, 0.4 * s, 0.38 * s, 0.8 * s, o.pants, { skip: ['bottom'] });
    vbox(b, lx, y + 0.21 * s, z + 0.55 * s, 0.4 * s, 0.4 * s, 0.34 * s, o.pants, { skip: ['top', 'bottom'] });
    vbox(b, lx, y + 0.08 * s, z + 0.62 * s, 0.42 * s, 0.16 * s, 0.5 * s, o.shoes);
  }
}

function extras(b: B, x: number, y: number, z: number, s: number, hip: number, o: Standing): void {
  if (o.pack !== undefined) {
    vbox(b, x, y + hip + 0.42 * s, z - 0.42 * s, 0.8 * s, 0.6 * s, 0.26 * s, o.pack);
    for (const side of [-1, 1]) vbox(b, x + side * 0.26 * s, y + hip + 0.46 * s, z + 0.31 * s, 0.1 * s, 0.5 * s, 0.04 * s, o.pack, { skip: ['bottom', 'back'] });
  }
  if (o.tie !== undefined) vbox(b, x, y + hip + 0.38 * s, z + 0.31 * s, 0.12 * s, 0.4 * s, 0.04 * s, o.tie, { skip: ['bottom', 'back'] });
  if (o.cane) vbox(b, x + 0.78 * s, y + 0.5 * s, z + 0.1 * s, 0.07 * s, 1.0 * s, 0.07 * s, 0x6f4a32);
  if (o.hat !== undefined) {
    const top = y + hip + 0.85 * s + 1.1 * s * (o.kid ? 1.2 : 1);
    vbox(b, x, top + 0.04 * s, z, 1.4 * s, 0.08 * s, 1.3 * s, o.hat);
    vbox(b, x, top + 0.18 * s, z, 0.9 * s, 0.2 * s, 0.9 * s, o.hat);
  }
}

/** A whole standing (or seated) person with feet at (x, y, z), facing +z; s = 1 is the hero's size. */
export function standing(b: B, x: number, y: number, z: number, s: number, o: Outfit, opt: Standing = {}): void {
  const hip = (opt.sit ? 0.62 : RIG.hip) * s, face: Face = { mood: 0.6, ...opt.face }, k = opt.kid ? 1.2 : 1;
  if (opt.sit) seatedLegs(b, x, y, z, s, o);
  else for (const side of [-1, 1]) legPart(shifted(b, x + side * RIG.legX * s, y + hip, z), s, o, 0);
  torsoPart(shifted(b, x, y + hip, z), s, o, 0);
  for (const side of [-1, 1]) armPart(shifted(b, x + side * RIG.shoulderX * s, y + hip + RIG.shoulderY * s, z), s, o, opt.sleeve ?? o.top, 0);
  headPart(shifted(b, x, y + hip + RIG.neck * s, z), s, o, face, 0, k);
  extras(b, x, y, z, s, hip, opt);
}
