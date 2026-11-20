import type { Lang } from '../../i18n';
import type { StageApi } from '../contracts';
import type { Qualities } from '../qualities';

export interface EndingInfo { label: string; q: Qualities; goalHit: boolean; age: number; lang: Lang }
export async function playEnding(_stage: StageApi, _info: EndingInfo, _opts: { at?: number } = {}): Promise<void> { /* stub */ }
