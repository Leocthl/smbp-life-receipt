import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Lang } from '../i18n';
import type { StageApi } from '../world3d/contracts';
import { resolveWithMini } from './director/choice';
import { useCutscenes } from './director/useCutscenes';
import { isFasting, useFast } from './director/useFast';
import { useWalk } from './director/useWalk';
import { HexButton } from './HexPanel';
import { installAudio } from './audio';
import { haptic } from './juice/motion';
import { exitGhost } from './juice/slipExit';
import { Toasts } from './juice/Toasts';
import { useJuice } from './juice/useJuice';
import { usePrinterChatter, useWalkSounds } from './juice/useLiveFx';
import { HelpDialog } from './onboarding/HelpDialog';
import { HUD_STEP, Onboarding } from './onboarding/Onboarding';
import { useOnboarding } from './onboarding/useOnboarding';
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
import { SheetHandle } from './sheet/SheetHandle';
import { SheetFitContext } from './sheet/sheetFit';
import { useSheet } from './sheet/useSheet';
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
  // ?debug=1 lets e2e/camera.mjs read the camera; it is a no-op otherwise
  useEffect(() => { if (params.get('debug') === '1') (window as unknown as { __mlStage?: StageApi | null }).__mlStage = stage; }, [stage]);
  const fasting = isFasting(session);
  useFast(session, setSession);
  const walk = useWalk(stage, session, is3d && !fasting);
  const walkSkipped = useRef(false);
  const skipWalk = () => { walkSkipped.current = true; walk.skip(); };
  useWalkSounds(stage, walk.spot, walkSkipped);
  useEffect(() => installAudio(), []);
  usePrinterChatter(!fasting);
  const juice = useJuice(session, fasting);
  const onb = useOnboarding();
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
  // Slip's intro appears over the very first card of the first life (never under ?fast, never for test robots)
  useEffect(() => { if (screen.kind === 'card' && !fasting) onb.offer(); }, [screen.kind, fasting, onb.offer]);
  // key changes per screen so each new slip "prints" in
  const slipKey = session ? `${session.state.turn}-${session.index}-${screen.kind}` : 'start';
  const away = walk.spot !== null || cutting; // the slip steps aside for the walk or the film
  const stageRef = useRef<HTMLElement>(null);
  // when the slip changes, its cleanup runs after React has removed the old element but before anything else touches it: copy it for the exit fade
  useLayoutEffect(() => {
    const el = stageRef.current;
    return () => { if (el && !el.isConnected) exitGhost(el); };
  }, [slipKey]);
  const sheet = useSheet(stageRef, screen.kind !== 'start' && !away, slipKey, walk.spot !== null); // phone: the slip is a bottom sheet you can drag
  useEffect(() => {
    // each slip starts at the top; keyboard and screen-reader focus moves to it unless a button grabbed it
    window.scrollTo(0, 0);
    if (!stageRef.current?.contains(document.activeElement)) stageRef.current?.focus({ preventScroll: true });
  }, [slipKey, away]);

  const toggleLang = () => setLang(lang === 'zh' ? 'en' : 'zh');
  const onChoose = (id: string) => {
    if (!session) return;
    haptic(10);
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
      <Hud state={playing?.state} hexSlot={playing && <HexButton session={playing} />} onLang={toggleLang} onHelp={onb.openHelp} away={cutting} spotlight={onb.panel === 'intro' && onb.step === HUD_STEP} />
      {walk.spot && <WalkPrompt spot={walk.spot} onSkip={skipWalk} />}
      <Toasts toasts={juice.toasts} onDone={juice.dismiss} />
      <div className="ml-app">
        <main
          className="ml-stage" key={slipKey} data-slip={slipKey} ref={stageRef} tabIndex={-1} hidden={away}
          data-sheet={sheet.on ? '1' : undefined} data-snap={sheet.on ? sheet.snap : undefined} {...sheet.bind}
        >
          {sheet.on && <SheetHandle sheet={sheet} />}
          <SheetFitContext.Provider value={sheet.fit}>
          {!away && screen.kind === 'start' && <StartScreen seed={seed} onStart={() => setSession(startSession(seed))} />}
          {!away && session && screen.kind === 'intro' && <IntroScreen state={session.state} onGo={() => setSession(beginTurn(session))} />}
          {!away && session && screen.kind === 'card' && <CardScreen state={session.state} card={screen.card} onChoose={onChoose} />}
          {!away && session && screen.kind === 'result' && <ResultScreen state={session.state} card={screen.card} result={screen.result} entry={session.trail[session.trail.length - 1]} onNext={() => setSession(advance(session))} />}
          {!away && session && screen.kind === 'summary' && <SummaryScreen state={session.state} summary={screen.summary} onNext={() => setSession(afterSummary(session))} />}
          {!away && session && screen.kind === 'goal' && <GoalScreen onPick={(g) => setSession(pickGoal(session, g))} />}
          {!away && session && screen.kind === 'ending' && (
            <EndingScreen state={session.state} goal={screen.goal} onAgain={() => { const s = randomSeed(); setSeed(s); setSession(startSession(s)); }} />
          )}
          </SheetFitContext.Provider>
        </main>
      </div>
      {onb.panel === 'intro' && <Onboarding step={onb.step} onStep={onb.setStep} onDone={onb.finish} />}
      {onb.panel === 'help' && <HelpDialog onClose={onb.closeHelp} onReplay={onb.replay} />}
      {mini && <MiniGame id={mini.id} seed={mini.next.state.seed + mini.next.state.turn} onDone={(r) => endMini(r.score)} onSkip={() => endMini(null)} />}
    </I18nProvider>
  );
}
