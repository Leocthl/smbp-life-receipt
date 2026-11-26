import { useState } from 'react';
import type { SpotId } from '../world3d/contracts';
import { PixelIcon } from './components/PixelIcon';
import { ICONS } from './components/sprites';
import { useI18n } from './i18nContext';
import './flow.css';

/** A finger-first device (no hover, coarse pointer): it gets the joystick hint, everyone else the keys. */
const isTouch = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

/** The slip while the player walks to the place a decision is about: small, so the world stays in view. */
export function WalkPrompt({ spot, onSkip }: { spot: SpotId; onSkip(): void }) {
  const { t } = useI18n();
  const [touch] = useState(isTouch);
  return (
    <section className="ml-flow-walk" data-testid="walk" aria-live="polite">
      <span className="ml-flow-walk__pin" role="img" aria-label={t('flow.walk.target')}><PixelIcon sprite={ICONS.pin} scale={4} /></span>
      <p className="ml-flow-walk__text">{t('flow.walk.prompt', { spot: t(`stage.spot.${spot}`) })}</p>
      <p className="ml-flow-walk__hint">{t(touch ? 'flow.walk.hintTouch' : 'flow.walk.hintKeys')}</p>
      <button type="button" className="ml-btn ml-flow-walk__skip" data-testid="walk-skip" onClick={onSkip}>{t('flow.walk.skip')}</button>
    </section>
  );
}
