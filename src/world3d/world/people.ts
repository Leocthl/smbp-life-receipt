import { bystander, figure } from './figure';
import { HOME_DOOR } from './layout';
import type { Ctx } from './ctx';

// Everyone who stands around in the neighbourhood. Who is there depends on the descriptor.

const FRIEND_SLOTS: [number, number][] = [[-7.3, -7.5], [-10.5, -7.4], [-7.9, -6.4], [-10.0, -6.3], [-6.5, -8.6]];
const SUIT = [0x23263a, 0x3a3f5c, 0x2a3f6e];
const WHITE_HAIR = 0xc4cbe0;

function around(ctx: Ctx, cx: number, cz: number, n: number, rx: number, rz: number, o: (i: number) => Parameters<typeof bystander>[3] = () => ({})): void {
  for (let i = 0; i < n; i += 1) bystander(ctx.L.crowd, cx + (ctx.rnd() - 0.5) * 2 * rx, cz + (ctx.rnd() - 0.5) * 2 * rz, o(i));
}

function family(ctx: Ctx): void {
  const { crowd, glow } = ctx.L, d = ctx.d;
  if (d.partner) figure(crowd, HOME_DOOR.x + 0.9, HOME_DOOR.z + 0.1, { top: 0xff8ad1, pants: 0x3a3f5c, hair: 0x14161f });
  if (d.kids > 0) {
    figure(crowd, HOME_DOOR.x - 0.7, HOME_DOOR.z + 0.2, { top: 0xffd27a, pants: 0x2a3f6e, hair: 0x14161f, scale: 0.62 });
    glow.blob(HOME_DOOR.x - 0.45, 1.5, HOME_DOOR.z + 0.2, 0.17, 0.2, 0.17, 18, 0xd8504a, 0.06);
    ctx.L.solid.add({ p: [HOME_DOOR.x - 0.58, 0.9, HOME_DOOR.z + 0.2], s: [0.012, 0.3, 0.012], color: 0xf4f1e6 });
  }
}

function friends(ctx: Ctx): void {
  const n = Math.round(ctx.bonds * 5);
  FRIEND_SLOTS.slice(0, n).forEach(([x, z]) => bystander(ctx.L.crowd, x, z));
}

function work(ctx: Ctx): void {
  const job = ctx.d.job;
  if (job === 'employed') around(ctx, 10.4, -7.6, 7, 2.1, 0.6, (i) => ({ top: i % 2 ? 0xf4f1e6 : 0x6fb0d8, pants: SUIT[i % 3] }));
  else if (job === 'unemployed') around(ctx, 10.4, -7.6, 1, 0.5, 0.3, () => ({ top: 0x5b6488, pants: 0x23263a }));
  else if (job === 'retired') around(ctx, 10.4, -7.6, 3, 2, 0.6, (i) => ({ top: i % 2 ? 0xf4f1e6 : 0x6fb0d8, pants: SUIT[i % 3] }));
  const student = job === 'student';
  around(ctx, -7.7, 5.9, student ? 9 : 2, 1.2, 2.4, () => ({ pack: 0xd8504a }));
  if (student) around(ctx, -7.7, 5.9, 3, 1.2, 2.4, () => ({ pack: 0x4f8a6b, top: 0xffd27a }));
}

function town(ctx: Ctx): void {
  const retired = ctx.d.stage === 'retired' || ctx.d.age >= 62;
  around(ctx, -1.5, -7.3, 1 + Math.round(ctx.d.lifestyle * 3), 1.3, 0.3);
  around(ctx, 6.5, 1.8, 5, 3.4, 1.2);
  around(ctx, -2.5, 3.5, retired ? 2 : 3, 2.5, 2.5);
  if (retired) {
    around(ctx, -4.2, 4.2, 2, 0.15, 0.05, () => ({ hair: WHITE_HAIR, top: 0x9c84d4 }));
    around(ctx, -0.8, 2.3, 1, 0.05, 0.05, () => ({ hair: WHITE_HAIR, top: 0xa86a3a }));
  }
  around(ctx, 4.25, -7.3, 2, 1.2, 0.3, (i) => ({ pants: SUIT[i % 3] }));
}

export function buildPeople(ctx: Ctx): void {
  family(ctx);
  friends(ctx);
  work(ctx);
  town(ctx);
}
