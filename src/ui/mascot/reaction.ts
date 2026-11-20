import type { Tag } from '../../engine/types';
import { QUALITIES, type Quality, type Qualities } from '../../world3d/qualities';
import type { Emote } from './emotes';

export type Tone = 'good' | 'mixed' | 'bad' | 'neutral';
export interface Reaction { emote: Emote; tone: Tone; lineKey: string }

/** Lines per pool: eight generic ones per tone, two quality-specific ones per quality (good and bad), plus special pools. */
export const GENERIC_LINES = 8;
export const SPECIFIC_LINES = 2;
const BAD_NOTICES = new Set(['auto_borrow', 'scheme_borrow', 'bankrupt', 'forced_sale', 'belt_tighten', 'went_without', 'card_restructure', 'cannot_afford_property']);
const NOTICE_PENALTY = 8;
const BANKRUPT_PENALTY = 30;
const SMALL = 3;
const BIG = 12;
const LUCKY_GAIN = 5;

type Dominant = Quality | 'notice' | 'lucky' | null;

/** Every line key reactionFor can return, so tests can check both locales have them all. */
export function allLineKeys(): string[] {
  const keys: string[] = [];
  (['good', 'mixed', 'bad', 'neutral'] as const).forEach((tone) => {
    for (let i = 0; i < GENERIC_LINES; i += 1) keys.push(`mascot.r.${tone}.${i}`);
  });
  const special: [string, string[]][] = [['good', [...QUALITIES]], ['bad', [...QUALITIES, 'notice']], ['mixed', ['lucky']]];
  special.forEach(([tone, names]) => names.forEach((n) => {
    for (let i = 0; i < SPECIFIC_LINES; i += 1) keys.push(`mascot.r.${tone}.${n}.${i}`);
  }));
  return keys;
}

/** FNV-1a: a stable number from the event and turn, so replays of the same seed hear the same line. */
function hash(seed: string | number): number {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Safety and freedom matter more when a choice is risky or borrows; bonds matter more for family choices. */
function weights(tags: readonly Tag[]): Record<Quality, number> {
  const w: Record<Quality, number> = { wealth: 1, safety: 1, joy: 1, bonds: 1, freedom: 1, growth: 1 };
  if (tags.includes('debt') || tags.includes('risky')) { w.safety = 1.6; w.freedom = 1.6; }
  if (tags.includes('family')) w.bonds = 1.8;
  if (tags.includes('invest') || tags.includes('career') || tags.includes('work')) w.growth = 1.3;
  if (tags.includes('save') || tags.includes('safe') || tags.includes('insure')) w.safety = Math.max(w.safety, 1.4);
  return w;
}

function pickTone(score: number, ups: number, downs: number, total: number, lucky: boolean, noticeBad: boolean, bankrupt: boolean): Tone {
  if (lucky) return 'mixed';
  if (bankrupt || noticeBad) return 'bad';
  if (ups >= SMALL && downs <= -SMALL && Math.abs(score) < BIG) return 'mixed';
  if (score >= SMALL) return 'good';
  if (score <= -SMALL) return 'bad';
  return total < 2 ? 'neutral' : 'mixed';
}

function pickEmote(tone: Tone, dom: Dominant, score: number, bankrupt: boolean): Emote {
  if (tone === 'good') return dom === 'bonds' ? 'love' : score >= BIG ? 'cheer' : dom === 'safety' || dom === 'freedom' || dom === 'growth' ? 'proud' : 'happy';
  if (tone === 'mixed') return dom === 'lucky' ? 'shocked' : 'thinking';
  if (tone === 'bad') return bankrupt || score <= -BIG * 1.25 || dom === 'joy' ? 'sad' : dom === 'notice' ? 'shocked' : 'worried';
  return 'neutral';
}

function lineFor(tone: Tone, dom: Dominant, h: number): string {
  const specific = dom !== null && h % 3 !== 0 ? `mascot.r.${tone}.${dom}.${(h >>> 4) % SPECIFIC_LINES}` : '';
  return specific || `mascot.r.${tone}.${(h >>> 2) % GENERIC_LINES}`;
}

/**
 * How Slip reacts to one decision. Pure: the same inputs and seed always give the same emote and line.
 * `seed` should be something stable like "eventId:turn".
 */
export function reactionFor(before: Qualities, after: Qualities, tags: readonly Tag[], notices: readonly string[], seed: string | number = ''): Reaction {
  const w = weights(tags);
  const moves = QUALITIES.map((q) => ({ q, d: after[q] - before[q], weighted: (after[q] - before[q]) * w[q] }));
  const badNotices = notices.filter((n) => BAD_NOTICES.has(n));
  const bankrupt = badNotices.includes('bankrupt');
  const penalty = bankrupt ? BANKRUPT_PENALTY : badNotices.length * NOTICE_PENALTY;
  const score = moves.reduce((s, m) => s + m.weighted, 0) - penalty;
  const ups = Math.max(0, ...moves.map((m) => m.d));
  const downs = Math.min(0, ...moves.map((m) => m.d));
  const total = moves.reduce((s, m) => s + Math.abs(m.d), 0);
  const wealth = moves.find((m) => m.q === 'wealth')?.d ?? 0;
  const lucky = tags.includes('risky') && wealth >= LUCKY_GAIN;
  const tone = pickTone(score, ups, downs, total, lucky, badNotices.length > 0, bankrupt);
  const dom = dominant(tone, moves, badNotices.length > 0, lucky);
  return { tone, emote: pickEmote(tone, dom, score, bankrupt), lineKey: lineFor(tone, dom, hash(seed)) };
}

function dominant(tone: Tone, moves: { q: Quality; weighted: number }[], notice: boolean, lucky: boolean): Dominant {
  if (tone === 'mixed') return lucky ? 'lucky' : null;
  if (tone === 'neutral') return null;
  if (tone === 'bad' && notice) return 'notice';
  const sign = tone === 'good' ? 1 : -1;
  const best = [...moves].sort((a, b) => sign * (b.weighted - a.weighted))[0];
  return best && sign * best.weighted > 0 ? best.q : null;
}
