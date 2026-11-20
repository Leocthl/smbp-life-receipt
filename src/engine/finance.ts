import { HK } from '../data/hkFacts';
import { CONFIG } from '../data/config';
import type { Amount, Debt, GameState, InsurancePlan } from './types';

export const HIGH_INTEREST = 0.1;

export function monthlyExpense(s: GameState): number {
  const e = s.expenses;
  const loanInstalments = s.debts.reduce((a, d) => a + d.instalment, 0);
  const premium = s.insurance && s.insurance.yearsPaid < s.insurance.premiumYears ? s.insurance.annualPremium / 12 : 0;
  return e.rent + e.living + e.family + e.lifestyle + loanInstalments + premium;
}

/** Monthly take-home-ish income before tax: salary minus employee MPF, plus side income and parents' help. */
export function monthlyIncome(s: GameState): number {
  const salary = s.job === 'employed' ? s.salary - mpfContribution(s.salary).employee : 0;
  const help = s.job === 'student' ? s.character.parentHelp : 0;
  return salary + s.sideIncome + help;
}

export function mpfContribution(monthlySalary: number): { employee: number; employer: number } {
  const relevant = Math.min(monthlySalary, HK.mpf.maxIncome);
  const employer = relevant * HK.mpf.rate;
  const employee = monthlySalary < HK.mpf.minIncome ? 0 : relevant * HK.mpf.rate;
  return { employee, employer };
}

/** Hong Kong salaries tax on an annual income (progressive rates only; standard rate cap ignored). */
export function salariesTax(annualIncome: number, annualMpf: number): number {
  const net = annualIncome - Math.min(annualMpf, HK.tax.mpfDeductionCap) - HK.tax.basicAllowance;
  if (net <= 0) return 0;
  let rest = net;
  let tax = 0;
  for (const rate of HK.tax.bandRates) {
    const slice = Math.min(rest, HK.tax.bandWidth);
    tax += slice * rate;
    rest -= slice;
    if (rest <= 0) return tax;
  }
  return tax + rest * HK.tax.topRate;
}

export function insuranceSurrenderValue(p: InsurancePlan | null): number {
  if (!p) return 0;
  const factor = Math.min(1, HK.insurance.surrenderBase + HK.insurance.surrenderStep * p.yearsPaid);
  return p.accountValue * factor;
}

export function totalDebt(s: GameState, filter?: (d: Debt) => boolean): number {
  return s.debts.filter(filter ?? (() => true)).reduce((a, d) => a + d.balance, 0);
}

export function highInterestDebt(s: GameState): number {
  return totalDebt(s, (d) => d.rate >= HIGH_INTEREST);
}

export function riskyHoldings(s: GameState): number {
  const h = s.holdings;
  return h.index + h.bond + h.stock + h.crypto;
}

export function netWorth(s: GameState): number {
  const h = s.holdings;
  const assets = s.cash + h.savings + h.index + h.bond + h.stock + h.crypto + h.mpf + h.property + insuranceSurrenderValue(s.insurance);
  return assets - totalDebt(s);
}

/** Months the player could live on liquid money (cash + savings) with zero income. */
export function runway(s: GameState): number {
  const spend = Math.max(1, monthlyExpense(s));
  return Math.max(0, (s.cash + s.holdings.savings) / spend);
}

export function resolveAmount(s: GameState, a: Amount | undefined): number {
  if (a === undefined) return 0;
  if (typeof a === 'number') return a;
  const base = (() => {
    switch (a.of) {
      case 'monthlyIncome': return Math.max(monthlyIncome(s), s.job === 'student' ? HK.pay.partTimeMonthly : HK.pay.gradStart.mid * 0.6);
      case 'monthlyExpense': return monthlyExpense(s);
      case 'cash': return Math.max(0, s.cash);
      case 'holding': return a.asset === 'insurance' ? insuranceSurrenderValue(s.insurance) : a.asset ? s.holdings[a.asset] : 0;
      case 'debt': return totalDebt(s, (d) => !a.debt || d.kind === a.debt);
    }
  })();
  // min/max clamp the magnitude; the sign comes from x
  let mag = Math.abs(base * a.x);
  if (a.min !== undefined) mag = Math.max(mag, a.min);
  if (a.max !== undefined) mag = Math.min(mag, a.max);
  return Math.round(a.x < 0 ? -mag : mag);
}

/** Fixed monthly instalment for an amortising loan. */
export function instalment(balance: number, rate: number, years: number): number {
  const n = years * 12;
  const r = rate / 12;
  if (r === 0) return balance / n;
  return (balance * r) / (1 - Math.pow(1 + r, -n));
}

export function cardLimit(s: GameState): number {
  return s.job === 'student' ? CONFIG.studentCardLimit : Math.max(CONFIG.studentCardLimit, s.salary * CONFIG.cardLimitMonths);
}
