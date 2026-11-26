import * as THREE from 'three';
import type { BuildAvatar } from './contracts';
import { createGaussianBuilder, type GaussianMesh } from './gaussian';
import { lookFor, type AvatarLook } from './avatarLook';
import { armPart, EYE_Y, eyesPart, headPart, HERO_HEIGHT, legPart, RIG, torsoPart, type Face, type Outfit } from './chibi';
import { vbox } from './voxel';

type B = ReturnType<typeof createGaussianBuilder>;

// The hero: a blocky voxel person, 2.8 tall with a cube head, facing +z. Torso, head, eyes, two arms and two legs are separate
// meshes hung on pivot groups, so walking is just rotating rigid boxes around the shoulders and hips, and a blink swaps two
// tiny eye meshes. A coral ring marks who the player is, and a coral scarf (or a backpack) goes with it.

const S = 1, SP = 0;
const COAL = 0xff8a6b, CREAM = 0xfff6dc;
/** The hero is drawn this many view units nearer than it stands, so a stall or a tree in front never hides who you are (and the pixel pass inks round it). */
export const HERO_BIAS = 4.5;

const outfit = (l: AvatarLook): Outfit => ({ top: l.blazer ?? l.top, pants: l.pants, shoes: l.shoes, hair: l.hair, skin: l.skin });

/** The torso with the things that sit on it (all in hip-pivot space, front at z = 0.3). */
function torsoDraw(b: B, l: AvatarLook): void {
  torsoPart(b, S, outfit(l), SP);
  const front = { skip: ['bottom', 'back'] as const };
  if (l.blazer) vbox(b, 0, 0.5, 0.3, 0.2, 0.55, 0.03, l.top, front);
  if (l.cardigan) vbox(b, 0, 0.5, 0.31, 0.1, 0.65, 0.03, CREAM, front);
  if (l.tie !== null) { vbox(b, 0, 0.8, 0.31, 0.3, 0.08, 0.04, CREAM, front); vbox(b, 0, 0.45, 0.31, 0.12, 0.4, 0.04, l.tie, front); }
  if (l.gold) vbox(b, 0, 0.68, 0.31, 0.5, 0.06, 0.04, 0xffd85a, front);
  if (l.hood) vbox(b, 0, 0.7, -0.37, 0.7, 0.3, 0.16, l.top);
  if (l.backpack !== null) {
    vbox(b, 0, 0.45, -0.43, 0.8, 0.65, 0.26, l.backpack);
    for (const x of [-0.26, 0.26]) vbox(b, x, 0.46, 0.31, 0.1, 0.5, 0.04, l.backpack, front);
  } else if (l.tie === null) {
    vbox(b, 0, 0.8, 0, 1.0, 0.16, 0.66, COAL, { skip: ['bottom'] });
    vbox(b, 0.3, 0.52, 0.34, 0.18, 0.4, 0.05, COAL, front);
  }
  if (l.patches) { vbox(b, -0.2, 0.35, 0.31, 0.22, 0.22, 0.04, 0xf2a93a, front); vbox(b, 0.18, 0.62, 0.31, 0.2, 0.2, 0.04, 0x8fd3ff, front); }
}

function ring(): GaussianMesh {
  const b = createGaussianBuilder(5);
  for (let i = 0; i < 36; i += 1) {
    const a = (i / 36) * Math.PI * 2;
    b.add({ p: [Math.cos(a) * 1.15, 0.03, Math.sin(a) * 1.15], s: [0.13, 0.03, 0.13], color: COAL, opacity: 1, fx: true, n: [0, 1, 0] });
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
  body.position.y = RIG.hip;
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
  const face: Face = { mood: l.mood, eyeBags: l.eyeBags, shades: l.shades, hairStyle: l.hairStyle };
  const torso = attach(body, make((b) => torsoDraw(b, l), 1), 0, 0);
  const head = attach(body, make((b) => headPart(b, S, o, { ...face, noEyes: true }, SP), 2), 0, RIG.neck);
  const eyesOpen = attach(head.pivot, make((b) => eyesPart(b, S, face, false), 8), 0, EYE_Y);
  const eyesShut = attach(head.pivot, make((b) => eyesPart(b, S, face, true), 9), 0, EYE_Y);
  eyesShut.mesh.mesh.visible = false;
  const armL = attach(body, make((b) => armPart(b, S, o, sleeve, SP), 3), -RIG.shoulderX, RIG.shoulderY);
  const armR = attach(body, make((b) => { armPart(b, S, o, sleeve, SP); if (l.gold) vbox(b, 0, -0.5, 0, 0.34, 0.06, 0.36, 0xffd85a); }, 4), RIG.shoulderX, RIG.shoulderY);
  const legL = attach(group, make((b) => legPart(b, S, o, SP, l.patches), 5), -RIG.legX, RIG.hip);
  const legR = attach(group, make((b) => legPart(b, S, o, SP, false), 6), RIG.legX, RIG.hip);
  const marker = ring();
  group.add(marker.mesh);
  const parts: { mesh: GaussianMesh }[] = [torso, head, eyesOpen, eyesShut, armL, armR, legL, legR, { mesh: marker }];
  if (l.cane) {
    const cane = make((b) => { vbox(b, 0, -0.5, 0, 0.08, 1.0, 0.08, 0x6f4a32); vbox(b, 0, 0.02, 0.05, 0.1, 0.08, 0.22, 0x6f4a32); }, 7);
    attach(armR.pivot, cane, 0, -0.62);
    parts.push({ mesh: cane });
  }
  parts.forEach((p) => { p.mesh.uniforms.uBias.value = HERO_BIAS; });
  let walking = 0, target = 0, phase = 0;
  const lean = l.slouch, blinkAt = (seed % 7) * 0.3, canBlink = !l.shades;
  return {
    group, meshes: parts.map((p) => p.mesh), height: HERO_HEIGHT,
    setWalking(on) { target = on ? 1 : 0; },
    update(t, dt) {
      walking += (target - walking) * Math.min(1, dt * 10);
      phase += dt * (7 + 3 * l.vigor) * walking;
      const swing = Math.sin(phase) * 0.65 * walking * l.vigor;
      legL.pivot.rotation.x = swing; legR.pivot.rotation.x = -swing;
      armL.pivot.rotation.x = -swing * 0.9; armR.pivot.rotation.x = swing * 0.9;
      body.position.y = RIG.hip + Math.abs(Math.sin(phase)) * 0.08 * walking + Math.sin(t * 2) * 0.02;
      body.rotation.x = lean + walking * 0.06;
      body.rotation.z = Math.sin(phase) * 0.04 * walking;
      head.pivot.rotation.x = -lean * 0.5 + Math.sin(t * 1.3) * 0.02;
      const shut = canBlink && (t + blinkAt) % 3.6 < 0.14;
      eyesOpen.mesh.mesh.visible = !shut; eyesShut.mesh.mesh.visible = shut;
    },
    dispose() { parts.forEach((p) => p.mesh.dispose()); },
  };
};
