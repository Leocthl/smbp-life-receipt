import { line, mix, panel, smooth } from './kit';
import type { Ctx } from './ctx';

// Park trees, flowers and benches. Joy greens them; low joy withers them.

function tree(ctx: Ctx, x: number, z: number, scale: number): void {
  const { solid } = ctx.L, j = smooth(ctx.joy / 0.7);
  const dark = mix(0xa8744a, 0x3f9f5a, j), light = mix(0xf2a93a, 0xb6e88a, j), tip = mix(0xffd85a, 0xe4f5b0, j);
  line(solid, [x, 0, z], [x, 1.9 * scale, z], 0x6f4a32, 0.1 * scale, 0.07);
  const n = Math.round((40 + 95 * j) * scale);
  const colour = (_x: number, y: number) => (y > 0.45 ? tip : y > -0.1 ? light : dark);
  for (const [dx, dy, dz, r] of [[0, 2.5, 0, 1.15], [-0.7, 2.1, 0.3, 0.8], [0.6, 2.2, -0.4, 0.85]] as const) {
    solid.blob(x + dx * scale, dy * scale, z + dz * scale, r * scale, r * scale * 0.85, r * scale, n, (a, y, c) => colour(a + c, y), 0.26 * scale, { sway: 0.04, jitter: 0.08 });
  }
  if (j < 0.5) for (let k = 0; k < 14; k += 1) solid.add({ p: [x + (ctx.rnd() - 0.5) * 2.6, 0.04, z + (ctx.rnd() - 0.5) * 2.6], s: [0.13, 0.02, 0.1], color: 0xa8744a, opacity: 0.9 });
  ctx.colliders.push({ x, z, r: 0.45 * scale });
}

function flowers(ctx: Ctx): void {
  if (ctx.joy < 0.25) return;
  const colors = [0xff9ec4, 0xffd85a, 0xfff6dc, 0xff8a6b, 0xb9a7ff];
  const clusters = Math.round(3 + ctx.joy * 9);
  for (let c = 0; c < clusters; c += 1) {
    const cx = -6 + ctx.rnd() * 7, cz = -0.5 + ctx.rnd() * (ctx.ext.z1 - 0.5 > 5 ? 8.4 : 4.2), col = colors[c % colors.length];
    for (let k = 0; k < 7; k += 1) {
      const x = cx + (ctx.rnd() - 0.5) * 0.9, z = cz + (ctx.rnd() - 0.5) * 0.9;
      line(ctx.L.solid, [x, 0, z], [x, 0.18, z], 0x3f9f5a, 0.025, 0.05);
      ctx.L.solid.blob(x, 0.22, z, 0.07, 0.06, 0.07, 3, col, 0.05);
    }
  }
}

function bench(ctx: Ctx, x: number, z: number): void {
  const s = ctx.L.solid;
  panel(s, 'y', [x, 0.45, z], 1.4, 0.45, 0xa8744a, { density: 90, thick: 0.04 });
  panel(s, 'z', [x, 0.75, z - 0.22], 1.4, 0.4, 0xa8744a, { density: 90, shade: 0.8 });
  for (const dx of [-0.6, 0.6]) line(s, [x + dx, 0, z], [x + dx, 0.45, z], 0x2b3a55, 0.04, 0.06);
}

export function buildPark(ctx: Ctx): void {
  const reach = Math.min(8.5, ctx.ext.z1) + 1.3;
  panel(ctx.L.solid, 'y', [-2.5, 0.045, -1.3 + reach / 2], 1.1, reach, 0xc9d3e6, { density: 24, thick: 0.01, depthBias: 0.05 });
  panel(ctx.L.solid, 'y', [-2.5, 0.055, 3.6], 6, 1.0, 0xc9d3e6, { density: 24, thick: 0.01, depthBias: 0.08 });
  const spots: [number, number, number][] = [[-5.4, 0.2, 1.1], [-5.2, 5.6, 1.25], [-0.2, 0.4, 1], [0.6, 4.2, 1.2], [-4.2, 7.4, 0.9], [-0.6, 7.5, 1], [-3.8, 2.2, 0.85], [0.4, 6.4, 0.9]];
  spots.filter(([, z]) => z < ctx.ext.z1 - 0.5).forEach(([x, z, s]) => tree(ctx, x, z, s));
  if (ctx.ext.z1 > 5) bench(ctx, -4.2, 4.6);
  bench(ctx, -0.8, 2.6);
  flowers(ctx);
  ctx.colliders.push({ x: -4.2, z: 4.8, r: 0.6 }, { x: -0.8, z: 2.8, r: 0.6 });
}
