import { QUALITIES, type Quality, type Qualities } from '../../world3d/qualities';
import { useI18n } from '../i18nContext';
import { summarize } from './geometry';
import { RadarShape } from './RadarShape';
import './hex.css';

export interface HexRadarProps {
  values: Qualities;
  /** the shape before the decision: drawn dashed behind the current one */
  previous?: Qualities;
  size?: number;
}

/** The six qualities as a labelled hexagon. */
export function HexRadar({ values, previous, size = 280 }: HexRadarProps) {
  const { t } = useI18n();
  const names = Object.fromEntries(QUALITIES.map((q) => [q, t(`hex.q.${q}`)])) as Record<Quality, string>;
  const label = t('hex.aria', { list: summarize(values, (q) => names[q]) });
  return (
    <figure className="ml-hex">
      <RadarShape values={values} previous={previous} size={size} label={label} names={names} />
      {previous && <figcaption className="ml-hex__legend">{t('hex.legend')}</figcaption>}
    </figure>
  );
}
