import type { StageApi } from '../contracts';
import type { Overlay } from './overlay';

export interface TimelineOptions {
  duration: number;
  /** start here (seconds) and stay here: for screenshots */
  at?: number;
  /** 4x while the viewer holds the screen */
  fastForward?: boolean;
}

export interface Cue { at: number; run: () => void }

/** Fires the latest cue at or before the clock whenever it changes, so a jump lands in the right state. */
export function cueRunner(cues: readonly Cue[]): (c: number) => void {
  let done = -1;
  return (c) => {
    let latest = -1;
    cues.forEach((q, i) => { if (q.at <= c) latest = i; });
    if (latest > done) { done = latest; cues[latest].run(); }
  };
}

/**
 * One clock drives everything: frame(c, dt) must be a pure function of c, so skipping, 4x and jumping all just work.
 * Resolves when the clock reaches duration or the viewer skips; never when frozen with `at`.
 */
export async function runTimeline(stage: StageApi, ov: Overlay, o: TimelineOptions, frame: (c: number, dt: number) => void): Promise<void> {
  let c = o.at ?? 0;
  let stop = false;
  const run = stage.animate((_t, dt) => {
    if (stop) return true;
    if (o.at === undefined) c += dt * (o.fastForward && ov.fast() ? 4 : 1);
    frame(c, dt);
    return o.at === undefined && c >= o.duration;
  });
  await Promise.race([run, ov.skipped]);
  stop = true;
}
