import { C, rect, sprite } from './draw';
import { drawSparks } from './fx';
import type { CompareState } from './compareState';
import { ART_H, ART_W } from './types';

// Harbour scene: sun, two gulls, a ferry that drifts across, and a coin stack that grows one step per round.

const SEA_Y = 110;
const GULL = ['X.X', '.X.'];

function sky(ctx: CanvasRenderingContext2D): void {
  rect(ctx, C.skyTop, 0, 0, ART_W, SEA_Y);
  rect(ctx, C.skyLow, 0, 70, ART_W, SEA_Y - 70);
  rect(ctx, C.sun, 14, 14, 9, 9);
  rect(ctx, C.sun, 16, 12, 5, 1);
}

function gulls(ctx: CanvasRenderingContext2D, t: number): void {
  const x1 = ((t * 9) % (ART_W + 20)) - 10;
  const x2 = ((t * 6 + 60) % (ART_W + 20)) - 10;
  sprite(ctx, GULL, x1, 40 + Math.round(Math.sin(t * 4) * 2), C.ink);
  sprite(ctx, GULL, x2, 28 + Math.round(Math.cos(t * 3) * 2), C.ink);
}

function sea(ctx: CanvasRenderingContext2D, t: number): void {
  rect(ctx, C.turquoise, 0, SEA_Y, ART_W, ART_H - SEA_Y);
  for (let y = SEA_Y + 6; y < ART_H; y += 8) {
    for (let x = (Math.floor(t * 4) + y) % 8; x < ART_W; x += 8) rect(ctx, C.skyLow, x, y, 3, 1);
  }
}

function ferry(ctx: CanvasRenderingContext2D, t: number): void {
  const x = ((t * 12) % (ART_W + 30)) - 15;
  rect(ctx, C.coral, x, SEA_Y - 8, 14, 4);
  rect(ctx, C.cream, x + 4, SEA_Y - 12, 4, 4);
  rect(ctx, C.ink, x, SEA_Y - 4, 14, 1);
}

function stack(ctx: CanvasRenderingContext2D, s: CompareState): void {
  s.history.forEach((ok, k) => {
    const h = 6 + k * 6;
    rect(ctx, ok ? C.sun : C.coral, 10 + k * 20, SEA_Y - h, 12, h);
    rect(ctx, C.ink, 10 + k * 20, SEA_Y - h, 12, 1);
  });
}

export function drawCompare(ctx: CanvasRenderingContext2D, s: CompareState, t: number): void {
  sky(ctx);
  gulls(ctx, t);
  sea(ctx, t);
  ferry(ctx, t);
  stack(ctx, s);
  drawSparks(ctx, s.sparks);
}
