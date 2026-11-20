import * as THREE from 'three';
import type { Builder, Prop } from './props';

// Splat recipes for sky, weather and light. Anchored ones are laid out in screen units: x right, y up.
const Z = new THREE.Vector3(0, 0, 1);
export const spin = (a: number) => new THREE.Quaternion().setFromAxisAngle(Z, a);

/** half extents of the screen area an anchored effect has to cover */
export interface Area { w: number; h: number }

export const C = {
  ink: 0x2b3a55, slate: 0x4f6a8a, night: 0x1f2a44, sky: 0x8fd3ff, pale: 0xcdeeff, cream: 0xfff6dc, white: 0xffffff,
  green: 0x7ed07a, leaf: 0x4fae5f, deep: 0x2f8a4f, teal: 0x4cc3d9, coral: 0xff8a6b, peach: 0xffc29b, rose: 0xffb3a7,
  sun: 0xffd85a, glow: 0xfff0b8, violet: 0xb9a7ff, wood: 0x9a6b45, tan: 0xc98f5a, bark: 0x6b4a33, sand: 0xf7e9c4,
};

/** Falling or rising layer: scroll the node by this to loop forever (pair with tiled=true). */
export function loopY(prop: Prop, a: Area, t: number, speed: number) {
  const period = a.h * 2;
  prop.node.position.y = speed >= 0 ? -((t * speed) % period) : (t * -speed) % period;
}

/** thin streaks (rain), tiled three times so loopY never shows an edge */
export function streaks(b: Builder, a: Area, n: number, o: { color: number; len: number; lean?: number; opacity?: number; thick?: number }) {
  const period = a.h * 2;
  for (let i = 0; i < n; i += 1) {
    const x = (b.rnd() * 2 - 1) * a.w, y = (b.rnd() * 2 - 1) * a.h, len = o.len * (0.7 + b.rnd() * 0.6);
    for (const k of [-1, 0, 1]) b.add({ p: [x, y + k * period, 0], s: [o.thick ?? 0.03, len, 0.03], q: spin(o.lean ?? 0.12), color: b.vary(o.color, 0.05), opacity: o.opacity ?? 0.7 });
  }
}

/** scattered flecks: confetti, petals, sparkles, dust, coins */
export function flecks(b: Builder, a: Area, n: number, o: { colors: number[]; size: number; opacity?: number; sway?: number; flat?: number; tile?: boolean }) {
  const period = a.h * 2;
  for (let i = 0; i < n; i += 1) {
    const x = (b.rnd() * 2 - 1) * a.w, y = (b.rnd() * 2 - 1) * a.h, sz = o.size * (0.6 + b.rnd() * 0.8);
    const color = o.colors[Math.floor(b.rnd() * o.colors.length)], q = spin(b.rnd() * Math.PI);
    for (const k of o.tile === false ? [0] : [-1, 0, 1]) {
      b.add({ p: [x, y + k * period, 0], s: [sz, sz * (o.flat ?? 1), sz * 0.2], q, color, opacity: o.opacity ?? 0.9, sway: o.sway ?? 0 });
    }
  }
}

/** a flat glowing ball: sun, moon, lamps. Exact colour, no shading. */
export function ball(b: Builder, x: number, y: number, r: number, color: number, o: { halo?: number; haloColor?: number; opacity?: number } = {}) {
  const n = Math.ceil(r * 55) + 14;
  for (let i = 0; i < n; i += 1) {
    const a = b.rnd() * Math.PI * 2, d = Math.sqrt(b.rnd()) * r * 0.82;
    b.add({ p: [x + Math.cos(a) * d, y + Math.sin(a) * d, 0], s: [r * 0.2, r * 0.2, r * 0.05], color, opacity: o.opacity ?? 1 });
  }
  if (!o.halo) return;
  for (let i = 0; i < 40; i += 1) {
    const a = b.rnd() * Math.PI * 2, d = Math.sqrt(b.rnd()) * r * o.halo;
    b.add({ p: [x + Math.cos(a) * d, y + Math.sin(a) * d, -0.05], s: [r * 0.5, r * 0.5, 0.05], color: o.haloColor ?? color, opacity: 0.11 });
  }
}

export function cloud(b: Builder, x: number, y: number, scale: number, color: number) {
  b.blob(x, y, 0, 2.6 * scale, 0.8 * scale, 0.7 * scale, 70, color, 0.5 * scale, { opacity: 0.95, jitter: 0.03 });
  b.blob(x - 1.4 * scale, y - 0.2 * scale, 0.1, 1.5 * scale, 0.6 * scale, 0.6 * scale, 40, color, 0.42 * scale, { opacity: 0.95, jitter: 0.03 });
  b.blob(x + 1.6 * scale, y - 0.15 * scale, 0.1, 1.4 * scale, 0.55 * scale, 0.6 * scale, 40, color, 0.4 * scale, { opacity: 0.95, jitter: 0.03 });
}

/** a burst of sparks on a sphere shell, unit radius; scale the node to grow it */
export function shell(b: Builder, color: number, n: number) {
  for (let i = 0; i < n; i += 1) {
    const u = b.rnd() * 2 - 1, t = b.rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u), k = 0.85 + b.rnd() * 0.15;
    b.add({ p: [Math.cos(t) * r * k, u * k, Math.sin(t) * r * k * 0.5], s: [0.028, 0.028, 0.028], color: b.rnd() > 0.3 ? color : C.white, opacity: 1 });
  }
}

/** rainbow bands as arcs, centred at (cx, cy) */
export function rainbow(b: Builder, cx: number, cy: number, r: number) {
  const bands = [C.coral, C.sun, C.green, C.teal, C.violet];
  bands.forEach((color, i) => {
    const rad = r - i * 0.32;
    for (let k = 0; k < 90; k += 1) {
      const a = Math.PI * (0.08 + 0.84 * (k / 89));
      b.add({ p: [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 0], s: [0.2, 0.2, 0.05], color, opacity: 0.8 });
    }
  });
}

/** heart outline filled with splats */
export function heart(b: Builder, x: number, y: number, size: number, color: number) {
  for (let i = 0; i < 60; i += 1) {
    const t = (i / 60) * Math.PI * 2, f = b.rnd() > 0.5 ? 1 : 0.55 * b.rnd();
    const hx = 16 * Math.sin(t) ** 3, hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    b.add({ p: [x + (hx / 17) * size * f, y + (hy / 17) * size * f, 0], s: [size * 0.09, size * 0.09, size * 0.03], color, opacity: 0.95 });
  }
}

/** a paper kite: diamond of paper, a tail of dots and a string */
export function kite(b: Builder, x: number, y: number, size: number, color: number) {
  for (let i = 0; i < 40; i += 1) {
    const u = b.rnd() * 2 - 1, v = b.rnd() * 2 - 1;
    if (Math.abs(u) + Math.abs(v) > 1) continue;
    b.add({ p: [x + u * size * 0.6, y + v * size * 0.85, 0], s: [size * 0.1, size * 0.1, 0.02], color: b.vary(color, 0.04), opacity: 1 });
  }
  for (let i = 1; i < 9; i += 1) {
    const sway = Math.sin(i * 0.9) * size * 0.25;
    b.add({ p: [x + sway, y - size * 0.85 - i * size * 0.18, 0], s: [size * 0.07, size * 0.07, 0.02], color: i % 2 ? C.coral : C.sun, opacity: 1 });
  }
}

export function stars(b: Builder, a: Area, n: number) {
  for (let i = 0; i < n; i += 1) {
    b.add({ p: [(b.rnd() * 2 - 1) * a.w, (0.1 + b.rnd() * 0.9) * a.h, 0], s: [0.07, 0.07, 0.05], color: b.rnd() > 0.5 ? C.cream : C.glow, opacity: 0.4 + b.rnd() * 0.6, sway: 0.08 });
  }
}
