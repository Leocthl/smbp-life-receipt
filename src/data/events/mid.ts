import type { Amount, GameEvent } from '../../engine/types';
import { HK } from '../hkFacts';

// Ages 25-35. Text in src/i18n/*/events-mid.ts under ev.<id>.*

const inc = (x: number, min?: number, max?: number): Amount => ({ of: 'monthlyIncome', x, min, max });
const WEDDING_COST = inc(-8, 150_000, 350_000);
const LOAN_AMOUNT = inc(-1.5, 20_000, 60_000);
const HOME = { price: 5_500_000, downPct: 0.1, rate: HK.credit.mortgageRate, years: 30 };
const SMALL_HOME = { price: 4_000_000, downPct: 0.1, rate: HK.credit.mortgageRate, years: 30 };

export const MID_EVENTS: GameEvent[] = [
  {
    id: 'headhunter', ageRange: [25, 35], category: 'career', speaker: 'phone', weight: 1.3, cooldown: 4,
    conditions: { job: 'employed' },
    choices: [
      { id: 'jump', tags: ['career', 'risky'], effects: { salaryMult: 1.2, happiness: -2 },
        hidden: { cash: inc(-1, 15_000) },
        traitHooks: [{ when: { talent: 'networking' }, trait: 'networking', effects: { relationships: 3, happiness: 2 } }],
        outcomes: [
          { id: 'great', weight: 3, weightMods: [{ when: { talent: 'networking' }, mult: 2.5 }], effects: { salaryMult: 1.1, happiness: 5 } },
          { id: 'same', weight: 5, effects: {} },
          { id: 'bad', weight: 2, effects: { happiness: -8, relationships: -2 } },
        ] },
      { id: 'counter', tags: ['career', 'safe'],
        traitHooks: [{ when: { talent: 'negotiation' }, trait: 'negotiation', effects: { happiness: 1 } }],
        outcomes: [
          { id: 'raise', weight: 3, weightMods: [{ when: { talent: 'negotiation' }, mult: 2.5 }], effects: { salaryMult: 1.1, happiness: 3 } },
          { id: 'nothing', weight: 6, effects: { happiness: -3, relationships: -2 } },
        ] },
      { id: 'stay', tags: ['safe'], effects: { relationships: 1 },
        delayed: [{ afterTurns: 2, when: { chance: 0.5 }, effects: { happiness: -3 } }] },
    ],
  },
  {
    id: 'wedding', ageRange: [27, 35], category: 'family', speaker: 'partner', weight: 1.3, cooldown: 99, once: true,
    conditions: { not: { flag: 'married' } },
    choices: [
      { id: 'banquet', tags: ['spend', 'status', 'family'], requires: { stat: 'cash', op: '>', value: 200_000 },
        effects: { cash: WEDDING_COST, happiness: 8, relationships: 10, setFlags: ['married', 'had_banquet'] },
        hidden: { cash: -20_000 },
        counterfactual: { actual: 'spent', alt: 'index', amount: WEDDING_COST, key: 'wedding' },
        delayed: [{ afterTurns: 1, effects: { cash: inc(4, 60_000, 150_000) } }] },
      { id: 'small', tags: ['spend', 'family'], effects: { cash: -40_000, happiness: 6, relationships: 2, setFlags: ['married'] } },
      { id: 'trip', tags: ['spend', 'fun'], effects: { cash: -70_000, happiness: 10, relationships: -3, setFlags: ['married'] } },
    ],
  },
  {
    id: 'friend_wedding', ageRange: [25, 36], category: 'friends', speaker: 'friend', weight: 1.5, cooldown: 2,
    choices: [
      { id: 'generous', tags: ['spend', 'family'], effects: { cash: inc(-0.25, 3_000, 8_000), relationships: 8, happiness: 2 } },
      { id: 'normal', tags: ['spend'], effects: { cash: -2_000, relationships: 3 } },
      { id: 'excuse', tags: ['save'], effects: { cash: -500, relationships: -6, happiness: -1 } },
    ],
  },
  {
    id: 'first_home', ageRange: [27, 45], category: 'housing', speaker: 'agent', weight: 1.3, cooldown: 5,
    conditions: { not: { flag: 'homeowner' } },
    choices: [
      { id: 'buy', tags: ['debt', 'invest', 'status'],
        requires: { all: [{ stat: 'cash', op: '>', value: 800_000 }, { stat: 'salary', op: '>=', value: 40_000 }] },
        effects: { buyProperty: HOME, happiness: 6 },
        hidden: { expense: { lifestyle: 1_500 } },
        delayed: [{ afterTurns: 5, eventId: 'mortgage_refi' }] },
      { id: 'small', tags: ['debt', 'invest'],
        requires: { all: [{ stat: 'cash', op: '>', value: 600_000 }, { stat: 'salary', op: '>=', value: 30_000 }] },
        effects: { buyProperty: SMALL_HOME, happiness: 3 },
        hidden: { expense: { lifestyle: 1_000 } },
        delayed: [{ afterTurns: 5, eventId: 'mortgage_refi' }] },
      { id: 'parents', tags: ['debt', 'family', 'invest'],
        requires: { all: [{ stat: 'cash', op: '>', value: 280_000 }, { stat: 'salary', op: '>=', value: 28_000 }, { not: { familyTier: 'low' } }] },
        effects: { cash: 500_000, buyProperty: HOME, expense: { family: 1_500 }, happiness: 6, relationships: 3, setFlags: ['parents_helped_home'] },
        hidden: { expense: { lifestyle: 1_500 } },
        delayed: [{ afterTurns: 5, eventId: 'mortgage_refi' }] },
      { id: 'rent', tags: ['save', 'safe'], effects: { happiness: -3, relationships: -2, setFlags: ['kept_renting'] },
        delayed: [{ afterTurns: 2, when: { flag: 'moved_out' }, effects: { expense: { rent: 1_500 } } }] },
    ],
  },
  {
    id: 'car_purchase', ageRange: [26, 36], category: 'daily', speaker: 'agent', weight: 0.8, cooldown: 99, once: true,
    choices: [
      { id: 'new', tags: ['spend', 'status', 'debt'],
        effects: { borrow: { kind: 'personalLoan', amount: 280_000, rate: 0.055, years: 6 }, cash: -280_000, expense: { lifestyle: 4_500 }, happiness: 8, setFlags: ['has_car'] },
        hidden: { expense: { lifestyle: 800 } } },
      { id: 'used', tags: ['spend'], requires: { stat: 'cash', op: '>', value: 150_000 },
        effects: { cash: -110_000, expense: { lifestyle: 3_500 }, happiness: 5, setFlags: ['has_car'] },
        delayed: [{ afterTurns: 3, when: { chance: 0.5 }, effects: { cash: -15_000, happiness: -3 } }] },
      { id: 'none', tags: ['save'], effects: { happiness: -2, relationships: -1 } },
    ],
  },
  {
    id: 'promotion_burnout', ageRange: [27, 35], category: 'career', speaker: 'boss', weight: 1.1, cooldown: 6, reveals: 'fragileMind',
    conditions: { job: 'employed' },
    choices: [
      { id: 'accept', tags: ['career', 'work'], effects: { salaryMult: 1.3, happiness: -2 },
        outcomes: [
          { id: 'smooth', weight: 7, effects: { happiness: 3 } },
          { id: 'burnout', weight: 2, weightMods: [{ when: { trait: 'fragileMind' }, mult: 5 }],
            effects: { happiness: -18, cash: inc(-2, 20_000), relationships: -4, setFlags: ['burnt_out'] } },
        ] },
      { id: 'decline', tags: ['safe'], effects: { happiness: 4, relationships: 2 },
        delayed: [{ afterTurns: 2, when: { chance: 0.6 }, effects: { happiness: -3 } }] },
      { id: 'leave', tags: ['fun', 'spend', 'career'], requires: { stat: 'cash', op: '>', value: 60_000 },
        effects: { cash: inc(-2, 30_000), happiness: 8, salaryMult: 1.1 } },
    ],
  },
  {
    id: 'parents_medical', ageRange: [28, 40], category: 'family', speaker: 'parent', weight: 1, cooldown: 8,
    choices: [
      { id: 'private', tags: ['spend', 'family'], effects: { cash: inc(-6, 80_000, 200_000), relationships: 8, happiness: -2 } },
      { id: 'public', tags: ['save', 'family'],
        outcomes: [
          { id: 'ok', weight: 6, effects: { relationships: 2, happiness: -4 } },
          { id: 'worse', weight: 4, effects: { cash: -40_000, relationships: -2, happiness: -6 } },
        ] },
      { id: 'share', tags: ['spend', 'family'], effects: { cash: -25_000, relationships: -4 } },
    ],
  },
  {
    id: 'baby', ageRange: [27, 36], category: 'family', speaker: 'partner', weight: 1.4, cooldown: 3,
    conditions: { all: [{ not: { flag: 'has_kid' } }, { not: { flag: 'child_free' } }] },
    weightMods: [{ when: { flag: 'married' }, mult: 2.5 }],
    choices: [
      { id: 'have', tags: ['family', 'spend'],
        effects: { expense: { lifestyle: 5_000 }, cash: -40_000, happiness: 10, relationships: 4, setFlags: ['has_kid'] },
        delayed: [{ afterTurns: 8, eventId: 'kid_tuition' }] },
      { id: 'helper', tags: ['family', 'spend'], requires: { stat: 'salary', op: '>=', value: 24_000 },
        effects: { expense: { lifestyle: 9_500 }, cash: -40_000, happiness: 12, relationships: 4, setFlags: ['has_kid'] },
        delayed: [{ afterTurns: 8, eventId: 'kid_tuition' }] },
      { id: 'nope', tags: ['save'], effects: { happiness: 3, relationships: -3, setFlags: ['child_free'] } },
    ],
  },
  {
    id: 'friend_loan', ageRange: [25, 40], category: 'friends', speaker: 'friend', weight: 1.2, cooldown: 4,
    choices: [
      { id: 'lend', tags: ['family', 'risky'], effects: { cash: LOAN_AMOUNT },
        outcomes: [
          { id: 'repaid', weight: 4, effects: { cash: inc(1.5, 20_000, 60_000), relationships: 4 } },
          { id: 'partial', weight: 3, effects: { cash: inc(0.6, 8_000, 24_000), relationships: -1 } },
          { id: 'ghosted', weight: 3, effects: { relationships: -8, happiness: -3 } },
        ] },
      { id: 'gift', tags: ['spend', 'family'], effects: { cash: -5_000, relationships: 3, happiness: 1 } },
      { id: 'decline', tags: ['save'], effects: { relationships: -6 } },
    ],
  },
  {
    id: 'layoff', ageRange: [25, 36], category: 'career', speaker: 'boss', weight: 0.5, cooldown: 5,
    conditions: { job: 'employed' },
    weightMods: [{ when: { regime: ['crash', 'correction'] }, mult: 6 }],
    choices: [
      { id: 'search', tags: ['career', 'risky'], effects: { cash: inc(1, 15_000) },
        traitHooks: [{ when: { talent: 'networking' }, trait: 'networking', effects: { relationships: 2 } }],
        outcomes: [
          { id: 'quick', weight: 4, weightMods: [{ when: { talent: 'networking' }, mult: 2.5 }], effects: { salaryMult: 0.95, happiness: -3 } },
          { id: 'slow', weight: 4, effects: { cash: { of: 'monthlyExpense', x: -6, min: 50_000 }, salaryMult: 0.9, happiness: -8 } },
          { id: 'long', weight: 2, effects: { cash: { of: 'monthlyExpense', x: -12, min: 100_000 }, salaryMult: 0.8, happiness: -12 } },
        ] },
      { id: 'any', tags: ['work', 'safe'], effects: { cash: inc(1, 15_000), salaryMult: 0.8, happiness: -5 } },
      { id: 'retrain', tags: ['career', 'spend'], effects: { cash: inc(-1, 30_000), salaryMult: 0.85, happiness: -4 },
        delayed: [{ afterTurns: 2, effects: { salaryMult: 1.25, happiness: 3 } }] },
    ],
  },
  {
    id: 'part_time_master', ageRange: [26, 35], category: 'career', speaker: 'campus', weight: 0.9, cooldown: 99, once: true,
    choices: [
      { id: 'enrol', tags: ['career', 'spend', 'work'], effects: { cash: -50_000, happiness: -5, relationships: -3 },
        hidden: { cash: -5_000 },
        delayed: [
          { afterTurns: 1, effects: { cash: -50_000 } },
          { afterTurns: 2, effects: { cash: -50_000 } },
          { afterTurns: 3, when: { chance: 0.75 }, effects: { salaryMult: 1.2, happiness: 4, setFlags: ['has_masters'] } },
        ] },
      { id: 'course', tags: ['career', 'spend'], effects: { cash: -12_000, happiness: -2 },
        delayed: [{ afterTurns: 1, when: { chance: 0.4 }, effects: { salaryMult: 1.05 } }] },
      { id: 'skip', tags: ['save'], effects: { happiness: 1 } },
    ],
  },
  {
    id: 'crypto_mania', ageRange: [25, 40], category: 'investing', speaker: 'friend', weight: 3, cooldown: 5,
    conditions: { regime: 'bull' },
    choices: [
      { id: 'allin', tags: ['risky', 'invest'], requires: { stat: 'cash', op: '>', value: 30_000 },
        effects: { invest: { asset: 'crypto', amount: { of: 'cash', x: 0.5, max: 200_000 } } } },
      { id: 'small', tags: ['risky', 'invest'], requires: { stat: 'cash', op: '>', value: 10_000 },
        effects: { invest: { asset: 'crypto', amount: 10_000 } } },
      { id: 'pass', tags: ['safe'], effects: { relationships: -2 },
        traitHooks: [{ when: { temperament: 'fomo' }, trait: 'fomo', effects: { happiness: -5 } }] },
    ],
  },
  {
    id: 'health_check_family', ageRange: [28, 45], category: 'health', speaker: 'doctor', weight: 2, cooldown: 99, once: true, reveals: 'familyHistory',
    conditions: { trait: 'familyHistory' },
    choices: [
      { id: 'screen', tags: ['spend', 'safe'], effects: { cash: -8_000 },
        outcomes: [
          { id: 'clear', weight: 5, effects: { happiness: 4 } },
          { id: 'caught', weight: 3, effects: { cash: -25_000, happiness: -4, setFlags: ['caught_early'] } },
        ] },
      { id: 'ignore', tags: ['save', 'risky'],
        delayed: [{ afterTurns: 3, when: { chance: 0.5 }, effects: { cash: inc(-10, 120_000, 400_000), happiness: -12, setFlags: ['late_diagnosis'] } }] },
      { id: 'insure', tags: ['insure', 'safe'], requires: { not: { flag: 'medical_insured' } },
        effects: { expense: { lifestyle: 1_100 }, setFlags: ['medical_insured'] }, hidden: { expense: { lifestyle: 400 } } },
    ],
  },
  {
    id: 'sibling_help', ageRange: [25, 40], category: 'family', speaker: 'parent', weight: 1, cooldown: 6,
    weightMods: [{ when: { stat: 'siblings', op: '>', value: 0 }, mult: 3 }],
    choices: [
      { id: 'gift', tags: ['spend', 'family'], effects: { cash: inc(-4, 40_000, 120_000), relationships: 8, happiness: 2 } },
      { id: 'monthly', tags: ['family'], effects: { expense: { family: 1_500 }, relationships: 10, happiness: 3 } },
      { id: 'refuse', tags: ['save'], effects: { relationships: -9, happiness: -2 } },
    ],
  },
  {
    id: 'friends_emigrate', ageRange: [28, 38], category: 'friends', speaker: 'friend', weight: 1, cooldown: 99, once: true,
    choices: [
      { id: 'farewell', tags: ['spend', 'fun'], effects: { cash: -6_000, relationships: 6, happiness: 4 } },
      { id: 'explore', tags: ['career', 'spend'], effects: { cash: -10_000, happiness: -2, relationships: 2, setFlags: ['explored_emigration'] },
        delayed: [{ afterTurns: 2, when: { chance: 0.5 }, effects: { happiness: 4 } }] },
      { id: 'stay', tags: ['save'], effects: { relationships: -5, happiness: -3 } },
    ],
  },
];
