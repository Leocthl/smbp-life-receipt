import { ASSETS, CRASH_PROTECTION_YEARS, INFLATION, INFLATION_VOL, NO_CRASH_LAST_YEARS, REGIMES, TRANSITIONS } from '../data/market';
import { CONFIG } from '../data/config';
import { makeRng, streamSeed } from './rng';
import type { MarketAsset, MarketState, Regime } from './types';

export const LIFE_YEARS = CONFIG.retireAge - CONFIG.startAge; // 47 years, index 0 = age 18
export const MARKET_ASSETS: MarketAsset[] = ['cash', 'savings', 'index', 'bond', 'stock', 'crypto', 'mpf', 'mpfEquity', 'property'];
type Modelled = keyof typeof ASSETS;
const MODELLED = Object.keys(ASSETS) as Modelled[];

/** Pre-generate the market path from its own seeded stream, so player choices never change it. */
export function generateMarket(seed: number): MarketState {
  const rng = makeRng(streamSeed(seed, 'market'));
  const baseRegimes: Regime[] = [];
  let prev: Regime = 'normal';
  for (let y = 0; y < LIFE_YEARS; y++) {
    const row: Record<Regime, number> = TRANSITIONS[prev];
    let r: Regime = rng.weighted(REGIMES, (k: Regime) => row[k]) ?? 'normal';
    const twoCrashesBefore = y >= 2 && baseRegimes[y - 1] === 'crash' && baseRegimes[y - 2] === 'crash';
    if (r === 'crash' && twoCrashesBefore) r = 'recovery';
    if (r === 'crash' && y >= LIFE_YEARS - NO_CRASH_LAST_YEARS) r = prev === 'crash' ? 'recovery' : 'correction';
    baseRegimes.push(r);
    prev = r;
  }
  const shocks: Record<string, number[]> = {};
  for (const a of MODELLED) shocks[a] = Array.from({ length: LIFE_YEARS }, () => rng.normal());
  const inflationShocks = Array.from({ length: LIFE_YEARS }, () => rng.normal());
  const levels = Object.fromEntries(MARKET_ASSETS.map((a) => [a, [1]])) as Record<MarketAsset, number[]>;
  return { baseRegimes, shocks, inflationShocks, regimes: [], levels, firstInvestTurn: null };
}

export function turnToAge(turn: number): number {
  return turn < CONFIG.uniTurns ? CONFIG.startAge + turn / 2 : 22 + (turn - CONFIG.uniTurns);
}
export function turnYears(turn: number): number {
  return turn < CONFIG.uniTurns ? 0.5 : 1;
}
export function yearIndex(turn: number): number {
  return Math.floor(turnToAge(turn) - CONFIG.startAge);
}

/**
 * Realised regime for a life-year, applying the protection rules:
 * - the first crash cannot land within CRASH_PROTECTION_YEARS of the player's first investment
 * - a crash is always followed by recovery (base path guarantees it; downgrades keep it)
 */
export function realiseRegime(m: MarketState, year: number, firstInvestYear: number | null): Regime {
  const base = m.baseRegimes[year] ?? 'normal';
  if (base !== 'crash') return base;
  if (firstInvestYear === null) return base;
  const crashSeen = m.regimes.slice(firstInvestYear).includes('crash');
  if (!crashSeen && year < firstInvestYear + CRASH_PROTECTION_YEARS) return 'correction';
  return base;
}

export function regimeForTurn(m: MarketState, turn: number): Regime {
  const y = yearIndex(turn);
  return m.regimes[y] ?? realiseRegime(m, y, m.firstInvestTurn === null ? null : yearIndex(m.firstInvestTurn));
}

/** Annual gross return for an asset in a given year. Log-normal so prices never go below zero. */
export function annualReturn(m: MarketState, asset: Modelled, year: number, regime: Regime): number {
  const model = ASSETS[asset];
  const z = asset === 'stock'
    ? 0.5 * m.shocks.index[year] + Math.sqrt(0.75) * m.shocks.stock[year]
    : asset === 'mpf' || asset === 'mpfEquity'
      ? 0.8 * m.shocks.index[year] + 0.6 * m.shocks[asset][year]
      : m.shocks[asset][year];
  const mu = Math.log(1 + model.mean[regime]);
  return Math.exp(mu - (model.vol * model.vol) / 2 + model.vol * z) - 1;
}

export function inflationFor(m: MarketState, year: number, regime: Regime): number {
  return INFLATION[regime] + INFLATION_VOL * m.inflationShocks[year];
}

/** Net-of-fee growth factor for one turn. */
export function turnFactor(m: MarketState, asset: MarketAsset, year: number, regime: Regime, years: number): { gross: number; net: number } {
  if (asset === 'cash') return { gross: 1, net: 1 };
  const r = annualReturn(m, asset, year, regime);
  const gross = Math.pow(1 + r, years);
  const net = gross * (1 - ASSETS[asset].fee * years);
  return { gross, net };
}

/**
 * Advance the market one turn: fixes the realised regime for the year (once) and appends price levels.
 * Returns a new MarketState plus the per-asset factors for this turn.
 */
export function stepMarket(m: MarketState, turn: number): { market: MarketState; regime: Regime; factors: Record<MarketAsset, { gross: number; net: number }> } {
  const year = yearIndex(turn);
  const years = turnYears(turn);
  const firstYear = m.firstInvestTurn === null ? null : yearIndex(m.firstInvestTurn);
  const filled = m.regimes.length > year ? m.regimes : [...m.regimes, ...fill(m, year, firstYear)];
  // the year's regime may have been fixed before the player's first investment this year: re-apply protection
  const protect = filled[year] === 'crash' && firstYear !== null && year < firstYear + CRASH_PROTECTION_YEARS
    && !filled.slice(firstYear, year).includes('crash');
  const regimes = protect ? filled.map((r, i) => (i === year ? 'correction' : r)) : filled;
  const regime = regimes[year];
  const withRegimes = { ...m, regimes };
  const factors = Object.fromEntries(MARKET_ASSETS.map((a) => [a, turnFactor(withRegimes, a, year, regime, years)])) as Record<MarketAsset, { gross: number; net: number }>;
  const levels = Object.fromEntries(
    MARKET_ASSETS.map((a) => {
      const arr = m.levels[a];
      return [a, [...arr, arr[arr.length - 1] * factors[a].net]];
    }),
  ) as Record<MarketAsset, number[]>;
  return { market: { ...withRegimes, levels }, regime, factors };
}

/** Fix the realised regime for the current year (called when a turn starts, so cards can react to it). */
export function ensureRegime(m: MarketState, turn: number): MarketState {
  const year = yearIndex(turn);
  if (m.regimes.length > year) return m;
  const firstYear = m.firstInvestTurn === null ? null : yearIndex(m.firstInvestTurn);
  return { ...m, regimes: [...m.regimes, ...fill(m, year, firstYear)] };
}

function fill(m: MarketState, year: number, firstYear: number | null): Regime[] {
  const out: Regime[] = [];
  const work = { ...m, regimes: [...m.regimes] };
  for (let y = m.regimes.length; y <= year; y++) {
    const r = realiseRegime(work, y, firstYear);
    work.regimes.push(r);
    out.push(r);
  }
  return out;
}

/** Growth of 1 dollar in an asset from the start of turn a to the start of turn b. */
export function growth(m: MarketState, asset: MarketAsset, from: number, to: number): number {
  const lv = m.levels[asset];
  const end = lv[Math.min(to, lv.length - 1)];
  const start = lv[Math.min(from, lv.length - 1)];
  return start > 0 ? end / start : 1;
}
