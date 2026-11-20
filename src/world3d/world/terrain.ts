import { box, checker, line, lighten, mix, panel, stripes, type ColorFn } from './kit';
import { FRONT_Z, ROAD, SEA_Z } from './layout';
import type { Ctx } from './ctx';

// Ground, street, tram line, harbour, pier, lamps. Ground rectangles tile the land exactly, so splats never fight.

const tiled = (c: number, nu: number, nv: number): ColorFn => checker(c, lighten(c, 0.07), nu, nv);

function rect(ctx: Ctx, rx0: number, rx1: number, rz0: number, rz1: number, color: number | ColorFn, density = 16): void {
  const e = ctx.ext, x0 = Math.max(rx0, e.x0), x1 = Math.min(rx1, e.x1), z0 = Math.max(rz0, e.z0), z1 = Math.min(rz1, e.z1);
  if (x1 - x0 < 0.05 || z1 - z0 < 0.05) return; // outside this scope's land
  panel(ctx.L.solid, 'y', [(x0 + x1) / 2, 0, (z0 + z1) / 2], x1 - x0, z1 - z0, color, { density, thick: 0.03, jitter: 0.04 });
}

function land(ctx: Ctx): void {
  const dry = 1 - ctx.joy;
  const grass = mix(0x7ed07a, 0x8a7a50, dry * 0.8), lawn = mix(0xb6e88a, 0xa89a5a, dry * 0.8);
  rect(ctx, -14, 14, -14, FRONT_Z, 0x9aa8c4, 10);
  rect(ctx, -14, 14, FRONT_Z, -6.8, tiled(0xc9d3e6, 28, 2.5));
  rect(ctx, -14, 14, -6.8, ROAD.z0, 0xfff6dc);
  rect(ctx, -14, 14, ROAD.z0, ROAD.z1, 0x6b789c);
  rect(ctx, -14, 14, ROAD.z1, -2.4, 0xfff6dc);
  rect(ctx, -14, 14, -2.4, -1.4, tiled(0xc9d3e6, 28, 1));
  rect(ctx, -14, -6.5, -1.4, 3.5, tiled(0xc9d3e6, 6, 4));
  rect(ctx, -14, -6.5, 3.5, 8.4, lawn);
  rect(ctx, -6.5, 1.5, -1.4, 8.4, grass, 18);
  rect(ctx, 1.5, 14, -1.4, 5.8, tiled(0x9aa8c4, 10, 6));
  rect(ctx, 1.5, 14, 5.8, 8.4, tiled(0xc9d3e6, 12, 3));
  rect(ctx, -14, 14, 8.4, SEA_Z, tiled(0xfff6dc, 28, 1.5));
}

function street(ctx: Ctx): void {
  const s = ctx.L.solid, z = ROAD.tramZ;
  panel(s, 'y', [0, 0.02, z], 28, 1.3, 0x9aa8c4, { density: 24, thick: 0.01 });
  for (const dz of [-0.3, 0.3]) line(s, [-14, 0.05, z + dz], [14, 0.05, z + dz], 0xc9d3e6, 0.04, 0.06);
  for (let x = -13.5; x < 14; x += 0.7) panel(s, 'y', [x, 0.03, z], 0.12, 1.1, 0x2b3a55, { density: 60, thick: 0.01 });
  for (let i = 0; i < 6; i += 1) panel(s, 'y', [2.2, 0.03, ROAD.z0 + 0.35 + i * 0.64], 0.9, 0.3, 0xfff6dc, { density: 60, thick: 0.01 });
  for (let x = -13; x < 14; x += 1.6) panel(s, 'y', [x, 0.03, -6.2 + 0.0], 0.7, 0.07, 0xfff6dc, { density: 80, thick: 0.01, opacity: 0.6 });
  // overhead tram wire
  line(s, [-14, 4.6, z], [14, 4.6, z], 0x9aa8c4, 0.03, 0.12, 1);
  for (const x of [-12, -3, 6, 13]) line(s, [x, 0, -2.5], [x, 4.6, -2.5], 0x6b789c, 0.07, 0.08);
}

function seawall(ctx: Ctx): void {
  const s = ctx.L.solid;
  panel(s, 'z', [0, -0.4, SEA_Z], 28, 0.8, 0x6b789c, { density: 24, shade: 0.85 });
  panel(s, 'x', [14, -0.5, (-14 + SEA_Z) / 2], SEA_Z + 14, 1, 0x6b789c, { density: 12, shade: 0.7 });
  const open = (x: number) => Math.abs(x - 8) < 1.5;
  for (let x = -13.5; x <= 13.5; x += 1) if (!open(x)) line(s, [x, 0, SEA_Z - 0.15], [x, 0.7, SEA_Z - 0.15], 0xc9d3e6, 0.05, 0.08);
  line(s, [-14, 0.7, SEA_Z - 0.15], [6.5, 0.7, SEA_Z - 0.15], 0xfff6dc, 0.045, 0.07);
  line(s, [9.5, 0.7, SEA_Z - 0.15], [14, 0.7, SEA_Z - 0.15], 0xfff6dc, 0.045, 0.07);
}

/** Water is a hard-edged sheet near the quay that steps out into the sky in three translucent rings, so it never ends in a cliff. */
const SEA_HALF_X = 20, SEA_DEPTH = 13, RING = 2.5, RING_ALPHA = [0.5, 0.35, 0.2];

function sea(ctx: Ctx): void {
  const { water } = ctx.L, [deep, mid, foam] = ctx.tone.water;
  const z0 = SEA_Z - 0.3;
  // rows of dark wave dashes laid out on the world grid, so neighbouring panels line up
  const wave = (x0: number, zA: number, w: number, h: number) => (u: number, v: number) => {
    const ix = Math.floor((x0 + u * w) * 2), j = Math.floor((zA + v * h) * 2), k = (((ix + j * 3.7) % 9) + 9) % 9;
    return k < 2.4 ? deep : mid;
  };
  const sheet = (x0: number, x1: number, za: number, zb: number, opacity: number) => {
    if (x1 - x0 < 0.1 || zb - za < 0.1) return;
    panel(water, 'y', [(x0 + x1) / 2, -0.3, (za + zb) / 2], x1 - x0, zb - za, wave(x0, za, x1 - x0, zb - za), { density: 4, thick: 0.02, opacity, fx: true });
  };
  const zf = z0 + SEA_DEPTH;
  sheet(-SEA_HALF_X, SEA_HALF_X, z0, zf, 0.95);
  RING_ALPHA.forEach((a, k) => {
    const d0 = k * RING, d1 = (k + 1) * RING, xl = SEA_HALF_X + d0, xr = SEA_HALF_X + d1;
    sheet(-xr, xr, zf + d0, zf + d1, a);
    sheet(-xr, -xl, z0, zf + d0, a);
    sheet(xl, xr, z0, zf + d0, a);
  });
  // a few long, gentle highlight rows
  for (let r = 0; r < 6; r += 1) for (let x = -SEA_HALF_X + ((r * 5) % 7); x < SEA_HALF_X - 2; x += 5.5) panel(water, 'y', [x, -0.26, z0 + 1.6 + r * 2], 1.5 + (r % 3) * 0.4, 0.14, foam, { density: 40, thick: 0.01, fx: true });
}

function pier(ctx: Ctx): void {
  const s = ctx.L.solid, planks = stripes(0xa8744a, 0xa8744a, 22);
  panel(s, 'y', [8, 0.2, 12.1], 1.7, 5, (u, v) => planks(v, u), { density: 40, thick: 0.03 });
  panel(s, 'y', [8, 0.2, 14], 3, 1.6, (u, v) => planks(v, u), { density: 40, thick: 0.03 });
  panel(s, 'x', [8.85, 0.0, 12.1], 5, 0.4, 0x6f4a32, { density: 30, shade: 0.7 });
  panel(s, 'x', [9.5, 0.0, 14], 1.6, 0.4, 0x6f4a32, { density: 30, shade: 0.7 });
  panel(s, 'z', [8, 0.0, 14.8], 3, 0.4, 0x6f4a32, { density: 30, shade: 0.9 });
  for (const [x, z] of [[7.2, 10.2], [8.8, 10.2], [7.2, 12.8], [8.8, 12.8], [6.5, 14.8], [9.5, 14.8]]) line(s, [x, -1, z], [x, 0.3, z], 0x6f4a32, 0.07, 0.07);
  line(ctx.L.glow, [8, 0.2, 14.5], [8, 1.9, 14.5], 0x6b789c, 0.05, 0.08);
  ctx.L.glow.blob(8, 2.05, 14.5, 0.14, 0.14, 0.14, 14, 0xffd85a, 0.07);
  ctx.L.crowd.blob(9.2, 0.45, 13.6, 0.22, 0.22, 0.22, 20, 0xd9553f, 0.07);
}

function lamps(ctx: Ctx): void {
  for (const x of [-12, -5.5, 1, 7.5, 13]) {
    line(ctx.L.solid, [x, 0, -6.95], [x, 3.0, -6.95], 0x2b3a55, 0.06, 0.07);
    line(ctx.L.solid, [x, 3.0, -6.95], [x, 3.0, -6.6], 0x2b3a55, 0.05, 0.07);
    ctx.L.glow.blob(x, 2.95, -6.55, 0.2, 0.1, 0.2, 14, 0xffd85a, 0.07);
    ctx.colliders.push({ x, z: -6.95, r: 0.2 });
  }
}

function boats(ctx: Ctx): void {
  const b = ctx.L.boats, w = ctx.wealth;
  const hull = (x: number, z: number, len: number, color: number) => {
    b.blob(x, 0, z, len, 0.28, len * 0.38, Math.round(len * 55), color, 0.09);
    b.blob(x, 0.25, z, len * 0.5, 0.18, len * 0.28, Math.round(len * 20), 0xfff6dc, 0.08);
  };
  hull(-5, 12.6, 0.9, 0xd9553f);
  if (w > 0.3) {
    hull(-2, 15.5, 1.5, 0xfff6dc);
    line(b, [-2, 0.2, 15.5], [-2, 3.0, 15.5], 0xa8744a, 0.05, 0.07);
    panel(b, 'z', [-1.6, 1.6, 15.5], 1.7, 2.6, 0xfff6dc, { density: 30, mask: (u, v) => u < 1 - v });
  }
  if (w > 0.5) {
    hull(-10, 17, 2.2, 0x6f4a32);
    line(b, [-10, 0.3, 17], [-10, 3.6, 17], 0x6f4a32, 0.06, 0.07);
    panel(b, 'z', [-10, 2.2, 17], 2.6, 2.6, stripes(0xd9553f, 0xd9553f, 6), { density: 36, mask: (u, v) => v < 0.9 - Math.abs(u - 0.5) * 0.3 });
  }
  if (w > 0.7) {
    hull(4, 18, 2.6, 0xfff6dc);
    box(b, 4, 18, 2.4, 0.9, 0.2, 0.7, 0xc9d3e6, { density: 40 });
    box(b, 3.5, 18, 1.0, 0.7, 0.9, 0.5, 0x8fd3ff, { density: 40 });
  }
}

/** The edge of the land where there is no harbour: a dark slab side so the diorama still has thickness. */
function skirt(ctx: Ctx): void {
  const e = ctx.ext, s = ctx.L.solid;
  panel(s, 'z', [(e.x0 + e.x1) / 2, -0.4, e.z1], e.x1 - e.x0, 0.8, 0x6b789c, { density: 24, shade: 0.85 });
  panel(s, 'x', [e.x1, -0.4, (e.z0 + e.z1) / 2], e.z1 - e.z0, 0.8, 0x6b789c, { density: 24, shade: 0.7 });
}

export function buildTerrain(ctx: Ctx): void {
  land(ctx);
  street(ctx);
  lamps(ctx);
  if (ctx.ext.z1 < 9) { skirt(ctx); return; }
  seawall(ctx);
  sea(ctx);
  pier(ctx);
  if (ctx.scope === 'city') boats(ctx);
  ctx.colliders.push(...Array.from({ length: 27 }, (_, i) => ({ x: -13 + i, z: SEA_Z + 0.9, r: 0.8 })).filter((c) => Math.abs(c.x - 8) > 1.9));
  for (const dz of [10.6, 11.6, 12.6]) ctx.colliders.push({ x: 6.35, z: dz, r: 0.7 }, { x: 9.65, z: dz, r: 0.7 });
}
