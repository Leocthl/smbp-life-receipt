import { zhCutscene } from './cutscene';
import { zhEndings } from './endings';
import { zhEvents } from './events';
import { zhFlow } from './flow';
import { zhHex } from './hex';
import { zhMascot } from './mascot';
import { zhMini } from './mini';
import { zhStage } from './stage';
import { zhUi } from './ui';

export const zh: Record<string, string> = { ...zhUi, ...zhEndings, ...zhEvents, ...zhHex, ...zhStage, ...zhMini, ...zhMascot, ...zhCutscene, ...zhFlow };
