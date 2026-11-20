import { budgetRate, budgetSpent, type BudgetState } from './budgetState';
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
    </div>
  );
}
