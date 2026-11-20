import { newGame } from '../../engine/sim';
import type { Regime } from '../../engine/types';
import type { Lang } from '../../i18n';
import { QUALITIES, type Quality, type Qualities } from '../qualities';
import { worldFor } from '../descriptor';
import { createStage } from '../stage';
import { playEnding } from './ending';
import { asLabel } from './logic';
import { playYearEnd } from './yearEnd';

// ?look=yearend&regime=bull|crash|correction|recovery|normal   ?look=ending&e=<label>&weak=<quality>&strong=<quality>&goal=1
// Common: &lang=en &seed=3 &at=<seconds> (jump there and hold, for screenshots).
const REGIMES: readonly Regime[] = ['bull', 'normal', 'correction', 'crash', 'recovery'];
const isQuality = (v: string | null): v is Quality => v !== null && (QUALITIES as readonly string[]).includes(v);

function fakeQualities(weak: Quality, strong: Quality): Qualities {
  return Object.fromEntries(QUALITIES.map((q) => [q, q === weak ? 8 : q === strong ? 92 : 50])) as Qualities;
}

export async function mountLookCutscene(container: HTMLElement, kind: 'yearend' | 'ending'): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const lang: Lang = params.get('lang') === 'en' ? 'en' : 'zh';
  const seed = Number(params.get('seed')) || 1;
  const at = params.get('at') === null ? undefined : Number(params.get('at'));
  const base = worldFor(newGame(seed));
  const weak = isQuality(params.get('weak')) ? (params.get('weak') as Quality) : 'wealth';
  const strongParam = params.get('strong');
  const strong = isQuality(strongParam) && strongParam !== weak ? strongParam : QUALITIES.find((q) => q !== weak) ?? 'joy';
  const q = fakeQualities(weak, strong);
  const regimeParam = params.get('regime');
  const regime = REGIMES.find((r) => r === regimeParam) ?? 'normal';
  const stage = createStage(container, { ...base, regime, age: kind === 'ending' ? 65 : 30 }, seed, { lang });
  document.title = 'ready';
  if (kind === 'yearend') {
    stage.setWorld({ ...stage.world(), regime });
    await playYearEnd(stage, { age: 31, regime, before: q, after: { ...q, wealth: q.wealth + 6, safety: q.safety - 4, joy: q.joy + 3 }, lang }, { at });
  } else {
    await playEnding(stage, { label: asLabel(params.get('e') ?? 'steady'), q, goalHit: params.get('goal') !== '0', age: 65, lang }, { at });
  }
}
