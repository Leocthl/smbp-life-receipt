import { makeRng, streamSeed, type Rng } from '../../engine/rng';
import { drawBudget } from './budgetDraw';
import { BudgetOverlay } from './budgetOverlay';
import { C, type Colour } from './draw';
import { burst, stepSparks } from './fx';
import { BASKET_Y, BUDGET_SECONDS, TARGET_RATE, budgetRate, type BudgetState, type Falling, type Kind } from './budgetState';
import { ART_H, ART_W, NO_INPUT, clamp, type GameDef, type Input, type MiniGameResult } from './types';

// Month-end budget: catch pay and needs, dodge wants. Savings rate is the score. Pure sim, no DOM.

interface Spec { kind: Kind; sprite: string; value: number; weight: number }

const SPECS: readonly Spec[] = [
  { kind: 'pay', sprite: 'coin', value: 10, weight: 3 },
  { kind: 'need', sprite: 'rent', value: 6, weight: 1 },
  { kind: 'need', sprite: 'bus', value: 2, weight: 2 },
  { kind: 'need', sprite: 'food', value: 3, weight: 2 },
  { kind: 'want', sprite: 'tea', value: 2, weight: 2 },
  { kind: 'want', sprite: 'gadget', value: 5, weight: 2 },
];

const KIND_COLOUR: Record<Kind, Colour> = { pay: C.sun, need: C.turquoise, want: C.coral };

const SPAWN_EVERY = 0.6;
const FALL_SPEED = 38;
const WALK_SPEED = 0.9;
const CATCH_X = 0.1;
/** a missed bill is still paid, plus this late charge */
const LATE_FEE = 0.5;
const WALLET_MIN = 0.08;
const WALLET_MAX = 0.92;

export function initBudget(seed: number): BudgetState {
  return { t: 0, rng: streamSeed(seed, 'budget'), nextId: 1, nextAt: 0.5, wallet: 0.5, items: [], income: 0, needs: 0, wants: 0, fees: 0, sparks: [] };
}

function spawnDue(s: BudgetState, t: number, rng: Rng): { fresh: Falling[]; nextAt: number; nextId: number } {
  const fresh: Falling[] = [];
  let nextAt = s.nextAt;
  let nextId = s.nextId;
  while (nextAt <= t && nextAt < BUDGET_SECONDS) {
    const spec = rng.weighted(SPECS, (x) => x.weight) ?? SPECS[0];
    fresh.push({ id: nextId, kind: spec.kind, sprite: spec.sprite, value: spec.value, x: 0.1 + rng.float() * 0.8, y: -6 });
    nextId += 1;
    nextAt += SPAWN_EVERY;
  }
  return { fresh, nextAt, nextId };
}

const isCaught = (i: Falling, wallet: number): boolean =>
  i.y >= BASKET_Y - 4 && i.y <= BASKET_Y + 6 && Math.abs(i.x - wallet) <= CATCH_X;

const sumOf = (list: Falling[], kind: Kind): number =>
  list.filter((i) => i.kind === kind).reduce((a, i) => a + i.value, 0);

export function stepBudget(s: BudgetState, input: Input, dt: number): BudgetState {
  const t = s.t + dt;
  const wallet = clamp(input.target ?? s.wallet + input.axis * WALK_SPEED * dt, WALLET_MIN, WALLET_MAX);
  const rng = makeRng(s.rng);
  const { fresh, nextAt, nextId } = spawnDue(s, t, rng);
  const all = [...s.items.map((i) => ({ ...i, y: i.y + FALL_SPEED * dt })), ...fresh];
  const caught = all.filter((i) => isCaught(i, wallet));
  const missed = all.filter((i) => !isCaught(i, wallet) && i.y > ART_H);
  const items = all.filter((i) => !isCaught(i, wallet) && i.y <= ART_H);
  return {
    t, rng: rng.state, nextId, nextAt, wallet, items,
    income: s.income + sumOf(caught, 'pay'),
    needs: s.needs + sumOf(caught, 'need') + sumOf(missed, 'need'),
    wants: s.wants + sumOf(caught, 'want'),
    fees: s.fees + sumOf(missed, 'need') * LATE_FEE,
    sparks: caught.reduce((acc, i) => burst(acc, i.x * ART_W, BASKET_Y, KIND_COLOUR[i.kind], 5), stepSparks(s.sparks, dt)),
  };
}

export function budgetResult(s: BudgetState): MiniGameResult {
  const rate = budgetRate(s);
  const score = clamp(rate / TARGET_RATE, 0, 1);
  const summaryKey = score >= 0.8 ? 'mini.budget.lesson.high' : score >= 0.4 ? 'mini.budget.lesson.mid' : 'mini.budget.lesson.low';
  return { score, summaryKey, vars: { pct: Math.round(rate * 100) } };
}

/** Steer under the nearest falling pay or need. */
function autoBudget(s: BudgetState): Input {
  const next = s.items.filter((i) => i.kind !== 'want').sort((a, b) => b.y - a.y)[0];
  return next ? { ...NO_INPUT, target: next.x } : NO_INPUT;
}

export const BUDGET: GameDef<BudgetState> = {
  id: 'budget',
  init: initBudget,
  step: stepBudget,
  over: (s) => s.t >= BUDGET_SECONDS,
  draw: drawBudget,
  result: budgetResult,
  auto: autoBudget,
  Overlay: BudgetOverlay,
};
