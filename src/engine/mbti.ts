import { metrics, type LifeStats } from './endings';
import type { GameState } from './types';

export type AxisId = 'flow' | 'risk' | 'compass' | 'horizon';
export type FlowPole = 'S' | 'E';
export type RiskPole = 'G' | 'V';
export type CompassPole = 'I' | 'K';
export type HorizonPole = 'P' | 'A';
export type PoleCode = FlowPole | RiskPole | CompassPole | HorizonPole;
export type MbtiCode = `${FlowPole}${RiskPole}${CompassPole}${HorizonPole}`;
export type LifeGrade = 'S' | 'A' | 'B' | 'C';

export interface MbtiAxis {
  id: AxisId;
  winner: PoleCode;
  loser: PoleCode;
  leftCode: PoleCode;
  rightCode: PoleCode;
  leftPct: number;
  rightPct: number;
}

export interface FinancialMbti {
  code: MbtiCode;
  axes: [MbtiAxis, MbtiAxis, MbtiAxis, MbtiAxis];
  rarityPct: number;
  partnerCode: MbtiCode;
  grade: LifeGrade;
  barcodeDigits: string;
}

export const ALL_MBTI_CODES: readonly MbtiCode[] = [
  'SGIP', 'SGIA', 'SGKP', 'SGKA',
  'SVIP', 'SVIA', 'SVKP', 'SVKA',
  'EGIP', 'EGIA', 'EGKP', 'EGKA',
  'EVIP', 'EVIA', 'EVKP', 'EVKA',
] as const;

export const AXIS_POLES: Readonly<Record<AxisId, readonly [PoleCode, PoleCode]>> = {
  flow: ['S', 'E'],
  risk: ['G', 'V'],
  compass: ['I', 'K'],
  horizon: ['P', 'A'],
};

/** Realistic population distribution (3-11%, summing to 100%). */
const RARITY_MAP: Readonly<Record<MbtiCode, number>> = {
  SGKP: 11,
  SGIP: 9,
  EGKA: 8,
  SGKA: 7,
  SVIP: 7,
  EGIA: 7,
  EGKP: 7,
  SGIA: 6,
  SVKP: 6,
  EVIA: 6,
  EGIP: 5,
  EVKA: 5,
  SVIA: 5,
  SVKA: 4,
  EVIP: 4,
  EVKP: 3,
};

/**
 * Convert a continuous signed score (positive = left pole, negative = right pole)
 * into clamped integer percentages in [12, 88] that sum to 100 and never land on 50/50.
 */
function scoreToAxis<L extends PoleCode, R extends PoleCode>(
  id: AxisId,
  leftCode: L,
  rightCode: R,
  rawScore: number,
  tieBreakPositive: boolean,
): MbtiAxis {
  const scaled = Math.tanh(rawScore);
  let leftPct = Math.round(50 + scaled * 38);
  leftPct = Math.max(12, Math.min(88, leftPct));
  if (leftPct === 50) {
    leftPct = rawScore > 0 ? 51 : rawScore < 0 ? 49 : tieBreakPositive ? 51 : 49;
  }
  const rightPct = 100 - leftPct;
  const leftWins = leftPct > 50;
  return {
    id,
    winner: leftWins ? leftCode : rightCode,
    loser: leftWins ? rightCode : leftCode,
    leftCode,
    rightCode,
    leftPct,
    rightPct,
  };
}

/** Complementary financial partner: balances cashflow rhythm (S↔E) and time horizon (P↔A) while sharing risk/compass ground. */
export function complementaryPartner(code: MbtiCode): MbtiCode {
  const flow: FlowPole = code[0] === 'S' ? 'E' : 'S';
  const risk = code[1] as RiskPole;
  const compass = code[2] as CompassPole;
  const horizon: HorizonPole = code[3] === 'P' ? 'A' : 'P';
  return `${flow}${risk}${compass}${horizon}`;
}

/** Holistic, non-shaming life balance grade combining wealth, happiness, and relationships. */
function computeLifeGrade(st: LifeStats): LifeGrade {
  const ratio = st.plainNetWorth > 0
    ? st.netWorth / st.plainNetWorth
    : st.netWorth > 0 ? 1.05 : 0.35;
  const wealthBase = Math.max(0, Math.min(40, (ratio / 1.2) * 40));
  const wealthScore = !st.bankrupt && st.netWorth > 0 ? Math.max(12, wealthBase) : wealthBase;
  const joyScore = Math.max(0, Math.min(30, (st.avgHappiness / 82) * 30));
  const bondScore = Math.max(0, Math.min(30, (st.avgRelationships / 82) * 30));
  const bonus =
    (st.homeowner ? 3 : 0) +
    (st.earlyRetiredAge !== null ? 4 : 0) +
    (st.panicSells === 0 && !st.bankrupt ? 3 : 0);
  const total = Math.min(100, wealthScore + joyScore + bondScore + bonus);
  if (total >= 78) return 'S';
  if (total >= 62) return 'A';
  if (total >= 46) return 'B';
  return 'C';
}

/** Deterministic 16-digit receipt serial derived from seed and 4-letter code. */
function buildBarcodeDigits(seed: number, code: MbtiCode): string {
  let h1 = 2166136261 >>> 0;
  let h2 = 374761393 >>> 0;
  const key = `${Math.trunc(seed)}:${code}`;
  for (let i = 0; i < key.length; i++) {
    const ch = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ (ch + i * 31), 668265263) >>> 0;
  }
  const partA = String(h1 % 100_000_000).padStart(8, '0');
  const partB = String(h2 % 100_000_000).padStart(8, '0');
  return `${partA}${partB}`;
}

/** Compute the 4-axis Financial MBTI profile deterministically from a completed life. */
export function buildFinancialMbti(state: GameState, stats: LifeStats): FinancialMbti {
  const m = metrics(state, stats);
  const log = state.decisionLog;
  const n = log.length || 1;
  const runwayNorm = Math.min(1, Math.max(0, stats.avgRunway) / 24);
  const specHoldings = state.holdings.stock + state.holdings.crypto;
  const specShare = specHoldings / Math.max(50_000, Math.abs(stats.netWorth) + 50_000);

  // Axis 1: Flow — S (Saver) vs E (Experiencer)
  const sSide =
    m.save * 2.6 +
    m.invest * 0.9 +
    m.safe * 0.8 +
    runwayNorm * 0.55 +
    (stats.homeowner ? 0.1 : 0);
  const eSide =
    m.spend * 2.5 +
    m.fun * 2.4 +
    m.status * 1.1 +
    m.debt * 1.4 +
    m.lowRunway * 1.1 +
    (stats.funDecisions / n) * 0.6;
  const flowRaw = (sSide - eSide) * 1.35;

  // Axis 2: Risk — G (Grounded) vs V (Venture)
  const gSide =
    m.safe * 2.5 +
    m.save * 1.5 +
    m.insure * 1.6 +
    m.hold * 0.55 +
    runwayNorm * 0.35 +
    0.22;
  const vSide =
    m.risky * 5.6 +
    m.debt * 1.1 +
    m.highDebt * 0.85 +
    m.bankrupt * 0.85 +
    Math.min(1, specShare) * 1.35 +
    (stats.scammed ? 0.25 : 0);
  const riskRaw = (gSide - vSide) * 1.35;

  // Axis 3: Compass — I (Independent) vs K (Kinship)
  const relDelta = (stats.avgRelationships - 60) / 35;
  const iSide =
    m.career * 2.6 +
    m.work * 2.0 +
    m.status * 2.8 +
    m.invest * 0.85 +
    m.risky * 0.9 +
    m.spend * 0.65 +
    Math.max(0, -relDelta) * 0.8 +
    0.26;
  const kSide =
    m.family * 3.8 +
    m.insure * 2.2 +
    Math.max(0, relDelta) * 0.95;
  const compassRaw = (iSide - kSide) * 1.55;

  // Axis 4: Horizon — P (Planner) vs A (Agile)
  const pSide =
    m.hold * 2.8 +
    m.save * 1.5 +
    m.insure * 1.4 +
    m.invest * 0.95 +
    m.safe * 0.6 +
    runwayNorm * 0.45 +
    (stats.homeowner ? 0.18 : 0) +
    (stats.earlyRetiredAge !== null ? 0.25 : 0);
  const aSide =
    m.sell * 3.4 +
    m.panicSells * 2.5 +
    m.spend * 1.5 +
    m.fun * 1.3 +
    m.debt * 1.9 +
    m.lowRunway * 1.2 +
    m.risky * 1.1;
  const horizonRaw = (pSide - aSide) * 1.35;

  const flow = scoreToAxis('flow', 'S', 'E', flowRaw, stats.netWorth >= stats.plainNetWorth);
  const risk = scoreToAxis('risk', 'G', 'V', riskRaw, !stats.bankrupt);
  const compass = scoreToAxis('compass', 'I', 'K', compassRaw, stats.avgRelationships < 58);
  const horizon = scoreToAxis('horizon', 'P', 'A', horizonRaw, stats.panicSells === 0);

  const code = `${flow.winner}${risk.winner}${compass.winner}${horizon.winner}` as MbtiCode;
  return {
    code,
    axes: [flow, risk, compass, horizon],
    rarityPct: RARITY_MAP[code],
    partnerCode: complementaryPartner(code),
    grade: computeLifeGrade(stats),
    barcodeDigits: buildBarcodeDigits(state.seed, code),
  };
}
