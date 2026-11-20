import { CONFIG } from '../data/config';
import { HK } from '../data/hkFacts';
import { generateMarket } from './market';
import { streamSeed } from './rng';
import type { Character, GameState } from './types';

/** Copy-on-write clone: copies every container the engine updates, so the input state is never touched. */
export function cloneState(s: GameState): GameState {
  return {
    ...s,
    expenses: { ...s.expenses },
    holdings: { ...s.holdings },
    insurance: s.insurance ? { ...s.insurance } : null,
    debts: s.debts.map((d) => ({ ...d })),
    flags: [...s.flags],
    revealed: [...s.revealed],
    cooldowns: { ...s.cooldowns },
    seen: { ...s.seen },
    pending: [...s.pending],
    queue: [...s.queue],
    decisionLog: [...s.decisionLog],
    history: [...s.history],
    rng: { ...s.rng },
    totals: { ...s.totals },
  };
}

export function newGameFromCharacter(seed: number, character: Character): GameState {
  return {
    seed,
    turn: 0,
    age: CONFIG.startAge,
    done: false,
    character,
    cash: startingCash(character),
    happiness: CONFIG.startHappiness,
    relationships: CONFIG.startRelationships,
    job: 'student',
    salary: 0,
    sideIncome: 0,
    hustle: 0,
    bankruptTurn: null,
    expenses: { rent: 0, living: HK.living.studentLiving, family: character.familyAllowance, lifestyle: 500 },
    holdings: { savings: 0, index: 0, bond: 0, stock: 0, crypto: 0, mpf: 0, property: 0 },
    mpfFund: 'default',
    insurance: null,
    debts: [],
    flags: [],
    revealed: [],
    cooldowns: {},
    seen: {},
    pending: [],
    queue: [],
    decisionLog: [],
    history: [],
    market: generateMarket(seed),
    rng: { event: streamSeed(seed, 'event'), outcome: streamSeed(seed, 'outcome') },
    totals: { fees: 0, interest: 0, surrenderLoss: 0, bankruptcies: 0, avoidableFees: 0, turnIncome: 0, turnSpending: 0, turnFees: 0, turnInterest: 0, yearStartCash: startingCash(character) },
    bankrupt: false,
  };
}

/** Savings from secondary-school red packets and summer jobs. ASSUMPTION, scaled by family tier. */
function startingCash(c: Character): number {
  return { low: 6_000, middle: 15_000, high: 40_000 }[c.familyTier];
}
