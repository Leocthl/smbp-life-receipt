import { bystander as bys, figure as fig, type FigureLook } from './figure';
import { HOME_DOOR } from './layout';
import type { Ctx } from './ctx';

// Everyone who stands around in the neighbourhood. Who is there depends on the descriptor.

const FRIEND_SLOTS: [number, number][] = [[-7.3, -7.5], [-10.5, -7.4], [-7.9, -6.4], [-10.0, -6.3], [-6.5, -8.6]];
const SUIT = [0x2b3a55, 0x6b789c, 0x3d7fc4];
const WHITE_HAIR = 0xc9d3e6;
/** From far away people must still read: bigger, in loud colours with dark trousers (their outline comes from the pixel pass). */
const FAR_SCALE: Record<string, number> = { city: 1.5, district: 1.3 };
const LOUD = [0xd9553f, 0x3d7fc4, 0xffd85a, 0xff9ec4, 0x4cc3d9, 0x7ed07a];
const far = (ctx: Ctx) => FAR_SCALE[ctx.scope] ?? 1;
function bystander(ctx: Ctx, x: number, z: number, o: Partial<FigureLook> = {}): void {
  const k = far(ctx), loud = k > 1 ? { top: LOUD[Math.floor(ctx.rnd() * LOUD.length)], pants: 0x2b3a55 } : {};
  bys(ctx.L.crowd, x, z, { ...loud, ...o, scale: (o.scale ?? 1) * k });
}
function figure(ctx: Ctx, x: number, z: number, look: FigureLook): void {
  fig(ctx.L.crowd, x, z, { ...look, scale: (look.scale ?? 1) * far(ctx) });
}

function around(ctx: Ctx, cx: number, cz: number, n: number, rx: number, rz: number, o: (i: number) => Parameters<typeof bystander>[3] = () => ({})): void {
  for (let i = 0; i < n; i += 1) bystander(ctx, cx + (ctx.rnd() - 0.5) * 2 * rx, cz + (ctx.rnd() - 0.5) * 2 * rz, o(i));
}

function family(ctx: Ctx): void {
  const { glow } = ctx.L, d = ctx.d;
  if (d.partner) figure(ctx, HOME_DOOR.x + 0.9, HOME_DOOR.z + 0.1, { top: 0xff9ec4, pants: 0x6b789c, hair: 0x4f3426, hairStyle: 'tail' });
  if (d.kids > 0) {
    figure(ctx, HOME_DOOR.x - 0.7, HOME_DOOR.z + 0.2, { top: 0xffd85a, pants: 0x3d7fc4, hair: 0x4f3426, hairStyle: 'short', scale: 0.62, kid: true });
    glow.blob(HOME_DOOR.x - 0.45, 1.5, HOME_DOOR.z + 0.2, 0.17, 0.2, 0.17, 18, 0xd9553f, 0.06);
    ctx.L.solid.add({ p: [HOME_DOOR.x - 0.58, 0.9, HOME_DOOR.z + 0.2], s: [0.012, 0.3, 0.012], color: 0xfff6dc });
  }
}

function friends(ctx: Ctx): void {
  const n = Math.round(ctx.bonds * 5);
  FRIEND_SLOTS.slice(0, n).forEach(([x, z]) => bystander(ctx, x, z));
}

function work(ctx: Ctx): void {
  const job = ctx.d.job;
  if (job === 'employed') around(ctx, 10.4, -7.6, 5, 2.1, 0.6, (i) => ({ top: i % 2 ? 0xfff6dc : 0x8fd3ff, pants: SUIT[i % 3], tie: i % 2 ? 0xd9553f : 0x3d7fc4 }));
  else if (job === 'unemployed') around(ctx, 10.4, -7.6, 1, 0.5, 0.3, () => ({ top: 0x9aa8c4, pants: 0x2b3a55 }));
  else if (job === 'retired') around(ctx, 10.4, -7.6, 2, 2, 0.6, (i) => ({ top: i % 2 ? 0xfff6dc : 0x8fd3ff, pants: SUIT[i % 3] }));
  const student = job === 'student';
  if (ctx.ext.z1 < 9) return;
  around(ctx, -7.7, 5.9, student ? 6 : 2, 1.2, 2.4, () => ({ pack: 0xd9553f }));
  if (student) around(ctx, -7.7, 5.9, 2, 1.2, 2.4, () => ({ pack: 0x7ed07a, top: 0xffd85a }));
}

function town(ctx: Ctx): void {
  const retired = ctx.d.stage === 'retired' || ctx.d.age >= 62;
  around(ctx, -1.5, -7.3, 1 + Math.round(ctx.d.lifestyle * 2), 1.3, 0.3);
  around(ctx, 6.5, 1.8, 3, 3.4, 1.2);
  around(ctx, -2.5, 3.5, retired ? 1 : 2, 2.5, 2.5);
  if (retired) {
    around(ctx, -4.2, 4.2, 2, 0.15, 0.05, () => ({ hair: WHITE_HAIR, top: 0xb9a7ff, hairStyle: 'thin', cane: true }));
    around(ctx, -0.8, 2.3, 1, 0.05, 0.05, () => ({ hair: WHITE_HAIR, top: 0xa8744a, hairStyle: 'thin' }));
  }
  around(ctx, 4.25, -7.3, 1, 1.2, 0.3, (i) => ({ pants: SUIT[i % 3] }));
}

export function buildPeople(ctx: Ctx): void {
  family(ctx);
  friends(ctx);
  work(ctx);
  town(ctx);
}
