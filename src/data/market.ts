import type { Regime } from '../engine/types';

// Regime model, loosely shaped on real history: long normal/bull stretches,
// occasional corrections, rare crashes (2000-02 dot-com, 2008, 2020) that are
// always followed by a recovery year.
export const REGIMES: Regime[] = ['bull', 'normal', 'correction', 'crash', 'recovery'];

/** Year-to-year transition probabilities. Rows sum to 1. */
export const TRANSITIONS: Record<Regime, Record<Regime, number>> = {
  normal:     { normal: 0.55, bull: 0.25, correction: 0.16, crash: 0.04, recovery: 0 },
  bull:       { normal: 0.37, bull: 0.40, correction: 0.17, crash: 0.06, recovery: 0 },
  correction: { normal: 0.45, bull: 0.05, correction: 0.13, crash: 0.12, recovery: 0.25 },
  crash:      { normal: 0, bull: 0, correction: 0, crash: 0.2, recovery: 0.8 },
  recovery:   { normal: 0.45, bull: 0.35, correction: 0.05, crash: 0, recovery: 0.15 },
};

export interface AssetModel {
  /** expected annual return per regime (gross of fees) */
  mean: Record<Regime, number>;
  /** annual volatility within a regime */
  vol: number;
  /** annual fee as a fraction of value */
  fee: number;
}

// Broad equity numbers: S&P-like long-run ~7% nominal with ~15% total vol once regimes are mixed in.
// Fees: broad index ETF ~0.1-0.3% (ASSUMPTION 0.3% incl. platform), bond fund 0.5%.
export const ASSETS: Record<'savings' | 'index' | 'bond' | 'stock' | 'crypto' | 'mpf' | 'mpfEquity' | 'property', AssetModel> = {
  savings:  { mean: { bull: 0.03, normal: 0.025, correction: 0.025, crash: 0.015, recovery: 0.02 }, vol: 0, fee: 0 },
  index:    { mean: { bull: 0.2, normal: 0.075, correction: -0.12, crash: -0.32, recovery: 0.22 }, vol: 0.07, fee: 0.003 },
  bond:     { mean: { bull: 0.02, normal: 0.035, correction: 0.03, crash: 0.05, recovery: 0.04 }, vol: 0.03, fee: 0.005 },
  // single stock: index-like regime moves plus a big company-specific swing
  stock:    { mean: { bull: 0.22, normal: 0.06, correction: -0.16, crash: -0.4, recovery: 0.24 }, vol: 0.35, fee: 0 },
  // crypto: huge swings, rare jackpots, poor median
  crypto:   { mean: { bull: 0.9, normal: -0.05, correction: -0.45, crash: -0.65, recovery: 0.5 }, vol: 0.7, fee: 0.005 },
  // MPF default (DIS Core Accumulation ~60/40); fee cap 0.95% aggregate (see hkFacts)
  mpf:      { mean: { bull: 0.13, normal: 0.06, correction: -0.06, crash: -0.18, recovery: 0.15 }, vol: 0.04, fee: 0.0095 },
  // self-chosen MPF equity fund; avg FER ~1.43%
  mpfEquity:{ mean: { bull: 0.2, normal: 0.075, correction: -0.13, crash: -0.33, recovery: 0.22 }, vol: 0.09, fee: 0.0143 },
  // HK residential: long-run ~3% nominal with sharp falls in crises (ASSUMPTION)
  property: { mean: { bull: 0.08, normal: 0.03, correction: -0.06, crash: -0.15, recovery: 0.06 }, vol: 0.05, fee: 0 },
};

/** inflation by regime (base ~2%, HK CPI 1.9% Sep 2026) */
export const INFLATION: Record<Regime, number> = { bull: 0.028, normal: 0.02, correction: 0.018, crash: 0.005, recovery: 0.015 };
export const INFLATION_VOL = 0.007;

/** crashes may not happen in the last N years, so every crash gets a playable recovery */
export const NO_CRASH_LAST_YEARS = 2;
/** first crash may not land within this many years of the player's first investment */
export const CRASH_PROTECTION_YEARS = 2;
