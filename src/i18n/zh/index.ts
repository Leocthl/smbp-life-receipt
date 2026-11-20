import { zhEndings } from './endings';
import { zhEvents } from './events';
import { zhHex } from './hex';
import { zhMini } from './mini';
import { zhStage } from './stage';
import { zhUi } from './ui';

export const zh: Record<string, string> = { ...zhUi, ...zhEndings, ...zhEvents, ...zhHex, ...zhStage, ...zhMini };
