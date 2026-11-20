import type { Collider } from './contracts';
import type { Joystick, Stick } from './joystick';

export interface Walk { x: number; z: number }

export const AVATAR_RADIUS = 0.35;
const KEY_DIRS: Record<string, readonly [number, number]> = {
  KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
const TAP_SLOP = 10; // px: a press that moves further is a drag, not a tap

export interface ControlsOptions {
  container: HTMLElement;
  joystick: Joystick;
  groundAt(clientX: number, clientY: number): Walk | null;
  onTap(p: Walk): void;
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

/** Pushes a position out of every collider and keeps it inside the walkable square. */
export function resolvePosition(p: Walk, world: { colliders: readonly Collider[]; bounds: number }): Walk {
  let { x, z } = p;
  for (const c of world.colliders) {
    const dx = x - c.x, dz = z - c.z, min = c.r + AVATAR_RADIUS, dist = Math.hypot(dx, dz);
    if (dist < min && dist > 1e-6) { x = c.x + (dx / dist) * min; z = c.z + (dz / dist) * min; }
  }
  const lim = world.bounds - AVATAR_RADIUS;
  return { x: clamp(x, lim), z: clamp(z, lim) };
}

export function createControls(o: ControlsOptions): Controls {
  const keys = new Set<string>();
  let enabled = true;
  let press: { x: number; y: number; id: number } | null = null;

  const onKeyDown = (e: KeyboardEvent) => {
    if (!enabled || isTyping(e.target) || !(e.code in KEY_DIRS)) return;
    e.preventDefault();
    keys.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => { keys.delete(e.code); };
  const onBlur = () => keys.clear();
  const onDown = (e: PointerEvent) => {
    if (!(e.target instanceof Element && e.target.closest('.ml-stage-joy'))) press = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onUp = (e: PointerEvent) => {
    const p = press;
    press = null;
    if (!enabled || !p || p.id !== e.pointerId || Math.hypot(e.clientX - p.x, e.clientY - p.y) > TAP_SLOP) return;
    const ground = o.groundAt(e.clientX, e.clientY);
    if (ground) o.onTap(ground);
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  o.container.addEventListener('pointerdown', onDown);
  o.container.addEventListener('pointerup', onUp);

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
      if (!on) { keys.clear(); press = null; }
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      o.container.removeEventListener('pointerdown', onDown);
      o.container.removeEventListener('pointerup', onUp);
    },
  };
}
