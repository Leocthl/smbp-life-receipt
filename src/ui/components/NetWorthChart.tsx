import type { TurnRecord } from '../../engine/types';
import { money } from '../format';
import { useI18n } from '../i18nContext';

/** Net worth over age as a pixel staircase: each year holds its level until the next one. */
export function NetWorthChart({ history }: { history: TurnRecord[] }) {
  const { t, lang } = useI18n();
  const W = 300, H = 110, pad = 6;
  const vals = history.map((h) => h.netWorth);
  const max = Math.max(1, ...vals), min = Math.min(0, ...vals);
  const x = (age: number) => pad + ((age - 18) / 47) * (W - 2 * pad);
  const y = (v: number) => H - pad - ((v - min) / (max - min)) * (H - 2 * pad);
  const pts = history.flatMap((h, i) => {
    const px = x(h.age).toFixed(1);
    const prev = history[i - 1];
    return prev ? [`${px},${y(prev.netWorth).toFixed(1)}`, `${px},${y(h.netWorth).toFixed(1)}`] : [`${px},${y(h.netWorth).toFixed(1)}`];
  }).join(' ');
  return (
    <figure className="ml-chart">
      <figcaption className="ml-summary__sub">{t('ending.chart')}</figcaption>
      <svg viewBox={`0 0 ${W} ${H + 20}`} role="img" aria-label={`${t('ending.chart')}: ${money(vals.at(-1) ?? 0, lang, true)}`} shapeRendering="crispEdges">
        <rect x={pad} y={pad} width={W - 2 * pad} height={H - 2 * pad} fill="var(--ml-sky-soft)" />
        <line x1={pad} x2={W - pad} y1={y(0)} y2={y(0)} stroke="var(--ml-line)" strokeWidth="2" strokeDasharray="4 4" />
        <polyline points={pts} fill="none" stroke="var(--ml-ink)" strokeWidth="6" strokeLinejoin="miter" />
        <polyline points={pts} fill="none" stroke="var(--ml-turquoise)" strokeWidth="3" strokeLinejoin="miter" />
        {[18, 30, 45, 65].map((a) => <text key={a} x={x(a)} y={H + 16} fontSize="12" textAnchor="middle" fill="var(--ml-muted)">{a}</text>)}
        <text x={W - pad} y={18} fontSize="12" textAnchor="end" fill="var(--ml-muted)">{money(max, lang, true)}</text>
      </svg>
    </figure>
  );
}
