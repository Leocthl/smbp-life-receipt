import { box, boxColliders, line, panel } from './kit';
import { adult } from './props';
import { ROOM } from './room';
import { figure } from './figure';
import type { Ctx } from './ctx';

// The rest of the family flat: living room, kitchen, front door, and the people in it.

export const FLAT_X1 = 10.3;

export function livingRoom(ctx: Ctx): void {
  const b = ctx.L.solid, g = ctx.L.glow;
  panel(b, 'y', [6.6, 0.02, 0.4], 5, 3.4, 0xe4f5b0, { density: 18, thick: 0.01 });
  // low partition with a doorway to the bedroom
  box(b, 3.1, -1.5, 0.2, 2.8, 0, 1.15, 0xffe0c8, { density: 60 });
  box(b, 3.1, 2.4, 0.2, 1.2, 0, 1.15, 0xffe0c8, { density: 60 });
  box(b, 4.7, -2.5, 2, 0.9, 0, 0.45, 0xb9a7ff, { density: 90 });
  box(b, 4.7, -2.85, 2, 0.25, 0.45, 0.6, 0xb9a7ff, { density: 90 });
  for (const x of [4.1, 5.3]) box(b, x, -2.4, 0.4, 0.3, 0.45, 0.2, 0xffd85a, { density: 120, edge: 0.4 });
  box(b, 6.4, 0.4, 1.5, 1.5, 0.7, 0.1, 0xfff6dc, { density: 90 });
  line(b, [6.4, 0, 0.4], [6.4, 0.7, 0.4], 0xa8744a, 0.07, 0.06);
  for (const [x, z] of [[5.4, 0.4], [7.4, 0.4], [6.4, 1.4], [6.4, -0.6]]) box(b, x, z, 0.5, 0.5, 0.4, 0.08, 0xff8a6b, { density: 110, edge: 0.4 });
  box(b, 8.9, -2.55, 2.1, 0.9, 0, 0.95, 0xcdeeff, { density: 70 });
  box(b, 8.9, -2.55, 2.2, 0.95, 0.95, 0.06, 0xfff6dc, { density: 90, edge: 0.4 });
  box(b, 10.0, -2.5, 0.8, 0.8, 0, 2.0, 0xe4dcff, { density: 70 });
  g.blob(8.5, 1.15, -2.55, 0.1, 0.1, 0.1, 8, 0xfff0a0, 0.04);
  panel(b, 'z', [6.8, 1.1, -2.97], 1.0, 2.2, 0xa8744a, { density: 80 });
  panel(b, 'z', [6.8, 1.1, -2.95], 1.2, 2.4, 0xfff6dc, { density: 50 });
  panel(b, 'y', [6.8, 0.02, -2.3], 1.0, 0.7, 0xd9553f, { density: 30, thick: 0.01 });
  g.blob(7.2, 1.1, -2.9, 0.05, 0.05, 0.02, 5, 0xffd85a, 0.03);
  ctx.colliders.push(...boxColliders(6.4, 0.4, 1.5, 1.5), ...boxColliders(4.7, -2.5, 2, 0.9), ...boxColliders(8.9, -2.55, 2.1, 0.9), ...boxColliders(10, -2.5, 0.8, 0.8),
    ...boxColliders(3.1, -1.5, 0.2, 2.8), ...boxColliders(3.1, 2.4, 0.2, 1.2));
}

/** Walls of colliders so the walkable square (bounds) is not a way out of the flat. */
export function flatWalls(ctx: Ctx, x1: number): void {
  for (let x = ROOM.x0; x <= x1 + 0.6; x += 1) ctx.colliders.push({ x, z: ROOM.z0 - 0.5, r: 0.55 }, { x, z: ROOM.z1 + 0.5, r: 0.55 });
  for (let z = ROOM.z0; z <= ROOM.z1; z += 1) ctx.colliders.push({ x: ROOM.x0 - 0.5, z, r: 0.55 }, { x: x1 + 0.6, z, r: 0.55 });
}

/** Parents (or a partner), kids and friends, depending on who is in this life. */
export function flatPeople(ctx: Ctx, home: boolean): void {
  const c = ctx.L.crowd, d = ctx.d;
  if (home) {
    if (d.home === 'parents') { adult(c, 5.4, 0.4, 0xffd85a, 0xc9d3e6); adult(c, 7.4, 0.4, 0xff8a6b, 0x2b3a55); }
    else if (d.partner) adult(c, 7.4, 0.4, 0xff9ec4, 0x2b3a55);
    else adult(c, 5.4, 0.4, 0xb9a7ff, 0x6f4a32, 1.2);
    if (d.kids > 0) figure(c, 4.6, 1.7, { top: 0xffd85a, pants: 0x3d7fc4, hair: 0x2b3a55, scale: 0.8 });
  } else {
    if (d.partner) adult(c, 0.5, 0.2, 0xff9ec4, 0x2b3a55);
    if (d.kids > 0) figure(c, 1.4, 1.6, { top: 0xffd85a, pants: 0x3d7fc4, hair: 0x2b3a55, scale: 0.8 });
  }
  const friends = Math.round(ctx.bonds * 3);
  [[0.2, 1.3], [1.5, 2.2], [-0.2, 2.4]].slice(0, friends).forEach(([x, z], i) => figure(c, x, z, { top: [0x4cc3d9, 0xff9ec4, 0xffd85a][i], pants: 0x4a5578, hair: 0x2b3a55, scale: 1.3 }));
}
