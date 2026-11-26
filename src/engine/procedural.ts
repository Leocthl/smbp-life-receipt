import { addDebt, applyEffect } from './effects';
import { monthlyIncome, netWorth, runway } from './finance';
import { makeRng, streamSeed } from './rng';
import { cloneState } from './state';
import type { Category, Delta, Effect, GameState, Speaker, Tag } from './types';

// Procedural HK random encounters: generated dynamically from seed + live state so every run feels alive and non-preset.

export type ProceduralTemplateId =
  | 'flash_ipo'
  | 'popup_pitch'
  | 'rush_gig'
  | 'typhoon_bonus'
  | 'meme_rumor'
  | 'rebate_windfall'
  | 'ticket_flip'
  | 'urgent_repair'
  | 'promo_deposit'
  | 'weekend_escape'
  | 'family_surprise'
  | 'bootcamp_flash';

export interface DynamicChoice {
  id: string;
  labelKey: string;
  whyKey: string;
  tags: Tag[];
  /** optional minimum cash required to pick this choice */
  minCash?: number;
  /** cash cost preview shown on the button (negative = cost, positive = gain) */
  previewCash?: number;
  /** optional win probability (0..1) shown on the choice for risky rolls */
  odds?: number;
  /** guaranteed immediate effect */
  effects: Effect;
  /** optional random roll outcome */
  roll?: {
    chance: number;
    winKey: string;
    loseKey: string;
    win: Effect;
    lose: Effect;
  };
}

export interface DynamicEvent {
  id: string;
  templateId: ProceduralTemplateId;
  category: Category;
  speaker: Speaker;
  titleKey: string;
  textKey: string;
  /** dynamic vars interpolated into title/text/choice/outcome i18n strings */
  vars: Record<string, number | string>;
  /** live rolled odds badge shown in the header (e.g. 62 for 62%) */
  badgeOdds?: number;
  choices: DynamicChoice[];
}

export interface DynamicResult {
  eventId: string;
  choiceId: string;
  outcomeKey: string;
  vars: Record<string, number | string>;
  delta: Delta;
  notices: string[];
}

function mixSeed(seed: number, salt: number, step: number): number {
  return streamSeed(seed ^ Math.imul(salt, 0x9e3779b9), `${salt}:${step}`);
}

const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function baseStake(s: GameState, rng: ReturnType<typeof makeRng>, mult: number, min: number, max: number): number {
  const ref = Math.max(12_000, monthlyIncome(s), s.cash * 0.18);
  const jitter = 0.72 + rng.float() * 0.58; // ±30% live randomness
  const raw = clamp(ref * mult * jitter, min, max);
  return roundTo(raw, raw >= 10_000 ? 1_000 : 500);
}

/** Decide whether to inject a procedural wildcard event on this turn. Pure & deterministic. */
export function shouldInjectDynamicEvent(s: GameState, presetCount: number): boolean {
  if (s.done || s.turn < 2) return false; // keep Year 1 (turns 0-1) crisp for onboarding
  const rng = makeRng(mixSeed(s.seed, 9101, s.turn * 17 + s.decisionLog.length));
  // Higher chance when preset deck drew 0 cards (keeps mid/late game lively), ~35% when 1 card
  const prob = presetCount === 0 ? 0.58 : presetCount === 1 ? 0.32 : 0;
  return rng.float() < prob;
}

const ALL_TEMPLATES: readonly ProceduralTemplateId[] = [
  'flash_ipo',
  'popup_pitch',
  'rush_gig',
  'typhoon_bonus',
  'meme_rumor',
  'rebate_windfall',
  'ticket_flip',
  'urgent_repair',
  'promo_deposit',
  'weekend_escape',
  'family_surprise',
  'bootcamp_flash',
];

function eligibleTemplates(s: GameState): ProceduralTemplateId[] {
  const recent = new Set(s.decisionLog.slice(-6).map((d) => d.eventId.replace(/^dyn_/, '')));
  const pool = ALL_TEMPLATES.filter((id) => {
    if (recent.has(id)) return false;
    if (id === 'bootcamp_flash' && s.job === 'retired') return false;
    if (id === 'rush_gig' && s.age > 60) return false;
    if (id === 'promo_deposit' && s.cash < 15_000) return false;
    if (id === 'flash_ipo' && s.cash < 6_000) return false;
    return true;
  });
  return pool.length > 0 ? pool : [...ALL_TEMPLATES];
}

/** Generate a fresh, non-preset Hong Kong financial event scaled to current state and seeded RNG. */
export function generateDynamicEvent(s: GameState, rollNonce = 0): DynamicEvent {
  const rng = makeRng(mixSeed(s.seed, 4242, s.turn * 97 + s.decisionLog.length * 13 + rollNonce * 7919));
  const pool = eligibleTemplates(s);
  const templateId = pool[Math.floor(rng.float() * pool.length)];
  const id = `dyn_${templateId}_${s.turn}_${rollNonce}`;
  const pct = (c: number) => Math.round(c * 100);

  switch (templateId) {
    case 'flash_ipo': {
      const stake = baseStake(s, rng, 0.45, 5_000, 60_000);
      const gain = roundTo(stake * (0.28 + rng.float() * 0.45), 500);
      const loss = roundTo(stake * (0.18 + rng.float() * 0.25), 500);
      const chance = clamp(0.46 + (rng.float() - 0.5) * 0.24, 0.34, 0.66);
      return {
        id, templateId, category: 'investing', speaker: 'bank',
        titleKey: 'dyn.flash_ipo.title', textKey: 'dyn.flash_ipo.text',
        vars: { stake, gain, loss, odds: pct(chance) }, badgeOdds: pct(chance),
        choices: [
          {
            id: 'all_in', labelKey: 'dyn.flash_ipo.all_in', whyKey: 'dyn.flash_ipo.all_in.why',
            tags: ['risky', 'invest'], minCash: stake, previewCash: -stake, odds: chance, effects: {},
            roll: {
              chance, winKey: 'dyn.flash_ipo.win', loseKey: 'dyn.flash_ipo.lose',
              win: { cash: gain, happiness: 4 }, lose: { cash: -loss, happiness: -3 },
            },
          },
          {
            id: 'index', labelKey: 'dyn.flash_ipo.index', whyKey: 'dyn.flash_ipo.index.why',
            tags: ['invest', 'safe'], minCash: Math.round(stake * 0.5), previewCash: -Math.round(stake * 0.5),
            effects: { invest: { asset: 'index', amount: Math.round(stake * 0.5) }, happiness: 1 },
          },
          {
            id: 'pass', labelKey: 'dyn.flash_ipo.pass', whyKey: 'dyn.flash_ipo.pass.why',
            tags: ['save', 'safe'], effects: { happiness: 1 },
          },
        ],
      };
    }

    case 'popup_pitch': {
      const stake = baseStake(s, rng, 0.55, 6_000, 80_000);
      const payout = roundTo(stake * (1.45 + rng.float() * 0.65), 1_000);
      const chance = clamp(0.48 + (s.character.hidden.talents.includes('networking') ? 0.1 : 0) + (rng.float() - 0.5) * 0.2, 0.35, 0.7);
      return {
        id, templateId, category: 'friends', speaker: 'friend',
        titleKey: 'dyn.popup_pitch.title', textKey: 'dyn.popup_pitch.text',
        vars: { stake, payout, odds: pct(chance) }, badgeOdds: pct(chance),
        choices: [
          {
            id: 'back', labelKey: 'dyn.popup_pitch.back', whyKey: 'dyn.popup_pitch.back.why',
            tags: ['risky', 'work'], minCash: stake, previewCash: -stake, odds: chance, effects: { relationships: 3 },
            roll: {
              chance, winKey: 'dyn.popup_pitch.win', loseKey: 'dyn.popup_pitch.lose',
              win: { cash: payout - stake, happiness: 5, relationships: 3 },
              lose: { cash: -Math.round(stake * 0.7), happiness: -3 },
            },
          },
          {
            id: 'help', labelKey: 'dyn.popup_pitch.help', whyKey: 'dyn.popup_pitch.help.why',
            tags: ['work', 'safe'], previewCash: roundTo(stake * 0.18, 500),
            effects: { cash: roundTo(stake * 0.18, 500), relationships: 4, happiness: -2 },
          },
          {
            id: 'decline', labelKey: 'dyn.popup_pitch.decline', whyKey: 'dyn.popup_pitch.decline.why',
            tags: ['save', 'safe'], effects: { relationships: -1, happiness: 1 },
          },
        ],
      };
    }

    case 'rush_gig': {
      const pay = baseStake(s, rng, 0.35, 3_500, 35_000);
      const chance = clamp(0.68 + (s.character.hidden.talents.includes('freelancing') ? 0.15 : 0) + (rng.float() - 0.5) * 0.18, 0.52, 0.88);
      return {
        id, templateId, category: 'career', speaker: 'phone',
        titleKey: 'dyn.rush_gig.title', textKey: 'dyn.rush_gig.text',
        vars: { pay, odds: pct(chance) }, badgeOdds: pct(chance),
        choices: [
          {
            id: 'take', labelKey: 'dyn.rush_gig.take', whyKey: 'dyn.rush_gig.take.why',
            tags: ['work', 'career'], previewCash: pay, odds: chance, effects: { happiness: -3 },
            roll: {
              chance, winKey: 'dyn.rush_gig.win', loseKey: 'dyn.rush_gig.lose',
              win: { cash: pay, happiness: 2 },
              lose: { cash: Math.round(pay * 0.45), happiness: -4 },
            },
          },
          {
            id: 'split', labelKey: 'dyn.rush_gig.split', whyKey: 'dyn.rush_gig.split.why',
            tags: ['work', 'safe'], previewCash: Math.round(pay * 0.5),
            effects: { cash: Math.round(pay * 0.5), relationships: 3, happiness: 1 },
          },
          {
            id: 'rest', labelKey: 'dyn.rush_gig.rest', whyKey: 'dyn.rush_gig.rest.why',
            tags: ['fun', 'safe'], effects: { happiness: 4 },
          },
        ],
      };
    }

    case 'typhoon_bonus': {
      const bonus = baseStake(s, rng, 0.22, 2_000, 18_000);
      const treat = roundTo(bonus * 0.6, 500);
      return {
        id, templateId, category: 'daily', speaker: 'headline',
        titleKey: 'dyn.typhoon_bonus.title', textKey: 'dyn.typhoon_bonus.text',
        vars: { bonus, treat },
        choices: [
          {
            id: 'stash', labelKey: 'dyn.typhoon_bonus.stash', whyKey: 'dyn.typhoon_bonus.stash.why',
            tags: ['save', 'safe'], previewCash: bonus,
            effects: { cash: bonus, happiness: 2 },
          },
          {
            id: 'hotpot', labelKey: 'dyn.typhoon_bonus.hotpot', whyKey: 'dyn.typhoon_bonus.hotpot.why',
            tags: ['spend', 'fun', 'family'], previewCash: bonus - treat,
            effects: { cash: bonus - treat, happiness: 6, relationships: 4 },
          },
          {
            id: 'buy_dip', labelKey: 'dyn.typhoon_bonus.buy_dip', whyKey: 'dyn.typhoon_bonus.buy_dip.why',
            tags: ['invest'], effects: { cash: bonus, invest: { asset: 'index', amount: bonus }, happiness: 2 },
          },
        ],
      };
    }

    case 'meme_rumor': {
      const stake = baseStake(s, rng, 0.4, 4_000, 50_000);
      const moon = roundTo(stake * (1.2 + rng.float() * 1.4), 1_000);
      const rug = roundTo(stake * (0.55 + rng.float() * 0.3), 500);
      const chance = clamp(0.32 + (rng.float() - 0.5) * 0.2, 0.22, 0.44);
      return {
        id, templateId, category: 'investing', speaker: 'friend',
        titleKey: 'dyn.meme_rumor.title', textKey: 'dyn.meme_rumor.text',
        vars: { stake, moon, rug, odds: pct(chance) }, badgeOdds: pct(chance),
        choices: [
          {
            id: 'ape', labelKey: 'dyn.meme_rumor.ape', whyKey: 'dyn.meme_rumor.ape.why',
            tags: ['risky'], minCash: stake, previewCash: -stake, odds: chance, effects: {},
            roll: {
              chance, winKey: 'dyn.meme_rumor.win', loseKey: 'dyn.meme_rumor.lose',
              win: { cash: moon, happiness: 6 }, lose: { cash: -rug, happiness: -5 },
            },
          },
          {
            id: 'tiny', labelKey: 'dyn.meme_rumor.tiny', whyKey: 'dyn.meme_rumor.tiny.why',
            tags: ['risky', 'fun'], minCash: roundTo(stake * 0.25, 500), previewCash: -roundTo(stake * 0.25, 500), odds: chance, effects: {},
            roll: {
              chance, winKey: 'dyn.meme_rumor.win', loseKey: 'dyn.meme_rumor.lose',
              win: { cash: roundTo(moon * 0.25, 500), happiness: 3 },
              lose: { cash: -roundTo(rug * 0.25, 500), happiness: -1 },
            },
          },
          {
            id: 'mute', labelKey: 'dyn.meme_rumor.mute', whyKey: 'dyn.meme_rumor.mute.why',
            tags: ['safe', 'hold'], effects: { happiness: 1 },
          },
        ],
      };
    }

    case 'rebate_windfall': {
      const amount = baseStake(s, rng, 0.28, 3_000, 22_000);
      return {
        id, templateId, category: 'daily', speaker: 'headline',
        titleKey: 'dyn.rebate_windfall.title', textKey: 'dyn.rebate_windfall.text',
        vars: { amount },
        choices: [
          {
            id: 'save', labelKey: 'dyn.rebate_windfall.save', whyKey: 'dyn.rebate_windfall.save.why',
            tags: ['save', 'safe'], previewCash: amount,
            effects: { cash: amount, happiness: 2 },
          },
          {
            id: 'invest', labelKey: 'dyn.rebate_windfall.invest', whyKey: 'dyn.rebate_windfall.invest.why',
            tags: ['invest', 'hold'],
            effects: { cash: amount, invest: { asset: 'index', amount }, happiness: 2 },
          },
          {
            id: 'treat', labelKey: 'dyn.rebate_windfall.treat', whyKey: 'dyn.rebate_windfall.treat.why',
            tags: ['spend', 'fun'],
            effects: { happiness: 7, relationships: 3 },
          },
        ],
      };
    }

    case 'ticket_flip': {
      const cost = baseStake(s, rng, 0.24, 2_000, 16_000);
      const profit = roundTo(cost * (0.65 + rng.float() * 0.7), 500);
      const chance = clamp(0.55 + (rng.float() - 0.5) * 0.26, 0.4, 0.72);
      return {
        id, templateId, category: 'friends', speaker: 'phone',
        titleKey: 'dyn.ticket_flip.title', textKey: 'dyn.ticket_flip.text',
        vars: { cost, profit, odds: pct(chance) }, badgeOdds: pct(chance),
        choices: [
          {
            id: 'flip', labelKey: 'dyn.ticket_flip.flip', whyKey: 'dyn.ticket_flip.flip.why',
            tags: ['risky', 'work'], minCash: cost, previewCash: -cost, odds: chance, effects: {},
            roll: {
              chance, winKey: 'dyn.ticket_flip.win', loseKey: 'dyn.ticket_flip.lose',
              win: { cash: profit, happiness: 3 }, lose: { cash: -Math.round(cost * 0.5), happiness: -2 },
            },
          },
          {
            id: 'go', labelKey: 'dyn.ticket_flip.go', whyKey: 'dyn.ticket_flip.go.why',
            tags: ['spend', 'fun'], minCash: cost, previewCash: -cost,
            effects: { cash: -cost, happiness: 7, relationships: 3 },
          },
          {
            id: 'skip', labelKey: 'dyn.ticket_flip.skip', whyKey: 'dyn.ticket_flip.skip.why',
            tags: ['save', 'safe'], effects: { happiness: 0 },
          },
        ],
      };
    }

    case 'urgent_repair': {
      const cost = baseStake(s, rng, 0.26, 2_500, 20_000);
      const diyCost = roundTo(cost * 0.45, 500);
      const chance = clamp(0.58 + (rng.float() - 0.5) * 0.2, 0.45, 0.72);
      return {
        id, templateId, category: 'housing', speaker: 'self',
        titleKey: 'dyn.urgent_repair.title', textKey: 'dyn.urgent_repair.text',
        vars: { cost, diyCost, odds: pct(chance) }, badgeOdds: pct(chance),
        choices: [
          {
            id: 'pay', labelKey: 'dyn.urgent_repair.pay', whyKey: 'dyn.urgent_repair.pay.why',
            tags: ['safe', 'spend'], previewCash: -cost,
            effects: { cash: -cost, happiness: 1 },
          },
          {
            id: 'diy', labelKey: 'dyn.urgent_repair.diy', whyKey: 'dyn.urgent_repair.diy.why',
            tags: ['save', 'risky'], previewCash: -diyCost, odds: chance, effects: {},
            roll: {
              chance, winKey: 'dyn.urgent_repair.win', loseKey: 'dyn.urgent_repair.lose',
              win: { cash: -diyCost, happiness: 3 },
              lose: { cash: -Math.round(cost * 1.25), happiness: -4 },
            },
          },
          {
            id: 'card', labelKey: 'dyn.urgent_repair.card', whyKey: 'dyn.urgent_repair.card.why',
            tags: ['debt'],
            effects: { borrow: { kind: 'creditCard', amount: cost }, happiness: -1 },
          },
        ],
      };
    }

    case 'promo_deposit': {
      const deposit = baseStake(s, rng, 0.75, 15_000, 120_000);
      const bonus = roundTo(deposit * (0.045 + rng.float() * 0.025), 500);
      return {
        id, templateId, category: 'investing', speaker: 'bank',
        titleKey: 'dyn.promo_deposit.title', textKey: 'dyn.promo_deposit.text',
        vars: { deposit, bonus, rate: ((bonus / deposit) * 100).toFixed(1) },
        choices: [
          {
            id: 'lock', labelKey: 'dyn.promo_deposit.lock', whyKey: 'dyn.promo_deposit.lock.why',
            tags: ['save', 'safe'], minCash: deposit, previewCash: -deposit,
            effects: { invest: { asset: 'savings', amount: deposit }, cash: bonus, happiness: 2 },
          },
          {
            id: 'equity', labelKey: 'dyn.promo_deposit.equity', whyKey: 'dyn.promo_deposit.equity.why',
            tags: ['invest', 'hold'], minCash: deposit, previewCash: -deposit,
            effects: { invest: { asset: 'index', amount: deposit }, happiness: 1 },
          },
          {
            id: 'liquid', labelKey: 'dyn.promo_deposit.liquid', whyKey: 'dyn.promo_deposit.liquid.why',
            tags: ['safe'], effects: { happiness: 1 },
          },
        ],
      };
    }

    case 'weekend_escape': {
      const cost = baseStake(s, rng, 0.25, 2_500, 18_000);
      const budgetCost = roundTo(cost * 0.4, 500);
      return {
        id, templateId, category: 'friends', speaker: 'friend',
        titleKey: 'dyn.weekend_escape.title', textKey: 'dyn.weekend_escape.text',
        vars: { cost, budgetCost },
        choices: [
          {
            id: 'go', labelKey: 'dyn.weekend_escape.go', whyKey: 'dyn.weekend_escape.go.why',
            tags: ['spend', 'fun'], minCash: cost, previewCash: -cost,
            effects: { cash: -cost, happiness: 7, relationships: 5 },
          },
          {
            id: 'local', labelKey: 'dyn.weekend_escape.local', whyKey: 'dyn.weekend_escape.local.why',
            tags: ['fun', 'save'], minCash: budgetCost, previewCash: -budgetCost,
            effects: { cash: -budgetCost, happiness: 4, relationships: 3 },
          },
          {
            id: 'stay', labelKey: 'dyn.weekend_escape.stay', whyKey: 'dyn.weekend_escape.stay.why',
            tags: ['save', 'safe'], effects: { happiness: -1, relationships: -1 },
          },
        ],
      };
    }

    case 'family_surprise': {
      const gift = baseStake(s, rng, 0.3, 3_000, 28_000);
      const modest = roundTo(gift * 0.4, 500);
      return {
        id, templateId, category: 'family', speaker: 'parent',
        titleKey: 'dyn.family_surprise.title', textKey: 'dyn.family_surprise.text',
        vars: { gift, modest },
        choices: [
          {
            id: 'generous', labelKey: 'dyn.family_surprise.generous', whyKey: 'dyn.family_surprise.generous.why',
            tags: ['family', 'spend'], minCash: gift, previewCash: -gift,
            effects: { cash: -gift, relationships: 7, happiness: 4 },
          },
          {
            id: 'modest', labelKey: 'dyn.family_surprise.modest', whyKey: 'dyn.family_surprise.modest.why',
            tags: ['family', 'safe'], minCash: modest, previewCash: -modest,
            effects: { cash: -modest, relationships: 4, happiness: 2 },
          },
          {
            id: 'time', labelKey: 'dyn.family_surprise.time', whyKey: 'dyn.family_surprise.time.why',
            tags: ['family', 'save'], effects: { relationships: 3, happiness: 2 },
          },
        ],
      };
    }

    case 'bootcamp_flash': {
      const fee = baseStake(s, rng, 0.35, 3_500, 32_000);
      const chance = clamp(0.62 + (s.character.standing === 'high' ? 0.1 : 0) + (rng.float() - 0.5) * 0.2, 0.48, 0.82);
      const raisePct = 6 + Math.floor(rng.float() * 7); // +6% to +12%
      return {
        id, templateId, category: 'career', speaker: 'boss',
        titleKey: 'dyn.bootcamp_flash.title', textKey: 'dyn.bootcamp_flash.text',
        vars: { fee, raisePct, odds: pct(chance) }, badgeOdds: pct(chance),
        choices: [
          {
            id: 'enrol', labelKey: 'dyn.bootcamp_flash.enrol', whyKey: 'dyn.bootcamp_flash.enrol.why',
            tags: ['career', 'work'], minCash: fee, previewCash: -fee, odds: chance, effects: { cash: -fee },
            roll: {
              chance, winKey: 'dyn.bootcamp_flash.win', loseKey: 'dyn.bootcamp_flash.lose',
              win: s.job === 'employed'
                ? { salaryMult: 1 + raisePct / 100, happiness: 4 }
                : { sideIncome: roundTo(fee * 0.18, 500), happiness: 4 },
              lose: { happiness: 1 },
            },
          },
          {
            id: 'self_study', labelKey: 'dyn.bootcamp_flash.self_study', whyKey: 'dyn.bootcamp_flash.self_study.why',
            tags: ['career', 'save'], effects: { happiness: -1, sideIncome: 400 },
          },
          {
            id: 'skip', labelKey: 'dyn.bootcamp_flash.skip', whyKey: 'dyn.bootcamp_flash.skip.why',
            tags: ['safe'], effects: { happiness: 1 },
          },
        ],
      };
    }
  }
}

export function availableDynamicChoices(s: GameState, event: DynamicEvent): DynamicChoice[] {
  const ok = event.choices.filter((c) => c.minCash === undefined || s.cash >= c.minCash);
  return ok.length > 0 ? ok : [event.choices[event.choices.length - 1]];
}

/** Pure, immutable resolution of a procedural dynamic event choice. */
export function resolveDynamicChoice(
  s: GameState,
  event: DynamicEvent,
  choiceId: string,
): { state: GameState; result: DynamicResult } {
  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) throw new Error(`Unknown dynamic choice ${choiceId} for ${event.id}`);
  const d = cloneState(s);
  const rng = makeRng(d.rng.outcome);
  const before = {
    cash: d.cash,
    happiness: d.happiness,
    relationships: d.relationships,
    netWorth: netWorth(d),
    runway: runway(d),
  };
  const notices: string[] = [];

  notices.push(...applyEffect(d, choice.effects, rng));
  let outcomeKey = `${choice.whyKey}`;
  let outcomeId: string | undefined;

  if (choice.roll) {
    const won = rng.float() < choice.roll.chance;
    outcomeId = won ? 'win' : 'lose';
    outcomeKey = won ? choice.roll.winKey : choice.roll.loseKey;
    notices.push(...applyEffect(d, won ? choice.roll.win : choice.roll.lose, rng));
  }

  // If a cash-negative card pushed cash below 0 without explicit borrow, leave cash consistent (turn end handles borrow)
  if (d.cash < -50_000 && !choice.effects.borrow) {
    addDebt(d, 'creditCard', Math.abs(d.cash), undefined, undefined, true);
  }

  d.rng = { ...d.rng, outcome: rng.state };
  d.decisionLog = [
    ...d.decisionLog,
    {
      turn: d.turn,
      age: d.age,
      eventId: `dyn_${event.templateId}`,
      choiceId,
      outcomeId,
      tags: choice.tags,
      snapshot: { cash: before.cash, netWorth: before.netWorth, runway: before.runway, happiness: before.happiness },
      netWorthDelta: netWorth(d) - before.netWorth,
    },
  ];

  return {
    state: d,
    result: {
      eventId: event.id,
      choiceId,
      outcomeKey,
      vars: event.vars,
      delta: {
        cash: Math.round(d.cash - before.cash),
        happiness: Math.round(d.happiness - before.happiness),
        relationships: Math.round(d.relationships - before.relationships),
        netWorthHint: Math.round(netWorth(d) - before.netWorth),
      },
      notices,
    },
  };
}
