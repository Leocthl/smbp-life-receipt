import { QUALITIES, type Quality, type Qualities } from '../../world3d/qualities';

// Pure geometry for the hexagon radar. Axis 0 points straight up; the others follow clockwise.
export type Point = readonly [number, number];

const START = -Math.PI / 2;
const STEP = (Math.PI * 2) / QUALITIES.length;

export const clampQ = (v: number): number => (Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0);

/** A point on axis i, r units from the centre (cx, cy). */
export function axisPoint(i: number, r: number, cx: number, cy: number): Point {
  const a = START + i * STEP;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}

/** Vertices of a shape whose qualities are 0..100 of maxR. */
export function shapePoints(values: Qualities, maxR: number, cx: number, cy: number): Point[] {
  return QUALITIES.map((q, i) => axisPoint(i, (maxR * clampQ(values[q])) / 100, cx, cy));
}

export function toPath(pts: readonly Point[]): string {
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join('') + 'Z';
}

/** A grid ring at fraction f of maxR. */
export function ringPath(f: number, maxR: number, cx: number, cy: number): string {
  return toPath(QUALITIES.map((_, i) => axisPoint(i, maxR * f, cx, cy)));
}

/** Per axis: did this quality move since the previous shape? */
export function changedAxes(values: Qualities, previous?: Qualities): boolean[] {
  return QUALITIES.map((q) => previous !== undefined && previous[q] !== values[q]);
}

/** Plain-text summary for screen readers, e.g. "財富 72 · 安全感 40 · …". */
export function summarize(values: Qualities, name: (q: Quality) => string): string {
  return QUALITIES.map((q) => `${name(q)} ${Math.round(clampQ(values[q]))}`).join(' · ');
}
