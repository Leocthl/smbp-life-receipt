import type { GameEvent } from '../../engine/types';

// Events that repeat through life or are only triggered by earlier choices.

export const RECURRING_EVENTS: GameEvent[] = [
  {
    id: 'money_surplus', ageRange: [22, 64], category: 'investing', speaker: 'self', weight: 3, cooldown: 2,
    conditions: { all: [{ stat: 'runway', op: '>', value: 4 }, { stat: 'cash', op: '>', value: 30_000 }] },
    choices: [
      { id: 'savings', tags: ['save', 'safe'], effects: { invest: { asset: 'savings', amount: { of: 'cash', x: 0.4 } } } },
      { id: 'index', tags: ['invest', 'safe', 'hold'], effects: { invest: { asset: 'index', amount: { of: 'cash', x: 0.4 } } } },
      { id: 'hot', tags: ['risky', 'invest'], effects: { invest: { asset: 'stock', amount: { of: 'cash', x: 0.4 } } } },
      { id: 'treat', tags: ['spend', 'fun'], effects: { cash: { of: 'cash', x: -0.2 }, happiness: 10, relationships: 4 },
        counterfactual: { actual: 'spent', alt: 'index', amount: { of: 'cash', x: 0.2 }, key: 'treat' } },
    ],
  },
  {
    id: 'market_drop', ageRange: [24, 64], category: 'investing', speaker: 'headline', weight: 40, cooldown: 3,
    conditions: { all: [{ stat: 'investedRisky', op: '>', value: 20_000 }, { regime: ['crash', 'correction'] }] },
    choices: [
      { id: 'hold', tags: ['hold'], traitHooks: [{ when: { temperament: 'lossAnxious' }, trait: 'lossAnxious', effects: { happiness: -8 } }] },
      { id: 'sell', tags: ['sell', 'safe'], effects: { sell: [{ asset: 'index', fraction: 1 }, { asset: 'stock', fraction: 1 }, { asset: 'crypto', fraction: 1 }], happiness: 3 },
        counterfactual: { actual: 'cash', alt: 'index', amount: { of: 'holding', asset: 'index', x: 1 }, key: 'panic_sell' } },
      { id: 'buy', tags: ['invest', 'hold'], requires: { all: [{ stat: 'runway', op: '>', value: 3 }, { stat: 'cash', op: '>', value: 20_000 }] }, effects: { invest: { asset: 'index', amount: { of: 'cash', x: 0.3 } } } },
    ],
  },
  {
    id: 'budget_check', ageRange: [22, 64], category: 'daily', speaker: 'phone', weight: 30, cooldown: 3,
    // high-interest debt, or costs running ahead of income with little cushion left
    conditions: { any: [{ stat: 'debtHighInterest', op: '>', value: 30_000 }, { all: [{ stat: 'monthlyNet', op: '<', value: 0 }, { stat: 'runway', op: '<', value: 4 }] }] },
    choices: [
      { id: 'cut', tags: ['save'], effects: { expense: { lifestyle: -1_500 }, happiness: -6, relationships: -3 } },
      { id: 'extra', tags: ['work', 'save'], effects: { sideIncome: 3_000, happiness: -5 },
        // ASSUMPTION: an evening job lasts about two years before burnout
        delayed: [{ afterTurns: 2, effects: { sideIncome: -3_000 } }] },
      { id: 'carry', tags: ['spend', 'debt'], effects: { happiness: 2 } },
      { id: 'cheaper', tags: ['save'], requires: { all: [{ flag: 'moved_out' }, { not: { flag: 'homeowner' } }, { stat: 'cash', op: '>', value: 6_000 }] }, effects: { expense: { rent: -4_000 }, cash: -6_000, happiness: -5 } },
    ],
  },
  {
    id: 'card_bill', ageRange: [18, 64], category: 'daily', speaker: 'bank', weight: 1, cooldown: 2, triggeredOnly: true,
    conditions: { debt: 'creditCard' },
    choices: [
      { id: 'full', tags: ['safe', 'save'], effects: { repay: { kind: 'creditCard', amount: { of: 'debt', debt: 'creditCard', x: 1 } }, clearFlags: ['card_min_only'] } },
      { id: 'min', tags: ['debt'], effects: { setFlags: ['card_min_only'], happiness: 2 },
        // the bill comes back, so paying the minimum is a choice you get to revisit
        delayed: [{ afterTurns: 3, eventId: 'card_bill', when: { debt: 'creditCard' } }] },
      { id: 'loan', tags: ['debt', 'safe'], effects: { borrow: { kind: 'personalLoan', amount: { of: 'debt', debt: 'creditCard', x: 1 } }, repay: { kind: 'creditCard', amount: { of: 'debt', debt: 'creditCard', x: 1 } } } },
    ],
  },
  {
    id: 'insurance_strain', ageRange: [18, 64], category: 'investing', speaker: 'agent', weight: 1, cooldown: 4, triggeredOnly: true,
    conditions: { holds: 'insurance' },
    choices: [
      { id: 'keep', tags: ['insure', 'hold'], effects: { happiness: -3 } },
      { id: 'surrender', tags: ['sell'], effects: { sell: [{ asset: 'insurance', fraction: 1 }], happiness: 2, setFlags: ['surrendered_insurance'] } },
      { id: 'borrow', tags: ['debt'], effects: { borrow: { kind: 'personalLoan', amount: { of: 'monthlyExpense', x: 2 } } } },
    ],
  },
  {
    id: 'chronic_flare', ageRange: [20, 64], category: 'health', speaker: 'doctor', weight: 0.8, cooldown: 12, reveals: 'chronic',
    conditions: { trait: 'chronic' },
    choices: [
      { id: 'treat', tags: ['spend', 'safe'], effects: { cash: -12_000, happiness: -2 } },
      { id: 'delay', tags: ['save'], effects: { happiness: -8 }, delayed: [{ afterTurns: 2, effects: { cash: -20_000, happiness: -4 } }] },
      { id: 'insured', tags: ['insure'], requires: { flag: 'medical_insured' }, effects: { cash: -2_000 } },
    ],
  },
];
