import { useEffect, useState } from 'react';
import { availableChoices, type Card } from '../../engine/events';
import { totalDebt } from '../../engine/finance';
import type { GameState, Literacy } from '../../engine/types';
import { Receipt } from '../components/Receipt';
import { moodFor, Vignette } from '../components/Vignette';
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

/** One decision card: tap a choice to highlight it (the vignette reacts), then confirm. */
export function CardScreen({ state, card, onChoose }: { state: GameState; card: Card; onChoose: (id: string) => void }) {
  const { t, lang } = useI18n();
  const ev = currentEvent(card);
  const choices = availableChoices(state, ev);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => setSelected(null), [card]);
  const lit = state.character.hidden.literacy;
  const vars = textVars(state, lang);
  const textKey = ev.jargon && lit === 'low' ? `ev.${ev.id}.textLow` : `ev.${ev.id}.text`;
  const chosen = choices.find((c) => c.id === selected);

  return (
    <Receipt testId="card">
      <div className="ml-card__head">
        <span className="ml-card__speaker">{t(`speaker.${ev.speaker}`)}</span>
        <span className="ml-card__term">{termLabel(state, t)}</span>
      </div>
      <Vignette speaker={ev.speaker} mood={moodFor(chosen?.tags)} picked={false} />
      {card.reveal && (
        <p className="ml-card__reveal" data-testid="reveal"><strong>{t('card.reveal')}</strong> {t(`trait.${card.reveal}`)}</p>
      )}
      <p className="ml-card__text" data-testid="card-text">{t(textKey, vars)}</p>
      <div className="ml-card__rule" aria-hidden="true" />
      <div className="ml-card__choices" role="group" aria-label={t('card.choose')}>
        {choices.map((c) => {
          const on = c.id === selected;
          const showHint = on && c.literacyHint && RANK[lit] >= RANK[c.literacyHint];
          const showFine = on && c.hidden && lit === 'high';
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              className={`ml-choice${on ? ' ml-choice--on' : ''}`}
              data-testid={`choice-${c.id}`}
              onClick={() => setSelected(c.id)}
            >
              <span className="ml-choice__label">{t(`ev.${ev.id}.${c.id}`, vars)}</span>
              {showHint && <span className="ml-choice__hint">{t(`ev.${ev.id}.${c.id}.hint`, vars)}</span>}
              {showFine && <span className="ml-choice__hint">{t(`ev.${ev.id}.${c.id}.fine`, vars)}</span>}
            </button>
          );
        })}
      </div>
      <button type="button" className="ml-btn ml-btn--primary" data-testid="confirm" disabled={!selected} onClick={() => selected && onChoose(selected)}>
        {selected ? t('card.pick') : t('card.choose')}
      </button>
    </Receipt>
  );
}
