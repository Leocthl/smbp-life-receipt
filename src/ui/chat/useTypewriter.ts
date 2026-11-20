import { useEffect, useRef, useState } from 'react';

const MS_PER_CHAR = 16;
const CAP_MS = 520;
const TICK_MS = 30;

/**
 * Text appears instantly under reduced motion, and in automated browsers (so the e2e run does not wait on typing;
 * add ?typing=1 to see the typewriter there). Otherwise it types fast and a tap on the thread finishes it.
 */
export function instantText(): boolean {
  const q = new URLSearchParams(window.location.search);
  if (q.get('typing') === '1') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.webdriver === true;
}

/** How many characters of `text` are showing. `skipTick` changing jumps to the end. */
export function useTypewriter(text: string, skipTick: number): { shown: string; done: boolean } {
  const chars = Array.from(text);
  const [n, setN] = useState(() => (instantText() ? chars.length : 0));
  const lastSkip = useRef(skipTick);
  useEffect(() => {
    if (n >= chars.length) return undefined;
    const started = performance.now();
    const duration = Math.min(CAP_MS, chars.length * MS_PER_CHAR);
    const id = setInterval(() => {
      const p = Math.min(1, (performance.now() - started) / duration);
      setN(Math.ceil(chars.length * p));
      if (p >= 1) clearInterval(id);
    }, TICK_MS);
    return () => clearInterval(id);
    // restarting on n would reset the clock; the interval owns its own progress
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  useEffect(() => {
    if (lastSkip.current !== skipTick) { lastSkip.current = skipTick; setN(chars.length); }
  }, [skipTick, chars.length]);
  return { shown: chars.slice(0, n).join(''), done: n >= chars.length };
}
