import { useEffect, useRef } from 'react';
import { Animator } from './animator';
import { drawMascot, H, W } from './draw';
import type { Emote } from './emotes';
import { drawFx } from './fx';
import './mascot.css';

const FRAME_MS = 33;

export interface MascotProps {
  emote: Emote;
  /** change this to replay the same emote's burst */
  emoteKey?: number | string;
  /** true while Slip is "printing" a line: the paper tongue moves */
  talking?: boolean;
  /** accessible description of the current mood */
  label: string;
  /** hold one pose (no idle motion), for contact sheets */
  still?: boolean;
  /** with still: show a frame of an idle animation */
  idleDemo?: 'yawn' | 'doodle';
  className?: string;
}

/** Slip, drawn as pixel art on a canvas and animated in code. Honours prefers-reduced-motion (static poses, blink only). */
export function Mascot({ emote, emoteKey, talking = false, label, still = false, idleDemo, className }: MascotProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const anim = useRef<Animator | null>(null);
  const first = useRef({ emote, talking });

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return undefined;
    ctx.imageSmoothingEnabled = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const now = performance.now();
    const a = new Animator(now, reduced, still);
    a.setEmote(first.current.emote, now);
    a.setTalking(first.current.talking, now);
    if (idleDemo) a.preview(idleDemo, now);
    anim.current = a;
    let raf = 0;
    let last = -FRAME_MS;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < FRAME_MS) return;
      last = t;
      const f = a.frame(t);
      drawMascot(ctx, f.pose);
      if (f.fx) drawFx(ctx, f.fx, f.fxT, f.pose.top - f.pose.lift);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); anim.current = null; };
  }, [still, idleDemo]);

  useEffect(() => { anim.current?.setEmote(emote, performance.now()); }, [emote, emoteKey]);
  useEffect(() => { anim.current?.setTalking(talking, performance.now()); }, [talking]);

  return <canvas ref={canvas} className={`ml-mascot ${className ?? ''}`} width={W} height={H} role="img" aria-label={label} data-emote={emote} />;
}
