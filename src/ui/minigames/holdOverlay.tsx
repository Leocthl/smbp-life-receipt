import type { PointerEvent } from 'react';
import { HOLD_SECONDS, holdBench, holdValue, type HoldState } from './holdState';
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
        <span className="ml-mini__big">{t('mini.hold.you', { v: Math.round(holdValue(s)) })}</span>
        <span className="ml-mini__big ml-mini__muted">{t('mini.hold.bh', { v: Math.round(holdBench(s)) })}</span>
      </div>
      <div className="ml-mini__timer" role="img" aria-label={`${Math.max(0, Math.ceil(HOLD_SECONDS - s.t))}s`}>
        <div className="ml-mini__timer-fill" style={{ width: `${Math.max(0, 1 - s.t / HOLD_SECONDS) * 100}%` }} />
      </div>
      <p className="ml-mini__verdict">{t(s.inMarket ? 'mini.hold.in' : 'mini.hold.out')}</p>
      <button
        type="button"
        className={s.inMarket ? 'ml-mini__btn ml-mini__pix ml-mini__hold is-on' : 'ml-mini__btn ml-mini__pix ml-mini__hold'}
        onPointerDown={press}
        onPointerUp={release}
        onPointerCancel={release}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="ml-mini__hold-main">{t('mini.hold.button')}</span>
        <span className="ml-mini__hold-sub">{t('mini.hold.buttonSub')}</span>
      </button>
    </div>
  );
}
