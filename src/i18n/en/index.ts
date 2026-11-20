import { enCutscene } from './cutscene';
import { enEndings } from './endings';
import { enEvents } from './events';
import { enHex } from './hex';
import { enMascot } from './mascot';
import { enMini } from './mini';
import { enStage } from './stage';
import { enUi } from './ui';

export const en: Record<string, string> = { ...enUi, ...enEndings, ...enEvents, ...enHex, ...enStage, ...enMini, ...enMascot, ...enCutscene };
