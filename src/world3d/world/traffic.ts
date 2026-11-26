import * as THREE from 'three';
import { createGaussianBuilder, type GaussianMesh } from '../gaussian';
import type { Ctx } from './ctx';
import { box, panel } from './kit';
import { applyTone, type LivingHandle } from './livingNpc';

interface VehicleEntry {
  holder: THREE.Group;
  solid: GaussianMesh;
  glow: GaussianMesh;
}

function applyLightTone(ctx: Ctx, mesh: GaussianMesh): void {
  mesh.uniforms.uGlow.value = 0.22 + 0.2 * ctx.wealth + ctx.tone.glow;
  mesh.uniforms.uSat.value = 1.1;
}

function buildTaxi(ctx: Ctx, seed: number): VehicleEntry {
  const b = createGaussianBuilder(seed);
  const g = createGaussianBuilder(seed + 100);

  // Red lower body + cabin with silver-grey roof
  box(b, 0, 0, 2.2, 0.86, 0.22, 0.48, 0xd9553f, { density: 70 });
  box(b, -0.05, 0, 1.15, 0.78, 0.7, 0.42, 0xd9553f, { density: 75, top: 0xc9d3e6 });

  // Window overlays offset >= 0.04 from cabin walls (half-d = 0.39, half-w = 0.575)
  for (const side of [-1, 1]) {
    panel(b, 'z', [-0.05, 0.91, side * 0.43], 0.96, 0.28, 0xcdeeff, { density: 75 });
  }
  panel(b, 'x', [0.565, 0.91, 0], 0.64, 0.28, 0xcdeeff, { density: 75 });
  panel(b, 'x', [-0.665, 0.91, 0], 0.64, 0.28, 0xcdeeff, { density: 75 });

  // Wheels
  for (const dx of [-0.72, 0.72]) {
    for (const dz of [-0.44, 0.44]) {
      b.blob(dx, 0.2, dz, 0.2, 0.2, 0.07, 12, 0x2b3a55, 0.06);
    }
  }

  // Glowing taxi roof sign + headlights + taillights
  box(g, 0.05, 0, 0.34, 0.16, 1.16, 0.16, 0xffd85a, { density: 90 });
  for (const dz of [-0.26, 0.26]) {
    g.blob(1.14, 0.46, dz, 0.055, 0.055, 0.08, 6, 0xfff0a0, 0.05);
    g.blob(-1.14, 0.46, dz, 0.045, 0.05, 0.07, 5, 0xd9553f, 0.05);
  }

  const solid = b.build();
  const glow = g.build();
  applyTone(ctx, solid);
  applyLightTone(ctx, glow);

  const holder = new THREE.Group();
  holder.add(solid.mesh, glow.mesh);
  return { holder, solid, glow };
}

function buildMinibus(ctx: Ctx, seed: number): VehicleEntry {
  const b = createGaussianBuilder(seed);
  const g = createGaussianBuilder(seed + 100);

  // Cream body + green roof
  box(b, 0, 0, 2.65, 0.96, 0.24, 1.06, 0xfff6dc, { density: 65, top: 0x3f9f5a });
  // Roof stripe & side stripes/windows offset >= 0.04 from box hull
  panel(b, 'y', [0, 1.34, 0], 2.4, 0.48, 0x3f9f5a, { density: 60, thick: 0.02 });
  for (const side of [-1, 1]) {
    panel(b, 'z', [0, 0.62, side * 0.52], 2.5, 0.16, 0x3f9f5a, { density: 65 });
    panel(b, 'z', [0.04, 0.98, side * 0.52], 2.1, 0.32, 0x8fd3ff, { density: 65 });
  }
  panel(b, 'x', [1.365, 0.95, 0], 0.8, 0.34, 0x8fd3ff, { density: 70 });

  for (const dx of [-0.85, 0.85]) {
    for (const dz of [-0.49, 0.49]) {
      b.blob(dx, 0.21, dz, 0.21, 0.21, 0.07, 12, 0x2b3a55, 0.06);
    }
  }

  // Red front destination sign + headlights
  panel(g, 'x', [1.37, 1.21, 0], 0.54, 0.14, 0xd9553f, { density: 85 });
  for (const dz of [-0.3, 0.3]) {
    g.blob(1.37, 0.44, dz, 0.055, 0.055, 0.08, 6, 0xfff0a0, 0.05);
  }

  const solid = b.build();
  const glow = g.build();
  applyTone(ctx, solid);
  applyLightTone(ctx, glow);

  const holder = new THREE.Group();
  holder.add(solid.mesh, glow.mesh);
  return { holder, solid, glow };
}

function buildStarFerry(ctx: Ctx, seed: number): VehicleEntry {
  const b = createGaussianBuilder(seed);
  const g = createGaussianBuilder(seed + 100);

  // Double-decker emerald & cream Star Ferry
  box(b, 0, 0, 3.8, 1.16, -0.1, 0.44, 0x2a6f4a, { density: 50, top: 0xfff6dc });
  box(b, 0, 0, 2.95, 0.94, 0.34, 0.48, 0xfff6dc, { density: 55, top: 0x3f9f5a });
  box(b, 0, 0, 2.45, 0.82, 0.82, 0.44, 0xfff6dc, { density: 55, top: 0x2a6f4a });
  box(b, -0.15, 0, 0.36, 0.3, 1.26, 0.34, 0x2a6f4a, { density: 65, top: 0xffd85a });
  // Cream wake foam at stern
  b.blob(-2.05, -0.05, 0, 0.28, 0.08, 0.38, 12, 0xfff6dc, 0.08, { opacity: 0.7 });

  // Glowing porthole strips offset >= 0.04 from cabin hulls
  for (const side of [-1, 1]) {
    for (let i = -3; i <= 3; i += 1) {
      panel(g, 'z', [i * 0.36, 0.58, side * 0.51], 0.16, 0.14, 0xffd85a, { density: 90 });
    }
    for (let i = -2; i <= 2; i += 1) {
      panel(g, 'z', [i * 0.42, 1.04, side * 0.45], 0.18, 0.14, 0xfff0a0, { density: 90 });
    }
  }

  const solid = b.build();
  const glow = g.build();
  applyTone(ctx, solid);
  applyLightTone(ctx, glow);

  const holder = new THREE.Group();
  holder.add(solid.mesh, glow.mesh);
  return { holder, solid, glow };
}

/** Builds animated HK taxis, minibus, and Victoria Harbour Star Ferry. */
export function buildTraffic(ctx: Ctx): LivingHandle {
  const group = new THREE.Group();
  group.name = 'traffic';

  if (ctx.scope === 'room' || ctx.scope === 'home') {
    return { group, meshes: [], update() {}, dispose() {} };
  }

  const meshes: GaussianMesh[] = [];
  const register = (v: VehicleEntry) => {
    group.add(v.holder);
    meshes.push(v.solid, v.glow);
    return v;
  };

  const eastTaxi = register(buildTaxi(ctx, 1101));
  const westTaxi = register(buildTaxi(ctx, 1201));
  westTaxi.holder.rotation.y = Math.PI;
  const minibus = register(buildMinibus(ctx, 1301));
  const ferry = ctx.ext.z1 > 9 ? register(buildStarFerry(ctx, 1401)) : null;

  const hasParkedCar = Boolean(ctx.d.car);

  return {
    group,
    meshes,
    update(t) {
      const roadLoop = 40; // -20..20
      const eastX = ((t * 2.9 + 6) % roadLoop) - 20;
      eastTaxi.holder.position.set(eastX, 0, -3.4);
      eastTaxi.holder.visible = Math.abs(eastX) <= 14.5;

      const busX = ((t * 2.9 + 26) % roadLoop) - 20;
      minibus.holder.position.set(busX, 0, -3.4);
      minibus.holder.visible = Math.abs(busX) <= 14.5;

      const westX = 20 - ((t * 3.3 + 11) % roadLoop);
      let westZ = -5.75;
      if (hasParkedCar) {
        const dxCar = Math.abs(westX - -6.2);
        if (dxCar < 2.5) {
          westZ += 0.24 * Math.cos((dxCar / 2.5) * (Math.PI / 2));
        }
      }
      westTaxi.holder.position.set(westX, 0, westZ);
      westTaxi.holder.visible = Math.abs(westX) <= 14.5;

      if (ferry) {
        const fx = ((t * 1.35 + 14) % 36) - 18;
        // Steer cleanly past the pier head (x=6.5..9.5, z<=14.8) while cruising along z = 13.8
        const dxPier = Math.abs(fx - 8);
        const pierClear = dxPier < 4.5 ? 2.0 * (0.5 + 0.5 * Math.cos((dxPier / 4.5) * Math.PI)) : 0;
        const fz = 13.8 + pierClear;
        const fy = Math.sin(t * 1.6) * 0.06;
        ferry.holder.position.set(fx, fy, fz);
        ferry.holder.visible = Math.abs(fx) <= 16.5;
      }
    },
    dispose() {
      meshes.forEach((m) => m.dispose());
    },
  };
}
