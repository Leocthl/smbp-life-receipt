import type { GameEvent } from '../../engine/types';
import { HK } from '../hkFacts';

// Seed events, ages 18-25. Text lives in src/i18n/*/events-early.ts under ev.<id>.*

export const EARLY_EVENTS: GameEvent[] = [
  {
    id: 'tuition', ageRange: [18, 18], category: 'family', speaker: 'parent', weight: 1, cooldown: 99, once: true, triggeredOnly: true,
    choices: [
      { id: 'tsfs', tags: ['debt', 'safe'], requires: { not: { familyTier: 'high' } }, effects: { setFlags: ['loan_tsfs'] } },
      { id: 'nls', tags: ['debt'], effects: { setFlags: ['loan_nls'] } },
      { id: 'family', tags: ['family'], requires: { not: { familyTier: 'low' } }, effects: { setFlags: ['tuition_family'], relationships: 3 },
        delayed: [{ afterTurns: 8, when: { familyTier: 'middle' }, effects: { expense: { family: 1_000 } } }] },
      { id: 'self', tags: ['work', 'save'], requires: { not: { familyTier: 'low' } }, effects: { sideIncome: 7_000, happiness: -8, setFlags: ['grades_slipped'] } },
    ],
  },
  {
    id: 'part_time', ageRange: [18, 21.5], category: 'career', speaker: 'boss', weight: 1.4, cooldown: 99, once: true,
    choices: [
      { id: 'take', tags: ['work', 'save'], effects: { sideIncome: 5_000, happiness: -3 },
        outcomes: [{ id: 'ok', weight: 3, effects: {} }, { id: 'slip', weight: 1, effects: { setFlags: ['grades_slipped'] } }] },
      { id: 'tutor', tags: ['work', 'save'], requires: { talent: 'tutoring' }, effects: { sideIncome: 7_000, happiness: -2 } },
      { id: 'focus', tags: ['career'], effects: { setFlags: ['focus_study'], happiness: 2 } },
    ],
  },
  {
    id: 'japan_trip', ageRange: [18, 24], category: 'friends', speaker: 'friend', weight: 1.2, cooldown: 99, once: true,
    choices: [
      { id: 'go', tags: ['spend', 'fun'], effects: { cash: -8_000, happiness: 12, relationships: 10 },
        counterfactual: { actual: 'spent', alt: 'index', amount: 8_000, key: 'trip' } },
      { id: 'card', tags: ['spend', 'fun', 'debt'], effects: { borrow: { kind: 'creditCard', amount: 8_000 }, cash: -8_000, happiness: 12, relationships: 10 } },
      { id: 'skip', tags: ['save'], effects: { happiness: -4, relationships: -8 } },
    ],
  },
  {
    id: 'jiayong', ageRange: [19, 32], category: 'family', speaker: 'parent', weight: 0.8, cooldown: 10,
    weightMods: [{ when: { familyTier: 'low' }, mult: 3 }, { when: { stat: 'familyDebt', op: '>', value: 0 }, mult: 2 }, { when: { stat: 'siblings', op: '>', value: 0 }, mult: 1.5 }],
    choices: [
      { id: 'more', tags: ['family'], effects: { expense: { family: 1_000 }, relationships: 10, happiness: 2 } },
      { id: 'once', tags: ['family'], effects: { cash: -5_000, relationships: 6 } },
      { id: 'no', tags: ['save'], effects: { relationships: -10, happiness: -3 } },
    ],
  },
  {
    id: 'insurance_pitch', ageRange: [21, 30], category: 'investing', speaker: 'agent', weight: 1.3, cooldown: 99, once: true, jargon: true,
    conditions: { not: { holds: 'insurance' } },
    choices: [
      { id: 'sign', tags: ['insure', 'safe'], literacyHint: 'medium',
        effects: { insurancePlan: { annualPremium: { of: 'monthlyIncome', x: 1, min: 12_000, max: 36_000 }, years: 5 }, relationships: 3, setFlags: ['signed_savings_insurance'] },
        delayed: [{ afterTurns: 3, eventId: 'insurance_strain' }] },
      { id: 'ask', tags: ['safe', 'save'], literacyHint: 'high', effects: { setFlags: ['read_fine_print'], relationships: -1 } },
      { id: 'decline', tags: ['safe'], effects: { relationships: -4 } },
    ],
  },
  {
    id: 'hot_tip', ageRange: [18, 40], category: 'friends', speaker: 'phone', weight: 1, cooldown: 6,
    choices: [
      { id: 'allin', tags: ['risky', 'invest'], requires: { stat: 'cash', op: '>', value: 4_000 },
        effects: { cash: { of: 'cash', x: -0.5 } },
        outcomes: [
          { id: 'moon', weight: 12, effects: { cash: { of: 'cash', x: 3 }, happiness: 10 } },
          { id: 'meh', weight: 38, effects: { cash: { of: 'cash', x: 0.85 } } },
          { id: 'rug', weight: 50, effects: { cash: { of: 'cash', x: 0.1 }, happiness: -8 } },
        ] },
      { id: 'small', tags: ['risky'], effects: { cash: -3_000 },
        outcomes: [
          { id: 'moon', weight: 12, effects: { cash: 12_000, happiness: 6 } },
          { id: 'meh', weight: 38, effects: { cash: 2_500 } },
          { id: 'rug', weight: 50, effects: { cash: 300, happiness: -3 } },
        ] },
      { id: 'pass', tags: ['safe'], traitHooks: [{ when: { temperament: 'fomo' }, trait: 'fomo', effects: { happiness: -6 } }] },
    ],
  },
  {
    id: 'first_crash', ageRange: [18, 35], category: 'investing', speaker: 'headline', weight: 60, cooldown: 99, once: true,
    conditions: { all: [{ holds: 'index', min: 3_000 }, { regime: ['crash', 'correction'] }] },
    choices: [
      { id: 'hold', tags: ['hold', 'invest'], traitHooks: [
        { when: { temperament: 'lossAnxious' }, trait: 'lossAnxious', effects: { happiness: -10 } },
        { when: { temperament: 'steady' }, trait: 'steady', effects: { happiness: 2 } },
      ] },
      { id: 'sell', tags: ['sell', 'safe'], effects: { sell: [{ asset: 'index', fraction: 1 }], happiness: 3 },
        counterfactual: { actual: 'cash', alt: 'index', amount: { of: 'holding', asset: 'index', x: 1 }, key: 'panic_sell' } },
      { id: 'buy', tags: ['invest', 'hold'], requires: { stat: 'cash', op: '>', value: 5_000 }, effects: { invest: { asset: 'index', amount: { of: 'cash', x: 0.3 } } } },
    ],
  },
  {
    id: 'card_cashback', ageRange: [18, 24], category: 'daily', speaker: 'bank', weight: 1.1, cooldown: 99, once: true,
    choices: [
      { id: 'full', tags: ['safe'], effects: { cash: 500, setFlags: ['has_card'] } },
      { id: 'free', tags: ['spend', 'fun'], effects: { cash: 500, expense: { lifestyle: 800 }, happiness: 4, setFlags: ['has_card', 'card_min_only'] },
        hidden: { expense: { lifestyle: 200 } },
        traitHooks: [{ when: { temperament: 'impulsive' }, trait: 'impulsive', effects: { expense: { lifestyle: 700 } } }],
        delayed: [{ afterTurns: 2, eventId: 'card_bill' }] },
      { id: 'decline', tags: ['save'] },
    ],
  },
  {
    id: 'ipo', ageRange: [20, 40], category: 'investing', speaker: 'headline', weight: 0.8, cooldown: 8, jargon: true,
    choices: [
      { id: 'cash', tags: ['risky', 'invest'], requires: { stat: 'cash', op: '>', value: 10_000 }, literacyHint: 'medium',
        outcomes: [
          { id: 'pop', weight: 3, effects: { cash: 1_500, happiness: 4 } },
          { id: 'flop', weight: 2, effects: { cash: -1_200, happiness: -3 } },
          { id: 'none', weight: 5, effects: { cash: -50 } },
        ] },
      { id: 'margin', tags: ['risky', 'debt'], hidden: { cash: -1_800 },
        outcomes: [
          { id: 'pop', weight: 3, effects: { cash: 6_000, happiness: 6 } },
          { id: 'flop', weight: 2, effects: { cash: -5_000, happiness: -6 } },
          { id: 'none', weight: 5, effects: {} },
        ] },
      { id: 'skip', tags: ['safe'] },
    ],
  },
  {
    id: 'medical_bill', ageRange: [18, 45], category: 'health', speaker: 'doctor', weight: 0.6, cooldown: 12,
    choices: [
      { id: 'private', tags: ['spend', 'safe'], effects: { cash: -38_000, happiness: -2 } },
      { id: 'public', tags: ['save'], effects: { happiness: -8 },
        outcomes: [{ id: 'ok', weight: 7, effects: {} }, { id: 'worse', weight: 3, effects: { cash: -15_000, happiness: -5 } }] },
      { id: 'insured', tags: ['insure'], requires: { flag: 'medical_insured' }, effects: { cash: -3_000 } },
    ],
  },
  {
    id: 'medical_insurance', ageRange: [22, 35], category: 'health', speaker: 'agent', weight: 0.9, cooldown: 99, once: true,
    choices: [
      { id: 'buy', tags: ['insure', 'safe'], effects: { expense: { lifestyle: 600 }, setFlags: ['medical_insured'] } },
      { id: 'skip', tags: ['save', 'risky'] },
    ],
  },
  {
    id: 'move_out', ageRange: [22, 30], category: 'housing', speaker: 'parent', weight: 1.2, cooldown: 99, once: true,
    weightMods: [{ when: { stat: 'age', op: '>', value: 24 }, mult: 2 }],
    conditions: { all: [{ not: { flag: 'moved_out' } }, { job: 'employed' }] },
    choices: [
      { id: 'room', tags: ['spend', 'fun'], effects: { expense: { rent: HK.living.roomRent, family: -2_000 }, happiness: 8, relationships: 2, setFlags: ['moved_out'] } },
      { id: 'studio', tags: ['spend', 'status'], requires: { stat: 'salary', op: '>=', value: 26_000 }, effects: { expense: { rent: HK.living.studioRent, family: -2_000 }, happiness: 12, setFlags: ['moved_out'] } },
      { id: 'stay', tags: ['save', 'family'], effects: { happiness: -4, relationships: 3 } },
    ],
  },
  {
    id: 'rent_increase', ageRange: [22, 45], category: 'housing', speaker: 'landlord', weight: 1, cooldown: 8,
    conditions: { all: [{ flag: 'moved_out' }, { not: { flag: 'homeowner' } }] },
    choices: [
      { id: 'accept', tags: ['safe'], effects: { expense: { rent: 1_500 } } },
      { id: 'haggle', tags: ['risky'],
        traitHooks: [{ when: { talent: 'negotiation' }, trait: 'negotiation', effects: { happiness: 2 } }],
        outcomes: [
          { id: 'win', weight: 3, weightMods: [{ when: { talent: 'negotiation' }, mult: 3 }], effects: { expense: { rent: 500 } } },
          { id: 'lose', weight: 7, effects: { expense: { rent: 1_500 }, happiness: -3 } },
        ] },
      { id: 'move', tags: ['save'], effects: { expense: { rent: -1_000 }, cash: -6_000, happiness: -4 } },
    ],
  },
  {
    id: 'internship', ageRange: [19.5, 21.5], category: 'career', speaker: 'boss', weight: 2, cooldown: 99, once: true,
    choices: [
      { id: 'intern', tags: ['career'], effects: { cash: 18_000, setFlags: ['internship'] } },
      { id: 'paid', tags: ['work', 'save'], effects: { cash: 28_000, happiness: -2 } },
      { id: 'travel', tags: ['fun', 'spend'], effects: { cash: -10_000, happiness: 10, relationships: 5 },
        counterfactual: { actual: 'spent', alt: 'index', amount: 10_000, key: 'summer_trip' } },
    ],
  },
  {
    id: 'mpf_choice', ageRange: [22, 23.5], category: 'investing', speaker: 'boss', weight: 50, cooldown: 99, once: true, jargon: true,
    conditions: { job: 'employed' },
    choices: [
      { id: 'default', tags: ['safe', 'hold'], effects: { mpfFund: 'default' } },
      { id: 'equity', tags: ['risky', 'invest'], literacyHint: 'high', effects: { mpfFund: 'equity' } },
      { id: 'ask', tags: ['save', 'safe'], literacyHint: 'medium', effects: { mpfFund: 'default', setFlags: ['mpf_reviewed'] } },
    ],
  },
  {
    id: 'laptop', ageRange: [18, 30], category: 'daily', speaker: 'self', weight: 1, cooldown: 99, once: true,
    choices: [
      { id: 'new', tags: ['spend', 'fun', 'debt'], effects: { borrow: { kind: 'personalLoan', amount: 14_000, rate: 0, years: 1 }, cash: -14_000, happiness: 6 },
        traitHooks: [{ when: { temperament: 'impulsive' }, trait: 'impulsive', effects: { cash: -2_000, happiness: 2 } }] },
      { id: 'refurb', tags: ['save'], effects: { cash: -5_000, happiness: 2 } },
      { id: 'keep', tags: ['save'], effects: { happiness: -3 },
        delayed: [{ afterTurns: 2, when: { chance: 0.4 }, effects: { cash: -8_000, happiness: -6 } }] },
    ],
  },
  {
    id: 'side_hustle', ageRange: [19, 32], category: 'career', speaker: 'friend', weight: 1, cooldown: 99, once: true,
    choices: [
      { id: 'shop', tags: ['risky', 'work'], effects: { cash: -10_000 },
        traitHooks: [{ when: { talent: 'freelancing' }, trait: 'freelancing', effects: { happiness: 2 } }],
        outcomes: [
          { id: 'works', weight: 3, weightMods: [{ when: { talent: 'freelancing' }, mult: 2.5 }], effects: { hustle: 3_000, happiness: 5, setFlags: ['side_hustle'] } },
          { id: 'flops', weight: 7, effects: { happiness: -5 } },
        ] },
      { id: 'gigs', tags: ['work', 'save'], requires: { any: [{ talent: 'design' }, { talent: 'coding' }] }, effects: { hustle: 2_500, happiness: -3, setFlags: ['side_hustle'] } },
      { id: 'decline', tags: ['safe'] },
    ],
  },
];
