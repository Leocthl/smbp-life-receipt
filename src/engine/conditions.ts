import { highInterestDebt, monthlyExpense, monthlyIncome, netWorth, riskyHoldings, runway } from './finance';
import { regimeForTurn } from './market';
import type { Condition, GameState, Stat } from './types';
import type { Rng } from './rng';

export function statValue(s: GameState, stat: Stat): number {
  switch (stat) {
    case 'cash': return s.cash;
    case 'runway': return runway(s);
    case 'happiness': return s.happiness;
    case 'relationships': return s.relationships;
    case 'age': return s.age;
    case 'salary': return s.salary;
    case 'netWorth': return netWorth(s);
    case 'debtHighInterest': return highInterestDebt(s);
    case 'investedRisky': return riskyHoldings(s);
    case 'gpa': return s.character.gpa;
    case 'siblings': return s.character.siblingsToSupport;
    case 'familyDebt': return s.character.familyDebt;
    case 'liquid': return s.cash + s.holdings.savings + riskyHoldings(s);
    case 'monthlyNet': return monthlyIncome(s) - monthlyExpense(s);
  }
}

/** Evaluate a declarative condition. 'chance' needs an rng; without one it counts as true. */
export function check(s: GameState, c: Condition | undefined, rng?: Rng): boolean {
  if (!c) return true;
  if ('all' in c) return c.all.every((x) => check(s, x, rng));
  if ('any' in c) return c.any.some((x) => check(s, x, rng));
  if ('not' in c) return !check(s, c.not, rng);
  if ('stat' in c) {
    const v = statValue(s, c.stat);
    switch (c.op) {
      case '<': return v < c.value;
      case '<=': return v <= c.value;
      case '>': return v > c.value;
      case '>=': return v >= c.value;
      case '==': return v === c.value;
    }
  }
  if ('flag' in c) return s.flags.includes(c.flag);
  if ('temperament' in c) return s.character.hidden.temperament === c.temperament;
  if ('literacy' in c) return s.character.hidden.literacy === c.literacy;
  if ('familyTier' in c) return s.character.familyTier === c.familyTier;
  if ('standing' in c) return s.character.standing === c.standing;
  if ('talent' in c) return (s.character.talents as string[]).includes(c.talent) || (s.character.hidden.talents as string[]).includes(c.talent);
  if ('trait' in c) return s.character.hidden[c.trait];
  if ('job' in c) return s.job === c.job;
  if ('holds' in c) {
    const v = c.holds === 'insurance' ? (s.insurance ? 1 : 0) : s.holdings[c.holds];
    return v > (c.min ?? 0);
  }
  if ('debt' in c) return s.debts.some((d) => d.kind === c.debt && d.balance > 0);
  if ('regime' in c) {
    const r = regimeForTurn(s.market, s.turn);
    return Array.isArray(c.regime) ? c.regime.includes(r) : r === c.regime;
  }
  if ('chance' in c) return rng ? rng.float() < c.chance : true;
  return false;
}

/** Hidden traits a condition reads; used to enforce that such events reveal them. */
export function hiddenTraitsIn(c: Condition | undefined): string[] {
  if (!c) return [];
  if ('all' in c) return c.all.flatMap(hiddenTraitsIn);
  if ('any' in c) return c.any.flatMap(hiddenTraitsIn);
  if ('not' in c) return hiddenTraitsIn(c.not);
  if ('temperament' in c) return [c.temperament];
  if ('literacy' in c) return [c.literacy];
  if ('trait' in c) return [c.trait];
  if ('talent' in c && ['freelancing', 'negotiation', 'networking'].includes(c.talent)) return [c.talent];
  return [];
}
