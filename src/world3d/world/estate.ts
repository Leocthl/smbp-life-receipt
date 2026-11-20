import { box, boxColliders, line, panel, shadow } from './kit';
import { FRONT_Z, HOME_X } from './layout';
import { board, windowGrid, type WinGrid } from './windows';
import type { Ctx } from './ctx';

// The public-housing block, and the one flat in it that is the player's home. It changes with d.home.

const CX = -9.5, CZ = -11.5, W = 8, D = 4, H = 12.6, FLOOR_Y0 = 1.9, PITCH_V = 1.2;
const HOME_COL = 3, HOME_ROW = 2;

function facade(ctx: Ctx): void {
  const owner = ctx.d.home === 'owner';
  const base = owner ? 0xc4cbe0 : 0xf4f1e6;
  box(ctx.L.solid, CX, CZ, W, D, 0, H, base, { density: 34 });
  shadow(ctx.L.solid, CX, CZ, W, D);
  const bands = owner ? [0xb5e2f0, 0xf4f1e6, 0xb5e2f0] : [0xffb3a7, 0xb5e2f0, 0xd6e8a8];
  bands.forEach((c, i) => panel(ctx.L.solid, 'z', [CX + (i - 1) * (W / 3), 7.3, FRONT_Z + 0.012], W / 3 - 0.1, 10.8, c, { density: 30, shade: 0.9 }));
  panel(ctx.L.solid, 'z', [CX, 0.8, FRONT_Z + 0.015], W, 1.6, 0x5b6488, { density: 30, shade: 0.9 });
  panel(ctx.L.solid, 'x', [CX + W / 2 + 0.012, 6.3, CZ], D, 12.6, 0xf4f1e6, { density: 20, shade: 0.68 });
  ctx.colliders.push(...boxColliders(CX, CZ, W, D));
}

function grid(ctx: Ctx): WinGrid {
  const d = ctx.d;
  return {
    axis: 'z', plane: FRONT_Z + 0.02, centre: CX, y0: FLOOR_Y0, cols: 6, rows: 9, pitchU: 1.25, pitchV: PITCH_V, w: 0.75, h: 0.62,
    lit: ctx.lit, glass: 0x5b6488, boarded: d.bankrupt ? 0.3 : 0,
    skip: (i, j) => i === HOME_COL && j === HOME_ROW,
  };
}

function aircons(ctx: Ctx, g: WinGrid): void {
  for (let n = 0; n < 16; n += 1) {
    const i = Math.floor(ctx.rnd() * g.cols), j = Math.floor(ctx.rnd() * g.rows);
    if (i === HOME_COL && j === HOME_ROW) continue;
    const x = g.centre + (i - 2.5) * g.pitchU + 0.28, y = g.y0 + j * g.pitchV - 0.1;
    box(ctx.L.solid, x, FRONT_Z + 0.2, 0.5, 0.3, y, 0.28, 0xc4cbe0, { density: 80, edge: 0.4 });
  }
}

function homeUnit(ctx: Ctx): void {
  const { solid, glow } = ctx.L, d = ctx.d;
  const x = HOME_X, y = FLOOR_Y0 + HOME_ROW * PITCH_V, z = FRONT_Z + 0.06;
  const dark = d.bankrupt;
  panel(solid, 'z', [x, y + 0.36, z - 0.06], 1.3, 1.1, d.home === 'owner' ? 0x2a3f6e : 0xa86a3a, { density: 40, shade: 0.9 }); // frame that marks the home flat
  if (d.home === 'parents') {
    panel(solid, 'z', [x, y + 0.31, z - 0.04], 0.95, 0.82, 0x23263a, { density: 30 });
    panel(glow, 'z', [x, y + 0.31, z], 0.85, 0.72, dark ? 0x5b6488 : 0xffd27a, { density: 70 });
    line(solid, [x - 0.65, y + 1.0, z + 0.5], [x + 0.65, y + 1.0, z + 0.5], 0x6b3f2a, 0.04, 0.06);
    [0xff8ad1, 0x6fb0d8, 0xf4f1e6, 0xffd27a].forEach((c, i) => panel(solid, 'z', [x - 0.45 + i * 0.3, y + 0.8, z + 0.5], 0.22, 0.36, c, { density: 70, sway: 0.03 }));
    solid.blob(x + 0.5, y - 0.05, z + 0.15, 0.14, 0.1, 0.1, 14, 0x4f8a6b, 0.05);
  } else if (d.home === 'rent') {
    panel(solid, 'z', [x, y + 0.31, z - 0.04], 1.0, 0.82, 0x23263a, { density: 30 });
    panel(glow, 'z', [x - 0.24, y + 0.31, z], 0.4, 0.7, dark ? 0x5b6488 : 0xffd27a, { density: 70 });
    panel(glow, 'z', [x + 0.24, y + 0.31, z], 0.4, 0.7, dark ? 0x5b6488 : 0xb5e2f0, { density: 70 });
    for (let k = -4; k <= 4; k += 1) line(solid, [x + k * 0.11, y - 0.05, z + 0.12], [x + k * 0.11, y + 0.68, z + 0.12], 0x14161f, 0.03, 0.06);
    line(solid, [x - 0.5, y + 0.34, z + 0.12], [x + 0.5, y + 0.34, z + 0.12], 0x14161f, 0.03, 0.06);
    box(solid, x + 0.1, FRONT_Z + 0.2, 0.5, 0.3, y - 0.45, 0.28, 0xc4cbe0, { density: 80, edge: 0.4 });
    box(solid, x - 0.5, FRONT_Z + 0.2, 0.5, 0.3, y - 0.45, 0.28, 0xc4cbe0, { density: 80, edge: 0.4 });
    panel(solid, 'z', [x + 0.9, y + 0.3, z + 0.02], 0.3, 0.4, 0xd8504a, { density: 80 });
  } else {
    box(solid, x, FRONT_Z + 0.55, 1.7, 1.1, y - 0.12, 0.12, 0xf4f1e6, { density: 50 });
    panel(solid, 'z', [x, y + 0.2, FRONT_Z + 1.1], 1.7, 0.5, 0x8fd0f0, { density: 50, opacity: 0.6 });
    panel(solid, 'x', [x + 0.85, y + 0.2, FRONT_Z + 0.55], 1.1, 0.5, 0x8fd0f0, { density: 50, opacity: 0.6, shade: 0.7 });
    panel(solid, 'z', [x, y + 0.4, z - 0.04], 1.5, 1.05, 0x23263a, { density: 30 });
    panel(glow, 'z', [x, y + 0.4, z], 1.4, 0.95, dark ? 0x5b6488 : 0xfff0b8, { density: 70 });
    for (const dx of [-0.55, 0, 0.55]) solid.blob(x + dx, y + 0.18, FRONT_Z + 0.7, 0.2, 0.2, 0.2, 26, ctx.joy > 0.3 ? 0x4f8a6b : 0xa86a3a, 0.06);
    solid.blob(x + 0.7, y + 0.22, FRONT_Z + 0.9, 0.12, 0.2, 0.12, 12, 0xff8ad1, 0.05);
  }
  if (dark) board(ctx, { axis: 'z', plane: FRONT_Z + 0.02, centre: x, y0: y, cols: 1, pitchU: 1, pitchV: 1, w: 1.0, h: 0.8 }, 0, 0);
}

function lobby(ctx: Ctx): void {
  const { solid, glow } = ctx.L;
  panel(solid, 'z', [HOME_X, 0.7, FRONT_Z + 0.05], 1.2, 1.4, 0x23263a, { density: 40 });
  if (ctx.d.bankrupt) {
    panel(solid, 'z', [HOME_X, 0.7, FRONT_Z + 0.1], 1.1, 1.3, 0x6b3f2a, { density: 40 });
    line(solid, [HOME_X - 0.5, 0.15, FRONT_Z + 0.13], [HOME_X + 0.5, 1.25, FRONT_Z + 0.13], 0x3a2418, 0.05, 0.05);
    line(solid, [HOME_X - 0.5, 1.25, FRONT_Z + 0.13], [HOME_X + 0.5, 0.15, FRONT_Z + 0.13], 0x3a2418, 0.05, 0.05);
  } else {
    panel(solid, 'z', [HOME_X, 0.65, FRONT_Z + 0.1], 1.0, 1.3, 0xa86a3a, { density: 40 });
    panel(glow, 'z', [HOME_X, 1.55, FRONT_Z + 0.1], 0.5, 0.14, 0xfff0b8, { density: 90 });
  }
  panel(solid, 'y', [HOME_X, 0.035, FRONT_Z + 0.55], 1.1, 0.6, 0xd8504a, { density: 40, thick: 0.01 });
  for (const x of [-12.3, -6.7]) panel(solid, 'z', [x, 0.7, FRONT_Z + 0.06], 0.9, 1.1, 0x3a3f5c, { density: 40 });
}

function roof(ctx: Ctx): void {
  for (const x of [-11.6, -7.4]) box(ctx.L.solid, x, CZ, 1.1, 1.1, H, 0.9, 0x8a95b8, { density: 50 });
  line(ctx.L.solid, [-9.5, H, CZ], [-9.5, H + 2.2, CZ], 0x3a3f5c, 0.05, 0.07);
  ctx.L.glow.blob(-9.5, H + 2.3, CZ, 0.1, 0.1, 0.1, 8, 0xff7b6b, 0.05);
}

export function buildEstate(ctx: Ctx): void {
  facade(ctx);
  const g = grid(ctx);
  windowGrid(ctx, g);
  aircons(ctx, g);
  homeUnit(ctx);
  lobby(ctx);
  roof(ctx);
}
