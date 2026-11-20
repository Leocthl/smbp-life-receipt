import { CONFIG } from '../../data/config';
import { riskyHoldings, runway } from '../../engine/finance';
import { turnToAge } from '../../engine/market';
import type { GameState } from '../../engine/types';
import { ageLabel, money } from '../format';
import { useI18n } from '../i18nContext';

function Meter({ value, label, testId }: { value: number; label: string; testId: string }) {
  return (
    <div className="ml-tape__cell" data-testid={testId}>
      <span className="ml-tape__label">{label}</span>
      <span className="ml-tape__meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label}>
        <span className="ml-tape__fill" style={{ transform: `scaleX(${value / 100})` }} />
      </span>
      <span className="ml-tape__num">{value}</span>
    </div>
  );
}

/** Visible stats only: cash, runway, happiness, relationships (portfolio only if the config flag is on). */
export function StatsTape({ state }: { state: GameState }) {
  const { t, lang } = useI18n();
  const rw = runway(state);
  const age = turnToAge(state.turn);
  return (
    <header className="ml-tape" aria-label={t('tape.label')}>
      <div className="ml-tape__age">{t('stat.age', { age: ageLabel(age) })}</div>
      <div className="ml-tape__cell" data-testid="stat-cash">
        <span className="ml-tape__label">{t('stat.cash')}</span>
        <span className={`ml-tape__big${state.cash < 0 ? ' ml-tape__big--neg' : ''}`}>{money(state.cash, lang, true)}</span>
      </div>
      <div className="ml-tape__cell" data-testid="stat-runway">
        <span className="ml-tape__label">{t('stat.runway')}</span>
        <span className={`ml-tape__big${rw < 1 ? ' ml-tape__big--neg' : ''}`}>{t('stat.runway.unit', { n: rw >= 99 ? '99+' : rw.toFixed(1) })}</span>
      </div>
      <Meter value={state.happiness} label={t('stat.happiness')} testId="stat-happiness" />
      <Meter value={state.relationships} label={t('stat.relationships')} testId="stat-relationships" />
      {CONFIG.showPortfolioLive && (
        <div className="ml-tape__cell">
          <span className="ml-tape__label">{t('stat.portfolio')}</span>
          <span className="ml-tape__big">{money(riskyHoldings(state) + state.holdings.savings, lang, true)}</span>
        </div>
      )}
    </header>
  );
}
