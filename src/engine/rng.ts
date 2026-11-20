// Seeded RNG (mulberry32). State is a uint32 kept in GameState, so runs are reproducible.

export function nextRaw(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, s];
}

/** Derive an independent stream seed from a base seed and a label. */
export function streamSeed(seed: number, label: string): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/**
 * A local generator. Pure functions create one from a state, draw, then store
 * rng.state back into the new GameState they return.
 */
export interface Rng {
  float(): number;
  int(n: number): number;
  normal(): number;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly T[], weight: (t: T) => number): T | undefined;
  readonly state: number;
}

export function makeRng(initial: number): Rng {
  let s = initial >>> 0;
  const float = () => {
    const [v, n] = nextRaw(s);
    s = n;
    return v;
  };
  return {
    float,
    int: (n) => Math.floor(float() * n),
    normal: () => {
      const u = Math.max(float(), 1e-12);
      const v = float();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    pick: (items) => items[Math.floor(float() * items.length)],
    weighted: (items, weight) => {
      const total = items.reduce((a, t) => a + Math.max(0, weight(t)), 0);
      if (total <= 0) return undefined;
      let r = float() * total;
      for (const t of items) {
        r -= Math.max(0, weight(t));
        if (r < 0) return t;
      }
      return items[items.length - 1];
    },
    get state() {
      return s;
    },
  };
}
