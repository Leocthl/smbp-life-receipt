import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { translate } from '../i18n';
import { qualities } from '../world3d/qualities';
import { textVars } from './chat/chatVars';
import { DecisionTrail, type TrailEntry as HexEntry } from './hex/DecisionTrail';
import { HexBadge } from './hex/HexBadge';
import { HexRadar } from './hex/HexRadar';
import { I18nProvider, useI18n } from './i18nContext';
import type { Session } from './session';
import './flow.css';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** The decisions as DecisionTrail rows. `turn` is made unique per row because a year can hold several decisions. */
export function trailRows(trail: Session['trail']): HexEntry[] {
  return trail.map((e, i) => ({ turn: i + 1, age: e.age, titleKey: `ev.${e.eventId}.text`, choiceKey: `ev.${e.eventId}.${e.choiceId}`, before: e.before, after: e.after }));
}

function Dialog({ session, onClose }: { session: Session; onClose(): void }) {
  const { t, lang } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => trailRows(session.trail), [session.trail]);
  // event texts carry {cash}-style placeholders: fill them like the cards do
  const filled = useMemo(() => {
    const vars = textVars(session.state, lang);
    return { lang, t: (k: string, v: Record<string, string | number> = {}) => translate(lang, k, { ...vars, ...v }) };
  }, [session.state, lang]);

  useEffect(() => { box.current?.querySelector<HTMLElement>('button')?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab' || !box.current) return;
      const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => !x.hasAttribute('disabled'));
      const first = items[0], last = items[items.length - 1];
      if (!first || !last) return;
      if (!box.current.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="ml-flow-hexdim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ml-flow-hexpanel" role="dialog" aria-modal="true" aria-label={t('flow.hex.title')} ref={box} data-testid="hex-panel">
        <div className="ml-flow-hexpanel__head">
          <h2 className="ml-flow-hexpanel__title">{t('flow.hex.title')}</h2>
          <button type="button" className="ml-btn ml-flow-hexpanel__close" data-testid="hex-close" onClick={onClose}>{t('flow.hex.close')}</button>
        </div>
        <div className="ml-flow-hexpanel__body">
          <HexRadar values={qualities(session.state)} previous={session.yearStart} size={260} />
          <I18nProvider value={filled}><DecisionTrail entries={rows} /></I18nProvider>
        </div>
      </div>
    </div>
  );
}

/** The six-quality badge for the HUD; tapping it opens the full hexagon and the trail of every decision. */
export function HexButton({ session }: { session: Session }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => { setOpen(false); opener.current?.focus(); }, []);
  return (
    <>
      <button type="button" ref={opener} className="ml-flow-hexbtn" data-testid="hex-open" aria-haspopup="dialog" aria-label={t('flow.hex.open')} onClick={() => setOpen(true)}>
        <HexBadge values={qualities(session.state)} />
      </button>
      {open && <Dialog session={session} onClose={close} />}
    </>
  );
}
