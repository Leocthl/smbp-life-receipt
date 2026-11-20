import { describe, expect, it } from 'vitest';
import { addDebt, applyEffect } from '../src/engine/effects';
import { ALL_EVENTS } from '../src/data/events';
import { resolveChoice } from '../src/engine/events';
import { regimeForTurn } from '../src/engine/market';
import { newGame, playLife } from '../src/engine/sim';
import { cloneState } from '../src/engine/state';
import { endTurn } from '../src/engine/turn';
import { BOT_IDS } from '../src/engine/bots';

describe('money mechanics (review fixes)', () => {
  it('a second loan is its own tranche and does not re-amortise the first', () => {
    const d = cloneState(newGame(1));
    addDebt(d, 'personalLoan', 280_000, 0.055, 6);
    const first = d.debts[0].instalment;
    addDebt(d, 'personalLoan', 1_000);
    expect(d.debts).toHaveLength(2);
    expect(d.debts[0].instalment).toBe(first);
  });

  it('crash protection counts from the first voluntary investment, not MPF', () => {
    let bad = 0;
    for (const bot of BOT_IDS) for (let seed = 1; seed <= 30; seed++) {
      const s = playLife(seed, bot);
      const first = s.market.firstInvestTurn;
      if (first === null) continue;
      for (let t = first; t < s.history.length; t++) {
        if (s.history[t].age - s.history[first].age >= 2) break;
        if (regimeForTurn(s.market, t) === 'crash') bad++;
      }
    }
    expect(bad).toBe(0);
  });

  it('student part-time pay stops at graduation but a side business carries on', () => {
    let s = cloneState(newGame(2));
    applyEffect(s, { sideIncome: 5_000 });
    applyEffect(s, { hustle: 2_500 });
    while (s.job === 'student') s = endTurn(s).state;
    expect(s.sideIncome).toBe(2_500);
  });

  it('no second debt wipe within four years of bankruptcy', () => {
    let s = cloneState(newGame(3));
    while (s.job === 'student') s = endTurn(s).state;
    s = cloneState(s);
    addDebt(s, 'creditCard', 5_000_000, undefined, undefined, false);
    s = endTurn(s).state;
    expect(s.bankrupt).toBe(true);
    s = cloneState(s);
    addDebt(s, 'personalLoan', 5_000_000, 0.12, 0);
    s = endTurn(s).state;
    expect(s.totals.bankruptcies).toBe(1);
    expect(s.debts.some((x) => x.kind === 'personalLoan')).toBe(true);
  });

  it('the year-end summary adds up: income - spending + other = cash change', () => {
    let s = newGame(4);
    let r = endTurn(s);
    while (!r.summary.yearEnd) { s = r.state; r = endTurn(s); }
    expect(r.summary.cashChange).toBeCloseTo(r.state.cash - newGame(4).cash, 6);
  });

  it('a 3-year instalment loan is paid off in 3 years', () => {
    let s = cloneState(newGame(6));
    while (s.job === 'student') s = endTurn(s).state;
    s = cloneState(s);
    s.cash = 500_000;
    addDebt(s, 'personalLoan', 100_000, 0.12, 3);
    for (let y = 0; y < 3; y++) s = endTurn(s).state;
    expect(s.debts.filter((x) => x.kind === 'personalLoan' && x.instalment > 0)).toHaveLength(0);
  });

  it('a bankrupt cannot run up unlimited new debt', () => {
    let s = cloneState(newGame(7));
    while (s.job === 'student') s = endTurn(s).state;
    s = cloneState(s);
    addDebt(s, 'creditCard', 5_000_000);
    s = endTurn(s).state;
    expect(s.bankrupt).toBe(true);
    for (let y = 0; y < 3; y++) { s = cloneState(s); s.cash -= 400_000; s = endTurn(s).state; }
    const unsecured = s.debts.filter((x) => x.kind === 'personalLoan' || x.kind === 'creditCard').reduce((a, x) => a + x.balance, 0);
    expect(unsecured).toBeLessThan(200_000);
  });

  it('a choice that is not available is rejected', () => {
    const s = newGame(5);
    expect(() => resolveChoice(s, ALL_EVENTS, 'first_home', 'buy')).toThrow();
  });
});
