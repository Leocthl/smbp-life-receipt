import { describe, expect, it } from 'vitest';
import { generateMarket, LIFE_YEARS, realiseRegime, stepMarket, growth } from '../src/engine/market';
import type { MarketState } from '../src/engine/types';

function realiseAll(m: MarketState, firstInvestYear: number | null) {
  const work: MarketState = { ...m, regimes: [] };
  for (let y = 0; y < LIFE_YEARS; y++) work.regimes.push(realiseRegime(work, y, firstInvestYear));
  return work.regimes;
}

describe('market', () => {
  it('is deterministic per seed', () => {
    expect(generateMarket(5).baseRegimes).toEqual(generateMarket(5).baseRegimes);
  });
  it('every crash is followed by recovery or another crash, never a crash in the last 2 years', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const r = generateMarket(seed).baseRegimes;
      expect(r.slice(-2)).not.toContain('crash');
      r.forEach((x, i) => {
        if (x === 'crash' && i + 1 < r.length) expect(['recovery', 'crash']).toContain(r[i + 1]);
      });
      // at most 2 crash years in a row
      expect(r.join(',')).not.toContain('crash,crash,crash');
    }
  });
  it('no crash within 2 years of the first investment', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const m = generateMarket(seed);
      for (const first of [0, 4, 10, 20]) {
        const r = realiseAll(m, first);
        expect(r.slice(first, first + 2)).not.toContain('crash');
      }
    }
  });
  it('crashes still happen in some lives and recovery follows within a playable time', () => {
    let crashes = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const r = realiseAll(generateMarket(seed), 4);
      r.forEach((x, i) => {
        if (x !== 'crash') return;
        crashes++;
        if (i + 1 < r.length && r[i + 1] !== 'crash') expect(['recovery', 'correction']).toContain(r[i + 1]);
      });
    }
    expect(crashes).toBeGreaterThan(50);
  });
  it('stepMarket appends levels without touching the input', () => {
    const m = generateMarket(9);
    const before = JSON.stringify(m);
    const { market } = stepMarket(m, 0);
    expect(JSON.stringify(m)).toBe(before);
    expect(market.levels.index.length).toBe(2);
    expect(growth(market, 'cash', 0, 1)).toBe(1);
  });
  it('long-run index return is realistic (~5-8% a year net)', () => {
    let total = 0;
    const N = 400;
    for (let seed = 1; seed <= N; seed++) {
      let m = generateMarket(seed);
      for (let t = 0; t < 51; t++) m = stepMarket(m, t).market;
      total += Math.log(growth(m, 'index', 0, 51)) / 47;
    }
    const cagr = Math.exp(total / N) - 1;
    expect(cagr).toBeGreaterThan(0.04);
    expect(cagr).toBeLessThan(0.09);
  });
});
