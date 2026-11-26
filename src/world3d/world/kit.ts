import type { createGaussianBuilder } from '../gaussian';

// Aligned-rectangle splat primitives. Flat panels and boxes give crisp, readable silhouettes (like pixel-art tiles).

export type Builder = ReturnType<typeof createGaussianBuilder>;
export type Axis = 'x' | 'y' | 'z';
export type Vec3 = readonly [number, number, number];
export type ColorFn = (u: number, v: number) => number;

export interface PanelOpts {
  density?: number; jitter?: number; opacity?: number; shade?: number; sway?: number; thick?: number;
  /** keep only the part of the rectangle where this is true (u, v in 0..1) */
  mask?: (u: number, v: number) => boolean;
  /** flat effect colour: no light steps, no ink outline (water that fades into the sky) */
  fx?: boolean;
  /** world units toward camera for layered panels/decals */
  depthBias?: number;
}

const channel = (hex: number, shift: number) => (hex >> shift) & 255;

export function mix(a: number, b: number, t: number): number {
  const m = (s: number) => Math.round(channel(a, s) + (channel(b, s) - channel(a, s)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}
export const darken = (hex: number, k: number) => mix(hex, 0x2b3a55, k);
export const lighten = (hex: number, k: number) => mix(hex, 0xffffff, k);
export const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export const stripes = (a: number, b: number, n: number): ColorFn => (u) => (Math.floor(u * n) % 2 === 0 ? a : b);
export const checker = (a: number, b: number, nu: number, nv: number): ColorFn => (u, v) => ((Math.floor(u * nu) + Math.floor(v * nv)) % 2 === 0 ? a : b);

/** The rectangle's own volume, so its splats are cut to a crisp edge. */
function panelClip(axis: Axis, c: Vec3, w: number, h: number, t: number): { lo: [number, number, number]; hi: [number, number, number] } {
  const half: Vec3 = axis === 'z' ? [w / 2, h / 2, t] : axis === 'x' ? [t, h / 2, w / 2] : [w / 2, t, h / 2];
  return { lo: [c[0] - half[0], c[1] - half[1], c[2] - half[2]], hi: [c[0] + half[0], c[1] + half[1], c[2] + half[2]] };
}

/** A flat rectangle of splats. axis = its normal; w runs along x (or z for an x-plane), h along y (or z for a y-plane). */
export function panel(b: Builder, axis: Axis, c: Vec3, w: number, h: number, color: number | ColorFn, o: PanelOpts = {}): void {
  const density = o.density ?? 40;
  const nu = Math.max(1, Math.round(w * Math.sqrt(density))), nv = Math.max(1, Math.round(h * Math.sqrt(density)));
  const du = w / nu, dv = h / nv, t = o.thick ?? 0.02;
  const patterned = typeof color === 'function' || o.mask !== undefined || (o.opacity ?? 0.95) < 0.6; // patterns, cut-outs and glass/light must not overlap
  const n: [number, number, number] = axis === 'z' ? [0, 0, 1] : axis === 'x' ? [1, 0, 0] : [0, 1, 0];
  for (let i = 0; i < nu; i += 1) for (let j = 0; j < nv; j += 1) {
    const jit = patterned ? 0 : 0.4;
    const fu = (i + 0.5 + (b.rnd() - 0.5) * jit) / nu, fv = (j + 0.5 + (b.rnd() - 0.5) * jit) / nv;
    if (o.mask && !o.mask((i + 0.5) / nu, (j + 0.5) / nv)) continue;
    const u = (fu - 0.5) * w, v = (fv - 0.5) * h;
    const su = du * 0.58, sv = dv * 0.58;
    const hex = typeof color === 'function' ? color((i + 0.5) / nu, (j + 0.5) / nv) : color;
    const p: [number, number, number] = axis === 'z' ? [c[0] + u, c[1] + v, c[2]] : axis === 'x' ? [c[0], c[1] + v, c[2] + u] : [c[0] + u, c[1], c[2] + v];
    const s: [number, number, number] = axis === 'z' ? [su, sv, t] : axis === 'x' ? [t, sv, su] : [su, t, sv];
    const cell = patterned ? panelClip(axis, [c[0] + (axis === 'x' ? 0 : ((i + 0.5) / nu - 0.5) * w), c[1] + (axis === 'y' ? 0 : ((j + 0.5) / nv - 0.5) * h), c[2] + (axis === 'x' ? ((i + 0.5) / nu - 0.5) * w : axis === 'y' ? ((j + 0.5) / nv - 0.5) * h : 0)], du, dv, t) : panelClip(axis, c, w, h, t);
    b.add({ p, s, color: hex, opacity: o.opacity ?? 0.95, sway: o.sway, n, clip: cell, fx: o.fx, depthBias: o.depthBias });
  }
}

/** A line of small round splats: rails, poles, outlines, wires. */
export function line(b: Builder, a: Vec3, e: Vec3, color: number, size = 0.05, spacing = 0.06, opacity = 0.95): void {
  const len = Math.hypot(e[0] - a[0], e[1] - a[1], e[2] - a[2]);
  const n = Math.max(1, Math.round(len / spacing));
  for (let i = 0; i <= n; i += 1) {
    const f = i / n;
    b.add({ p: [a[0] + (e[0] - a[0]) * f, a[1] + (e[1] - a[1]) * f, a[2] + (e[2] - a[2]) * f], s: [size, size, size], color, opacity });
  }
}

export interface BoxOpts extends PanelOpts { top?: number; edge?: number | false; /** no face shading: big pastel walls that must stay one clean colour */ flat?: boolean }

/** Dark contour along the visible edges of a box, so every building reads against the next one. */
export function outline(b: Builder, cx: number, cz: number, w: number, d: number, y0: number, h: number, color: number, k = 0.55): void {
  const c = darken(color, k), x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y1 = y0 + h;
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]] as const) line(b, [x, y0, z], [x, y1, z], c, 0.05, 0.07);
  line(b, [x0, y1, z1], [x1, y1, z1], c, 0.05, 0.07); line(b, [x1, y1, z0], [x1, y1, z1], c, 0.05, 0.07);
  line(b, [x0, y1, z0], [x1, y1, z0], c, 0.05, 0.09); line(b, [x0, y1, z0], [x0, y1, z1], c, 0.05, 0.09);
  line(b, [x0, y0, z1], [x1, y0, z1], c, 0.05, 0.07); line(b, [x1, y0, z0], [x1, y0, z1], c, 0.05, 0.07);
}

/** Five-sided box (top and four walls) with a dark contour. */
export function box(b: Builder, cx: number, cz: number, w: number, d: number, y0: number, h: number, color: number, o: BoxOpts = {}): void {
  const dens = o.density ?? 40, hid = { ...o, density: dens * 0.5 };
  panel(b, 'y', [cx, y0 + h, cz], w, d, o.top ?? color, { ...o, shade: 1 });
  panel(b, 'z', [cx, y0 + h / 2, cz + d / 2], w, h, color, { ...o, shade: 1 });
  panel(b, 'x', [cx + w / 2, y0 + h / 2, cz], d, h, color, { ...o, shade: 1 });
  panel(b, 'z', [cx, y0 + h / 2, cz - d / 2], w, h, color, { ...hid, shade: 1 });
  panel(b, 'x', [cx - w / 2, y0 + h / 2, cz], d, h, color, { ...hid, shade: 1 });
  // outlines come from the pixel pass now (depth/material edges), not from painted splat lines
}

/** Soft dark footprint on the ground so buildings sit down. */
export function shadow(b: Builder, cx: number, cz: number, w: number, d: number, pad = 0.6, opacity = 0.35): void {
  panel(b, 'y', [cx + pad * 0.3, 0.035, cz + pad * 0.3], w + pad * 2, d + pad * 2, 0x2b3a55, { density: 5, opacity, thick: 0.01, jitter: 0, depthBias: 0.03 });
}

/** Circles that approximate a rectangle, for the stage's round colliders. */
export function boxColliders(cx: number, cz: number, w: number, d: number): { x: number; z: number; r: number }[] {
  const r = Math.min(w, d) / 2 + 0.05, long = Math.max(w, d), alongX = w >= d;
  const n = Math.max(1, Math.ceil((long - 2 * r) / (r * 1.2)) + 1);
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : -(long / 2 - r) + (i * (long - 2 * r)) / (n - 1);
    return { x: alongX ? cx + t : cx, z: alongX ? cz : cz + t, r };
  });
}
