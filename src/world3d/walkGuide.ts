import * as THREE from 'three';
import { translate, type Lang } from '../i18n';
import type { Spot, SpotId } from './contracts';
import { freeRect, type BoxPx, type Insets } from './frameFit';
import { createGaussianBuilder, type GaussianMesh } from './gaussian';
import { HERO_BIAS } from './avatar';
import { vbox } from './voxel';
import './walkGuide.css';

// Walk-to-decide guidance: a bright ring and a bobbing arrow on the hero, a tall light beam and a bouncing arrow on the
// place, a pin (icon + name) that rides above the place and turns into an edge arrow when it is off screen, and a small
// sparkle pop on arrival. The 3D parts are splat meshes the stage syncs; the pin is a DOM element so no building hides it.

const SUN = 0xffd85a, COAL = 0xff8a6b, GLOW = 0xfff0a0;
const HERO_H = 2.8;
const BEAM_H = 6;
const POP_SECONDS = 0.6;
const PIN_PAD_X = 74, PIN_PAD_Y = 26, PIN_TOP_MIN = 128, PIN_BOTTOM_MIN = 112; // the HUD's second row (and on desktop the sound and help buttons) reach down to about here
const TAIL_R = 34;

const ICON: Record<SpotId, string> = { home: '🏠', office: '🏢', bank: '🏦', market: '🧺', cafe: '☕', park: '🌳', clinic: '🏥', campus: '🎓', pier: '⚓' };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const bob = (t: number, rate: number) => Math.abs(Math.sin(t * rate));

/** A chunky down arrow, tip at the origin, 2.6 tall, facing +z. */
function arrow(seed: number, color: number): GaussianMesh {
  const b = createGaussianBuilder(seed);
  vbox(b, 0, 0.2, 0, 0.6, 0.4, 0.5, color);
  vbox(b, 0, 0.6, 0, 1.4, 0.4, 0.5, color);
  vbox(b, 0, 1.0, 0, 2.2, 0.4, 0.5, color);
  vbox(b, 0, 1.9, 0, 1.0, 1.4, 0.5, color);
  return b.build();
}

function ringAndBeam(seed: number): GaussianMesh {
  const b = createGaussianBuilder(seed);
  b.blob(0, BEAM_H / 2, 0, 0.5, BEAM_H / 2, 0.5, 160, GLOW, 0.3, { opacity: 0.42 });
  for (let i = 0; i < 48; i += 1) {
    const a = (i / 48) * Math.PI * 2;
    b.add({ p: [Math.cos(a) * 1.5, 0.05, Math.sin(a) * 1.5], s: [0.17, 0.17, 0.03], color: i % 2 ? SUN : COAL, opacity: 0.95 });
  }
  return b.build();
}

function heroRing(seed: number): GaussianMesh {
  const b = createGaussianBuilder(seed);
  for (let i = 0; i < 40; i += 1) {
    const a = (i / 40) * Math.PI * 2;
    b.add({ p: [Math.cos(a) * 1.05, 0.05, Math.sin(a) * 1.05], s: [0.13, 0.13, 0.03], color: SUN, opacity: 1 });
  }
  return b.build();
}

function sparkle(seed: number): GaussianMesh {
  const b = createGaussianBuilder(seed);
  for (let i = 0; i < 30; i += 1) {
    const a = (i / 30) * Math.PI * 2 + b.rnd() * 0.3, r = 0.9 + b.rnd() * 0.9;
    b.add({ p: [Math.cos(a) * r, 0.4 + b.rnd() * 1.6, Math.sin(a) * r], s: [0.2, 0.2, 0.2], color: [SUN, COAL, 0xffffff][i % 3], opacity: 1, fx: true });
  }
  return b.build();
}

export interface GuideFrame {
  t: number;
  dt: number;
  hero: { x: number; z: number };
  cam: THREE.OrthographicCamera;
  yaw: number;
  viewHeight: number;
  box: BoxPx;
  ins: Insets;
}

export interface Guide {
  /** every splat mesh the guide owns; the stage syncs the visible ones */
  readonly meshes: readonly GaussianMesh[];
  start(spot: Spot): void;
  stop(): void;
  active(): boolean;
  /** sparkles and a pin pop at a place */
  pop(x: number, z: number): void;
  update(f: GuideFrame): void;
  dispose(): void;
}

function buildPin(): { root: HTMLElement; pin: HTMLElement; icon: HTMLElement; name: HTMLElement; tail: HTMLElement } {
  const root = document.createElement('div');
  root.className = 'ml-guide';
  root.setAttribute('aria-hidden', 'true');
  const pin = document.createElement('div'), icon = document.createElement('span'), name = document.createElement('span'), tail = document.createElement('i');
  pin.className = 'ml-guide__pin'; icon.className = 'ml-guide__icon'; name.className = 'ml-guide__name'; tail.className = 'ml-guide__tail';
  pin.append(icon, name);
  root.append(pin, tail);
  root.hidden = true;
  return { root, pin, icon, name, tail };
}

export function createGuide(container: HTMLElement, scene: THREE.Scene, lang: Lang): Guide {
  const beam = ringAndBeam(201), beamArrow = arrow(202, SUN), heroArrow = arrow(203, COAL), ring = heroRing(204), pop = sparkle(205);
  const beamGroup = new THREE.Group(), heroGroup = new THREE.Group(), popGroup = new THREE.Group();
  beamGroup.add(beam.mesh, beamArrow.mesh);
  heroGroup.add(ring.mesh, heroArrow.mesh);
  popGroup.add(pop.mesh);
  const groups = [beamGroup, heroGroup, popGroup];
  groups.forEach((g) => { g.visible = false; scene.add(g); });
  [beam, beamArrow, heroArrow, ring, pop].forEach((g) => { g.mesh.frustumCulled = false; });
  [heroArrow, ring].forEach((g) => { g.uniforms.uBias.value = HERO_BIAS; });
  const dom = buildPin();
  container.append(dom.root);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let spot: Spot | null = null;
  let popAge = Infinity;
  const v = new THREE.Vector3();

  const project = (x: number, y: number, z: number, cam: THREE.Camera, box: BoxPx) => {
    v.set(x, y, z).project(cam);
    return { x: (v.x * 0.5 + 0.5) * box.w, y: (-v.y * 0.5 + 0.5) * box.h };
  };

  function place(f: GuideFrame, s: Spot, scale: number) {
    const rect = freeRect(f.box, { top: Math.max(f.ins.top, PIN_TOP_MIN), bottom: Math.max(f.ins.bottom, PIN_BOTTOM_MIN), right: f.ins.right });
    const anchor = project(s.x, (BEAM_H + 2.4) * scale, s.z, f.cam, f.box), foot = project(s.x, 0, s.z, f.cam, f.box);
    const px = clamp(anchor.x, PIN_PAD_X, rect.w - PIN_PAD_X), py = clamp(anchor.y - PIN_PAD_Y, rect.top + PIN_PAD_Y, rect.top + rect.h - PIN_PAD_Y);
    const angle = Math.atan2(foot.y - py, foot.x - px);
    dom.root.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0)`;
    dom.tail.style.transform = `translate(${(Math.cos(angle) * TAIL_R).toFixed(1)}px,${(Math.sin(angle) * TAIL_R).toFixed(1)}px) rotate(${angle.toFixed(3)}rad)`;
    dom.root.dataset.edge = anchor.x === px && anchor.y - PIN_PAD_Y === py ? '0' : '1';
    dom.root.dataset.hero = `${f.hero.x.toFixed(2)},${f.hero.z.toFixed(2)}`;
    dom.root.dataset.foot = `${foot.x.toFixed(0)},${foot.y.toFixed(0)}`; // where the place stands on screen (the browser checks tap through it)
  }

  return {
    meshes: [beam, beamArrow, heroArrow, ring, pop],
    start(next) {
      spot = next;
      dom.icon.textContent = ICON[next.id];
      dom.name.textContent = translate(lang, `stage.spot.${next.id}`);
      dom.root.classList.remove('ml-guide--in');
      void dom.root.offsetWidth; // restart the pin's pop-in
      dom.root.classList.add('ml-guide--in');
      dom.root.hidden = false;
      beamGroup.visible = true; heroGroup.visible = true;
    },
    stop() {
      spot = null;
      dom.root.hidden = true;
      dom.root.classList.remove('ml-guide--in');
      beamGroup.visible = false; heroGroup.visible = false;
    },
    active: () => spot !== null,
    pop(x, z) {
      popGroup.position.set(x, 0, z);
      popGroup.visible = true;
      popAge = reduced ? POP_SECONDS : 0;
    },
    update(f) {
      const scale = clamp(f.viewHeight / 26, 1, 2.6);
      if (popGroup.visible) {
        popAge += f.dt;
        const k = clamp(popAge / POP_SECONDS, 0, 1);
        popGroup.scale.setScalar(scale * (0.4 + 1.1 * (1 - (1 - k) ** 3)));
        popGroup.position.y = k * 0.8 * scale;
        pop.uniforms.uOpacity.value = 1 - k * k;
        if (k >= 1) popGroup.visible = false;
      }
      if (!spot) return;
      const wob = reduced ? 0.5 : bob(f.t, 3.2);
      beamGroup.position.set(spot.x, 0, spot.z);
      beam.mesh.scale.setScalar(scale);
      beam.uniforms.uOpacity.value = 0.7 + 0.3 * Math.sin(f.t * 4);
      beamArrow.mesh.scale.setScalar(0.8 * scale);
      beamArrow.mesh.position.y = (BEAM_H + 0.3 + wob * 0.9) * scale;
      beamGroup.rotation.y = 0;
      beamArrow.mesh.rotation.y = f.yaw;
      heroGroup.position.set(f.hero.x, 0, f.hero.z);
      ring.mesh.scale.setScalar(Math.sqrt(scale) * (1 + (reduced ? 0 : 0.06 * Math.sin(f.t * 5))));
      heroArrow.mesh.scale.setScalar(0.42 * scale);
      heroArrow.mesh.position.y = HERO_H + (0.5 + wob * 0.45) * scale;
      heroArrow.mesh.rotation.y = f.yaw;
      place(f, spot, scale);
    },
    dispose() {
      groups.forEach((g) => scene.remove(g));
      [beam, beamArrow, heroArrow, ring, pop].forEach((g) => g.dispose());
      dom.root.remove();
    },
  };
}
