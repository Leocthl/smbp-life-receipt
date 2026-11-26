import { liveBus } from './engine';
import { tone } from './synth';

// A very quiet lo-fi pad: slow chords on the music bus (-30 dB). Stops when the tab hides or sound is muted.
const CHORDS = [[220, 261.63, 329.63, 392], [174.61, 220, 261.63, 329.63], [196, 246.94, 293.66, 349.23], [164.81, 207.65, 246.94, 329.63]];
const CHORD_MS = 6500;
let timer: number | undefined;
let step = 0;

function pad(): void {
  const b = liveBus();
  if (!b) return;
  CHORDS[step % CHORDS.length].forEach((f, i) => tone(b, { f, dur: 7.5, type: 'triangle', db: -14 - i, attack: 2, dest: 'music', wobble: 0.6 }));
  step += 1;
}

export function startAmbient(): void {
  if (timer !== undefined || !liveBus()) return;
  pad();
  timer = window.setInterval(pad, CHORD_MS);
}

export function stopAmbient(): void {
  if (timer !== undefined) window.clearInterval(timer);
  timer = undefined;
}
