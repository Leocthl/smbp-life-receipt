import { QUALITIES, qualityDelta, type Qualities, type Quality } from '../qualities';

// Pure choices for the cutscenes, kept free of DOM and three.js so they can be checked on their own.

export const ENDING_LABELS = ['saverKing', 'moonlight', 'steady', 'riskWinner', 'rollercoaster', 'zenInvestor', 'debtJuggler', 'exitOnRed', 'familyPillar'] as const;
export type EndingLabel = (typeof ENDING_LABELS)[number];

export function asLabel(v: string): EndingLabel {
  return (ENDING_LABELS as readonly string[]).includes(v) ? (v as EndingLabel) : 'steady';
}

export interface Change { q: Quality; d: number }

/** The (at most 3) biggest moves of the year, ignoring anything under 1 point. */
export function topChanges(before: Qualities, after: Qualities, max = 3): Change[] {
  const d = qualityDelta(before, after);
  return QUALITIES.map((q) => ({ q, d: Math.round(d[q]) })).filter((c) => c.d !== 0).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, max);
}

export function weakest(q: Qualities): Quality {
  return QUALITIES.reduce((m, k) => (q[k] < q[m] ? k : m), QUALITIES[0]);
}

/** Strongest quality; if the weakest ties it (a flat life), take the next one along so the story still turns. */
export function strongest(q: Qualities, not?: Quality): Quality {
  return QUALITIES.filter((k) => k !== not).reduce((m, k) => (q[k] > q[m] ? k : m), QUALITIES.find((k) => k !== not) ?? 'wealth');
}

export interface Visitors { partner: boolean; kids: number; friends: number }

/** Who joins the hilltop: more bonds, more people. The descriptor's flags win when they are set. */
export function companions(bonds: number, partner: boolean, kids: number): Visitors {
  return {
    partner: partner || bonds >= 55,
    kids: Math.max(kids, bonds >= 75 ? 2 : bonds >= 60 ? 1 : 0),
    friends: bonds >= 80 ? 3 : bonds >= 55 ? 2 : bonds >= 30 ? 1 : 0,
  };
}

/** Six qualities with one pushed low (or high) and the rest held mid, so a story act reads clearly. */
export function variant(key: Quality, value: number, rest = 55): Qualities {
  return Object.fromEntries(QUALITIES.map((k) => [k, k === key ? value : rest])) as Qualities;
}
