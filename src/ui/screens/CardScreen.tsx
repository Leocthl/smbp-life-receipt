import { useEffect, useState } from 'react';
import { availableChoices, type Card } from '../../engine/events';
import { totalDebt } from '../../engine/finance';
import type { GameState, Literacy } from '../../engine/types';
import { ChoiceButton } from '../components/ChoiceButton';
import { Portrait } from '../components/Portrait';
import { Receipt } from '../components/Receipt';
import { choiceCost, SPEAKER_HUE, tagKey } from '../components/tags';
import { ageLabel, money } from '../format';
import { useI18n } from '../i18nContext';
import { currentEvent } from '../session';

const RANK: Record<Literacy, number> = { low: 0, medium: 1, high: 2 };

export function textVars(s: GameState, lang: 'zh' | 'en') {
  return {
    cardDebt: money(totalDebt(s, (d) => d.kind === 'creditCard'), lang),
    cash: money(s.cash, lang),
    salary: money(s.salary, lang),
    age: ageLabel(s.age),
    rent: money(s.expenses.rent, lang),
  };
}

export function termLabel(s: GameState, t: (k: string, v?: Record<string, string | number>) => string) {
  return s.turn < 8 ? t('term.sem', { age: ageLabel(s.age), n: s.turn + 1 }) : t('term.year', { age: ageLabel(s.age) });
}

/** One decision slip: who is talking, what they say, then pixel buttons. Tap one to select it, then confirm. */
export function CardScreen({ state, card, onChoose }: { state: GameState; card: Card; onChoose: (id: string) => void }) {
  const { t, lang } = useI18n();
  const ev = currentEvent(card);
  const choices = availableChoices(state, ev);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => setSelected(null), [card]);
  const lit = state.character.hidden.literacy;
  const vars = textVars(state, lang);
  const textKey = ev.jargon && lit === 'low' ? `ev.${ev.id}.textLow` : `ev.${ev.id}.text`;

  return (
    <Receipt testId="card">
      <div className="ml-card__head">
        <Portrait speaker={ev.speaker} />
        <div className="ml-card__who">
          <span className="ml-plate" data-hue={SPEAKER_HUE[ev.speaker]}>{t(`speaker.${ev.speaker}`)}</span>
          <span className="ml-card__term">{termLabel(state, t)}</span>
        </div>
      </div>
      {card.reveal && (
        <p className="ml-card__reveal" data-testid="reveal"><strong>{t('card.reveal')}</strong> {t(`trait.${card.reveal}`)}</p>
      )}
      <p className="ml-card__text" data-testid="card-text" data-hue={SPEAKER_HUE[ev.speaker]}>{t(textKey, vars)}</p>
      <div className="ml-card__choices" role="group" aria-label={t('card.choose')}>
        {choices.map((c) => {
          const on = c.id === selected;
          const showHint = on && c.literacyHint && RANK[lit] >= RANK[c.literacyHint];
          const showFine = on && c.hidden && lit === 'high';
          const cost = choiceCost(state, c);
          return (
            <ChoiceButton
              key={c.id}
              tag={tagKey(c.tags)}
              on={on}
              testId={`choice-${c.id}`}
              onClick={() => setSelected(c.id)}
              cost={cost > 0 ? money(cost, lang, true) : undefined}
              costLabel={cost > 0 ? t('card.cost', { n: money(cost, lang) }) : undefined}
            >
              <span className="ml-choice__label">{t(`ev.${ev.id}.${c.id}`, vars)}</span>
              {showHint && <span className="ml-choice__hint">{t(`ev.${ev.id}.${c.id}.hint`, vars)}</span>}
              {showFine && <span className="ml-choice__hint">{t(`ev.${ev.id}.${c.id}.fine`, vars)}</span>}
            </ChoiceButton>
          );
        })}
      </div>
      <button type="button" className="ml-btn ml-btn--primary" data-testid="confirm" disabled={!selected} onClick={() => selected && onChoose(selected)}>
        {selected ? t('card.pick') : t('card.choose')}
      </button>
    </Receipt>
  );
}
