import {
  FAMILY_DEBT, FAMILY_TIERS, GPA, HEALTH, HIDDEN_TALENT_CHANCE, LITERACY, PARENT_HELP, SIBLINGS, STUDENT_ALLOWANCE,
  TEMPERAMENTS, VISIBLE_TALENTS,
} from '../data/traits';
import { makeRng, streamSeed } from './rng';
import type { Character, HiddenTalent, Standing } from './types';

const roundTo = (v: number, step: number) => Math.round(v / step) * step;

/** Random character from the seed's own stream. Only finance-relevant traits. */
export function generateCharacter(seed: number): Character {
  const rng = makeRng(streamSeed(seed, 'character'));
  const range = ([a, b]: [number, number]) => roundTo(a + rng.float() * (b - a), 100);
  const familyTier = rng.weighted(FAMILY_TIERS, (t) => t.weight)!.tier;
  const debt = FAMILY_DEBT[familyTier];
  const gpa = Math.round(Math.min(GPA.max, Math.max(GPA.min, GPA.mean + GPA.sd * rng.normal())) * 100) / 100;
  const standing: Standing = gpa < GPA.lowBelow ? 'low' : gpa < GPA.highFrom ? 'mid' : 'high';
  const hiddenTalents = (Object.keys(HIDDEN_TALENT_CHANCE) as HiddenTalent[]).filter((t) => rng.float() < HIDDEN_TALENT_CHANCE[t]);
  return {
    familyTier,
    familyAllowance: range(STUDENT_ALLOWANCE[familyTier]),
    familyDebt: rng.float() < debt.chance ? roundTo(range(debt.range), 1000) : 0,
    parentHelp: range(PARENT_HELP[familyTier]),
    siblingsToSupport: rng.pick(SIBLINGS[familyTier]),
    gpa,
    standing,
    talents: [rng.weighted(VISIBLE_TALENTS, (t) => t.weight)!.id],
    hidden: {
      temperament: rng.weighted(TEMPERAMENTS, (t) => t.weight)!.id,
      chronic: rng.float() < HEALTH.chronic,
      familyHistory: rng.float() < HEALTH.familyHistory,
      fragileMind: rng.float() < HEALTH.fragileMind,
      literacy: rng.weighted(LITERACY, (t) => t.weight)!.id,
      talents: hiddenTalents,
    },
  };
}

/** A plain middle-of-the-road character, used by tests. */
export function defaultCharacter(): Character {
  return {
    familyTier: 'middle',
    familyAllowance: 1_500,
    familyDebt: 0,
    parentHelp: 2_000,
    siblingsToSupport: 0,
    gpa: 3.2,
    standing: 'mid',
    talents: ['tutoring'],
    hidden: { temperament: 'steady', chronic: false, familyHistory: false, fragileMind: false, literacy: 'medium', talents: [] },
  };
}
