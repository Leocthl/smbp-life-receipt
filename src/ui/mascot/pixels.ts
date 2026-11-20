/** Tiny pixel-art helpers: one palette, rectangles and string bitmaps on a 2D canvas. */
export const PAL: Readonly<Record<string, string>> = {
  i: '#2b3a55', p: '#fffaf0', w: '#ffffff', k: '#ff8a6b', r: '#ff6f91', s: '#ffd85a', t: '#4cc3d9', g: '#7ed07a', l: '#b9a7ff',
  f: '#e6dcc0', d: '#efe3c6', c: '#9db4cc', b: '#d8e6f2',
};

export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colour: string) {
  ctx.fillStyle = colour;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** Draw a bitmap: each character is a palette key, '.' is transparent. */
export function blit(ctx: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i += 1) {
      const colour = PAL[row[i]];
      if (colour) rect(ctx, x + i, y + j, 1, 1, colour);
    }
  });
}

/** A bitmap with a dark 1px drop shadow, for glyph effects. */
export function blitShadow(ctx: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number) {
  blit(ctx, rows.map((r) => r.replace(/[^.]/g, 'i')), x + 1, y + 1);
  blit(ctx, rows, x, y);
}

/** 2px-thick line from a to b (Bresenham), used for the stubby arms. */
export function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, colour: string) {
  let x = Math.round(x0), y = Math.round(y0);
  const ex = Math.round(x1), ey = Math.round(y1);
  const dx = Math.abs(ex - x), dy = -Math.abs(ey - y);
  const sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    rect(ctx, x, y, 2, 2, colour);
    if (x === ex && y === ey) return;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

/** Cheap deterministic 0..1 noise from a number, so particles look random but never change between frames. */
export function noise(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
