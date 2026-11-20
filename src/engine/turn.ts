import { CONFIG } from '../data/config';
import { HK } from '../data/hkFacts';
import { check } from './conditions';
import { addDebt, applyEffect } from './effects';
import {
  cardLimit, highInterestDebt, instalment, insuranceSurrenderValue, monthlyExpense, monthlyIncome, mpfContribution,
  netWorth, riskyHoldings, runway, salariesTax,
} from './finance';
import { inflationFor, stepMarket, turnToAge, turnYears, yearIndex } from './market';
import { makeRng } from './rng';
import { cloneState } from './state';
import type { GameState, MarketAsset, Regime, TraitId, TurnSummary } from './types';

const clamp = (v: number) => Math.max(0, Math.min(100, v));
/** flags from uni choices that move the first salary (ASSUMPTION: +/- a few percent) */
const GRAD_PAY_FLAGS: Record<string, number> = { internship: 1.08, focus_study: 1.04, grades_slipped: 0.95 };

export function isYearEnd(turn: number): boolean {
  return turn >= CONFIG.uniTurns || turn % 2 === 1;
}

/**
 * End the current turn: income, costs, debts, market, delayed effects, drift, then advance.
 * Pure: returns a new state and a summary; the input is not modified.
 */
export function endTurn(s: GameState): { state: GameState; summary: TurnSummary } {
  const d = cloneState(s);
  const years = turnYears(d.turn);
  const months = years * 12;
  const notices: string[] = [];
  const reveals: TraitId[] = [];
  const feesBefore = d.totals.fees;

  const income = collectIncome(d, months);
  const spending = payCosts(d, months, years);
  payDebts(d, months, years);
  const regime = growHoldings(d, years);
  runPending(d, notices);
  drift(d, years, reveals);
  if (d.cash < 0) borrowToCover(d, notices);
  restructureCard(d, notices);
  checkBankruptcy(d, notices);
  yearlyAdjust(d, regime);
  if (isYearEnd(d.turn)) tightenBelt(d, notices);
  if (d.turn === CONFIG.uniTurns - 1) graduate(d);

  d.totals.turnIncome += income;
  d.totals.turnSpending += spending;
  const fees = d.totals.fees - feesBefore;
  d.totals.turnFees += fees;
  d.history = [...d.history, record(d, regime, income, spending, fees)];

  const yearEnd = isYearEnd(d.turn);
  const summary: TurnSummary = {
    turn: d.turn,
    age: d.age,
    regime,
    income: d.totals.turnIncome,
    spending: d.totals.turnSpending,
    fees: d.totals.turnFees,
    interest: d.totals.turnInterest,
    cashChange: d.cash - d.totals.yearStartCash,
    portfolio: { ...d.holdings, insurance: insuranceSurrenderValue(d.insurance) },
    debts: d.debts.map((x) => ({ kind: x.kind, balance: x.balance, rate: x.rate })),
    notices,
    reveals,
    yearEnd,
  };
  if (yearEnd) d.totals = { ...d.totals, turnIncome: 0, turnSpending: 0, turnFees: 0, turnInterest: 0, yearStartCash: d.cash };

  d.turn += 1;
  d.age = turnToAge(d.turn);
  if (d.turn >= CONFIG.totalTurns) retire(d, notices);
  return { state: d, summary };
}

function collectIncome(d: GameState, months: number): number {
  let income = d.sideIncome * months;
  if (d.job === 'student') income += d.character.parentHelp * months;
  if (d.job === 'employed' && d.salary > 0) {
    const mpf = mpfContribution(d.salary);
    const tax = salariesTax(d.salary * 12, mpf.employee * 12) * (months / 12);
    income += (d.salary - mpf.employee) * months - tax;
    d.holdings.mpf += (mpf.employee + mpf.employer) * months;
  }
  d.cash += income;
  return income;
}

function payCosts(d: GameState, months: number, years: number): number {
  const e = d.expenses;
  let spending = (e.rent + e.living + e.family + e.lifestyle) * months;
  d.cash -= spending;
  if (d.job === 'student') {
    const tuition = HK.study.tuitionPerYear * years;
    if (d.flags.includes('loan_tsfs')) addDebt(d, 'studentLoan', tuition, HK.study.tsfsRate, 0);
    else if (d.flags.includes('loan_nls')) addDebt(d, 'studentLoan', tuition, HK.study.nlsRate, 0);
    else if (!d.flags.includes('tuition_family')) {
      d.cash -= tuition;
      spending += tuition;
    }
  }
  if (d.insurance && d.insurance.yearsPaid < d.insurance.premiumYears) {
    const premium = d.insurance.annualPremium * years;
    d.cash -= premium;
    d.insurance = { ...d.insurance, accountValue: d.insurance.accountValue + premium, yearsPaid: d.insurance.yearsPaid + years };
  } else if (d.insurance) {
    d.insurance = { ...d.insurance, yearsPaid: d.insurance.yearsPaid + years };
  }
  return spending;
}

function payDebts(d: GameState, months: number, years: number) {
  const studying = d.job === 'student';
  for (const debt of d.debts) {
    const interestFree = studying && debt.kind === 'studentLoan' && d.flags.includes('loan_tsfs');
    // instalments are paid through the year, so interest runs on the average balance, not the opening one
    const paid = debt.instalment > 0 ? Math.min(debt.balance, debt.instalment * months) : 0;
    const interest = interestFree ? 0 : Math.max(0, debt.balance - paid / 2) * debt.rate * years;
    debt.balance += interest;
    d.totals.interest += interest;
    d.totals.turnInterest += interest;
    if (debt.instalment > 0) {
      const pay = Math.min(debt.balance, debt.instalment * months);
      debt.balance -= pay;
      d.cash -= pay;
    }
  }
  // revolving debt (card, overdraft) is paid down from cash above a small buffer, dearest first
  const buffer = monthlyExpense(d) * CONFIG.cardRepayBufferMonths;
  for (const debt of d.debts.filter((x) => x.instalment === 0 && x.kind !== 'studentLoan' && x.kind !== 'mortgage').sort((a, b) => b.rate - a.rate)) {
    const minOnly = debt.kind === 'creditCard' && d.flags.includes('card_min_only');
    const target = minOnly ? debt.balance * 0.3 * years : debt.balance;
    const pay = Math.max(0, Math.min(target, d.cash - buffer));
    debt.balance -= pay;
    d.cash -= pay;
  }
  d.debts = d.debts.filter((x) => x.balance > 0.5);
}

function growHoldings(d: GameState, years: number): Regime {
  const { market, regime, factors } = stepMarket(d.market, d.turn);
  const indexFee = factors.index;
  d.market = market;
  const assetOf = (k: keyof GameState['holdings']): MarketAsset => (k === 'mpf' && d.mpfFund === 'equity' ? 'mpfEquity' : k);
  for (const k of Object.keys(d.holdings) as (keyof GameState['holdings'])[]) {
    const v = d.holdings[k];
    if (v <= 0) continue;
    const f = factors[assetOf(k)];
    d.holdings[k] = v * f.net;
    d.totals.fees += v * (f.gross - f.net);
    // fund fees beyond what a plain index fund would charge count as avoidable
    if (k === 'stock' || k === 'crypto' || k === 'bond') d.totals.avoidableFees += Math.max(0, v * (f.gross - f.net) - v * (indexFee.gross - indexFee.net));
  }
  if (d.insurance) {
    // non-guaranteed bonuses get cut in bad years
    const irr = regime === 'crash' || regime === 'correction' ? HK.insurance.irrLow : HK.insurance.irrHigh;
    d.insurance = { ...d.insurance, accountValue: d.insurance.accountValue * Math.pow(1 + irr, years) };
  }
  return regime;
}

function runPending(d: GameState, notices: string[]) {
  const due = d.pending.filter((p) => p.dueTurn <= d.turn);
  d.pending = d.pending.filter((p) => p.dueTurn > d.turn);
  const rng = makeRng(d.rng.outcome);
  for (const p of due) {
    if (!check(d, p.when, rng)) continue;
    if (p.eventId) d.queue = [...d.queue, p.eventId];
    if (p.effect) notices.push(...applyEffect(d, p.effect, rng), `delayed:${p.source}`);
  }
  d.rng = { ...d.rng, outcome: rng.state };
}

function drift(d: GameState, years: number, reveals: TraitId[]) {
  const rw = runway(d);
  const memories = d.decisionLog.filter((x) => x.tags.includes('fun')).length;
  let base: number = CONFIG.happinessBaseline + Math.min(CONFIG.lifestyleCap, d.expenses.lifestyle / CONFIG.lifestylePerPoint) + Math.min(CONFIG.memoryCap, memories);
  if (rw < 1) base -= CONFIG.lowRunwayStress;
  if (highInterestDebt(d) > 0) base -= 4;
  // the bankruptcy years (no cards, a trustee watching your spending) weigh on you
  if (inBankruptcy(d)) base -= CONFIG.bankruptcyStress;
  if (d.character.hidden.fragileMind && rw < 1) {
    base -= 6;
    if (!d.revealed.includes('fragileMind')) {
      d.revealed = [...d.revealed, 'fragileMind'];
      reveals.push('fragileMind');
    }
  }
  const k = Math.min(1, CONFIG.driftPerYear * years);
  d.happiness = Math.round(clamp(d.happiness + (base - d.happiness) * k));
  d.relationships = Math.round(clamp(d.relationships + (CONFIG.relationshipsBaseline - d.relationships) * k * 0.6));
}

/** Order in which liquid holdings are drawn down before anyone borrows. */
const LIQUID_ORDER: ('savings' | 'bond' | 'index' | 'stock' | 'crypto')[] = ['savings', 'bond', 'index', 'stock', 'crypto'];

/** Sell liquid holdings to raise cash; returns how much was raised. */
function raiseCash(d: GameState, need: number, notices: string[]): number {
  let raised = 0;
  for (const a of LIQUID_ORDER) {
    if (raised >= need) break;
    const take = Math.min(d.holdings[a], need - raised);
    if (take <= 0) continue;
    d.holdings[a] -= take;
    raised += take;
    if (a !== 'savings') notices.push(`forced_sale:${a}`);
  }
  d.cash += raised;
  return raised;
}

function borrowToCover(d: GameState, notices: string[]) {
  raiseCash(d, -d.cash, notices);
  if (d.cash >= 0) return;
  // students on a government loan scheme draw living costs from it too (TSFS/NLS living-expense loans)
  const schemeRate = d.flags.includes('loan_tsfs') ? HK.study.tsfsRate : d.flags.includes('loan_nls') ? HK.study.nlsRate : null;
  if (d.job === 'student' && schemeRate !== null) {
    const fromScheme = Math.min(-d.cash, CONFIG.studentLivingLoanPerYear * turnYears(d.turn));
    addDebt(d, 'studentLoan', fromScheme, schemeRate, 0, true);
    notices.push('scheme_borrow');
    if (d.cash >= 0) return;
  }
  const need = -d.cash;
  const card = d.debts.find((x) => x.kind === 'creditCard');
  // no new card credit while an undischarged bankrupt
  const room = inBankruptcy(d) ? 0 : Math.max(0, cardLimit(d) - (card?.balance ?? 0));
  const onCard = Math.min(need, room);
  if (onCard > 0) addDebt(d, 'creditCard', onCard, undefined, undefined, true);
  let rest = need - onCard;
  if (inBankruptcy(d)) {
    // an undischarged bankrupt can't borrow much: beyond a small cap you simply go without
    const unsecured = d.debts.filter((x) => x.kind === 'personalLoan' || x.kind === 'creditCard').reduce((a, x) => a + x.balance, 0);
    const room = Math.max(0, CONFIG.studentBankruptcy - unsecured);
    const without = Math.max(0, rest - room);
    if (without > 0) {
      d.cash += without;
      d.happiness = Math.round(clamp(d.happiness - CONFIG.beltTighten.happiness * 2));
      notices.push('went_without');
      rest -= without;
    }
  }
  // an overdraft-style revolving loan: repaid from spare cash, not a fixed instalment that widens next year's gap
  if (rest > 0) addDebt(d, 'personalLoan', rest, undefined, 0, true);
  notices.push('auto_borrow');
}

/** HK bankruptcy normally lasts 4 years before discharge; no second wipe in that time. */
function inBankruptcy(d: GameState): boolean {
  return d.bankruptTurn !== null && turnToAge(d.turn) - turnToAge(d.bankruptTurn) < CONFIG.bankruptcyYears;
}

/** Unsecured debt beyond what income could ever repay ends in bankruptcy (checked every turn). */
function checkBankruptcy(d: GameState, notices: string[]) {
  if (inBankruptcy(d)) return;
  const unsecuredNow = () => d.debts.filter((x) => x.kind === 'creditCard' || x.kind === 'personalLoan').reduce((a, x) => a + x.balance, 0);
  const limit = d.job === 'student' ? CONFIG.studentBankruptcy : Math.max(CONFIG.studentBankruptcy, d.salary * CONFIG.bankruptcyMonths);
  if (unsecuredNow() <= limit) return;
  // creditors come first: liquid assets are sold to pay down the unsecured debt before bankruptcy
  raiseCash(d, unsecuredNow() - Math.max(0, d.cash), notices);
  for (const kind of ['creditCard', 'personalLoan'] as const) {
    const debt = d.debts.find((x) => x.kind === kind);
    if (!debt || d.cash <= 0) continue;
    const pay = Math.min(debt.balance, d.cash);
    debt.balance -= pay;
    d.cash -= pay;
  }
  d.debts = d.debts.filter((x) => x.balance > 0.5);
  if (unsecuredNow() > limit) {
    d.debts = d.debts.filter((x) => x.kind !== 'creditCard' && x.kind !== 'personalLoan');
    d.cash = 0;
    d.happiness = clamp(d.happiness - 25);
    d.relationships = clamp(d.relationships - 10);
    // after bankruptcy the trustee forces a basic budget and the cards are gone
    d.expenses = { ...d.expenses, lifestyle: Math.min(d.expenses.lifestyle, 500) };
    d.flags = [...new Set([...d.flags.filter((f) => f !== 'card_min_only' && f !== 'has_card'), 'bankrupt'])];
    d.bankrupt = true;
    d.bankruptTurn = d.turn;
    d.totals.bankruptcies += 1;
    notices.push('bankrupt');
  }
}

/** Card balances can't sit above the limit for long: the bank rolls the excess into a cheaper fixed loan. */
function restructureCard(d: GameState, notices: string[]) {
  const card = d.debts.find((x) => x.kind === 'creditCard');
  const excess = card ? card.balance - cardLimit(d) : 0;
  if (!card || excess <= 0) return;
  card.balance -= excess;
  addDebt(d, 'personalLoan', excess, undefined, CONFIG.restructureYears);
  notices.push('card_restructure');
}

/** Real households cut back when costs outrun income and the cushion is gone. Costs happiness. */
function tightenBelt(d: GameState, notices: string[]) {
  if (d.job === 'student' || monthlyIncome(d) >= monthlyExpense(d) || runway(d) >= 1) return;
  const b = CONFIG.beltTighten;
  const floor = HK.living.workerLiving * Math.pow(1.02, Math.max(0, d.age - 22));
  d.expenses = { ...d.expenses, lifestyle: d.expenses.lifestyle * b.lifestyle, living: Math.max(floor, d.expenses.living * b.living) };
  d.happiness = Math.round(clamp(d.happiness - b.happiness));
  notices.push('belt_tighten');
}

function yearlyAdjust(d: GameState, regime: Regime) {
  if (!isYearEnd(d.turn)) return;
  const y = yearIndex(d.turn);
  const infl = inflationFor(d.market, y, regime);
  const e = d.expenses;
  // 家用 is a fixed sum most people rarely index to inflation (ASSUMPTION); events raise it when parents need more
  d.expenses = { rent: e.rent * (1 + infl), living: e.living * (1 + infl), family: e.family, lifestyle: e.lifestyle * (1 + infl) };
  if (d.job === 'employed') {
    const raise = d.age < CONFIG.careerPeakAge ? CONFIG.annualRaise[d.character.standing] : 0;
    // pay freezes in crash years
    const before = d.salary;
    d.salary = Math.round(d.salary * (1 + (regime === 'crash' ? 0 : infl + raise)));
    d.expenses = { ...d.expenses, living: d.expenses.living + Math.max(0, d.salary - before - before * infl) * CONFIG.lifestyleCreep };
  }
}

function graduate(d: GameState) {
  const f = d.flags;
  const start = HK.pay.gradStart[d.character.standing] * Object.entries(GRAD_PAY_FLAGS).reduce((m, [flag, x]) => (f.includes(flag) ? m * x : m), 1);
  d.job = 'employed';
  d.salary = Math.round(start);
  d.expenses = {
    ...d.expenses,
    living: HK.living.workerLiving,
    family: f.includes('moved_out') ? d.expenses.family : HK.familyAllowanceWorking[d.character.familyTier],
  };
  // student part-time work ends; a side business carries on
  d.sideIncome = d.hustle;
  d.debts = d.debts.map((x) => (x.kind === 'studentLoan' ? { ...x, instalment: instalment(x.balance, x.rate, HK.study.repayYears) } : x));
  d.flags = [...new Set([...f, 'graduated'])];
}

function retire(d: GameState, notices: string[]) {
  // MPF paid out as a lump sum at 65
  d.cash += d.holdings.mpf;
  d.holdings.mpf = 0;
  d.job = 'retired';
  d.salary = 0;
  d.sideIncome = 0;
  d.done = true;
  notices.push('mpf_withdrawn');
}

function record(d: GameState, regime: Regime, income: number, spending: number, fees: number) {
  return {
    turn: d.turn,
    age: d.age,
    regime,
    cash: d.cash,
    netWorth: netWorth(d),
    runway: runway(d),
    happiness: d.happiness,
    relationships: d.relationships,
    income,
    spending,
    fees,
    highInterestDebt: highInterestDebt(d),
    investedRisky: riskyHoldings(d),
  };
}
