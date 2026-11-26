import type { GameState, TurnSummary } from '../../engine/types';
import { PixelIcon } from '../components/PixelIcon';
import { Line, Receipt } from '../components/Receipt';
import { ICONS } from '../components/sprites';
import { WEATHER } from '../components/weather';
import { ageLabel, money, signed } from '../format';
import { useI18n } from '../i18nContext';
import './screens.css';

const NOTICE_KEYS = ['auto_borrow', 'scheme_borrow', 'card_restructure', 'belt_tighten', 'went_without', 'bankrupt', 'mpf_withdrawn', 'forced_sale', 'delayed'];

/** Year-end receipt: the only place the portfolio is shown unless showPortfolioLive is on. */
export function SummaryScreen({ state, summary, onNext }: { state: GameState; summary: TurnSummary; onNext: () => void }) {
  const { t, lang } = useI18n();
  const assets = Object.entries(summary.portfolio).filter(([, v]) => v > 0.5);
  // loans of the same kind and rate share one line (a life can hold several tranches)
  const debts = Object.values(summary.debts.reduce<Record<string, TurnSummary['debts'][number]>>((acc, x) => {
    const k = `${x.kind}-${x.rate}`;
    return { ...acc, [k]: { ...x, balance: (acc[k]?.balance ?? 0) + x.balance } };
  }, {}));
  const other = summary.cashChange - summary.income + summary.spending;
  const notices = [...new Set(summary.notices.map((n) => n.split(':')[0]))].filter((n) => NOTICE_KEYS.includes(n));
  return (
    <Receipt
      testId="summary"
      className="ml-summary"
      foot={(
        <button type="button" className="ml-btn ml-btn--primary" data-testid="summary-next" onClick={onNext} autoFocus>
          {state.done ? t('result.next') : t('summary.next')}
        </button>
      )}
    >
      <h2 className="ml-summary__title">{t('summary.title', { age: ageLabel(summary.age) })}</h2>
      <p className="ml-summary__market" data-regime={summary.regime}>
        <PixelIcon sprite={WEATHER[summary.regime]} scale={3} />
        <span>{t('summary.market', { regime: t(`regime.${summary.regime}`) })}</span>
      </p>
      <Line label={t('summary.income')} value={money(summary.income, lang)} />
      <Line label={t('summary.spending')} value={money(-summary.spending, lang)} />
      {/* the rest of the cash movement, so the receipt adds up */}
      {Math.abs(other) > 1 && <Line label={t('summary.other')} value={signed(other, lang)} />}
      <Line icon={ICONS.coin} label={t('summary.cashChange')} value={signed(summary.cashChange, lang)} strong tone={summary.cashChange >= 0 ? 'up' : 'down'} />
      {/* not cash: fees come out of the investments, interest is added to the debts */}
      {summary.fees > 1 && <Line label={t('summary.fees')} value={money(-summary.fees, lang)} />}
      {summary.interest > 1 && <Line label={t('summary.interest')} value={money(-summary.interest, lang)} />}
      <h3 className="ml-summary__sub">{t('summary.portfolio')}</h3>
      {assets.length === 0 && <p className="ml-empty">{t('summary.noAssets')}</p>}
      {assets.map(([k, v]) => <Line key={k} label={t(`asset.${k}`)} value={money(v, lang)} />)}
      <h3 className="ml-summary__sub">{t('summary.debts')}</h3>
      {summary.debts.length === 0 && <p className="ml-empty">{t('summary.noDebt')}</p>}
      {debts.map((x) => <Line key={`${x.kind}-${x.rate}`} label={`${t(`debt.${x.kind}`)} ${(x.rate * 100).toFixed(1)}%`} value={money(-x.balance, lang)} tone="down" />)}
      {[...new Set(summary.reveals)].map((r) => (
        <p key={r} className="ml-card__reveal" data-testid="reveal"><strong>{t('card.reveal')}</strong> {t(`trait.${r}`)}</p>
      ))}
      {notices.map((n) => <p key={n} className="ml-result__notice">{t(`notice.${n}`)}</p>)}
    </Receipt>
  );
}
