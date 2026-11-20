import { useEffect, useRef, useState } from 'react';
import { buildEnding } from '../../engine/endings';
import type { Lang } from '../../i18n';
import type { StageApi } from '../../world3d/contracts';
import { playEnding } from '../../world3d/cutscene/ending';
import { playYearEnd } from '../../world3d/cutscene/yearEnd';
import { qualities } from '../../world3d/qualities';
import type { Session } from '../session';

/** Plays the year-end vignette before each receipt and the ending film before the final one. True while one is on screen. */
export function useCutscenes(stage: StageApi | null, session: Session | null, lang: Lang, enabled: boolean): boolean {
  const [played, setPlayed] = useState('');
  const started = useRef('');
  const screen = session?.screen;
  const key = session ? `${session.state.turn}-${session.index}-${screen?.kind}` : '';
  const pending = enabled && stage !== null && (screen?.kind === 'summary' || screen?.kind === 'ending') && played !== key;

  useEffect(() => {
    if (!pending || !stage || !session || started.current === key) return;
    started.current = key; // React may run this effect twice in development; the film must not
    const s = session.screen;
    const run = s.kind === 'ending'
      ? (() => { const e = buildEnding(session.state, s.goal); return playEnding(stage, { label: e.label, q: qualities(session.state), goalHit: e.goal.hit, age: session.state.age, lang }); })()
      : s.kind === 'summary'
        ? playYearEnd(stage, { age: s.summary.age, regime: s.summary.regime, before: session.yearStart, after: qualities(session.state), lang })
        : Promise.resolve();
    // a cutscene that fails must never trap the player behind a blank screen
    run.catch(() => undefined).finally(() => setPlayed(key));
  }, [pending, stage, session, key, lang]);

  return pending;
}
