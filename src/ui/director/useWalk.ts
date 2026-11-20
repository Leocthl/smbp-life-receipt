import { useCallback, useEffect, useState } from 'react';
import { scopeFor } from '../../world3d/descriptor';
import type { SpotId, StageApi } from '../../world3d/contracts';
import { currentEvent, type Session } from '../session';
import { walkTarget } from '../flow';

/**
 * Walk-to-decide: the first card of each turn asks the player to go to the place it is about (bank, office...).
 * Returns the spot while the player is walking there, or null when the card can open; `skip` opens it at once.
 */
export function useWalk(stage: StageApi | null, session: Session | null, enabled: boolean): { spot: SpotId | null; skip(): void } {
  const [arrived, setArrived] = useState('');
  const screen = session?.screen;
  const key = session ? `${session.state.turn}-${session.index}` : '';
  const spot = enabled && stage && session && screen?.kind === 'card' && session.index === 0
    ? walkTarget(currentEvent(screen.card).category, scopeFor(session.state))
    : null;
  const walking = spot !== null && arrived !== key;

  useEffect(() => {
    if (!walking || !stage || !spot) return undefined;
    let live = true;
    const done = () => { if (live) setArrived(key); };
    // a rejection means cancelled, or this world has no such spot: either way the card just opens
    stage.goTo(spot).then(done, done);
    return () => { live = false; stage.clearGoal(); };
  }, [walking, stage, spot, key]);

  const skip = useCallback(() => { stage?.clearGoal(); setArrived(key); }, [stage, key]);
  return { spot: walking ? spot : null, skip };
}
