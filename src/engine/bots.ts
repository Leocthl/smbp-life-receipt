import { availableChoices } from './events';
import type { Rng } from './rng';
import type { GameEvent, GameState, Tag } from './types';

export type BotId = 'saver' | 'indexer' | 'spender' | 'panic' | 'tipChaser' | 'family' | 'debtor' | 'balanced';

/** Fixed strategies for the balance simulator: a preference per behaviour tag. */
export const BOTS: Record<BotId, { prefs: Partial<Record<Tag, number>>; noise: number }> = {
  // never invest: keeps cash and deposits, avoids markets and debt
  saver: { prefs: { save: 3, safe: 2, invest: -5, risky: -5, spend: -1, fun: -1, debt: -4, sell: 1, insure: 0.5 }, noise: 0.5 },
  // always the index fund, holds through everything
  indexer: { prefs: { invest: 3, hold: 3, safe: 1, risky: -3, sell: -4, spend: -0.5, debt: -2, save: 0.5 }, noise: 0.5 },
  // always spends on fun
  spender: { prefs: { spend: 3, fun: 3, status: 1, save: -2, invest: -1, hold: 0.5 }, noise: 0.5 },
  // invests, then sells whenever markets drop
  panic: { prefs: { sell: 6, invest: 3, hold: -1, safe: 0.5, risky: -1, debt: -2 }, noise: 0.5 },
  // chases every tip and hot asset
  tipChaser: { prefs: { risky: 4, invest: 1, hold: 1, safe: -1, save: -1, sell: -1, debt: -3 }, noise: 0.5 },
  // family first
  family: { prefs: { family: 4, safe: 0.5, hold: 0.5, insure: 1, save: 0.5, risky: -1 }, noise: 0.5 },
  // borrows freely to live now
  debtor: { prefs: { debt: 4, spend: 2, fun: 2, status: 1, save: -2 }, noise: 0.5 },
  // no strong style: small preference for buffers and the index, some fun
  balanced: { prefs: { save: 1, safe: 1, invest: 1, hold: 1, fun: 0.5, debt: -2, risky: -1, sell: -1 }, noise: 1.5 },
};

export const BOT_IDS = Object.keys(BOTS) as BotId[];

export function botChoose(s: GameState, ev: GameEvent, bot: BotId, rng: Rng): string {
  const { prefs, noise } = BOTS[bot];
  const options = availableChoices(s, ev);
  let best = options[0];
  let bestScore = -Infinity;
  for (const c of options) {
    const score = c.tags.reduce((a, t) => a + (prefs[t] ?? 0), 0) + noise * rng.normal();
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best.id;
}
