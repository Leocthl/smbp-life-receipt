import * as THREE from 'three';
import { C } from './fx';
import { person, SHIRTS } from './figures';
import { companions } from './logic';
import type { Builder, Prop, PropSet } from './props';

// The hilltop lookout: a terrace with a railing and a bench, the city on the slope, the harbour beyond.
// Local frame: the harbour is +z, up is +y. The camera looks along +z from behind the terrace.

export const HILL_Z_FAR = 36;
export const WATER_Y = -8.6;

const mat = (color: number) => new THREE.MeshBasicMaterial({ color });
export function box(w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y + h / 2, z);
  return m;
}
function flat(w: number, d: number, color: number, x: number, y: number, z: number, tilt = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2 + tilt), mat(color));
  m.position.set(x, y, z);
  return m;
}

function landGroup(): THREE.Group {
  const g = new THREE.Group();
  g.add(flat(46, 12, C.green, 0, 0, -0.5), flat(2.4, 8, C.sand, 0, 0.02, -2.5));
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(46, 9), mat(C.leaf)); // hides the lowland that would show under the terrace
  wall.position.set(0, -4.5, -6.5);
  g.add(wall);
  const run = 12.5, drop = 8, len = Math.hypot(run, drop);
  g.add(flat(46, len, C.leaf, 0, -drop / 2, 5.5 + run / 2, Math.atan2(drop, run)));
  g.add(flat(46, 6, C.sand, 0, WATER_Y + 0.1, 18 + 3, 0));
  for (let x = -8; x <= 8; x += 1.6) g.add(box(0.14, 1.05, 0.14, C.bark, x, 0, 4.7));
  g.add(box(17, 0.1, 0.16, C.wood, 0, 1.0, 4.7), box(17, 0.08, 0.12, C.wood, 0, 0.55, 4.7));
  return g;
}

function benchGroup(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.add(box(2.2, 0.12, 0.7, C.wood, x, 0.5, z), box(2.2, 0.6, 0.1, C.tan, x, 0.62, z - 0.32));
  g.add(box(0.12, 0.5, 0.6, C.bark, x - 0.95, 0, z), box(0.12, 0.5, 0.6, C.bark, x + 0.95, 0, z));
  return g;
}

export function tree(b: Builder, x: number, z: number, h: number) {
  b.blob(x, h * 0.4, z, 0.16, h * 0.4, 0.16, 36, C.bark, 0.1);
  b.blob(x, h * 0.95, z, 1.5, 1.2, 1.5, 240, (_x, y) => (y > 0.1 ? C.green : C.leaf), 0.3, { sway: 0.04 });
}

/** Terrace, slope, bench, railing and trees. */
export function buildLand(ps: PropSet, at: [number, number, number]): Prop {
  return ps.add((b) => {
    b.surface(landGroup(), { density: 22, size: 0.13, jitter: 0.06 });
    b.surface(benchGroup(-3.4, 1.6), { density: 26, size: 0.1 });
    tree(b, -7.2, -1.5, 3.4);
    tree(b, 7.4, -0.5, 3);
    for (let i = 0; i < 40; i += 1) b.add({ p: [(b.rnd() * 2 - 1) * 9, 0.06, -5 + b.rnd() * 9], s: [0.07, 0.07, 0.07], color: [C.sun, C.rose, C.white][i % 3], opacity: 1 });
  }, { at, seed: 71 });
}

function cityGroup(rnd: () => number): THREE.Group {
  const g = new THREE.Group();
  const walls = [C.pale, C.sand, C.rose, 0x9fdff0, C.cream, 0xe8dcc0];
  for (let row = 0; row < 5; row += 1) for (let x = -24; x <= 24; x += 1.5) {
    const z = 9.5 + row * 2.6 + rnd() * 0.9, h = 1.6 + row * 0.9 + rnd() * 3, w = 0.9 + rnd() * 0.6;
    const base = -8.4 * Math.min(1, (z - 5.5) / 12.5) - 0.6;
    g.add(box(w, h + 0.6, 1.2, walls[Math.floor(rnd() * walls.length)], x + rnd() * 0.4, base, z));
    for (let f = 0; f < Math.floor(h / 0.8); f += 1) g.add(box(0.2, 0.26, 0.05, rnd() > 0.4 ? C.sun : C.slate, x + rnd() * 0.4, base + 0.8 + f * 0.8, z - 0.63));
  }
  return g;
}

export function buildCity(ps: PropSet, at: [number, number, number]): Prop {
  return ps.add((b) => b.surface(cityGroup(b.rnd), { density: 26, size: 0.075, jitter: 0.04 }), { at, seed: 72, glow: 0.1 });
}

function farHill(b: Builder, x: number, z: number, rx: number, ry: number, color: number) {
  for (let i = 0; i < 300; i += 1) {
    const t = b.rnd() * Math.PI, d = Math.sqrt(b.rnd());
    b.add({ p: [x + Math.cos(t) * rx * d, WATER_Y + Math.sin(t) * ry * d, z], s: [0.4, 0.3, 0.3], color, opacity: 1 });
  }
}

/** Harbour water, far hills and a few boats. */
export function buildSea(ps: PropSet, at: [number, number, number]): Prop {
  return ps.add((b) => {
    for (let i = 0; i < 7000; i += 1) {
      const sz = 0.35 + b.rnd() * 0.3, hi = b.rnd() > 0.88;
      b.add({ p: [(b.rnd() * 2 - 1) * 42, WATER_Y, 17 + b.rnd() * (HILL_Z_FAR - 17)], s: [sz * 1.6, 0.03, sz], color: hi ? C.pale : b.rnd() > 0.5 ? C.teal : 0x2a9fc0, opacity: 0.9, sway: 0.07 });
    }
    for (let i = 0; i < 7; i += 1) farHill(b, -42 + i * 14 + b.rnd() * 4, HILL_Z_FAR + 2, 5 + b.rnd() * 4, 0.9 + b.rnd() * 1.1, i % 2 ? 0x9fdff0 : 0x8c7ad8);
    for (const [x, z] of [[-6, 24], [8, 28], [-14, 31]]) { b.blob(x, WATER_Y + 0.35, z, 1, 0.3, 0.4, 40, C.white, 0.2); b.blob(x, WATER_Y + 1.1, z, 0.06, 0.8, 0.06, 20, C.ink, 0.06); }
  }, { at, seed: 73 });
}

/** The 65-year-old and whoever the life brought, standing at the railing. */
export function buildPeople(ps: PropSet, at: [number, number, number], bonds: number, flags: { partner: boolean; kids: number }): Prop {
  const who = companions(bonds, flags.partner, flags.kids);
  return ps.add((b) => {
    person(b, 0, 0, 2.6, { shirt: C.teal, hair: 0xe8dcc0, cane: true });
    if (who.partner) person(b, 1.0, 0, 2.7, { shirt: C.rose, hair: C.sand });
    for (let k = 0; k < who.kids; k += 1) person(b, -1.0 - k * 0.7, 0, 2.9, { shirt: SHIRTS[k + 2], scale: 0.62 });
    for (let f = 0; f < who.friends; f += 1) person(b, 2.3 + f * 1.1, 0, 2.3 + (f % 2) * 0.4, { shirt: SHIRTS[f + 3], hair: f % 2 ? C.ink : C.bark });
  }, { at, seed: 74 });
}
