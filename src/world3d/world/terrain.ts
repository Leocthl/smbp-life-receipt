import { box, checker, line, lighten, mix, panel, stripes, type ColorFn } from './kit';
import { FRONT_Z, ROAD, SEA_Z } from './layout';
import type { Ctx } from './ctx';

// Ground, street, tram line, harbour, pier, lamps. Ground rectangles tile the land exactly, so splats never fight.

const tiled = (c: number, nu: number, nv: number): ColorFn => checker(c, lighten(c, 0.07), nu, nv);

function rect(ctx: Ctx, x0: number, x1: number, z0: number, z1: number, color: number | ColorFn, density = 16): void {
  panel(ctx.L.solid, 'y', [(x0 + x1) / 2, 0, (z0 + z1) / 2], x1 - x0, z1 - z0, color, { density, thick: 0.03, jitter: 0.04 });
}

function land(ctx: Ctx): void {
  const dry = 1 - ctx.joy;
  const grass = mix(0x4f8a6b, 0x8a7a50, dry * 0.8), lawn = mix(0x8cbf7a, 0xa89a5a, dry * 0.8);
  rect(ctx, -14, 14, -14, FRONT_Z, 0x5b6488, 10);
  rect(ctx, -14, 14, FRONT_Z, -6.8, tiled(0x8a95b8, 28, 2.5));
  rect(ctx, -14, 14, -6.8, ROAD.z0, 0xc4cbe0);
  rect(ctx, -14, 14, ROAD.z0, ROAD.z1, 0x3a3f5c);
  rect(ctx, -14, 14, ROAD.z1, -2.4, 0xc4cbe0);
  rect(ctx, -14, 14, -2.4, -1.4, tiled(0x8a95b8, 28, 1));
  rect(ctx, -14, -6.5, -1.4, 3.5, tiled(0x8a95b8, 6, 4));
  rect(ctx, -14, -6.5, 3.5, 8.4, lawn);
  rect(ctx, -6.5, 1.5, -1.4, 8.4, grass, 18);
  rect(ctx, 1.5, 14, -1.4, 5.8, tiled(0x5b6488, 10, 6));
  rect(ctx, 1.5, 14, 5.8, 8.4, tiled(0xc4cbe0, 12, 3));
  rect(ctx, -14, 14, 8.4, SEA_Z, tiled(0xf4f1e6, 28, 1.5));
}

function street(ctx: Ctx): void {
  const s = ctx.L.solid, z = ROAD.tramZ;
  panel(s, 'y', [0, 0.02, z], 28, 1.3, 0x5b6488, { density: 24, thick: 0.01 });
  for (const dz of [-0.3, 0.3]) line(s, [-14, 0.05, z + dz], [14, 0.05, z + dz], 0xc4cbe0, 0.04, 0.06);
  for (let x = -13.5; x < 14; x += 0.7) panel(s, 'y', [x, 0.03, z], 0.12, 1.1, 0x23263a, { density: 60, thick: 0.01 });
  for (let i = 0; i < 6; i += 1) panel(s, 'y', [2.2, 0.03, ROAD.z0 + 0.35 + i * 0.64], 0.9, 0.3, 0xf4f1e6, { density: 60, thick: 0.01 });
  for (let x = -13; x < 14; x += 1.6) panel(s, 'y', [x, 0.03, -6.2 + 0.0], 0.7, 0.07, 0xf4f1e6, { density: 80, thick: 0.01, opacity: 0.6 });
  // overhead tram wire
  line(s, [-14, 4.6, z], [14, 4.6, z], 0x14161f, 0.03, 0.12, 0.8);
  for (const x of [-12, -3, 6, 13]) line(s, [x, 0, -2.5], [x, 4.6, -2.5], 0x3a3f5c, 0.07, 0.08);
}

function seawall(ctx: Ctx): void {
  const s = ctx.L.solid;
  panel(s, 'z', [0, -0.4, SEA_Z], 28, 0.8, 0x3a3f5c, { density: 24, shade: 0.85 });
  panel(s, 'x', [14, -0.5, (-14 + SEA_Z) / 2], SEA_Z + 14, 1, 0x3a3f5c, { density: 12, shade: 0.7 });
  const open = (x: number) => Math.abs(x - 8) < 1.5;
  for (let x = -13.5; x <= 13.5; x += 1) if (!open(x)) line(s, [x, 0, SEA_Z - 0.15], [x, 0.7, SEA_Z - 0.15], 0xc4cbe0, 0.05, 0.08);
  line(s, [-14, 0.7, SEA_Z - 0.15], [6.5, 0.7, SEA_Z - 0.15], 0xf4f1e6, 0.045, 0.07);
  line(s, [9.5, 0.7, SEA_Z - 0.15], [14, 0.7, SEA_Z - 0.15], 0xf4f1e6, 0.045, 0.07);
}

function sea(ctx: Ctx): void {
  const { water } = ctx.L, [deep, mid, foam] = ctx.tone.water, rnd = ctx.rnd;
  const rough = ctx.tone.rain ? 0.16 : 0.07;
  for (let i = 0; i < 4800; i += 1) {
    const x = -40 + rnd() * 80, z = SEA_Z - 0.3 + rnd() * 28, sz = 0.3 + rnd() * 0.3;
    water.add({ p: [x, -0.3, z], s: [sz * 1.5, 0.03, sz], color: water.vary(rnd() > 0.45 ? mid : deep, 0.05), opacity: 0.9, sway: rough });
  }
  for (let i = 0; i < 560; i += 1) water.add({ p: [-38 + rnd() * 76, -0.26, SEA_Z + rnd() * 27], s: [0.35 + rnd() * 0.3, 0.02, 0.04], color: foam, opacity: 0.75, sway: rough });
}

function pier(ctx: Ctx): void {
  const s = ctx.L.solid, planks = stripes(0xa86a3a, 0x8a5a30, 22);
  panel(s, 'y', [8, 0.2, 12.1], 1.7, 5, (u, v) => planks(v, u), { density: 40, thick: 0.03 });
  panel(s, 'y', [8, 0.2, 14], 3, 1.6, (u, v) => planks(v, u), { density: 40, thick: 0.03 });
  panel(s, 'x', [8.85, 0.0, 12.1], 5, 0.4, 0x6b3f2a, { density: 30, shade: 0.7 });
  panel(s, 'x', [9.5, 0.0, 14], 1.6, 0.4, 0x6b3f2a, { density: 30, shade: 0.7 });
  panel(s, 'z', [8, 0.0, 14.8], 3, 0.4, 0x6b3f2a, { density: 30, shade: 0.9 });
  for (const [x, z] of [[7.2, 10.2], [8.8, 10.2], [7.2, 12.8], [8.8, 12.8], [6.5, 14.8], [9.5, 14.8]]) line(s, [x, -1, z], [x, 0.3, z], 0x3a2418, 0.07, 0.07);
  line(ctx.L.glow, [8, 0.2, 14.5], [8, 1.9, 14.5], 0x3a3f5c, 0.05, 0.08);
  ctx.L.glow.blob(8, 2.05, 14.5, 0.14, 0.14, 0.14, 14, 0xffd27a, 0.07);
  ctx.L.crowd.blob(9.2, 0.45, 13.6, 0.22, 0.22, 0.22, 20, 0xd8504a, 0.07);
}

function lamps(ctx: Ctx): void {
  for (const x of [-12, -5.5, 1, 7.5, 13]) {
    line(ctx.L.solid, [x, 0, -6.95], [x, 3.0, -6.95], 0x23263a, 0.06, 0.07);
    line(ctx.L.solid, [x, 3.0, -6.95], [x, 3.0, -6.6], 0x23263a, 0.05, 0.07);
    ctx.L.glow.blob(x, 2.95, -6.55, 0.2, 0.1, 0.2, 14, 0xffd27a, 0.07);
    ctx.colliders.push({ x, z: -6.95, r: 0.2 });
  }
}

function boats(ctx: Ctx): void {
  const b = ctx.L.boats, w = ctx.wealth;
  const hull = (x: number, z: number, len: number, color: number) => {
    b.blob(x, 0, z, len, 0.28, len * 0.38, Math.round(len * 55), color, 0.09);
    b.blob(x, 0.25, z, len * 0.5, 0.18, len * 0.28, Math.round(len * 20), 0xf4f1e6, 0.08);
  };
  hull(-5, 12.6, 0.9, 0xd8504a);
  if (w > 0.3) {
    hull(-2, 15.5, 1.5, 0xf4f1e6);
    line(b, [-2, 0.2, 15.5], [-2, 3.0, 15.5], 0xa86a3a, 0.05, 0.07);
    panel(b, 'z', [-1.6, 1.6, 15.5], 1.7, 2.6, 0xf4f1e6, { density: 30, mask: (u, v) => u < 1 - v });
  }
  if (w > 0.5) {
    hull(-10, 17, 2.2, 0x6b3f2a);
    line(b, [-10, 0.3, 17], [-10, 3.6, 17], 0x3a2418, 0.06, 0.07);
    panel(b, 'z', [-10, 2.2, 17], 2.6, 2.6, stripes(0xd8504a, 0xa83a3a, 6), { density: 36, mask: (u, v) => v < 0.9 - Math.abs(u - 0.5) * 0.3 });
  }
  if (w > 0.7) {
    hull(4, 18, 2.6, 0xf4f1e6);
    box(b, 4, 18, 2.4, 0.9, 0.2, 0.7, 0xc4cbe0, { density: 40 });
    box(b, 3.5, 18, 1.0, 0.7, 0.9, 0.5, 0x6fb0d8, { density: 40 });
  }
}

export function buildTerrain(ctx: Ctx): void {
  land(ctx);
  street(ctx);
  seawall(ctx);
  sea(ctx);
  pier(ctx);
  lamps(ctx);
  boats(ctx);
  ctx.colliders.push(...Array.from({ length: 27 }, (_, i) => ({ x: -13 + i, z: SEA_Z + 0.9, r: 0.8 })).filter((c) => Math.abs(c.x - 8) > 1.9));
  for (const dz of [10.6, 11.6, 12.6]) ctx.colliders.push({ x: 6.35, z: dz, r: 0.7 }, { x: 9.65, z: dz, r: 0.7 });
}
