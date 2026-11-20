import { C, rect, sprite, type Colour } from './draw';
import { BASKET_Y, type BudgetState } from './budgetState';
import { ART_H, ART_W } from './types';

const CLOUDS: [number, number, number][] = [[8, 16, 16], [58, 9, 20], [90, 28, 14]];
const BUILDINGS: [number, Colour][] = [[48, C.peach], [70, C.lilac], [56, C.cream], [88, C.turquoise], [64, C.peach], [78, C.cream], [52, C.lilac], [92, C.peach], [60, C.cream], [74, C.turquoise]];
const STREET_Y = ART_H - 22;
const SPRITES: Record<string, { rows: string[]; colour: Colour }> = {
  coin: { rows: ['.XX.', 'XXXX', 'XXXX', '.XX.'], colour: C.sun },
  rent: { rows: ['..X..', '.XXX.', 'XXXXX', 'X.X.X'], colour: C.turquoise },
  bus: { rows: ['XXXXX', 'XXXXX', '.X.X.'], colour: C.green },
  food: { rows: ['.X.X.', 'XXXXX', '.XXX.'], colour: C.greenLight },
  tea: { rows: ['XXXXX', 'XXXXX', '.XXX.'], colour: C.coral },
  gadget: { rows: ['XXXXX', 'X...X', 'XXXXX'], colour: C.lilac },
};

function sceneSky(ctx: CanvasRenderingContext2D): void {
  rect(ctx, C.skyLow, 0, 0, ART_W, ART_H);
  rect(ctx, C.skyTop, 0, 0, ART_W, 40);
  rect(ctx, C.skyLow, 0, 40, ART_W, ART_H * 0.6 - 40);
  rect(ctx, C.sun, 100, 8, 8, 8);
  CLOUDS.forEach(([x, y, w]) => {
    rect(ctx, C.white, x, y, w, 4);
    rect(ctx, C.white, x + 3, y - 2, w - 6, 2);
  });
}

function skyline(ctx: CanvasRenderingContext2D): void {
  BUILDINGS.forEach(([h, colour], i) => {
    const x = i * 12;
    const top = Math.round(STREET_Y - h * 0.5);
    rect(ctx, C.ink, x, top, 11, 1);
    rect(ctx, colour, x, top + 1, 11, STREET_Y - top - 1);
    for (let wy = top + 4; wy < STREET_Y - 4; wy += 6) {
      if ((i + wy) % 3 === 0) rect(ctx, C.sun, x + 3, wy, 2, 2);
    }
  });
}

function basket(ctx: CanvasRenderingContext2D, wallet: number): void {
  const x = Math.round(wallet * ART_W) - 10;
  rect(ctx, C.coral, x, BASKET_Y, 20, 2);
  rect(ctx, C.peach, x + 1, BASKET_Y + 2, 18, 4);
}

export function drawBudget(ctx: CanvasRenderingContext2D, s: BudgetState, _t: number): void {
  sceneSky(ctx);
  skyline(ctx);
  rect(ctx, C.greenLight, 0, STREET_Y, ART_W, ART_H - STREET_Y);
  rect(ctx, C.ink, 0, STREET_Y, ART_W, 1);
  for (const item of s.items) {
    const sp = SPRITES[item.sprite];
    sprite(ctx, sp.rows, item.x * ART_W - 2, item.y, sp.colour);
  }
  basket(ctx, s.wallet);
}
