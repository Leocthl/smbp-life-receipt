import { enEndings } from './endings';
import { enEvents } from './events';
import { enUi } from './ui';

export const en: Record<string, string> = { ...enUi, ...enEndings, ...enEvents };
