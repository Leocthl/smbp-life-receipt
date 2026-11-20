import { makeRng, streamSeed, type Rng } from '../../engine/rng';
import { drawCompare } from './compareDraw';
import { CompareOverlay } from './compareOverlay';
import { FEE_GAP, PAUSE_SECONDS, ROUNDS, ROUND_SECONDS, cheapestIndex, fundCost, type CompareState, type Fund } from './compareState';
import { C } from './draw';
import { burst, stepSparks } from './fx';
import { NO_INPUT, clamp, type GameDef, type Input, type MiniGameResult } from './types';

// Fee detective: five rounds of three funds. Pick the lowest all-in cost before the timer runs out.

const ANNUAL = [0.1, 0.2, 0.3, 0.5, 0.8, 1, 1.2, 1.5, 1.8, 2];
const ENTRY = [0, 0.5, 1, 1.5, 2, 3];
const FALLBACK: Omit<Fund, 'name'>[] = [{ annual: 1.5, entry: 0 }, { annual: 0.2, entry: 0 }, { annual: 0.8, entry: 1 }];
const MIN_GAP = 0.3;

function separated(funds: Fund[]): boolean {
  const c = funds.map(fundCost).sort((a, b) => a - b);
  return c[1] - c[0] >= MIN_GAP && c[2] - c[1] >= MIN_GAP;
}

function makeFunds(rng: Rng): Fund[] {
  const offset = rng.int(4);
  for (let tries = 0; tries < 40; tries += 1) {
    const funds = [0, 1, 2].map((k) => ({ name: (offset + k) % 4, annual: rng.pick(ANNUAL), entry: rng.pick(ENTRY) }));
    if (separated(funds)) return funds;
  }
  return FALLBACK.map((f, k) => ({ ...f, name: (offset + k) % 4 }));
}

export function initCompare(seed: number): CompareState {
  const rng = makeRng(streamSeed(seed, 'compare'));
  const funds = makeFunds(rng);
  return { t: 0, rng: rng.state, round: 0, roundLeft: ROUND_SECONDS, funds, pause: 0, lastOk: null, history: [], sparks: [] };
}

function answer(s: CompareState, pick: number, t: number): CompareState {
  const ok = pick === cheapestIndex(s.funds);
  const rng = makeRng(s.rng);
  return {
    ...s, t, rng: rng.state, round: s.round + 1, roundLeft: ROUND_SECONDS, funds: makeFunds(rng),
    pause: PAUSE_SECONDS, lastOk: ok, history: [...s.history, ok],
    sparks: burst(s.sparks, 60, 96, ok ? C.sun : C.coral, ok ? 14 : 6),
  };
}

export function stepCompare(s: CompareState, input: Input, dt: number): CompareState {
  const t = s.t + dt;
  const sparks = stepSparks(s.sparks, dt);
  if (s.pause > 0) return { ...s, t, sparks, pause: clamp(s.pause - dt, 0, PAUSE_SECONDS) };
  if (s.round >= ROUNDS) return { ...s, sparks };
  if (input.pick !== null) return answer(s, input.pick, t);
  const roundLeft = s.roundLeft - dt;
  return roundLeft <= 0 ? answer(s, -1, t) : { ...s, t, sparks, roundLeft };
}

export function compareResult(s: CompareState): MiniGameResult {
  const score = s.history.filter(Boolean).length / ROUNDS;
  return { score, summaryKey: score >= 0.6 ? 'mini.compare.lesson.high' : 'mini.compare.lesson.low', vars: { gap: FEE_GAP } };
}

export const COMPARE: GameDef<CompareState> = {
  id: 'compare',
  init: initCompare,
  step: stepCompare,
  over: (s) => s.round >= ROUNDS && s.pause <= 0,
  draw: drawCompare,
  result: compareResult,
  auto: (s) => ({ ...NO_INPUT, pick: s.pause > 0 ? null : cheapestIndex(s.funds) }),
  Overlay: CompareOverlay,
};
