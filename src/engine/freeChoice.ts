import type { SpotId } from '../world3d/contracts';
import { applyEffect } from './effects';
import { highInterestDebt, monthlyIncome, netWorth, runway } from './finance';
import { makeRng } from './rng';
import { cloneState } from './state';
import type { Delta, GameState, Tag } from './types';

// Open-world Free-Choice Actions: unlocked as the player grows up into the looping HK city.
// Every spot offers player-initiated actions (with customizable HK$ sliders) so choices never feel locked to preset rails.

export type FreeSpotKey = SpotId | 'mystery';

export type FreeActionId =
  | 'bank_index'
  | 'bank_stock'
  | 'bank_savings'
  | 'bank_repay'
  | 'office_overtime'
  | 'office_upskill'
  | 'cafe_treat'
  | 'cafe_network'
  | 'market_splurge'
  | 'market_bargain'
  | 'park_jog'
  | 'park_reflect'
  | 'clinic_checkup'
  | 'home_jiayong'
  | 'home_cook'
  | 'campus_alumni'
  | 'pier_breather'
  | 'mystery_roll';

export interface SliderSpec {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface FreeActionOption {
  id: FreeActionId;
  spot: FreeSpotKey;
  labelKey: string;
  descKey: string;
  tags: Tag[];
  /** fixed cost/gain when no slider */
  fixedAmount?: number;
  /** when present, the player freely picks their own HK$ amount via slider / % pills */
  slider?: SliderSpec;
  /** triggers a fresh procedural DynamicEvent instead of an immediate effect */
  triggersMystery?: boolean;
  /** whether the player can currently afford/take this action */
  enabled: boolean;
  disabledKey?: string;
}

export interface FreeSpotMenu {
  spot: FreeSpotKey;
  titleKey: string;
  subtitleKey: string;
  options: FreeActionOption[];
}

export interface FreeActionResult {
  actionId: FreeActionId;
  spot: FreeSpotKey;
  amount: number;
  outcomeKey: string;
  delta: Delta;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const roundStep = (n: number, step: number) => Math.max(step, Math.floor(n / step) * step);

function cashSlider(cash: number, min: number, maxCap: number, step = 1_000): SliderSpec | undefined {
  const usable = Math.min(maxCap, Math.floor(cash / step) * step);
  if (usable < min) return undefined;
  const def = clamp(roundStep(usable * 0.35, step), min, usable);
  return { min, max: usable, step, defaultValue: def };
}

/** Build the open-world free-choice menu for any spot in Hong Kong. */
export function spotMenuFor(s: GameState, spot: FreeSpotKey): FreeSpotMenu {
  const cash = Math.max(0, Math.floor(s.cash));
  const hiDebt = Math.round(highInterestDebt(s));
  const totalDebt = Math.round(s.debts.reduce((a, d) => a + d.balance, 0));
  const inc = Math.max(15_000, monthlyIncome(s));

  switch (spot) {
    case 'bank': {
      const invSlider = cashSlider(cash, 2_000, 150_000, 1_000);
      const repayMax = Math.min(cash, totalDebt);
      const repaySlider = repayMax >= 1_000 ? cashSlider(repayMax, 1_000, 150_000, 1_000) : undefined;
      return {
        spot, titleKey: 'free.spot.bank.title', subtitleKey: 'free.spot.bank.sub',
        options: [
          {
            id: 'bank_index', spot, labelKey: 'free.act.bank_index', descKey: 'free.act.bank_index.desc',
            tags: ['invest', 'hold'], slider: invSlider, enabled: Boolean(invSlider), disabledKey: 'free.needCash',
          },
          {
            id: 'bank_stock', spot, labelKey: 'free.act.bank_stock', descKey: 'free.act.bank_stock.desc',
            tags: ['risky', 'invest'], slider: invSlider, enabled: Boolean(invSlider), disabledKey: 'free.needCash',
          },
          {
            id: 'bank_savings', spot, labelKey: 'free.act.bank_savings', descKey: 'free.act.bank_savings.desc',
            tags: ['save', 'safe'], slider: invSlider, enabled: Boolean(invSlider), disabledKey: 'free.needCash',
          },
          {
            id: 'bank_repay', spot, labelKey: 'free.act.bank_repay', descKey: 'free.act.bank_repay.desc',
            tags: ['safe', 'save'], slider: repaySlider, enabled: Boolean(repaySlider && (hiDebt > 0 || totalDebt > 0)),
            disabledKey: totalDebt <= 0 ? 'free.noDebt' : 'free.needCash',
          },
        ],
      };
    }

    case 'office': {
      const otPay = roundStep(inc * 0.22, 500);
      const courseCost = roundStep(clamp(inc * 0.25, 3_000, 18_000), 500);
      return {
        spot, titleKey: 'free.spot.office.title', subtitleKey: 'free.spot.office.sub',
        options: [
          {
            id: 'office_overtime', spot, labelKey: 'free.act.office_overtime', descKey: 'free.act.office_overtime.desc',
            tags: ['work'], fixedAmount: otPay, enabled: s.job !== 'retired',
          },
          {
            id: 'office_upskill', spot, labelKey: 'free.act.office_upskill', descKey: 'free.act.office_upskill.desc',
            tags: ['career', 'work'], fixedAmount: courseCost, enabled: cash >= courseCost && s.job !== 'retired',
            disabledKey: 'free.needCash',
          },
        ],
      };
    }

    case 'cafe': {
      const treatCost = roundStep(clamp(inc * 0.08, 1_000, 6_000), 500);
      const coffeeCost = 500;
      return {
        spot, titleKey: 'free.spot.cafe.title', subtitleKey: 'free.spot.cafe.sub',
        options: [
          {
            id: 'cafe_treat', spot, labelKey: 'free.act.cafe_treat', descKey: 'free.act.cafe_treat.desc',
            tags: ['spend', 'fun'], fixedAmount: treatCost, enabled: cash >= treatCost, disabledKey: 'free.needCash',
          },
          {
            id: 'cafe_network', spot, labelKey: 'free.act.cafe_network', descKey: 'free.act.cafe_network.desc',
            tags: ['career', 'fun'], fixedAmount: coffeeCost, enabled: cash >= coffeeCost, disabledKey: 'free.needCash',
          },
        ],
      };
    }

    case 'market': {
      const splurgeSlider = cashSlider(cash, 1_000, 25_000, 500);
      return {
        spot, titleKey: 'free.spot.market.title', subtitleKey: 'free.spot.market.sub',
        options: [
          {
            id: 'market_splurge', spot, labelKey: 'free.act.market_splurge', descKey: 'free.act.market_splurge.desc',
            tags: ['spend', 'fun'], slider: splurgeSlider, enabled: Boolean(splurgeSlider), disabledKey: 'free.needCash',
          },
          {
            id: 'market_bargain', spot, labelKey: 'free.act.market_bargain', descKey: 'free.act.market_bargain.desc',
            tags: ['save', 'fun'], fixedAmount: 1_500, enabled: true,
          },
        ],
      };
    }

    case 'park':
      return {
        spot, titleKey: 'free.spot.park.title', subtitleKey: 'free.spot.park.sub',
        options: [
          {
            id: 'park_jog', spot, labelKey: 'free.act.park_jog', descKey: 'free.act.park_jog.desc',
            tags: ['safe', 'fun'], fixedAmount: 0, enabled: true,
          },
          {
            id: 'park_reflect', spot, labelKey: 'free.act.park_reflect', descKey: 'free.act.park_reflect.desc',
            tags: ['save', 'safe'], fixedAmount: 0, enabled: true,
          },
        ],
      };

    case 'clinic': {
      const fee = 2_500;
      return {
        spot, titleKey: 'free.spot.clinic.title', subtitleKey: 'free.spot.clinic.sub',
        options: [
          {
            id: 'clinic_checkup', spot, labelKey: 'free.act.clinic_checkup', descKey: 'free.act.clinic_checkup.desc',
            tags: ['insure', 'safe'], fixedAmount: fee, enabled: cash >= fee, disabledKey: 'free.needCash',
          },
        ],
      };
    }

    case 'home': {
      const giftSlider = cashSlider(cash, 1_000, 30_000, 500);
      return {
        spot, titleKey: 'free.spot.home.title', subtitleKey: 'free.spot.home.sub',
        options: [
          {
            id: 'home_jiayong', spot, labelKey: 'free.act.home_jiayong', descKey: 'free.act.home_jiayong.desc',
            tags: ['family'], slider: giftSlider, enabled: Boolean(giftSlider), disabledKey: 'free.needCash',
          },
          {
            id: 'home_cook', spot, labelKey: 'free.act.home_cook', descKey: 'free.act.home_cook.desc',
            tags: ['save', 'family'], fixedAmount: 1_000, enabled: true,
          },
        ],
      };
    }

    case 'campus':
      return {
        spot, titleKey: 'free.spot.campus.title', subtitleKey: 'free.spot.campus.sub',
        options: [
          {
            id: 'campus_alumni', spot, labelKey: 'free.act.campus_alumni', descKey: 'free.act.campus_alumni.desc',
            tags: ['career', 'fun'], fixedAmount: 500, enabled: cash >= 500, disabledKey: 'free.needCash',
          },
        ],
      };

    case 'pier':
      return {
        spot, titleKey: 'free.spot.pier.title', subtitleKey: 'free.spot.pier.sub',
        options: [
          {
            id: 'pier_breather', spot, labelKey: 'free.act.pier_breather', descKey: 'free.act.pier_breather.desc',
            tags: ['fun', 'safe'], fixedAmount: 0, enabled: true,
          },
        ],
      };

    case 'mystery':
      return {
        spot, titleKey: 'free.spot.mystery.title', subtitleKey: 'free.spot.mystery.sub',
        options: [
          {
            id: 'mystery_roll', spot, labelKey: 'free.act.mystery_roll', descKey: 'free.act.mystery_roll.desc',
            tags: ['fun', 'risky'], triggersMystery: true, enabled: true,
          },
        ],
      };
  }
}

/** Pure, immutable execution of a player-initiated open-world free action. */
export function applyFreeAction(
  s: GameState,
  option: FreeActionOption,
  customAmount?: number,
): { state: GameState; result: FreeActionResult } {
  const d = cloneState(s);
  const rng = makeRng(d.rng.outcome);
  const before = {
    cash: d.cash,
    happiness: d.happiness,
    relationships: d.relationships,
    netWorth: netWorth(d),
    runway: runway(d),
  };

  const amount = option.slider
    ? clamp(Math.round(customAmount ?? option.slider.defaultValue), option.slider.min, Math.min(option.slider.max, Math.max(option.slider.min, Math.floor(d.cash))))
    : (option.fixedAmount ?? 0);

  let outcomeKey = `free.res.${option.id}`;

  switch (option.id) {
    case 'bank_index':
      applyEffect(d, { invest: { asset: 'index', amount }, happiness: 1 }, rng);
      break;
    case 'bank_stock':
      applyEffect(d, { invest: { asset: 'stock', amount }, happiness: 1 }, rng);
      break;
    case 'bank_savings':
      applyEffect(d, { invest: { asset: 'savings', amount }, happiness: 1 }, rng);
      break;
    case 'bank_repay': {
      let left = Math.min(amount, Math.max(0, d.cash));
      const order: ('creditCard' | 'personalLoan' | 'studentLoan' | 'mortgage')[] = ['creditCard', 'personalLoan', 'studentLoan', 'mortgage'];
      for (const kind of order) {
        if (left <= 0) break;
        const debt = d.debts.find((x) => x.kind === kind && x.balance > 0);
        if (!debt) continue;
        const pay = Math.min(left, debt.balance);
        debt.balance -= pay;
        d.cash -= pay;
        left -= pay;
      }
      d.debts = d.debts.filter((x) => x.balance > 0.5);
      d.happiness = Math.min(100, d.happiness + 3);
      break;
    }
    case 'office_overtime':
      applyEffect(d, { cash: amount, happiness: -3 }, rng);
      break;
    case 'office_upskill': {
      applyEffect(d, { cash: -amount }, rng);
      const promoted = rng.float() < 0.62;
      if (promoted && d.job === 'employed') {
        applyEffect(d, { salaryMult: 1.05, happiness: 3 }, rng);
        outcomeKey = 'free.res.office_upskill.win';
      } else {
        applyEffect(d, { sideIncome: 500, happiness: 1 }, rng);
        outcomeKey = 'free.res.office_upskill.steady';
      }
      break;
    }
    case 'cafe_treat':
      applyEffect(d, { cash: -amount, happiness: 5, relationships: 5 }, rng);
      break;
    case 'cafe_network': {
      applyEffect(d, { cash: -amount, relationships: 3 }, rng);
      if (rng.float() < 0.45 && d.job === 'employed') {
        applyEffect(d, { salaryMult: 1.03, happiness: 3 }, rng);
        outcomeKey = 'free.res.cafe_network.tip';
      } else {
        applyEffect(d, { happiness: 2 }, rng);
      }
      break;
    }
    case 'market_splurge': {
      const joy = clamp(Math.round(3 + amount / 3_000), 3, 10);
      applyEffect(d, { cash: -amount, happiness: joy }, rng);
      break;
    }
    case 'market_bargain': {
      const gain = rng.float() < 0.65 ? amount : 500;
      applyEffect(d, { cash: gain, happiness: 2 }, rng);
      break;
    }
    case 'park_jog':
      applyEffect(d, { happiness: 4, clearFlags: ['burnt_out'] }, rng);
      break;
    case 'park_reflect':
      applyEffect(d, { happiness: 3, cash: 500 }, rng);
      break;
    case 'clinic_checkup':
      applyEffect(d, { cash: -amount, happiness: 5, clearFlags: ['burnt_out'] }, rng);
      break;
    case 'home_jiayong': {
      const bond = clamp(Math.round(3 + amount / 2_500), 3, 10);
      applyEffect(d, { cash: -amount, relationships: bond, happiness: 3 }, rng);
      break;
    }
    case 'home_cook':
      applyEffect(d, { cash: amount, happiness: 3, relationships: 3 }, rng);
      break;
    case 'campus_alumni':
      applyEffect(d, { cash: -amount, relationships: 4, happiness: 2 }, rng);
      break;
    case 'pier_breather':
      applyEffect(d, { happiness: 5, clearFlags: ['burnt_out'] }, rng);
      break;
    case 'mystery_roll':
      break;
  }

  d.rng = { ...d.rng, outcome: rng.state };
  d.decisionLog = [
    ...d.decisionLog,
    {
      turn: d.turn,
      age: d.age,
      eventId: `free_${option.spot}`,
      choiceId: option.id,
      tags: option.tags,
      snapshot: { cash: before.cash, netWorth: before.netWorth, runway: before.runway, happiness: before.happiness },
      netWorthDelta: netWorth(d) - before.netWorth,
    },
  ];

  return {
    state: d,
    result: {
      actionId: option.id,
      spot: option.spot,
      amount,
      outcomeKey,
      delta: {
        cash: Math.round(d.cash - before.cash),
        happiness: Math.round(d.happiness - before.happiness),
        relationships: Math.round(d.relationships - before.relationships),
        netWorthHint: Math.round(netWorth(d) - before.netWorth),
      },
    },
  };
}
