import type { Collider } from './contracts';
import type { Scope } from './descriptor';
import type { Joystick, Stick } from './joystick';

export interface Walk { x: number; z: number }
export interface ResolvedWalk { pos: Walk; wrapX: number; wrapZ: number }

export const AVATAR_RADIUS = 0.35;
export const TAP_SLOP = 10; // px: a press that moves further is an orbit drag, not a tap
export const DEFAULT_PITCH = Math.atan(1 / Math.sqrt(2));
export const ORBIT_PITCH_MIN = 0.28;
export const ORBIT_PITCH_MAX = 0.98;
export const ORBIT_ZOOM_MIN = 0.72;
export const ORBIT_ZOOM_MAX = 1.45;

const ORBIT_YAW_SENS = 0.0085; // rad per px horizontal drag
const ORBIT_PITCH_SENS = 0.006; // rad per px vertical drag
const ORBIT_MAX_VEL_YAW = 6.5; // rad/s cap for gentle release inertia
const ORBIT_MAX_VEL_PITCH = 3.2; // rad/s cap
const WHEEL_SENS = 0.0012;

const KEY_DIRS: Record<string, readonly [number, number]> = {
  KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};

export interface ControlsOptions {
  container: HTMLElement;
  joystick: Joystick;
  groundAt(clientX: number, clientY: number): Walk | null;
  onTap(p: Walk): void;
  onOrbitStart?(): void;
  onOrbitDelta?(dYaw: number, dPitch: number): void;
  onOrbitEnd?(velYaw: number, velPitch: number): void;
  onZoomDelta?(factor: number): void;
}

export interface Controls {
  /** walk input in world space, length <= 1; yaw turns screen directions into world ones */
  walk(yaw: number): Walk;
  setEnabled(on: boolean): void;
  dispose(): void;
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/** Screen directions (x right, y up) to ground directions. The camera looks along (-sin yaw, -cos yaw). */
function toWorld(sx: number, sy: number, yaw: number): Walk {
  return { x: sx * Math.cos(yaw) - sy * Math.sin(yaw), z: -sx * Math.sin(yaw) - sy * Math.cos(yaw) };
}

function clamp(v: number, lim: number): number {
  return Math.max(-lim, Math.min(lim, v));
}

function clampRange(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Clamps absolute camera pitch to safe diorama viewing bounds (0.28..0.98 rad). */
export function clampPitch(pitch: number): number {
  return clampRange(pitch, ORBIT_PITCH_MIN, ORBIT_PITCH_MAX);
}

/** Clamps a pitch offset relative to basePitch so the final pitch stays in 0.28..0.98 rad. */
export function clampPitchOffset(offset: number, basePitch = DEFAULT_PITCH): number {
  return clampPitch(basePitch + offset) - basePitch;
}

/** Clamps the user zoom multiplier to 0.72..1.45. */
export function clampZoom(zoom: number): number {
  return clampRange(zoom, ORBIT_ZOOM_MIN, ORBIT_ZOOM_MAX);
}

/** Wraps an angle in radians into (-PI, PI] for shortest-arc reset springs. */
export function normalizeAngle(rad: number): number {
  const twoPi = Math.PI * 2;
  let a = ((rad + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  if (a <= -Math.PI) a += twoPi;
  return a;
}

/** At age 18 in the bedroom ('room' scope), walking is locked so the player feels constrained while still able to orbit 360°. */
export function isRoomLocked(scope: Scope | string): boolean {
  return scope === 'room';
}

/** Whether walking input is active for the given scope and controls flag. */
export function canWalkInScope(scope: Scope | string, controlsEnabled: boolean): boolean {
  return controlsEnabled && !isRoomLocked(scope);
}

/** Whether the scope uses seamless toroidal looping wrap (outdoor grown-up worlds). */
export function isLoopingScope(scope: Scope | string): boolean {
  return scope === 'block' || scope === 'district' || scope === 'city';
}

function wrapCoord(v: number, bounds: number): { value: number; delta: number } {
  const span = 2 * bounds;
  let value = v;
  let delta = 0;
  if (span <= 0) return { value, delta };
  while (value > bounds) { value -= span; delta -= span; }
  while (value < -bounds) { value += span; delta += span; }
  return { value, delta };
}

/**
 * Resolves colliders and world bounds. When wrap is true (outdoor open-world scopes), crossing ±bounds wraps
 * seamlessly to the opposite side and returns the exact wrap delta so the camera target can shift on the same frame.
 */
export function resolvePositionWithWrap(
  p: Walk,
  world: { colliders: readonly Collider[]; bounds: number },
  wrap = false,
): ResolvedWalk {
  let { x, z } = p;
  let wrapX = 0;
  let wrapZ = 0;

  if (wrap && world.bounds > 0) {
    const wx = wrapCoord(x, world.bounds);
    const wz = wrapCoord(z, world.bounds);
    x = wx.value; wrapX += wx.delta;
    z = wz.value; wrapZ += wz.delta;
  }

  for (const c of world.colliders) {
    const dx = x - c.x, dz = z - c.z, min = c.r + AVATAR_RADIUS, dist = Math.hypot(dx, dz);
    if (dist < min && dist > 1e-6) { x = c.x + (dx / dist) * min; z = c.z + (dz / dist) * min; }
  }

  if (wrap && world.bounds > 0) {
    const wx = wrapCoord(x, world.bounds);
    const wz = wrapCoord(z, world.bounds);
    x = wx.value; wrapX += wx.delta;
    z = wz.value; wrapZ += wz.delta;
    return { pos: { x, z }, wrapX, wrapZ };
  }

  const lim = world.bounds - AVATAR_RADIUS;
  return { pos: { x: clamp(x, lim), z: clamp(z, lim) }, wrapX: 0, wrapZ: 0 };
}

/** Pushes a position out of every collider and keeps it inside the walkable square (or wraps toroidally when wrap=true). */
export function resolvePosition(
  p: Walk,
  world: { colliders: readonly Collider[]; bounds: number },
  wrap = false,
): Walk {
  return resolvePositionWithWrap(p, world, wrap).pos;
}

interface PressState {
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  lastT: number;
  id: number;
  dragging: boolean;
  velYaw: number;
  velPitch: number;
}

export function createControls(o: ControlsOptions): Controls {
  const keys = new Set<string>();
  let enabled = true;
  let press: PressState | null = null;

  const isIgnoredTarget = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest('.ml-stage-joy, .ml-stage-reset'));

  const onKeyDown = (e: KeyboardEvent) => {
    if (!enabled || isTyping(e.target) || !(e.code in KEY_DIRS)) return;
    e.preventDefault();
    keys.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => { keys.delete(e.code); };
  const onBlur = () => {
    keys.clear();
    if (press?.dragging) o.onOrbitEnd?.(0, 0);
    press = null;
  };

  // Orbit drag works even when character walking is disabled (e.g. card open or stationary age-18 room).
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (press !== null || isIgnoredTarget(e.target)) return;
    press = {
      x: e.clientX, y: e.clientY,
      lastX: e.clientX, lastY: e.clientY,
      lastT: performance.now(),
      id: e.pointerId,
      dragging: false,
      velYaw: 0,
      velPitch: 0,
    };
  };

  const onMove = (e: PointerEvent) => {
    if (!press || press.id !== e.pointerId) return;
    const now = performance.now();
    if (!press.dragging) {
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) <= TAP_SLOP) return;
      press.dragging = true;
      press.lastX = e.clientX;
      press.lastY = e.clientY;
      press.lastT = now;
      o.onOrbitStart?.();
      return;
    }
    const dx = e.clientX - press.lastX;
    const dy = e.clientY - press.lastY;
    const dtSec = Math.max(0.004, (now - press.lastT) / 1000);
    const dYaw = -dx * ORBIT_YAW_SENS;
    const dPitch = dy * ORBIT_PITCH_SENS;
    press.velYaw = press.velYaw * 0.45 + (dYaw / dtSec) * 0.55;
    press.velPitch = press.velPitch * 0.45 + (dPitch / dtSec) * 0.55;
    press.lastX = e.clientX;
    press.lastY = e.clientY;
    press.lastT = now;
    if (dYaw !== 0 || dPitch !== 0) o.onOrbitDelta?.(dYaw, dPitch);
  };

  const finishPress = (e: PointerEvent, allowTap: boolean) => {
    const p = press;
    if (!p || p.id !== e.pointerId) return;
    press = null;
    if (p.dragging) {
      const stale = performance.now() - p.lastT > 80;
      const vx = stale ? 0 : clamp(p.velYaw, ORBIT_MAX_VEL_YAW);
      const vy = stale ? 0 : clamp(p.velPitch, ORBIT_MAX_VEL_PITCH);
      o.onOrbitEnd?.(vx, vy);
      return;
    }
    if (!allowTap || !enabled || Math.hypot(e.clientX - p.x, e.clientY - p.y) > TAP_SLOP) return;
    const ground = o.groundAt(e.clientX, e.clientY);
    if (ground) o.onTap(ground);
  };

  const onUp = (e: PointerEvent) => finishPress(e, true);
  const onCancel = (e: PointerEvent) => finishPress(e, false);

  const onWheel = (e: WheelEvent) => {
    if (isIgnoredTarget(e.target)) return;
    e.preventDefault();
    const raw = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 200 : e.deltaY;
    const clamped = clamp(raw, 180);
    if (clamped !== 0) o.onZoomDelta?.(Math.exp(clamped * WHEEL_SENS));
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  o.container.addEventListener('pointerdown', onDown);
  o.container.addEventListener('wheel', onWheel, { passive: false });

  return {
    walk(yaw) {
      let sx = 0, sy = 0;
      if (enabled) for (const k of keys) { const [dx, dy] = KEY_DIRS[k]; sx += dx; sy += dy; }
      const j: Stick = enabled ? o.joystick.read() : { x: 0, y: 0 };
      sx += j.x; sy += j.y;
      const len = Math.hypot(sx, sy), s = len > 1 ? 1 / len : 1;
      return toWorld(sx * s, sy * s, yaw);
    },
    setEnabled(on) {
      enabled = on;
      if (!on) keys.clear();
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      o.container.removeEventListener('pointerdown', onDown);
      o.container.removeEventListener('wheel', onWheel);
    },
  };
}
