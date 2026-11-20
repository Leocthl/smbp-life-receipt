import { ART_H } from './types';

export type Kind = 'pay' | 'need' | 'want';

export interface Falling {
  id: number;
  kind: Kind;
  sprite: string;
  value: number;
  /** horizontal position, 0..1 of the canvas width */
  x: number;
  /** vertical position in art pixels */
  y: number;
}

export interface BudgetState {
  t: number;
  rng: number;
  nextId: number;
  nextAt: number;
  wallet: number;
  items: Falling[];
  income: number;
  needs: number;
  wants: number;
  fees: number;
}

export const BUDGET_SECONDS = 20;
/** saving this share of pay scores full marks */
export const TARGET_RATE = 0.4;
export const BASKET_Y = ART_H - 14;

export function budgetSpent(s: BudgetState): number {
  return s.needs + s.wants + s.fees;
}

export function budgetRate(s: BudgetState): number {
  return s.income > 0 ? (s.income - budgetSpent(s)) / s.income : 0;
}
