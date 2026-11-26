import { dbToGain } from './pure';
import type { Bus } from './engine';

// Two building blocks, tone and noise; every sound in sfx.ts and ambient.ts is built from these.

export interface ToneOpts {
  f: number;
  /** glide to this frequency over the note */
  to?: number;
  dur: number;
  type?: OscillatorType;
  db?: number;
  /** seconds after "now" */
  at?: number;
  attack?: number;
  /** vibrato depth in Hz */
  wobble?: number;
  /** optional per-note lowpass cutoff Hz for warm keys/bass */
  filter?: number;
  /** optional pitch detune in cents */
  detune?: number;
  dest?: 'sfx' | 'music';
}

export function tone(b: Bus, o: ToneOpts): void {
  const t0 = b.ctx.currentTime + (o.at ?? 0);
  const osc = b.ctx.createOscillator();
  const g = b.ctx.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f, t0);
  if (o.detune) osc.detune.setValueAtTime(o.detune, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
  if (o.wobble) {
    const lfo = b.ctx.createOscillator();
    const depth = b.ctx.createGain();
    lfo.frequency.value = 6.5;
    depth.gain.value = o.wobble;
    lfo.connect(depth);
    depth.connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + o.dur + 0.05);
  }
  const peak = dbToGain(o.db ?? -12);
  const attack = Math.max(0.002, Math.min(o.attack ?? 0.005, o.dur * 0.45));
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  if (o.filter) {
    const lp = b.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(o.filter, t0);
    lp.Q.value = 0.7;
    osc.connect(lp);
    lp.connect(g);
  } else {
    osc.connect(g);
  }
  g.connect(b[o.dest ?? 'sfx']);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.05);
}

export interface NoiseOpts {
  dur: number;
  f: number;
  q?: number;
  type?: BiquadFilterType;
  db?: number;
  at?: number;
  dest?: 'sfx' | 'music';
}

/** A filtered burst of noise: paper, printer ticks, footsteps, soft brushed percussion. */
export function noise(b: Bus, o: NoiseOpts): void {
  const t0 = b.ctx.currentTime + (o.at ?? 0);
  const src = b.ctx.createBufferSource();
  src.buffer = b.noise;
  const filter = b.ctx.createBiquadFilter();
  filter.type = o.type ?? 'bandpass';
  filter.frequency.value = o.f;
  filter.Q.value = o.q ?? 1;
  const g = b.ctx.createGain();
  g.gain.setValueAtTime(dbToGain(o.db ?? -14), t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(b[o.dest ?? 'sfx']);
  src.start(t0, Math.random() * 0.5, o.dur + 0.02);
}
