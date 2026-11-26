import { useEffect, useRef } from 'react';
import { Mascot } from '../mascot/Mascot';
import type { Emote } from '../mascot/emotes';
import { useI18n } from '../i18nContext';
import './onboarding.css';

export const STEPS = 3;
const EMOTES: readonly Emote[] = ['happy', 'curious', 'proud'];
/** the tutorial lifts the top bar above its dimmer on this step, so the numbers it names are lit */
export const HUD_STEP = 1;

/** Slip's three-beat intro: what the game is, what the numbers mean, how to play. Skippable at every step. */
export function Onboarding({ step, onStep, onDone }: { step: number; onStep: (n: number) => void; onDone: () => void }) {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const last = step === STEPS - 1;
  const n = step + 1;

  useEffect(() => { box.current?.querySelector<HTMLElement>('[data-primary]')?.focus(); }, [step]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onDone(); return; }
      if (e.key !== 'Tab' || !box.current) return;
      const items = [...box.current.querySelectorAll<HTMLElement>('button')];
      const first = items[0], end = items[items.length - 1];
      if (!box.current.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); end.focus(); }
      else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDone]);

  return (
    <div className="ml-onb" data-step={step}>
      <div className="ml-onb__card" role="dialog" aria-modal="true" aria-labelledby="ml-onb-title" data-testid="onboarding" ref={box}>
        <div className="ml-onb__top">
          <div className="ml-onb__face"><Mascot emote={EMOTES[step] ?? 'happy'} emoteKey={step} talking label={t(`mascot.mood.${EMOTES[step] ?? 'happy'}`)} /></div>
          <div className="ml-onb__who">
            <span className="ml-onb__name">{t('mascot.name')}</span>
            <h2 className="ml-onb__title" id="ml-onb-title">{t(`juice.onb.${n}.title`)}</h2>
            <span className="ml-onb__pips" role="img" aria-label={t('juice.onb.step', { n, total: STEPS })}>
              {Array.from({ length: STEPS }, (_, i) => <i key={i} className={i === step ? 'is-on' : ''} />)}
            </span>
          </div>
        </div>
        <p className="ml-onb__text" aria-live="polite">{t(`juice.onb.${n}.text`)}</p>
        <div className="ml-onb__btns">
          <button type="button" className="ml-btn ml-onb__skip" data-testid="onboarding-skip" onClick={onDone}>{t('juice.onb.skip')}</button>
          <button type="button" className="ml-btn ml-btn--primary" data-primary data-testid="onboarding-next" onClick={last ? onDone : () => onStep(step + 1)}>
            {t(last ? 'juice.onb.go' : 'juice.onb.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
