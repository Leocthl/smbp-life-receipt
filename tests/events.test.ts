import { describe, expect, it } from 'vitest';
import { ALL_EVENTS } from '../src/data/events';
import { BOT_IDS } from '../src/engine/bots';
import { defaultCharacter, generateCharacter } from '../src/engine/character';
import { check } from '../src/engine/conditions';
import { drawCards, resolveChoice } from '../src/engine/events';
import { netWorth } from '../src/engine/finance';
import { newGame, playLife } from '../src/engine/sim';
import type { Character, GameEvent, GameState } from '../src/engine/types';

const withTemper = (t: Character['hidden']['temperament']): Character => ({ ...defaultCharacter(), hidden: { ...defaultCharacter().hidden, temperament: t } });

describe('character generation', () => {
  it('is seeded and stays in range', () => {
    expect(generateCharacter(5)).toEqual(generateCharacter(5));
    for (let i = 1; i < 300; i++) {
      const c = generateCharacter(i);
      expect(c.gpa).toBeGreaterThanOrEqual(2);
      expect(c.gpa).toBeLessThanOrEqual(4);
      if (c.familyTier === 'high') expect(c.familyAllowance).toBe(0);
    }
  });
});

describe('conditions', () => {
  it('evaluates nested rules', () => {
    const s = newGame(1, defaultCharacter());
    expect(check(s, { all: [{ stat: 'cash', op: '>', value: 0 }, { not: { flag: 'x' } }] })).toBe(true);
    expect(check(s, { any: [{ flag: 'x' }, { familyTier: 'low' }] })).toBe(false);
    expect(check(s, { temperament: 'steady' })).toBe(true);
  });
});

describe('event engine', () => {
  it('draws the tuition card first and records cooldown + seen', () => {
    const { state, cards } = drawCards(newGame(2), ALL_EVENTS);
    expect(cards[0].eventId).toBe('tuition');
    expect(state.seen.tuition).toBe(1);
  });
  it('resolveChoice applies effects, flags and logs, without mutating input', () => {
    const s = newGame(3, defaultCharacter());
    const before = JSON.stringify(s);
    const { state, result } = resolveChoice(s, ALL_EVENTS, 'japan_trip', 'go');
    expect(JSON.stringify(s)).toBe(before);
    expect(result.delta.cash).toBe(-8000);
    expect(state.happiness).toBeGreaterThan(s.happiness);
    expect(state.decisionLog.at(-1)?.counterfactual?.key).toBe('trip');
  });
  it('delayed effects queue the follow-up event', () => {
    const s = newGame(4, defaultCharacter());
    const { state } = resolveChoice(s, ALL_EVENTS, 'card_cashback', 'free');
    expect(state.pending.some((p) => p.eventId === 'card_bill')).toBe(true);
  });
  it('a hidden trait hook always emits a reveal the first time, and only once', () => {
    const s = newGame(5, withTemper('fomo'));
    const r1 = resolveChoice(s, ALL_EVENTS, 'hot_tip', 'pass');
    expect(r1.result.reveals).toEqual(['fomo']);
    const r2 = resolveChoice(r1.state, ALL_EVENTS, 'hot_tip', 'pass');
    expect(r2.result.reveals).toEqual([]);
    const calm = resolveChoice(newGame(5, withTemper('steady')), ALL_EVENTS, 'hot_tip', 'pass');
    expect(calm.result.reveals).toEqual([]);
  });
  it('events whose conditions read hidden traits reveal them when drawn', () => {
    const c = { ...defaultCharacter(), hidden: { ...defaultCharacter().hidden, chronic: true } };
    const only: GameEvent[] = ALL_EVENTS.filter((e) => e.id === 'chronic_flare');
    let s: GameState = { ...newGame(6, c), queue: [], age: 30, turn: 16 };
    const { cards, state } = drawCards(s, only);
    expect(cards[0]).toEqual({ eventId: 'chronic_flare', reveal: 'chronic' });
    s = state;
    expect(s.revealed).toContain('chronic');
  });
  it('an event never reveals a trait the character does not have', () => {
    const only = ALL_EVENTS.filter((e) => e.id === 'promotion_burnout');
    const s: GameState = { ...newGame(8, defaultCharacter()), queue: [], age: 30, turn: 16, job: 'employed', salary: 30000 };
    const { cards } = drawCards(s, only);
    expect(cards[0]?.eventId).toBe('promotion_burnout');
    expect(cards[0]?.reveal).toBeUndefined();
  });
  it('requires hides choices you cannot take', () => {
    const s = newGame(7, { ...defaultCharacter(), familyTier: 'low' });
    const ev = ALL_EVENTS.find((e) => e.id === 'tuition')!;
    const ok = ev.choices.filter((c) => check(s, c.requires)).map((c) => c.id);
    expect(ok).not.toContain('family');
  });
});

describe('headless lives', () => {
  it('every bot finishes a life and the run is reproducible', () => {
    for (const bot of BOT_IDS) {
      const a = playLife(10, bot);
      expect(a.done).toBe(true);
      expect(netWorth(a)).toBe(netWorth(playLife(10, bot)));
    }
  });
  it('a life sees a sensible number of decisions', () => {
    const s = playLife(12, 'balanced');
    expect(s.decisionLog.length).toBeGreaterThan(15);
    expect(s.decisionLog.length).toBeLessThan(90);
  });
});
