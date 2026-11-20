import { regimeForTurn, yearIndex } from '../engine/market';
import type { Category, Choice, GameEvent, GameState, Regime } from '../engine/types';
import type { SpotId } from '../world3d/contracts';
import { worldFor, type Scope, type WorldDescriptor } from '../world3d/descriptor';
import type { MiniGameId } from './minigames/types';

/** Where in the neighbourhood each kind of decision happens. */
export const SPOT_FOR_CATEGORY: Readonly<Record<Category, SpotId>> = {
  investing: 'bank', career: 'office', health: 'clinic', family: 'home', housing: 'home', friends: 'cafe', daily: 'market',
};

/** The room and the flat only have a home spot, so there the decision opens straight away. */
export function walkTarget(category: Category, scope: Scope): SpotId | null {
  return scope === 'room' || scope === 'home' ? null : SPOT_FOR_CATEGORY[category];
}

/** Minimum years between two runs of the same mini-game (none for 'hold': it only follows a sell or a scary market). */
export const MINI_COOLDOWN: Readonly<Record<MiniGameId, number>> = { hold: 0, budget: 3, compare: 5 };
const COMPARE_IDS = ['insur', 'fund', 'mpf', 'fee'];

export interface MiniContext {
  event: Pick<GameEvent, 'id' | 'category'>;
  choice: Pick<Choice, 'tags'>;
  regime: Regime;
  age: number;
  /** age at which each game last ran */
  last: Partial<Record<MiniGameId, number>>;
}

const cooled = (c: MiniContext, id: MiniGameId) => { const at = c.last[id]; return at === undefined || c.age - at >= MINI_COOLDOWN[id]; };

/** Which mini-game, if any, belongs to this choice. */
export function pickMiniGame(c: MiniContext): MiniGameId | null {
  const tags = c.choice.tags;
  const scary = c.regime === 'crash' || c.regime === 'correction';
  if ((tags.includes('sell') || (tags.includes('hold') && scary)) && cooled(c, 'hold')) return 'hold';
  if (COMPARE_IDS.some((k) => c.event.id.includes(k)) && cooled(c, 'compare')) return 'compare';
  if (c.event.category === 'daily' && (tags.includes('save') || tags.includes('spend')) && cooled(c, 'budget')) return 'budget';
  return null;
}

/**
 * The market weather the player may see: last year's. This year's regime is only revealed by the year-end receipt,
 * so neither the HUD nor the world gives away a crash before the player has decided.
 */
export function shownRegime(s: GameState): Regime {
  const year = yearIndex(s.turn);
  if (year <= 0) return 'normal';
  let t = s.turn - 1;
  while (t > 0 && yearIndex(t) >= year) t -= 1;
  return regimeForTurn(s.market, t); // t < s.turn, so it is always inside the market's range
}

/** What the 3D world is built from: the life so far, under last year's weather. */
export function worldView(s: GameState): WorldDescriptor {
  return { ...worldFor(s), regime: shownRegime(s) };
}
