import { box, boxColliders, line, mix, panel, smooth, stripes } from './kit';
import type { Ctx } from './ctx';

// The bedroom cut-away: two walls and a floor, seen from the corner. The window shows the market's weather.

export const ROOM = { x0: -3, x1: 3, z0: -3, z1: 3, h: 3.4 };
const WALL_BACK = 0xe4dcff, WALL_SIDE = 0xffe0c8;

export function floorAndWalls(ctx: Ctx, x1: number): void {
  const b = ctx.L.solid, cx = (ROOM.x0 + x1) / 2, w = x1 - ROOM.x0;
  box(b, cx, 0, w + 0.2, 6.2, -0.4, 0.4, 0xa8744a, { density: 30, top: 0xffc29b, edge: 0.55 });
  for (let z = -2.6; z < 3; z += 0.6) line(b, [ROOM.x0, 0.01, z], [x1, 0.01, z], 0xe8a77a, 0.03, 0.07);
  box(b, (ROOM.x0 + x1) / 2 + 0.125, -3.125, w + 0.25, 0.25, 0, ROOM.h, WALL_BACK, { density: 40, top: 0xfff6dc, flat: true, jitter: 0.004 });
  box(b, -3.125, 0, 0.25, 6.5, 0, ROOM.h, WALL_SIDE, { density: 40, top: 0xfff6dc, flat: true, jitter: 0.004 });
  panel(b, 'z', [cx, 0.14, -2.98], w, 0.28, 0xfff6dc, { density: 60 });
  panel(b, 'x', [-2.98, 0.14, 0], 6, 0.28, 0xfff6dc, { density: 60 });
  // Finished dollhouse exterior backing + plinth trim for 360-degree camera orbit
  panel(b, 'z', [cx - 0.06, ROOM.h / 2, -3.26], w + 0.25, ROOM.h, 0xc9d3e6, { density: 36, shade: 0.88 });
  panel(b, 'x', [-3.26, ROOM.h / 2, 0], 6.5, ROOM.h, 0x9aa8c4, { density: 36, shade: 0.85 });
  panel(b, 'z', [cx - 0.06, 0.16, -3.27], w + 0.28, 0.32, 0x4a5578, { density: 48 });
  panel(b, 'x', [-3.27, 0.16, 0], 6.55, 0.32, 0x4a5578, { density: 48 });
  panel(b, 'z', [cx, -0.2, 3.1], w + 0.2, 0.4, 0x6f4a32, { density: 34, shade: 0.82 });
  panel(b, 'x', [x1 + 0.1, -0.2, 0], 6.2, 0.4, 0x6f4a32, { density: 34, shade: 0.78 });
}

/** A window in the back wall at x = cx: sky, sun, clouds or rain, and a skyline, so the market's mood shows in the room. */
export function windowAt(ctx: Ctx, cx: number): void {
  const { solid, glow } = ctx.L, t = ctx.tone, y = 1.9, w = 1.7, h = 1.6, z = -2.97;
  panel(solid, 'z', [cx, y, z + 0.01], w + 0.3, h + 0.3, 0xfff6dc, { density: 80 });
  panel(solid, 'z', [cx, y, z + 0.02], w, h, t.sky, { density: 90 });
  if (t.sun) glow.blob(cx - 0.4, y + 0.35, z + 0.03, 0.22, 0.22, 0.02, 30, t.sun.color, 0.05);
  const cloud = t.cloud;
  for (let i = 0; i < Math.min(4, 1 + Math.floor(t.clouds / 3)); i += 1) solid.blob(cx - 0.5 + i * 0.5, y + 0.3 + (i % 2) * 0.15, z + 0.04, 0.3, 0.1, 0.02, 24, cloud, 0.05, { sway: 0.03 });
  panel(solid, 'z', [cx, y - 0.62, z + 0.045], w, 0.32, mix(0x4cc3d9, t.sky, t.rain ? 0.5 : 0), { density: 90 });
  [[-0.55, 0.45], [-0.15, 0.7], [0.3, 0.5], [0.62, 0.62]].forEach(([dx, hh], i) => panel(solid, 'z', [cx + dx, y - 0.46 + hh / 2, z + 0.05], 0.28, hh, i % 2 ? 0xc9d3e6 : 0xe4dcff, { density: 90 }));
  if (t.rain) for (let i = 0; i < 14; i += 1) line(solid, [cx - 0.8 + ctx.rnd() * 1.6, y + 0.7, z + 0.08], [cx - 0.85 + ctx.rnd() * 1.6, y + 0.35, z + 0.08], 0xcdeeff, 0.015, 0.03);
  line(solid, [cx, y - 0.8, z + 0.09], [cx, y + 0.8, z + 0.09], 0xfff6dc, 0.035, 0.04);
  line(solid, [cx - 0.85, y, z + 0.09], [cx + 0.85, y, z + 0.09], 0xfff6dc, 0.035, 0.04);
  for (const s of [-1, 1]) panel(solid, 'z', [cx + s * 1.0, y + 0.1, z + 0.12], 0.3, 1.9, ctx.d.bankrupt ? 0x9aa8c4 : 0xff8a6b, { density: 80, sway: 0.02 });
  if (ctx.d.bankrupt) for (const dy of [-0.4, 0, 0.4]) panel(solid, 'z', [cx, y + dy, z + 0.14], w + 0.2, 0.22, 0x6f4a32, { density: 90 });
  else if (!t.rain && t.sun) panel(glow, 'y', [cx + 0.4, 0.03, -1.7], 1.5, 2.4, 0xfff0a0, { density: 12, opacity: 0.22, thick: 0.01 });
}

export function bedroom(ctx: Ctx): void {
  const b = ctx.L.solid, g = ctx.L.glow, d = ctx.d;
  const blanket = d.home === 'owner' ? 0xb9a7ff : d.home === 'rent' ? 0x4cc3d9 : 0xff8a6b;
  const rug = d.home === 'owner' ? 0xe4dcff : d.home === 'rent' ? 0xcdeeff : 0xffe0c8;
  panel(b, 'y', [0.8, 0.02, 0.9], 3.2, 2.4, rug, { density: 20, thick: 0.01 });
  panel(b, 'y', [0.8, 0.03, 0.9], 2.7, 1.9, stripes(blanket, rug, 1), { density: 20, thick: 0.01, opacity: 0.5 });
  box(b, -1.95, 0.9, 1.9, 3.0, 0, 0.4, 0xa8744a, { density: 60 });
  box(b, -1.95, 0.9, 1.8, 2.9, 0.4, 0.22, 0xfff6dc, { density: 70, top: 0xfff6dc });
  box(b, -1.95, 1.5, 1.82, 1.7, 0.6, 0.1, blanket, { density: 80, edge: 0.4 });
  box(b, -1.95, -0.2, 0.9, 0.5, 0.62, 0.13, 0xffffff, { density: 90, edge: 0.4 });
  box(b, -1.8, -2.5, 2.2, 1, 0.72, 0.1, 0xe8a77a, { density: 80 });
  for (const [x, z] of [[-2.8, -2.9], [-0.8, -2.9], [-2.8, -2.1], [-0.8, -2.1]]) line(b, [x, 0, z], [x, 0.72, z], 0xa8744a, 0.05, 0.06);
  box(b, -1.7, -1.35, 0.7, 0.7, 0.45, 0.1, 0xff8a6b, { density: 100, edge: 0.4 });
  box(b, -1.7, -1.02, 0.7, 0.08, 0.55, 0.6, 0xff8a6b, { density: 100, edge: 0.4 });
  for (const x of [-1.95, -1.45]) line(b, [x, 0, -1.35], [x, 0.45, -1.35], 0xa8744a, 0.04, 0.06);
  line(b, [-2.75, 0.82, -2.8], [-2.55, 1.3, -2.75], 0x6b789c, 0.03, 0.05);
  g.blob(-2.5, 1.32, -2.72, 0.14, 0.08, 0.14, 14, 0xfff0a0, 0.05);
  bookcase(ctx);
  box(b, -1.8, -2.78, 2.2, 0.4, 1.89, 0.06, 0xe8a77a, { density: 80, edge: 0.4 });
  plant(ctx);
  cat(ctx);
}

function bookcase(ctx: Ctx): void {
  const b = ctx.L.solid;
  box(b, 2.45, -2.7, 1.1, 0.6, 0, 2.4, 0xa8744a, { density: 50 });
  panel(b, 'z', [2.45, 1.2, -2.395], 0.95, 2.3, 0xffe0c8, { density: 70 });
  for (const y of [0.86, 1.56, 2.26]) box(b, 2.45, -2.62, 1.0, 0.45, y, 0.06, 0xe8a77a, { density: 100, edge: 0.4 });
  ['#d9553f', '#4cc3d9', '#ffd85a', '#7ed07a', '#b9a7ff', '#ff8a6b'].forEach((_, i) => {
    const cols = [0xd9553f, 0x4cc3d9, 0xffd85a, 0x7ed07a, 0xb9a7ff, 0xff8a6b];
    box(b, 2.05 + i * 0.16, -2.65, 0.1, 0.3, 0.06, 0.55 + (i % 3) * 0.06, cols[i], { density: 150, edge: 0.4 });
  });
  ctx.colliders.push(...boxColliders(2.45, -2.7, 1.1, 0.6));
}

function plant(ctx: Ctx): void {
  const j = smooth(ctx.joy / 0.7), b = ctx.L.solid;
  box(b, -0.35, -2.6, 0.4, 0.4, 0, 0.35, 0xff8a6b, { density: 100, edge: 0.4 });
  b.blob(-0.35, 0.95, -2.6, 0.4, 0.5, 0.4, Math.round(30 + 70 * j), mix(0xf2a93a, 0x7ed07a, j), 0.1, { sway: 0.03 });
}

function cat(ctx: Ctx): void {
  const b = ctx.L.crowd;
  b.blob(-1.95, 0.85, 2.0, 0.28, 0.14, 0.18, 40, 0xf2a93a, 0.06);
  b.blob(-1.95, 0.98, 2.28, 0.12, 0.12, 0.12, 20, 0xf2a93a, 0.05);
  b.blob(-1.95, 0.84, 1.7, 0.1, 0.05, 0.24, 14, 0xf2a93a, 0.04, { sway: 0.03 });
}

export function roomColliders(ctx: Ctx): void {
  ctx.colliders.push(...boxColliders(-1.95, 0.9, 1.9, 3.0), ...boxColliders(-1.8, -2.5, 2.2, 1));
}

/** Low spirits: grey fog on the floor and a dark cloud at the window. */
export function roomMood(ctx: Ctx): void {
  const lack = Math.max(ctx.d.bankrupt ? 1 : 0, (0.5 - ctx.freedom) * 2);
  if (lack <= 0) return;
  for (let i = 0; i < Math.ceil(lack * 3); i += 1) ctx.L.sky.blob(-2 + ctx.rnd() * 5, 0.25, -1.5 + ctx.rnd() * 4, 1.0, 0.2, 0.7, 20, 0x9aa8c4, 0.25, { opacity: 0.16, sway: 0.1 });
  if (lack > 0.4) ctx.L.solid.blob(0.5, 2.5, -2.93, 0.6, 0.18, 0.02, 40, 0x4a5578, 0.06);
}
