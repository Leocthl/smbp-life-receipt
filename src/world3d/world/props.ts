import { box, line, panel, type Builder, type Vec3 } from './kit';
import { figure } from './figure';
import type { Tag } from '../../engine/types';

// One keepsake per decision. Each is a few dozen to a couple of hundred splats, drawn small and bright.

export interface Surf { b: Builder; g: Builder }
export interface PropOpts {
  x: number; y: number; z: number;
  /** size from the money involved */
  s: number;
  /** accent colour from the decision's category */
  acc: number;
  /** 0..1.6: how much later life has passed since the decision (trees grow) */
  grow: number;
  /** 0..1: how full a jar is */
  fill: number;
  /** a wall slot: which wall the prop hangs on */
  wall?: 'x' | 'z';
}
type Draw = (f: Surf, o: PropOpts) => void;
interface Kind { flat: Draw; wall: Draw }

const INK = 0x2b3a55;
const at = (ax: 'x' | 'z', o: PropOpts, d: number): Vec3 => (ax === 'z' ? [o.x, o.y, o.z + d] : [o.x + d, o.y, o.z]);
const circle = (u: number, v: number) => (u - 0.5) ** 2 + (v - 0.5) ** 2 < 0.2;

function poster(bg: number, fg: number, mark: (u: number, v: number) => boolean, w = 0.8, h = 1): Draw {
  return ({ b, g }, o) => {
    const ax = o.wall ?? 'z', k = o.s * 0.9;
    panel(b, ax, at(ax, o, 0.02), w * k, h * k, 0xfff6dc, { density: 120 });
    panel(b, ax, at(ax, o, 0.04), (w - 0.12) * k, (h - 0.12) * k, bg, { density: 120 });
    panel(g, ax, at(ax, o, 0.06), (w - 0.12) * k, (h - 0.12) * k, fg, { density: 120, mask: mark });
  };
}

const coinJar: Draw = ({ b }, o) => {
  const { x, y, z, s } = o;
  b.blob(x, y + 0.28 * s, z, 0.2 * s, 0.27 * s, 0.2 * s, 50, 0xcdeeff, 0.05 * s, { opacity: 0.5 });
  b.blob(x, y + (0.05 + o.fill * 0.2) * s, z, 0.17 * s, (0.03 + o.fill * 0.2) * s, 0.17 * s, Math.round(30 + 60 * o.fill), 0xffd85a, 0.045 * s);
  box(b, x, z, 0.26 * s, 0.26 * s, y + 0.52 * s, 0.07 * s, o.acc, { density: 150, edge: 0.4 });
};

const moneyTree: Draw = ({ b, g }, o) => {
  const { x, y, z, s } = o, h = (0.4 + 0.3 * o.grow) * s, r = (0.2 + 0.1 * o.grow) * s;
  box(b, x, z, 0.3 * s, 0.3 * s, y, 0.24 * s, o.acc, { density: 120, edge: 0.4 });
  line(b, [x, y + 0.24 * s, z], [x, y + 0.24 * s + h, z], 0x6f4a32, 0.035 * s, 0.04);
  b.blob(x, y + 0.3 * s + h, z, r * 1.5, r * 1.2, r * 1.5, Math.round(50 + 40 * o.grow), (_a: number, v: number) => (v > 0.2 ? 0xb6e88a : 0x3f9f5a), 0.09 * s);
  for (let k = 0; k < 5; k += 1) g.blob(x + Math.cos(k * 1.9) * r * 1.3, y + 0.3 * s + h + Math.sin(k * 2.3) * r, z + Math.sin(k * 1.9) * r * 1.3, 0.03 * s, 0.03 * s, 0.03 * s, 3, 0xffd85a, 0.03 * s);
};

const dice: Draw = ({ b }, o) => {
  const { x, y, z, s } = o;
  box(b, x, z, 0.26 * s, 0.26 * s, y, 0.26 * s, 0xfff6dc, { density: 200, edge: 0.5 });
  box(b, x + 0.22 * s, z + 0.12 * s, 0.22 * s, 0.22 * s, y, 0.22 * s, o.acc, { density: 200, edge: 0.5 });
  for (const [dx, dz] of [[-0.05, -0.05], [0.05, 0.05], [0, 0]]) b.blob(x + dx * s, y + 0.27 * s, z + dz * s, 0.02 * s, 0.01, 0.02 * s, 3, INK, 0.02 * s);
};

const bags: Draw = ({ b }, o) => {
  const { x, y, z, s } = o;
  box(b, x, z, 0.3 * s, 0.18 * s, y, 0.4 * s, o.acc, { density: 130, edge: 0.4 });
  box(b, x + 0.25 * s, z + 0.05 * s, 0.26 * s, 0.16 * s, y, 0.32 * s, 0xffd85a, { density: 130, edge: 0.4 });
  line(b, [x - 0.07 * s, y + 0.4 * s, z], [x + 0.07 * s, y + 0.4 * s, z], INK, 0.015 * s, 0.03);
};

const guitar: Draw = ({ b }, o) => {
  const { x, y, z, s } = o;
  b.blob(x, y + 0.2 * s, z, 0.22 * s, 0.2 * s, 0.07 * s, 60, 0xd9953a, 0.06 * s);
  b.blob(x, y + 0.42 * s, z, 0.15 * s, 0.14 * s, 0.07 * s, 40, 0xd9953a, 0.05 * s);
  b.add({ p: [x, y + 0.26 * s, z + 0.075 * s], s: [0.045 * s, 0.045 * s, 0.02], color: INK, opacity: 1, detail: true });
  box(b, x, z, 0.07 * s, 0.05 * s, y + 0.5 * s, 0.6 * s, 0x6f4a32, { density: 300, edge: false });
  box(b, x, z, 0.12 * s, 0.05 * s, y + 1.08 * s, 0.14 * s, o.acc, { density: 300, edge: false });
};

const frame = (inner: number, mark: number): Draw => ({ b, g }, o) => {
  const { x, y, z, s } = o;
  box(b, x, z, 0.4 * s, 0.05 * s, y, 0.34 * s, o.acc, { density: 200, edge: 0.4 });
  panel(b, 'z', [x, y + 0.17 * s, z + 0.03 * s], 0.3 * s, 0.24 * s, inner, { density: 200 });
  g.blob(x - 0.06 * s, y + 0.15 * s, z + 0.04 * s, 0.04 * s, 0.06 * s, 0.02, 6, mark, 0.025 * s);
  g.blob(x + 0.06 * s, y + 0.15 * s, z + 0.04 * s, 0.04 * s, 0.05 * s, 0.02, 6, 0xffc29b, 0.025 * s);
};

const laptop: Draw = ({ b, g }, o) => {
  const { x, y, z, s } = o;
  box(b, x, z, 0.46 * s, 0.32 * s, y, 0.03 * s, 0xc9d3e6, { density: 220, edge: 0.4 });
  box(b, x, z - 0.15 * s, 0.46 * s, 0.03 * s, y, 0.32 * s, 0x6b789c, { density: 220, edge: 0.4 });
  panel(g, 'z', [x, y + 0.17 * s, z - 0.13 * s], 0.38 * s, 0.24 * s, o.acc, { density: 220 });
};

const bills: Draw = ({ b }, o) => {
  const { x, y, z, s } = o;
  for (let k = 0; k < 4; k += 1) box(b, x + (k % 2) * 0.05 * s, z + 0.03 * s * k, 0.34 * s, 0.24 * s, y + k * 0.035 * s, 0.03 * s, k % 2 ? 0xfff6dc : 0xffe0c8, { density: 200, edge: 0.4 });
  box(b, x + 0.3 * s, z + 0.05 * s, 0.22 * s, 0.14 * s, y, 0.04 * s, 0xd9553f, { density: 220, edge: 0.4 });
  b.blob(x + 0.3 * s, y + 0.05 * s, z + 0.05 * s, 0.03 * s, 0.01, 0.03 * s, 3, 0xffd85a, 0.02 * s);
};

const umbrella: Draw = ({ b }, o) => {
  const { x, y, z, s } = o;
  line(b, [x, y, z], [x, y + 0.9 * s, z], 0x6f4a32, 0.025 * s, 0.04);
  b.blob(x, y + 0.92 * s, z, 0.28 * s, 0.08 * s, 0.28 * s, 40, o.acc, 0.07 * s);
};

const watchBox: Draw = ({ b, g }, o) => {
  const { x, y, z, s } = o;
  box(b, x, z, 0.3 * s, 0.22 * s, y, 0.12 * s, 0x6f4a32, { density: 200, edge: 0.4 });
  g.blob(x, y + 0.15 * s, z, 0.07 * s, 0.03 * s, 0.07 * s, 14, 0xffd85a, 0.03 * s);
  b.blob(x, y + 0.14 * s, z, 0.04 * s, 0.015, 0.04 * s, 5, 0xfff6dc, 0.02 * s);
};

const safe: Draw = ({ b, g }, o) => {
  const { x, y, z, s } = o;
  box(b, x, z, 0.5 * s, 0.4 * s, y, 0.5 * s, 0x6b789c, { density: 160, edge: 0.5 });
  g.blob(x, y + 0.28 * s, z + 0.21 * s, 0.07 * s, 0.07 * s, 0.02, 8, 0xffd85a, 0.03 * s);
  panel(b, 'z', [x, y + 0.25 * s, z + 0.205 * s], 0.4 * s, 0.4 * s, 0x9aa8c4, { density: 160 });
};

const ticker: Draw = ({ b, g }, o) => {
  const { x, y, z, s } = o;
  box(b, x, z, 0.4 * s, 0.14 * s, y, 0.26 * s, 0x2b3a55, { density: 200, edge: 0.4 });
  [0.3, 0.55, 0.45, 0.8].forEach((v, i) => panel(g, 'z', [x - 0.13 * s + i * 0.09 * s, y + (0.04 + v * 0.1) * s, z + 0.075 * s], 0.05 * s, v * 0.2 * s, i % 2 ? 0xd9553f : 0x7ed07a, { density: 400 }));
};

const plant: Draw = ({ b }, o) => {
  const { x, y, z, s } = o;
  box(b, x, z, 0.22 * s, 0.22 * s, y, 0.16 * s, o.acc, { density: 150, edge: 0.4 });
  b.blob(x, y + 0.3 * s, z, 0.16 * s, 0.14 * s, 0.16 * s, 24, 0x7ed07a, 0.06 * s);
};

const KINDS: Record<Tag | 'none', Kind> = {
  save: { flat: coinJar, wall: poster(0x8a73e0, 0xffd85a, circle) },
  invest: { flat: moneyTree, wall: poster(0xcdeeff, 0x3f9f5a, (u, v) => v < 0.2 + u * 0.6 && Math.floor(u * 5) % 2 === 0) },
  risky: { flat: dice, wall: poster(0x8a73e0, 0xff8a6b, (u, v) => Math.abs(u - 0.5) < 0.14 * (1.2 - v) && v > 0.15 && v < 0.85) },
  spend: { flat: bags, wall: poster(0xffc29b, 0xd9553f, (u, v) => Math.abs(u - 0.5) + Math.abs(v - 0.5) < 0.4) },
  fun: { flat: guitar, wall: poster(0x4cc3d9, 0xffd85a, (u, v) => circle(u, v) || v < 0.18) },
  family: { flat: frame(0xe4dcff, 0xb9a7ff), wall: poster(0xb9a7ff, 0xfff6dc, (u, v) => circle(u * 2, v) || circle(u * 2 - 1, v)) },
  career: { flat: laptop, wall: poster(0xfff6dc, 0xd9553f, (u, v) => v > 0.7 || (Math.abs(u - 0.5) < 0.12 && v < 0.35)) },
  work: { flat: laptop, wall: poster(0xfff6dc, 0xf2a93a, (u, v) => v > 0.7 || (Math.abs(u - 0.5) < 0.12 && v < 0.35)) },
  debt: { flat: bills, wall: poster(0xffe0c8, 0xd9553f, (u, v) => Math.floor(v * 6) % 2 === 0 && u < 0.8) },
  insure: { flat: umbrella, wall: poster(0xcdeeff, 0x2a9fc0, (u, v) => v > 0.5 ? Math.abs(u - 0.5) < 0.5 : Math.abs(u - 0.5) < v) },
  status: { flat: watchBox, wall: poster(0x2b3a55, 0xffd85a, (u, v) => Math.abs(u - 0.5) + Math.abs(v - 0.5) < 0.35) },
  safe: { flat: safe, wall: poster(0x9aa8c4, 0xffd85a, circle) },
  sell: { flat: ticker, wall: poster(0xfff6dc, 0x2a9fc0, circle) },
  hold: { flat: ticker, wall: poster(0xfff6dc, 0x7ed07a, circle) },
  none: { flat: plant, wall: poster(0xe4dcff, 0xb9a7ff, circle) },
};

export function drawProp(f: Surf, tag: Tag | 'none', o: PropOpts, onWall: boolean): void {
  const k = KINDS[tag] ?? KINDS.none;
  (onWall ? k.wall : k.flat)(f, o);
}

/** A grown-up for the family scenes: parents, partner, friend. */
export function adult(b: Builder, x: number, z: number, top: number, hair: number, scale = 1.2): void {
  figure(b, x, z, { top, pants: 0x4a5578, hair, scale });
}
