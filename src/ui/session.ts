import { ALL_EVENTS } from '../data/events';
import { drawCards, eventById, resolveChoice, type Card } from '../engine/events';
import { newGame } from '../engine/sim';
import { endTurn } from '../engine/turn';
import type { ChoiceResult, GameEvent, GameState, Goal, TraitId, TurnSummary } from '../engine/types';
import { qualities, type Qualities } from '../world3d/qualities';
import type { MiniGameId } from './minigames/types';
import { setCategoryLookup } from '../world3d/descriptor';

/** One decision and what it did to the six qualities (shown on the hexagon and the trail). */
export interface TrailEntry { turn: number; age: number; eventId: string; choiceId: string; before: Qualities; after: Qualities }

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
  /** every decision with its before/after qualities, oldest first */
  trail: TrailEntry[];
  /** the six qualities when this year began (for the year-end cutscene's before/after) */
  yearStart: Qualities;
  /** age at which each mini-game last ran, so they do not repeat too often */
  minis: Partial<Record<MiniGameId, number>>;
}

export const EVENTS: readonly GameEvent[] = ALL_EVENTS;
setCategoryLookup((id) => ALL_EVENTS.find((e) => e.id === id)?.category ?? 'daily');

export function startSession(seed: number): Session {
  const state = newGame(seed);
  return { state, cards: [], index: 0, screen: { kind: 'intro' }, carried: { notices: [], reveals: [] }, trail: [], yearStart: qualities(state), minis: {} };
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
  const entry: TrailEntry = { turn: s.state.turn, age: s.state.age, eventId: card.eventId, choiceId, before: qualities(s.state), after: qualities(state) };
  return { ...s, state, trail: [...s.trail, entry], screen: { kind: 'result', card, result } };
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
  return s.state.done ? { ...s, screen: { kind: 'goal' } } : beginTurn({ ...s, yearStart: qualities(s.state) });
}

export function pickGoal(s: Session, goal: Goal): Session {
  return { ...s, screen: { kind: 'ending', goal } };
}

/** Remember that a mini-game ran now, so its cooldown starts. */
export function rememberMini(s: Session, id: MiniGameId): Session {
  return { ...s, minis: { ...s.minis, [id]: s.state.age } };
}

/**
 * A mini-game is a learning moment, never a money one: the score only nudges happiness (0..+3), so cash,
 * net worth and the balance of the bots are untouched. Pure: returns a new state.
 */
export function withMiniBonus(state: GameState, score: number): GameState {
  const bonus = Math.round(Math.max(0, Math.min(1, score)) * 3);
  return { ...state, happiness: Math.min(100, state.happiness + bonus) };
}

export function applyMiniScore(s: Session, score: number): Session {
  return { ...s, state: withMiniBonus(s.state, score) };
}

export function currentEvent(card: Card): GameEvent {
  return eventById(EVENTS, card.eventId);
}
