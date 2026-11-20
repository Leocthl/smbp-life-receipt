import { CONFIG } from '../data/config';
import { HK } from '../data/hkFacts';
import { check } from './conditions';
import { instalment, insuranceSurrenderValue, resolveAmount } from './finance';
import type { Rng } from './rng';
import type { Debt, DebtKind, Effect, GameState } from './types';

const DEFAULT_RATE: Record<DebtKind, number> = {
  studentLoan: HK.study.nlsRate,
  creditCard: HK.credit.cardApr,
  personalLoan: HK.credit.personalLoanApr,
  mortgage: HK.credit.mortgageRate,
};
const DEFAULT_YEARS: Record<DebtKind, number> = { studentLoan: HK.study.repayYears, creditCard: 0, personalLoan: 3, mortgage: 25 };

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/**
 * Apply an effect to a draft state. The draft must be a fresh clone (see cloneState);
 * callers never pass the player's live state. Returns notices for the UI.
 */
export function applyEffect(d: GameState, e: Effect | undefined, rng?: Rng): string[] {
  if (!e) return [];
  if (e.when && !check(d, e.when, rng)) return [];
  const notices: string[] = [];
  if (e.cash !== undefined) d.cash += resolveAmount(d, e.cash);
  if (e.happiness) d.happiness = clamp(d.happiness + e.happiness);
  if (e.relationships) d.relationships = clamp(d.relationships + e.relationships);
  for (const s of e.sell ?? []) sell(d, s.asset, s.fraction);
  if (e.invest) notices.push(...invest(d, e.invest.asset, resolveAmount(d, e.invest.amount)));
  if (e.borrow) addDebt(d, e.borrow.kind, resolveAmount(d, e.borrow.amount), e.borrow.rate, e.borrow.years, true);
  if (e.repay) repay(d, e.repay.kind, resolveAmount(d, e.repay.amount));
  if (e.salaryMult) {
    d.salary = Math.round(d.salary * e.salaryMult);
    if (e.salaryMult < 1) d.expenses = { ...d.expenses, living: d.expenses.living * (1 - (1 - e.salaryMult) * CONFIG.downshift) };
  }
  if (e.salarySet !== undefined) d.salary = resolveAmount(d, e.salarySet);
  if (e.sideIncome) d.sideIncome = Math.max(0, d.sideIncome + e.sideIncome);
  if (e.hustle) {
    // a side business keeps paying after graduation, unlike student part-time work
    d.hustle = Math.max(0, d.hustle + e.hustle);
    d.sideIncome = Math.max(0, d.sideIncome + e.hustle);
  }
  if (e.job) {
    // ASSUMPTION: retiring early trims everyday costs by a fifth (no commute, no work lunches)
    if (e.job === 'retired' && d.job !== 'retired') d.expenses = { ...d.expenses, living: d.expenses.living * 0.8 };
    d.job = e.job;
  }
  if (e.expense) {
    for (const [k, v] of Object.entries(e.expense) as [keyof GameState['expenses'], number][]) {
      d.expenses[k] = Math.max(0, d.expenses[k] + v);
    }
  }
  if (e.setFlags) d.flags = [...new Set([...d.flags, ...e.setFlags])];
  if (e.clearFlags) d.flags = d.flags.filter((f) => !e.clearFlags!.includes(f));
  if (e.mpfFund) d.mpfFund = e.mpfFund;
  if (e.insurancePlan && !d.insurance) {
    d.insurance = { annualPremium: resolveAmount(d, e.insurancePlan.annualPremium), premiumYears: e.insurancePlan.years, yearsPaid: 0, accountValue: 0, startTurn: d.turn };
  }
  if (e.buyProperty) notices.push(...buyProperty(d, e.buyProperty));
  return notices;
}

function markInvested(d: GameState) {
  if (d.market.firstInvestTurn === null) d.market = { ...d.market, firstInvestTurn: d.turn };
}

function invest(d: GameState, asset: Exclude<keyof GameState['holdings'], 'mpf'>, amount: number): string[] {
  const amt = Math.min(Math.max(0, amount), Math.max(0, d.cash));
  if (amt <= 0) return ['no_cash_to_invest'];
  const cost = amt * (CONFIG.tradeCost[asset] ?? 0);
  d.cash -= amt;
  d.holdings[asset] += amt - cost;
  d.totals.fees += cost;
  d.totals.turnFees += cost;
  d.totals.avoidableFees += cost;
  // crash protection counts from the first voluntary market investment (not MPF, deposits or property)
  if (asset === 'index' || asset === 'bond' || asset === 'stock' || asset === 'crypto') markInvested(d);
  return [];
}

function sell(d: GameState, asset: Exclude<keyof GameState['holdings'], 'mpf'> | 'insurance', fraction: number) {
  const f = Math.max(0, Math.min(1, fraction));
  if (asset === 'insurance') {
    if (!d.insurance) return;
    const value = insuranceSurrenderValue(d.insurance) * f;
    const loss = d.insurance.accountValue * f - value;
    d.cash += value;
    d.totals.surrenderLoss += loss;
    d.insurance = f >= 1 ? null : { ...d.insurance, accountValue: d.insurance.accountValue * (1 - f) };
    return;
  }
  const value = d.holdings[asset] * f;
  d.holdings[asset] -= value;
  if (asset === 'property') {
    d.cash += value;
    repay(d, 'mortgage', value);
    if (d.holdings.property <= 0.5) d.flags = d.flags.filter((f) => f !== 'homeowner');
    return;
  }
  d.cash += value;
}

export function addDebt(d: GameState, kind: DebtKind, amount: number, rate?: number, years?: number, toCash = false) {
  if (amount <= 0) return;
  const r = rate ?? DEFAULT_RATE[kind];
  const y = years ?? DEFAULT_YEARS[kind];
  // revolving and still-in-school loans merge (same rate); every instalment loan is its own tranche
  const existing = y === 0 ? d.debts.find((x) => x.kind === kind && x.instalment === 0 && x.rate === r) : undefined;
  if (existing) {
    existing.balance += amount;
  } else {
    const debt: Debt = { kind, balance: amount, rate: r, instalment: y > 0 ? instalment(amount, r, y) : 0 };
    d.debts = [...d.debts, debt];
  }
  if (toCash) d.cash += amount;
}

/** Repay a kind of debt, dearest tranche first. */
export function repay(d: GameState, kind: DebtKind, amount: number) {
  let left = Math.max(0, amount);
  for (const debt of d.debts.filter((x) => x.kind === kind).sort((a, b) => b.rate - a.rate)) {
    const pay = Math.max(0, Math.min(left, debt.balance, d.cash));
    debt.balance -= pay;
    d.cash -= pay;
    left -= pay;
  }
  d.debts = d.debts.filter((x) => x.balance > 0.5);
}

function buyProperty(d: GameState, p: NonNullable<Effect['buyProperty']>): string[] {
  const price = resolveAmount(d, p.price);
  const down = price * p.downPct;
  // ASSUMPTION: stamp duty, legal and agent fees ~4% of price for a first flat.
  const costs = price * 0.04;
  if (d.cash < down + costs) return ['cannot_afford_property'];
  d.cash -= down + costs;
  d.totals.fees += costs;
  d.holdings.property += price;
  addDebt(d, 'mortgage', price - down, p.rate, p.years);
  d.expenses.rent = 0;
  d.flags = [...new Set([...d.flags, 'homeowner'])];
  return [];
}
