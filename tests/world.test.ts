import { describe, expect, it } from 'vitest';
import { BOT_IDS } from '../src/engine/bots';
import { netWorth } from '../src/engine/finance';
import { newGame, playLife } from '../src/engine/sim';
import { worldFor, worldKey } from '../src/world3d/descriptor';
import { QUALITIES, qualities } from '../src/world3d/qualities';

describe('qualities', () => {
  it('stay within 0..100 for every bot across lives', () => {
    for (const bot of BOT_IDS) for (let seed = 1; seed <= 5; seed += 1) {
      const q = qualities(playLife(seed, bot));
      for (const k of QUALITIES) { expect(q[k]).toBeGreaterThanOrEqual(0); expect(q[k]).toBeLessThanOrEqual(100); }
    }
  });
  it('a saver ends richer and safer than at the start', () => {
    const start = qualities(newGame(3));
    const end = qualities(playLife(3, 'saver'));
    expect(end.wealth).toBeGreaterThan(start.wealth);
    expect(end.safety).toBeGreaterThanOrEqual(start.safety);
  });
});

describe('world descriptor', () => {
  it('starts at uni living with parents and leaves uni by the end', () => {
    const d0 = worldFor(newGame(9));
    expect(d0.stage).toBe('uni');
    expect(d0.home).toBe('parents');
    const end = worldFor(playLife(9, 'balanced'));
    expect(end.stage).not.toBe('uni');
    expect(worldKey(end)).not.toBe(worldKey(d0));
  });
});

// The 3D layer must never change the simulation: same seeds and bots, same lives as before the redesign.
describe('engine fingerprint', () => {
  it('is unchanged', () => {
    let h = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const s = playLife(seed, BOT_IDS[seed % BOT_IDS.length]);
      h = (Math.imul(h, 31) + Math.round(netWorth(s)) + s.decisionLog.length) | 0;
    }
    expect(h).toBe(FINGERPRINT);
  });
});
const FINGERPRINT = -980618943;
