import { describe, expect, it } from 'vitest';
import { applyFreeAction, spotMenuFor, type FreeSpotKey } from '../src/engine/freeChoice';
import { lifeProgressPct, shouldFastForwardQuietYear } from '../src/engine/pacing';
import { availableDynamicChoices, generateDynamicEvent, resolveDynamicChoice, shouldInjectDynamicEvent } from '../src/engine/procedural';
import { newGame } from '../src/engine/sim';
import { endTurn } from '../src/engine/turn';
import { enFree } from '../src/i18n/en/free';
import { zhFree } from '../src/i18n/zh/free';

describe('procedural random encounters', () => {
  it('generates diverse templates and dynamic amounts across seeds', () => {
    const templates = new Set<string>();
    const stakes = new Set<string>();
    for (let seed = 1; seed <= 80; seed += 1) {
      const s = { ...newGame(seed), age: 28, turn: 14, job: 'employed' as const, salary: 32_000, cash: 85_000 };
      const ev = generateDynamicEvent(s, seed % 3);
      templates.add(ev.templateId);
      stakes.add(JSON.stringify(ev.vars));
      expect(ev.choices.length).toBeGreaterThanOrEqual(2);
      expect(zhFree[ev.titleKey], `zh ${ev.titleKey}`).toBeTruthy();
      expect(enFree[ev.titleKey], `en ${ev.titleKey}`).toBeTruthy();
      expect(zhFree[ev.textKey], `zh ${ev.textKey}`).toBeTruthy();
      expect(enFree[ev.textKey], `en ${ev.textKey}`).toBeTruthy();
      for (const c of ev.choices) {
        expect(zhFree[c.labelKey], `zh ${c.labelKey}`).toBeTruthy();
        expect(enFree[c.labelKey], `en ${c.labelKey}`).toBeTruthy();
        expect(zhFree[c.whyKey], `zh ${c.whyKey}`).toBeTruthy();
        expect(enFree[c.whyKey], `en ${c.whyKey}`).toBeTruthy();
        if (c.roll) {
          expect(zhFree[c.roll.winKey], `zh ${c.roll.winKey}`).toBeTruthy();
          expect(enFree[c.roll.winKey], `en ${c.roll.winKey}`).toBeTruthy();
          expect(zhFree[c.roll.loseKey], `zh ${c.roll.loseKey}`).toBeTruthy();
          expect(enFree[c.roll.loseKey], `en ${c.roll.loseKey}`).toBeTruthy();
        }
      }
    }
    expect(templates.size).toBeGreaterThanOrEqual(10);
    expect(stakes.size).toBeGreaterThan(30);
  });

  it('resolveDynamicChoice is pure, immutable, and logs decisions with honest tags', () => {
    const s = { ...newGame(42), age: 27, turn: 13, job: 'employed' as const, salary: 28_000, cash: 60_000 };
    const before = JSON.stringify(s);
    const ev = generateDynamicEvent(s, 0);
    const choices = availableDynamicChoices(s, ev);
    const { state, result } = resolveDynamicChoice(s, ev, choices[0].id);
    expect(JSON.stringify(s)).toBe(before);
    expect(state.decisionLog.length).toBe(s.decisionLog.length + 1);
    expect(state.decisionLog.at(-1)?.eventId).toBe(`dyn_${ev.templateId}`);
    expect(zhFree[result.outcomeKey]).toBeTruthy();
    expect(enFree[result.outcomeKey]).toBeTruthy();
  });

  it('never injects on turn 0 but injects regularly in adult life', () => {
    const start = newGame(7);
    expect(shouldInjectDynamicEvent(start, 1)).toBe(false);
    let hits = 0;
    for (let t = 8; t < 40; t += 1) {
      if (shouldInjectDynamicEvent({ ...start, turn: t, age: 18 + t }, 0)) hits += 1;
    }
    expect(hits).toBeGreaterThan(8);
  });
});

describe('open-world free-choice actions', () => {
  const spots: FreeSpotKey[] = ['bank', 'office', 'cafe', 'market', 'park', 'clinic', 'home', 'campus', 'pier', 'mystery'];

  it('provides menus with complete zh/en copy for every spot', () => {
    const s = { ...newGame(12), age: 30, turn: 16, job: 'employed' as const, salary: 35_000, cash: 50_000 };
    for (const spot of spots) {
      const menu = spotMenuFor(s, spot);
      expect(menu.options.length).toBeGreaterThan(0);
      expect(zhFree[menu.titleKey], `zh ${menu.titleKey}`).toBeTruthy();
      expect(enFree[menu.titleKey], `en ${menu.titleKey}`).toBeTruthy();
      for (const opt of menu.options) {
        expect(zhFree[opt.labelKey], `zh ${opt.labelKey}`).toBeTruthy();
        expect(enFree[opt.labelKey], `en ${opt.labelKey}`).toBeTruthy();
      }
    }
  });

  it('applies custom slider investment immutably at the bank', () => {
    const s = { ...newGame(15), age: 29, turn: 15, job: 'employed' as const, salary: 30_000, cash: 40_000 };
    const before = JSON.stringify(s);
    const opt = spotMenuFor(s, 'bank').options.find((o) => o.id === 'bank_index')!;
    const { state, result } = applyFreeAction(s, opt, 12_000);
    expect(JSON.stringify(s)).toBe(before);
    expect(result.amount).toBe(12_000);
    expect(state.holdings.index).toBeGreaterThan(s.holdings.index);
    expect(state.cash).toBeLessThan(s.cash);
    expect(zhFree[result.outcomeKey]).toBeTruthy();
    expect(enFree[result.outcomeKey]).toBeTruthy();
  });
});

describe('15-minute pacing helpers', () => {
  it('fast-forwards quiet adult years without emergencies up to maxQuietSkipYears', () => {
    const adult = { ...newGame(3), turn: 14, age: 28, job: 'employed' as const, salary: 30_000, cash: 50_000 };
    const { state, summary } = endTurn(adult);
    expect(shouldFastForwardQuietYear(state, { ...summary, notices: [], reveals: [] }, false, 0)).toBe(true);
    expect(shouldFastForwardQuietYear(state, { ...summary, notices: [], reveals: [] }, true, 0)).toBe(false);
    expect(shouldFastForwardQuietYear(state, { ...summary, notices: ['bankrupt'], reveals: [] }, false, 0)).toBe(false);
    expect(shouldFastForwardQuietYear(state, { ...summary, notices: [], reveals: [] }, false, 3)).toBe(false);
  });

  it('computes 0..100 life progress accurately', () => {
    expect(lifeProgressPct(18)).toBe(0);
    expect(lifeProgressPct(65)).toBe(100);
    expect(lifeProgressPct(41.5)).toBe(50);
  });
});
