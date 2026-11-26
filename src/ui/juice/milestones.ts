import { netWorth, totalDebt } from '../../engine/finance';
import type { GameState } from '../../engine/types';

export type MilestoneId = 'nw100k' | 'nw1m' | 'firstHome' | 'debtFree' | 'broke';

/** The few numbers milestones are judged on. */
export interface Snap { netWorth: number; cash: number; property: number; debt: number }

export const NW_STEPS = { nw100k: 100_000, nw1m: 1_000_000 } as const;
/** celebrated once per life; 'broke' (cash below zero) can come back each time it happens again */
const ONCE: readonly MilestoneId[] = ['nw100k', 'nw1m', 'firstHome', 'debtFree'];

export const snapOf = (s: GameState): Snap => ({ netWorth: netWorth(s), cash: s.cash, property: s.holdings.property, debt: totalDebt(s) });

/**
 * Milestones crossed between two snapshots. `done` holds the once-per-life ones already celebrated,
 * so a number that wobbles around $100k does not cheer twice.
 */
export function detectMilestones(prev: Snap, next: Snap, done: ReadonlySet<MilestoneId> = new Set()): MilestoneId[] {
  const hit: MilestoneId[] = [];
  if (prev.netWorth < NW_STEPS.nw100k && next.netWorth >= NW_STEPS.nw100k) hit.push('nw100k');
  if (prev.netWorth < NW_STEPS.nw1m && next.netWorth >= NW_STEPS.nw1m) hit.push('nw1m');
  if (prev.property <= 0 && next.property > 0) hit.push('firstHome');
  if (prev.debt > 0 && next.debt <= 0) hit.push('debtFree');
  if (prev.cash >= 0 && next.cash < 0) hit.push('broke');
  return hit.filter((id) => !(ONCE.includes(id) && done.has(id)));
}
