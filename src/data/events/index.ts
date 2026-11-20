import type { GameEvent } from '../../engine/types';
import { EARLY_EVENTS } from './early';
import { LATER_EVENTS } from './later';
import { MID_EVENTS } from './mid';
import { RECURRING_EVENTS } from './recurring';

export const ALL_EVENTS: readonly GameEvent[] = [...EARLY_EVENTS, ...RECURRING_EVENTS, ...MID_EVENTS, ...LATER_EVENTS];
/** events queued at the very start of a life */
export const OPENING_QUEUE = ['tuition'];
