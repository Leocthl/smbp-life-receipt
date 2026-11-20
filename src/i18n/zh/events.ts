import { zhEventsEarly } from './events-early';
import { zhEventsLater } from './events-later';
import { zhEventsMid } from './events-mid';
import { zhEventsRecurring } from './events-recurring';

export const zhEvents: Record<string, string> = { ...zhEventsEarly, ...zhEventsRecurring, ...zhEventsMid, ...zhEventsLater };
