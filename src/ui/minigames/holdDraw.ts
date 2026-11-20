import { C, rect, sprite, type Colour } from './draw';
import { STORM_END, STORM_START, type HoldState } from './holdState';
import { ART_H, ART_W } from './types';

// The chart scrolls: only the path up to "now" is drawn, and a little boat rides the line at the right edge.

const CHART_BOTTOM = 112;
const LO = 20;
const HI = 170;
const NOW_X = ART_W - 16;
const STEPS_PER_COL = 0.9;
const STRIP_Y = 122;
const WATER_Y = 132;
const STORM_SKY: [Colour, Colour] = ['#6f85ad', '#9db0d0'];
const RAIN = '#e3f4ff';
const RAINBOW: Colour[] = [C.coral, C.sun, C.green, C.turquoise, C.lilac];

type Regime = 'calm' | 'storm' | 'recovery';

const yOf = (p: number) => CHART_BOTTOM - Math.min(1, Math.max(0, (p - LO) / (HI - LO))) * 100;

function regimeAt(idx: number): Regime {
  if (idx >= STORM_START && idx <= STORM_END) return 'storm';
  return idx > STORM_END ? 'recovery' : 'calm';
}

function drawSky(ctx: CanvasRenderingContext2D, r: Regime): void {
  const [top, low] = r === 'storm' ? STORM_SKY : [C.skyTop, C.skyLow];
  rect(ctx, top, 0, 0, ART_W, 56);
  rect(ctx, low, 0, 56, ART_W, CHART_BOTTOM - 56);
}

function drawSun(ctx: CanvasRenderingContext2D): void {
  for (let dy = -6; dy <= 6; dy += 1) {
    for (let dx = -6; dx <= 6; dx += 1) {
      if (dx * dx + dy * dy <= 36) rect(ctx, C.sun, 16 + dx, 22 + dy, 1, 1);
    }
  }
}

function drawRainbow(ctx: CanvasRenderingContext2D): void {
  RAINBOW.forEach((colour, b) => {
    const R = 78 - b * 3;
    for (let x = 0; x < ART_W; x += 1) {
      const dx = x - 60;
      if (Math.abs(dx) > R) continue;
      const y = 120 - Math.round(Math.sqrt(R * R - dx * dx));
      if (y >= 0 && y < CHART_BOTTOM) rect(ctx, colour, x, y, 1, 2);
    }
  });
}

function drawRain(ctx: CanvasRenderingContext2D, t: number): void {
  for (let i = 0; i < 36; i += 1) {
    const x = (i * 31.7 + t * 18) % ART_W;
    const y = (i * 17.3 + t * 90) % CHART_BOTTOM;
    rect(ctx, RAIN, x, y, 1, 3);
  }
}

/** Column x shows the step that happened (NOW_X - x) * STEPS_PER_COL ago; nothing to the right of now. */
function stepAt(s: HoldState, x: number): number {
  return Math.round(s.idx - (NOW_X - x) * STEPS_PER_COL);
}

function drawLine(ctx: CanvasRenderingContext2D, s: HoldState): void {
  for (let x = 0; x <= NOW_X; x += 1) {
    const k = stepAt(s, x);
    if (k >= 0) rect(ctx, C.ink, x, yOf(s.path[k]), 1, 2);
  }
}

function drawStrip(ctx: CanvasRenderingContext2D, s: HoldState): void {
  for (let x = 0; x < ART_W; x += 1) {
    const k = stepAt(s, x);
    const on = k >= 0 && k < s.hist.length && s.hist[k];
    rect(ctx, on ? C.green : C.mist, x, STRIP_Y, 1, 6);
  }
}

function drawWater(ctx: CanvasRenderingContext2D, t: number): void {
  rect(ctx, C.turquoise, 0, WATER_Y, ART_W, ART_H - WATER_Y);
  for (let y = WATER_Y + 4; y < ART_H; y += 6) {
    for (let x = (Math.floor(t * 6) + y) % 10; x < ART_W; x += 10) rect(ctx, C.skyLow, x, y, 4, 1);
  }
}

/** Boat with a little passenger; the umbrella comes out in the storm. */
function drawBoat(ctx: CanvasRenderingContext2D, p: number, storm: boolean, t: number): void {
  const bob = Math.round(Math.sin(t * 3));
  const bx = NOW_X - 6;
  const by = Math.round(yOf(p)) - 2 + bob;
  rect(ctx, C.cream, bx + 3, by - 4, 4, 3);
  sprite(ctx, ['XXXXXXXXX', '.XXXXXXX.'], bx, by, C.coral);
  sprite(ctx, ['.X.', 'XXX', '.X.', 'X.X'], bx + 3, by - 8, C.ink);
  if (storm) sprite(ctx, ['.XXXXX.', 'XXXXXXX'], bx + 1, by - 11, C.coral);
}

export function drawHold(ctx: CanvasRenderingContext2D, s: HoldState, t: number): void {
  const r = regimeAt(s.idx);
  rect(ctx, C.white, 0, 0, ART_W, ART_H);
  drawSky(ctx, r);
  if (r === 'recovery') {
    drawSun(ctx);
    drawRainbow(ctx);
  }
  drawLine(ctx, s);
  drawStrip(ctx, s);
  drawWater(ctx, t);
  drawBoat(ctx, s.path[s.idx], r === 'storm', t);
  if (r === 'storm') drawRain(ctx, t);
}
