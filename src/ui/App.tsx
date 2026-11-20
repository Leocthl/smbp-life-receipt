import { useEffect, useMemo, useRef, useState } from 'react';
import type { Lang } from '../i18n';
import { StatsTape } from './components/StatsTape';
import { I18nProvider, makeI18n } from './i18nContext';
import { CardScreen } from './screens/CardScreen';
import { EndingScreen } from './screens/EndingScreen';
import { ResultScreen } from './screens/ResultScreen';
import { IntroScreen, StartScreen } from './screens/StartScreens';
import { SummaryScreen } from './screens/SummaryScreen';
import { WorldBackdrop } from './WorldBackdrop';
import { GoalScreen } from './screens/GoalScreen';
import { advance, afterSummary, beginTurn, choose, pickGoal, startSession, type Session } from './session';

const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
/** ?classic=1 keeps the original 2D receipt game without the 3D world. */
const is3d = params.get('classic') !== '1';
if (is3d) document.body.classList.add('ml-is-3d');
const randomSeed = () => Math.floor(Math.random() * 1_000_000) + 1;

function initialLang(): Lang {
  const p = params.get('lang');
  if (p === 'en' || p === 'zh') return p;
  try {
    return localStorage.getItem('ml-lang') === 'en' ? 'en' : 'zh';
  } catch {
    return 'zh'; // storage blocked: fall back to the default language
  }
}

export function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [seed, setSeed] = useState(() => (Number.isFinite(seedParam) && seedParam > 0 ? seedParam : randomSeed()));
  const [session, setSession] = useState<Session | null>(null);
  const i18n = useMemo(() => makeI18n(lang), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-HK' : 'en';
    document.title = i18n.t('app.title');
    try {
      localStorage.setItem('ml-lang', lang);
    } catch {
      // storage blocked: the choice just won't be remembered
    }
  }, [lang, i18n]);

  const screen = session?.screen ?? { kind: 'start' as const };
  // key changes per screen so each new slip "prints" in
  const slipKey = session ? `${session.state.turn}-${session.index}-${screen.kind}` : 'start';
  const stageRef = useRef<HTMLElement>(null);
  useEffect(() => {
    // each slip starts at the top; keyboard and screen-reader focus moves to it unless a button grabbed it
    window.scrollTo(0, 0);
    if (!stageRef.current?.contains(document.activeElement)) stageRef.current?.focus({ preventScroll: true });
  }, [slipKey]);

  return (
    <I18nProvider value={i18n}>
      {is3d && <WorldBackdrop state={session?.state ?? null} />}
      <div className="ml-app">
        <div className="ml-app__bar">
          <button type="button" className="ml-lang" data-testid="lang" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>{i18n.t('app.lang')}</button>
        </div>
        {session && screen.kind !== 'start' && screen.kind !== 'intro' && <StatsTape state={session.state} />}
        <main className="ml-stage" key={slipKey} data-slip={slipKey} ref={stageRef} tabIndex={-1}>
          {screen.kind === 'start' && <StartScreen seed={seed} onStart={() => setSession(startSession(seed))} />}
          {session && screen.kind === 'intro' && <IntroScreen state={session.state} onGo={() => setSession(beginTurn(session))} />}
          {session && screen.kind === 'card' && <CardScreen state={session.state} card={screen.card} onChoose={(id) => setSession(choose(session, id))} />}
          {session && screen.kind === 'result' && <ResultScreen state={session.state} card={screen.card} result={screen.result} onNext={() => setSession(advance(session))} />}
          {session && screen.kind === 'summary' && <SummaryScreen state={session.state} summary={screen.summary} onNext={() => setSession(afterSummary(session))} />}
          {session && screen.kind === 'goal' && <GoalScreen onPick={(g) => setSession(pickGoal(session, g))} />}
          {session && screen.kind === 'ending' && (
            <EndingScreen state={session.state} goal={screen.goal} onAgain={() => { const s = randomSeed(); setSeed(s); setSession(startSession(s)); }} />
          )}
        </main>
      </div>
    </I18nProvider>
  );
}
