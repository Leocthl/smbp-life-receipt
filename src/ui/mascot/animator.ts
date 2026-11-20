import { BURST_MS, SPEC, type Emote, type Face, type FxKind } from './emotes';
import type { Pose } from './draw';

const TOP = 13;
const IDLE_AFTER_MS = 12000;
const FREEZE_AT_MS = 520;
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

type Extra = { kind: 'yawn' | 'doodle'; at: number; ms: number };
const EXTRA_MS = { yawn: 2400, doodle: 3800 } as const;

export interface Frame { pose: Pose; fx: FxKind | null; fxT: number }

/** All the procedural motion for one mascot: breathing, blinks, glances, hops, tongue, idle yawn or doodle. */
export class Animator {
  private emote: Emote = 'neutral';
  private since = 0;
  private talking = false;
  private lastActive = 0;
  private blinkAt = 0;
  private blinkUntil = 0;
  private lookUntil = 0;
  private lookNextAt = 0;
  private look: [number, number] = [0, 0];
  private extra: Extra | null = null;

  constructor(now: number, private readonly reduced: boolean, private readonly still: boolean) {
    this.since = now;
    this.lastActive = now;
    this.blinkAt = now + rand(1500, 3500);
    this.lookNextAt = now + rand(3500, 7000);
  }

  setEmote(e: Emote, now: number) {
    this.emote = e;
    this.since = now;
    this.lastActive = now;
    this.extra = null;
  }

  setTalking(on: boolean, now: number) {
    this.talking = on;
    if (on) { this.lastActive = now; this.extra = null; }
  }

  frame(rawNow: number): Frame {
    const now = this.still ? this.since + FREEZE_AT_MS : rawNow;
    const spec = SPEC[this.emote];
    const age = now - this.since;
    const burst = age < BURST_MS;
    const face: Face = burst ? spec.face : spec.mood;
    const fx = (burst || spec.hold) && spec.fx ? spec.fx : null;
    const motion = !this.reduced && !this.still;
    this.updateIdle(now, motion);
    const extra = this.extra;
    const xT = extra ? (now - extra.at) / extra.ms : 0;
    const pose: Pose = {
      eyes: extra?.kind === 'yawn' ? 'closed' : face.eyes,
      blink: now < this.blinkUntil,
      mouth: extra?.kind === 'yawn' ? 'yawn' : face.mouth,
      brow: face.brow,
      cheeks: face.cheeks,
      arms: extra?.kind === 'yawn' ? 'stretch' : face.arms,
      lookX: (face.lookX ?? 0) + (motion && !burst ? this.look[0] : 0),
      lookY: face.lookY ?? 0,
      top: TOP + this.breath(now, motion) + (extra?.kind === 'yawn' ? -1 : 0),
      lift: motion ? this.hop(age, spec.hop) : 0,
      tongue: motion ? this.tongue(now) : this.talking ? 4 : 0,
      curl: motion ? Math.round(Math.sin(now / 420)) : 0,
      armT: motion ? now / 1000 : 0.3,
      doodle: extra?.kind === 'doodle' ? Math.min(1, xT * 1.25) : -1,
    };
    return { pose, fx, fxT: this.reduced ? 0.6 : age / 1000 };
  }

  private breath(now: number, motion: boolean) {
    if (!motion) return 0;
    const slow = this.emote === 'sleepy' ? 3600 : 2600;
    return Math.sin((now / slow) * Math.PI * 2) > 0.35 ? -1 : 0;
  }

  private hop(age: number, height: number) {
    if (height <= 0 || age > 700) return 0;
    const phase = age < 420 ? age / 420 : 0;
    const second = age >= 420 ? Math.sin(((age - 420) / 280) * Math.PI) * (height / 3) : 0;
    return Math.round(Math.sin(phase * Math.PI) * height + second);
  }

  private tongue(now: number) {
    if (!this.talking) return 0;
    return 2 + Math.floor(now / 70) % 4 * 2;
  }

  private updateIdle(now: number, motion: boolean) {
    if (now >= this.blinkAt) {
      this.blinkUntil = now + 130;
      this.blinkAt = now + rand(2000, 5000);
    }
    if (!motion) return;
    if (now >= this.lookNextAt) {
      this.look = [Math.random() < 0.5 ? -1 : 1, 0];
      this.lookUntil = now + 1100;
      this.lookNextAt = now + rand(4000, 8000);
    }
    if (now >= this.lookUntil) this.look = [0, 0];
    if (this.extra && now - this.extra.at > this.extra.ms) {
      this.extra = null;
      this.lastActive = now - IDLE_AFTER_MS + rand(8000, 14000);
    }
    if (!this.extra && !this.talking && now - this.lastActive > IDLE_AFTER_MS) {
      const kind = Math.random() < 0.5 ? 'yawn' : 'doodle';
      this.extra = { kind, at: now, ms: EXTRA_MS[kind] };
    }
  }
}
