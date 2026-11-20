import * as THREE from 'three';
import type { BuildWorld, Framing, Spot } from '../contracts';
import type { Scope } from '../descriptor';
import type { GaussianMesh } from '../gaussian';
import { createCtx, type Ctx, type Layers } from './ctx';
import { BOUNDS, SPOTS } from './layout';
import { buildEstate } from './estate';
import { buildTerrain } from './terrain';
import { buildTowers } from './towers';
import { buildShops } from './shops';
import { buildPark } from './nature';
import { buildPeople } from './people';
import { buildTram } from './tram';
import { buildWeather, RAIN_PERIOD } from './weather';
import { bedroom, floorAndWalls, roomColliders, roomMood, windowAt, ROOM } from './room';
import { FLAT_X1, flatPeople, flatWalls, livingRoom } from './flat';
import { buildMementos } from './mementos';

// A growing diorama: the bedroom, then the family flat, then the block, the district and the whole harbour.
// Every visible fact comes from the WorldDescriptor; every decision leaves a keepsake.

const FRAMING: Record<Scope, Framing> = {
  room: { viewHeight: 8.5, target: [0, 1.2, 0], yaw: Math.PI / 4 },
  home: { viewHeight: 14.5, target: [3.6, 1.1, 0], yaw: Math.PI / 4 },
  block: { viewHeight: 23, target: [-1, 3, -7], yaw: Math.PI / 4 },
  district: { viewHeight: 32, target: [0, 3, -1], yaw: Math.PI / 4 },
  city: { viewHeight: 40, target: [0, 4, 0], yaw: Math.PI / 4 },
};

/** How the camera should frame a scope: close on the bedroom, wide on the harbour. */
export const framingFor = (scope: Scope): Framing => ({ ...FRAMING[scope], target: [...FRAMING[scope].target] });

const indoor = (s: Scope) => s === 'room' || s === 'home';

function spotsFor(scope: Scope): Spot[] {
  if (scope === 'room') return [{ id: 'home', x: 1, z: 1.5, r: 3 }];
  if (scope === 'home') return [{ id: 'home', x: 5, z: 1, r: 4 }];
  return scope === 'block' ? SPOTS.filter((s) => s.id !== 'campus' && s.id !== 'pier') : SPOTS;
}

function buildIndoor(ctx: Ctx): void {
  const home = ctx.scope === 'home', x1 = home ? FLAT_X1 : ROOM.x1;
  floorAndWalls(ctx, x1);
  windowAt(ctx, 1);
  bedroom(ctx);
  roomColliders(ctx);
  if (home) { windowAt(ctx, 4.8); livingRoom(ctx); flatWalls(ctx, x1); }
  flatPeople(ctx, home);
  roomMood(ctx);
}

function buildOutdoor(ctx: Ctx): void {
  buildTerrain(ctx); buildEstate(ctx); buildTowers(ctx); buildShops(ctx); buildPark(ctx); buildPeople(ctx); buildTram(ctx); buildWeather(ctx);
}

type Kind = 'world' | 'light' | 'sky';
const LAYERS: [keyof Layers, Kind][] = [
  ['solid', 'world'], ['glow', 'light'], ['water', 'world'], ['tram', 'world'], ['boats', 'world'], ['crowd', 'world'], ['sky', 'sky'], ['rain', 'sky'],
  ['props', 'world'], ['propsGlow', 'light'], ['fresh', 'world'], ['freshGlow', 'light'],
];

function applyLook(ctx: Ctx, m: GaussianMesh, kind: Kind): void {
  const u = m.uniforms, t = ctx.tone;
  if (kind === 'light') { u.uGlow.value = 0.22 + 0.2 * ctx.wealth + t.glow; u.uSat.value = 1.1; return; }
  const [r, g, b] = kind === 'sky' ? [1, 1, 1] : t.tint;
  u.uTint.value.setRGB(r, g, b);
  u.uSat.value = kind === 'sky' ? Math.min(1, t.sat) : t.sat;
}

export const buildWorld: BuildWorld = (d, seed) => {
  const ctx = createCtx(d, seed);
  (indoor(ctx.scope) ? buildIndoor : buildOutdoor)(ctx);
  buildMementos(ctx, ctx.scope, { b: ctx.L.props, g: ctx.L.propsGlow }, { b: ctx.L.fresh, g: ctx.L.freshGlow });
  ctx.spots.push(...spotsFor(ctx.scope));
  const built = new Map<keyof Layers, GaussianMesh>();
  for (const [key, kind] of LAYERS) {
    if (ctx.L[key].count() === 0) continue;
    const m = ctx.L[key].build();
    applyLook(ctx, m, kind);
    built.set(key, m);
  }
  const meshes = [...built.values()];
  const group = new THREE.Group();
  group.name = 'world';
  meshes.forEach((m) => group.add(m.mesh));
  const { solid, glow, tram, boats, rain } = { solid: built.get('solid'), glow: built.get('glow'), tram: built.get('tram'), boats: built.get('boats'), rain: built.get('rain') };
  const fresh = [built.get('fresh'), built.get('freshGlow')].filter((m): m is GaussianMesh => m !== undefined);
  const baseGlow = glow?.uniforms.uGlow.value ?? 0;
  return {
    group, meshes, fresh, spots: ctx.spots, colliders: ctx.colliders, framing: framingFor(ctx.scope),
    bounds: ctx.scope === 'room' ? 2.7 : ctx.scope === 'home' ? 10 : BOUNDS, sky: ctx.tone.sky,
    update(t) {
      if (glow) glow.uniforms.uGlow.value = baseGlow + Math.sin(t * 2.2) * 0.04;
      if (d.regime === 'crash' && solid) solid.uniforms.uGlow.value = Math.max(0, 0.9 - ((t * 1.0) % 9) * 6) * 0.35;
      if (rain) rain.mesh.position.y = -((t * 11) % RAIN_PERIOD);
      if (tram) {
        const tx = ((t * 1.7 + 20) % 44) - 22;
        tram.mesh.position.x = tx;
        tram.mesh.visible = Math.abs(tx) < 14.5; // leaves the picture past the street's ends (a fade would blend overlapping panels)
      }
      if (boats) boats.mesh.position.set(Math.sin(t * 0.2) * 0.7, Math.sin(t * 1.3) * 0.05, 0);
    },
    dispose() { meshes.forEach((m) => m.dispose()); },
  };
};
