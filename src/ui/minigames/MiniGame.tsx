import { useCallback, useState, type ReactNode } from 'react';
import type { Lang } from '../../i18n';
import { useI18n } from '../i18nContext';
import { BUDGET } from './budget';
import { IntroCard, ResultCard } from './Cards';
import { COMPARE } from './compare';
import { HOLD } from './hold';
import { Runner } from './Runner';
import { miniText } from './text';
import type { MiniGameId, MiniGameProps, MiniGameResult } from './types';
import './minigames.css';

type Phase = 'intro' | 'play' | 'result';

interface BoardProps {
  id: MiniGameId;
  seed: number;
  lang: Lang;
  running: boolean;
  auto: boolean;
  reduced: boolean;
  onFinish(r: MiniGameResult): void;
  children: ReactNode;
}

/** Picks the game's Runner by id. */
function Board({ id, ...rest }: BoardProps) {
  switch (id) {
    case 'budget':
      return <Runner def={BUDGET} {...rest} />;
    case 'hold':
      return <Runner def={HOLD} {...rest} />;
    case 'compare':
      return <Runner def={COMPARE} {...rest} />;
  }
}

/** One 15–25 second money mini-game in a full-screen overlay: intro, play, result, with skip always visible. */
export function MiniGame({ id, seed, onDone, onSkip }: MiniGameProps) {
  const { lang } = useI18n();
  const [auto] = useState(() => new URLSearchParams(window.location.search).get('auto') === '1');
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [phase, setPhase] = useState<Phase>(auto ? 'play' : 'intro');
  const [result, setResult] = useState<MiniGameResult | null>(null);
  const finish = useCallback((r: MiniGameResult) => {
    setResult(r);
    setPhase('result');
  }, []);
  const start = useCallback(() => setPhase('play'), []);
  const title = miniText(lang, 'mini.' + id + '.title');
  return (
    <div className="ml-mini" role="dialog" aria-label={title}>
      <header className="ml-mini__top">
        <span className="ml-mini__title">{title}</span>
        <button type="button" className="ml-mini__skip" onClick={onSkip}>
          {miniText(lang, 'mini.skip')}
        </button>
      </header>
      <Board key={id + '-' + seed} id={id} seed={seed} lang={lang} running={phase === 'play'} auto={auto} reduced={reduced} onFinish={finish}>
        {phase === 'intro' && <IntroCard lang={lang} id={id} onStart={start} />}
        {phase === 'result' && result && <ResultCard lang={lang} result={result} onDone={() => onDone(result)} />}
      </Board>
    </div>
  );
}
