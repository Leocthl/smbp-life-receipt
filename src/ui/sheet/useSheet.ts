import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { BAR_PX, HUD_CLEAR_PX, WALK_INSET_PX, cycleSnap, snapHeights, stepSnap, type Snap } from './snaps';
import { emitInset, useSheetDrag } from './useSheetDrag';

const WIDE = '(min-width: 900px)';

/** The player's last own choice, kept for the rest of the session so the next slip opens the same way. */
let remembered: Snap | null = null;

const safeBottom = (el: HTMLElement | null) => (el ? parseFloat(getComputedStyle(el).paddingBottom) || 0 : 0);
/** The notch / status bar: the HUD sits below it, so the sheet's full height leaves that room too. */
function safeTop(): number {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;visibility:hidden;padding-top:env(safe-area-inset-top)';
  document.body.append(probe);
  const px = probe.offsetHeight;
  probe.remove();
  return px;
}

export interface SheetApi {
  snap: Snap;
  /** false on desktop, where the slip is docked at the side */
  on: boolean;
  /** pointer handlers for the slip element: drag by the handle or Slip's header */
  bind: ReturnType<typeof useSheetDrag>;
  cycle(): void;
  step(dir: 1 | -1): void;
  /** a slip reports the content height it wants; the sheet opens full when half is not enough */
  fit(contentPx: number): void;
}

/**
 * The phone's bottom sheet: three snaps (peek, half, full), drag with fling, tap and arrow keys.
 * Height lives in CSS (data-snap). The stage hears the covered height through INSET_EVENT and re-centres the room in the free area.
 */
export function useSheet(ref: RefObject<HTMLElement>, active: boolean, slipKey: string, walking = false): SheetApi {
  const [snap, setSnap] = useState<Snap>(remembered ?? 'half');
  const [need, setNeed] = useState(0);
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  const manual = useRef(remembered !== null);
  const on = active && !wide;

  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const change = () => setWide(mq.matches);
    mq.addEventListener('change', change);
    return () => mq.removeEventListener('change', change);
  }, []);

  useEffect(() => { // every new slip starts from the player's own preference, else half
    setNeed(0);
    setSnap(remembered ?? 'half');
    manual.current = remembered !== null;
  }, [slipKey]);

  const heights = useCallback(() => snapHeights(window.innerHeight, safeBottom(ref.current), safeTop()), [ref]);
  const topInset = useCallback(() => HUD_CLEAR_PX + safeTop(), []);

  useEffect(() => { // no choice made yet: open full when the replies do not fit at half
    if (!on || manual.current || need === 0) return;
    setSnap(need + BAR_PX + safeBottom(ref.current) > heights().half ? 'full' : 'half');
  }, [need, on, ref, heights]);

  useEffect(() => { // tell the stage how much of the screen the sheet (or, on a walk, the prompt) covers
    if (!on) { // desktop: the slip is docked on the right, so the room is centred in what is left
      const dock = active && wide && ref.current ? window.innerWidth - ref.current.offsetLeft : 0; // offsetLeft ignores the slide-in transform
      const phoneWalk = walking && !wide;
      emitInset(phoneWalk ? WALK_INSET_PX : 0, phoneWalk ? topInset() : 0, dock);
      return undefined;
    }
    const send = () => emitInset(heights()[snap], topInset());
    send();
    window.addEventListener('resize', send);
    return () => window.removeEventListener('resize', send);
  }, [on, active, wide, walking, snap, heights, topInset, ref, slipKey]);

  const choose = useCallback((s: Snap) => { remembered = s; manual.current = true; setSnap(s); }, []);
  const bind = useSheetDrag(ref, on, heights, choose, topInset);

  return {
    snap, on, bind,
    cycle: () => choose(cycleSnap(snap)),
    step: (dir) => choose(stepSnap(snap, dir)),
    fit: useCallback((px: number) => setNeed((n) => (Math.abs(n - px) < 2 ? n : px)), []),
  };
}
