import { useSyncExternalStore } from 'react';
import { startAmbient, stopAmbient } from './ambient';
import { applyMute, applyVisibility, unlock } from './engine';
import { isMuted, setMutedFlag, subscribeMuted } from './store';

import { play } from './sfx';
export { play, playFanfare, type EndingTone, type SfxName } from './sfx';
export { isMuted };

export const useMuted = (): boolean => useSyncExternalStore(subscribeMuted, isMuted, isMuted);

/** Flip the sound switch; the master gain drops to zero in the same tick, so it is instant. */
export function setMuted(next: boolean): void {
  setMutedFlag(next);
  applyMute(next);
  if (next) stopAmbient();
  else startAmbient();
}

/**
 * Wire the page: the first tap or key unlocks audio (iOS needs this), a hidden tab suspends it, and a click anywhere
 * on a button gives the soft UI click. Returns the cleanup.
 */
export function installAudio(): () => void {
  const onGesture = () => { unlock(); if (!isMuted()) startAmbient(); };
  const onVisibility = () => {
    applyVisibility(document.hidden);
    if (document.hidden) stopAmbient();
    else if (!isMuted()) startAmbient();
  };
  const onDown = (e: Event) => {
    onGesture();
    const el = e.target instanceof Element ? e.target.closest('button, [role=button]') : null;
    // the sound switch makes its own sound (or deliberate silence)
    if (el && !el.hasAttribute('data-quiet')) play('click');
  };
  window.addEventListener('pointerdown', onDown, { capture: true });
  window.addEventListener('keydown', onGesture, { capture: true });
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    window.removeEventListener('pointerdown', onDown, { capture: true });
    window.removeEventListener('keydown', onGesture, { capture: true });
    document.removeEventListener('visibilitychange', onVisibility);
    stopAmbient();
  };
}
