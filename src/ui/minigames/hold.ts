import { makeRng, streamSeed } from '../../engine/rng';
import { drawHold } from './holdDraw';
import { HoldOverlay } from './holdOverlay';
import { HOLD_SECONDS, HOLD_STEPS, START_CASH, holdValue, indexAt, type HoldState } from './holdState';
import { NO_INPUT, clamp, type GameDef, type Input, type MiniGameResult } from './types';

// Market storm: a seeded crash and recovery. Hold = invested, release = sell and lock in the price you got.

interface Phase { steps: number; drift: number; vol: number }

/** calm, crash, recovery: buy-and-hold ends slightly above the start */
const PHASES: readonly Phase[] = [
  { steps: 60, drift: 0.0015, vol: 0.01 },
  { steps: 60, drift: -0.0125, vol: 0.02 },
  { steps: 120, drift: 0.0072, vol: 0.012 },
];

export function makePath(seed: number): number[] {
  const rng = makeRng(streamSeed(seed, 'hold'));
  const path = [100];
  for (const ph of PHASES) {
    for (let i = 0; i < ph.steps; i += 1) {
      path.push(path[path.length - 1] * Math.exp(ph.drift + ph.vol * rng.normal()));
    }
  }
  return path;
}

export function initHold(seed: number): HoldState {
  return { t: 0, path: makePath(seed), idx: 0, cash: START_CASH, units: 0, inMarket: false, hist: [false] };
}

export function stepHold(s: HoldState, input: Input, dt: number): HoldState {
  const t = Math.min(HOLD_SECONDS, s.t + dt);
  const idx = indexAt(t);
  const price = s.path[idx];
  let { cash, units, inMarket } = s;
  if (input.hold && !inMarket) {
    units = cash / price;
    cash = 0;
    inMarket = true;
  } else if (!input.hold && inMarket) {
    cash = units * price;
    units = 0;
    inMarket = false;
  }
  const hist = [...s.hist, ...new Array<boolean>(Math.max(0, idx - s.idx)).fill(inMarket)];
  return { ...s, t, idx, cash, units, inMarket, hist };
}

export function holdResult(s: HoldState): MiniGameResult {
  const benchmark = (START_CASH * s.path[HOLD_STEPS]) / s.path[0];
  const score = clamp(holdValue(s) / benchmark, 0, 1);
  const summaryKey = score >= 0.9 ? 'mini.hold.lesson.high' : score >= 0.6 ? 'mini.hold.lesson.mid' : 'mini.hold.lesson.low';
  return { score, summaryKey };
}

export const HOLD: GameDef<HoldState> = {
  id: 'hold',
  init: initHold,
  step: stepHold,
  over: (s) => s.t >= HOLD_SECONDS,
  draw: drawHold,
  result: holdResult,
  auto: () => ({ ...NO_INPUT, hold: true }),
  Overlay: HoldOverlay,
};
