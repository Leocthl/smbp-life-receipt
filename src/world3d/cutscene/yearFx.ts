import type { Regime } from '../../engine/types';
import { C, ball, cloud, flecks, loopY, rainbow, shell, streaks, type Area } from './fx';
import { bump, lerp } from './look';
import { setOpacity, type PropSet } from './props';

/** Regime weather for the year-end vignette: fn(u, t) with u = progress 0..1. */
export type YearFx = (u: number, t: number) => void;

const BURST_COLORS = [C.sun, C.coral, C.violet, C.teal, C.rose];

function bulls(ps: PropSet, a: Area): YearFx {
  const r = Math.min(a.w * 0.75, 3.4);
  const bursts = BURST_COLORS.map((color, i) => ({
    prop: ps.add((b) => shell(b, color, 90), { anchored: true, depth: -30, glow: 0.35 }),
    x: (i % 2 ? 1 : -1) * a.w * (0.15 + 0.12 * i), y: a.h * (0.25 + 0.14 * (i % 3)), at: 0.42 + i * 0.1,
  }));
  const confetti = ps.add((b) => flecks(b, a, 60, { colors: [C.sun, C.coral, C.teal, C.rose], size: 0.12, flat: 0.5 }), { anchored: true, depth: -30 });
  return (u, t) => {
    for (const s of bursts) {
      const k = (u - s.at) / 0.24;
      const live = k > 0 && k < 1;
      s.prop.node.position.set(s.x, s.y, 0);
      s.prop.node.scale.setScalar(live ? lerp(0.2, r, 1 - (1 - k) ** 3) : 0.01);
      setOpacity(s.prop, live ? 1 - k * k : 0);
    }
    loopY(confetti, a, t, 2.2);
    setOpacity(confetti, bump(u, 0.7, 0.8, 1, 1.01));
  };
}

function crashes(ps: PropSet, a: Area): YearFx {
  const rain = ps.add((b) => streaks(b, a, 150, { color: C.pale, len: 0.9 }), { anchored: true, depth: -30 });
  const far = ps.add((b) => streaks(b, a, 150, { color: C.sky, len: 0.5, opacity: 0.4 }), { anchored: true, depth: -30 });
  const bow = ps.add((b) => rainbow(b, 0, -a.h * 0.25, Math.min(a.w * 0.9, a.h * 0.55)), { anchored: true, depth: -30, glow: 0.12 });
  return (u, t) => {
    loopY(rain, a, t, 24);
    loopY(far, a, t, 15);
    const k = 1 - bump(u, 0.55, 0.62, 1, 1.01);
    setOpacity(rain, k * 0.9);
    setOpacity(far, k);
    setOpacity(bow, bump(u, 0.66, 0.84, 1, 1.01));
  };
}

function corrections(ps: PropSet, a: Area): YearFx {
  const grey = ps.add((b) => { for (let i = 0; i < 5; i += 1) cloud(b, (i - 2) * a.w * 0.55, a.h * (0.62 + (i % 2) * 0.14), 0.9, C.slate); }, { anchored: true, depth: -30 });
  const white = ps.add((b) => { for (let i = 0; i < 4; i += 1) cloud(b, (i - 1.5) * a.w * 0.6, a.h * (0.55 + (i % 2) * 0.2), 0.8, C.pale); }, { anchored: true, depth: -30 });
  return (u) => {
    grey.node.position.x = lerp(-a.w * 0.3, a.w * 0.4, u);
    white.node.position.x = lerp(a.w * 0.5, -a.w * 0.2, u);
    setOpacity(grey, bump(u, 0, 0.2, 0.55, 0.75));
    setOpacity(white, bump(u, 0.6, 0.8, 1, 1.01));
  };
}

function recoveries(ps: PropSet, a: Area): YearFx {
  const rays = ps.add((b) => {
    for (let i = 0; i < 9; i += 1) for (let k = 0; k < 20; k += 1) {
      const ang = -0.7 + i * 0.18, d = 1 + k * a.h * 0.12;
      b.add({ p: [Math.sin(ang) * d, -a.h * 0.55 + Math.cos(ang) * d * 0.9, 0], s: [0.3 + k * 0.06, 0.3 + k * 0.06, 0.05], color: C.glow, opacity: 0.1 });
    }
  }, { anchored: true, depth: -30, glow: 0.2 });
  const sparks = ps.add((b) => flecks(b, a, 40, { colors: [C.glow, C.sun], size: 0.08, sway: 0.2 }), { anchored: true, depth: -30, glow: 0.3 });
  return (u, t) => {
    rays.node.rotation.z = Math.sin(t * 0.5) * 0.05;
    setOpacity(rays, bump(u, 0.55, 0.8, 1, 1.01));
    loopY(sparks, a, t, -1.4);
    setOpacity(sparks, bump(u, 0.6, 0.8, 1, 1.01));
  };
}

function normals(ps: PropSet, a: Area): YearFx {
  const lamps = ps.add((b) => { for (let i = 0; i < 9; i += 1) ball(b, (b.rnd() * 2 - 1) * a.w, (b.rnd() * 2 - 1) * a.h, 0.2, i % 2 ? C.coral : C.sun, { halo: 2.6, haloColor: C.peach }); }, { anchored: true, depth: -30, glow: 0.35 });
  return (u) => {
    lamps.node.position.y = lerp(-a.h * 0.45, a.h * 0.2, u);
    setOpacity(lamps, bump(u, 0.3, 0.45, 0.9, 1.01));
  };
}

const MAKERS: Record<Regime, (ps: PropSet, a: Area) => YearFx> = { bull: bulls, crash: crashes, correction: corrections, recovery: recoveries, normal: normals };

export function makeYearFx(ps: PropSet, a: Area, regime: Regime): YearFx {
  return MAKERS[regime](ps, a);
}
