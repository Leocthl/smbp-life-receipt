import type { ComponentType } from 'react';
import type { Lang } from '../../i18n';

export type MiniGameId = 'budget' | 'hold' | 'compare';

export interface MiniGameResult {
  score: number;
  summaryKey: string;
  vars?: Record<string, number>;
}

export interface MiniGameProps {
  id: MiniGameId;
  seed: number;
  onDone(result: MiniGameResult): void;
  onSkip(): void;
}

/** One frame of player input. \`pick\` is consumed after each step. */
export interface Input {
  axis: number;
  target: number | null;
  hold: boolean;
  pick: number | null;
}

export const NO_INPUT: Input = { axis: 0, target: null, hold: false, pick: null };

/** Art canvas size in art pixels; CSS scales it up with pixelated sampling. */
export const ART_W = 120;
export const ART_H = 180;

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export interface OverlayProps<S> {
  s: S;
  lang: Lang;
  send(patch: Partial<Input>): void;
}

/** A mini-game: pure sim functions plus a canvas drawer and a DOM overlay for words and buttons. */
export interface GameDef<S> {
  id: MiniGameId;
  init(seed: number): S;
  step(s: S, input: Input, dt: number): S;
  over(s: S): boolean;
  draw(ctx: CanvasRenderingContext2D, s: S, t: number): void;
  result(s: S): MiniGameResult;
  auto(s: S): Input;
  Overlay: ComponentType<OverlayProps<S>>;
}
