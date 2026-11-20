import { useEffect, useRef, useState } from 'react';
import { newGame } from '../engine/sim';
import type { GameState } from '../engine/types';
import { translate, type Lang } from '../i18n';
import type { StageApi } from '../world3d/contracts';
import { worldFor } from '../world3d/descriptor';
import { createStage } from '../world3d/stage';
import './world.css';

let stub: GameState | null = null;
/** Before a life starts, show the neighbourhood an 18-year-old wakes up in. */
const preview = (): GameState => (stub ??= newGame(1));

interface Props { state: GameState | null; lang: Lang; onStage(stage: StageApi | null): void }

/** The walkable 3D world behind the game. One stage per life; it re-assembles itself whenever the life visibly changes. */
export function WorldBackdrop({ state, lang, onStage }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef({ state, lang });
  latest.current = { state, lang };
  const [stage, setStage] = useState<StageApi | null>(null);
  const [failed, setFailed] = useState(false);
  const seed = state?.seed ?? 1;

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    let made: StageApi;
    try {
      made = createStage(el, worldFor(latest.current.state ?? preview()), seed, { lang: latest.current.lang });
    } catch {
      setFailed(true); // no WebGL2 (or the context failed): the game still plays, on the plain backdrop
      return undefined;
    }
    setFailed(false);
    setStage(made);
    onStage(made);
    el.dataset.ready = '1';
    return () => {
      onStage(null);
      setStage(null);
      made.dispose();
      delete el.dataset.ready;
    };
  }, [seed, onStage]);

  useEffect(() => { stage?.setWorld(worldFor(state ?? preview())); }, [stage, state]);

  useEffect(() => {
    host.current?.querySelector('.ml-stage-joy')?.setAttribute('aria-label', translate(lang, 'stage.joy.label'));
  }, [stage, lang]);

  return (
    <>
      <div className="ml-world" ref={host} aria-hidden="true" data-failed={failed ? '1' : undefined} />
      {failed && <p className="ml-flow-notice" role="status">{translate(lang, 'stage.error.webgl')}</p>}
    </>
  );
}
