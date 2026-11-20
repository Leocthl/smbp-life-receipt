import { useState } from 'react';
import { GOALS } from '../../data/endings';
import type { Goal } from '../../engine/types';
import { Receipt } from '../components/Receipt';
import { useI18n } from '../i18nContext';

/** The priority question, asked at the end so it can be compared with what the player actually did. */
export function GoalScreen({ onPick }: { onPick: (g: Goal) => void }) {
  const { t } = useI18n();
  const [goal, setGoal] = useState<Goal | null>(null);
  return (
    <Receipt testId="goal">
      <h2 className="ml-summary__title">{t('goalq.title')}</h2>
      <div className="ml-card__choices" role="group" aria-label={t('goalq.title')}>
        {GOALS.map((g) => (
          <button key={g} type="button" aria-pressed={goal === g} data-testid={`goal-${g}`}
            className={`ml-choice${goal === g ? ' ml-choice--on' : ''}`} onClick={() => setGoal(g)}>
            <span className="ml-choice__label">{t(`goalq.${g}`)}</span>
          </button>
        ))}
      </div>
      <button type="button" className="ml-btn ml-btn--primary" data-testid="goal-go" disabled={!goal} onClick={() => goal && onPick(goal)}>
        {t('goalq.go')}
      </button>
    </Receipt>
  );
}
