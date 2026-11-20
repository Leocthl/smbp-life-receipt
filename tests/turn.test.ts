import { describe, expect, it } from 'vitest';
import { defaultCharacter } from '../src/engine/character';
import { mpfContribution, salariesTax } from '../src/engine/finance';
import { runLife } from '../src/engine/sim';
import { newGameFromCharacter } from '../src/engine/state';
import { endTurn } from '../src/engine/turn';

describe('finance rules', () => {
  it('MPF: 5% each side, capped at HK$1,500, no employee part under HK$7,100', () => {
    expect(mpfContribution(20_000)).toEqual({ employee: 1_000, employer: 1_000 });
    expect(mpfContribution(50_000)).toEqual({ employee: 1_500, employer: 1_500 });
    expect(mpfContribution(7_000).employee).toBe(0);
    expect(mpfContribution(7_000).employer).toBe(350);
  });
  it('salaries tax is progressive after the basic allowance', () => {
    expect(salariesTax(120_000, 0)).toBe(0);
    // 240k - 12k MPF - 132k = 96k: 50k@2% + 46k@6%
    expect(salariesTax(240_000, 12_000)).toBeCloseTo(1_000 + 2_760);
  });
});

describe('turn loop', () => {
  it('endTurn does not mutate its input', () => {
    const s = newGameFromCharacter(1, defaultCharacter());
    const before = JSON.stringify(s);
    endTurn(s);
    expect(JSON.stringify(s)).toBe(before);
  });
  it('runs from 18 to 65 in 51 turns and pays MPF out', () => {
    const s = runLife(3);
    expect(s.done).toBe(true);
    expect(s.turn).toBe(51);
    expect(s.age).toBe(65);
    expect(s.holdings.mpf).toBe(0);
    expect(s.history.length).toBe(51);
    expect(s.history[8].age).toBe(22);
  });
  it('is reproducible', () => {
    expect(runLife(11).cash).toBe(runLife(11).cash);
  });
});
