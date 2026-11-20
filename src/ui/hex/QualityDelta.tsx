import { QUALITIES, type Qualities } from '../../world3d/qualities';
import { useI18n } from '../i18nContext';
import './hex.css';

/** Chips for one decision's change, non-zero only: "財富 +6", "快樂 −3". */
export function QualityDelta({ delta }: { delta: Qualities }) {
  const { t } = useI18n();
  const moved = QUALITIES.map((q) => ({ q, d: Math.round(delta[q]) })).filter((x) => x.d !== 0);
  if (moved.length === 0) return <p className="ml-hex-delta__none">{t('hex.delta.none')}</p>;
  return (
    <ul className="ml-hex-delta" aria-label={t('hex.delta.label')}>
      {moved.map(({ q, d }) => (
        <li key={q} className={`ml-hex-chip ml-hex-chip--${d > 0 ? 'up' : 'down'}`}>
          {t(`hex.q.${q}`)} {d > 0 ? '+' : '−'}{Math.abs(d)}
        </li>
      ))}
    </ul>
  );
}
