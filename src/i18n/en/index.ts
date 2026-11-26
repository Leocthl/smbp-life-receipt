import { enCutscene } from './cutscene';
import { enEndings } from './endings';
import { enEvents } from './events';
import { enFlow } from './flow';
import { enHex } from './hex';
import { enMascot } from './mascot';
import { enLayout } from './layout';
import { enJuice } from './juice';
import { enMini } from './mini';
import { enPolish } from './polish';
import { enStage } from './stage';
import { enUi } from './ui';

export const en: Record<string, string> = { ...enUi, ...enEndings, ...enEvents, ...enHex, ...enStage, ...enMini, ...enMascot, ...enCutscene, ...enFlow, ...enLayout, ...enPolish, ...enJuice };
