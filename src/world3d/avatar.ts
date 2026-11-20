import * as THREE from 'three';
import type { BuildAvatar } from './contracts';
import { createGaussianBuilder, type GaussianMesh } from './gaussian';
import { lookFor, type AvatarLook } from './avatarLook';
import { armPart, dot, headPart, HERO_HEIGHT, legPart, lump, torsoPart, type Outfit } from './chibi';
import { INK } from './materials';

type B = ReturnType<typeof createGaussianBuilder>;

// The hero: a chunky splat person, 2.8 tall with a head a third of that, facing +z. Torso, head, two arms and two legs
// are separate meshes hung on pivot groups, so walking is just rotating groups. A coral ring marks who the player is.

const HIP_Y = 0.95, SHOULDER = { x: 0.62, y: 0.68 }, NECK_Y = 0.86, SP = 0.13, S = 1;

const outfit = (l: AvatarLook): Outfit => ({ top: l.blazer ?? l.top, pants: l.pants, shoes: l.shoes, hair: l.hair, skin: l.skin });

function torsoDraw(b: B, l: AvatarLook): void {
  const o = outfit(l);
  torsoPart(b, S, o, SP);
  if (l.blazer) lump(b, 0, 0.44, 0.3, 0.12, 0.34, 0.06, l.top, SP * 0.6);
  if (l.cardigan) lump(b, 0, 0.44, 0.31, 0.06, 0.36, 0.05, 0xfff6dc, SP * 0.5);
  if (l.tie !== null) dot(b, 0, 0.4, 0.35, 0.03, 0.1, l.tie);
  if (l.gold) lump(b, 0, 0.7, 0.28, 0.15, 0.05, 0.06, 0xffd85a, SP * 0.5);
  if (l.hood) lump(b, 0, 0.78, -0.18, 0.3, 0.12, 0.18, l.top, SP);
  if (l.backpack !== null) lump(b, 0, 0.46, -0.42, 0.3, 0.34, 0.16, l.backpack, SP);
  if (l.patches) { lump(b, -0.18, 0.3, 0.3, 0.12, 0.12, 0.05, 0xf2a93a, SP * 0.6); lump(b, 0.16, 0.62, 0.3, 0.1, 0.1, 0.05, 0x8fd3ff, SP * 0.6); }
}

function ring(): GaussianMesh {
  const b = createGaussianBuilder(5);
  for (let i = 0; i < 36; i += 1) {
    const a = (i / 36) * Math.PI * 2;
    b.add({ p: [Math.cos(a) * 1.15, 0.03, Math.sin(a) * 1.15], s: [0.13, 0.03, 0.13], color: 0xff8a6b, opacity: 1, fx: true, n: [0, 1, 0] });
  }
  return b.build();
}

interface Part { mesh: GaussianMesh; pivot: THREE.Group }

export const buildAvatar: BuildAvatar = (d, seed) => {
  const l = lookFor(d, seed);
  const o = outfit(l);
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
  const sleeve = l.cardigan ? l.sleeve : l.blazer ?? l.top;
  const face = { mood: l.mood, eyeBags: l.eyeBags, shades: l.shades, hairStyle: l.hairStyle };
  const torsoPartM = attach(body, make((b) => torsoDraw(b, l), 1), 0, 0);
  const headM = attach(body, make((b) => headPart(b, S, o, face, SP), 2), 0, NECK_Y);
  const armL = attach(body, make((b) => armPart(b, S, o, sleeve, SP * 0.9), 3), -SHOULDER.x, SHOULDER.y);
  const armR = attach(body, make((b) => { armPart(b, S, o, sleeve, SP * 0.9); if (l.gold) lump(b, 0, -0.58, 0, 0.15, 0.04, 0.15, 0xffd85a, SP * 0.5); }, 4), SHOULDER.x, SHOULDER.y);
  const legL = attach(group, make((b) => legPart(b, S, o, SP, l.patches), 5), -0.22, HIP_Y);
  const legR = attach(group, make((b) => legPart(b, S, o, SP, false), 6), 0.22, HIP_Y);
  const marker = ring();
  group.add(marker.mesh);
  const parts = [torsoPartM, headM, armL, armR, legL, legR, { mesh: marker, pivot: group }];
  if (l.cane) {
    const cane = make((b) => { for (let y = 0; y < 1.5; y += 0.1) b.add({ p: [0, -y, 0], s: [0.05, 0.07, 0.05], color: 0x6f4a32, opacity: 1 }); lump(b, 0.05, 0.05, 0, 0.1, 0.06, 0.06, 0x6f4a32, 0.08); }, 7);
    attach(armR.pivot, cane, 0.02, -0.75);
    parts.push({ mesh: cane, pivot: group });
  }
  void INK; void dot;
  let walking = 0, target = 0, phase = 0;
  const lean = l.slouch;
  return {
    group, meshes: parts.map((p) => p.mesh), height: HERO_HEIGHT,
    setWalking(on) { target = on ? 1 : 0; },
    update(t, dt) {
      walking += (target - walking) * Math.min(1, dt * 10);
      phase += dt * (7 + 3 * l.vigor) * walking;
      const swing = Math.sin(phase) * 0.65 * walking * l.vigor;
      legL.pivot.rotation.x = swing; legR.pivot.rotation.x = -swing;
      armL.pivot.rotation.x = -swing * 0.9; armR.pivot.rotation.x = swing * 0.9;
      const idle = Math.sin(t * 2) * 0.02;
      body.position.y = HIP_Y + Math.abs(Math.sin(phase)) * 0.08 * walking + idle;
      body.rotation.x = lean + walking * 0.06;
      body.rotation.z = Math.sin(phase) * 0.04 * walking;
      headM.pivot.rotation.x = -lean * 0.5 + Math.sin(t * 1.3) * 0.02;
    },
    dispose() { parts.forEach((p) => p.mesh.dispose()); },
  };
};
