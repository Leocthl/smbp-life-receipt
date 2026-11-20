import { C, rect } from './draw';
import type { CompareState } from './compareState';
import { ART_H, ART_W } from './types';

const SEA_Y = 110;

export function drawCompare(ctx: CanvasRenderingContext2D, s: CompareState, t: number): void {
  rect(ctx, C.skyTop, 0, 0, ART_W, SEA_Y);
  rect(ctx, C.skyLow, 0, 80, ART_W, 30);
  rect(ctx, C.turquoise, 0, SEA_Y, ART_W, ART_H - SEA_Y);
  for (let y = SEA_Y + 6; y < ART_H; y += 8) {
    for (let x = (Math.floor(t * 4) + y) % 8; x < ART_W; x += 8) rect(ctx, C.skyLow, x, y, 3, 1);
  }
  const boatX = ((t * 12) % (ART_W + 30)) - 15;
  rect(ctx, C.coral, boatX, SEA_Y - 8, 14, 4);
  rect(ctx, C.cream, boatX + 4, SEA_Y - 12, 4, 4);
  s.history.forEach((ok, k) => {
    const h = 6 + k * 6;
    rect(ctx, ok ? C.sun : C.coral, 10 + k * 20, SEA_Y - h, 12, h);
  });
}
