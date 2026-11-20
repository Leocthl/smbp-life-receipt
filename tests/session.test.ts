import { describe, expect, it } from 'vitest';
import { ALL_EVENTS } from '../src/data/events';
import { availableChoices } from '../src/engine/events';
import { newGame } from '../src/engine/sim';
import { regimeForTurn, yearIndex } from '../src/engine/market';
import { MINI_COOLDOWN, SPOT_FOR_CATEGORY, pickMiniGame, shownRegime, walkTarget, type MiniContext } from '../src/ui/flow';
import { advance, afterSummary, applyMiniScore, beginTurn, choose, currentEvent, rememberMini, startSession, withMiniBonus, type Session } from '../src/ui/session';
import { resolveWithMini } from '../src/ui/director/choice';
import { qualities } from '../src/world3d/qualities';
import type { Category, Tag } from '../src/engine/types';

const ctx = (over: Partial<{ id: string; category: Category; tags: Tag[]; regime: MiniContext['regime']; age: number; last: MiniContext['last'] }> = {}): MiniContext => ({
  event: { id: over.id ?? 'x', category: over.category ?? 'family' },
  choice: { tags: over.tags ?? [] },
  regime: over.regime ?? 'normal',
  age: over.age ?? 30,
  last: over.last ?? {},
});

describe('walk-to-decide', () => {
  it('maps every category to the place it happens', () => {
    expect(SPOT_FOR_CATEGORY).toEqual({ investing: 'bank', career: 'office', health: 'clinic', family: 'home', housing: 'home', friends: 'cafe', daily: 'market' });
  });
  it('does not walk in the room or the flat, where only home exists', () => {
    expect(walkTarget('investing', 'room')).toBeNull();
    expect(walkTarget('investing', 'home')).toBeNull();
    for (const scope of ['block', 'district', 'city'] as const) expect(walkTarget('investing', scope)).toBe('bank');
  });
});

describe('mini-game selection', () => {
  it('holds after a sale, or when holding through a bad market', () => {
    expect(pickMiniGame(ctx({ tags: ['sell'] }))).toBe('hold');
    expect(pickMiniGame(ctx({ tags: ['hold'], regime: 'crash' }))).toBe('hold');
    expect(pickMiniGame(ctx({ tags: ['hold'], regime: 'correction' }))).toBe('hold');
    expect(pickMiniGame(ctx({ tags: ['hold'], regime: 'bull' }))).toBeNull();
  });
  it('budgets on daily save or spend, at most once in three years', () => {
    expect(pickMiniGame(ctx({ category: 'daily', tags: ['save'] }))).toBe('budget');
    expect(pickMiniGame(ctx({ category: 'daily', tags: ['spend'] }))).toBe('budget');
    expect(pickMiniGame(ctx({ category: 'career', tags: ['spend'] }))).toBeNull();
    expect(pickMiniGame(ctx({ category: 'daily', tags: ['save'], age: 21, last: { budget: 20 } }))).toBeNull();
    expect(pickMiniGame(ctx({ category: 'daily', tags: ['save'], age: 23, last: { budget: 20 } }))).toBe('budget');
  });
  it('compares on insurance, fund and fee events, at most once in five years', () => {
    for (const id of ['insurance_pitch', 'mpf_choice', 'index_fund', 'bank_fee']) expect(pickMiniGame(ctx({ id }))).toBe('compare');
    expect(pickMiniGame(ctx({ id: 'mpf_choice', age: 33, last: { compare: 30 } }))).toBeNull();
    expect(pickMiniGame(ctx({ id: 'mpf_choice', age: 35, last: { compare: 30 } }))).toBe('compare');
    expect(MINI_COOLDOWN.compare).toBe(5);
  });
  it('says nothing for an ordinary choice', () => {
    expect(pickMiniGame(ctx())).toBeNull();
  });
});

describe('mini-game bonus', () => {
  const s = newGame(7);
  it('adds up to 3 happiness and never touches cash, and does not mutate', () => {
    const before = JSON.stringify(s);
    const up = withMiniBonus(s, 1);
    expect(up.happiness).toBe(Math.min(100, s.happiness + 3));
    expect(up.cash).toBe(s.cash);
    expect(up.holdings).toBe(s.holdings);
    expect(withMiniBonus(s, 0.5).happiness).toBe(Math.min(100, s.happiness + 2));
    expect(withMiniBonus(s, 0).happiness).toBe(s.happiness);
    expect(JSON.stringify(s)).toBe(before);
  });
  it('clamps the score and the happiness', () => {
    expect(withMiniBonus(s, 9).happiness).toBe(Math.min(100, s.happiness + 3));
    expect(withMiniBonus(s, -4).happiness).toBe(s.happiness);
    expect(withMiniBonus({ ...s, happiness: 99 }, 1).happiness).toBe(100);
  });
  it('applies to a session without changing the rest', () => {
    const a = startSession(7);
    const b = applyMiniScore(a, 1);
    expect(b.state.cash).toBe(a.state.cash);
    expect(b.trail).toBe(a.trail);
    expect(rememberMini(a, 'budget').minis).toEqual({ budget: a.state.age });
    expect(a.minis).toEqual({});
  });
});

describe('session flow', () => {
  it('stores the qualities at the start of each year', () => {
    const s0 = startSession(11);
    expect(s0.yearStart).toEqual(qualities(s0.state));
    let s = beginTurn(s0);
    for (let i = 0; i < 200 && s.screen.kind !== 'summary'; i += 1) {
      s = s.screen.kind === 'card' ? firstChoice(s) : s.screen.kind === 'result' ? advance(s) : s;
    }
    expect(s.screen.kind).toBe('summary');
    const next = afterSummary(s);
    expect(next.yearStart).toEqual(qualities(s.state));
  });
  it('flags a mini-game only when enabled', () => {
    const s0 = startSession(11);
    const first = (s: Session) => (s.screen.kind === 'card' ? availableChoices(s.state, currentEvent(s.screen.card))[0].id : '');
    const s = beginTurn(s0);
    expect(resolveWithMini(s, first(s), false).mini).toBeNull();
  });
  it('has real content behind all three games', () => {
    const found = new Set<string>();
    for (const e of ALL_EVENTS) for (const c of e.choices) for (const regime of ['normal', 'crash'] as const) {
      const id = pickMiniGame({ event: e, choice: c, regime, age: 30, last: {} });
      if (id) found.add(id);
    }
    expect([...found].sort()).toEqual(['budget', 'compare', 'hold']);
  });
});

function firstChoice(s: Session): Session {
  if (s.screen.kind !== 'card') return s;
  return choose(s, availableChoices(s.state, currentEvent(s.screen.card))[0].id);
}


describe('market weather spoiler', () => {
  it('shows last year\'s regime, never the current one, and the same one all year', () => {
    const s = newGame(5);
    expect(shownRegime({ ...s, turn: 0 })).toBe('normal');
    expect(shownRegime({ ...s, turn: 1 })).toBe('normal');
    for (let turn = 2; turn < 30; turn += 1) {
      const y = yearIndex(turn);
      const prevYearTurn = [...Array(turn).keys()].reverse().find((x) => yearIndex(x) === y - 1) as number;
      expect(shownRegime({ ...s, turn })).toBe(regimeForTurn(s.market, prevYearTurn));
      if (yearIndex(turn - 1) === y) expect(shownRegime({ ...s, turn })).toBe(shownRegime({ ...s, turn: turn - 1 }));
    }
  });
});
