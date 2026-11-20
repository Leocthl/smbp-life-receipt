import type { Qualities } from '../../world3d/qualities';
import { useI18n } from '../i18nContext';
import { summarize } from './geometry';
import { RadarShape } from './RadarShape';
import './hex.css';

/** A 56px mini radar for a HUD corner: no labels, the summary is the accessible name. */
export function HexBadge({ values }: { values: Qualities }) {
  const { t } = useI18n();
  const label = t('hex.aria', { list: summarize(values, (q) => t(`hex.q.${q}`)) });
  return (
    <div className="ml-hex-badge">
      <RadarShape values={values} size={56} label={label} />
    </div>
  );
}
