import { useCallback, useEffect, useRef } from 'react';
import { instantText } from './useTypewriter';

const GAP_MS = 140;

/** Run a function after a short beat between bubbles (no beat when text is instant); cancelled on unmount. */
export function useBeat(): (fn: () => void) => void {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback((fn) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, instantText() ? 0 : GAP_MS);
  }, []);
}
