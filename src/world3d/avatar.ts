import * as THREE from 'three';
import type { BuildAvatar } from './contracts';
import { createGaussianBuilder, type GaussianMesh } from './gaussian';
import { lookFor, type AvatarLook } from './avatarLook';

type B = ReturnType<typeof createGaussianBuilder>;

// A chunky splat person, about 1.6 tall, facing +z. Torso, head, two arms and two legs are separate meshes hung on
// pivot groups, so walking is just rotating groups.

const HIP_Y = 0.72, SHOULDER = { x: 0.33, y: 0.46 };

function leg(b: B, l: AvatarLook, side: number): void {
  b.blob(0, -0.3, 0, 0.12, 0.34, 0.12, 60, l.pants, 0.075);
  b.blob(0, -0.68, 0.07, 0.13, 0.07, 0.19, 26, l.shoes, 0.07);
  if (l.patches) b.blob(0.03 * side, -0.3, 0.1, 0.07, 0.07, 0.03, 10, 0xe0a050, 0.04, { jitter: 0.02 });
}

function arm(b: B, l: AvatarLook, side: number): void {
  b.blob(0, -0.2, 0, 0.09, 0.26, 0.09, 40, l.cardigan ? l.sleeve : l.blazer ?? l.top, 0.065);
  b.blob(0, -0.52, 0.02, 0.075, 0.08, 0.075, 20, l.skin, 0.055);
  if (l.gold) b.blob(0, -0.42, 0, 0.1, 0.03, 0.1, 8, 0xffd27a, 0.04, { jitter: 0.02 });
  if (l.patches && side > 0) b.blob(0.02, -0.15, 0.07, 0.05, 0.06, 0.03, 8, 0x6fb0d8, 0.035, { jitter: 0.02 });
}

function torso(b: B, l: AvatarLook): void {
  const shirt = l.blazer ?? l.top;
  b.blob(0, 0.05, 0, 0.27, 0.12, 0.2, 40, l.pants, 0.08);
  b.blob(0, 0.28, 0, 0.28, 0.3, 0.2, 150, shirt, 0.08);
  if (l.blazer) { b.blob(0, 0.3, 0.17, 0.09, 0.26, 0.04, 24, l.top, 0.05); }
  if (l.cardigan) b.blob(0, 0.3, 0.18, 0.04, 0.27, 0.03, 14, 0xf4f1e6, 0.045);
  if (l.hood) b.blob(0, 0.56, -0.12, 0.2, 0.08, 0.12, 24, l.top, 0.065);
  if (l.tie !== null) b.blob(0, 0.27, 0.2, 0.04, 0.2, 0.03, 18, l.tie, 0.04);
  if (l.gold) b.blob(0, 0.5, 0.17, 0.1, 0.03, 0.04, 10, 0xffd27a, 0.035, { jitter: 0.02 });
  if (l.backpack !== null) b.blob(0, 0.3, -0.3, 0.2, 0.26, 0.12, 70, l.backpack, 0.07);
  if (l.patches) { b.blob(-0.12, 0.2, 0.19, 0.08, 0.08, 0.03, 12, 0xe0a050, 0.04, { jitter: 0.02 }); b.blob(0.1, 0.4, 0.19, 0.06, 0.06, 0.03, 10, 0x6fb0d8, 0.035, { jitter: 0.02 }); }
}

function head(b: B, l: AvatarLook): void {
  const cy = 0.2;
  b.blob(0, cy, 0, 0.23, 0.24, 0.22, 120, l.skin, 0.07);
  const hairY = cy + 0.16;
  if (l.hairStyle === 'thin') { b.blob(0, hairY + 0.05, -0.05, 0.22, 0.12, 0.2, 40, l.hair, 0.055); b.blob(0, cy + 0.02, -0.15, 0.2, 0.18, 0.08, 30, l.hair, 0.055); }
  else { b.blob(0, hairY, -0.05, 0.25, 0.1, 0.22, 70, l.hair, 0.065); b.blob(0, cy + 0.04, -0.15, 0.23, 0.18, 0.08, 40, l.hair, 0.065); }
  if (l.hairStyle === 'bun') b.blob(0, hairY + 0.2, -0.1, 0.1, 0.1, 0.1, 24, l.hair, 0.06);
  const eyeY = cy + 0.02;
  for (const x of [-0.09, 0.09]) {
    b.add({ p: [x, eyeY, 0.2], s: [0.03, l.mood < -0.3 ? 0.02 : 0.04, 0.02], color: 0x14161f });
    if (l.eyeBags) b.add({ p: [x, eyeY - 0.06, 0.2], s: [0.045, 0.02, 0.02], color: 0x5b4a6a, opacity: 0.8 });
  }
  const smile = l.mood;
  for (let i = -2; i <= 2; i += 1) b.add({ p: [i * 0.03, cy - 0.1 + i * i * 0.006 * smile, 0.21], s: [0.02, 0.016, 0.015], color: 0xc0453f });
  if (l.shades) b.add({ p: [0, eyeY + 0.01, 0.215], s: [0.17, 0.045, 0.015], color: 0x14161f });
}

interface Part { mesh: GaussianMesh; pivot: THREE.Group }

export const buildAvatar: BuildAvatar = (d, seed) => {
  const l = lookFor(d, seed);
  const make = (draw: (b: B) => void, k: number): GaussianMesh => { const b = createGaussianBuilder(seed * 7 + k); draw(b); return b.build(); };
  const group = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = HIP_Y;
  body.rotation.x = l.slouch;
  group.add(body);
  const attach = (parent: THREE.Object3D, m: GaussianMesh, x: number, y: number): Part => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    pivot.add(m.mesh);
    parent.add(pivot);
    return { mesh: m, pivot };
  };
  const torsoPart = attach(body, make((b) => torso(b, l), 1), 0, 0);
  const headPart = attach(body, make((b) => head(b, l), 2), 0, 0.46);
  const armL = attach(body, make((b) => arm(b, l, -1), 3), -SHOULDER.x, SHOULDER.y);
  const armR = attach(body, make((b) => arm(b, l, 1), 4), SHOULDER.x, SHOULDER.y);
  const legL = attach(group, make((b) => leg(b, l, -1), 5), -0.12, HIP_Y);
  const legR = attach(group, make((b) => leg(b, l, 1), 6), 0.12, HIP_Y);
  const parts = [torsoPart, headPart, armL, armR, legL, legR];
  if (l.cane) {
    const cane = make((b) => { for (let y = 0; y < 0.9; y += 0.05) b.add({ p: [0, -y, 0], s: [0.025, 0.04, 0.025], color: 0x6b3f2a }); b.blob(0.03, 0.02, 0, 0.05, 0.03, 0.03, 8, 0x6b3f2a, 0.03); }, 7);
    attach(armR.pivot, cane, 0.02, -0.5);
    parts.push({ mesh: cane, pivot: group });
  }
  let walking = 0, target = 0, phase = 0;
  const lean = l.slouch;
  return {
    group, meshes: parts.map((p) => p.mesh), height: 1.75,
    setWalking(on) { target = on ? 1 : 0; },
    update(t, dt) {
      walking += (target - walking) * Math.min(1, dt * 10);
      phase += dt * (7 + 3 * l.vigor) * walking;
      const swing = Math.sin(phase) * 0.65 * walking * l.vigor;
      legL.pivot.rotation.x = swing; legR.pivot.rotation.x = -swing;
      armL.pivot.rotation.x = -swing * 0.9; armR.pivot.rotation.x = swing * 0.9;
      const idle = Math.sin(t * 2) * 0.012;
      body.position.y = HIP_Y + Math.abs(Math.sin(phase)) * 0.05 * walking + idle;
      body.rotation.x = lean + walking * 0.06;
      body.rotation.z = Math.sin(phase) * 0.04 * walking;
      headPart.pivot.rotation.x = -lean * 0.5 + Math.sin(t * 1.3) * 0.015;
    },
    dispose() { parts.forEach((p) => p.mesh.dispose()); },
  };
};
