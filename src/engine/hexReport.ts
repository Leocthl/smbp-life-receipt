import { QUALITIES, qualities, type Qualities, type Quality } from '../world3d/qualities';
import { metrics, type LifeStats } from './endings';
import { newGameFromCharacter } from './state';
import type { GameState } from './types';

// Deep 6-axis Life Hexagon Analysis for the final thermal receipt report.
// Pure and deterministic: every score, archetype, grade, and partner comes directly from GameState + LifeStats.

export type HexArchetypeId =
  | 'full_bloom'
  | 'balanced_prism'
  | 'golden_fortress'
  | 'skyline_climber'
  | 'free_wing'
  | 'warm_hearth'
  | 'joy_spark'
  | 'safe_harbour'
  | 'bold_trailblazer'
  | 'bond_weaver'
  | 'resilient_sprout'
  | 'steady_compass';

export type HexTier = 'peak' | 'solid' | 'growing';
export type HexGrade = 'S' | 'A' | 'B' | 'C';

export interface HexAxisRead {
  quality: Quality;
  score: number;
  startScore: number;
  delta: number;
  tier: HexTier;
}

export interface HexReport {
  archetype: HexArchetypeId;
  partnerArchetype: HexArchetypeId;
  finalQ: Qualities;
  startQ: Qualities;
  axes: HexAxisRead[];
  overallScore: number;
  symmetryPct: number;
  rarityPct: number;
  grade: HexGrade;
  topTwo: [Quality, Quality];
  growthEdge: Quality;
  barcodeDigits: string;
}

export const ALL_HEX_ARCHETYPES: readonly HexArchetypeId[] = [
  'full_bloom',
  'balanced_prism',
  'golden_fortress',
  'skyline_climber',
  'free_wing',
  'warm_hearth',
  'joy_spark',
  'safe_harbour',
  'bold_trailblazer',
  'bond_weaver',
  'resilient_sprout',
  'steady_compass',
] as const;

const RARITY_MAP: Readonly<Record<HexArchetypeId, number>> = {
  full_bloom: 4,
  balanced_prism: 9,
  golden_fortress: 8,
  skyline_climber: 9,
  free_wing: 7,
  warm_hearth: 10,
  joy_spark: 10,
  safe_harbour: 12,
  bold_trailblazer: 6,
  bond_weaver: 11,
  resilient_sprout: 6,
  steady_compass: 8,
};

const COMPLEMENT_BY_EDGE: Readonly<Record<Quality, HexArchetypeId>> = {
  wealth: 'skyline_climber',
  safety: 'safe_harbour',
  joy: 'joy_spark',
  bonds: 'bond_weaver',
  freedom: 'free_wing',
  growth: 'bold_trailblazer',
};

function tierFor(score: number): HexTier {
  if (score >= 70) return 'peak';
  if (score >= 45) return 'solid';
  return 'growing';
}

function classifyArchetype(
  state: GameState,
  stats: LifeStats,
  finalQ: Qualities,
  overallScore: number,
  symmetryPct: number,
  topTwo: [Quality, Quality],
): HexArchetypeId {
  const m = metrics(state, stats);
  if (stats.bankrupt || m.highDebt > 0.25 || (overallScore < 45 && finalQ.freedom < 60)) {
    if (finalQ.joy >= 58 || m.fun >= 0.22) return 'joy_spark';
    return 'resilient_sprout';
  }
  if (m.family >= 0.2 || (finalQ.bonds >= 68 && m.relationships >= 0.65)) {
    return finalQ.safety >= 70 ? 'warm_hearth' : 'bond_weaver';
  }
  if (m.risky >= 0.16) return 'bold_trailblazer';
  if ((m.spend >= 0.24 || m.fun >= 0.22) && finalQ.joy >= 56) return 'joy_spark';
  if (m.save >= 0.25 && m.invest < 0.14 && finalQ.safety >= 75) return 'safe_harbour';
  if (overallScore >= 76 && symmetryPct >= 78) return 'full_bloom';
  if (symmetryPct >= 80 && overallScore >= 58 && m.mix >= 0.25) return 'balanced_prism';
  if (finalQ.wealth >= 70 && (m.invest + m.hold >= 0.25 || stats.peakSalary >= 55_000)) {
    return finalQ.safety >= 80 ? 'golden_fortress' : 'skyline_climber';
  }
  if (stats.earlyRetiredAge !== null || (finalQ.freedom >= 88 && finalQ.joy >= 62)) return 'free_wing';

  const [p1, p2] = topTwo;
  const has = (q: Quality) => p1 === q || p2 === q;
  if (has('wealth') && has('safety')) return 'golden_fortress';
  if (has('wealth') && has('growth')) return 'skyline_climber';
  if (has('bonds')) return 'bond_weaver';
  if (has('joy')) return 'joy_spark';
  if (has('safety')) return 'safe_harbour';
  return 'steady_compass';
}

function computeGrade(overallScore: number, symmetryPct: number, stats: LifeStats): HexGrade {
  const composite =
    overallScore * 0.65 +
    symmetryPct * 0.25 +
    (stats.netWorth >= stats.plainNetWorth ? 8 : 0) -
    (stats.bankrupt ? 18 : 0);
  if (composite >= 72) return 'S';
  if (composite >= 58) return 'A';
  if (composite >= 44) return 'B';
  return 'C';
}

function buildBarcodeDigits(seed: number, archetype: HexArchetypeId, overallScore: number): string {
  let h = (Math.abs(seed) ^ 0x9e3779b9 ^ (overallScore * 131)) >>> 0;
  for (let i = 0; i < archetype.length; i += 1) {
    h = Math.imul(h ^ archetype.charCodeAt(i), 0x01000193) >>> 0;
  }
  let out = '';
  for (let i = 0; i < 16; i += 1) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    out += String((h >>> 28) % 10);
  }
  return out;
}

/** Build a deep, deterministic 6-axis Life Hexagon analysis report for the age-65 receipt. */
export function buildHexReport(state: GameState, stats: LifeStats): HexReport {
  const finalQ = qualities(state);
  const startQ = qualities(newGameFromCharacter(state.seed, state.character));

  const axes: HexAxisRead[] = QUALITIES.map((q) => {
    const score = Math.round(finalQ[q]);
    const startScore = Math.round(startQ[q]);
    return {
      quality: q,
      score,
      startScore,
      delta: score - startScore,
      tier: tierFor(score),
    };
  });

  const sum = axes.reduce((acc, a) => acc + a.score, 0);
  const mean = sum / QUALITIES.length;
  const variance = axes.reduce((acc, a) => acc + (a.score - mean) ** 2, 0) / QUALITIES.length;
  const stdDev = Math.sqrt(variance);

  const overallScore = Math.round(mean);
  const symmetryPct = Math.max(15, Math.min(100, Math.round(100 - stdDev * 2.1)));

  const sorted = [...QUALITIES].sort((a, b) => {
    const diff = finalQ[b] - finalQ[a];
    return diff !== 0 ? diff : QUALITIES.indexOf(a) - QUALITIES.indexOf(b);
  });
  const topTwo: [Quality, Quality] = [sorted[0], sorted[1]];
  const growthEdge = sorted[sorted.length - 1];

  const archetype = classifyArchetype(state, stats, finalQ, overallScore, symmetryPct, topTwo);
  let partnerArchetype = COMPLEMENT_BY_EDGE[growthEdge];
  if (partnerArchetype === archetype) partnerArchetype = 'balanced_prism';

  return {
    archetype,
    partnerArchetype,
    finalQ,
    startQ,
    axes,
    overallScore,
    symmetryPct,
    rarityPct: RARITY_MAP[archetype],
    grade: computeGrade(overallScore, symmetryPct, stats),
    topTwo,
    growthEdge,
    barcodeDigits: buildBarcodeDigits(state.seed, archetype, overallScore),
  };
}
