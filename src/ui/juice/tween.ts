// Pure number-tween maths for the HUD counters (the hook that drives it lives in useTween.ts).

export const TWEEN_MS = 500;

export const easeOutCubic = (t: number): number => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

/** The value shown `elapsed` ms into a tween from `from` to `to`; lands exactly on `to` at the end. */
export function tweenValue(from: number, to: number, elapsed: number, duration: number = TWEEN_MS): number {
  if (duration <= 0 || elapsed >= duration) return to;
  return from + (to - from) * easeOutCubic(elapsed / duration);
}
