import type { Goal } from '../engine/types';

// Ending configuration. Labels describe behaviour; none is ranked above another.
// Each label scores sum(weight * metric); the highest score wins. Metrics are 0..1 (see engine/endings.ts).

export type MetricKey =
  | 'save' | 'invest' | 'risky' | 'spend' | 'fun' | 'debt' | 'family' | 'sell' | 'hold' | 'safe' | 'status' | 'work' | 'career' | 'insure'
  | 'mix' | 'lowRunway' | 'highDebt' | 'beatPlain' | 'belowPlain' | 'happiness' | 'relationships' | 'panicSells' | 'bankrupt';

export interface LabelRule { id: string; weights: Partial<Record<MetricKey, number>> }

export const LABELS: LabelRule[] = [
  { id: 'saverKing', weights: { save: 3, safe: 1, invest: -2, risky: -3, spend: -1.5, lowRunway: -1 } },
  { id: 'moonlight', weights: { spend: 3.2, fun: 2.5, lowRunway: 2, save: -1.5 } },
  { id: 'steady', weights: { mix: 3, safe: 0.5, risky: -1, lowRunway: -2, highDebt: -2 } },
  { id: 'riskWinner', weights: { risky: 6.5, beatPlain: 1.2, belowPlain: -2 } },
  { id: 'rollercoaster', weights: { risky: 6.5, belowPlain: 1.2, beatPlain: -2 } },
  { id: 'zenInvestor', weights: { invest: 3, hold: 3.5, sell: -3, risky: -1.5 } },
  { id: 'debtJuggler', weights: { debt: 7, highDebt: 1.5, bankrupt: 0.5 } },
  { id: 'exitOnRed', weights: { sell: 4, panicSells: 2.6, hold: -1 } },
  { id: 'familyPillar', weights: { family: 5, relationships: 1 } },
];

export const GOALS: Goal[] = ['security', 'freedom', 'experiences', 'family', 'status'];

/** Thresholds for the goal-vs-behaviour comparison. */
export const GOAL_RULES = {
  security: { lowRunwayYears: 3 },
  freedom: { highDebtYears: 3 },
  experiences: { funDecisions: 6 },
  family: { relationships: 55, familyDecisions: 4 },
  status: { peakSalary: 60_000 },
} as const;

/** Avoidable mistakes, shown separately from the label and never as a verdict on the whole life. */
export const MISTAKES = {
  noBufferYears: 3,          // working years with runway under 1 month
  highDebtYears: 3,          // years carrying card / personal-loan debt
  feeShareOfNetWorth: 0.03,  // avoidable fees above this share of final net worth...
  feeMin: 50_000,            // ...and above this amount
} as const;

/** Moments that mattered: how many to show by default and in the detail view. */
export const MOMENTS = { short: 3, max: 6 } as const;
