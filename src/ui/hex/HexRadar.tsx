import { QUALITIES, type Quality, type Qualities } from '../../world3d/qualities';
import { useI18n } from '../i18nContext';
import { summarize } from './geometry';
import { RadarShape } from './RadarShape';
import './hex.css';

export interface HexRadarProps {
  values: Qualities;
  /** the shape before the decision: drawn dashed behind the current one */
  previous?: Qualities;
  /** viewBox width in px; the chart fills its container up to `max` and the labels scale with it */
  size?: number;
  /** widest the chart gets on screen, px */
  max?: number;
}

/** The six qualities as a labelled hexagon, with a legend that names the solid and the dashed shape. */
export function HexRadar({ values, previous, size = 340, max = 440 }: HexRadarProps) {
  const { t } = useI18n();
  const names = Object.fromEntries(QUALITIES.map((q) => [q, t(`hex.q.${q}`)])) as Record<Quality, string>;
  const label = t('hex.aria', { list: summarize(values, (q) => names[q]) });
  return (
    <figure className="ml-hex" style={{ ['--ml-hex-max' as string]: `${max}px` }}>
      <RadarShape values={values} previous={previous} size={size} label={label} names={names} />
      {previous && (
        <figcaption className="ml-hex__legend" aria-label={t('hex.legend')}>
          <span className="ml-hex__key"><i className="ml-hex__swatch ml-hex__swatch--now" aria-hidden="true" />{t('hex.legend.now')}</span>
          <span className="ml-hex__key"><i className="ml-hex__swatch ml-hex__swatch--before" aria-hidden="true" />{t('hex.legend.before')}</span>
        </figcaption>
      )}
    </figure>
  );
}
