import type { GameState } from '../../engine/types';
import { PixelIcon } from '../components/PixelIcon';
import { Line, Receipt } from '../components/Receipt';
import { ICONS } from '../components/sprites';
import { money } from '../format';
import { useI18n } from '../i18nContext';
import './screens.css';

/** The brand lockup, the same in both languages: a chunky pixel title over a receipt-tape ribbon. */
function Logo() {
  return (
    <h1 className="ml-logo" aria-label="人生收據 Life Receipt">
      <span className="ml-logo__zh" aria-hidden="true">人生收據</span>
      <span className="ml-logo__en" aria-hidden="true">
        <PixelIcon sprite={ICONS.coin} scale={2} />LIFE RECEIPT<PixelIcon sprite={ICONS.coin} scale={2} />
      </span>
    </h1>
  );
}

export function StartScreen({ seed, onStart }: { seed: number; onStart: () => void }) {
  const { t } = useI18n();
  return (
    <>
      <Logo />
      <Receipt testId="start" className="ml-start">
        <p className="ml-start__tagline">{t('app.tagline')}</p>
        <p className="ml-start__seed">{t('start.seed', { seed })}</p>
        <button type="button" className="ml-btn ml-btn--primary ml-btn--big" data-testid="start-btn" onClick={onStart} autoFocus>{t('start.new')}</button>
        <p className="ml-fine">{t('app.disclaimer')}</p>
      </Receipt>
    </>
  );
}

/** The visible starting hand: family, money, grades, obvious talent. Hidden traits stay hidden. */
export function IntroScreen({ state, onGo }: { state: GameState; onGo: () => void }) {
  const { t, lang } = useI18n();
  const c = state.character;
  return (
    <Receipt testId="intro">
      <h2 className="ml-summary__title">{t('intro.title')}</h2>
      <Line label={t('intro.family')} value={t(`intro.tier.${c.familyTier}`)} />
      <Line label={t('intro.allowance')} value={money(c.familyAllowance, lang)} />
      <Line label={t('intro.parentHelp')} value={money(c.parentHelp, lang)} />
      <Line label={t('intro.familyDebt')} value={c.familyDebt ? money(c.familyDebt, lang) : t('none')} />
      <Line label={t('intro.siblings')} value={String(c.siblingsToSupport)} />
      <Line label={t('intro.gpa')} value={c.gpa.toFixed(2)} />
      <Line label={t('intro.talent')} value={c.talents.map((x) => t(`talent.${x}`)).join(', ')} />
      <Line icon={ICONS.coin} label={t('intro.cash')} value={money(state.cash, lang)} strong />
      <p className="ml-fine">{t('intro.hidden')}</p>
      <button type="button" className="ml-btn ml-btn--primary ml-btn--big" data-testid="begin-life" onClick={onGo} autoFocus>{t('intro.go')}</button>
    </Receipt>
  );
}
