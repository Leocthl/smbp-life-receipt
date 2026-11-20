import { createGaussianBuilder } from '../gaussian';
import type { Collider, Spot } from '../contracts';
import type { Scope, WorldDescriptor } from '../descriptor';
import { EXTENTS, type Extent } from './layout';
import type { Builder } from './kit';
import { toneFor, type Tone } from './tone';

/** One builder per mesh: splats in the same builder are depth-sorted together, so each layer is its own mesh. */
export interface Layers {
  solid: Builder; glow: Builder; water: Builder; tram: Builder; boats: Builder; crowd: Builder; sky: Builder; rain: Builder;
  /** keepsakes, with the newest in its own pair so the stage can grow only that one */
  props: Builder; propsGlow: Builder; fresh: Builder; freshGlow: Builder;
}

export interface Ctx {
  d: WorldDescriptor;
  scope: Scope;
  /** the part of the neighbourhood that exists at this scope */
  ext: Extent;
  L: Layers;
  rnd: () => number;
  tone: Tone;
  spots: Spot[];
  colliders: Collider[];
  /** 0..1 */
  wealth: number; joy: number; freedom: number; bonds: number;
  /** chance that a window is lit */
  lit: number;
}

export function createCtx(d: WorldDescriptor, seed: number): Ctx {
  const mk = (k: number) => createGaussianBuilder(seed * 13 + k);
  const L: Layers = { solid: mk(1), glow: mk(2), water: mk(3), tram: mk(4), boats: mk(5), crowd: mk(6), sky: mk(7), rain: mk(8), props: mk(9), propsGlow: mk(10), fresh: mk(11), freshGlow: mk(12) };
  const wealth = d.q.wealth / 100;
  return {
    d, scope: d.scope, ext: EXTENTS[d.scope], L, rnd: L.solid.rnd, tone: toneFor(d.regime), spots: [], colliders: [],
    wealth, joy: d.q.joy / 100, freedom: d.q.freedom / 100, bonds: d.q.bonds / 100,
    lit: (0.2 + 0.6 * wealth) * (d.bankrupt ? 0.45 : 1),
  };
}
