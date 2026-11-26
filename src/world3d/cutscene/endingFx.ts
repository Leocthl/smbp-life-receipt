import type * as THREE from 'three';
import type { Quality } from '../qualities';
import { C, flecks, heart, kite, loopY, rainbow, streaks, type Area } from './fx';
import { person, SHIRTS } from './figures';
import { lerp, type Grade } from './look';
import { setOpacity, type Builder, type Prop, type PropSet } from './props';

/** What the ending's acts are built from. set(k, t): k = 0..1 how present the effect is, t = the cutscene clock. */
export interface Fx { set(k: number, t: number): void }
export interface Ctx { ps: PropSet; area: Area; pos: THREE.Vector3 }
export interface Weather { sky: number; grade: Grade; /** camera view height, as a share of the usual one (a closer shot for the quiet acts) */ zoom?: number; make(c: Ctx): Fx }

export const lay = (c: Ctx, build: (b: Builder) => void, glow = 0, depth = -30): Prop => c.ps.add(build, { anchored: true, depth, glow });

function fog(b: Builder, a: Area, n: number, color: number, opacity: number) {
  for (let i = 0; i < n; i += 1) {
    const sz = 1.2 + b.rnd() * 1.4;
    b.add({ p: [(b.rnd() * 2 - 1) * a.w, (b.rnd() * 2 - 1) * a.h, 0], s: [sz * 1.7, sz, 0.1], color, opacity, sway: 0.4 });
  }
}

/** a dark block of windows: litFrac of them are lit */
export function tower(b: Builder, x: number, y0: number, w: number, h: number, litFrac: number) {
  for (let yy = 0; yy <= h; yy += 0.28) for (let xx = -w / 2; xx <= w / 2; xx += 0.28) b.add({ p: [x + xx, y0 + yy, 0], s: [0.2, 0.2, 0.05], color: 0x3d4f78, opacity: 1 });
  for (let r = 0; r < h / 0.8; r += 1) for (let k = 0; k < w / 0.7; k += 1) {
    const lit = b.rnd() < litFrac;
    b.add({ p: [x - w / 2 + 0.4 + k * 0.7, y0 + 0.5 + r * 0.8, 0.1], s: [0.1, 0.13, 0.05], color: lit ? C.sun : 0x2f4068, opacity: 1 });
  }
}

function umbrella(b: Builder, x: number, y: number, r: number) {
  for (let i = 0; i < 160; i += 1) {
    const a = Math.PI * b.rnd(), d = Math.sqrt(b.rnd()) * r;
    b.add({ p: [x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 0], s: [0.16, 0.16, 0.05], color: Math.floor((a / Math.PI) * 6) % 2 ? C.coral : C.sand, opacity: 1 });
  }
  for (let i = 0; i < 14; i += 1) b.add({ p: [x, y - i * 0.12, 0], s: [0.05, 0.08, 0.04], color: C.bark, opacity: 1 });
}

const falling = (c: Ctx, n: number, o: Parameters<typeof flecks>[3], speed: number, glow = 0): Fx => {
  const p = lay(c, (b) => flecks(b, c.area, n, o), glow);
  return { set(k, t) { loopY(p, c.area, t, speed); setOpacity(p, k); } };
};
const together = (...fx: Fx[]): Fx => ({ set(k, t) { fx.forEach((f) => f.set(k, t)); } });
const fader = (p: Prop, scale = 1): Fx => ({ set(k) { setOpacity(p, k * scale); } });

export const WEATHER: Record<Quality, Weather> = {
  wealth: {
    sky: 0x8a9fbd, grade: { sat: 0.4, tint: [0.9, 0.93, 1] },
    make: (c) => together(falling(c, 90, { colors: [C.pale, C.slate, C.sand], size: 0.07, opacity: 0.7, sway: 0.2 }, 1.2), fader(lay(c, (b) => fog(b, c.area, 10, C.slate, 0.2)), 0.8)),
  },
  safety: {
    sky: 0x5f7aa6, grade: { sat: 0.6, tint: [0.8, 0.86, 1] },
    make(c) {
      const near = lay(c, (b) => streaks(b, c.area, 110, { color: C.pale, len: 1, thick: 0.022, opacity: 0.6 }), 0, -30);
      const far = lay(c, (b) => streaks(b, c.area, 120, { color: C.sky, len: 0.55, thick: 0.02, opacity: 0.4 }), 0, -28);
      const flash = lay(c, (b) => b.add({ p: [0, 0, 0], s: [c.area.w * 1.5, c.area.h * 1.5, 0.1], color: C.white, opacity: 0.6 }), 0.3, -32);
      return { set(k, t) {
        loopY(near, c.area, t, 26); loopY(far, c.area, t, 16);
        setOpacity(near, k); setOpacity(far, k);
        const ph = (t % 4.3) / 4.3;
        setOpacity(flash, k * (ph < 0.02 ? 1 : ph > 0.05 && ph < 0.07 ? 0.7 : 0));
      } };
    },
  },
  joy: {
    sky: C.sand, grade: { sat: 0.3, tint: [0.98, 0.93, 0.8] },
    make: (c) => falling(c, 70, { colors: [C.bark, C.tan, C.wood], size: 0.12, sway: 0.3, flat: 0.6 }, 1.8),
  },
  bonds: {
    sky: C.pale, grade: { sat: 0.7, tint: [0.88, 0.92, 1] }, zoom: 0.8,
    make: (c) => together(fader(lay(c, (b) => fog(b, c.area, 12, C.pale, 0.1)), 0.9), falling(c, 30, { colors: [C.white, C.pale], size: 0.05, opacity: 0.8, sway: 0.15 }, 0.6)),
  },
  freedom: {
    sky: C.pale, grade: { sat: 0.5, tint: [0.92, 0.94, 1] },
    make: (c) => together(fader(lay(c, (b) => fog(b, c.area, 16, C.white, 0.28)), 0.9), falling(c, 26, { colors: [C.white, C.cream], size: 0.18, flat: 1.3, sway: 0.5 }, 2.2)),
  },
  growth: {
    sky: 0x4f6694, grade: { sat: 0.65, tint: [0.78, 0.84, 1] },
    make: (c) => together(fader(lay(c, (b) => tower(b, -c.area.w * 0.62, -c.area.h * 0.2, Math.min(2.2, c.area.w * 0.42), c.area.h * 1.1, 0.12)), 0.8), falling(c, 25, { colors: [C.slate, C.ink], size: 0.06, sway: 0.2 }, 0.8)),
  },
};

function visitors(c: Ctx): Fx {
  const p = c.ps.add((b) => { for (let i = 0; i < 4; i += 1) { const a = 0.6 + i * 1.5; person(b, Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2, { shirt: SHIRTS[i], hair: i % 2 ? C.ink : C.bark }); } }, { at: [c.pos.x, 0, c.pos.z] });
  return { set(k) { p.g.uniforms.uReveal.value = k; p.root.visible = k > 0.01; } };
}

export const BREAKTHROUGH: Record<Quality, (c: Ctx) => Fx> = {
  wealth: (c) => falling(c, 80, { colors: [C.sun, C.glow, C.white], size: 0.09, sway: 0.3 }, -1.4, 0.4),
  safety(c) {
    const u = lay(c, (b) => umbrella(b, 0, 1.8, 1.6));
    const bow = lay(c, (b) => rainbow(b, 0, -c.area.h * 0.3, Math.min(c.area.w * 0.9, c.area.h * 0.5)), 0.12, -33);
    return { set(k) { setOpacity(u, k); setOpacity(bow, k * 0.9); } };
  },
  joy: (c) => falling(c, 80, { colors: [C.rose, C.coral, C.peach, C.white], size: 0.11, sway: 0.35, flat: 0.7 }, 1.5),
  bonds(c) {
    const hearts = lay(c, (b) => { const P = c.area.h * 2; for (let i = 0; i < 6; i += 1) for (const k of [-1, 0, 1]) heart(b, (b.rnd() * 2 - 1) * c.area.w * 0.8, (b.rnd() * 2 - 1) * c.area.h + k * P, 0.9 + b.rnd() * 0.5, i % 2 ? C.rose : C.coral); }, 0.15);
    const who = visitors(c);
    return { set(k, t) { loopY(hearts, c.area, t, -1.6); setOpacity(hearts, k); who.set(k, t); } };
  },
  freedom(c) {
    const kites = lay(c, (b) => { [[-0.5, 0.5], [0.4, 0.2], [-0.2, -0.2], [0.55, -0.45]].forEach(([fx, fy], i) => kite(b, fx * c.area.w * 1.4, fy * c.area.h * 1.5, 1.3, [C.coral, C.sun, C.teal, C.violet][i])); });
    const papers = falling(c, 24, { colors: [C.white, C.cream], size: 0.18, flat: 1.3, sway: 0.5 }, -3.6);
    return { set(k, t) { kites.node.position.y = Math.sin(t * 0.7) * 0.3 + (1 - k) * -c.area.h; setOpacity(kites, k); papers.set(k, t); } };
  },
  growth: (c) => together(
    fader(lay(c, (b) => tower(b, -c.area.w * 0.62, -c.area.h * 0.2, Math.min(2.2, c.area.w * 0.42), c.area.h * 1.1, 0.9)), 0.9),
    falling(c, 50, { colors: [C.green, C.leaf, C.glow], size: 0.08, sway: 0.25 }, -1.8, 0.2),
  ),
};

/** a broad band of warm light that wipes across the screen; t = seconds since the turn */
export function sweepLight(ps: PropSet, a: Area): Fx {
  const p = ps.add((b) => {
    for (let i = 0; i < 46; i += 1) {
      const s = (i / 45) * 2 - 1;
      b.add({ p: [s * a.h * 0.45 + (b.rnd() - 0.5) * 1.2, s * a.h * 1.1, 0], s: [1.8, 2.4, 0.1], color: C.glow, opacity: 0.2 });
    }
  }, { anchored: true, depth: -34, glow: 0.15 });
  return { set(k, t) { p.node.position.x = lerp(-a.w * 2, a.w * 2, Math.max(0, Math.min(1, t / 3.4))); setOpacity(p, k); } };
}