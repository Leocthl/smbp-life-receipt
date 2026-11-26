import { describe, expect, it } from 'vitest';
import { BOT_IDS } from '../src/engine/bots';
import { buildEnding } from '../src/engine/endings';
import { ALL_HEX_ARCHETYPES, buildHexReport } from '../src/engine/hexReport';
import { playLife } from '../src/engine/sim';
import { enHexReport } from '../src/i18n/en/hexReport';
import { zhHexReport } from '../src/i18n/zh/hexReport';
import { QUALITIES } from '../src/world3d/qualities';

describe('Life Hexagon deep report engine', () => {
  it('is deterministic and produces valid 0..100 hexagon axes and peaks', () => {
    const state = playLife(42, 'balanced');
    const ending = buildEnding(state, 'security');
    const a = buildHexReport(state, ending.stats);
    const b = buildHexReport(state, ending.stats);
    expect(a).toEqual(b);
    expect(ALL_HEX_ARCHETYPES).toContain(a.archetype);
    expect(ALL_HEX_ARCHETYPES).toContain(a.partnerArchetype);
    expect(a.axes).toHaveLength(6);
    for (const axis of a.axes) {
      expect(axis.score).toBeGreaterThanOrEqual(0);
      expect(axis.score).toBeLessThanOrEqual(100);
      expect(axis.delta).toBe(axis.score - axis.startScore);
    }
    const maxScore = Math.max(...a.axes.map((x) => x.score));
    const minScore = Math.min(...a.axes.map((x) => x.score));
    expect(a.finalQ[a.topTwo[0]]).toBe(maxScore);
    expect(a.finalQ[a.growthEdge]).toBe(minScore);
    expect(a.barcodeDigits).toMatch(/^\d{16}$/);
  });

  it('produces meaningful hexagon archetype separation across bot strategies', () => {
    const archs = new Set<string>();
    for (const bot of BOT_IDS) {
      const s = playLife(77, bot);
      const e = buildEnding(s, 'security');
      const r = buildHexReport(s, e.stats);
      archs.add(r.archetype);
      expect(r.symmetryPct).toBeGreaterThanOrEqual(15);
      expect(r.symmetryPct).toBeLessThanOrEqual(100);
    }
    expect(archs.size).toBeGreaterThanOrEqual(4);
  });

  it('has complete bilingual copy parity for all 12 archetypes and 6x3 dimension reads without MBTI branding', () => {
    expect(Object.keys(zhHexReport).sort()).toEqual(Object.keys(enHexReport).sort());
    for (const arch of ALL_HEX_ARCHETYPES) {
      for (const suffix of ['name', 'motto', 's1', 's2', 's3', 'b1', 'b2']) {
        const key = `hexr.arch.${arch}.${suffix}`;
        expect(zhHexReport[key], `zh ${key}`).toBeTruthy();
        expect(enHexReport[key], `en ${key}`).toBeTruthy();
      }
    }
    for (const q of QUALITIES) {
      for (const tier of ['peak', 'solid', 'growing']) {
        const key = `hexr.dim.${q}.${tier}`;
        expect(zhHexReport[key], `zh ${key}`).toBeTruthy();
        expect(enHexReport[key], `en ${key}`).toBeTruthy();
      }
    }
    for (const val of [...Object.values(zhHexReport), ...Object.values(enHexReport)]) {
      expect(val).not.toMatch(/MBTI/i);
    }
  });
});
