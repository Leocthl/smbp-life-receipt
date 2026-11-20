import { ALL_EVENTS } from '../data/events';
import { drawCards, eventById, resolveChoice, type Card } from '../engine/events';
import { newGame } from '../engine/sim';
import { endTurn } from '../engine/turn';
import type { ChoiceResult, GameEvent, GameState, Goal, TraitId, TurnSummary } from '../engine/types';

/** What the screen shows. The session is a small state machine over the pure engine. */
export type Screen =
  | { kind: 'start' }
  | { kind: 'intro' }
  | { kind: 'card'; card: Card }
  | { kind: 'result'; card: Card; result: ChoiceResult }
  | { kind: 'summary'; summary: TurnSummary }
  | { kind: 'goal' }
  | { kind: 'ending'; goal: Goal };

export interface Session {
  state: GameState;
  cards: Card[];
  index: number;
  screen: Screen;
  /** notices and reveals from turns that ended without a year-end summary (uni first semester) */
  carried: { notices: string[]; reveals: TraitId[] };
}

export const EVENTS: readonly GameEvent[] = ALL_EVENTS;

export function startSession(seed: number): Session {
  return { state: newGame(seed), cards: [], index: 0, screen: { kind: 'intro' }, carried: { notices: [], reveals: [] } };
}

/** Draw this turn's cards; if there are none, end the turn straight away. */
export function beginTurn(s: Session): Session {
  const { state, cards } = drawCards(s.state, EVENTS);
  const next = { ...s, state, cards, index: 0 };
  return cards.length ? { ...next, screen: { kind: 'card', card: cards[0] } } : finishTurn(next);
}

export function choose(s: Session, choiceId: string): Session {
  if (s.screen.kind !== 'card') return s;
  const card = s.screen.card;
  const { state, result } = resolveChoice(s.state, EVENTS, card.eventId, choiceId);
  return { ...s, state, screen: { kind: 'result', card, result } };
}

/** After a result: next card, or end the turn. */
export function advance(s: Session): Session {
  const i = s.index + 1;
  if (i < s.cards.length) return { ...s, index: i, screen: { kind: 'card', card: s.cards[i] } };
  return finishTurn(s);
}

function finishTurn(s: Session): Session {
  const { state, summary } = endTurn(s.state);
  const merged: TurnSummary = {
    ...summary,
    notices: [...s.carried.notices, ...summary.notices],
    reveals: [...s.carried.reveals, ...summary.reveals],
  };
  const base = { ...s, state, cards: [], index: 0 };
  if (summary.yearEnd || state.done) return { ...base, carried: { notices: [], reveals: [] }, screen: { kind: 'summary', summary: merged } };
  return beginTurn({ ...base, carried: { notices: merged.notices, reveals: merged.reveals } });
}

/** After the year-end summary: next turn, or the "what did you want" question before the ending. */
export function afterSummary(s: Session): Session {
  return s.state.done ? { ...s, screen: { kind: 'goal' } } : beginTurn(s);
}

export function pickGoal(s: Session, goal: Goal): Session {
  return { ...s, screen: { kind: 'ending', goal } };
}

export function currentEvent(card: Card): GameEvent {
  return eventById(EVENTS, card.eventId);
}
