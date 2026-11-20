import { ALL_EVENTS } from '../data/events';
import { GOAL_RULES, LABELS, MISTAKES, MOMENTS, type MetricKey } from '../data/endings';
import { playLife } from './sim';
import { netWorth } from './finance';
import { growth, turnYears } from './market';
import type { DecisionLogEntry, GameState, Goal, MarketAsset, Tag } from './types';

const TAGS: Tag[] = ['save', 'invest', 'risky', 'spend', 'fun', 'debt', 'family', 'sell', 'hold', 'safe', 'status', 'work', 'career', 'insure'];

export interface LifeStats {
  netWorth: number;
  plainNetWorth: number;
  avgHappiness: number;
  avgRelationships: number;
  lowRunwayYears: number;
  highDebtYears: number;
  avgRunway: number;
  fees: number;
  avoidableFees: number;
  interest: number;
  surrenderLoss: number;
  panicSells: number;
  funDecisions: number;
  familyDecisions: number;
  peakSalary: number;
  homeowner: boolean;
  earlyRetiredAge: number | null;
  bankrupt: boolean;
  scammed: boolean;
}

/** Plain-plan comparison: the same seed and starting character, played by the balanced bot. */
export function plainPlanNetWorth(s: GameState): number {
  return netWorth(playLife(s.seed, 'balanced', ALL_EVENTS, s.character));
}

export function lifeStats(s: GameState, plainNetWorth = plainPlanNetWorth(s)): LifeStats {
  const h = s.history;
  const years = (pred: (i: number) => boolean) => h.reduce((a, x, i) => a + (pred(i) ? turnYears(x.turn) : 0), 0);
  const total = h.reduce((a, x) => a + turnYears(x.turn), 0) || 1;
  const avg = (f: (i: number) => number) => h.reduce((a, x, i) => a + f(i) * turnYears(x.turn), 0) / total;
  const log = s.decisionLog;
  const retired = log.find((d) => d.choiceId.includes('retire') && s.flags.includes('early_retired'));
  return {
    netWorth: netWorth(s),
    plainNetWorth,
    avgHappiness: avg((i) => h[i].happiness),
    avgRelationships: avg((i) => h[i].relationships),
    lowRunwayYears: years((i) => h[i].age >= 22 && h[i].runway < 1),
    highDebtYears: years((i) => h[i].highInterestDebt > 0),
    avgRunway: avg((i) => Math.min(h[i].runway, 60)),
    fees: s.totals.fees,
    avoidableFees: s.totals.avoidableFees,
    interest: s.totals.interest,
    surrenderLoss: s.totals.surrenderLoss,
    // only sells that missed a rebound count; selling before a further fall was not a mistake
    panicSells: log.filter((d) => d.counterfactual?.key === 'panic_sell' && growth(s.market, 'index', d.turn, s.history.length) > 1).length,
    funDecisions: log.filter((d) => d.tags.includes('fun')).length,
    familyDecisions: log.filter((d) => d.tags.includes('family')).length,
    peakSalary: Math.max(0, ...h.map((x) => x.income / turnYears(x.turn) / 12)),
    homeowner: s.flags.includes('homeowner'),
    earlyRetiredAge: retired ? Math.floor(retired.age) : null,
    bankrupt: s.bankrupt,
    scammed: log.some((d) => d.outcomeId === 'scam'),
  };
}

export function metrics(s: GameState, st: LifeStats): Record<MetricKey, number> {
  const n = s.decisionLog.length || 1;
  const share = Object.fromEntries(TAGS.map((t) => [t, s.decisionLog.filter((d) => d.tags.includes(t)).length / n])) as Record<Tag, number>;
  const working = 43; // working years, 22-65
  const ratio = st.plainNetWorth > 0 ? st.netWorth / st.plainNetWorth : 1;
  return {
    ...share,
    // a bit of everything: saving, investing and enjoying life
    mix: Math.min(1, 3 * Math.min(share.save, share.invest + share.hold, share.spend + share.fun)),
    lowRunway: Math.min(1, st.lowRunwayYears / working),
    highDebt: Math.min(1, st.highDebtYears / working),
    beatPlain: ratio > 1.15 ? 1 : 0,
    belowPlain: ratio < 0.85 ? 1 : 0,
    happiness: st.avgHappiness / 100,
    relationships: st.avgRelationships / 100,
    // the label describes behaviour, so every sell in a drop counts here (the mistake list only counts the costly ones)
    panicSells: Math.min(1, s.decisionLog.filter((d) => d.counterfactual?.key === 'panic_sell').length / 2),
    bankrupt: st.bankrupt ? 1 : 0,
  };
}

/** Pick the behaviour label with the highest score. Returns all scores for debugging and balance reports. */
export function pickLabel(m: Record<MetricKey, number>): { id: string; scores: Record<string, number> } {
  const scores = Object.fromEntries(LABELS.map((l) => [l.id, Object.entries(l.weights).reduce((a, [k, w]) => a + (w ?? 0) * m[k as MetricKey], 0)]));
  const id = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  return { id, scores };
}

export interface GoalVerdict { goal: Goal; hit: boolean; key: string; vars: Record<string, number> }

/** Compare what the player said they wanted with what their record shows. Reflects, never judges. */
export function compareGoal(goal: Goal, st: LifeStats): GoalVerdict {
  const r = GOAL_RULES;
  switch (goal) {
    case 'security': {
      const hit = st.lowRunwayYears < r.security.lowRunwayYears;
      return { goal, hit, key: `goal.security.${hit ? 'hit' : 'miss'}`, vars: { n: Math.round(st.lowRunwayYears), runway: Math.round(st.avgRunway) } };
    }
    case 'freedom': {
      if (st.earlyRetiredAge) return { goal, hit: true, key: 'goal.freedom.early', vars: { age: st.earlyRetiredAge } };
      const hit = st.highDebtYears < r.freedom.highDebtYears;
      return { goal, hit, key: `goal.freedom.${hit ? 'hit' : 'miss'}`, vars: { n: Math.round(st.highDebtYears) } };
    }
    case 'experiences': {
      const hit = st.funDecisions >= r.experiences.funDecisions;
      return { goal, hit, key: `goal.experiences.${hit ? 'hit' : 'miss'}`, vars: { n: st.funDecisions } };
    }
    case 'family': {
      const hit = st.avgRelationships >= r.family.relationships && st.familyDecisions >= r.family.familyDecisions;
      return { goal, hit, key: `goal.family.${hit ? 'hit' : 'miss'}`, vars: { n: st.familyDecisions, rel: Math.round(st.avgRelationships) } };
    }
    case 'status': {
      const hit = st.homeowner || st.peakSalary >= r.status.peakSalary;
      return { goal, hit, key: `goal.status.${hit ? 'hit' : 'miss'}`, vars: { salary: Math.round(st.peakSalary) } };
    }
  }
}

export interface Moment { entry: DecisionLogEntry; key: string; vars: Record<string, number>; weight: number }

const levelOrZero = (s: GameState, a: MarketAsset | 'spent', from: number) => (a === 'spent' ? 0 : growth(s.market, a, from, s.history.length));

/** Key decisions with counterfactuals ("holding would be worth $X more today"), in life order. */
export function moments(s: GameState, max: number = MOMENTS.max): Moment[] {
  const out: Moment[] = [];
  for (const e of s.decisionLog) {
    const cf = e.counterfactual;
    if (cf) {
      const actual = cf.amount * levelOrZero(s, cf.actual, e.turn);
      const alt = cf.amount * levelOrZero(s, cf.alt, e.turn);
      const key = cf.key === 'panic_sell' && alt < actual ? 'cf.panic_sell_saved' : `cf.${cf.key}`;
      out.push({ entry: e, key, vars: { age: Math.floor(e.age), amount: Math.round(cf.amount), value: Math.round(alt), diff: Math.round(Math.abs(alt - actual)) }, weight: Math.abs(alt - actual) });
    } else if (Math.abs(e.netWorthDelta) >= 20_000) {
      out.push({ entry: e, key: e.netWorthDelta > 0 ? 'moment.gain' : 'moment.loss', vars: { age: Math.floor(e.age), amount: Math.round(Math.abs(e.netWorthDelta)) }, weight: Math.abs(e.netWorthDelta) });
    }
  }
  return out.sort((a, b) => b.weight - a.weight).slice(0, max).sort((a, b) => a.entry.turn - b.entry.turn);
}

export interface Mistake { key: string; vars: Record<string, number> }

export function mistakes(st: LifeStats): Mistake[] {
  const out: Mistake[] = [];
  if (st.lowRunwayYears >= MISTAKES.noBufferYears) out.push({ key: 'mistake.noBuffer', vars: { n: Math.round(st.lowRunwayYears) } });
  if (st.highDebtYears >= MISTAKES.highDebtYears) out.push({ key: 'mistake.highDebt', vars: { n: Math.round(st.highDebtYears), interest: Math.round(st.interest) } });
  if (st.avoidableFees > MISTAKES.feeMin && st.avoidableFees > Math.max(0, st.netWorth) * MISTAKES.feeShareOfNetWorth) out.push({ key: 'mistake.fees', vars: { fees: Math.round(st.avoidableFees) } });
  if (st.surrenderLoss > 1_000) out.push({ key: 'mistake.surrender', vars: { loss: Math.round(st.surrenderLoss) } });
  if (st.panicSells > 0) out.push({ key: 'mistake.panic', vars: { n: st.panicSells } });
  if (st.scammed) out.push({ key: 'mistake.scam', vars: {} });
  return out;
}

export interface Ending { label: string; stats: LifeStats; goal: GoalVerdict; moments: Moment[]; mistakes: Mistake[] }

export function buildEnding(s: GameState, goal: Goal): Ending {
  const st = lifeStats(s);
  return { label: pickLabel(metrics(s, st)).id, stats: st, goal: compareGoal(goal, st), moments: moments(s), mistakes: mistakes(st) };
}
