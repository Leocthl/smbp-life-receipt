import { box, boxColliders, line, panel, shadow, stripes } from './kit';
import { ROAD } from './layout';
import type { Ctx } from './ctx';

// Cha chaan teng, wet market, side-hustle stall and the car.

function cafe(ctx: Ctx): void {
  const { solid, glow, sky } = ctx.L;
  const cx = -1.5, cz = -10.8, w = 4, d = 2.6, h = 3.3, front = cz + d / 2;
  box(solid, cx, cz, w, d, 0, h, 0xf4f1e6, { density: 44 });
  shadow(solid, cx, cz, w, d);
  const tile = (u: number, v: number) => ((Math.floor(u * 16) + Math.floor(v * 6)) % 2 === 0 ? 0x2f5d50 : 0x4f8a6b);
  panel(solid, 'z', [cx, 0.6, front + 0.015], w, 1.2, tile, { density: 70, shade: 0.9 });
  panel(solid, 'z', [cx, 1.65, front + 0.03], 2.8, 1.1, 0x23263a, { density: 40 });
  panel(glow, 'z', [cx, 1.65, front + 0.06], 2.6, 0.95, 0xffd27a, { density: 70 });
  panel(solid, 'z', [cx + 1.6, 1.0, front + 0.05], 0.6, 1.9, 0xa86a3a, { density: 50 });
  // striped awning
  panel(solid, 'z', [cx, 2.5, front + 0.5], w + 0.2, 0.5, stripes(0xd8504a, 0xf4f1e6, 14), { density: 60, shade: 0.95 });
  panel(solid, 'y', [cx, 2.75, front + 0.4], w + 0.2, 0.9, stripes(0xd8504a, 0xf4f1e6, 14), { density: 60, thick: 0.03 });
  // neon sign: brighter when you have money
  const bright = ctx.wealth > 0.45;
  panel(glow, 'z', [cx, h + 0.45, front - 0.1], 2.8, 0.7, bright ? 0xff7b6b : 0xd8504a, { density: 60 });
  panel(glow, 'z', [cx - 0.9, h + 0.45, front - 0.05], 0.4, 0.4, 0xffd27a, { density: 100, mask: (u, v) => (u - 0.5) ** 2 + (v - 0.5) ** 2 < 0.25 });
  for (const x of [cx - 0.8, cx + 0.5]) {
    line(solid, [x, 0, front + 1.1], [x, 0.7, front + 1.1], 0x3a3f5c, 0.04, 0.07);
    solid.blob(x, 0.75, front + 1.1, 0.3, 0.05, 0.3, 14, 0xf4f1e6, 0.07);
    for (const dx of [-0.45, 0.45]) solid.blob(x + dx, 0.3, front + 1.1, 0.14, 0.14, 0.14, 12, 0x2f5d50, 0.06);
  }
  for (let k = 0; k < 6; k += 1) sky.blob(cx - 1.4 + ctx.rnd() * 0.5, h + 0.4 + k * 0.28, cz + 0.4, 0.2, 0.2, 0.2, 6, 0xf4f1e6, 0.14, { opacity: 0.35, sway: 0.2 });
  ctx.colliders.push(...boxColliders(cx, cz, w, d));
}

const AWNINGS: [number, number][] = [[0xd8504a, 0xf4f1e6], [0x4f8a6b, 0xf4f1e6], [0x3c6ea8, 0xffd27a], [0xc0458f, 0xf4f1e6], [0xe0a050, 0xf4f1e6], [0x4f8a6b, 0xffd27a]];
const GOODS = [0xd8504a, 0x8cbf7a, 0xe0a050, 0x9c84d4, 0xff8ad1, 0xffd27a];

function stall(ctx: Ctx, x: number, z: number, i: number): void {
  const { solid, glow } = ctx.L, [a, b] = AWNINGS[i % AWNINGS.length];
  box(solid, x, z, 1.9, 0.9, 0, 0.7, 0xa86a3a, { density: 50 });
  for (let k = 0; k < 4; k += 1) solid.blob(x - 0.7 + k * 0.47, 0.82, z + 0.1, 0.22, 0.14, 0.28, 18, GOODS[(i + k) % GOODS.length], 0.07);
  for (const dx of [-0.95, 0.95]) for (const dz of [-0.45, 0.45]) line(solid, [x + dx, 0, z + dz], [x + dx, 2.2, z + dz], 0x6b3f2a, 0.04, 0.07);
  panel(solid, 'y', [x, 2.3, z], 2.2, 1.2, stripes(a, b, 8), { density: 55, thick: 0.03, shade: 1 });
  panel(solid, 'z', [x, 2.12, z + 0.6], 2.2, 0.3, stripes(a, b, 8), { density: 70, shade: 0.9 });
  glow.blob(x, 1.95, z + 0.2, 0.08, 0.08, 0.08, 5, 0xffd27a, 0.05);
  ctx.colliders.push({ x, z, r: 0.85 });
}

function market(ctx: Ctx): void {
  [4, 6.5, 9].forEach((x, i) => { stall(ctx, x, -0.2, i); stall(ctx, x + 0.2, 3.9, i + 3); });
  box(ctx.L.solid, 11.7, 1.8, 0.9, 0.9, 0, 0.6, 0x3c6ea8, { density: 60 });
  ctx.colliders.push({ x: 11.7, z: 1.8, r: 0.5 });
}

function hustle(ctx: Ctx): void {
  if (!ctx.d.sideHustle) return;
  const { solid, glow } = ctx.L, x = -12.4, z = -8.1;
  box(solid, x, z, 1.5, 0.8, 0, 0.8, 0xff8ad1, { density: 60 });
  panel(solid, 'y', [x, 2.2, z], 1.9, 1.1, stripes(0xffd27a, 0xff8ad1, 6), { density: 55, thick: 0.03 });
  for (const dx of [-0.9, 0.9]) line(solid, [x + dx, 0, z + 0.4], [x + dx, 2.2, z + 0.4], 0x6b3f2a, 0.04, 0.07);
  solid.blob(x - 0.3, 0.95, z + 0.1, 0.2, 0.14, 0.2, 14, 0x6fb0d8, 0.06);
  solid.blob(x + 0.3, 0.95, z + 0.1, 0.2, 0.14, 0.2, 14, 0xffd27a, 0.06);
  panel(glow, 'z', [x, 1.75, z + 0.42], 1.0, 0.3, 0xfff0b8, { density: 80 });
  ctx.colliders.push({ x, z, r: 0.8 });
}

function car(ctx: Ctx): void {
  if (!ctx.d.car) return;
  const { solid, glow } = ctx.L, x = -6.2, z = ROAD.z0 + 0.5;
  const paint = ctx.d.lifestyle > 0.5 ? 0x5a4a8a : 0xd8504a;
  box(solid, x, z, 2.3, 1.0, 0.25, 0.55, paint, { density: 80 });
  box(solid, x - 0.1, z, 1.2, 0.9, 0.8, 0.45, 0xb5e2f0, { density: 90, top: paint });
  for (const dx of [-0.75, 0.75]) for (const dz of [-0.5, 0.5]) solid.blob(x + dx, 0.22, z + dz, 0.22, 0.22, 0.08, 14, 0x14161f, 0.06);
  glow.blob(x + 1.15, 0.5, z - 0.3, 0.06, 0.06, 0.1, 4, 0xfff0b8, 0.05);
  glow.blob(x + 1.15, 0.5, z + 0.3, 0.06, 0.06, 0.1, 4, 0xfff0b8, 0.05);
  ctx.colliders.push({ x: x - 0.5, z, r: 0.55 }, { x: x + 0.5, z, r: 0.55 });
}

export function buildShops(ctx: Ctx): void {
  cafe(ctx);
  market(ctx);
  hustle(ctx);
  car(ctx);
}
