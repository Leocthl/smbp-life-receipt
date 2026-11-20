import { useEffect, useMemo, useRef, useState } from 'react';
import type { Lang } from '../i18n';
import type { StageApi } from '../world3d/contracts';
import { StatsTape } from './components/StatsTape';
import { resolveWithMini } from './director/choice';
import { useCutscenes } from './director/useCutscenes';
import { isFasting, useFast } from './director/useFast';
import { useWalk } from './director/useWalk';
import { HexButton } from './HexPanel';
import { Hud } from './hud/Hud';
import { I18nProvider, makeI18n } from './i18nContext';
import { MiniGame } from './minigames/MiniGame';
import type { MiniGameId } from './minigames/types';
import { CardScreen } from './screens/CardScreen';
import { EndingScreen } from './screens/EndingScreen';
import { ResultScreen } from './screens/ResultScreen';
import { IntroScreen, StartScreen } from './screens/StartScreens';
import { SummaryScreen } from './screens/SummaryScreen';
import { WalkPrompt } from './WalkPrompt';
import { WorldBackdrop } from './WorldBackdrop';
import { GoalScreen } from './screens/GoalScreen';
import { advance, afterSummary, applyMiniScore, beginTurn, pickGoal, startSession, type Session } from './session';

const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
/** ?classic=1 keeps the original 2D receipt game without the 3D world. */
const is3d = params.get('classic') !== '1';
if (is3d) document.body.classList.add('ml-is-3d');
// browser tests stay fast: no films or mini-games unless asked for (?cut=1, ?mini=1)
const robot = navigator.webdriver;
const cutsOn = is3d && (!robot || params.get('cut') === '1');
const minisOn = is3d && (!robot || params.get('mini') === '1');
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
  const [stage, setStage] = useState<StageApi | null>(null);
  const [mini, setMini] = useState<{ id: MiniGameId; next: Session } | null>(null);
  const i18n = useMemo(() => makeI18n(lang), [lang]);
  const fasting = isFasting(session);
  useFast(session, setSession);
  const walk = useWalk(stage, session, is3d && !fasting);
  const cutting = useCutscenes(stage, session, lang, cutsOn && !fasting);
  // the player walks only while a decision is waiting for them at a place; a card, a receipt or a film freezes the avatar
  useEffect(() => { stage?.setControls(walk.spot !== null); }, [stage, walk.spot, cutting]);

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
  const away = walk.spot !== null || cutting; // the slip steps aside for the walk or the film
  const stageRef = useRef<HTMLElement>(null);
  useEffect(() => {
    // each slip starts at the top; keyboard and screen-reader focus moves to it unless a button grabbed it
    window.scrollTo(0, 0);
    if (!stageRef.current?.contains(document.activeElement)) stageRef.current?.focus({ preventScroll: true });
  }, [slipKey, away]);

  const toggleLang = () => setLang(lang === 'zh' ? 'en' : 'zh');
  const onChoose = (id: string) => {
    if (!session) return;
    const { next, mini: game } = resolveWithMini(session, id, minisOn && !fasting);
    if (game) setMini({ id: game, next });
    else setSession(next);
  };
  const endMini = (score: number | null) => {
    if (!mini) return;
    setSession(score === null ? mini.next : applyMiniScore(mini.next, score));
    setMini(null);
  };
  const playing = session && screen.kind !== 'start' && screen.kind !== 'intro' ? session : null;

  return (
    <I18nProvider value={i18n}>
      {is3d && <WorldBackdrop state={session?.state ?? null} lang={lang} onStage={setStage} />}
      {is3d && !cutting && <Hud state={playing?.state} hexSlot={playing && <HexButton session={playing} />} onLang={toggleLang} />}
      {walk.spot && <WalkPrompt spot={walk.spot} onSkip={walk.skip} />}
      <div className="ml-app">
        {!is3d && (
          <div className="ml-app__bar">
            <button type="button" className="ml-lang" data-testid="lang" onClick={toggleLang}>{i18n.t('app.lang')}</button>
          </div>
        )}
        {!is3d && playing && <StatsTape state={playing.state} />}
        <main className="ml-stage" key={slipKey} data-slip={slipKey} ref={stageRef} tabIndex={-1} hidden={away}>
          {!away && screen.kind === 'start' && <StartScreen seed={seed} onStart={() => setSession(startSession(seed))} />}
          {!away && session && screen.kind === 'intro' && <IntroScreen state={session.state} onGo={() => setSession(beginTurn(session))} />}
          {!away && session && screen.kind === 'card' && <CardScreen state={session.state} card={screen.card} onChoose={onChoose} />}
          {!away && session && screen.kind === 'result' && <ResultScreen state={session.state} card={screen.card} result={screen.result} entry={session.trail[session.trail.length - 1]} onNext={() => setSession(advance(session))} />}
          {!away && session && screen.kind === 'summary' && <SummaryScreen state={session.state} summary={screen.summary} onNext={() => setSession(afterSummary(session))} />}
          {!away && session && screen.kind === 'goal' && <GoalScreen onPick={(g) => setSession(pickGoal(session, g))} />}
          {!away && session && screen.kind === 'ending' && (
            <EndingScreen state={session.state} goal={screen.goal} onAgain={() => { const s = randomSeed(); setSeed(s); setSession(startSession(s)); }} />
          )}
        </main>
      </div>
      {mini && <MiniGame id={mini.id} seed={mini.next.state.seed + mini.next.state.turn} onDone={(r) => endMini(r.score)} onSkip={() => endMini(null)} />}
    </I18nProvider>
  );
}
