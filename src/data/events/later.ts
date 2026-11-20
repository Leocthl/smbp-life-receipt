import type { Amount, GameEvent } from '../../engine/types';
import { HK } from '../hkFacts';

// Ages 35-65: mostly consequences of earlier flags. Text in src/i18n/*/events-later.ts under ev.<id>.*

const inc = (x: number, min?: number, max?: number): Amount => ({ of: 'monthlyIncome', x, min, max });
const DOWNSIZE = { price: 3_000_000, downPct: 0.7, rate: HK.credit.mortgageRate, years: 10 };

export const LATER_EVENTS: GameEvent[] = [
  {
    id: 'kid_tuition', ageRange: [34, 56], category: 'family', speaker: 'campus', weight: 2.5, cooldown: 4,
    conditions: { flag: 'has_kid' },
    choices: [
      { id: 'intl', tags: ['family', 'spend', 'status'], requires: { stat: 'cash', op: '>', value: 250_000 },
        effects: { cash: inc(-8, 120_000, 220_000), happiness: 2, relationships: 4 } },
      { id: 'tutor', tags: ['family', 'spend'], effects: { cash: inc(-2.5, 30_000, 70_000), happiness: -3 },
        hidden: { cash: -8_000 } },
      { id: 'home', tags: ['family', 'save'], effects: { cash: -4_000, happiness: -4, relationships: 2 } },
    ],
  },
  {
    id: 'elder_care', ageRange: [45, 62], category: 'family', speaker: 'parent', weight: 1.8, cooldown: 99, once: true,
    choices: [
      { id: 'home', tags: ['family', 'spend'], effects: { expense: { family: 8_000 }, relationships: 4, happiness: -2 } },
      { id: 'helper', tags: ['family', 'spend'], effects: { expense: { family: 6_000 }, relationships: 6, happiness: -3 } },
      { id: 'carer', tags: ['family'], requires: { job: 'employed' }, effects: { salaryMult: 0.85, relationships: 10, happiness: -8 } },
      { id: 'waitlist', tags: ['family', 'save'],
        outcomes: [
          { id: 'soon', weight: 3, effects: { expense: { family: 1_500 }, relationships: 1, happiness: -2 } },
          { id: 'long', weight: 7, effects: { cash: -20_000, relationships: -4, happiness: -5 } },
        ] },
    ],
  },
  {
    id: 'layoff_late', ageRange: [42, 60], category: 'career', speaker: 'boss', weight: 0.5, cooldown: 8,
    conditions: { job: 'employed' },
    weightMods: [{ when: { regime: ['crash', 'correction'] }, mult: 6 }, { when: { stat: 'age', op: '>', value: 50 }, mult: 1.5 }],
    choices: [
      { id: 'search', tags: ['career', 'risky'], effects: { cash: inc(4, 80_000) },
        outcomes: [
          { id: 'found', weight: 3, effects: { salaryMult: 0.85, happiness: -4 } },
          { id: 'slow', weight: 5, effects: { cash: { of: 'monthlyExpense', x: -8, min: 100_000 }, salaryMult: 0.7, happiness: -10 } },
        ] },
      { id: 'any', tags: ['work', 'safe'], effects: { cash: inc(4, 80_000), salaryMult: 0.65, happiness: -5 } },
      { id: 'retire', tags: ['safe', 'save'], requires: { all: [{ stat: 'liquid', op: '>', value: 6_000_000 }, { stat: 'age', op: '>=', value: 52 }] },
        effects: { cash: inc(6, 150_000), job: 'retired', happiness: 2, setFlags: ['early_retired'] } },
    ],
  },
  {
    id: 'insurance_matures', ageRange: [30, 62], category: 'investing', speaker: 'agent', weight: 2, cooldown: 99, once: true, jargon: true,
    conditions: { all: [{ holds: 'insurance' }, { flag: 'signed_savings_insurance' }] },
    choices: [
      { id: 'cash_out', tags: ['sell'], literacyHint: 'medium', effects: { sell: [{ asset: 'insurance', fraction: 1 }] } },
      { id: 'keep', tags: ['hold', 'insure'], literacyHint: 'medium', effects: { happiness: 1 } },
      { id: 'loan', tags: ['debt'], literacyHint: 'high',
        effects: { borrow: { kind: 'personalLoan', amount: { of: 'holding', asset: 'insurance', x: 0.6 }, rate: 0.05, years: 5 } },
        hidden: { expense: { lifestyle: 300 } } },
    ],
  },
  {
    id: 'mortgage_refi', ageRange: [33, 62], category: 'housing', speaker: 'bank', weight: 2, cooldown: 6, jargon: true,
    conditions: { all: [{ flag: 'homeowner' }, { debt: 'mortgage' }] },
    choices: [
      { id: 'switch', tags: ['save', 'debt'], literacyHint: 'medium', effects: { expense: { lifestyle: -900 } }, hidden: { cash: -8_000 } },
      { id: 'prepay', tags: ['save', 'safe'], requires: { stat: 'cash', op: '>', value: 150_000 },
        effects: { repay: { kind: 'mortgage', amount: { of: 'cash', x: 0.5, max: 400_000 } }, happiness: 1 } },
      { id: 'stay', tags: ['safe'], effects: { expense: { lifestyle: 600 } } },
    ],
  },
  {
    id: 'scam_call', ageRange: [35, 65], category: 'daily', speaker: 'phone', weight: 1.6, cooldown: 6,
    choices: [
      { id: 'press', tags: ['risky'],
        outcomes: [
          { id: 'real', weight: 2, effects: { happiness: 1 } },
          { id: 'scam', weight: 8, effects: { cash: { of: 'cash', x: -0.5, min: 20_000, max: 400_000 }, happiness: -12 } },
        ] },
      { id: 'hangup', tags: ['safe'],
        outcomes: [
          { id: 'ok', weight: 8, effects: {} },
          { id: 'real', weight: 2, effects: { cash: -3_000, happiness: -2 } },
        ] },
      { id: 'callback', tags: ['safe'], effects: { happiness: -2 } },
    ],
  },
  {
    id: 'early_retire_thought', ageRange: [55, 60], category: 'career', speaker: 'self', weight: 1.5, cooldown: 99, once: true,
    conditions: { job: 'employed' },
    choices: [
      { id: 'retire_now', tags: ['fun', 'safe'], requires: { stat: 'liquid', op: '>', value: 4_500_000 },
        effects: { job: 'retired', happiness: 10, setFlags: ['early_retired'] } },
      { id: 'part_time', tags: ['work', 'safe'], effects: { salaryMult: 0.5, happiness: 6 } },
      { id: 'keep_working', tags: ['career', 'work'], effects: { happiness: -3 } },
    ],
  },
  {
    id: 'kid_down_payment', ageRange: [50, 62], category: 'family', speaker: 'self', weight: 1.5, cooldown: 99, once: true,
    conditions: { flag: 'has_kid' },
    choices: [
      { id: 'full', tags: ['family', 'spend'], requires: { stat: 'cash', op: '>', value: 800_000 },
        effects: { cash: -600_000, relationships: 12, happiness: 5, setFlags: ['helped_kid_home'] } },
      { id: 'part', tags: ['family', 'spend'], requires: { stat: 'cash', op: '>', value: 300_000 },
        effects: { cash: -250_000, relationships: 6, happiness: 2, setFlags: ['helped_kid_home'] } },
      { id: 'lend', tags: ['family', 'save'], requires: { stat: 'cash', op: '>', value: 350_000 },
        effects: { cash: -300_000, relationships: 4 },
        delayed: [{ afterTurns: 3, when: { chance: 0.8 }, effects: { cash: 300_000, relationships: 3 } }] },
      { id: 'no', tags: ['save'], effects: { relationships: -10, happiness: -4 } },
    ],
  },
  {
    id: 'downsize_flat', ageRange: [55, 64], category: 'housing', speaker: 'agent', weight: 1.5, cooldown: 99, once: true,
    conditions: { flag: 'homeowner' },
    choices: [
      { id: 'downsize', tags: ['sell', 'status'],
        requires: { all: [{ holds: 'property', min: 5_000_000 }, { stat: 'netWorth', op: '>', value: 5_000_000 }] },
        effects: { sell: [{ asset: 'property', fraction: 1 }], expense: { rent: 12_000 }, buyProperty: DOWNSIZE, happiness: -2, relationships: -1 } },
      { id: 'sell_rent', tags: ['sell'], requires: { holds: 'property' },
        effects: { sell: [{ asset: 'property', fraction: 1 }], expense: { rent: 12_000 }, clearFlags: ['homeowner'], happiness: -3 } },
      { id: 'stay', tags: ['hold'], effects: { cash: -30_000, happiness: 2 } },
    ],
  },
  {
    id: 'retirement_income', ageRange: [60, 64], category: 'investing', speaker: 'agent', weight: 3, cooldown: 99, once: true, jargon: true,
    choices: [
      { id: 'annuity', tags: ['safe', 'insure'], literacyHint: 'medium', requires: { stat: 'cash', op: '>', value: 300_000 },
        effects: { cash: { of: 'cash', x: -0.4, min: 200_000, max: 1_000_000 }, sideIncome: 5_000, happiness: 5, setFlags: ['annuity'] } },
      { id: 'keep', tags: ['save'], effects: { happiness: 1 } },
      { id: 'bonds', tags: ['save', 'safe'], requires: { stat: 'cash', op: '>', value: 50_000 }, effects: { invest: { asset: 'bond', amount: { of: 'cash', x: 0.5 } }, happiness: 2 } },
      { id: 'invested', tags: ['invest', 'hold', 'risky'], literacyHint: 'medium', requires: { stat: 'cash', op: '>', value: 50_000 },
        effects: { invest: { asset: 'index', amount: { of: 'cash', x: 0.3 } } },
        traitHooks: [{ when: { temperament: 'lossAnxious' }, trait: 'lossAnxious', effects: { happiness: -6 } }] },
    ],
  },
];
