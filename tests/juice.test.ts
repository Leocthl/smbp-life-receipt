import { describe, expect, it } from 'vitest';
import { dbToGain, makeRateLimiter, semitones } from '../src/ui/audio/pure';
import { detectMilestones, type Snap } from '../src/ui/juice/milestones';
import { easeOutCubic, tweenValue } from '../src/ui/juice/tween';

const snap = (over: Partial<Snap> = {}): Snap => ({ netWorth: 5000, cash: 5000, property: 0, debt: 0, ...over });

describe('number tween', () => {
  it('eases out and lands exactly on the target', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5); // fast first, slow last
    expect(tweenValue(100, 900, 0)).toBe(100);
    expect(tweenValue(100, 900, 500, 500)).toBe(900);
    expect(tweenValue(100, 900, 9999)).toBe(900);
    expect(tweenValue(100, 900, 10, 0)).toBe(900); // zero duration snaps (used under test robots)
  });
  it('moves monotonically down as well as up', () => {
    const a = tweenValue(1000, 0, 100, 500);
    const b = tweenValue(1000, 0, 300, 500);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(0);
  });
});

describe('milestones', () => {
  it('fires when net worth crosses 100k and 1M, once', () => {
    expect(detectMilestones(snap({ netWorth: 90_000 }), snap({ netWorth: 120_000 }))).toEqual(['nw100k']);
    expect(detectMilestones(snap({ netWorth: 900_000 }), snap({ netWorth: 1_100_000 }))).toEqual(['nw1m']);
    expect(detectMilestones(snap({ netWorth: 90_000 }), snap({ netWorth: 2_000_000 }))).toEqual(['nw100k', 'nw1m']);
    const done = new Set(['nw100k' as const]);
    expect(detectMilestones(snap({ netWorth: 90_000 }), snap({ netWorth: 120_000 }), done)).toEqual([]);
    expect(detectMilestones(snap({ netWorth: 120_000 }), snap({ netWorth: 130_000 }))).toEqual([]);
  });
  it('spots the first home and being debt-free', () => {
    expect(detectMilestones(snap(), snap({ property: 4_000_000 }))).toEqual(['firstHome']);
    expect(detectMilestones(snap({ property: 4_000_000 }), snap({ property: 4_200_000 }))).toEqual([]);
    expect(detectMilestones(snap({ debt: 30_000 }), snap({ debt: 0 }))).toEqual(['debtFree']);
    expect(detectMilestones(snap({ debt: 0 }), snap({ debt: 0 }))).toEqual([]); // never had debt: nothing to celebrate
  });
  it('flags cash going below zero every time, not only the first', () => {
    expect(detectMilestones(snap({ cash: 100 }), snap({ cash: -50 }))).toEqual(['broke']);
    expect(detectMilestones(snap({ cash: -50 }), snap({ cash: -80 }))).toEqual([]);
    expect(detectMilestones(snap({ cash: 100 }), snap({ cash: -50 }), new Set(['broke' as const]))).toEqual(['broke']);
  });
});

describe('audio helpers', () => {
  it('converts decibels to gain', () => {
    expect(dbToGain(0)).toBe(1);
    expect(dbToGain(-6)).toBeCloseTo(0.501, 2);
    expect(dbToGain(-20)).toBeCloseTo(0.1, 5);
    expect(dbToGain(-Infinity)).toBe(0);
    expect(dbToGain(-90)).toBe(0);
    expect(semitones(12)).toBe(2);
  });
  it('rate-limits one sound and the whole mix', () => {
    const lim = makeRateLimiter({ gap: { click: 100 }, defaultGap: 50, max: 3, windowMs: 1000 });
    expect(lim.allow('click', 0)).toBe(true);
    expect(lim.allow('click', 60)).toBe(false); // too soon
    expect(lim.allow('click', 120)).toBe(true);
    expect(lim.allow('chime', 130)).toBe(true);
    expect(lim.allow('other', 140)).toBe(false); // 3 in the window already
    expect(lim.allow('other', 1200)).toBe(true); // window has passed
    lim.reset();
    expect(lim.allow('click', 1201)).toBe(true);
  });
});
