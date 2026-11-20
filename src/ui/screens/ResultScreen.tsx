import type { Card } from '../../engine/events';
import type { ChoiceResult, GameState } from '../../engine/types';
import { Portrait } from '../components/Portrait';
import { Line, Receipt } from '../components/Receipt';
import { ICONS } from '../components/sprites';
import { SPEAKER_HUE } from '../components/tags';
import { signed } from '../format';
import { useI18n } from '../i18nContext';
import { currentEvent } from '../session';
import { textVars } from './CardScreen';

const NOTICE_KEYS = ['auto_borrow', 'scheme_borrow', 'bankrupt', 'cannot_afford_property', 'no_cash_to_invest', 'forced_sale'];
const tone = (n: number) => (n > 0 ? 'up' : 'down');
const plus = (n: number) => `${n > 0 ? '+' : ''}${n}`;

/** What your choice did: a stamp lands on the slip, then the lines that changed. */
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
      <div className="ml-card__head">
        <Portrait speaker={ev.speaker} />
        <p className="ml-result__choice" data-hue={SPEAKER_HUE[ev.speaker]}>{t(base, vars)}</p>
      </div>
      {result.outcomeId && <p className="ml-result__outcome" data-testid="outcome">{t(`${base}.${result.outcomeId}`, vars)}</p>}
      <div className="ml-result__lines" aria-live="polite">
        {d.cash !== 0 && <Line icon={ICONS.coin} label={t('result.cash')} value={signed(d.cash, lang)} tone={tone(d.cash)} />}
        {d.happiness !== 0 && <Line icon={ICONS.heart} label={t('result.happiness')} value={plus(d.happiness)} tone={tone(d.happiness)} />}
        {d.relationships !== 0 && <Line icon={ICONS.people} label={t('result.relationships')} value={plus(d.relationships)} tone={tone(d.relationships)} />}
        {monthly !== 0 && <Line label={t('result.monthly')} value={`${signed(monthly, lang)}${t('perMonth')}`} tone={tone(monthly)} />}
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
