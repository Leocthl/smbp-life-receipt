import * as THREE from 'three';
import { createGaussianBuilder, type GaussianMesh } from '../gaussian';
import { vbox } from '../voxel';
import type { Ctx } from './ctx';
import { figure, HAIR, PANTS, STYLES, TOPS, type FigureLook } from './figure';

export interface LivingHandle {
  group: THREE.Group;
  meshes: GaussianMesh[];
  update(t: number, dt: number, heroPos?: { x: number; z: number }): void;
  dispose(): void;
}

/** Matches world/index.ts 'world' layer tone setup (uTint + uSat). */
export function applyTone(ctx: Ctx, mesh: GaussianMesh): void {
  const [r, g, b] = ctx.tone.tint;
  mesh.uniforms.uTint.value.setRGB(r, g, b);
  mesh.uniforms.uSat.value = ctx.tone.sat;
}

const FAR_SCALE: Record<string, number> = { city: 1.45, district: 1.25 };
const LOUD = [0xd9553f, 0x3d7fc4, 0xffd85a, 0xff9ec4, 0x4cc3d9, 0x7ed07a];

function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/** C1-continuous rounded triangle wave in [0, 1] for smooth deceleration/acceleration at turnarounds. */
function easeTurn(u: number): number {
  const m = 0.06;
  if (u < m) return (u * u) / (2 * m * (1 - m));
  if (u > 1 - m) {
    const d = 1 - u;
    return 1 - (d * d) / (2 * m * (1 - m));
  }
  return (u - m * 0.5) / (1 - m);
}

interface Walker {
  mesh: GaussianMesh;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  len: number;
  speed: number;
  phase: number;
  yaw: number;
  avoidPier?: boolean;
}

interface ReactiveLocal {
  mesh: GaussianMesh;
  x: number;
  z: number;
  baseYaw: number;
  yaw: number;
  phase: number;
}

interface Pigeon {
  mesh: GaussianMesh;
  x: number;
  z: number;
  phase: number;
  baseYaw: number;
}

interface Seagull {
  mesh: GaussianMesh;
  cx: number;
  cy: number;
  cz: number;
  rx: number;
  rz: number;
  speed: number;
  phase: number;
}

function buildPigeon(ctx: Ctx, seed: number, farScale: number): GaussianMesh {
  const b = createGaussianBuilder(seed);
  const s = farScale > 1 ? 1.25 : 1;
  vbox(b, 0, 0.13 * s, 0, 0.16 * s, 0.12 * s, 0.24 * s, 0x6b789c);
  vbox(b, 0, 0.17 * s, -0.02 * s, 0.18 * s, 0.08 * s, 0.16 * s, 0xc9d3e6);
  vbox(b, 0, 0.23 * s, 0.1 * s, 0.11 * s, 0.1 * s, 0.11 * s, 0x2b3a55);
  vbox(b, 0, 0.22 * s, 0.17 * s, 0.04 * s, 0.03 * s, 0.05 * s, 0xf2a93a);
  const m = b.build();
  applyTone(ctx, m);
  return m;
}

function buildSeagull(ctx: Ctx, seed: number, farScale: number): GaussianMesh {
  const b = createGaussianBuilder(seed);
  const s = farScale > 1 ? 1.2 : 1;
  vbox(b, 0, 0, 0, 0.16 * s, 0.13 * s, 0.34 * s, 0xffffff);
  vbox(b, 0, 0.05 * s, 0.19 * s, 0.11 * s, 0.11 * s, 0.13 * s, 0xffffff);
  vbox(b, 0, 0.03 * s, 0.28 * s, 0.05 * s, 0.035 * s, 0.08 * s, 0xffd85a);
  vbox(b, -0.25 * s, 0.03 * s, 0.02 * s, 0.36 * s, 0.04 * s, 0.13 * s, 0xe9eefa);
  vbox(b, 0.25 * s, 0.03 * s, 0.02 * s, 0.36 * s, 0.04 * s, 0.13 * s, 0xe9eefa);
  vbox(b, -0.45 * s, 0.02 * s, -0.02 * s, 0.11 * s, 0.035 * s, 0.1 * s, 0x9aa8c4);
  vbox(b, 0.45 * s, 0.02 * s, -0.02 * s, 0.11 * s, 0.035 * s, 0.1 * s, 0x9aa8c4);
  const m = b.build();
  applyTone(ctx, m);
  return m;
}

function makeNpcMesh(ctx: Ctx, seed: number, farScale: number, look: Partial<FigureLook>): GaussianMesh {
  const b = createGaussianBuilder(seed);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(b.rnd() * arr.length)];
  const top = look.top ?? (farScale > 1 ? pick(LOUD) : pick(TOPS));
  const pants = look.pants ?? (farScale > 1 ? 0x2b3a55 : pick(PANTS));
  const hair = look.hair ?? pick(HAIR);
  const hairStyle = look.hairStyle ?? pick(STYLES);
  figure(b, 0, 0, {
    ...look,
    top,
    pants,
    hair,
    hairStyle,
    scale: (look.scale ?? 1) * farScale,
  });
  const m = b.build();
  applyTone(ctx, m);
  m.mesh.rotation.order = 'YXZ';
  return m;
}

/** Builds walking pedestrians, reactive standing locals, and animated pixel birds. */
export function buildLivingNpcs(ctx: Ctx): LivingHandle {
  const group = new THREE.Group();
  group.name = 'living-npcs';

  if (ctx.scope === 'room' || ctx.scope === 'home') {
    return { group, meshes: [], update() {}, dispose() {} };
  }

  const farScale = FAR_SCALE[ctx.scope] ?? 1;
  const meshes: GaussianMesh[] = [];
  const walkers: Walker[] = [];
  const locals: ReactiveLocal[] = [];
  const pigeons: Pigeon[] = [];
  const seagulls: Seagull[] = [];
  let seedCounter = 700;

  const addWalker = (x0: number, z0: number, x1: number, z1: number, speed: number, phase: number, look: Partial<FigureLook>, avoidPier = false) => {
    const m = makeNpcMesh(ctx, seedCounter += 17, farScale, look);
    const len = Math.max(0.1, Math.hypot(x1 - x0, z1 - z0));
    const tri = ((phase / len) % 2 + 2) % 2;
    const forward = tri < 1;
    const yaw = Math.atan2(forward ? x1 - x0 : x0 - x1, forward ? z1 - z0 : z0 - z1);
    m.mesh.position.set(x0, 0, z0);
    m.mesh.rotation.y = yaw;
    group.add(m.mesh);
    meshes.push(m);
    walkers.push({ mesh: m, x0, z0, x1, z1, len, speed, phase, yaw, avoidPier });
  };

  // North shop sidewalk (z = -7.35, x patrolling -11.5..11.5)
  addWalker(-11.5, -7.35, 1.5, -7.35, 1.15, 0.3, { pack: 0xd9553f, top: 0xffd85a });
  addWalker(-6.0, -7.25, 7.5, -7.25, 1.0, 4.1, { tie: 0xd9553f, top: 0xfff6dc, pants: 0x2b3a55 });
  addWalker(0.5, -7.4, 11.5, -7.4, 1.22, 2.7, { top: 0x4cc3d9 });
  addWalker(-11.5, -7.35, 11.5, -7.35, 1.08, 12.4, { top: 0xff9ec4, hairStyle: 'tail' });

  // South pavement (z = -1.85, x patrolling -11..11)
  addWalker(-11.0, -1.85, 2.0, -1.85, 1.04, 1.5, { top: 0x3d7fc4, pack: 0x7ed07a });
  addWalker(-3.0, -1.85, 11.0, -1.85, 1.18, 6.2, { top: 0xf2a93a });
  addWalker(-11.0, -1.85, 11.0, -1.85, 0.96, 15.0, { top: 0x7ed07a, hairStyle: 'bun' });
  if (ctx.ext.z1 <= 9) {
    addWalker(-8.5, -1.92, 8.5, -1.92, 1.1, 8.8, { top: 0xb9a7ff });
  }

  // Park path (x = -2.5, z patrolling -0.6..Math.min(7.4, ctx.ext.z1 - 1.2))
  const parkZ1 = Math.min(7.4, ctx.ext.z1 - 1.2);
  addWalker(-2.55, -0.6, -2.55, parkZ1, 0.88, 0.7, { top: 0xff8a6b, hairStyle: 'bob' });
  addWalker(-2.42, -0.6, -2.42, parkZ1, 0.94, 4.8, { top: 0x8fd3ff, hat: 0xffd85a });

  // Harbour promenade when harbour exists
  if (ctx.ext.z1 > 9) {
    addWalker(-12.0, 8.9, 6.1, 8.9, 1.0, 1.9, { top: 0x4cc3d9, hairStyle: 'tail' });
    addWalker(-12.0, 8.9, 12.0, 8.9, 0.92, 9.5, { top: 0xffd85a, pack: 0x3d7fc4 }, true);
  }

  // 4 reactive standing locals near key spots
  const addLocal = (x: number, z: number, baseYaw: number, phase: number, look: Partial<FigureLook>) => {
    const m = makeNpcMesh(ctx, seedCounter += 19, farScale, look);
    m.mesh.position.set(x, 0, z);
    m.mesh.rotation.y = baseYaw;
    group.add(m.mesh);
    meshes.push(m);
    locals.push({ mesh: m, x, z, baseYaw, yaw: baseYaw, phase });
  };

  addLocal(-0.4, -7.2, 0.25, 0.4, { top: 0xd9553f, hairStyle: 'bob' });
  addLocal(6.5, 1.0, 0.0, 1.7, { top: 0xf2a93a, hat: 0xfff6dc });
  addLocal(8.8, -7.2, -0.35, 3.1, { top: 0xfff6dc, pants: 0x2b3a55, tie: 0x3d7fc4 });
  if (4.1 < ctx.ext.z1) {
    addLocal(-3.3, 4.1, 0.55, 4.6, { top: 0xb9a7ff, hairStyle: 'tail' });
  }

  // 3 park pigeons
  const pigeonSpots: [number, number, number][] = [
    [-3.2, 2.0, 0.3],
    [-1.8, 4.2, 1.4],
    [-2.9, 5.8, 2.5],
  ];
  for (const [px, pz, pPhase] of pigeonSpots) {
    if (pz >= ctx.ext.z1 - 0.15) continue;
    const m = buildPigeon(ctx, seedCounter += 23, farScale);
    const baseYaw = (pPhase * 1.9) % (Math.PI * 2);
    m.mesh.position.set(px, 0, pz);
    m.mesh.rotation.y = baseYaw;
    group.add(m.mesh);
    meshes.push(m);
    pigeons.push({ mesh: m, x: px, z: pz, phase: pPhase, baseYaw });
  }

  // 2 white seagulls circling smoothly over the harbour
  if (ctx.ext.z1 > 9) {
    const gullConfigs = [
      { cx: -3.2, cy: 4.5, cz: 14.0, rx: 4.6, rz: 1.5, speed: 0.45, phase: 0.2 },
      { cx: 3.4, cy: 4.8, cz: 15.1, rx: 4.2, rz: 1.4, speed: -0.4, phase: 2.6 },
    ];
    for (const cfg of gullConfigs) {
      const m = buildSeagull(ctx, seedCounter += 29, farScale);
      group.add(m.mesh);
      meshes.push(m);
      seagulls.push({ mesh: m, ...cfg });
    }
  }

  return {
    group,
    meshes,
    update(t, dt, heroPos) {
      for (const w of walkers) {
        const tri = (((t * w.speed + w.phase) / w.len) % 2 + 2) % 2;
        const forward = tri < 1;
        const s = easeTurn(forward ? tri : 2 - tri);
        const px = w.x0 + (w.x1 - w.x0) * s;
        let pz = w.z0 + (w.z1 - w.z0) * s;
        if (w.avoidPier) {
          const dPier = Math.abs(px - 8);
          if (dPier < 1.9) pz -= 0.35 * (1 - dPier / 1.9);
        }
        const targetYaw = Math.atan2(forward ? w.x1 - w.x0 : w.x0 - w.x1, forward ? w.z1 - w.z0 : w.z0 - w.z1);
        w.yaw += wrapAngle(targetYaw - w.yaw) * Math.min(1, dt * 8);
        const stride = t * w.speed * 4.5 + w.phase;
        w.mesh.mesh.position.set(px, Math.abs(Math.sin(stride)) * 0.11, pz);
        w.mesh.mesh.rotation.y = w.yaw;
        w.mesh.mesh.rotation.z = Math.sin(stride) * 0.06;
      }

      for (const l of locals) {
        let targetYaw = l.baseYaw;
        if (heroPos) {
          const dist = Math.hypot(heroPos.x - l.x, heroPos.z - l.z);
          if (dist < 4.5 && dist > 0.05) {
            targetYaw = Math.atan2(heroPos.x - l.x, heroPos.z - l.z);
          }
        }
        l.yaw += wrapAngle(targetYaw - l.yaw) * Math.min(1, dt * 6);
        l.mesh.mesh.position.y = Math.sin(t * 2.2 + l.phase) * 0.025;
        l.mesh.mesh.rotation.y = l.yaw;
      }

      for (const p of pigeons) {
        const cycle = (t * 1.3 + p.phase) % 3.4;
        const hop = cycle < 0.75 ? Math.abs(Math.sin((cycle / 0.75) * Math.PI * 2)) * 0.11 : 0;
        const peck = cycle > 1.6 && cycle < 2.2 ? Math.sin(((cycle - 1.6) / 0.6) * Math.PI) * 0.35 : 0;
        const turn = Math.sin(t * 0.45 + p.phase) * 0.45;
        p.mesh.mesh.position.set(p.x, hop, p.z);
        p.mesh.mesh.rotation.y = p.baseYaw + turn;
        p.mesh.mesh.rotation.x = peck;
      }

      for (const g of seagulls) {
        const ang = t * g.speed + g.phase;
        const gx = g.cx + Math.cos(ang) * g.rx;
        const gz = g.cz + Math.sin(ang) * g.rz;
        const dx = -Math.sin(ang) * g.rx * g.speed;
        const dz = Math.cos(ang) * g.rz * g.speed;
        const gy = g.cy + Math.sin(t * 1.3 + g.phase) * 0.24;
        g.mesh.mesh.position.set(gx, gy, gz);
        g.mesh.mesh.rotation.y = Math.atan2(dx, dz);
        g.mesh.mesh.rotation.z = g.speed > 0 ? 0.12 : -0.12;
      }
    },
    dispose() {
      meshes.forEach((m) => m.dispose());
    },
  };
}
