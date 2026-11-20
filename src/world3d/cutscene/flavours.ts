import { type Ctx, type Fx, lay } from './endingFx';
import { C, ball, flecks, kite, loopY, shell, type Area } from './fx';
import { person, SHIRTS } from './figures';
import type { EndingLabel } from './logic';
import { lerp, smooth } from './look';
import { box, tree } from './lookout';
import { setOpacity, type Builder, type Prop, type PropSet } from './props';

export interface HillCtx { ps: PropSet; area: Area; at: [number, number, number] }
/** How each ending colours the acts: extra weather in act 2, extra things on the hilltop in act 3. */
export interface Flavour { nightStart?: boolean; act2?: (c: Ctx) => Fx; hill?: (h: HillCtx) => Fx }

const on = (p: Prop, k: number) => setOpacity(p, k);
const local = (h: HillCtx, build: (b: Builder) => void, glow = 0): Prop => h.ps.add(build, { at: h.at, glow });
const sky = (h: HillCtx, build: (b: Builder) => void, glow = 0): Prop => h.ps.add(build, { anchored: true, depth: 80, glow });
const rising = (c: Ctx, n: number, o: Parameters<typeof flecks>[3], speed: number, glow = 0): Fx => {
  const p = lay(c, (b) => flecks(b, c.area, n, o), glow);
  return { set(k, t) { loopY(p, c.area, t, speed); on(p, k); } };
};

/** a loop-free dotted roller-coaster track with a car riding it */
function coaster(ps: PropSet, a: Area, y: number, depth: number): Fx {
  const curve = (x: number) => y + Math.sin(x * 0.9) * a.h * 0.12 + Math.sin(x * 0.35) * a.h * 0.1;
  const track = ps.add((b) => {
    for (let x = -a.w; x <= a.w; x += 0.2) {
      b.add({ p: [x, curve(x), 0], s: [0.09, 0.09, 0.05], color: C.coral, opacity: 1 });
      if (Math.round(x * 5) % 6 === 0) for (let s = curve(x) - 0.2; s > curve(x) - a.h * 0.5; s -= 0.18) b.add({ p: [x, s, 0], s: [0.04, 0.09, 0.04], color: C.sand, opacity: 0.9 });
    }
  }, { anchored: true, depth });
  const car = ps.add((b) => { b.blob(0, 0, 0, 0.5, 0.25, 0.2, 30, C.sun, 0.16); b.blob(0, 0.3, 0, 0.2, 0.2, 0.2, 18, C.rose, 0.1); }, { anchored: true, depth: depth - 1 });
  return { set(k, t) {
    const x = lerp(-a.w * 0.9, a.w * 0.9, (t * 0.12) % 1);
    car.node.position.set(x, curve(x) + 0.35, 0);
    on(track, k); on(car, k);
  } };
}

function fireworks(h: HillCtx): Fx {
  const r = Math.min(h.area.w * 0.8, 3);
  const bursts = [C.sun, C.coral, C.violet, C.teal].map((color, i) => ({ p: sky(h, (b) => shell(b, color, 80), 0.35), x: (i - 1.5) * h.area.w * 0.45, y: h.area.h * (0.45 + (i % 2) * 0.18), off: i * 0.31 }));
  return { set(k, t) {
    for (const s of bursts) {
      const ph = ((t * 0.42 + s.off) % 1);
      s.p.node.position.set(s.x, s.y, 0);
      s.p.node.scale.setScalar(0.2 + r * (1 - (1 - ph) ** 3));
      on(s.p, k * (1 - ph * ph));
    }
  } };
}

function kitesInSky(h: HillCtx): Fx {
  const p = sky(h, (b) => [[-0.55, 0.55, 1.4], [0.5, 0.35, 1.1], [-0.1, 0.8, 1], [0.1, 0.1, 1.5], [0.62, 0.75, 0.9]].forEach(([fx, fy, s], i) => kite(b, fx * h.area.w, fy * h.area.h, s, [C.coral, C.sun, C.teal, C.violet, C.rose][i])));
  return { set(k, t) { p.node.position.set(Math.sin(t * 0.5) * 0.4, Math.sin(t * 0.7) * 0.3, 0); on(p, k); } };
}

function ringSlice(b: Builder, x: number, y: number, rMax: number) {
  for (let i = 0; i < 47; i += 1) {
    const r = ((i + 1) / 47) * rMax, n = Math.max(6, Math.round(r * 18));
    for (let k = 0; k < n; k += 1) {
      const a = (k / n) * Math.PI * 2;
      b.add({ p: [x + Math.cos(a) * r, y + Math.sin(a) * r, 0], s: [0.05, 0.05, 0.03], color: i % 2 ? C.tan : C.wood, opacity: 1 });
    }
  }
  for (let i = 0; i < 6; i += 1) b.add({ p: [x - 0.9 + i * 0.36, 0.5, 0.1], s: [0.1, 0.5, 0.06], color: C.bark, opacity: 1 });
}

function garland(b: Builder, from: number, to: number, y: number, z: number, colors: number[]) {
  for (let i = 0; i <= 16; i += 1) {
    const s = i / 16, x = lerp(from, to, s);
    b.blob(x, y - Math.sin(s * Math.PI) * 0.9, z, 0.16, 0.16, 0.16, 14, colors[i % colors.length], 0.1);
  }
}

function longTable(b: Builder) {
  [box(7, 0.12, 1.3, C.cream, 0, 0.85, -1.6), box(0.12, 0.85, 0.12, C.bark, -3.3, 0, -1.9), box(0.12, 0.85, 0.12, C.bark, 3.3, 0, -1.9)].forEach((m) => b.surface(m, { density: 22, size: 0.1 }));
  for (let i = -3; i <= 3; i += 1) { b.blob(i * 0.9, 0.98, -1.6, 0.2, 0.03, 0.2, 10, C.white, 0.08); b.blob(i * 0.9 + 0.2, 1.1, -1.4, 0.1, 0.1, 0.1, 8, [C.coral, C.sun, C.leaf][(i + 3) % 3], 0.07); }
  for (let i = 0; i < 6; i += 1) person(b, -2.5 + i * 1, 0, i % 2 ? -0.6 : -2.7, { shirt: SHIRTS[i], sit: true, scale: i === 2 ? 0.62 : 1, hair: i % 3 === 0 ? 0xe8dcc0 : C.bark });
}

export const FLAVOURS: Record<EndingLabel, Flavour> = {
  saverKing: {
    act2: (c) => rising(c, 40, { colors: [C.sun, C.glow], size: 0.14, sway: 0.3 }, 1.0, 0.3),
    hill(h) {
      const jar = local(h, (b) => { b.blob(-2.75, 0.75, 1.6, 0.22, 0.3, 0.22, 40, C.pale, 0.1, { opacity: 0.5 }); b.blob(-2.75, 0.6, 1.6, 0.17, 0.12, 0.17, 24, C.sun, 0.07); b.blob(-2.75, 0.95, 1.6, 0.05, 0.12, 0.05, 10, C.leaf, 0.05); for (let i = 0; i < 3; i += 1) b.blob(-1 + i * 0.5, 1.15, 4.7, 0.18, 0.1 + i * 0.06, 0.18, 22, C.sun, 0.07); }, 0.15);
      return { set: (k) => on(jar, k) };
    },
  },
  moonlight: {
    nightStart: true,
    act2(c) {
      const neon = lay(c, (b) => { for (let i = 0; i < 14; i += 1) ball(b, (b.rnd() * 2 - 1) * c.area.w, (b.rnd() * 1.6 - 0.8) * c.area.h, 0.25, [C.coral, C.violet, C.teal, C.rose][i % 4], { halo: 2.6 }); }, 0.45);
      return { set(k, t) { on(neon, k * (1 - smooth((t - 13) / 3)) * (0.8 + 0.2 * Math.sin(t * 5))); } };
    },
    hill(h) { const g = local(h, (b) => garland(b, -7, 7, 3.4, -1, [C.coral, C.violet, C.teal, C.sun]), 0.35); return { set: (k, t) => on(g, k * (0.7 + 0.3 * Math.sin(t * 3))) }; },
  },
  steady: {
    hill(h) {
      const p = local(h, (b) => { for (const x of [-2.6, 0, 2.6]) b.blob(x, 0.15, 4.0, 0.22, 0.15, 0.22, 20, C.tan, 0.08); tree(b, -2.6, 4.0, 1.5); b.blob(0, 0.6, 4, 0.2, 0.35, 0.2, 40, C.leaf, 0.1); for (let i = 0; i < 5; i += 1) b.add({ p: [0 + (i - 2) * 0.12, 0.95, 4], s: [0.09, 0.09, 0.09], color: [C.coral, C.sun, C.rose][i % 3], opacity: 1 }); b.blob(2.6, 0.3, 4, 0.2, 0.2, 0.2, 30, C.sun, 0.08); });
      return { set: (k) => on(p, k) };
    },
  },
  riskWinner: {
    act2: (c) => rising(c, 70, { colors: [C.sun, C.coral, C.teal, C.violet, C.rose], size: 0.12, flat: 0.5 }, 2.2),
    hill: fireworks,
  },
  rollercoaster: {
    act2: (c) => coaster(c.ps, c.area, 0, -30),
    hill: (h) => coaster(h.ps, h.area, h.area.h * 0.35, 80),
  },
  zenInvestor: {
    act2(c) {
      const p = c.ps.add((b) => tree(b, 0, 0, 3.6), { at: [c.pos.x + 2.6, 0, c.pos.z + 0.8] });
      return { set(k) { p.g.uniforms.uReveal.value = k; p.node.scale.setScalar(lerp(0.5, 1, k)); p.root.visible = k > 0.01; } };
    },
    hill(h) {
      const p = local(h, (b) => { tree(b, 6.6, 0.8, 5); ringSlice(b, -5.2, 2.7, 2.4); });
      return { set: (k) => on(p, k) };
    },
  },
  debtJuggler: {
    act2: (c) => rising(c, 26, { colors: [C.cream, C.sand, C.rose], size: 0.3, flat: 1.3, sway: 0.5 }, -3.4),
    hill: kitesInSky,
  },
  exitOnRed: {
    act2(c) {
      const line = lay(c, (b) => { for (let i = 0; i < 40; i += 1) { const s = i / 39; b.add({ p: [lerp(-c.area.w, c.area.w, s), lerp(-c.area.h * 0.6, c.area.h * 0.6, s * s) + Math.sin(s * 9) * 0.25, 0], s: [0.12, 0.12, 0.05], color: C.green, opacity: 1 }); } }, 0.3);
      return { set(k) { line.g.uniforms.uReveal.value = k; on(line, k); } };
    },
    hill(h) {
      const gate = local(h, (b) => { b.surface(box(0.3, 3.4, 0.3, C.coral, 4.4, 0, 3), { density: 30, size: 0.09 }); b.surface(box(0.3, 3.4, 0.3, C.coral, 7, 0, 3), { density: 30, size: 0.09 }); b.surface(box(3.4, 0.3, 0.4, C.coral, 5.7, 3.2, 3), { density: 30, size: 0.09 }); b.surface(box(3, 0.2, 0.3, C.sand, 5.7, 2.8, 3), { density: 30, size: 0.09 }); }, 0.1);
      const line = sky(h, (b) => { for (let i = 0; i < 30; i += 1) { const s = i / 29; b.add({ p: [lerp(-h.area.w * 0.8, h.area.w * 0.8, s), lerp(h.area.h * 0.1, h.area.h * 0.7, s) + Math.sin(s * 8) * 0.2, 0], s: [0.1, 0.1, 0.05], color: C.green, opacity: 1 }); } }, 0.3);
      return { set(k) { on(gate, k); on(line, k); } };
    },
  },
  familyPillar: {
    act2: (c) => rising(c, 12, { colors: [C.sun, C.coral], size: 0.28, sway: 0.4 }, -0.8, 0.4),
    hill(h) { const t = local(h, longTable, 0.05); return { set: (k) => on(t, k) }; },
  },
};
