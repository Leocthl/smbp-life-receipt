import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import type { Lang } from '../../i18n';
import { miniText } from './text';
import { ART_H, ART_W, NO_INPUT, clamp, type GameDef, type Input, type MiniGameResult } from './types';

// Runs one mini-game: a rAF loop that steps the sim and draws the canvas, plus keyboard and pointer input.
// The canvas stays drawn behind the intro and result cards, which arrive as children.

const REDUCED_SPEED = 0.6;
const MAX_DT = 0.05;
const TICK_MS = 100;

export interface RunnerProps<S> {
  def: GameDef<S>;
  seed: number;
  lang: Lang;
  running: boolean;
  auto: boolean;
  reduced: boolean;
  onFinish(r: MiniGameResult): void;
  children?: ReactNode;
}

function useKeys(send: (patch: Partial<Input>) => void): void {
  useEffect(() => {
    const axisOf = (key: string) => (key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : 0);
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space') send({ hold: true });
      const axis = axisOf(e.key);
      if (axis !== 0) send({ axis });
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') send({ hold: false });
      if (axisOf(e.key) !== 0) send({ axis: 0 });
    };
    const onBlur = () => send({ hold: false, axis: 0, target: null });
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [send]);
}

export function Runner<S>(props: RunnerProps<S>) {
  const { def, seed, lang, running, children } = props;
  const [init] = useState(() => def.init(seed));
  const stateRef = useRef<S>(init);
  const inputRef = useRef<Input>(NO_INPUT);
  const cfgRef = useRef(props);
  cfgRef.current = props;
  const [hud, setHud] = useState<S>(init);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const send = useCallback((patch: Partial<Input>) => {
    inputRef.current = { ...inputRef.current, ...patch };
  }, []);
  useKeys(send);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;
    canvas.width = ART_W;
    canvas.height = ART_H;
    ctx.imageSmoothingEnabled = false;
    let alive = true;
    let raf = 0;
    let last = performance.now();
    let tickAt = 0;
    const frame = (now: number) => {
      if (!alive) return;
      const cfg = cfgRef.current;
      const dt = clamp((now - last) / 1000, 0, MAX_DT) * (cfg.reduced ? REDUCED_SPEED : 1);
      last = now;
      const prev = stateRef.current;
      const s = cfg.running ? cfg.def.step(prev, cfg.auto ? cfg.def.auto(prev) : inputRef.current, dt) : prev;
      if (cfg.running) inputRef.current = { ...inputRef.current, pick: null };
      stateRef.current = s;
      cfg.def.draw(ctx, s, now / 1000);
      canvas.dataset.drawn = '1';
      if (now - tickAt >= TICK_MS) {
        tickAt = now;
        setHud(s);
      }
      if (cfg.running && cfg.def.over(s)) {
        alive = false;
        setHud(s);
        cfg.onFinish(cfg.def.result(s));
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const aim = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    send({ target: clamp((e.clientX - r.left) / r.width, 0, 1) });
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    aim(e);
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 0) aim(e);
  };
  const up = () => send({ target: null });

  return (
    <>
      <div className="ml-mini__canvasWrap">
        <canvas
          ref={canvasRef}
          className="ml-mini__canvas"
          role="img"
          aria-label={miniText(lang, 'mini.' + def.id + '.title')}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
        {children}
      </div>
      {running && <def.Overlay s={hud} lang={lang} send={send} />}
    </>
  );
}
