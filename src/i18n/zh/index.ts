import { zhEndings } from './endings';
import { zhEvents } from './events';
import { zhUi } from './ui';

export const zh: Record<string, string> = { ...zhUi, ...zhEndings, ...zhEvents };
