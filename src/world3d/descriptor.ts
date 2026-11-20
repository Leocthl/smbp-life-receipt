import { netWorth, riskyHoldings } from '../engine/finance';
import { regimeForTurn } from '../engine/market';
import type { GameState, Regime } from '../engine/types';
import { qualities, type Qualities } from './qualities';

/**
 * Everything the 3D world needs to know about a life, and nothing else. Pure and cheap, so the stage can rebuild
 * the world whenever key() changes. Flags come from real content (setFlags in src/data/events).
 */
export interface WorldDescriptor {
  age: number;
  turn: number;
  stage: 'uni' | 'work' | 'retired';
  job: GameState['job'];
  /** where the player lives: with parents, a rented flat, or their own flat */
  home: 'parents' | 'rent' | 'owner';
  partner: boolean;
  kids: number;
  car: boolean;
  sideHustle: boolean;
  insured: boolean;
  burntOut: boolean;
  bankrupt: boolean;
  regime: Regime;
  /** share of net worth in markets, 0..1 */
  invested: number;
  /** lifestyle spending, 0..1 (HK$0 .. HK$15k a month) */
  lifestyle: number;
  q: Qualities;
  done: boolean;
}

export function worldFor(s: GameState): WorldDescriptor {
  const has = (f: string) => s.flags.includes(f);
  const nw = Math.max(1, netWorth(s));
  return {
    age: s.age,
    turn: s.turn,
    stage: s.job === 'student' ? 'uni' : s.job === 'retired' || has('early_retired') ? 'retired' : 'work',
    job: s.job,
    home: has('homeowner') ? 'owner' : has('moved_out') ? 'rent' : 'parents',
    partner: has('married'),
    kids: has('has_kid') ? 1 : 0,
    car: has('has_car'),
    sideHustle: s.hustle > 0 || has('side_hustle'),
    insured: has('medical_insured'),
    burntOut: has('burnt_out'),
    bankrupt: s.bankrupt,
    regime: regimeForTurn(s.market, Math.min(s.turn, s.market.levels.cash.length - 1)),
    invested: Math.max(0, Math.min(1, (riskyHoldings(s) + s.holdings.mpf) / nw)),
    lifestyle: Math.max(0, Math.min(1, s.expenses.lifestyle / 15_000)),
    q: qualities(s),
    done: s.done,
  };
}

/** Changes only when something visible changes; the stage rebuilds the world when this differs. */
export function worldKey(d: WorldDescriptor): string {
  const band = (v: number) => Math.round(v / 20);
  return [d.stage, d.job, d.home, d.partner, d.kids, d.car, d.sideHustle, d.insured, d.burntOut, d.bankrupt, d.regime,
    Math.round(d.invested * 4), Math.round(d.lifestyle * 3), ...Object.values(d.q).map(band), Math.floor(d.age / 10)].join('|');
}
