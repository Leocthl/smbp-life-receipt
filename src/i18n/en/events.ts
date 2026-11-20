import { enEventsEarly } from './events-early';
import { enEventsLater } from './events-later';
import { enEventsMid } from './events-mid';
import { enEventsRecurring } from './events-recurring';

export const enEvents: Record<string, string> = { ...enEventsEarly, ...enEventsRecurring, ...enEventsMid, ...enEventsLater };
