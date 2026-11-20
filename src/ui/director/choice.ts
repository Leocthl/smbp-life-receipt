import { regimeForTurn } from '../../engine/market';
import { currentEvent, choose, rememberMini, type Session } from '../session';
import { pickMiniGame } from '../flow';
import type { MiniGameId } from '../minigames/types';

/** Resolve a choice; when it belongs to a mini-game, `mini` says which one to run before the result is shown. */
export function resolveWithMini(s: Session, choiceId: string, enabled: boolean): { next: Session; mini: MiniGameId | null } {
  const next = choose(s, choiceId);
  if (!enabled || s.screen.kind !== 'card') return { next, mini: null };
  const event = currentEvent(s.screen.card);
  const choice = event.choices.find((c) => c.id === choiceId);
  const { market, turn, age } = s.state;
  const mini = choice ? pickMiniGame({ event, choice, regime: regimeForTurn(market, Math.min(turn, market.levels.cash.length - 1)), age, last: s.minis }) : null;
  return { next: mini ? rememberMini(next, mini) : next, mini };
}
