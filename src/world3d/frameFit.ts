// Pure camera-fit maths for the stage: how far to zoom so something fits in the part of the screen the HUD, the sheet
// and the side panel leave free. No three.js, so it can be checked on its own (tests/frameFit.test.ts).

export interface Insets { top: number; bottom: number; right: number }
export interface BoxPx { w: number; h: number }
export interface Half { w: number; h: number }
/** A world-space point or box corner. */
export type P3 = readonly [number, number, number];

/** The camera's screen axes in world space (the camera sits at +(sin yaw cos pitch, sin pitch, cos yaw cos pitch) of its target). */
export function camAxes(yaw: number, pitch: number): { right: P3; up: P3 } {
  const d: P3 = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
  const right: P3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const up: P3 = [d[1] * right[2], d[2] * right[0] - d[0] * right[2], -d[1] * right[0]]; // d x right
  return { right, up };
}

const dot = (a: P3, b: P3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Screen coordinates (x right, y up, world units) of a point. */
export function toScreen(p: P3, yaw: number, pitch: number): { r: number; u: number } {
  const { right, up } = camAxes(yaw, pitch);
  return { r: dot(p, right), u: dot(p, up) };
}

/** Half extents, on screen, of the points round the given centre (how far the content reaches from the camera's target). */
export function halfExtent(points: readonly P3[], centre: P3, yaw: number, pitch: number): Half {
  const c = toScreen(centre, yaw, pitch);
  return points.reduce((m, p) => {
    const s = toScreen(p, yaw, pitch);
    return { w: Math.max(m.w, Math.abs(s.r - c.r)), h: Math.max(m.h, Math.abs(s.u - c.u)) };
  }, { w: 0, h: 0 });
}

/** The eight corners of a ground-aligned box. */
export function boxCorners(x0: number, x1: number, z0: number, z1: number, height: number): P3[] {
  return [x0, x1].flatMap((x) => [z0, z1].flatMap((z) => [0, height].map((y): P3 => [x, y, z])));
}

const MIN_FREE = 0.3; // never treat less than this share of the screen as free (a full sheet leaves almost nothing)

/** The free rectangle in px: the box minus what the HUD (top), the sheet (bottom) and the side panel (right) cover. */
export function freeRect(box: BoxPx, ins: Insets): { left: number; top: number; w: number; h: number } {
  const top = Math.max(0, ins.top), bottom = Math.max(0, ins.bottom), right = Math.max(0, ins.right);
  const h = Math.max(box.h * MIN_FREE, box.h - top - bottom), w = Math.max(box.w * MIN_FREE, box.w - right);
  return { left: 0, top: Math.min(top, box.h - h), w, h };
}

/**
 * The view height (world units across the canvas height) at which content reaching `half` from the camera target fits the free area.
 * margin > 1 leaves air round it.
 */
export function fitViewHeight(box: BoxPx, ins: Insets, half: Half, margin = 1.08): number {
  const free = freeRect(box, ins);
  const perUnitNeed = Math.max((2 * half.h) / free.h, (2 * half.w) / free.w); // world units per px the content needs
  return perUnitNeed * margin * box.h;
}
