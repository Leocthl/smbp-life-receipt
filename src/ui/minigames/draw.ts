// Bright daytime Hong Kong palette: sky, cream sunlight, greens, turquoise harbour, coral and lilac accents, ink outlines.
export const C = {
  skyTop: '#8fd3ff',
  skyLow: '#cdeeff',
  cream: '#fff6dc',
  sun: '#ffd85a',
  green: '#7ed07a',
  greenLight: '#b6e88a',
  turquoise: '#4cc3d9',
  coral: '#ff8a6b',
  peach: '#ffc29b',
  lilac: '#b9a7ff',
  ink: '#2b3a55',
  white: '#ffffff',
  mist: '#e3e9f4',
} as const;

export type Colour = (typeof C)[keyof typeof C];

/** Fill an art-pixel rectangle. */
export function rect(ctx: CanvasRenderingContext2D, colour: Colour, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = colour;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** A tiny pixel sprite: each 'X' cell is filled, with a one-pixel ink shadow so it reads on pale sky. */
export function sprite(ctx: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number, colour: Colour): void {
  const cells = (fill: Colour, dy: number) =>
    rows.forEach((row, ry) => [...row].forEach((cell, dx) => {
      if (cell === 'X') rect(ctx, fill, x + dx, y + ry + dy, 1, 1);
    }));
  cells(C.ink, 1);
  cells(colour, 0);
}
