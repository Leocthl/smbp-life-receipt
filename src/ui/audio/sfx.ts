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
  // paper printer: a short rasp plus a tiny square blip, pitch wobbling so it never sounds looped
  printer: (b) => {
    noise(b, { dur: 0.03, f: 2600 * jitter(2), q: 2, db: -16 });
    tone(b, { f: 1500 * jitter(3), dur: 0.02, type: 'square', db: -30 });
  },
  click: (b) => tone(b, { f: 920 * jitter(1), to: 640, dur: 0.05, type: 'triangle', db: -14 }),
  // arg: money moved. Up is a bright rising ka-ching, down a soft falling two-note; bigger moves reach higher
  kaching: (b, arg) => {
    const size = Math.min(1, Math.log10(Math.abs(arg) + 10) / 5.5);
    if (arg >= 0) {
      const base = 1175 * semitones(size * 7);
      tone(b, { f: base, dur: 0.12, type: 'triangle', db: -13 });
      tone(b, { f: base * 1.5, dur: 0.38, type: 'sine', db: -12, at: 0.07 });
      tone(b, { f: base * 3.01, dur: 0.22, type: 'sine', db: -24, at: 0.07 });
      noise(b, { dur: 0.05, f: 6000, q: 0.8, db: -22 });
    } else {
      const base = 392 * semitones(size * 3);
      tone(b, { f: base, to: base * 0.96, dur: 0.16, type: 'triangle', db: -13 });
      tone(b, { f: base * 0.75, to: base * 0.7, dur: 0.34, type: 'triangle', db: -13, at: 0.1 });
    }
  },
  // arg: -1 falling, +1 rising (money ticking down or up)
  coin: (b, arg) => tone(b, { f: (arg >= 0 ? 1900 : 1500) * jitter(1.5), dur: 0.05, type: 'sine', db: -20 }),
  chirpHappy: (b) => {
    tone(b, { f: 660, to: 880, dur: 0.1, type: 'sine', db: -14 });
    tone(b, { f: 880, to: 1180, dur: 0.14, type: 'sine', db: -14, at: 0.1 });
  },
  chirpWorried: (b) => {
    tone(b, { f: 440, to: 350, dur: 0.22, type: 'triangle', db: -13, wobble: 9 });
    tone(b, { f: 370, to: 290, dur: 0.3, type: 'triangle', db: -14, at: 0.2, wobble: 9 });
  },
  // a small bell: three partials per note, an arpeggio up
  yearEnd: (b) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const at = i * 0.11;
      tone(b, { f, dur: 1.1, db: -15, at });
      tone(b, { f: f * 2.76, dur: 0.5, db: -28, at });
      tone(b, { f: f * 5.4, dur: 0.25, db: -34, at });
    });
  },
  // arg 0 triumph, 1 warm, 2 wry
  fanfare: (b, arg) => {
    const chords = [
      [[523.25, 659.25, 783.99, 1046.5], [587.33, 739.99, 880, 1174.7], [659.25, 783.99, 987.77, 1318.5]],
      [[392, 493.88, 587.33, 783.99], [440, 523.25, 659.25, 880]],
      [[440, 523.25, 659.25], [392, 466.16, 587.33], [329.63, 392, 493.88]],
    ][arg] ?? [];
    chords.forEach((notes, i) => notes.forEach((f) => tone(b, { f, dur: arg === 0 ? 0.5 : 0.8, type: arg === 0 ? 'square' : 'triangle', db: arg === 0 ? -26 : -18, at: i * 0.22, attack: 0.02 })));
    if (arg === 0) tone(b, { f: 1568, dur: 1.2, db: -20, at: chords.length * 0.22 });
  },
  step: (b) => {
    noise(b, { dur: 0.06, f: 700 * jitter(3), q: 0.7, type: 'lowpass', db: -18 });
    tone(b, { f: 130 * jitter(2), to: 90, dur: 0.05, db: -22 });
  },
  sparkle: (b) => {
    for (let i = 0; i < 4; i += 1) tone(b, { f: 1318 * semitones(PENTA[Math.floor(Math.random() * PENTA.length)]), dur: 0.18, db: -22, at: i * 0.045 });
  },
  milestone: (b) => {
    [784, 988, 1175, 1568].forEach((f, i) => tone(b, { f, dur: 0.4, type: 'triangle', db: -17, at: i * 0.08 }));
    tone(b, { f: 3136, dur: 0.6, db: -28, at: 0.3 });
  },
};

/** Play a named sound. Silent before the first tap, while muted, or when the limiter says it is too soon. */
export function play(name: SfxName, arg = 0): void {
  const b = liveBus();
  if (!b || !limiter.allow(name, performance.now())) return;
  RECIPES[name](b, arg);
}

export const playFanfare = (tone_: EndingTone): void => play('fanfare', tone_ === 'triumph' ? 0 : tone_ === 'warm' ? 1 : 2);
