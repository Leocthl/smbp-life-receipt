import type { SpotId } from '../world3d/contracts';
import { useI18n } from './i18nContext';
import './flow.css';

/** The slip while the player walks to the place a decision is about: small, so the world stays in view. */
export function WalkPrompt({ spot, onSkip }: { spot: SpotId; onSkip(): void }) {
  const { t } = useI18n();
  return (
    <section className="ml-flow-walk" data-testid="walk" aria-live="polite">
      <p className="ml-flow-walk__text">{t('flow.walk.prompt', { spot: t(`stage.spot.${spot}`) })}</p>
      <p className="ml-flow-walk__hint">{t('flow.walk.hint')}</p>
      <button type="button" className="ml-btn ml-flow-walk__skip" data-testid="walk-skip" onClick={onSkip}>{t('flow.walk.skip')}</button>
    </section>
  );
}
