import { useEffect } from 'react';
import { availableChoices } from '../../engine/events';
import { availableDynamicChoices } from '../../engine/procedural';
import { advance, afterSummary, beginTurn, choose, chooseDynamic, currentEvent, pickGoal, type Session } from '../session';

/** Dev only: ?fast=<age> plays the first choice of every card until the life reaches that age (99 plays it to the end). */
export const FAST_AGE = import.meta.env.DEV ? Number(new URLSearchParams(window.location.search).get('fast')) || 0 : 0;

export function isFasting(s: Session | null): boolean {
  return FAST_AGE > 0 && s !== null && s.screen.kind !== 'ending' && s.state.age < FAST_AGE;
}

function step(s: Session): Session {
  const screen = s.screen;
  switch (screen.kind) {
    case 'intro': return beginTurn(s);
    case 'card': return choose(s, availableChoices(s.state, currentEvent(screen.card))[0].id);
    case 'dynamic': return screen.result ? advance(s) : chooseDynamic(s, availableDynamicChoices(s.state, screen.event)[0].id);
    case 'result': return advance(s);
    case 'summary': return afterSummary(s);
    case 'goal': return pickGoal(s, 'security');
    default: return s;
  }
}

export function useFast(session: Session | null, setSession: (s: Session) => void): void {
  const fasting = isFasting(session);
  useEffect(() => {
    if (!fasting || !session) return undefined;
    const id = window.setTimeout(() => setSession(step(session)), 0);
    return () => window.clearTimeout(id);
  }, [fasting, session, setSession]);
}
