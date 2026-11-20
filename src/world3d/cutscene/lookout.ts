import * as THREE from 'three';
import { C } from './fx';
import { person, SHIRTS } from './figures';
import { companions } from './logic';
import type { Builder, Prop, PropSet } from './props';
import { box as kbox, panel } from '../world/kit';

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

/** Terrace, slope, bench, railing and trees. Flat parts are kit panels (crisp edges); the tilted slope is a mesh. */
function landGroup(): THREE.Group {
  const g = new THREE.Group();
  const run = 12.5, drop = 8, len = Math.hypot(run, drop);
  g.add(flat(46, len, C.leaf, 0, -drop / 2, 5.5 + run / 2, Math.atan2(drop, run)));
  g.add(flat(46, 6, C.sand, 0, WATER_Y + 0.1, 18 + 3, 0));
  return g;
}

function benchParts(b: Builder, x: number, z: number): void {
  kbox(b, x, z, 2.2, 0.7, 0.44, 0.12, C.wood, { density: 30 });
  kbox(b, x, z - 0.32, 2.2, 0.1, 0.5, 0.6, C.tan, { density: 30 });
  kbox(b, x - 0.95, z, 0.12, 0.6, 0, 0.44, C.bark, { density: 40 });
  kbox(b, x + 0.95, z, 0.12, 0.6, 0, 0.44, C.bark, { density: 40 });
}

export function tree(b: Builder, x: number, z: number, h: number) {
  b.blob(x, h * 0.4, z, 0.16, h * 0.4, 0.16, 36, C.bark, 0.1);
  b.blob(x, h * 0.95, z, 1.5, 1.2, 1.5, 240, (_x, y) => (y > 0.1 ? C.green : C.leaf), 0.3, { sway: 0.04 });
}

export function buildLand(ps: PropSet, at: [number, number, number]): Prop {
  return ps.add((b) => {
    panel(b, 'y', [0, 0, -0.5], 46, 12, C.green, { density: 5, thick: 0.03 });
    panel(b, 'y', [0, 0.02, -2.5], 2.4, 8, C.sand, { density: 10, thick: 0.03 });
    panel(b, 'y', [0, -0.01, -19.5], 46, 26, C.green, { density: 3, thick: 0.03 });
    b.surface(landGroup(), { density: 8, size: 0.2 });
    for (let x = -8; x <= 8; x += 1.6) kbox(b, x, 4.7, 0.14, 0.14, 0, 1.05, C.bark, { density: 40 });
    kbox(b, 0, 4.7, 17, 0.16, 1.0, 0.1, C.wood, { density: 20 });
    kbox(b, 0, 4.7, 17, 0.12, 0.55, 0.08, C.wood, { density: 20 });
    benchParts(b, -3.4, 1.6);
    tree(b, -7.2, -1.5, 3.4);
    tree(b, 7.4, -0.5, 3);
    for (let i = 0; i < 40; i += 1) b.add({ p: [(b.rnd() * 2 - 1) * 9, 0.06, -5 + b.rnd() * 9], s: [0.07, 0.07, 0.07], color: [C.sun, C.rose, C.white][i % 3], opacity: 1, fx: true });
  }, { at, seed: 71 });
}

/** Rows of flat-roofed blocks with window grids, laid out so nothing overlaps. */
export function buildCity(ps: PropSet, at: [number, number, number]): Prop {
  return ps.add((b) => {
    const walls = [C.pale, C.sand, C.rose, 0x9fdff0, C.cream, 0xe8dcc0];
    for (let row = 0; row < 4; row += 1) {
      let x = -26 + (row % 2) * 1.2;
      while (x < 26) {
        const w = 1.5 + b.rnd() * 0.7, h = 2 + row * 1.2 + b.rnd() * 3.2, z = 10.5 + row * 3.4;
        const base = -8.4 * Math.min(1, (z - 5.5) / 12.5) - 0.6, wall = walls[Math.floor(b.rnd() * walls.length)];
        kbox(b, x + w / 2, z, w, 1.3, base, h + 0.6, wall, { density: 14 });
        const cols = Math.max(1, Math.round(w * 3.333)), rows = Math.max(1, Math.round(h * 3.333));
        panel(b, 'z', [x + w / 2, base + 0.6 + h / 2, z - 0.66], w, h, (u, v) => {
          const i = Math.floor(u * cols), j = Math.floor(v * rows);
          return i % 2 === 1 && j % 2 === 0 ? (((i * 7 + j * 3) % 5) < 2 ? C.slate : C.sun) : wall;
        }, { density: 11.11, thick: 0.02 });
        x += w + 0.25;
      }
    }
  }, { at, seed: 72, glow: 0.1 });
}

/** Harbour water, far hills and a few boats. */
export function buildSea(ps: PropSet, at: [number, number, number]): Prop {
  return ps.add((b) => {
    const row = (u: number, v: number) => { const j = Math.floor(v * 40), k = (u * 120 + j * 3.1) % 8; return k < 2 ? C.teal : 0x2a9fc0; };
    panel(b, 'y', [0, WATER_Y, (17 + HILL_Z_FAR) / 2], 84, HILL_Z_FAR - 17, row, { density: 1.2, thick: 0.03 });
    for (let i = 0; i < 60; i += 1) panel(b, 'y', [(b.rnd() * 2 - 1) * 40, WATER_Y + 0.03, 18 + b.rnd() * 17], 0.9, 0.14, C.white, { density: 30, thick: 0.01 });
    for (let i = 0; i < 7; i += 1) b.blob(-42 + i * 14 + b.rnd() * 4, WATER_Y, HILL_Z_FAR + 2, 5 + b.rnd() * 4, 0.9 + b.rnd() * 1.1, 2, 140, i % 2 ? 0x9fdff0 : 0x8c7ad8, 0.6);
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
