import { describe, expect, it } from 'vitest';
import { buildWorld, framingFor } from '../src/world3d/world';
import { SCOPES, type Memento, type WorldDescriptor } from '../src/world3d/descriptor';

const memento = (i: number): Memento => ({ turn: i, age: 18 + i, eventId: 'e' + i, choiceId: 'c', category: 'daily', tag: i % 2 ? 'save' : 'invest', netWorthDelta: 1000 * i });
const base = (scope: WorldDescriptor['scope'], n: number): WorldDescriptor => ({
  age: 20, turn: 4, stage: 'uni', job: 'student', home: 'parents', partner: false, kids: 0, car: false, sideHustle: false, insured: false, burntOut: false,
  bankrupt: false, regime: 'normal', invested: 0.3, lifestyle: 0.3, q: { wealth: 50, safety: 50, joy: 60, bonds: 50, freedom: 70, growth: 50 }, done: false,
  scope, mementos: Array.from({ length: n }, (_, i) => memento(i)),
});

describe('world scopes', () => {
  it('builds every scope with a home spot, a framing and no keepsakes by default', () => {
    for (const scope of SCOPES) {
      const w = buildWorld(base(scope, 0), 1);
      expect(w.spots.some((s) => s.id === 'home')).toBe(true);
      expect(w.framing).toEqual(framingFor(scope));
      expect(w.fresh ?? []).toHaveLength(0);
      w.dispose();
    }
  });

  it('puts only the newest keepsake in the fresh meshes, and places props the same way each build', () => {
    const a = buildWorld(base('home', 9), 1), b = buildWorld(base('home', 9), 1);
    expect(a.fresh?.length).toBeGreaterThan(0);
    expect(a.fresh?.every((m) => a.meshes.includes(m))).toBe(true);
    expect(a.meshes.map((m) => m.count)).toEqual(b.meshes.map((m) => m.count));
    const grown = buildWorld(base('home', 10), 1);
    expect(grown.meshes.reduce((n, m) => n + m.count, 0)).toBeGreaterThan(a.meshes.reduce((n, m) => n + m.count, 0));
    [a, b, grown].forEach((w) => w.dispose());
  });
});
