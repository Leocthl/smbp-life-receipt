import { useEffect } from 'react';
import { PixelIcon } from '../components/PixelIcon';
import { ICONS } from '../components/sprites';
import { useI18n } from '../i18nContext';
import type { Toast } from './useJuice';
import './juice.css';

const SHOW_MS = 3200;
const SPARKS = 14;
const ICON_FOR: Record<Toast['id'], keyof typeof ICONS> = { nw100k: 'gem', nw1m: 'gem', firstHome: 'sun', debtFree: 'heart' };

/** A pixel burst: squares flying out on fixed angles (pure CSS, decorative). */
function Sparkles() {
  return (
    <span className="ml-toast__sparks" aria-hidden="true">
      {Array.from({ length: SPARKS }, (_, i) => {
        const a = (i / SPARKS) * Math.PI * 2;
        const d = 54 + (i % 3) * 22;
        return <i key={i} style={{ '--dx': `${Math.round(Math.cos(a) * d)}px`, '--dy': `${Math.round(Math.sin(a) * d * 0.7)}px` } as React.CSSProperties} />;
      })}
    </span>
  );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: (key: number) => void }) {
  const { t } = useI18n();
  useEffect(() => {
    const id = window.setTimeout(() => onDone(toast.key), SHOW_MS);
    return () => window.clearTimeout(id);
  }, [toast.key, onDone]);
  return (
    <button type="button" className="ml-toast" data-testid="milestone" data-quiet onClick={() => onDone(toast.key)} title={t('juice.ms.close')}>
      <Sparkles />
      <PixelIcon sprite={ICONS[ICON_FOR[toast.id]]} scale={3} />
      <span>{t(`juice.ms.${toast.id}`)}</span>
    </button>
  );
}

/** Milestone celebrations: small, tappable to dismiss, never in the way of the game underneath. */
export function Toasts({ toasts, onDone }: { toasts: Toast[]; onDone: (key: number) => void }) {
  return (
    <div className="ml-toasts" role="status" aria-live="polite">
      {toasts.map((x) => <ToastItem key={x.key} toast={x} onDone={onDone} />)}
    </div>
  );
}
