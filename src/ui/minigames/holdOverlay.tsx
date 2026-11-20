import type { PointerEvent } from 'react';
import { holdValue, type HoldState } from './holdState';
import { miniText } from './text';
import type { OverlayProps } from './types';

export function HoldOverlay({ s, lang, send }: OverlayProps<HoldState>) {
  const t = (key: string, vars?: Record<string, number>) => miniText(lang, key, vars);
  const press = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    send({ hold: true });
  };
  const release = () => send({ hold: false });
  return (
    <div className="ml-mini__hud">
      <div className="ml-mini__stats">
        <span>{t(s.inMarket ? 'mini.hold.in' : 'mini.hold.out')}</span>
        <span>{t('mini.hold.value', { v: Math.round(holdValue(s)) })}</span>
      </div>
      <button
        type="button"
        className={s.inMarket ? 'ml-mini__btn ml-mini__hold is-on' : 'ml-mini__btn ml-mini__hold'}
        onPointerDown={press}
        onPointerUp={release}
        onPointerCancel={release}
        onContextMenu={(e) => e.preventDefault()}
      >
        {t('mini.hold.button')}
      </button>
    </div>
  );
}
