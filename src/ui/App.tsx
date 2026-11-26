import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Lang } from '../i18n';
import type { ReactionKind, SpotId, StageApi } from '../world3d/contracts';
import { isLoopingScope } from '../world3d/controls';
import { scopeFor } from '../world3d/descriptor';
import { generateYearOpportunities, type CityPin } from '../engine/cityHub';
import { generateDynamicEvent, type DynamicEvent, type DynamicResult } from '../engine/procedural';
import type { FreeActionOption, FreeActionResult, FreeSpotKey } from '../engine/freeChoice';
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
import { DynamicCardView, FreeActionModal } from './screens/FreeActionModal';
import { ResultScreen } from './screens/ResultScreen';
import { IntroScreen, StartScreen } from './screens/StartScreens';
import { SummaryScreen } from './screens/SummaryScreen';
import { WalkPrompt } from './WalkPrompt';
import { WorldBackdrop } from './WorldBackdrop';
import { GoalScreen } from './screens/GoalScreen';
import { SheetHandle } from './sheet/SheetHandle';
import { SheetFitContext } from './sheet/sheetFit';
import { useSheet } from './sheet/useSheet';
import {
  advance,
  afterSummary,
  applyMiniScore,
  applySessionBonusDynamic,
  applySessionFreeAction,
  beginTurn,
  chooseDynamic,
  pickGoal,
  startSession,
  type Session,
} from './session';

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
  const [freeRoam, setFreeRoam] = useState(false);
  const [activeSpot, setActiveSpot] = useState<FreeSpotKey | null>(null);
  const [freeResult, setFreeResult] = useState<FreeActionResult | null>(null);
  const [bonusDyn, setBonusDyn] = useState<{ event: DynamicEvent; result: DynamicResult | null } | null>(null);
  const [visitedSpots, setVisitedSpots] = useState<SpotId[]>([]);
  const [unlockToast, setUnlockToast] = useState(false);
  const prevScopeRef = useRef<string | null>(null);
  const pinWalkTokenRef = useRef(0);
  const bonusSpotRef = useRef<SpotId | null>(null);
  const sessionRef = useRef<Session | null>(session);
  sessionRef.current = session;
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
  const screen = session?.screen ?? { kind: 'start' as const };
  const scope = session ? scopeFor(session.state) : 'room';
  const canExplore = Boolean(
    is3d &&
      session &&
      !cutting &&
      !fasting &&
      walk.spot === null &&
      isLoopingScope(scope) &&
      (screen.kind === 'card' || screen.kind === 'dynamic' || screen.kind === 'summary'),
  );

  // Reset visited spots each new turn so fresh yearly pins regenerate cleanly.
  const turn = session?.state.turn ?? -1;
  useEffect(() => {
    setVisitedSpots([]);
    bonusSpotRef.current = null;
  }, [turn]);

  const cityPins = useMemo<CityPin[]>(
    () => (session && isLoopingScope(scope) ? generateYearOpportunities(session.state, scope, visitedSpots, session.dynNonce) : []),
    [session, scope, visitedSpots],
  );
  const unvisitedPinCount = useMemo(() => cityPins.filter((p) => !p.visited).length, [cityPins]);

  useEffect(() => {
    stage?.setCityPins(canExplore && !activeSpot && !bonusDyn ? cityPins : []);
  }, [stage, canExplore, activeSpot, bonusDyn, cityPins]);

  // Exit free roam automatically if the story moves to a non-explorable phase or asks for a walk
  useEffect(() => {
    if (!canExplore && freeRoam) {
      setFreeRoam(false);
      setActiveSpot(null);
      setFreeResult(null);
      setBonusDyn(null);
    }
  }, [canExplore, freeRoam]);

  // Show a non-blocking celebration banner when the player graduates from room/flat into the open looping city
  useEffect(() => {
    if (!session || screen.kind === 'goal' || screen.kind === 'ending') {
      if (!session) prevScopeRef.current = null;
      setUnlockToast(false);
      return;
    }
    const prev = prevScopeRef.current;
    prevScopeRef.current = scope;
    if (prev && (prev === 'room' || prev === 'home') && isLoopingScope(scope) && !fasting) {
      setUnlockToast(true);
    }
  }, [session, scope, fasting, screen.kind]);

  useEffect(() => {
    if (!unlockToast) return undefined;
    const id = window.setTimeout(() => setUnlockToast(false), 4200);
    return () => window.clearTimeout(id);
  }, [unlockToast]);

  // Walking is active while a decision asks for a walk, or during free-roam exploration (with no modal open)
  useEffect(() => {
    const roamWalk = freeRoam && !activeSpot && !bonusDyn;
    stage?.setControls(walk.spot !== null || roamWalk);
    stage?.setFreeRoam(roamWalk);
  }, [stage, walk.spot, cutting, freeRoam, activeSpot, bonusDyn]);

  useEffect(() => {
    if (!stage) return undefined;
    stage.onSpotEnter((spot) => {
      setActiveSpot(spot.id);
      setFreeResult(null);
    });
    stage.onPinSelect((pin) => {
      const token = ++pinWalkTokenRef.current;
      bonusSpotRef.current = null;
      setFreeRoam(true);
      setActiveSpot(null);
      setFreeResult(null);
      setBonusDyn(null);
      void stage
        .walkTo(pin.spot)
        .then(() => {
          if (pinWalkTokenRef.current !== token) return;
          const cur = sessionRef.current;
          if (!cur) return;
          if (pin.kind === 'encounter' && cur.freeActionsLeft > 0) {
            bonusSpotRef.current = pin.spot;
            setBonusDyn({ event: generateDynamicEvent(cur.state, cur.dynNonce + 101), result: null });
            return;
          }
          setActiveSpot(pin.spot);
          setFreeResult(null);
        })
        .catch(() => {
          // walk superseded or cancelled
        });
    });
    return () => {
      stage.onSpotEnter(null);
      stage.onPinSelect(null);
    };
  }, [stage]);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-HK' : 'en';
    document.title = i18n.t('app.title');
    try {
      localStorage.setItem('ml-lang', lang);
    } catch {
      // storage blocked: the choice just won't be remembered
    }
  }, [lang, i18n]);

  // Slip's intro appears over the very first card of the first life (never under ?fast, never for test robots)
  useEffect(() => { if (screen.kind === 'card' && !fasting) onb.offer(); }, [screen.kind, fasting, onb.offer]);
  // key changes per screen so each new slip "prints" in (always ending in -card or -result for dynamic events)
  const slipKind = bonusDyn
    ? `free-dyn-${bonusDyn.event.id}-${bonusDyn.result ? 'result' : 'card'}`
    : activeSpot
      ? `free-${activeSpot}-${freeResult ? 'result' : 'modal'}`
      : screen.kind === 'dynamic'
        ? `dyn-${screen.event.id}-${screen.result ? 'result' : 'card'}`
        : screen.kind;
  const slipKey = session ? `${session.state.turn}-${session.index}-${slipKind}` : 'start';
  const away = walk.spot !== null || cutting || (freeRoam && !activeSpot && !bonusDyn); // the slip steps aside for the walk, film, or open-world roaming
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

  const reactToDelta = (cashDelta: number, happyDelta: number) => {
    if (!stage) return;
    let kind: ReactionKind | null = null;
    if (cashDelta >= 1_000 && happyDelta >= 0) kind = 'cash';
    else if (happyDelta > 0 || cashDelta > 0) kind = 'happy';
    else if (happyDelta < 0 || cashDelta <= -4_000) kind = 'worry';
    if (kind) stage.react(kind);
  };

  const toggleLang = () => setLang(lang === 'zh' ? 'en' : 'zh');
  const onChoose = (id: string) => {
    if (!session) return;
    haptic(10);
    const { next, mini: game } = resolveWithMini(session, id, minisOn && !fasting);
    reactToDelta(next.state.cash - session.state.cash, next.state.happiness - session.state.happiness);
    if (game) setMini({ id: game, next });
    else setSession(next);
  };
  const endMini = (score: number | null) => {
    if (!mini) return;
    setSession(score === null ? mini.next : applyMiniScore(mini.next, score));
    setMini(null);
  };
  const playing = session && screen.kind !== 'start' && screen.kind !== 'intro' ? session : null;
  const openMystery = () => {
    if (!session || session.freeActionsLeft <= 0) return;
    setActiveSpot(null);
    setFreeResult(null);
    setBonusDyn({ event: generateDynamicEvent(session.state, session.dynNonce + 101), result: null });
  };
  const markVisited = (spot: SpotId) => {
    setVisitedSpots((prev) => (prev.includes(spot) ? prev : [...prev, spot]));
  };
  const onPickFree = (option: FreeActionOption, customAmount?: number) => {
    if (!session) return;
    haptic(10);
    if (option.triggersMystery) {
      openMystery();
      return;
    }
    const { session: nextSession, result } = applySessionFreeAction(session, option, customAmount);
    setSession(nextSession);
    setFreeResult(result);
    reactToDelta(result.delta.cash, result.delta.happiness);
    if (option.spot !== 'mystery') markVisited(option.spot);
  };
  const onChooseBonusDyn = (choiceId: string) => {
    if (!session || !bonusDyn) return;
    haptic(10);
    const { session: nextSession, result } = applySessionBonusDynamic(session, bonusDyn.event, choiceId);
    setSession(nextSession);
    setBonusDyn({ event: bonusDyn.event, result });
    reactToDelta(result.delta.cash, result.delta.happiness);
    if (bonusSpotRef.current) {
      markVisited(bonusSpotRef.current);
      bonusSpotRef.current = null;
    }
  };

  return (
    <I18nProvider value={i18n}>
      {is3d && <WorldBackdrop state={session?.state ?? null} lang={lang} onStage={setStage} />}
      <Hud state={playing?.state} hexSlot={playing && <HexButton session={playing} />} onLang={toggleLang} onHelp={onb.openHelp} away={cutting} spotlight={onb.panel === 'intro' && onb.step === HUD_STEP} />
      {walk.spot && <WalkPrompt spot={walk.spot} onSkip={skipWalk} />}
      {unlockToast && <p className="ml-unlock-toast" role="status">{i18n.t('world.unlockedToast')}</p>}
      {canExplore && !freeRoam && (
        <button
          type="button"
          className="ml-btn ml-explore-btn"
          data-testid="explore-btn"
          onClick={() => { setFreeRoam(true); setActiveSpot(null); setFreeResult(null); setBonusDyn(null); }}
        >
          {unvisitedPinCount > 0 ? i18n.t('hub.openCity', { n: unvisitedPinCount }) : i18n.t('world.explore')}
        </button>
      )}
      {freeRoam && !activeSpot && !bonusDyn && session && (
        <section className="ml-free-bar" data-testid="free-bar" aria-live="polite">
          <div className="ml-free-bar__copy">
            <p className="ml-free-bar__title">{i18n.t('world.exploreBanner')}</p>
            <p className="ml-free-bar__quota">{session.freeActionsLeft > 0 ? i18n.t('world.freeLeft', { n: session.freeActionsLeft }) : i18n.t('world.freeDone')}</p>
          </div>
          <div className="ml-free-bar__actions">
            <button
              type="button"
              className="ml-btn ml-btn--primary"
              data-testid="mystery-btn"
              disabled={session.freeActionsLeft <= 0}
              onClick={openMystery}
            >
              {i18n.t('world.mysteryBtn')}
            </button>
            <button
              type="button"
              className="ml-btn"
              data-testid="explore-stop"
              onClick={() => { setFreeRoam(false); setActiveSpot(null); setFreeResult(null); setBonusDyn(null); }}
            >
              {i18n.t('world.exploreStop')}
            </button>
          </div>
        </section>
      )}
      <Toasts toasts={juice.toasts} onDone={juice.dismiss} />
      <div className="ml-app">
        <main
          className="ml-stage" key={slipKey} data-slip={slipKey} ref={stageRef} tabIndex={-1} hidden={away}
          data-sheet={sheet.on ? '1' : undefined} data-snap={sheet.on ? sheet.snap : undefined} {...sheet.bind}
        >
          {sheet.on && <SheetHandle sheet={sheet} />}
          <SheetFitContext.Provider value={sheet.fit}>
          {!away && freeRoam && bonusDyn && session && (
            <DynamicCardView
              state={session.state}
              event={bonusDyn.event}
              result={bonusDyn.result}
              onChoose={onChooseBonusDyn}
              onNext={() => setBonusDyn(null)}
            />
          )}
          {!away && freeRoam && !bonusDyn && activeSpot && session && (
            <FreeActionModal
              state={session.state}
              spot={activeSpot}
              result={freeResult}
              remaining={session.freeActionsLeft}
              onPick={onPickFree}
              onClose={() => { setActiveSpot(null); setFreeResult(null); }}
            />
          )}
          {!away && !freeRoam && screen.kind === 'start' && <StartScreen seed={seed} onStart={() => setSession(startSession(seed))} />}
          {!away && !freeRoam && session && screen.kind === 'intro' && <IntroScreen state={session.state} onGo={() => setSession(beginTurn(session))} />}
          {!away && !freeRoam && session && screen.kind === 'card' && <CardScreen state={session.state} card={screen.card} onChoose={onChoose} />}
          {!away && !freeRoam && session && screen.kind === 'dynamic' && (
            <DynamicCardView
              state={session.state}
              event={screen.event}
              result={screen.result}
              onChoose={(id) => {
                haptic(10);
                const next = chooseDynamic(session, id);
                reactToDelta(next.state.cash - session.state.cash, next.state.happiness - session.state.happiness);
                setSession(next);
              }}
              onNext={() => setSession(advance(session))}
            />
          )}
          {!away && !freeRoam && session && screen.kind === 'result' && <ResultScreen state={session.state} card={screen.card} result={screen.result} entry={session.trail[session.trail.length - 1]} onNext={() => setSession(advance(session))} />}
          {!away && !freeRoam && session && screen.kind === 'summary' && <SummaryScreen state={session.state} summary={screen.summary} fromAge={screen.fromAge} skippedYears={screen.skippedYears} onNext={() => setSession(afterSummary(session))} />}
          {!away && !freeRoam && session && screen.kind === 'goal' && <GoalScreen onPick={(g) => setSession(pickGoal(session, g))} />}
          {!away && !freeRoam && session && screen.kind === 'ending' && (
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
