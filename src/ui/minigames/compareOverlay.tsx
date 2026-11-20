import { ROUNDS, ROUND_SECONDS, type CompareState } from './compareState';
import { miniText } from './text';
import type { OverlayProps } from './types';

export function CompareOverlay({ s, lang, send }: OverlayProps<CompareState>) {
  const t = (key: string, vars?: Record<string, number>) => miniText(lang, key, vars);
  const verdict = s.pause > 0 && s.lastOk !== null ? t(s.lastOk ? 'mini.compare.ok' : 'mini.compare.wrong') : t('mini.compare.ask');
  return (
    <div className="ml-mini__hud">
      <div className="ml-mini__stats">
        <span>{t('mini.round', { n: Math.min(s.round + 1, ROUNDS), total: ROUNDS })}</span>
        <span>{verdict}</span>
      </div>
      <div className="ml-mini__timer">
        <div className="ml-mini__timer-fill" style={{ width: `${Math.max(0, s.roundLeft) / ROUND_SECONDS * 100}%` }} />
      </div>
      <div className="ml-mini__funds" key={s.round}>
        {s.funds.map((f, i) => (
          <button key={i} type="button" className="ml-mini__fund" disabled={s.pause > 0} onClick={() => send({ pick: i })}>
            <strong>{t('mini.compare.fund.' + f.name)}</strong>
            <span>{t('mini.compare.annual', { v: f.annual })}</span>
            <span>{t('mini.compare.entry', { v: f.entry })}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
