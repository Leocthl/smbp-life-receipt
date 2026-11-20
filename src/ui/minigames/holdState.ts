import { clamp } from './types';

export const HOLD_SECONDS = 20;
export const HOLD_STEPS = 240;
export const START_CASH = 100;
/** the crash runs from step 60 to step 120 (see PHASES in hold.ts); recovery follows */
export const STORM_START = 60;
export const STORM_END = 120;

export interface HoldState {
  t: number;
  /** price per step, HOLD_STEPS + 1 long, fixed for the round */
  path: number[];
  idx: number;
  cash: number;
  units: number;
  inMarket: boolean;
  /** inMarket flag per step reached so far, for the strip under the chart */
  hist: boolean[];
}

export function holdValue(s: HoldState): number {
  return s.cash + s.units * s.path[s.idx];
}

export function indexAt(t: number): number {
  return clamp(Math.floor((t / HOLD_SECONDS) * HOLD_STEPS), 0, HOLD_STEPS);
}
