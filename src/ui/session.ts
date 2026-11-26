import { ALL_EVENTS } from '../data/events';
import { drawCards, eventById, resolveChoice, type Card } from '../engine/events';
import { applyFreeAction, type FreeActionOption, type FreeActionResult } from '../engine/freeChoice';
import { shouldFastForwardQuietYear } from '../engine/pacing';
import {
  generateDynamicEvent,
  resolveDynamicChoice,
  shouldInjectDynamicEvent,
  type DynamicEvent,
  type DynamicResult,
} from '../engine/procedural';
import { newGame } from '../engine/sim';
import { endTurn } from '../engine/turn';
import type { Category, ChoiceResult, GameEvent, GameState, Goal, TraitId, TurnSummary } from '../engine/types';
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
  | { kind: 'dynamic'; event: DynamicEvent; result: DynamicResult | null }
  | { kind: 'summary'; summary: TurnSummary; fromAge?: number; skippedYears?: number }
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
  /** procedural encounter queued after this turn's preset cards */
  pendingDynamic: DynamicEvent | null;
  /** player-initiated free-roam actions remaining this year */
  freeActionsLeft: number;
  /** monotonic nonce for procedural random encounters */
  dynNonce: number;
}

const FREE_SPOT_CATEGORY: Record<string, Category> = {
  bank: 'investing', office: 'career', clinic: 'health', cafe: 'friends',
  home: 'family', campus: 'career', market: 'daily', park: 'health', pier: 'daily', mystery: 'daily',
};

const DYN_TEMPLATE_CATEGORY: Record<string, Category> = {
  flash_ipo: 'investing', popup_pitch: 'friends', rush_gig: 'career', typhoon_bonus: 'daily',
  meme_rumor: 'investing', rebate_windfall: 'daily', ticket_flip: 'friends', urgent_repair: 'housing',
  promo_deposit: 'investing', weekend_escape: 'friends', family_surprise: 'family', bootcamp_flash: 'career',
};

export const EVENTS: readonly GameEvent[] = ALL_EVENTS;
setCategoryLookup((id) => {
  if (id.startsWith('free_')) return FREE_SPOT_CATEGORY[id.slice(5)] ?? 'daily';
  if (id.startsWith('dyn_')) return DYN_TEMPLATE_CATEGORY[id.slice(4)] ?? 'daily';
  return ALL_EVENTS.find((e) => e.id === id)?.category ?? 'daily';
});

export function startSession(seed: number): Session {
  const state = newGame(seed);
  return {
    state,
    cards: [],
    index: 0,
    screen: { kind: 'intro' },
    carried: { notices: [], reveals: [] },
    trail: [],
    yearStart: qualities(state),
    minis: {},
    pendingDynamic: null,
    freeActionsLeft: 2,
    dynNonce: 0,
  };
}

/** Draw this turn's cards (and optionally queue a procedural event); if none, fast-forward or end the turn. */
export function beginTurn(s: Session): Session {
  return beginTurnStep(s, 0, undefined);
}

function beginTurnStep(s: Session, quietCount: number, quietFromAge: number | undefined): Session {
  const { state, cards } = drawCards(s.state, EVENTS);
  const inject = shouldInjectDynamicEvent(state, cards.length);
  const next = { ...s, state, cards, index: 0 };
  if (cards.length > 0) {
    const pendingDynamic = inject ? generateDynamicEvent(state, s.dynNonce) : null;
    const dynNonce = inject ? s.dynNonce + 1 : s.dynNonce;
    return { ...next, pendingDynamic, dynNonce, screen: { kind: 'card', card: cards[0] } };
  }
  if (inject) {
    const ev = generateDynamicEvent(state, s.dynNonce);
    return { ...next, pendingDynamic: null, dynNonce: s.dynNonce + 1, screen: { kind: 'dynamic', event: ev, result: null } };
  }
  return finishTurnStep(next, false, quietCount, quietFromAge ?? s.state.age);
}

export function choose(s: Session, choiceId: string): Session {
  if (s.screen.kind !== 'card') return s;
  const card = s.screen.card;
  const { state, result } = resolveChoice(s.state, EVENTS, card.eventId, choiceId);
  const entry: TrailEntry = { turn: s.state.turn, age: s.state.age, eventId: card.eventId, choiceId, before: qualities(s.state), after: qualities(state) };
  return { ...s, state, trail: [...s.trail, entry], screen: { kind: 'result', card, result } };
}

export function chooseDynamic(s: Session, choiceId: string): Session {
  if (s.screen.kind !== 'dynamic') return s;
  const ev = s.screen.event;
  const { state, result } = resolveDynamicChoice(s.state, ev, choiceId);
  const entry: TrailEntry = { turn: s.state.turn, age: s.state.age, eventId: `dyn_${ev.templateId}`, choiceId, before: qualities(s.state), after: qualities(state) };
  return { ...s, state, trail: [...s.trail, entry], screen: { kind: 'dynamic', event: ev, result } };
}

/** After a result: next card, queued procedural event, or end the turn. */
export function advance(s: Session): Session {
  if (s.screen.kind === 'dynamic') return finishTurnStep({ ...s, pendingDynamic: null }, true, 0, undefined);
  const i = s.index + 1;
  if (i < s.cards.length) return { ...s, index: i, screen: { kind: 'card', card: s.cards[i] } };
  if (s.pendingDynamic) return { ...s, pendingDynamic: null, screen: { kind: 'dynamic', event: s.pendingDynamic, result: null } };
  return finishTurnStep(s, true, 0, undefined);
}

function finishTurnStep(s: Session, hadCards: boolean, quietCount: number, quietFromAge: number | undefined): Session {
  const { state, summary } = endTurn(s.state);
  const merged: TurnSummary = {
    ...summary,
    notices: [...s.carried.notices, ...summary.notices],
    reveals: [...s.carried.reveals, ...summary.reveals],
  };
  const base = { ...s, state, cards: [], index: 0, pendingDynamic: null };
  if (summary.yearEnd || state.done) {
    if (!state.done && shouldFastForwardQuietYear(state, merged, hadCards, quietCount)) {
      return beginTurnStep(
        { ...base, carried: { notices: [], reveals: [] }, yearStart: qualities(state), freeActionsLeft: 2 },
        quietCount + 1,
        quietFromAge ?? summary.age,
      );
    }
    return {
      ...base,
      carried: { notices: [], reveals: [] },
      screen: {
        kind: 'summary',
        summary: merged,
        fromAge: quietCount > 0 ? (quietFromAge ?? summary.age) : undefined,
        skippedYears: quietCount > 0 ? quietCount + 1 : undefined,
      },
    };
  }
  return beginTurnStep({ ...base, carried: { notices: merged.notices, reveals: merged.reveals } }, quietCount, quietFromAge);
}

/** After the year-end summary: next turn, or the "what did you want" question before the ending. */
export function afterSummary(s: Session): Session {
  return s.state.done
    ? { ...s, screen: { kind: 'goal' } }
    : beginTurnStep({ ...s, yearStart: qualities(s.state), freeActionsLeft: 2 }, 0, undefined);
}

export function applySessionFreeAction(
  s: Session,
  option: FreeActionOption,
  customAmount?: number,
): { session: Session; result: FreeActionResult } {
  const { state, result } = applyFreeAction(s.state, option, customAmount);
  const entry: TrailEntry = {
    turn: s.state.turn,
    age: s.state.age,
    eventId: `free_${option.spot}`,
    choiceId: option.id,
    before: qualities(s.state),
    after: qualities(state),
  };
  return {
    session: {
      ...s,
      state,
      trail: [...s.trail, entry],
      freeActionsLeft: Math.max(0, s.freeActionsLeft - 1),
    },
    result,
  };
}

export function applySessionBonusDynamic(
  s: Session,
  event: DynamicEvent,
  choiceId: string,
): { session: Session; result: DynamicResult } {
  const { state, result } = resolveDynamicChoice(s.state, event, choiceId);
  const entry: TrailEntry = {
    turn: s.state.turn,
    age: s.state.age,
    eventId: `dyn_${event.templateId}`,
    choiceId,
    before: qualities(s.state),
    after: qualities(state),
  };
  return {
    session: {
      ...s,
      state,
      trail: [...s.trail, entry],
      freeActionsLeft: Math.max(0, s.freeActionsLeft - 1),
      dynNonce: s.dynNonce + 1,
    },
    result,
  };
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
