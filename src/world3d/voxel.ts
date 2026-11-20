import type { createGaussianBuilder } from './gaussian';

type B = ReturnType<typeof createGaussianBuilder>;
type V3 = [number, number, number];

// Blocky people are built from axis-aligned boxes. Every box face is ONE flat splat (or a few on big faces) cut to the face's
// own rectangle, so edges are pixel-crisp and the light bands land per face: top lightest, front mid, side in shade
// (docs/LOOK_RULES.md rules 3 and 13). A splat covers its rectangle's corners at 0.82 of the half-size.

export type Side = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';
export interface BoxOpt {
  /** faces not to draw: hidden joins, or the underside */
  skip?: readonly Side[];
  /** longest face cell; bigger faces are tiled */
  cell?: number;
}

// axis a is the face normal, u and v the two in-plane axes
const FACES: { side: Side; a: 0 | 1 | 2; sign: 1 | -1; u: 0 | 1 | 2; v: 0 | 1 | 2 }[] = [
  { side: 'top', a: 1, sign: 1, u: 0, v: 2 }, { side: 'bottom', a: 1, sign: -1, u: 0, v: 2 },
  { side: 'front', a: 2, sign: 1, u: 0, v: 1 }, { side: 'back', a: 2, sign: -1, u: 0, v: 1 },
  { side: 'right', a: 0, sign: 1, u: 2, v: 1 }, { side: 'left', a: 0, sign: -1, u: 2, v: 1 },
];
const COVER = 0.82, THIN = 0.02, CLIP_T = 0.03;

/** A solid box centred at (cx, cy, cz). Bottom face is skipped unless asked for. */
export function vbox(b: B, cx: number, cy: number, cz: number, w: number, h: number, d: number, color: number, o: BoxOpt = {}): void {
  const c: V3 = [cx, cy, cz], half: V3 = [w / 2, h / 2, d / 2], skip = o.skip ?? ['bottom'], cell = o.cell ?? 0.9;
  for (const f of FACES) {
    if (skip.includes(f.side)) continue;
    const nu = Math.max(1, Math.ceil(half[f.u] * 2 / cell)), nv = Math.max(1, Math.ceil(half[f.v] * 2 / cell));
    const du = (half[f.u] * 2) / nu, dv = (half[f.v] * 2) / nv;
    const n: V3 = [0, 0, 0];
    n[f.a] = f.sign;
    for (let i = 0; i < nu; i += 1) for (let j = 0; j < nv; j += 1) {
      const p: V3 = [...c], s: V3 = [0, 0, 0], lo: V3 = [0, 0, 0], hi: V3 = [0, 0, 0];
      p[f.a] += f.sign * half[f.a];
      p[f.u] += -half[f.u] + du * (i + 0.5);
      p[f.v] += -half[f.v] + dv * (j + 0.5);
      s[f.a] = THIN; s[f.u] = (du / 2) * COVER; s[f.v] = (dv / 2) * COVER;
      for (let k = 0; k < 3; k += 1) { lo[k] = p[k] - (k === f.u ? du / 2 : k === f.v ? dv / 2 : CLIP_T); hi[k] = p[k] + (k === f.u ? du / 2 : k === f.v ? dv / 2 : CLIP_T); }
      b.add({ p, s, color, opacity: 1, n, clip: { lo, hi } });
    }
  }
}

/** A face-paint pixel block on a front (+z) surface: unlit flat colour, crisp, drawn just in front and never cleaned away. */
export function pixelBlock(b: B, x: number, y: number, z: number, w: number, h: number, color: number): void {
  b.add({ p: [x, y, z], s: [(w / 2) * COVER, (h / 2) * COVER, THIN], color, opacity: 1, detail: true, clip: { lo: [x - w / 2, y - h / 2, z - CLIP_T], hi: [x + w / 2, y + h / 2, z + CLIP_T] } });
}
