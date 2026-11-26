import { describe, expect, it } from 'vitest';
import { BOT_IDS, type BotId } from '../src/engine/bots';
import { lifeStats } from '../src/engine/endings';
import { ALL_MBTI_CODES, AXIS_POLES, buildFinancialMbti, complementaryPartner, type AxisId, type FinancialMbti } from '../src/engine/mbti';
import { playLife } from '../src/engine/sim';
import { enMbti } from '../src/i18n/en/mbti';
import { zhMbti } from '../src/i18n/zh/mbti';

function runMbti(seed: number, bot: BotId): FinancialMbti {
  const s = playLife(seed, bot);
  // pass a deterministic plain baseline to keep batch tests fast while still realistic
  const st = lifeStats(s, 1_500_000);
  return buildFinancialMbti(s, st);
}

function poleShare(bot: BotId, axisIndex: 0 | 1 | 2 | 3, pole: string, n = 30): number {
  let count = 0;
  for (let seed = 1; seed <= n; seed++) {
    if (runMbti(seed, bot).axes[axisIndex].winner === pole) count++;
  }
  return count / n;
}

describe('financial MBTI engine', () => {
  it('produces valid 4-letter codes, clamped percentages summing to 100, and deterministic serials across all 8 bots', () => {
    const validCodes = new Set<string>(ALL_MBTI_CODES);
    const validGrades = new Set(['S', 'A', 'B', 'C']);

    for (const bot of BOT_IDS) {
      for (let seed = 1; seed <= 8; seed++) {
        const s = playLife(seed, bot);
        const st = lifeStats(s, 1_500_000);
        const m = buildFinancialMbti(s, st);
        const repeat = buildFinancialMbti(s, st);

        expect(m).toEqual(repeat);
        expect(validCodes.has(m.code), `${bot}#${seed} -> ${m.code}`).toBe(true);
        expect(validCodes.has(m.partnerCode)).toBe(true);
        expect(m.partnerCode).not.toBe(m.code);
        expect(complementaryPartner(m.partnerCode)).toBe(m.code);
        expect(m.rarityPct).toBeGreaterThanOrEqual(3);
        expect(m.rarityPct).toBeLessThanOrEqual(11);
        expect(validGrades.has(m.grade)).toBe(true);
        expect(m.barcodeDigits).toMatch(/^\d{16}$/);

        expect(m.axes).toHaveLength(4);
        const reconstructed = m.axes.map((a) => a.winner).join('');
        expect(reconstructed).toBe(m.code);

        for (const ax of m.axes) {
          expect(ax.leftPct + ax.rightPct).toBe(100);
          expect(ax.leftPct).not.toBe(50);
          expect(ax.leftPct).toBeGreaterThanOrEqual(12);
          expect(ax.leftPct).toBeLessThanOrEqual(88);
          expect(ax.rightPct).toBeGreaterThanOrEqual(12);
          expect(ax.rightPct).toBeLessThanOrEqual(88);
          expect(ax.winner).toBe(ax.leftPct > 50 ? ax.leftCode : ax.rightCode);
          expect(ax.loser).toBe(ax.leftPct > 50 ? ax.rightCode : ax.leftCode);
        }
      }
    }
  });

  it('distinguishes bot archetypes meaningfully across all 4 axes', () => {
    // Axis 1 (flow): saver -> S, spender -> E
    expect(poleShare('saver', 0, 'S')).toBeGreaterThan(0.8);
    expect(poleShare('spender', 0, 'E')).toBeGreaterThan(0.8);

    // Axis 2 (risk): saver -> G, tipChaser -> V
    expect(poleShare('saver', 1, 'G')).toBeGreaterThan(0.8);
    expect(poleShare('tipChaser', 1, 'V')).toBeGreaterThan(0.8);

    // Axis 3 (compass): family -> K, while independent-leaning bots like tipChaser / spender lean I more often
    const familyK = poleShare('family', 2, 'K');
    const tipK = poleShare('tipChaser', 2, 'K');
    expect(familyK).toBeGreaterThan(0.75);
    expect(familyK).toBeGreaterThan(tipK + 0.3);

    // Axis 4 (horizon): indexer / saver -> P, panic / debtor -> A
    expect(poleShare('indexer', 3, 'P')).toBeGreaterThan(0.8);
    expect(poleShare('panic', 3, 'A')).toBeGreaterThan(0.7);
    expect(poleShare('debtor', 3, 'A')).toBeGreaterThan(0.7);
  });
});

describe('MBTI bilingual copy completeness', () => {
  it('defines every mbti.* key for all 16 codes, 4 axes, 8 poles, grades, and headers in both zhMbti and enMbti', () => {
    const headerKeys = [
      'mbti.header.brand',
      'mbti.header.serial',
      'mbti.header.rarity',
      'mbti.header.grade',
      'mbti.grade.S',
      'mbti.grade.A',
      'mbti.grade.B',
      'mbti.grade.C',
      'mbti.hero.eyebrow',
      'mbti.axes.title',
      'mbti.strengths.title',
      'mbti.blindspots.title',
      'mbti.scorecard.title',
      'mbti.scorecard.vsPlainUp',
      'mbti.scorecard.vsPlainDown',
      'mbti.scorecard.vsPlainEven',
      'mbti.scorecard.peakSalary',
      'mbti.partner.title',
      'mbti.partner.hint',
      'mbti.barcode.label',
    ];

    const axisKeys = (Object.keys(AXIS_POLES) as AxisId[]).flatMap((id) => [
      `mbti.axis.${id}`,
      `mbti.pole.${AXIS_POLES[id][0]}`,
      `mbti.pole.${AXIS_POLES[id][1]}`,
    ]);

    const typeKeys = ALL_MBTI_CODES.flatMap((code) => [
      `mbti.type.${code}.name`,
      `mbti.type.${code}.motto`,
      `mbti.type.${code}.s1`,
      `mbti.type.${code}.s2`,
      `mbti.type.${code}.s3`,
      `mbti.type.${code}.b1`,
      `mbti.type.${code}.b2`,
    ]);

    const allKeys = [...headerKeys, ...axisKeys, ...typeKeys];

    for (const key of allKeys) {
      expect(zhMbti[key], `missing zhMbti[${key}]`).toBeTruthy();
      expect(enMbti[key], `missing enMbti[${key}]`).toBeTruthy();
    }

    // Also ensure zhMbti and enMbti have the exact same key set
    expect(Object.keys(zhMbti).sort()).toEqual(Object.keys(enMbti).sort());
  });
});
