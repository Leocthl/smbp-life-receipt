import { line, panel, darken, type Vec3 } from './kit';
import type { Ctx } from './ctx';

export interface WinGrid {
  /** which wall: 'z' faces +z, 'x' faces +x */
  axis: 'x' | 'z';
  /** coordinate of the wall plane */
  plane: number;
  /** centre along the wall */
  centre: number;
  y0: number; cols: number; rows: number; pitchU: number; pitchV: number; w: number; h: number;
  lit: number; glass: number; frame?: number; litColors?: number[];
  boarded?: number;
  skip?: (i: number, j: number) => boolean;
}

const WARM = [0xffd27a, 0xfff0b8, 0xe0a050, 0xffd27a];

function at(g: WinGrid, i: number, j: number, off: number): Vec3 {
  const u = g.centre + (i - (g.cols - 1) / 2) * g.pitchU, y = g.y0 + j * g.pitchV + g.h / 2;
  return g.axis === 'z' ? [u, y, g.plane + off] : [g.plane + off, y, u];
}

/** A grid of windows: lit ones go in the glow layer, dark ones are glass in the solid layer. */
export function windowGrid(ctx: Ctx, g: WinGrid): void {
  const { solid, glow } = ctx.L;
  for (let i = 0; i < g.cols; i += 1) for (let j = 0; j < g.rows; j += 1) {
    if (g.skip?.(i, j)) continue;
    const lit = ctx.rnd() < g.lit;
    const colors = g.litColors ?? WARM;
    panel(solid, g.axis, at(g, i, j, 0.015), g.w + 0.14, g.h + 0.14, g.frame ?? 0x23263a, { density: 30, shade: g.axis === 'z' ? 0.9 : 0.7 });
    if (g.boarded && ctx.rnd() < g.boarded) { board(ctx, g, i, j); continue; }
    const c = at(g, i, j, 0.04);
    if (lit) panel(glow, g.axis, c, g.w, g.h, colors[Math.floor(ctx.rnd() * colors.length)], { density: 60, shade: 1 });
    else panel(solid, g.axis, c, g.w, g.h, g.glass, { density: 55, shade: g.axis === 'z' ? 0.9 : 0.7, jitter: 0.08 });
  }
}

/** Planks nailed across a window. */
export function board(ctx: Ctx, g: Pick<WinGrid, 'axis' | 'plane' | 'centre' | 'y0' | 'cols' | 'pitchU' | 'pitchV' | 'w' | 'h'>, i: number, j: number): void {
  const [x, y, z] = at(g as WinGrid, i, j, 0.07);
  const along = (f: number): [number, number, number] => (g.axis === 'z' ? [x + f * g.w * 0.55, y, z] : [x, y, z + f * g.w * 0.55]);
  panel(ctx.L.solid, g.axis, [x, y, z], g.w, g.h, 0x6b3f2a, { density: 50 });
  for (const s of [-1, 1]) {
    const a = along(-1), b = along(1);
    line(ctx.L.solid, [a[0], y + s * g.h * 0.5, a[2]], [b[0], y - s * g.h * 0.5, b[2]], darken(0x6b3f2a, 0.5), 0.045, 0.05);
  }
}
