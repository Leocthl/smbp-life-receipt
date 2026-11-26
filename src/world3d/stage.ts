import * as THREE from 'three';
import { translate, type Lang } from '../i18n';
import { buildAvatar } from './avatar';
import type { AvatarHandle, Spot, SpotId, StageApi, WorldHandle } from './contracts';
import { createControls, resolvePosition, type Walk } from './controls';
import { worldKey, type WorldDescriptor } from './descriptor';
import type { GaussianMesh } from './gaussian';
import { camAxes, fitViewHeight, freeRect, type P3 } from './frameFit';
import { createJoystick } from './joystick';
import { createDioramaCamera, createPixelRenderer, srgb } from './pixel';
import { scopeHalf, scopeMargin } from './scopeFit';
import { createGuide } from './walkGuide';
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
const HOP_SECONDS = 0.38; // the little jump when the hero reaches the place
const HOP_HEIGHT = 0.7;
const SIDESTEPS = [0.9, -0.9, 1.6, -1.6]; // radians to turn a blocked tap-walk
const ARRIVE_BEAT = 0.45; // seconds between arriving and the card opening
const WALK_PAD = { top: 128, bottom: 112, margin: 1.2 }; // what the HUD and the prompt cover on a walk, and the air round hero and place
const WALK_MIN_VH = 14;
const OUTDOOR_SPAWN = { x: 1.5, z: -1.6 }; // open pavement with no tree or stall in front of it from the camera (the origin sits right behind a park tree)
const SPOT_TOP = 13; // the beacon's arrow stands about this high (it grows with the zoom)
const MIN_FRAME_ASPECT = 1; // portrait screens widen the view so the room is not cropped to a sliver
const DEADZONE = 0.12; // the camera ignores avatar moves this close to the framing's centre (fraction of its view height)
const SETTLE = 0.002; // closer than this to where it is going, the camera just arrives (no endless tiny moves)
const INSET_RATE = 9; // how fast the camera re-centres when a bottom sheet moves
const RESIZE_MS = 120; // wait for the browser UI (URL bar, rotation) to stop moving before rebuilding the render targets
/** Event the bottom sheet fires with the pixels it covers at the bottom (and the HUD at the top): detail { bottom, top, right } (right: a side panel on desktop). */
export const INSET_EVENT = 'ml-inset';

// Daytime palette, swapped in over pixel.ts's night palette. The shader array is fixed-size, so the length must match.

export interface StageOptions { lang?: Lang }


interface Goal { id: SpotId; resolve: () => void; reject: (e: Error) => void }
interface Task { step: (t: number, dt: number) => boolean | void; resolve: () => void }
interface Frame { vh: number; x: number; y: number; z: number; yaw: number }

function turnToward(from: number, to: number, k: number): number {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const within = (v: number, centre: number, r: number) => Math.max(centre - r, Math.min(centre + r, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const smooth = (k: number) => k * k * (3 - 2 * k);

const indoorScope = (scope: WorldDescriptor['scope']) => scope === 'room' || scope === 'home';

function supportsWebGL2(): boolean {
  return Boolean(document.createElement('canvas').getContext('webgl2'));
}

export function createStage(container: HTMLElement, initial: WorldDescriptor, seed: number, opts: StageOptions = {}): StageApi {
  const lang = opts.lang ?? 'zh';
  if (!supportsWebGL2()) throw new Error(translate(lang, 'stage.error.webgl'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  container.classList.add('ml-stage3d', 'ml-stage3d--walk'); // walking is on until setControls says otherwise

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
  const guide = createGuide(container, scene, lang);

  const spawnFor = (scope: WorldDescriptor['scope']): Walk => (scope === 'room' || scope === 'home' ? { x: 0, z: 0 } : OUTDOOR_SPAWN);
  let pos: Walk = spawnFor(initial.scope);
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
  let frameDone = false; // the framing tween has arrived; from then on only follow() may move the camera
  let frameVh = cam.state.viewHeight; // the framing's view height (the fit below may zoom out past it)
  let fitNow = 0, contentHalf = { w: 0, h: 0 }; // zoom needed to fit the scope in the free area: where it is / what the scope reaches from the camera's target
  let walkFrame = false; // the camera is framing hero and place for a walk, not the scope
  let hopAt = -Infinity;
  let goalFrom = 0; // how far the hero had to walk
  let boxW = container.clientWidth, boxH = container.clientHeight;
  // px the sheet covers at the bottom and the HUD at the top (wanted / currently applied as a picture shift), and the side panel on the right (desktop)
  let sheetBottom = 0, hudTop = 0, insetNow = 0, dockInset = 0, dockNow = 0;

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
    const spot = world.spots.find((sp) => sp.id === g.id);
    if (spot && Math.hypot(pos.x - spot.x, pos.z - spot.z) <= spot.r) finishGoal(g, spot);
  }

  function endGoalView() {
    guide.stop();
    walkFrame = false;
    setFraming(world, false);
  }

  function finishGoal(g: Goal, spot: Spot) {
    goal = null;
    tap = null;
    const travelled = goalFrom > spot.r + 1;
    if (travelled) { guide.pop(spot.x, spot.z); hopAt = t; }
    endGoalView();
    if (!travelled || reduced) { g.resolve(); return; }
    let wait = 0; // let the sparkles and the hop play before the card opens
    void addTask((_t, dt) => { wait += dt; return wait >= ARRIVE_BEAT; }).then(g.resolve);
  }

  function cancelGoal() {
    const g = goal;
    if (!g) return;
    goal = null;
    endGoalView();
    g.reject(new Error('stage: goal cancelled'));
  }

  /** Frames hero and place together (both in the free area), so the walk starts with the whole way in view. */
  function frameWalk(spot: Spot) {
    const { yaw } = frameTo, { right, up } = camAxes(yaw, cam.state.pitch);
    const pts: P3[] = [[pos.x, 0, pos.z], [pos.x, avatar.height, pos.z], [spot.x, 0, spot.z], [spot.x, SPOT_TOP, spot.z]];
    const screen = pts.map((p) => right[0] * p[0] + right[2] * p[2]);
    const ups = pts.map((p) => up[0] * p[0] + up[1] * p[1] + up[2] * p[2]);
    const half = { w: (Math.max(...screen) - Math.min(...screen)) / 2, h: (Math.max(...ups) - Math.min(...ups)) / 2 };
    const uc = (Math.max(...ups) + Math.min(...ups)) / 2, tx = (pos.x + spot.x) / 2, tz = (pos.z + spot.z) / 2;
    const ty = (uc - up[0] * tx - up[2] * tz) / up[1];
    const ins = { top: Math.max(hudTop, WALK_PAD.top), bottom: Math.max(sheetBottom + hidden(), WALK_PAD.bottom), right: dockInset };
    const base = frameTo.vh;
    const vh = Math.max(Math.max(WALK_MIN_VH, base * 0.35), Math.min(base, fitViewHeight({ w: boxW, h: boxH }, ins, half, WALK_PAD.margin)));
    framing = { vh, x: tx, y: ty, z: tz, yaw };
    frameFrom = snapshot();
    frameTo = { ...framing };
    frameAt = reduced ? t - FRAME_SECONDS : t;
    frameDone = false;
    walkFrame = true;
  }

  /** A tall, narrow screen would crop the room to a sliver: zoom out until the view is at least MIN_FRAME_ASPECT wide. */
  const widen = (vh: number) => vh * Math.max(1, MIN_FRAME_ASPECT / (boxW / Math.max(1, boxH)));

  /** Eases the camera to the current framing. Returns true while it is still moving; once it has arrived it is left alone. */
  function applyFrame(): boolean {
    if (hold || frameDone) return false;
    const k = reduced ? 1 : smooth(clamp01((t - frameAt) / FRAME_SECONDS));
    frameVh = lerp(frameFrom.vh, frameTo.vh, k);
    cam.state.yaw = lerp(frameFrom.yaw, frameTo.yaw, k);
    cam.target.set(lerp(frameFrom.x, frameTo.x, k), lerp(frameFrom.y, frameTo.y, k), lerp(frameFrom.z, frameTo.z, k));
    frameDone = k >= 1;
    return !frameDone;
  }

  /** Tweens to a world's framing (or the default view). Instant when asked, or under reduced motion. */
  function setFraming(w: WorldHandle, instant: boolean) {
    const f = w.framing;
    framing = f ? { vh: f.viewHeight, x: f.target[0], y: f.target[1], z: f.target[2], yaw: f.yaw } : null;
    frameFrom = snapshot();
    frameTo = framing ? { ...framing, vh: widen(framing.vh) } : { vh: widen(VIEW_HEIGHT), x: cam.target.x, y: cam.target.y, z: cam.target.z, yaw: DEFAULT_YAW };
    frameAt = instant || reduced ? t - FRAME_SECONDS : t;
    frameDone = false;
    contentHalf = scopeHalf(d.scope, [frameTo.x, frameTo.y, frameTo.z], frameTo.yaw, cam.state.pitch);
  }

  const hidden = () => Math.max(0, boxH - window.innerHeight); // the part of a large-viewport canvas the browser bars cover

  /** Zooms out, if the framing is too tight, until the scope fits the area the HUD, the sheet and the side panel leave free. */
  function updateFit(dt: number) {
    if (hold) return;
    const want = walkFrame ? 0 : fitViewHeight({ w: boxW, h: boxH }, { top: hudTop, bottom: sheetBottom + hidden(), right: dockInset }, contentHalf, scopeMargin(d.scope));
    fitNow = reduced ? want : approach(fitNow, want, 1 - Math.exp(-dt * INSET_RATE));
    cam.state.viewHeight = Math.max(frameVh, fitNow);
  }

  /** Moves a value toward where it is going; the last sliver is closed in one step so an idle camera is perfectly still. */
  const approach = (cur: number, want: number, k: number) => (Math.abs(want - cur) < SETTLE ? want : cur + (want - cur) * k);
  /** How far past the dead zone a move is, signed and capped at the leash. */
  const beyond = (d: number, dead: number, leash: number) => Math.sign(d) * Math.min(Math.max(0, Math.abs(d) - dead), leash - dead);

  /** The camera shadows the avatar only once it leaves a dead zone round the framing's centre, and never by more than the leash. */
  function follow(dt: number) {
    if (hold) return;
    const k = 1 - Math.exp(-dt * CAM_RATE), b = world.bounds;
    const cx = framing?.x ?? 0, cz = framing?.z ?? 0;
    const leash = framing ? framing.vh * LEASH : Infinity, dead = framing ? framing.vh * DEADZONE : 0;
    const tx = within(cx + beyond(pos.x - cx, dead, leash), 0, b), tz = within(cz + beyond(pos.z - cz, dead, leash), 0, b);
    cam.target.x = approach(cam.target.x, tx, k);
    cam.target.z = approach(cam.target.z, tz, k);
    if (!framing) cam.target.y = approach(cam.target.y, avatar.height * 0.5, k);
  }

  /** Slides the picture up by half the covered strip (in whole art pixels) so the room sits in the free area above the sheet. */
  function applyInset(dt: number) {
    const free = freeRect({ w: boxW, h: boxH }, { top: hudTop, bottom: sheetBottom + hidden(), right: dockInset });
    const want = boxH > 0 ? boxH - 2 * (free.top + free.h / 2) : 0; // where the middle of the free area is, against the middle of the screen (negative: slide the room down)
    const wantDock = boxW - free.w;
    const k = 1 - Math.exp(-dt * INSET_RATE);
    insetNow = reduced ? want : approach(insetNow, want, k);
    dockNow = reduced ? wantDock : approach(dockNow, wantDock, k);
    if (insetNow === 0 && dockNow === 0) return;
    const c = cam.camera, texel = cam.state.viewHeight / px.low.y;
    const snapped = (px: number, span: number, whole: number) => Math.round(((px / 2 / whole) * span) / texel) * texel;
    const down = snapped(insetNow, cam.state.viewHeight, boxH), left = snapped(dockNow, c.right - c.left, boxW);
    c.top -= down; c.bottom -= down; c.left += left; c.right += left;
    c.updateProjectionMatrix();
  }

  /** A tap walks in a straight line; when that runs head-on into a lamp post or a tree it would stand still, so sidestep until it is clear. */
  function stepAround(move: Walk): Walk {
    const next = resolvePosition({ x: pos.x + move.x, z: pos.z + move.z }, world), want = Math.hypot(move.x, move.z);
    if (!tap || want < 1e-6 || Math.hypot(next.x - pos.x, next.z - pos.z) >= 0.5 * want) return next;
    for (const a of SIDESTEPS) {
      const cos = Math.cos(a), sin = Math.sin(a);
      const cand = resolvePosition({ x: pos.x + move.x * cos - move.z * sin, z: pos.z + move.x * sin + move.z * cos }, world);
      if (Math.hypot(cand.x - pos.x, cand.z - pos.z) >= 0.6 * want) return cand;
    }
    return next;
  }

  function tick(dt: number) {
    const move = input(dt);
    const next = move ? stepAround(move) : pos;
    walking = Math.hypot(next.x - pos.x, next.z - pos.z) > 1e-4;
    if (walking) facing = turnToward(facing, Math.atan2(next.x - pos.x, next.z - pos.z), 1 - Math.exp(-dt * TURN_RATE));
    pos = next;
    avatar.setWalking(walking);
    world.update(t, dt);
    avatar.update(t, dt);
    const hopK = (t - hopAt) / HOP_SECONDS;
    avatar.group.position.set(pos.x, hopK >= 0 && hopK < 1 ? Math.sin(hopK * Math.PI) * HOP_HEIGHT : 0, pos.z);
    avatar.group.rotation.y = facing;
    checkGoal();
    if (!applyFrame()) follow(dt);
    updateFit(dt);
    cam.update(px.low.x / px.low.y, px.low.y);
    applyInset(dt);
    guide.update({ t, dt, hero: pos, cam: cam.camera, yaw: cam.state.yaw, viewHeight: cam.state.viewHeight, box: { w: boxW, h: boxH }, ins: { top: hudTop, bottom: sheetBottom + hidden(), right: dockInset } });
    syncMeshes();
  }

  function syncMeshes() {
    const revealK = reduced ? 1 : clamp01((t - revealAt) / revealLen);
    const prep = (g: GaussianMesh, reveal: number) => {
      g.uniforms.uTime.value = t;
      g.uniforms.uReveal.value = reveal;
      g.uniforms.uViewport.value.copy(px.low);
      g.sort(cam.camera);
    };
    world.meshes.forEach((g) => prep(g, revealOnly === null || revealOnly.includes(g) ? revealK : 1));
    avatar.meshes.forEach((g) => prep(g, 1));
    guide.meshes.forEach((g) => { if (g.mesh.parent?.visible) prep(g, 1); });
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
  let resizeTimer = 0;
  /** Rebuild the render targets only when the box really changed, and only once the browser UI has stopped moving. */
  const applySize = () => {
    if (disposed || (container.clientWidth === boxW && container.clientHeight === boxH)) return;
    boxW = container.clientWidth; boxH = container.clientHeight;
    px.resize();
    setFraming(world, true);
  };
  const onResize = () => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(applySize, RESIZE_MS); };
  const onInset = (e: Event) => {
    const d = (e as CustomEvent<{ bottom?: number; top?: number; right?: number }>).detail;
    sheetBottom = Math.max(0, d?.bottom ?? 0);
    hudTop = Math.max(0, d?.top ?? 0);
    dockInset = Math.max(0, d?.right ?? 0);
  };
  window.addEventListener(INSET_EVENT, onInset);
  const ro = new ResizeObserver(onResize);
  ro.observe(container);
  raf = requestAnimationFrame(frame);

  return {
    setWorld(next) {
      const changed = worldKey(next) !== worldKey(d);
      const prevScope = d.scope, sameScope = next.scope === prevScope;
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
      pos = resolvePosition(indoorScope(next.scope) !== indoorScope(prevScope) ? spawnFor(next.scope) : pos, world);
      if (!sameScope) tap = null; // a keepsake growing in must not stop a walk
      // same scope: swap at once and grow in only the new pieces; a new scope re-assembles the whole world
      revealOnly = sameScope ? (world.fresh ?? []) : null;
      revealLen = sameScope ? FRESH_SECONDS : REVEAL_SECONDS;
      revealAt = t;
      setFraming(world, false);
      walkFrame = false;
      const spot = goal ? world.spots.find((sp) => sp.id === goal?.id) : undefined;
      if (spot) frameWalk(spot);
    },
    world: () => d,
    setControls(on) {
      enabled = on;
      container.classList.toggle('ml-stage3d--walk', on);
      ctl.setEnabled(on);
      if (!on) tap = null;
    },
    goTo(id) {
      cancelGoal();
      const spot = world.spots.find((sp) => sp.id === id);
      if (!spot) return Promise.reject(new Error(`stage: no spot "${id}" in this world`));
      goalFrom = Math.hypot(pos.x - spot.x, pos.z - spot.z);
      if (goalFrom > spot.r) { guide.start(spot); frameWalk(spot); }
      return new Promise<void>((resolve, reject) => { goal = { id, resolve, reject }; });
    },
    clearGoal: cancelGoal,
    camera: () => ({ cam: cam.camera, state: cam.state, target: cam.target, hold(on: boolean) { hold = on; if (!on) { setFraming(world, false); if (goal) { const sp = world.spots.find((x) => x.id === goal?.id); if (sp) frameWalk(sp); } } } }),
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
      window.clearTimeout(resizeTimer);
      window.removeEventListener(INSET_EVENT, onInset);
      ctl.dispose();
      joy.dispose();
      cancelGoal();
      tasks.forEach((task) => task.resolve());
      tasks = [];
      world.dispose();
      avatar.dispose();
      guide.dispose();
      px.dispose();
      container.classList.remove('ml-stage3d');
    },
  };
}