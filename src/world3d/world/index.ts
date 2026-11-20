import * as THREE from 'three';
import type { BuildWorld } from '../contracts';
import type { GaussianMesh } from '../gaussian';
import { createCtx, type Ctx } from './ctx';
import { BOUNDS, SPOTS } from './layout';
import { buildEstate } from './estate';
import { buildTerrain } from './terrain';
import { buildTowers } from './towers';
import { buildShops } from './shops';
import { buildPark } from './nature';
import { buildPeople } from './people';
import { buildTram } from './tram';
import { buildWeather, RAIN_PERIOD } from './weather';

// A Hong Kong neighbourhood diorama made of splats. Every visible fact comes from the WorldDescriptor.

function applyLook(ctx: Ctx, m: GaussianMesh, kind: 'world' | 'light' | 'sky'): void {
  const u = m.uniforms, t = ctx.tone;
  if (kind === 'light') { u.uGlow.value = 0.22 + 0.2 * ctx.wealth + t.glow; u.uSat.value = 1.1; return; }
  const [r, g, b] = kind === 'sky' ? [1, 1, 1] : t.tint;
  u.uTint.value.setRGB(r, g, b);
  u.uSat.value = kind === 'sky' ? Math.min(1, t.sat) : t.sat;
}

export const buildWorld: BuildWorld = (d, seed) => {
  const ctx = createCtx(d, seed);
  buildTerrain(ctx); buildEstate(ctx); buildTowers(ctx); buildShops(ctx); buildPark(ctx); buildPeople(ctx); buildTram(ctx); buildWeather(ctx);
  ctx.spots.push(...SPOTS);
  const L = ctx.L;
  const layers: [GaussianMesh, 'world' | 'light' | 'sky'][] = [
    [L.solid.build(), 'world'], [L.glow.build(), 'light'], [L.water.build(), 'world'], [L.tram.build(), 'world'],
    [L.boats.build(), 'world'], [L.crowd.build(), 'world'], [L.sky.build(), 'sky'],
  ];
  if (L.rain.count() > 0) layers.push([L.rain.build(), 'sky']);
  layers.forEach(([m, kind]) => applyLook(ctx, m, kind));
  const [solid, glow, , tram, boats, , , rain] = layers.map(([m]) => m);
  const group = new THREE.Group();
  group.name = 'world';
  layers.forEach(([m]) => group.add(m.mesh));
  const baseGlow = glow.uniforms.uGlow.value;
  return {
    group, meshes: layers.map(([m]) => m), spots: ctx.spots, colliders: ctx.colliders, bounds: BOUNDS, sky: ctx.tone.sky,
    update(t) {
      const tx = ((t * 1.7 + 20) % 44) - 22;
      tram.mesh.position.x = tx;
      tram.uniforms.uOpacity.value = Math.max(0, Math.min(1, (15.5 - Math.abs(tx)) / 3)); // fades in and out beyond the street's ends
      boats.mesh.position.set(Math.sin(t * 0.2) * 0.7, Math.sin(t * 1.3) * 0.05, 0);
      glow.uniforms.uGlow.value = baseGlow + Math.sin(t * 2.2) * 0.04;
      if (rain) rain.mesh.position.y = -((t * 11) % RAIN_PERIOD);
      if (d.regime === 'crash') solid.uniforms.uGlow.value = Math.max(0, 0.9 - ((t * 1.0) % 9) * 6) * 0.35;
    },
    dispose() { layers.forEach(([m]) => m.dispose()); },
  };
};
