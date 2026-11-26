import { useEffect, useRef, useState } from 'react';
import { TWEEN_MS, tweenValue } from './tween';

const params = new URLSearchParams(window.location.search);
/** Test robots read the HUD text straight after a click, so the counters snap for them (?juice=1 turns the motion back on). */
const snaps = navigator.webdriver && params.get('juice') !== '1';
export const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The number to show: glides from the old value to `target` over ~500 ms, easing out. */
export function useTween(target: number, ms: number = TWEEN_MS): number {
  const [shown, setShown] = useState(target);
  const raf = useRef(0);
  const live = useRef(target);
  live.current = shown;
  useEffect(() => {
    if (snaps || reducedMotion()) { setShown(target); return undefined; }
    const start = performance.now();
    const origin = live.current;
    const tick = (now: number) => {
      setShown(tweenValue(origin, target, now - start, ms));
      if (now - start < ms) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, ms]);
  return shown;
}

export interface Change { /** signed change since the previous value, 0 when none */ delta: number; /** bumps on each change so CSS animations replay */ n: number }

/** Reports each change of `value` for `holdMs`, then goes quiet. The first value is not a change. */
export function useChange(value: number, holdMs = 1500): Change {
  const prev = useRef(value);
  const n = useRef(0);
  const timer = useRef(0);
  const [change, setChange] = useState<Change>({ delta: 0, n: 0 });
  useEffect(() => {
    if (value === prev.current) return;
    const delta = value - prev.current;
    prev.current = value;
    n.current += 1;
    setChange({ delta, n: n.current });
    window.clearTimeout(timer.current);
    const mine = n.current;
    timer.current = window.setTimeout(() => setChange((c) => (c.n === mine ? { delta: 0, n: c.n } : c)), holdMs);
  }, [value, holdMs]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return change;
}

/** A short buzz on a confirm, on phones only and never for people who asked for less motion. */
export function haptic(ms: number | number[] = 10): void {
  if (reducedMotion()) return;
  try { navigator.vibrate?.(ms); } catch { /* not allowed here */ }
}
