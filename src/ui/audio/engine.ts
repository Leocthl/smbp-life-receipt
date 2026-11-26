import { dbToGain } from './pure';
import { isMuted } from './store';

// The mixer: sfx and music buses into one master gain into a gentle limiter. Created on the first user gesture only
// (browsers, iOS above all, keep a context made earlier suspended).

export interface Bus { ctx: AudioContext; sfx: GainNode; music: GainNode; master: GainNode; noise: AudioBuffer }

const MASTER_DB = -3;
const SFX_DB = -6;
const MUSIC_DB = -30; // the ambient pad is felt more than heard
let bus: Bus | null = null;
let unlocked = false;

function build(): Bus | null {
  const Ctor: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  const master = ctx.createGain();
  const sfx = ctx.createGain();
  const music = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor(); // near-brickwall: stacked sounds never clip
  limiter.threshold.value = -8;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.12;
  sfx.gain.value = dbToGain(SFX_DB);
  music.gain.value = dbToGain(MUSIC_DB);
  master.gain.value = isMuted() ? 0 : dbToGain(MASTER_DB);
  sfx.connect(master);
  music.connect(master);
  master.connect(limiter);
  limiter.connect(ctx.destination);
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return { ctx, sfx, music, master, noise };
}

/** Call from a user gesture. Safe to call again and again. */
export function unlock(): void {
  unlocked = true;
  try {
    bus ??= build();
    if (bus && !isMuted() && bus.ctx.state !== 'running') void bus.ctx.resume();
  } catch {
    bus = null; // no WebAudio: the game is simply silent
  }
}

/** The mixer if the player has already touched the page and sound is on; null means stay silent. */
export function liveBus(): Bus | null {
  if (!unlocked || !bus || isMuted() || bus.ctx.state === 'closed') return null;
  if (bus.ctx.state === 'suspended') void bus.ctx.resume();
  return bus;
}

/** Instant: master gain to zero, then park the context. Unmute brings both back. */
export function applyMute(muted: boolean): void {
  if (!bus) return;
  const { ctx, master } = bus;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(muted ? 0 : dbToGain(MASTER_DB), ctx.currentTime);
  if (muted) void ctx.suspend();
  else if (unlocked) void ctx.resume();
}

/** Tab hidden: suspend everything (ambient included). Visible again: resume unless muted. */
export function applyVisibility(hidden: boolean): void {
  if (!bus) return;
  if (hidden) void bus.ctx.suspend();
  else if (!isMuted() && unlocked) void bus.ctx.resume();
}
