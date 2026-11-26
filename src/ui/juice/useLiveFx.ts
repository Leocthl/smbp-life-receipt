import { useEffect, useRef } from 'react';
import type { SpotId, StageApi } from '../../world3d/contracts';
import { play } from '../audio';

const TYPING_POLL_MS = 80;
const STEP_DISTANCE = 1.2; // WALK_SPEED is 3.2 units a second, so about 2.7 steps a second

/** Slip's receipt printer: a tick for as long as a bubble is still typing in (the typewriter keeps its unrevealed text in .ml-chat__ghost). */
export function usePrinterChatter(on: boolean): void {
  useEffect(() => {
    if (!on) return undefined;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const ghost = document.querySelector('.ml-chat__ghost');
      if (ghost && ghost.textContent) play('printer');
    }, TYPING_POLL_MS);
    return () => window.clearInterval(id);
  }, [on]);
}

/**
 * Footsteps while the avatar really moves toward `spot` (one tick per STEP_DISTANCE walked), and a sparkle on arrival.
 * `skipped` is a ref the caller sets when the player skips the walk, so a skip does not sparkle.
 */
export function useWalkSounds(stage: StageApi | null, spot: SpotId | null, skipped: { current: boolean }): void {
  const was = useRef<SpotId | null>(null);
  useEffect(() => {
    if (was.current && !spot && !skipped.current) play('sparkle');
    if (spot) skipped.current = false;
    was.current = spot;
  }, [spot, skipped]);

  useEffect(() => {
    if (!stage || !spot) return undefined;
    let raf = 0;
    let last: { x: number; z: number } | null = null;
    let walked = 0;
    const tick = () => {
      const p = stage.avatar().group.position;
      if (last) {
        walked += Math.hypot(p.x - last.x, p.z - last.z);
        if (walked >= STEP_DISTANCE) { walked = 0; play('step'); }
      }
      last = { x: p.x, z: p.z };
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage, spot]);
}
