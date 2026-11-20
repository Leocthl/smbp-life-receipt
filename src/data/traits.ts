import type { FamilyTier, HiddenTalent, Literacy, Temperament, VisibleTalent } from '../engine/types';

// Character generation tables. Weights are relative.
export const FAMILY_TIERS: { tier: FamilyTier; weight: number }[] = [
  { tier: 'low', weight: 30 },
  { tier: 'middle', weight: 50 },
  { tier: 'high', weight: 20 },
];

/** 家用 owed per month while studying (HK$ range) — ASSUMPTION */
export const STUDENT_ALLOWANCE: Record<FamilyTier, [number, number]> = { low: [1_000, 2_000], middle: [0, 1_000], high: [0, 0] };
/** monthly help from parents during uni — ASSUMPTION */
export const PARENT_HELP: Record<FamilyTier, [number, number]> = { low: [0, 0], middle: [2_500, 4_000], high: [5_000, 7_000] };
/** chance of family debt and its range — ASSUMPTION */
export const FAMILY_DEBT: Record<FamilyTier, { chance: number; range: [number, number] }> = {
  low: { chance: 0.3, range: [50_000, 200_000] },
  middle: { chance: 0.1, range: [30_000, 100_000] },
  high: { chance: 0, range: [0, 0] },
};
export const SIBLINGS: Record<FamilyTier, number[]> = { low: [0, 1, 1, 2], middle: [0, 0, 1], high: [0] };

export const GPA = { mean: 3.1, sd: 0.4, min: 2.0, max: 4.0, lowBelow: 2.8, highFrom: 3.4 };

export const VISIBLE_TALENTS: { id: VisibleTalent; weight: number }[] = [
  { id: 'tutoring', weight: 35 }, { id: 'design', weight: 18 }, { id: 'coding', weight: 18 }, { id: 'sports', weight: 15 }, { id: 'music', weight: 14 },
];

export const TEMPERAMENTS: { id: Temperament; weight: number }[] = [
  { id: 'impulsive', weight: 25 }, { id: 'lossAnxious', weight: 25 }, { id: 'fomo', weight: 20 }, { id: 'steady', weight: 30 },
];
export const LITERACY: { id: Literacy; weight: number }[] = [
  { id: 'low', weight: 35 }, { id: 'medium', weight: 45 }, { id: 'high', weight: 20 },
];
export const HEALTH = { chronic: 0.12, familyHistory: 0.25, fragileMind: 0.15 };
export const HIDDEN_TALENT_CHANCE: Record<HiddenTalent, number> = { freelancing: 0.2, negotiation: 0.2, networking: 0.2 };
