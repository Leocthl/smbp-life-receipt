import { line } from './kit';
import { HOME_X } from './layout';
import type { Ctx } from './ctx';

// Sky objects, clouds, rain, debt fog and the dark cloud over home.

const CLOUD_SPOTS: [number, number, number][] = [[-14, 9, -12], [6, 12.5, -17], [12, 9, -14], [-17, 8, 4], [16, 10, 0], [3, 12, -6], [-8, 12, 2], [18, 8, -8], [-12, 11, -4], [8, 11, 6]];

function clouds(ctx: Ctx): void {
  const { sky } = ctx.L, t = ctx.tone;
  for (let i = 0; i < t.clouds; i += 1) {
    const [x, y, z] = CLOUD_SPOTS[i % CLOUD_SPOTS.length], big = t.rain ? 1.4 : 1;
    sky.blob(x, y, z, 2.6 * big, 0.9, 1.6 * big, 90, (_a, h) => (h > 0.2 ? t.cloud : 0xa0a8c0), 0.5, { sway: 0.2, opacity: t.rain ? 0.92 : 0.85 });
  }
  if (t.sun) {
    sky.blob(-6, t.sun.y, -17, 1.4, 1.4, 1.4, 160, t.sun.color, 0.3, { opacity: 0.95 });
    sky.blob(-6, t.sun.y, -17, 2.4, 2.4, 2.4, 100, 0xffd27a, 0.4, { opacity: 0.25 });
  }
}

/** Streaks that repeat every 6 units downwards, so sliding the mesh by 6 looks seamless. */
export const RAIN_PERIOD = 6;

function rain(ctx: Ctx): void {
  if (!ctx.tone.rain) return;
  const { rain: b } = ctx.L;
  for (let i = 0; i < 520; i += 1) {
    const x = -20 + ctx.rnd() * 40, z = -20 + ctx.rnd() * 40, y = ctx.rnd() * RAIN_PERIOD;
    for (let k = 0; k < 3; k += 1) b.add({ p: [x - k * 0.1, y + k * RAIN_PERIOD, z], s: [0.015, 0.28, 0.015], color: 0xb5e2f0, opacity: 0.6 });
  }
}

function debt(ctx: Ctx): void {
  const lacking = Math.max(ctx.d.bankrupt ? 1 : 0, (0.5 - ctx.freedom) * 2);
  if (lacking <= 0) return;
  const { sky, rain: r } = ctx.L;
  for (let i = 0; i < Math.ceil(lacking * 8); i += 1) {
    sky.blob(-14 + ctx.rnd() * 28, 0.5, -9 + ctx.rnd() * 14, 2.2, 0.45, 1.4, 26, 0x8a95b8, 0.5, { opacity: 0.32, sway: 0.15 });
  }
  if (lacking < 0.4) return;
  sky.blob(HOME_X, 15.2, -8.5, 2.8, 1, 1.8, 140, (_a, h) => (h > 0.3 ? 0x3a3f5c : 0x14161f), 0.45, { sway: 0.1 });
  for (const dx of [-0.7, 0.7]) sky.blob(HOME_X + dx, 15, -6.9, 0.14, 0.09, 0.05, 6, 0xff7b6b, 0.06);
  line(sky, [HOME_X - 0.3, 14.7, -6.8], [HOME_X + 0.3, 14.55, -6.8], 0xff7b6b, 0.05, 0.05);
  for (let i = 0; i < 70; i += 1) {
    const x = HOME_X - 2.4 + ctx.rnd() * 4.8, z = -10 + ctx.rnd() * 3.5, y = ctx.rnd() * RAIN_PERIOD;
    for (let k = 0; k < 2; k += 1) if (y + k * RAIN_PERIOD < 14) r.add({ p: [x, y + k * RAIN_PERIOD, z], s: [0.015, 0.25, 0.015], color: 0x8a95b8, opacity: 0.7 });
  }
}

function worry(ctx: Ctx): void {
  if (!ctx.d.burntOut) return;
  ctx.L.sky.blob(10.45, 18.6, -11.4, 1.6, 0.6, 1.2, 70, 0x5b6488, 0.35, { sway: 0.08 });
}

export function buildWeather(ctx: Ctx): void {
  clouds(ctx);
  rain(ctx);
  debt(ctx);
  worry(ctx);
}
