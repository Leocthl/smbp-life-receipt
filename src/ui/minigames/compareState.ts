import type { Spark } from './fx';

export const ROUNDS = 5;
export const ROUND_SECONDS = 4;
export const PAUSE_SECONDS = 0.8;

/** name is an index into the fictional fund names in the i18n file */
export interface Fund {
  name: number;
  /** annual management fee, percent */
  annual: number;
  /** one-off entry charge, percent */
  entry: number;
}

export interface CompareState {
  t: number;
  rng: number;
  round: number;
  roundLeft: number;
  funds: Fund[];
  pause: number;
  lastOk: boolean | null;
  history: boolean[];
  /** confetti or puffs from the last answer, purely visual */
  sparks: Spark[];
}

/** All-in cost in percent a year: the entry charge spread over 10 years. */
export function fundCost(f: Fund): number {
  return f.annual + f.entry / 10;
}

export function cheapestIndex(funds: Fund[]): number {
  return funds.reduce((best, f, i) => (fundCost(f) < fundCost(funds[best]) ? i : best), 0);
}

/** Extra money after 30 years on principal at gross return, paying high instead of low a year. */
export function feeGap(principal: number, gross: number, low: number, high: number, years: number): number {
  return Math.round(principal * ((1 + gross - low) ** years - (1 + gross - high) ** years));
}

export const FEE_GAP = feeGap(100000, 0.05, 0.002, 0.015, 30);
