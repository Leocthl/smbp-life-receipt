import { liveBus, type Bus } from './engine';
import { noise, tone } from './synth';

// Upbeat-chill ~108 BPM HK daytime city-pop / cozy pixel-sim groove on the music bus.
// Uses a jitter-free WebAudio lookahead scheduler so melodies, chords, bass, and light lo-fi percussion stay tight.

const STEP_SEC = 60 / 108 / 4; // 16th note at 108 BPM (~0.1389s)
const LOOKAHEAD_SEC = 0.22;
const TICK_MS = 85;
const STEPS_PER_BAR = 16;
const BARS = 8;

interface ChordBar {
  bass: number;
  fifth: number;
  leadIn: number;
  keys: readonly number[];
}

// Warm bright jazz-pop progression: Fmaj7 -> G6 -> Em7 -> Am7 -> Dm7 -> G9 -> Cmaj9 -> C6
const PROGRESSION: readonly ChordBar[] = [
  { bass: 87.31, fifth: 130.81, leadIn: 98.0, keys: [261.63, 329.63, 392.0, 440.0] },   // Fmaj7
  { bass: 98.0, fifth: 146.83, leadIn: 82.41, keys: [293.66, 329.63, 392.0, 493.88] },   // G6
  { bass: 82.41, fifth: 123.47, leadIn: 110.0, keys: [246.94, 293.66, 392.0, 493.88] },  // Em7
  { bass: 110.0, fifth: 164.81, leadIn: 98.0, keys: [261.63, 329.63, 392.0, 493.88] },   // Am9
  { bass: 73.42, fifth: 110.0, leadIn: 98.0, keys: [261.63, 329.63, 349.23, 440.0] },    // Dm9
  { bass: 98.0, fifth: 146.83, leadIn: 123.47, keys: [293.66, 349.23, 440.0, 493.88] },  // G9sus/13
  { bass: 65.41, fifth: 98.0, leadIn: 110.0, keys: [246.94, 293.66, 329.63, 392.0] },    // Cmaj9
  { bass: 65.41, fifth: 98.0, leadIn: 82.41, keys: [261.63, 329.63, 440.0, 523.25] },    // C6
];

// Cozy kalimba / marimba pentatonic hooks (C5, D5, E5, G5, A5, C6, D6, E6)
const PENTA_HZ = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
const MELODY_PHRASES: readonly (readonly (number | null)[])[] = [
  [4, null, 3, null, 2, null, 3, null, 4, null, 5, null, 3, null, null, null],
  [2, null, 3, 4, null, 3, 2, null, 1, null, 2, null, 0, null, null, null],
  [5, null, 4, null, 3, 4, 2, null, 3, null, 4, null, 5, null, 6, null],
  [4, null, 2, null, 3, null, 1, null, 2, null, 0, null, 1, null, 2, null],
];

let timer: number | undefined;
let nextTime = 0;
let stepIdx = 0;

function scheduleStep(b: Bus, step: number, at: number): void {
  const barIdx = Math.floor(step / STEPS_PER_BAR) % BARS;
  const s = step % STEPS_PER_BAR;
  const bar = PROGRESSION[barIdx];

  // 1. Warm Rhodes electric piano comping (syncopated upbeat bounce)
  if (s === 0 || s === 6 || s === 11) {
    const dur = s === 0 ? 0.62 : s === 6 ? 0.52 : 0.45;
    bar.keys.forEach((f, i) => {
      tone(b, {
        f,
        dur,
        type: i % 2 === 0 ? 'triangle' : 'sine',
        db: -18 - i * 1.1,
        at: at + i * 0.012,
        attack: 0.014,
        filter: 2200,
        detune: (i - 1.5) * 3,
        dest: 'music',
      });
    });
  }

  // 2. Groovy bouncy bassline (root on 1, octave/fifth bounce on offbeats, passing note into next bar)
  if (s === 0 || s === 6 || s === 8 || s === 14) {
    const f = s === 0 ? bar.bass : s === 6 ? bar.fifth : s === 8 ? bar.bass * 2 : bar.leadIn;
    const dur = s === 14 ? 0.22 : 0.34;
    tone(b, { f, dur, type: 'sine', db: -11, at, attack: 0.008, filter: 680, dest: 'music' });
    tone(b, { f: f * 2, dur: dur * 0.7, type: 'triangle', db: -24, at, attack: 0.008, filter: 900, dest: 'music' });
  }

  // 3. Cheerful kalimba/marimba melody on even phrases (with gentle breathing room on bar 4 & 8)
  const phrase = MELODY_PHRASES[barIdx % MELODY_PHRASES.length];
  const noteIdx = phrase[s];
  if (noteIdx !== null && !(barIdx % 4 === 3 && s >= 10)) {
    const f = PENTA_HZ[noteIdx];
    tone(b, { f, dur: 0.36, type: 'triangle', db: -15, at, attack: 0.005, filter: 3200, dest: 'music' });
    tone(b, { f: f * 2, dur: 0.14, type: 'sine', db: -29, at, attack: 0.004, dest: 'music' });
  }

  // 4. Light cozy lo-fi groove percussion (soft kick, swung hat, warm rim click)
  if (s === 0 || s === 10) {
    tone(b, { f: 118, to: 48, dur: 0.14, type: 'sine', db: -14, at, attack: 0.003, dest: 'music' });
  }
  if (s === 4 || s === 12) {
    tone(b, { f: 680, to: 420, dur: 0.045, type: 'triangle', db: -23, at, attack: 0.002, dest: 'music' });
    noise(b, { dur: 0.035, f: 2100, q: 1.5, db: -27, at, dest: 'music' });
  }
  if (s % 2 === 0) {
    const swing = s % 4 === 2 ? 0.014 : 0;
    const accent = s % 4 === 2 ? -25 : -30;
    noise(b, { dur: 0.024, f: 5400, q: 1.8, type: 'highpass', db: accent, at: at + swing, dest: 'music' });
  }
}

function pump(): void {
  const b = liveBus();
  if (!b) return;
  const now = b.ctx.currentTime;
  if (nextTime < now - 0.1 || nextTime > now + 2) nextTime = now + 0.04;
  while (nextTime < now + LOOKAHEAD_SEC) {
    scheduleStep(b, stepIdx, Math.max(0, nextTime - now));
    nextTime += STEP_SEC;
    stepIdx = (stepIdx + 1) % (STEPS_PER_BAR * BARS);
  }
}

export function startAmbient(): void {
  const b = liveBus();
  if (timer !== undefined || !b) return;
  nextTime = b.ctx.currentTime + 0.04;
  pump();
  timer = window.setInterval(pump, TICK_MS);
}

export function stopAmbient(): void {
  if (timer !== undefined) window.clearInterval(timer);
  timer = undefined;
}
