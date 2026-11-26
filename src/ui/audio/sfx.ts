import { liveBus } from './engine';
import { makeRateLimiter, semitones } from './pure';
import { noise, tone } from './synth';

export type EndingTone = 'triumph' | 'warm' | 'wry';
export type SfxName = 'printer' | 'click' | 'kaching' | 'coin' | 'chirpHappy' | 'chirpWorried' | 'yearEnd' | 'fanfare' | 'step' | 'sparkle' | 'milestone';

// One limiter for the whole game: per-sound cooldowns, and at most 14 sounds a second in any mix.
const limiter = makeRateLimiter({
  gap: { printer: 55, click: 70, kaching: 250, coin: 60, chirpHappy: 600, chirpWorried: 600, yearEnd: 1500, fanfare: 3000, step: 150, sparkle: 400, milestone: 1500 },
  defaultGap: 100,
  max: 14,
  windowMs: 1000,
});
const jitter = (spread: number) => semitones((Math.random() * 2 - 1) * spread);
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];

const RECIPES: Record<SfxName, (b: NonNullable<ReturnType<typeof liveBus>>, arg: number) => void> = {
  // crisp thermal receipt zip
  printer: (b) => {
    noise(b, { dur: 0.026, f: 3000 * jitter(1.5), q: 1.8, db: -17 });
    tone(b, { f: 1620 * jitter(2), dur: 0.022, type: 'triangle', db: -26 });
  },
  // tactile marimba-key pop
  click: (b) => {
    const f = 820 * jitter(0.8);
    tone(b, { f, to: f * 0.72, dur: 0.055, type: 'triangle', db: -13, filter: 2800 });
    tone(b, { f: f * 1.5, dur: 0.03, type: 'sine', db: -24 });
  },
  // arg: money moved. Up is a crisp major-9th ka-ching chime; down is a gentle warm marimba drop
  kaching: (b, arg) => {
    const size = Math.min(1, Math.log10(Math.abs(arg) + 10) / 5.5);
    if (arg >= 0) {
      const base = 1046.5 * semitones(size * 5);
      tone(b, { f: base, dur: 0.14, type: 'triangle', db: -13 });
      tone(b, { f: base * 1.25, dur: 0.2, type: 'sine', db: -15, at: 0.055 });
      tone(b, { f: base * 1.5, dur: 0.42, type: 'sine', db: -11, at: 0.11 });
      tone(b, { f: base * 2.25, dur: 0.28, type: 'sine', db: -23, at: 0.13 });
      noise(b, { dur: 0.045, f: 6400, q: 0.9, db: -22 });
    } else {
      const base = 440 * semitones(size * 2);
      tone(b, { f: base, to: base * 0.92, dur: 0.15, type: 'triangle', db: -13, filter: 1800 });
      tone(b, { f: base * 0.75, to: base * 0.67, dur: 0.3, type: 'triangle', db: -13, at: 0.09, filter: 1500 });
    }
  },
  // arg: -1 falling, +1 rising (money ticking down or up)
  coin: (b, arg) => tone(b, { f: (arg >= 0 ? 1760 : 1318) * jitter(1.2), dur: 0.055, type: 'sine', db: -19 }),
  chirpHappy: (b) => {
    tone(b, { f: 659.25, to: 880, dur: 0.09, type: 'triangle', db: -14 });
    tone(b, { f: 987.77, to: 1318.5, dur: 0.14, type: 'sine', db: -13, at: 0.085 });
  },
  chirpWorried: (b) => {
    tone(b, { f: 440, to: 370, dur: 0.18, type: 'triangle', db: -14, wobble: 6, filter: 1800 });
    tone(b, { f: 349.23, to: 293.66, dur: 0.26, type: 'triangle', db: -15, at: 0.16, wobble: 6, filter: 1600 });
  },
  // warm celebratory chime arpeggio
  yearEnd: (b) => {
    [523.25, 659.25, 783.99, 987.77, 1318.5].forEach((f, i) => {
      const at = i * 0.09;
      tone(b, { f, dur: 0.9, type: 'triangle', db: -15, at, filter: 3800 });
      tone(b, { f: f * 2, dur: 0.45, type: 'sine', db: -27, at });
    });
  },
  // arg 0 triumph, 1 warm, 2 wry
  fanfare: (b, arg) => {
    const chords = [
      [[523.25, 659.25, 783.99, 987.77], [587.33, 739.99, 880, 1174.7], [659.25, 783.99, 987.77, 1318.5]],
      [[392, 493.88, 587.33, 783.99], [440, 523.25, 659.25, 880], [523.25, 659.25, 783.99, 1046.5]],
      [[440, 523.25, 659.25], [392, 493.88, 587.33], [349.23, 440, 523.25, 659.25]],
    ][arg] ?? [];
    chords.forEach((notes, i) =>
      notes.forEach((f, j) =>
        tone(b, {
          f,
          dur: arg === 0 ? 0.55 : 0.78,
          type: j % 2 === 0 ? 'triangle' : 'sine',
          db: arg === 0 ? -17 : -16,
          at: i * 0.2 + j * 0.015,
          attack: 0.016,
          filter: 3400,
        }),
      ),
    );
    if (arg === 0) tone(b, { f: 1567.98, dur: 1.1, type: 'sine', db: -18, at: chords.length * 0.2 });
  },
  // soft upbeat sneaker tap
  step: (b) => {
    noise(b, { dur: 0.045, f: 900 * jitter(2.5), q: 0.8, type: 'lowpass', db: -20 });
    tone(b, { f: 165 * jitter(1.5), to: 105, dur: 0.045, db: -22 });
  },
  sparkle: (b) => {
    for (let i = 0; i < 4; i += 1) {
      tone(b, { f: 1174.66 * semitones(PENTA[Math.floor(Math.random() * PENTA.length)]), dur: 0.2, type: 'sine', db: -20, at: i * 0.045 });
    }
  },
  milestone: (b) => {
    [659.25, 783.99, 987.77, 1318.51, 1567.98].forEach((f, i) =>
      tone(b, { f, dur: 0.45, type: 'triangle', db: -16, at: i * 0.075, filter: 3800 }),
    );
  },
};

/** Play a named sound. Silent before the first tap, while muted, or when the limiter says it is too soon. */
export function play(name: SfxName, arg = 0): void {
  const b = liveBus();
  if (!b || !limiter.allow(name, performance.now())) return;
  RECIPES[name](b, arg);
}

export const playFanfare = (tone_: EndingTone): void => play('fanfare', tone_ === 'triumph' ? 0 : tone_ === 'warm' ? 1 : 2);
