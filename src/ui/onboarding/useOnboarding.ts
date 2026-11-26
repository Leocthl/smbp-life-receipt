import { useCallback, useRef, useState } from 'react';

const KEY = 'ml-onboarded';
const params = new URLSearchParams(window.location.search);
const forced = params.get('tutorial') === '1';

/** Test robots skip the intro (it would sit in front of every click) unless ?tutorial=1 asks for it. */
export function wantsTutorial(): boolean {
  if (forced) return true;
  if (navigator.webdriver) return false;
  try {
    return localStorage.getItem(KEY) !== '1';
  } catch {
    return false; // storage blocked: never nag on every life
  }
}

function remember(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // not remembered; it will show again next visit
  }
}

export type Panel = 'none' | 'intro' | 'help';

/** Which panel is open: the 3-beat intro (once, on the first card of the first life), or the help dialog (the "?" button). */
export function useOnboarding() {
  const [panel, setPanel] = useState<Panel>('none');
  const [step, setStep] = useState(0);
  const offered = useRef(false);

  /** Call when the first card is on screen: opens the intro if this player has not seen it. */
  const offer = useCallback(() => {
    if (offered.current) return;
    offered.current = true;
    if (wantsTutorial()) { setStep(0); setPanel('intro'); }
  }, []);
  const finish = useCallback(() => { remember(); setPanel('none'); }, []);
  const replay = useCallback(() => { setStep(0); setPanel('intro'); }, []);
  return { panel, step, setStep, offer, finish, replay, openHelp: () => setPanel('help'), closeHelp: () => setPanel('none') };
}
