import { CONFIG } from '../data/config';
import type { GameState, TurnSummary } from './types';

// Smart ~15-minute pacing: bundles consecutive quiet adult years (0 cards, no emergencies) into one crisp chapter rollup
// so a full 18 -> 65 Hong Kong life comfortably completes in 10-14 minutes without skipping meaningful decisions.

export const PACING_TARGET = {
  targetMinutes: 15,
  maxQuietSkipYears: 3,
} as const;

const IMPORTANT_NOTICES = new Set(['bankrupt', 'forced_sale', 'mpf_withdrawn', 'card_restructure']);

/** Returns true when a year can safely fast-forward into a multi-year chapter rollup instead of stopping on an empty receipt. */
export function shouldFastForwardQuietYear(
  nextState: GameState,
  summary: TurnSummary,
  hadCards: boolean,
  consecutiveQuietYears: number,
): boolean {
  if (hadCards || nextState.done) return false;
  if (summary.turn < CONFIG.uniTurns) return false; // never skip uni graduation transition
  if (consecutiveQuietYears >= PACING_TARGET.maxQuietSkipYears) return false;
  if (summary.reveals.length > 0) return false;
  if (summary.notices.some((n) => IMPORTANT_NOTICES.has(n.split(':')[0]))) return false;
  return true;
}

/** Progress through life 18 -> 65 as 0..100 integer percentage for the HUD pacing bar. */
export function lifeProgressPct(age: number): number {
  const span = Math.max(1, CONFIG.retireAge - CONFIG.startAge);
  return Math.max(0, Math.min(100, Math.round(((age - CONFIG.startAge) / span) * 100)));
}
