import { C, rect } from './draw';
import type { HoldState } from './holdState';
import { ART_H, ART_W } from './types';

const TOP = 16;
const BOTTOM = 130;
const STRIP_Y = 150;

export function drawHold(ctx: CanvasRenderingContext2D, s: HoldState, _t: number): void {
  const n = s.path.length - 1;
  const lo = Math.min(...s.path);
  const hi = Math.max(...s.path);
  const yOf = (p: number) => TOP + (1 - (p - lo) / (hi - lo || 1)) * (BOTTOM - TOP);
  const cursorX = Math.round((s.idx / n) * (ART_W - 1));
  rect(ctx, C.skyLow, 0, 0, ART_W, ART_H);
  rect(ctx, C.white, 0, 0, ART_W, STRIP_Y);
  for (let x = 0; x < ART_W; x += 3) rect(ctx, C.coral, x, yOf(s.path[0]), 2, 1);
  for (let x = 0; x < ART_W; x += 1) {
    const k = Math.floor((x / (ART_W - 1)) * n);
    rect(ctx, x <= cursorX ? C.turquoise : C.lilac, x, yOf(s.path[k]), 1, 1);
    rect(ctx, (s.hist[k] ?? false) ? C.green : C.mist, x, STRIP_Y, 1, 10);
  }
  rect(ctx, C.sun, cursorX, TOP, 1, BOTTOM - TOP);
  rect(ctx, C.sun, cursorX - 1, yOf(s.path[s.idx]) - 1, 3, 3);
}
