import { describe, expect, it } from 'vitest';
import { ALL_EVENTS } from '../src/data/events';
import { GOALS, LABELS } from '../src/data/endings';
import { BOT_IDS, type BotId } from '../src/engine/bots';
import { defaultCharacter } from '../src/engine/character';
import { buildEnding, compareGoal, lifeStats, metrics, mistakes, moments, pickLabel } from '../src/engine/endings';
import { growth } from '../src/engine/market';
import { playLife } from '../src/engine/sim';
import { en } from '../src/i18n/en';
import { zh } from '../src/i18n/zh';

const N = 40;
const labelOf = (seed: number, bot: BotId) => { const s = playLife(seed, bot); return pickLabel(metrics(s, lifeStats(s))).id; };
// 100 lives per style: enough that one unlucky seed doesn't decide the share
const SHARE_N = 100;
const share = (bot: BotId, ids: string[]) => Array.from({ length: SHARE_N }, (_, i) => labelOf(i + 1, bot)).filter((l) => ids.includes(l)).length / SHARE_N;

describe('ending labels', () => {
  it('a consistent style mostly lands in its own label', () => {
    expect(share('saver', ['saverKing'])).toBeGreaterThan(0.6);
    expect(share('indexer', ['zenInvestor'])).toBeGreaterThan(0.6);
    expect(share('spender', ['moonlight'])).toBeGreaterThan(0.5);
    expect(share('tipChaser', ['riskWinner', 'rollercoaster'])).toBeGreaterThan(0.8);
    expect(share('debtor', ['debtJuggler'])).toBeGreaterThan(0.5);
    expect(share('family', ['familyPillar'])).toBeGreaterThan(0.5);
    expect(share('balanced', ['steady'])).toBeGreaterThan(0.45);
    expect(share('panic', ['exitOnRed'])).toBeGreaterThan(0.5);
  });
  it('every label is reachable', () => {
    const seen = new Set<string>();
    for (const bot of BOT_IDS) for (let i = 1; i <= N; i++) seen.add(labelOf(i, bot));
    for (const l of LABELS) expect(seen).toContain(l.id);
  });
});

describe('ending text', () => {
  it('every label, goal, counterfactual and mistake key exists in zh and en', () => {
    const keys = [
      ...LABELS.flatMap((l) => [`label.${l.id}`, `label.${l.id}.desc`]),
      ...GOALS.flatMap((g) => [`goalq.${g}`, `goal.${g}.hit`, `goal.${g}.miss`]),
      'goal.freedom.early', 'moment.gain', 'moment.loss',
      ...[...new Set(ALL_EVENTS.flatMap((e) => e.choices.map((c) => c.counterfactual?.key).filter(Boolean)))].map((k) => `cf.${k}`),
      'mistake.noBuffer', 'mistake.highDebt', 'mistake.fees', 'mistake.surrender', 'mistake.panic', 'mistake.scam',
    ];
    for (const k of keys) {
      expect(zh[k], `zh ${k}`).toBeTruthy();
      expect(en[k], `en ${k}`).toBeTruthy();
    }
  });
});

describe('ending pieces', () => {
  it('panic-sell counterfactual equals amount x (index growth - 1)', () => {
    for (let seed = 1; seed < 80; seed++) {
      const s = playLife(seed, 'panic');
      const m = moments(s, 99).find((x) => x.key === 'cf.panic_sell');
      if (!m) continue;
      const g = growth(s.market, 'index', m.entry.turn, s.history.length);
      expect(m.vars.diff).toBeCloseTo(m.vars.amount * (g - 1), -2);
      return;
    }
    throw new Error('no panic sell found in 80 lives');
  });
  it('goal comparison reflects the record', () => {
    const s = playLife(3, 'spender');
    const st = lifeStats(s);
    const v = compareGoal('security', st);
    expect(v.hit).toBe(st.lowRunwayYears < 3);
    expect(compareGoal('experiences', { ...st, funDecisions: 9 }).hit).toBe(true);
  });
  it('fees are only a mistake when they are avoidable and large', () => {
    let flagged = 0;
    for (let seed = 1; seed <= 30; seed++) if (mistakes(lifeStats(playLife(seed, 'saver'), 1)).some((m) => m.key === 'mistake.fees')) flagged++;
    expect(flagged).toBe(0);
  });
  it('a sell before a further fall is told as money saved, never as a negative loss', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const m of moments(playLife(seed, 'panic'), 99)) {
        expect(m.vars.diff ?? 0).toBeGreaterThanOrEqual(0);
        if (m.key === 'cf.panic_sell_saved') return;
      }
    }
    throw new Error('no saved-by-selling moment in 200 lives');
  });
  it('mistakes are listed separately and a careful life can have none', () => {
    const st = lifeStats(playLife(5, 'saver'));
    expect(mistakes({ ...st, lowRunwayYears: 0, highDebtYears: 0, avoidableFees: 0, surrenderLoss: 0, panicSells: 0, scammed: false })).toEqual([]);
    expect(mistakes({ ...st, highDebtYears: 6 }).map((m) => m.key)).toContain('mistake.highDebt');
  });
  it('buildEnding compares against a plain plan from the same start', () => {
    const s = playLife(7, 'tipChaser', ALL_EVENTS, defaultCharacter());
    const e = buildEnding(s, 'freedom');
    expect(e.stats.plainNetWorth).toBeGreaterThan(0);
    expect(e.moments.length).toBeLessThanOrEqual(6);
  });
});
