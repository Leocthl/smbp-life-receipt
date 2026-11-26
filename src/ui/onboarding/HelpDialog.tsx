import { useEffect, useRef } from 'react';
import { useI18n } from '../i18nContext';
import './onboarding.css';

const TERMS = ['cash', 'networth', 'runway', 'mood', 'hex', 'mpf', 'etf'] as const;

/** The "?" panel: how to play and a short glossary. A native modal dialog, so focus is trapped and Esc closes it. */
export function HelpDialog({ onClose, onReplay }: { onClose: () => void; onReplay: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref} className="ml-help" data-testid="help-dialog" aria-labelledby="ml-help-title"
      onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ml-help__head">
        <h2 id="ml-help-title">{t('juice.help.title')}</h2>
        <button type="button" className="ml-btn ml-help__close" data-testid="help-close" onClick={onClose} autoFocus>{t('juice.help.close')}</button>
      </div>
      <div className="ml-help__body">
        <h3>{t('juice.help.how')}</h3>
        <ol className="ml-help__how">
          {[1, 2, 3, 4].map((i) => <li key={i}>{t(`juice.help.how.${i}`)}</li>)}
        </ol>
        <h3>{t('juice.help.words')}</h3>
        <dl className="ml-help__terms">
          {TERMS.map((k) => (
            <div key={k}><dt>{t(`juice.gl.${k}`)}</dt><dd>{t(`juice.gl.${k}.def`)}</dd></div>
          ))}
        </dl>
        <button type="button" className="ml-btn ml-help__replay" data-testid="help-replay" onClick={onReplay}>{t('juice.help.replay')}</button>
      </div>
    </dialog>
  );
}
