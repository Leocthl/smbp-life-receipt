// Checks the README "add an event" example against the real content validator.
import { validateContent } from '../src/engine/validate';
import type { GameEvent } from '../src/engine/types';
const ev: GameEvent = {
  id: 'gym_membership', ageRange: [22, 40], category: 'daily', speaker: 'friend', weight: 1, cooldown: 6,
  conditions: { stat: 'cash', op: '>', value: 20_000 },
  choices: [
    { id: 'year', tags: ['spend'], effects: { cash: -6_000, happiness: 3 }, hidden: { expense: { lifestyle: 300 } } },
    { id: 'park', tags: ['save', 'safe'], effects: { happiness: 1 } },
    { id: 'trial', tags: ['spend', 'fun'], requires: { stat: 'cash', op: '>', value: 1_000 },
      outcomes: [{ id: 'keeps_going', weight: 1, effects: { happiness: 4 } }, { id: 'gives_up', weight: 2, effects: { cash: -800 } }] },
  ],
};
const text: Record<string, string> = {
  'ev.gym_membership.text': 'x', 'ev.gym_membership.year': 'x', 'ev.gym_membership.year.why': 'x', 'ev.gym_membership.year.fine': 'x',
  'ev.gym_membership.park': 'x', 'ev.gym_membership.park.why': 'x', 'ev.gym_membership.trial': 'x', 'ev.gym_membership.trial.why': 'x',
  'ev.gym_membership.trial.keeps_going': 'x', 'ev.gym_membership.trial.gives_up': 'x',
};
console.log(JSON.stringify(validateContent([ev], { zh: text, en: text } as never)));
