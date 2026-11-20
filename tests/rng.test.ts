import { describe, expect, it } from 'vitest';
import { makeRng, streamSeed } from '../src/engine/rng';

describe('rng', () => {
  it('is reproducible from a seed', () => {
    const a = makeRng(42), b = makeRng(42);
    const xs = Array.from({ length: 5 }, () => a.float());
    expect(Array.from({ length: 5 }, () => b.float())).toEqual(xs);
  });
  it('gives different streams per label', () => {
    expect(streamSeed(1, 'market')).not.toBe(streamSeed(1, 'event'));
  });
  it('floats stay in [0,1) and normals look standard', () => {
    const r = makeRng(7);
    const ns = Array.from({ length: 20000 }, () => r.normal());
    const mean = ns.reduce((a, b) => a + b, 0) / ns.length;
    const sd = Math.sqrt(ns.reduce((a, b) => a + (b - mean) ** 2, 0) / ns.length);
    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(Math.abs(sd - 1)).toBeLessThan(0.03);
    for (let i = 0; i < 1000; i++) { const f = r.float(); expect(f).toBeGreaterThanOrEqual(0); expect(f).toBeLessThan(1); }
  });
});
