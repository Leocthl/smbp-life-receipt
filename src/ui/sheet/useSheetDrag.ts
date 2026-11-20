import { useRef, type HTMLAttributes, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { INSET_EVENT } from '../../world3d/stage';
import { HUD_CLEAR_PX, settleSnap, type Heights, type Snap } from './snaps';

const DRAG_SLOP = 6; // px a press must travel before it is a drag and not a tap
const VELOCITY_WINDOW_MS = 100;

/** bottom: px the sheet covers; top: px the HUD covers while a sheet is up; right: a docked side panel (desktop). The stage centres the room between them. */
export const emitInset = (bottom: number, top = bottom > 0 ? HUD_CLEAR_PX : 0, right = 0) => window.dispatchEvent(new CustomEvent(INSET_EVENT, { detail: { bottom, top, right } }));

interface Drag { id: number; y0: number; h0: number; moved: boolean; samples: { t: number; y: number }[]; heights: Heights }
type Bind = Pick<HTMLAttributes<HTMLElement>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'>;

/**
 * Drag the sheet by anything marked data-grab (the handle, Slip's header, a receipt's top edge). Height is the CSS var --ml-sheet-h in px
 * while dragging; on release the var is removed, a fling picks the snap, and CSS animates to it.
 */
export function useSheetDrag(ref: RefObject<HTMLElement>, on: boolean, heights: () => Heights, choose: (s: Snap) => void, topInset: () => number): Bind {
  const drag = useRef<Drag | null>(null);
  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!on || !el || e.button > 0 || !(e.target as Element).closest('[data-grab]')) return;
    drag.current = { id: e.pointerId, y0: e.clientY, h0: el.getBoundingClientRect().height, moved: false, samples: [{ t: e.timeStamp, y: e.clientY }], heights: heights() };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current, el = ref.current;
    if (!d || !el || e.pointerId !== d.id) return;
    if (!d.moved && Math.abs(e.clientY - d.y0) < DRAG_SLOP) return;
    if (!d.moved) { d.moved = true; el.setPointerCapture(e.pointerId); el.dataset.drag = '1'; }
    const h = Math.max(d.heights.peek * 0.8, Math.min(d.heights.full, d.h0 + d.y0 - e.clientY));
    el.style.setProperty('--ml-sheet-h', `${h}px`);
    emitInset(h, topInset());
    d.samples = [...d.samples.filter((s) => e.timeStamp - s.t < VELOCITY_WINDOW_MS), { t: e.timeStamp, y: e.clientY }];
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current, el = ref.current;
    drag.current = null;
    if (!d || !el || !d.moved) return;
    const first = d.samples[0], dt = e.timeStamp - first.t;
    const v = dt > 0 ? (first.y - e.clientY) / dt : 0;
    const next = settleSnap(el.getBoundingClientRect().height, v, d.heights);
    delete el.dataset.drag;
    el.style.removeProperty('--ml-sheet-h');
    choose(next);
    emitInset(d.heights[next], topInset());
  };
  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}
