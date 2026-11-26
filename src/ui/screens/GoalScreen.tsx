import { useState } from 'react';
import { GOALS } from '../../data/endings';
import type { Goal } from '../../engine/types';
import { ChoiceButton } from '../components/ChoiceButton';
import { Receipt } from '../components/Receipt';
import type { TagKey } from '../components/tags';
import { useI18n } from '../i18nContext';
import './screens.css';

const GOAL_TAG: Record<Goal, TagKey> = { security: 'safe', freedom: 'invest', experiences: 'spend', family: 'family', status: 'status' };

/** The priority question, asked at the end so it can be compared with what the player actually did. */
export function GoalScreen({ onPick }: { onPick: (g: Goal) => void }) {
  const { t } = useI18n();
  const [goal, setGoal] = useState<Goal | null>(null);
  return (
    <Receipt
      testId="goal"
      foot={(
        <button type="button" className="ml-btn ml-btn--primary" data-testid="goal-go" disabled={!goal} onClick={() => goal && onPick(goal)}>
          {t('goalq.go')}
        </button>
      )}
    >
      <h2 className="ml-summary__title">{t('goalq.title')}</h2>
      <div className="ml-card__choices" role="group" aria-label={t('goalq.title')}>
        {GOALS.map((g) => (
          <ChoiceButton key={g} tag={GOAL_TAG[g]} on={goal === g} testId={`goal-${g}`} onClick={() => setGoal(g)}>
            <span className="ml-choice__label">{t(`goalq.${g}`)}</span>
          </ChoiceButton>
        ))}
      </div>
    </Receipt>
  );
}
