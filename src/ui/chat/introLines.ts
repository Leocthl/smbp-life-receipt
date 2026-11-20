import type { Speaker } from '../../engine/types';
import type { Emote } from '../mascot/emotes';

const INTRO_VARIANTS = 2;
export const ASK_VARIANTS = 4;

function pick(seed: string, n: number): number {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) % n;
}

/** How Slip looks while announcing each kind of caller. */
const INTRO_EMOTE: Readonly<Record<Speaker, Emote>> = {
  friend: 'happy', agent: 'curious', landlord: 'worried', headline: 'shocked', boss: 'neutral', doctor: 'worried',
  parent: 'happy', bank: 'neutral', self: 'thinking', partner: 'love', phone: 'curious', campus: 'happy',
};
export const introEmote = (speaker: Speaker): Emote => INTRO_EMOTE[speaker];

/** The mascot's lead-in line for who is talking; the variant is stable per event. */
export const introKey = (speaker: Speaker, eventId: string) => `mascot.intro.${speaker}.${pick(eventId, INTRO_VARIANTS)}`;
export const askKey = (eventId: string, turn: number) => `mascot.ask.${pick(`${eventId}:${turn}`, ASK_VARIANTS)}`;
