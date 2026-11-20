import type { TurnRecord } from '../../engine/types';
import { money } from '../format';
import { useI18n } from '../i18nContext';

/** Net worth over age, drawn like a till-roll graph. */
export function NetWorthChart({ history }: { history: TurnRecord[] }) {
  const { t, lang } = useI18n();
  const W = 300, H = 110, pad = 6;
  const vals = history.map((h) => h.netWorth);
  const max = Math.max(1, ...vals), min = Math.min(0, ...vals);
  const x = (age: number) => pad + ((age - 18) / 47) * (W - 2 * pad);
  const y = (v: number) => H - pad - ((v - min) / (max - min)) * (H - 2 * pad);
  const pts = history.map((h) => `${x(h.age).toFixed(1)},${y(h.netWorth).toFixed(1)}`).join(' ');
  return (
    <figure className="ml-chart">
      <figcaption className="ml-summary__sub">{t('ending.chart')}</figcaption>
      <svg viewBox={`0 0 ${W} ${H + 16}`} role="img" aria-label={`${t('ending.chart')}: ${money(vals.at(-1) ?? 0, lang, true)}`}>
        <line x1={pad} x2={W - pad} y1={y(0)} y2={y(0)} stroke="var(--ml-faint)" strokeDasharray="3 3" />
        <polyline points={pts} fill="none" stroke="var(--ml-ink)" strokeWidth="2.2" strokeLinejoin="round" />
        {[18, 30, 45, 65].map((a) => <text key={a} x={x(a)} y={H + 13} fontSize="10" textAnchor="middle" fill="var(--ml-muted)">{a}</text>)}
        <text x={W - pad} y={12} fontSize="10" textAnchor="end" fill="var(--ml-muted)">{money(max, lang, true)}</text>
      </svg>
    </figure>
  );
}
