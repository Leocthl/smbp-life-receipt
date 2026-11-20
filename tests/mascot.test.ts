import { describe, expect, it } from 'vitest';
import { enMascot } from '../src/i18n/en/mascot';
import { zhMascot } from '../src/i18n/zh/mascot';
import { EMOTES } from '../src/ui/mascot/emotes';
import { allLineKeys, reactionFor } from '../src/ui/mascot/reaction';
import { introKey } from '../src/ui/chat/introLines';
import type { Speaker } from '../src/engine/types';
import type { Qualities } from '../src/world3d/qualities';

const base: Qualities = { wealth: 30, safety: 40, joy: 50, bonds: 50, freedom: 60, growth: 30 };
const move = (d: Partial<Qualities>): Qualities => ({ ...base, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, base[k as keyof Qualities] + v])) });
const SPEAKERS: Speaker[] = ['friend', 'agent', 'landlord', 'headline', 'boss', 'doctor', 'parent', 'bank', 'self', 'partner', 'phone', 'campus'];

describe('reactionFor', () => {
  it('is positive for a clear gain', () => {
    const r = reactionFor(base, move({ wealth: 8, joy: 4 }), ['save'], [], 'a:1');
    expect(r.tone).toBe('good');
    expect(['happy', 'cheer', 'proud', 'love']).toContain(r.emote);
  });
  it('is worried or sad for a clear loss, and borrowing is always bad', () => {
    const r = reactionFor(base, move({ safety: -10, freedom: -8 }), ['debt'], [], 'a:2');
    expect(r.tone).toBe('bad');
    expect(['worried', 'sad', 'shocked']).toContain(r.emote);
    expect(reactionFor(base, move({ wealth: 2 }), [], ['auto_borrow'], 'a:3').tone).toBe('bad');
    expect(reactionFor(base, base, [], ['bankrupt'], 'a:4').emote).toBe('sad');
  });
  it('calls a big risky windfall mixed: lucky, not wise', () => {
    const r = reactionFor(base, move({ wealth: 12, safety: -2 }), ['risky'], [], 'a:5');
    expect(r.tone).toBe('mixed');
    expect(r.lineKey).toMatch(/lucky|mixed/);
  });
  it('is mixed when gains and losses balance, neutral when nothing moves', () => {
    expect(reactionFor(base, move({ joy: 6, wealth: -6 }), ['spend'], [], 'a:6').tone).toBe('mixed');
    expect(reactionFor(base, base, [], [], 'a:7')).toMatchObject({ tone: 'neutral', emote: 'neutral' });
  });
  it('weighs bonds more for family choices', () => {
    expect(reactionFor(base, move({ bonds: 5 }), ['family'], [], 'a:8').emote).toBe('love');
  });
  it('is deterministic for the same seed and varies across seeds', () => {
    const a = reactionFor(base, move({ wealth: 8 }), [], [], 'x:1');
    expect(reactionFor(base, move({ wealth: 8 }), [], [], 'x:1')).toEqual(a);
    const keys = new Set(Array.from({ length: 40 }, (_, i) => reactionFor(base, move({ wealth: 8 }), [], [], `x:${i}`).lineKey));
    expect(keys.size).toBeGreaterThan(3);
  });
});

describe('mascot texts', () => {
  it('every reaction line key exists in both languages', () => {
    for (const key of allLineKeys()) {
      expect(zhMascot[key], key).toBeTruthy();
      expect(enMascot[key], key).toBeTruthy();
    }
  });
  it('every key returned by reactionFor is in the pool', () => {
    const pool = new Set(allLineKeys());
    const cases: [Qualities, string[], string[]][] = [[move({ wealth: 9 }), [], []], [move({ bonds: -9 }), ['family'], []], [base, [], []], [move({ wealth: 9 }), ['risky'], []], [base, [], ['auto_borrow']]];
    for (let i = 0; i < 60; i += 1) cases.forEach(([after, tags, notices]) => expect(pool.has(reactionFor(base, after, tags as never, notices, `s:${i}`).lineKey)).toBe(true));
  });
  it('has an intro per speaker, an ask line, and a mood label per emote in both languages', () => {
    for (const s of SPEAKERS) for (let i = 0; i < 10; i += 1) { expect(zhMascot[introKey(s, `e${i}`)]).toBeTruthy(); expect(enMascot[introKey(s, `e${i}`)]).toBeTruthy(); }
    for (const e of EMOTES) { expect(zhMascot[`mascot.mood.${e}`]).toBeTruthy(); expect(enMascot[`mascot.mood.${e}`]).toBeTruthy(); }
    expect(Object.keys(zhMascot).sort()).toEqual(Object.keys(enMascot).sort());
  });
});
