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
}

/** Shade towards a cool slate instead of scaling lightness, so pastel walls stay pastel in shadow. */
const coolShade = (hex: number, shade: number) => (shade >= 1 ? hex : mix(hex, 0x4a5578, Math.min(0.6, (1 - shade) * 0.85)));

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

/** A flat rectangle of splats. axis = its normal; w runs along x (or z for an x-plane), h along y (or z for a y-plane). */
export function panel(b: Builder, axis: Axis, c: Vec3, w: number, h: number, color: number | ColorFn, o: PanelOpts = {}): void {
  const density = o.density ?? 40;
  const nu = Math.max(1, Math.round(w * Math.sqrt(density))), nv = Math.max(1, Math.round(h * Math.sqrt(density)));
  const du = w / nu, dv = h / nv, t = o.thick ?? 0.02;
  for (let i = 0; i < nu; i += 1) for (let j = 0; j < nv; j += 1) {
    const fu = (i + 0.1 + b.rnd() * 0.8) / nu, fv = (j + 0.1 + b.rnd() * 0.8) / nv;
    if (o.mask && !o.mask(fu, fv)) continue;
    const u = (fu - 0.5) * w, v = (fv - 0.5) * h;
    const su = du * 0.55 * (0.85 + b.rnd() * 0.3), sv = dv * 0.55 * (0.85 + b.rnd() * 0.3);
    const hex = typeof color === 'function' ? color(fu, fv) : color;
    const p: [number, number, number] = axis === 'z' ? [c[0] + u, c[1] + v, c[2]] : axis === 'x' ? [c[0], c[1] + v, c[2] + u] : [c[0] + u, c[1], c[2] + v];
    const s: [number, number, number] = axis === 'z' ? [su, sv, t] : axis === 'x' ? [t, sv, su] : [su, t, sv];
    b.add({ p, s, color: b.vary(coolShade(hex, o.shade ?? 1), o.jitter ?? 0.03, 1), opacity: o.opacity ?? 0.95, sway: o.sway });
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
  const dens = o.density ?? 40, hid = { ...o, density: dens * 0.5 }, sh = (v: number) => (o.flat ? 1 : v);
  panel(b, 'y', [cx, y0 + h, cz], w, d, o.top ?? lighten(color, 0.12), { ...o, shade: 1 });
  panel(b, 'z', [cx, y0 + h / 2, cz + d / 2], w, h, color, { ...o, shade: sh(0.9) });
  panel(b, 'x', [cx + w / 2, y0 + h / 2, cz], d, h, color, { ...o, shade: sh(0.8) });
  panel(b, 'z', [cx, y0 + h / 2, cz - d / 2], w, h, color, { ...hid, shade: sh(0.72) });
  panel(b, 'x', [cx - w / 2, y0 + h / 2, cz], d, h, color, { ...hid, shade: sh(0.7) });
  if (o.edge !== false) outline(b, cx, cz, w, d, y0, h, color, o.edge ?? 0.55);
}

/** Soft dark footprint on the ground so buildings sit down. */
export function shadow(b: Builder, cx: number, cz: number, w: number, d: number, pad = 0.6, opacity = 0.35): void {
  panel(b, 'y', [cx + pad * 0.3, 0.025, cz + pad * 0.3], w + pad * 2, d + pad * 2, 0x2b3a55, { density: 5, opacity, thick: 0.01, jitter: 0 });
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
