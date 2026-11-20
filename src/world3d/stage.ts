import * as THREE from 'three';
import { translate, type Lang } from '../i18n';
import { buildAvatar } from './avatar';
import type { AvatarHandle, SpotId, StageApi, WorldHandle } from './contracts';
import { createControls, resolvePosition, type Walk } from './controls';
import { worldKey, type WorldDescriptor } from './descriptor';
import { createGaussianBuilder, type GaussianMesh } from './gaussian';
import { createJoystick } from './joystick';
import { createDioramaCamera, createPixelRenderer, srgb } from './pixel';
import { buildWorld } from './world';
import './stage.css';

const VIEW_HEIGHT = 18;
const DEFAULT_YAW = Math.PI / 4;
const WALK_SPEED = 3.2; // world units a second
const TURN_RATE = 12; // how fast the figure turns to face its walk
const CAM_RATE = 5; // how fast the camera catches up with the avatar
const REVEAL_SECONDS = 1.2; // full re-assemble (scope changed)
const FRESH_SECONDS = 0.9; // only the new pieces grow in (same scope)
const FRAME_SECONDS = 1.2; // camera tween to a world's framing
const LEASH = 0.3; // camera may follow the avatar within this fraction of the framing's view height
const TAP_REACH = 0.12;
const MAX_DT = 0.05;
const RING_SPLATS = 36;

// Daytime palette, swapped in over pixel.ts's night palette. The shader array is fixed-size, so the length must match.

export interface StageOptions { lang?: Lang }


interface Goal { id: SpotId; resolve: () => void; reject: (e: Error) => void }
interface Task { step: (t: number, dt: number) => boolean | void; resolve: () => void }
interface Frame { vh: number; x: number; y: number; z: number; yaw: number }

function buildBeacon(seed: number): GaussianMesh {
  const b = createGaussianBuilder(seed + 101);
  b.blob(0, 1.3, 0, 0.14, 1.3, 0.14, 90, 0xffd85a, 0.07, { opacity: 0.8 });
  for (let i = 0; i < RING_SPLATS; i += 1) {
    const a = (i / RING_SPLATS) * Math.PI * 2;
    b.add({ p: [Math.cos(a) * 0.8, 0.05, Math.sin(a) * 0.8], s: [0.12, 0.12, 0.03], color: 0xff8a6b, opacity: 0.9 });
  }
  const g = b.build();
  g.mesh.visible = false;
  g.mesh.frustumCulled = false;
  return g;
}

function turnToward(from: number, to: number, k: number): number {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const within = (v: number, centre: number, r: number) => Math.max(centre - r, Math.min(centre + r, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const smooth = (k: number) => k * k * (3 - 2 * k);

function supportsWebGL2(): boolean {
  return Boolean(document.createElement('canvas').getContext('webgl2'));
}

export function createStage(container: HTMLElement, initial: WorldDescriptor, seed: number, opts: StageOptions = {}): StageApi {
  const lang = opts.lang ?? 'zh';
  if (!supportsWebGL2()) throw new Error(translate(lang, 'stage.error.webgl'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  container.classList.add('ml-stage3d');

  const px = createPixelRenderer(container);
  px.uniforms.vignette.value = 0.12; // daytime: keep the picture bright to the corners
  px.uniforms.fadeColor.value = srgb(0xfff6dc);
  const cam = createDioramaCamera(VIEW_HEIGHT);
  const scene = new THREE.Scene();
  let d = initial;
  let world: WorldHandle = buildWorld(d, seed);
  let avatar: AvatarHandle = buildAvatar(d, seed);
  scene.background = new THREE.Color(world.sky);
  scene.add(world.group, avatar.group);
  const beacon = buildBeacon(seed);
  scene.add(beacon.mesh);

  let pos: Walk = { x: 0, z: 0 };
  let facing = 0;
  let walking = false;
  let tap: Walk | null = null;
  let goal: Goal | null = null;
  let enabled = true;
  let hold = false;
  let revealAt = 0;
  let revealLen = REVEAL_SECONDS;
  let revealOnly: readonly GaussianMesh[] | null = null; // null: every mesh grows in
  let framing: Frame | null = null; // where the camera is allowed to follow the avatar
  let frameFrom: Frame = snapshot();
  let frameTo: Frame = snapshot();
  let frameAt = -Infinity;
  let t = 0;
  let last = performance.now();
  let raf = 0;
  let disposed = false;
  let tasks: Task[] = [];

  function snapshot(): Frame {
    return { vh: cam.state.viewHeight, x: cam.target.x, y: cam.target.y, z: cam.target.z, yaw: cam.state.yaw };
  }

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  function groundAt(clientX: number, clientY: number): Walk | null {
    const r = container.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam.camera);
    return ray.ray.intersectPlane(ground, hit) ? { x: hit.x, z: hit.z } : null;
  }

  const joy = createJoystick(container, translate(lang, 'stage.joy.label'));
  const ctl = createControls({ container, joystick: joy, groundAt, onTap: (p) => { tap = p; } });

  /** Walk toward the tapped point; returns the step for this frame, or null when there is nothing to walk to. */
  function stepTowardTap(dt: number): Walk | null {
    if (!tap) return null;
    const dx = tap.x - pos.x, dz = tap.z - pos.z, dist = Math.hypot(dx, dz), reach = WALK_SPEED * dt;
    if (dist <= Math.max(TAP_REACH, reach)) { tap = null; return { x: dx, z: dz }; }
    return { x: (dx / dist) * reach, z: (dz / dist) * reach };
  }

  /** Keys or joystick override a tap. */
  function input(dt: number): Walk | null {
    if (!enabled) return null;
    const dir = ctl.walk(cam.state.yaw);
    if (dir.x !== 0 || dir.z !== 0) {
      tap = null;
      return { x: dir.x * WALK_SPEED * dt, z: dir.z * WALK_SPEED * dt };
    }
    return stepTowardTap(dt);
  }

  function checkGoal() {
    const g = goal;
    if (!g) return;
    const spot = world.spots.find((s) => s.id === g.id);
    if (!spot) return;
    beacon.mesh.position.set(spot.x, 0, spot.z);
    if (Math.hypot(pos.x - spot.x, pos.z - spot.z) <= spot.r) finishGoal(g);
  }

  function finishGoal(g: Goal) {
    goal = null;
    beacon.mesh.visible = false;
    tap = null;
    g.resolve();
  }

  function cancelGoal() {
    const g = goal;
    if (!g) return;
    goal = null;
    beacon.mesh.visible = false;
    g.reject(new Error('stage: goal cancelled'));
  }

  /** Eases the camera to the current framing. Returns true while it is still moving. */
  function applyFrame(): boolean {
    if (hold) return false;
    const k = reduced ? 1 : smooth(clamp01((t - frameAt) / FRAME_SECONDS));
    cam.state.viewHeight = lerp(frameFrom.vh, frameTo.vh, k);
    cam.state.yaw = lerp(frameFrom.yaw, frameTo.yaw, k);
    cam.target.set(lerp(frameFrom.x, frameTo.x, k), lerp(frameFrom.y, frameTo.y, k), lerp(frameFrom.z, frameTo.z, k));
    return k < 1;
  }

  /** Tweens to a world's framing (or the default view). Instant when asked, or under reduced motion. */
  function setFraming(w: WorldHandle, instant: boolean) {
    const f = w.framing;
    framing = f ? { vh: f.viewHeight, x: f.target[0], y: f.target[1], z: f.target[2], yaw: f.yaw } : null;
    frameFrom = snapshot();
    frameTo = framing ?? { vh: VIEW_HEIGHT, x: cam.target.x, y: cam.target.y, z: cam.target.z, yaw: DEFAULT_YAW };
    frameAt = instant || reduced ? t - FRAME_SECONDS : t;
  }

  function follow(dt: number) {
    if (hold) return;
    const k = 1 - Math.exp(-dt * CAM_RATE), b = world.bounds;
    const cx = framing?.x ?? 0, cz = framing?.z ?? 0, leash = framing ? framing.vh * LEASH : Infinity;
    const tx = within(within(pos.x, cx, leash), 0, b), tz = within(within(pos.z, cz, leash), 0, b);
    cam.target.x += (tx - cam.target.x) * k;
    cam.target.z += (tz - cam.target.z) * k;
    cam.target.y += (avatar.height * 0.5 - cam.target.y) * k;
  }

  function tick(dt: number) {
    const move = input(dt);
    const next = move ? resolvePosition({ x: pos.x + move.x, z: pos.z + move.z }, world) : pos;
    walking = Math.hypot(next.x - pos.x, next.z - pos.z) > 1e-4;
    if (walking) facing = turnToward(facing, Math.atan2(next.x - pos.x, next.z - pos.z), 1 - Math.exp(-dt * TURN_RATE));
    pos = next;
    avatar.setWalking(walking);
    world.update(t, dt);
    avatar.update(t, dt);
    avatar.group.position.set(pos.x, 0, pos.z);
    avatar.group.rotation.y = facing;
    checkGoal();
    if (!applyFrame()) follow(dt);
    cam.update(px.low.x / px.low.y, px.low.y);
    syncMeshes();
  }

  function syncMeshes() {
    const revealK = reduced ? 1 : clamp01((t - revealAt) / revealLen);
    beacon.uniforms.uOpacity.value = 0.65 + 0.35 * Math.sin(t * 4);
    const prep = (g: GaussianMesh, reveal: number) => {
      g.uniforms.uTime.value = t;
      g.uniforms.uReveal.value = reveal;
      g.uniforms.uViewport.value.copy(px.low);
      g.sort(cam.camera);
    };
    world.meshes.forEach((g) => prep(g, revealOnly === null || revealOnly.includes(g) ? revealK : 1));
    avatar.meshes.forEach((g) => prep(g, 1));
    if (beacon.mesh.visible) prep(beacon, 1);
  }

  function runTasks(dt: number) {
    if (tasks.length === 0) return;
    const done: Task[] = [];
    tasks = tasks.filter((task) => {
      if (task.step(t, dt) !== true) return true;
      done.push(task);
      return false;
    });
    done.forEach((task) => task.resolve());
  }

  function addTask(step: Task['step']): Promise<void> {
    return new Promise<void>((resolve) => { tasks = [...tasks, { step, resolve }]; });
  }

  function frame(now: number) {
    const dt = Math.min(MAX_DT, (now - last) / 1000);
    last = now;
    t += dt;
    tick(dt);
    raf = requestAnimationFrame(frame);
    px.render(scene, cam.camera);
    runTasks(dt);
  }

  setFraming(world, true);
  cam.target.set(pos.x, avatar.height * 0.5, pos.z);
  const onResize = () => px.resize();
  const ro = new ResizeObserver(onResize);
  ro.observe(container);
  raf = requestAnimationFrame(frame);

  return {
    setWorld(next) {
      const changed = worldKey(next) !== worldKey(d);
      const sameScope = next.scope === d.scope;
      d = next;
      if (!changed) return;
      scene.remove(world.group, avatar.group);
      world.dispose();
      avatar.dispose();
      world = buildWorld(next, seed);
      avatar = buildAvatar(next, seed);
      scene.background = new THREE.Color(world.sky);
      scene.add(world.group, avatar.group);
      avatar.setWalking(walking);
      pos = resolvePosition(pos, world);
      tap = null;
      // same scope: swap at once and grow in only the new pieces; a new scope re-assembles the whole world
      revealOnly = sameScope ? (world.fresh ?? []) : null;
      revealLen = sameScope ? FRESH_SECONDS : REVEAL_SECONDS;
      revealAt = t;
      setFraming(world, false);
    },
    world: () => d,
    setControls(on) {
      enabled = on;
      ctl.setEnabled(on);
      if (!on) tap = null;
    },
    goTo(id) {
      if (!world.spots.some((s) => s.id === id)) return Promise.reject(new Error(`stage: no spot "${id}" in this world`));
      cancelGoal();
      beacon.mesh.visible = true;
      return new Promise<void>((resolve, reject) => { goal = { id, resolve, reject }; });
    },
    clearGoal: cancelGoal,
    camera: () => ({ cam: cam.camera, state: cam.state, target: cam.target, hold(on: boolean) { hold = on; } }),
    scene,
    avatar: () => avatar,
    animate: (step) => addTask(step),
    fade(to, ms, color) {
      if (color !== undefined) px.uniforms.fadeColor.value = srgb(color);
      const from = px.uniforms.fade.value as number;
      if (reduced || ms <= 0) { px.uniforms.fade.value = to; return Promise.resolve(); }
      let elapsed = 0;
      return addTask((_t, dt) => {
        elapsed += dt * 1000;
        const k = Math.min(1, elapsed / ms);
        px.uniforms.fade.value = from + (to - from) * k;
        return k >= 1;
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      ctl.dispose();
      joy.dispose();
      cancelGoal();
      tasks.forEach((task) => task.resolve());
      tasks = [];
      world.dispose();
      avatar.dispose();
      beacon.dispose();
      px.dispose();
      container.classList.remove('ml-stage3d');
    },
  };
}
