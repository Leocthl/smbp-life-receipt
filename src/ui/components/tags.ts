import { resolveAmount } from '../../engine/finance';
import type { Choice, GameState, Speaker, Tag } from '../../engine/types';

/** Visual groups for a choice: the left glyph and its colour. Order matters: the first tag that matches wins. */
export type TagKey = 'debt' | 'risky' | 'sell' | 'spend' | 'family' | 'invest' | 'safe' | 'save' | 'work' | 'status' | 'idle';

const TAG_TO_KEY: readonly (readonly [Tag, TagKey])[] = [
  ['debt', 'debt'], ['risky', 'risky'], ['sell', 'sell'], ['fun', 'spend'], ['spend', 'spend'], ['family', 'family'],
  ['invest', 'invest'], ['hold', 'invest'], ['insure', 'safe'], ['safe', 'safe'], ['save', 'save'], ['career', 'work'],
  ['work', 'work'], ['status', 'status'],
];

export function tagKey(tags: readonly Tag[] | undefined): TagKey {
  if (!tags) return 'idle';
  return TAG_TO_KEY.find(([t]) => tags.includes(t))?.[1] ?? 'idle';
}

export const SPEAKER_HUE: Readonly<Record<Speaker, string>> = {
  friend: 'turquoise', agent: 'lilac', landlord: 'coral', headline: 'sun', boss: 'sky', doctor: 'green',
  parent: 'coral', bank: 'turquoise', self: 'green', partner: 'lilac', phone: 'sky', campus: 'sun',
};

/** The visible up-front cost of a choice (HK$): cash it pays, money it invests, a property down payment. 0 if none. */
export function choiceCost(s: GameState, c: Choice): number {
  const e = c.effects;
  if (!e) return 0;
  const paid = e.cash === undefined ? 0 : Math.max(0, -resolveAmount(s, e.cash));
  const invested = e.invest ? Math.min(Math.max(0, resolveAmount(s, e.invest.amount)), Math.max(0, s.cash)) : 0;
  const down = e.buyProperty ? resolveAmount(s, e.buyProperty.price) * e.buyProperty.downPct : 0;
  return Math.round(paid + invested + down);
}
