import * as THREE from 'three';
import { createGaussianBuilder, type GaussianMesh } from '../gaussian';
import type { Ctx } from './ctx';
import { box, line, panel } from './kit';
import { FRONT_Z } from './layout';
import { applyTone, type LivingHandle } from './livingNpc';

/** Builds HK neon signs, swaying market lanterns, street props, and animated cafe steam. */
export function buildStreetDetail(ctx: Ctx): LivingHandle {
  const group = new THREE.Group();
  group.name = 'street-detail';

  if (ctx.scope === 'room' || ctx.scope === 'home') {
    return { group, meshes: [], update() {}, dispose() {} };
  }

  const solidB = createGaussianBuilder(1501);
  const neonB = createGaussianBuilder(1601);
  const steamB = createGaussianBuilder(1701);

  // 1. Overhanging HK neon signs + iron brackets
  // Cafe overhanging sign (x = -2.9, y = 2.9, z = -9.1)
  for (const y of [2.45, 3.35]) {
    line(solidB, [-2.9, y, FRONT_Z], [-2.9, y, -8.85], 0x2b3a55, 0.035, 0.07);
  }
  panel(neonB, 'z', [-2.9, 2.9, -9.1], 0.56, 1.32, 0xd9553f, { density: 85 });
  panel(neonB, 'z', [-2.9, 2.9, -9.05], 0.24, 0.92, 0xffd85a, { density: 95 });
  panel(neonB, 'z', [-2.9, 3.66, -9.05], 0.86, 0.26, 0x4cc3d9, { density: 85 });

  // Bank edge overhanging blade (x = 2.4, y = 4.2, z = -9.2)
  for (const y of [3.65, 4.75]) {
    line(solidB, [2.4, y, FRONT_Z], [2.4, y, -8.95], 0x2b3a55, 0.035, 0.07);
  }
  panel(neonB, 'z', [2.4, 4.2, -9.2], 0.52, 1.55, 0x4cc3d9, { density: 85 });
  panel(neonB, 'z', [2.4, 4.2, -9.15], 0.22, 1.12, 0xffd85a, { density: 95 });

  // Estate podium overhanging sign (x = -6.2, y = 3.1, z = -9.1)
  for (const x of [-6.65, -5.75]) {
    line(solidB, [x, 3.1, FRONT_Z], [x, 3.1, -8.9], 0x2b3a55, 0.035, 0.07);
  }
  panel(neonB, 'z', [-6.2, 3.1, -9.1], 1.25, 0.44, 0xff9ec4, { density: 85 });
  panel(neonB, 'z', [-5.75, 2.65, -9.05], 0.34, 0.72, 0xfff0a0, { density: 90 });

  // 2. Swaying red/gold market lanterns above the wet market rows (y = 2.45, sway: 0.08)
  for (const z of [0.65, 3.05]) {
    line(solidB, [3.3, 2.66, z], [9.7, 2.66, z], 0x2b3a55, 0.025, 0.14);
    for (const x of [4.0, 5.25, 6.5, 7.75, 9.0]) {
      solidB.blob(x, 2.45, z, 0.14, 0.16, 0.14, 14, 0xd9553f, 0.06, { sway: 0.08 });
      solidB.blob(x, 2.6, z, 0.08, 0.04, 0.08, 6, 0xffd85a, 0.05, { sway: 0.08 });
      neonB.blob(x, 2.43, z, 0.08, 0.09, 0.08, 6, 0xfff0a0, 0.05, { sway: 0.08 });
    }
  }

  // 3. Authentic HK street props (leaving OUTDOOR_SPAWN {1.5, -1.6} and all SPOTS clear)
  // Green iron newsstand at (1.6, -7.2)
  box(solidB, 1.6, -7.2, 0.72, 0.46, 0, 0.86, 0x2a6f4a, { density: 70 });
  box(solidB, 1.6, -7.2, 0.84, 0.56, 0.86, 0.08, 0x3f9f5a, { density: 70 });
  for (const [dx, col] of [[-0.2, 0xd9553f], [0, 0xffd85a], [0.2, 0x8fd3ff]] as const) {
    panel(solidB, 'z', [1.6 + dx, 0.55, -6.93], 0.14, 0.24, col, { density: 90 });
  }
  ctx.colliders.push({ x: 1.6, z: -7.2, r: 0.45 });

  // Red HK postbox at (-5.1, -7.2)
  box(solidB, -5.1, -7.2, 0.34, 0.34, 0, 0.94, 0xd9553f, { density: 85, top: 0x2b3a55 });
  panel(solidB, 'z', [-5.1, 0.66, -6.99], 0.18, 0.1, 0xfff6dc, { density: 100 });
  panel(solidB, 'z', [-5.1, 0.66, -6.95], 0.12, 0.03, 0x2b3a55, { density: 100 });
  ctx.colliders.push({ x: -5.1, z: -7.2, r: 0.3 });

  // Minibus stop sign pole at (0.6, -2.4)
  line(solidB, [0.6, 0, -2.4], [0.6, 1.85, -2.4], 0x6b789c, 0.04, 0.07);
  box(solidB, 0.6, -2.4, 0.36, 0.06, 1.66, 0.36, 0xfff6dc, { density: 90 });
  panel(solidB, 'z', [0.6, 1.92, -2.33], 0.28, 0.1, 0xd9553f, { density: 95 });
  panel(solidB, 'z', [0.6, 1.76, -2.33], 0.28, 0.1, 0x3f9f5a, { density: 95 });
  ctx.colliders.push({ x: 0.6, z: -2.4, r: 0.25 });

  // Green HK rubbish bin at (-3.6, -2.2)
  box(solidB, -3.6, -2.2, 0.34, 0.34, 0, 0.64, 0x3f9f5a, { density: 85 });
  box(solidB, -3.6, -2.2, 0.36, 0.36, 0.64, 0.16, 0xf2a93a, { density: 90 });
  ctx.colliders.push({ x: -3.6, z: -2.2, r: 0.28 });

  // Dai pai dong folding stools outside the cafe at (-2.5, -8.6)
  for (const [sx, sz, col] of [[-2.5, -8.6, 0xd9553f], [-2.85, -8.72, 0x3d7fc4]] as const) {
    box(solidB, sx, sz, 0.28, 0.28, 0.34, 0.06, col, { density: 100 });
    for (const dx of [-0.1, 0.1]) {
      line(solidB, [sx + dx, 0, sz - 0.08], [sx - dx, 0.34, sz + 0.08], 0xc9d3e6, 0.02, 0.06);
    }
  }

  // 4. Animated steam puffs over cafe roof (-2.7, 3.6, -10.5)
  for (let k = 0; k < 6; k += 1) {
    steamB.blob(
      (k % 2 === 0 ? -0.14 : 0.14) * (k * 0.25),
      k * 0.26,
      (k % 3 - 1) * 0.12,
      0.18 + k * 0.02,
      0.16 + k * 0.02,
      0.18 + k * 0.02,
      7,
      0xfff6dc,
      0.12,
      { opacity: 0.34, sway: 0.18, fx: true },
    );
  }

  const solid = solidB.build();
  const neon = neonB.build();
  const steam = steamB.build();

  applyTone(ctx, solid);
  const baseNeonGlow = 0.26 + 0.22 * ctx.wealth + ctx.tone.glow;
  neon.uniforms.uGlow.value = baseNeonGlow;
  neon.uniforms.uSat.value = 1.15;
  applyTone(ctx, steam);
  steam.mesh.position.set(-2.7, 3.6, -10.5);

  const meshes: GaussianMesh[] = [solid, neon, steam];
  group.add(solid.mesh, neon.mesh, steam.mesh);

  return {
    group,
    meshes,
    update(t) {
      const flicker = ctx.d.regime === 'crash' && Math.sin(t * 17) > 0.85 ? -0.1 : 0;
      neon.uniforms.uGlow.value = baseNeonGlow + Math.sin(t * 2.8) * 0.08 + flicker;

      const cycle = ((t * 0.55) % 1.2) / 1.2;
      steam.mesh.position.y = 3.6 + cycle * 0.9;
      steam.uniforms.uOpacity.value = Math.sin(cycle * Math.PI) * 0.9;
    },
    dispose() {
      meshes.forEach((m) => m.dispose());
    },
  };
}
