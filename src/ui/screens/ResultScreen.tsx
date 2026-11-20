import type { Card } from '../../engine/events';
import type { ChoiceResult, GameState } from '../../engine/types';
import { Line, Receipt } from '../components/Receipt';
import { moodFor, Vignette } from '../components/Vignette';
import { signed } from '../format';
import { useI18n } from '../i18nContext';
import { currentEvent } from '../session';
import { textVars } from './CardScreen';

const NOTICE_KEYS = ['auto_borrow', 'scheme_borrow', 'bankrupt', 'cannot_afford_property', 'no_cash_to_invest', 'forced_sale'];

export function ResultScreen({ state, card, result, onNext }: { state: GameState; card: Card; result: ChoiceResult; onNext: () => void }) {
  const { t, lang } = useI18n();
  const ev = currentEvent(card);
  const choice = ev.choices.find((c) => c.id === result.choiceId)!;
  const vars = textVars(state, lang);
  const base = `ev.${ev.id}.${choice.id}`;
  const d = result.delta;
  const notices = [...new Set(result.notices.map((n) => n.split(':')[0]))].filter((n) => NOTICE_KEYS.includes(n));
  const monthly = d.monthly ?? 0;
  const quiet = d.cash === 0 && d.happiness === 0 && d.relationships === 0 && monthly === 0;
  return (
    <Receipt testId="result" stamp={t('result.stamp')}>
      <Vignette speaker={ev.speaker} mood={moodFor(choice.tags)} picked />
      <p className="ml-result__choice">{t(base, vars)}</p>
      {result.outcomeId && <p className="ml-result__outcome" data-testid="outcome">{t(`${base}.${result.outcomeId}`, vars)}</p>}
      <div className="ml-result__lines" aria-live="polite">
        {d.cash !== 0 && <Line label={t('result.cash')} value={signed(d.cash, lang)} tone={d.cash > 0 ? 'up' : 'down'} />}
        {d.happiness !== 0 && <Line label={t('result.happiness')} value={`${d.happiness > 0 ? '+' : ''}${d.happiness}`} tone={d.happiness > 0 ? 'up' : 'down'} />}
        {d.relationships !== 0 && <Line label={t('result.relationships')} value={`${d.relationships > 0 ? '+' : ''}${d.relationships}`} tone={d.relationships > 0 ? 'up' : 'down'} />}
        {monthly !== 0 && <Line label={t('result.monthly')} value={`${signed(monthly, lang)}${t('perMonth')}`} tone={monthly > 0 ? 'up' : 'down'} />}
        {quiet && <Line label={t('result.nothing')} value="" />}
      </div>
      {result.reveals.map((r) => (
        <p key={r} className="ml-card__reveal" data-testid="reveal"><strong>{t('card.reveal')}</strong> {t(`trait.${r}`)}</p>
      ))}
      {notices.map((n) => <p key={n} className="ml-result__notice">{t(`notice.${n}`)}</p>)}
      <p className="ml-result__why">{t(`${base}.why`, vars)}</p>
      <button type="button" className="ml-btn ml-btn--primary" data-testid="next" onClick={onNext} autoFocus>{t('result.next')}</button>
    </Receipt>
  );
}
