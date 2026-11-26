// Pure audio helpers: no window, no AudioContext, so they are unit-testable.

/** Decibels to linear gain; -Infinity (or anything at or below -80 dB) is silence. */
export function dbToGain(db: number): number {
  return db <= -80 ? 0 : 10 ** (db / 20);
}

/** Semitone offset to a frequency ratio (for pitch variation and the pentatonic sparkle). */
export const semitones = (n: number): number => 2 ** (n / 12);

export interface LimiterRules {
  /** minimum ms between two plays of the same sound */
  gap: Readonly<Record<string, number>>;
  /** fallback gap for sounds not listed */
  defaultGap: number;
  /** at most `max` sounds of any kind inside `windowMs` */
  max: number;
  windowMs: number;
}

/**
 * Sound-spam guard: a per-sound cooldown plus a global cap per time window.
 * `allow(name, nowMs)` answers yes or no and records the play when yes.
 */
export function makeRateLimiter(rules: LimiterRules) {
  const last = new Map<string, number>();
  let recent: number[] = [];
  return {
    allow(name: string, nowMs: number): boolean {
      const prev = last.get(name);
      if (prev !== undefined && nowMs - prev < (rules.gap[name] ?? rules.defaultGap)) return false;
      recent = recent.filter((t) => nowMs - t < rules.windowMs);
      if (recent.length >= rules.max) return false;
      last.set(name, nowMs);
      recent.push(nowMs);
      return true;
    },
    reset(): void {
      last.clear();
      recent = [];
    },
  };
}
