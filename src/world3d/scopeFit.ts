import { boxCorners, halfExtent, type Half, type P3 } from './frameFit';
import type { Scope } from './descriptor';
import { FLAT_X1 } from './world/flat';
import { EXTENTS } from './world/layout';
import { ROOM } from './world/room';

// What a scope puts on screen (a ground box plus its height), so the stage can zoom until all of it fits the free area.

const TOWER_H = 12; // outdoors: taller than any roof the camera needs to see whole
const WALL_PAD = 0.3;

function corners(scope: Scope): P3[] {
  if (scope === 'room') return boxCorners(ROOM.x0 - WALL_PAD, ROOM.x1 + WALL_PAD, ROOM.z0 - WALL_PAD, ROOM.z1 + WALL_PAD, ROOM.h);
  if (scope === 'home') return boxCorners(ROOM.x0 - WALL_PAD, FLAT_X1 + WALL_PAD, ROOM.z0 - WALL_PAD, ROOM.z1 + WALL_PAD, ROOM.h);
  const e = EXTENTS[scope];
  return boxCorners(e.x0, e.x1, e.z0, e.z1, TOWER_H);
}

/** How far the scope reaches from the camera's target, on screen (world units). */
export function scopeHalf(scope: Scope, target: P3, yaw: number, pitch: number): Half {
  return halfExtent(corners(scope), target, yaw, pitch);
}

/** Air round the content: indoors a little, outdoors none (the district is meant to run off the edges). */
export const scopeMargin = (scope: Scope): number => (scope === 'room' || scope === 'home' ? 1.1 : 1);
