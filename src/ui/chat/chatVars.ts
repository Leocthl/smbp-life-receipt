import { totalDebt } from '../../engine/finance';
import type { GameState } from '../../engine/types';
import { ageLabel, money } from '../format';

/** Values the event texts can refer to: {cash}, {salary}, {age}, {rent}, {cardDebt}. */
export function textVars(s: GameState, lang: 'zh' | 'en') {
  return {
    cardDebt: money(totalDebt(s, (d) => d.kind === 'creditCard'), lang),
    cash: money(s.cash, lang),
    salary: money(s.salary, lang),
    age: ageLabel(s.age),
    rent: money(s.expenses.rent, lang),
  };
}

export function termLabel(s: GameState, t: (k: string, v?: Record<string, string | number>) => string) {
  return s.turn < 8 ? t('term.sem', { age: ageLabel(s.age), n: s.turn + 1 }) : t('term.year', { age: ageLabel(s.age) });
}
