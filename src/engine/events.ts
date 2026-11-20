import { CONFIG } from '../data/config';
import { check } from './conditions';
import { applyEffect } from './effects';
import { monthlyExpense, monthlyIncome, netWorth, resolveAmount, runway } from './finance';
import { ensureRegime } from './market';
import { makeRng } from './rng';
import { cloneState } from './state';
import type { Choice, ChoiceResult, GameEvent, GameState, TraitId } from './types';

export interface Card { eventId: string; reveal?: TraitId }

/** Does this character actually have the trait? Only then can it be revealed. */
export function hasTrait(s: GameState, t: TraitId): boolean {
  const h = s.character.hidden;
  if (t === 'chronic' || t === 'familyHistory' || t === 'fragileMind') return h[t];
  if (t === 'low' || t === 'medium' || t === 'high') return h.literacy === t;
  if (t === 'freelancing' || t === 'negotiation' || t === 'networking') return h.talents.includes(t);
  return h.temperament === t;
}

export function eventById(events: readonly GameEvent[], id: string): GameEvent {
  const ev = events.find((e) => e.id === id);
  if (!ev) throw new Error(`Unknown event id: ${id}`);
  return ev;
}

function eligible(s: GameState, e: GameEvent, triggered: boolean): boolean {
  if (!triggered && e.triggeredOnly) return false;
  if (s.age < e.ageRange[0] || s.age > e.ageRange[1]) return false;
  if (e.once && (s.seen[e.id] ?? 0) > 0) return false;
  if (!triggered && (s.cooldowns[e.id] ?? -1) > s.turn) return false;
  return check(s, e.conditions);
}

function weightOf(s: GameState, e: GameEvent): number {
  return (e.weightMods ?? []).reduce((w, m) => (check(s, m.when) ? w * m.mult : w), e.weight);
}

/** Which trait the player learns when this card shows up for the first time. */
function revealFor(s: GameState, e: GameEvent): TraitId | undefined {
  if (e.reveals && !s.revealed.includes(e.reveals) && hasTrait(s, e.reveals)) return e.reveals;
  const usesLiteracy = e.jargon || e.choices.some((c) => c.literacyHint);
  const lit = s.character.hidden.literacy;
  if (usesLiteracy && !s.revealed.includes(lit)) return lit;
  return undefined;
}

/**
 * Start a turn: fix this year's market regime, then pick the cards to show.
 * Queued (triggered) events come first; random draws follow the age-band density.
 */
export function drawCards(s: GameState, events: readonly GameEvent[]): { state: GameState; cards: Card[] } {
  const d = cloneState(s);
  d.market = ensureRegime(d.market, d.turn);
  const rng = makeRng(d.rng.event);
  const picked: GameEvent[] = [];
  const queued = d.queue;
  d.queue = [];
  for (const id of queued) {
    const ev = events.find((e) => e.id === id);
    if (ev && !picked.includes(ev) && eligible(d, ev, true)) picked.push(ev);
  }
  const band = CONFIG.cardsPerTurn.find(([maxAge]) => d.age < maxAge) ?? CONFIG.cardsPerTurn[CONFIG.cardsPerTurn.length - 1];
  const wanted = (rng.float() < band[1] ? 1 : 0) + (rng.float() < band[2] ? 1 : 0);
  for (let i = 0; i < wanted && picked.length < 2; i++) {
    const pool = events.filter((e) => !picked.includes(e) && eligible(d, e, false));
    const ev = rng.weighted(pool, (e) => weightOf(d, e));
    if (ev) picked.push(ev);
  }
  d.rng = { ...d.rng, event: rng.state };
  const cards: Card[] = [];
  for (const ev of picked) {
    d.seen = { ...d.seen, [ev.id]: (d.seen[ev.id] ?? 0) + 1 };
    d.cooldowns = { ...d.cooldowns, [ev.id]: d.turn + ev.cooldown };
    const reveal = revealFor(d, ev);
    if (reveal) d.revealed = [...d.revealed, reveal];
    cards.push({ eventId: ev.id, reveal });
  }
  return { state: d, cards };
}

export function availableChoices(s: GameState, e: GameEvent): Choice[] {
  return e.choices.filter((c) => check(s, c.requires));
}

/** Resolve a choice: certain effects, fine print, trait hooks, a weighted outcome, delayed effects, log. */
export function resolveChoice(s: GameState, events: readonly GameEvent[], eventId: string, choiceId: string): { state: GameState; result: ChoiceResult } {
  const ev = eventById(events, eventId);
  const choice = ev.choices.find((c) => c.id === choiceId);
  if (!choice) throw new Error(`Unknown choice ${choiceId} for event ${eventId}`);
  if (!check(s, choice.requires)) throw new Error(`Choice ${choiceId} is not available for event ${eventId}`);
  const d = cloneState(s);
  const rng = makeRng(d.rng.outcome);
  const before = { cash: d.cash, happiness: d.happiness, relationships: d.relationships, netWorth: netWorth(d), runway: runway(d), monthly: monthlyIncome(d) - monthlyExpense(d) };
  const cfAmount = choice.counterfactual ? Math.abs(resolveAmount(d, choice.counterfactual.amount)) : 0;
  const notices: string[] = [];
  const reveals: TraitId[] = [];

  notices.push(...applyEffect(d, choice.effects, rng));
  notices.push(...applyEffect(d, choice.hidden, rng));
  for (const hook of choice.traitHooks ?? []) {
    if (!check(d, hook.when, rng)) continue;
    notices.push(...applyEffect(d, hook.effects, rng));
    if (!d.revealed.includes(hook.trait)) {
      d.revealed = [...d.revealed, hook.trait];
      reveals.push(hook.trait);
    }
  }
  let outcomeId: string | undefined;
  if (choice.outcomes?.length) {
    const o = rng.weighted(choice.outcomes, (x) => (x.weightMods ?? []).reduce((w, m) => (check(d, m.when) ? w * m.mult : w), x.weight));
    if (o) {
      outcomeId = o.id;
      notices.push(...applyEffect(d, o.effects, rng));
    }
  }
  for (const del of choice.delayed ?? []) {
    d.pending = [...d.pending, { dueTurn: d.turn + del.afterTurns, source: `${eventId}.${choiceId}`, effect: del.effects, eventId: del.eventId, when: del.when }];
  }
  d.rng = { ...d.rng, outcome: rng.state };
  d.decisionLog = [...d.decisionLog, {
    turn: d.turn,
    age: d.age,
    eventId,
    choiceId,
    outcomeId,
    tags: choice.tags,
    snapshot: { cash: before.cash, netWorth: before.netWorth, runway: before.runway, happiness: before.happiness },
    netWorthDelta: netWorth(d) - before.netWorth,
    counterfactual: choice.counterfactual && cfAmount > 0
      ? { actual: choice.counterfactual.actual, alt: choice.counterfactual.alt, amount: cfAmount, key: choice.counterfactual.key }
      : undefined,
  }];
  return {
    state: d,
    result: {
      eventId,
      choiceId,
      outcomeId,
      delta: { cash: d.cash - before.cash, happiness: d.happiness - before.happiness, relationships: d.relationships - before.relationships, netWorthHint: netWorth(d) - before.netWorth, monthly: Math.round(monthlyIncome(d) - monthlyExpense(d) - before.monthly) },
      reveals,
      notices,
    },
  };
}
