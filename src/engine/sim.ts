import { ALL_EVENTS, OPENING_QUEUE } from '../data/events';
import { botChoose, type BotId } from './bots';
import { generateCharacter } from './character';
import { drawCards, eventById, resolveChoice } from './events';
import { makeRng, streamSeed } from './rng';
import { newGameFromCharacter } from './state';
import { endTurn } from './turn';
import type { Character, GameEvent, GameState } from './types';

/** A fresh life: random character from the seed, tuition card queued first. */
export function newGame(seed: number, character?: Character): GameState {
  const s = newGameFromCharacter(seed, character ?? generateCharacter(seed));
  return { ...s, queue: [...OPENING_QUEUE] };
}

/** Play one whole life headlessly with a bot strategy. */
export function playLife(seed: number, bot: BotId, events: readonly GameEvent[] = ALL_EVENTS, character?: Character): GameState {
  const rng = makeRng(streamSeed(seed, `bot:${bot}`));
  let s = newGame(seed, character);
  while (!s.done) {
    const drawn = drawCards(s, events);
    s = drawn.state;
    for (const card of drawn.cards) {
      const ev = eventById(events, card.eventId);
      s = resolveChoice(s, events, ev.id, botChoose(s, ev, bot, rng)).state;
    }
    s = endTurn(s).state;
  }
  return s;
}

/** Phase 1 helper kept for tests: a life with no events at all. */
export function runLife(seed: number): GameState {
  return playLife(seed, 'balanced', []);
}
