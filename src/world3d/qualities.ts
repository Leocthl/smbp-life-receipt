import { monthlyIncome, netWorth, runway, totalDebt } from '../engine/finance';
import type { GameState } from '../engine/types';

/** The six qualities on the hexagon. Each is 0..100. Pure: derived from GameState only. */
export type Quality = 'wealth' | 'safety' | 'joy' | 'bonds' | 'freedom' | 'growth';
export const QUALITIES: readonly Quality[] = ['wealth', 'safety', 'joy', 'bonds', 'freedom', 'growth'];
export type Qualities = Record<Quality, number>;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const pct = (v: number) => Math.round(clamp01(v) * 100);

export function qualities(s: GameState): Qualities {
  const nw = netWorth(s);
  const income = monthlyIncome(s);
  // non-mortgage debt measured against a year of income (mortgages are backed by a flat)
  const consumerDebt = totalDebt(s, (d) => d.kind !== 'mortgage');
  const burden = consumerDebt / Math.max(60_000, income * 12);
  return {
    // HK$10k -> 0, HK$10M -> 100, on a log scale; negative net worth is 0
    wealth: pct((Math.log10(Math.max(nw, 0) + 10_000) - 4) / 3),
    // months of costs covered by cash and savings; a year is full marks
    safety: pct(runway(s) / 12),
    joy: pct(s.happiness / 100),
    bonds: pct(s.relationships / 100),
    freedom: pct((1 - burden) * (s.bankrupt ? 0.4 : 1)),
    // earning power: monthly income on a square-root scale up to HK$100k
    growth: pct(Math.sqrt(Math.max(0, income - 5_000) / 95_000)),
  };
}

export function qualityDelta(before: Qualities, after: Qualities): Qualities {
  return Object.fromEntries(QUALITIES.map((q) => [q, after[q] - before[q]])) as Qualities;
}
