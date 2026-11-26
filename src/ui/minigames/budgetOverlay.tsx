import { BUDGET_SECONDS, budgetRate, budgetSpent, type BudgetState } from './budgetState';
import { miniText } from './text';
import type { OverlayProps } from './types';

export function BudgetOverlay({ s, lang }: OverlayProps<BudgetState>) {
  const t = (key: string, vars?: Record<string, number>) => miniText(lang, key, vars);
  return (
    <div className="ml-mini__hud">
      <div className="ml-mini__stats">
        <span>{t('mini.budget.income', { n: s.income })}</span>
        <span>{t('mini.budget.spent', { n: budgetSpent(s) })}</span>
        <span>{t('mini.budget.rate', { pct: Math.round(budgetRate(s) * 100) })}</span>
      </div>
      <div className="ml-mini__timer" role="img" aria-label={`${Math.max(0, Math.ceil(BUDGET_SECONDS - s.t))}s`}>
        <div className="ml-mini__timer-fill" style={{ width: `${Math.max(0, 1 - s.t / BUDGET_SECONDS) * 100}%` }} />
      </div>
    </div>
  );
}
