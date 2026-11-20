import { box, boxColliders, line, panel, shadow } from './kit';
import { windowGrid } from './windows';
import type { Ctx } from './ctx';

// Office tower, bank, clinic, campus gate.

function officeTower(ctx: Ctx): void {
  const { solid, glow } = ctx.L, job = ctx.d.job;
  const cx = 10.45, cz = -11.4, w = 4.5, d = 3.8, h = 16;
  box(solid, cx, cz, w, d, 0, h, 0x3d7fc4, { density: 34 });
  shadow(solid, cx, cz, w, d);
  const lit = job === 'employed' ? 0.8 : job === 'retired' ? 0.45 : job === 'student' ? 0.5 : 0.03;
  const glass = job === 'unemployed' ? 0x6b789c : 0x8fd3ff;
  const front = cz + d / 2;
  windowGrid(ctx, { axis: 'z', plane: front + 0.02, centre: cx, y0: 2.2, cols: 5, rows: 12, pitchU: 0.84, pitchV: 1.12, w: 0.62, h: 0.8, lit, glass, frame: 0x2b3a55, litColors: [0xfff0a0, 0xffd85a, 0xfff0a0, 0xcdeeff] });
  windowGrid(ctx, { axis: 'x', plane: cx + w / 2 + 0.02, centre: cz, y0: 2.2, cols: 4, rows: 12, pitchU: 0.9, pitchV: 1.12, w: 0.66, h: 0.8, lit, glass, frame: 0x2b3a55 });
  panel(solid, 'z', [cx, 1.0, front + 0.03], w, 2.0, 0x2b3a55, { density: 40, shade: 0.9 });
  panel(glow, 'z', [cx, 0.9, front + 0.06], 1.3, 1.5, job === 'unemployed' ? 0x6b789c : 0xffd85a, { density: 60 });
  box(solid, cx, cz, w + 0.3, d + 0.3, h, 0.35, 0xc9d3e6, { density: 50, edge: 0.4 });
  line(solid, [cx, h + 0.35, cz], [cx, h + 2.8, cz], 0x6b789c, 0.05, 0.07);
  glow.blob(cx, h + 2.9, cz, 0.12, 0.12, 0.12, 8, 0xff8a6b, 0.05);
  if (job === 'unemployed') {
    panel(solid, 'z', [cx, 3.4, front + 0.09], 2.4, 0.8, 0xfff6dc, { density: 40 });
    panel(solid, 'z', [cx, 3.4, front + 0.1], 1.8, 0.22, 0xd9553f, { density: 60 });
  } else {
    panel(glow, 'z', [cx, 2.55, front + 0.1], 2.4, 0.22, ctx.wealth > 0.5 ? 0x8fd3ff : 0x3d7fc4, { density: 60 });
  }
  ctx.colliders.push(...boxColliders(cx, cz, w, d));
}

const TICKER: Record<string, number[]> = { bull: [0.3, 0.45, 0.65, 0.9], recovery: [0.2, 0.25, 0.45, 0.7], normal: [0.5, 0.6, 0.55, 0.62], correction: [0.8, 0.65, 0.55, 0.4], crash: [0.9, 0.6, 0.4, 0.2] };

function bank(ctx: Ctx): void {
  const { solid, glow } = ctx.L, r = ctx.d.regime;
  const cx = 4.25, cz = -11, w = 4.5, d = 3, h = 6.5, front = cz + d / 2;
  box(solid, cx, cz, w, d, 0, h, 0xc9d3e6, { density: 36 });
  shadow(solid, cx, cz, w, d);
  box(solid, cx, cz + 0.1, w + 0.4, d + 0.2, h, 0.45, 0xc9d3e6, { density: 50, edge: 0.4 });
  for (let i = 0; i < 4; i += 1) box(solid, cx - 1.65 + i * 1.1, front + 0.35, 0.4, 0.4, 0, 4.4, 0xfff6dc, { density: 70, edge: 0.4 });
  panel(solid, 'z', [cx, 4.7, front + 0.2], w - 0.2, 0.55, 0xfff6dc, { density: 50 });
  const goldGlow = ctx.wealth > 0.45 ? 0xffd85a : 0xf2a93a;
  panel(glow, 'z', [cx, 5.5, front + 0.05], 3.2, 0.7, goldGlow, { density: 60 });
  panel(solid, 'z', [cx, 1.6, front + 0.03], 1.5, 3.2, 0x6f4a32, { density: 40 });
  panel(glow, 'z', [cx, 1.0, front + 0.07], 0.6, 0.6, 0xffd85a, { density: 80, mask: (u, v) => (u - 0.5) ** 2 + (v - 0.5) ** 2 < 0.25 });
  windowGrid(ctx, { axis: 'x', plane: cx + w / 2 + 0.02, centre: cz, y0: 1.4, cols: 3, rows: 3, pitchU: 0.9, pitchV: 1.5, w: 0.5, h: 0.9, lit: ctx.lit + 0.2, glass: 0x3d7fc4 });
  // ticker board on the roof: bars show where the market is heading
  panel(solid, 'z', [cx, h + 1.5, cz + 0.8], 2.6, 1.6, 0x2b3a55, { density: 40 });
  (TICKER[r] ?? TICKER.normal).forEach((v, i) => {
    const col = r === 'crash' || r === 'correction' ? 0xd9553f : 0x7ed07a;
    panel(glow, 'z', [cx - 0.85 + i * 0.57, h + 0.85 + v * 0.65, cz + 0.84], 0.34, 1.3 * v, col, { density: 90 });
  });
  for (const x of [cx - 1.1, cx + 1.1]) line(solid, [x, h + 0.45, cz + 0.8], [x, h + 0.7, cz + 0.8], 0x6b789c, 0.05, 0.06);
  if (ctx.wealth > 0.6) for (let k = 0; k < 7; k += 1) glow.blob(cx - 2 + ctx.rnd() * 4, 3 + ctx.rnd() * 3, front + 0.8, 0.07, 0.07, 0.07, 3, 0xfff0a0, 0.05);
  ctx.colliders.push(...boxColliders(cx, cz, w, d));
}

function clinic(ctx: Ctx): void {
  const { solid, glow } = ctx.L;
  const cx = -12, cz = 1, w = 3, d = 4, h = 4.5, front = cx + w / 2;
  box(solid, cx, cz, w, d, 0, h, 0xfff6dc, { density: 40 });
  shadow(solid, cx, cz, w, d);
  panel(solid, 'x', [front + 0.02, 3.4, cz], d, 0.5, 0x7ed07a, { density: 50, shade: 0.68 });
  const cross = (u: number, v: number) => Math.abs(u - 0.5) < 0.17 || Math.abs(v - 0.5) < 0.17;
  panel(glow, 'x', [front + 0.05, 2.1, cz], 1.3, 1.3, 0x7ed07a, { density: 70, mask: cross });
  panel(solid, 'x', [front + 0.03, 0.9, cz - 1.2], 1.0, 1.5, 0x8fd3ff, { density: 50, shade: 0.7 });
  windowGrid(ctx, { axis: 'x', plane: front + 0.02, centre: cz + 0.9, y0: 1.2, cols: 2, rows: 1, pitchU: 1.1, pitchV: 1, w: 0.8, h: 0.9, lit: 0.8, glass: 0x8fd3ff, litColors: [0xcdeeff, 0xfff0a0] });
  if (ctx.d.insured) shield(ctx, front, cz);
  ctx.colliders.push(...boxColliders(cx, cz, w, d));
}

/** Insured: a small blue shield glowing over the clinic door. */
function shield(ctx: Ctx, x: number, z: number): void {
  const inShield = (u: number, v: number) => v > 0.55 ? Math.abs(u - 0.5) < 0.5 : Math.abs(u - 0.5) < (v / 0.55) * 0.5;
  panel(ctx.L.glow, 'x', [x + 0.2, 5.6, z], 1.0, 1.15, 0x8fd3ff, { density: 110, mask: inShield });
  panel(ctx.L.glow, 'z', [x + 0.2, 5.6, z], 1.0, 1.15, 0x8fd3ff, { density: 110, mask: inShield });
  panel(ctx.L.glow, 'x', [x + 0.24, 5.65, z], 0.45, 0.4, 0xffffff, { density: 130, mask: (u, v) => v < 0.5 + (0.5 - Math.abs(u - 0.5)) * 0.4 && v > 0.5 - (0.5 - Math.abs(u - 0.5)) * 0.2 });
}

function campus(ctx: Ctx): void {
  const { solid, glow } = ctx.L, student = ctx.d.job === 'student';
  const cx = -12.3, cz = 6, w = 2.6, d = 4.6, h = 4.2, front = cx + w / 2;
  box(solid, cx, cz, w, d, 0, h, 0xd9553f, { density: 44, top: 0x6f4a32 });
  shadow(solid, cx, cz, w, d);
  panel(solid, 'x', [front + 0.015, 2.2, cz], d, 0.16, 0xfff6dc, { density: 40, shade: 0.7 });
  windowGrid(ctx, { axis: 'x', plane: front + 0.02, centre: cz, y0: 0.9, cols: 4, rows: 3, pitchU: 1.05, pitchV: 1.05, w: 0.55, h: 0.6, lit: student ? 0.9 : 0.25, glass: 0x3d7fc4, frame: 0xfff6dc });
  // clock tower
  box(solid, cx - 0.2, cz, 1.1, 1.1, h, 2.6, 0xe8a77a, { density: 60 });
  panel(solid, 'x', [cx + 0.37, h + 1.6, cz], 0.7, 0.7, 0xfff6dc, { density: 90, mask: (u, v) => (u - 0.5) ** 2 + (v - 0.5) ** 2 < 0.24 });
  panel(solid, 'z', [cx - 0.2, h + 1.6, cz + 0.57], 0.7, 0.7, 0xfff6dc, { density: 90, mask: (u, v) => (u - 0.5) ** 2 + (v - 0.5) ** 2 < 0.24 });
  // gate: two pillars and an arch carrying a crest
  const gx = -9.6;
  for (const z of [3.9, 8.1]) box(solid, gx, z, 0.6, 0.6, 0, 2.8, 0xfff6dc, { density: 80 });
  box(solid, gx, 6, 0.5, 4.8, 2.5, 0.5, 0xfff6dc, { density: 70, edge: 0.4 });
  panel(solid, 'x', [gx + 0.27, 3.45, 6], 1.7, 0.9, 0x3d7fc4, { density: 70, shade: 0.7 });
  panel(glow, 'x', [gx + 0.3, 3.45, 6], 0.5, 0.5, 0xffd85a, { density: 100, mask: (u, v) => Math.abs(u - 0.5) + Math.abs(v - 0.5) < 0.5 });
  // flags: busier when you are a student
  const flags = student ? [0xff9ec4, 0x8fd3ff, 0xffd85a, 0xd9553f, 0xb6e88a] : [0x8fd3ff, 0xffd85a];
  flags.forEach((c, i) => {
    const z = 4.4 + i * (3.2 / Math.max(1, flags.length - 1));
    line(solid, [gx + 0.4, 0, z], [gx + 0.4, 3.4, z], 0xc9d3e6, 0.04, 0.08);
    panel(solid, 'x', [gx + 0.4, 3.0, z + 0.25], 0.5, 0.3, c, { density: 90, sway: 0.08 });
  });
  if (student) for (let k = 0; k < 10; k += 1) glow.blob(-8 + ctx.rnd() * 2, 2 + ctx.rnd() * 2, 4 + ctx.rnd() * 4, 0.05, 0.05, 0.05, 2, [0xff9ec4, 0xffd85a, 0x8fd3ff][k % 3], 0.05);
  ctx.colliders.push(...boxColliders(cx, cz, w, d), { x: gx, z: 3.9, r: 0.4 }, { x: gx, z: 8.1, r: 0.4 });
}

export function buildTowers(ctx: Ctx): void {
  officeTower(ctx);
  bank(ctx);
  clinic(ctx);
  if (ctx.ext.z1 > 9) campus(ctx); // the campus lies beyond the block
}
