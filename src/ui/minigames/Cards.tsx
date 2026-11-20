import type { Lang } from '../../i18n';
import { miniText } from './text';
import type { MiniGameId, MiniGameResult } from './types';

export function IntroCard({ lang, id, onStart }: { lang: Lang; id: MiniGameId; onStart(): void }) {
  return (
    <div className="ml-mini__card ml-mini__pix">
      <p className="ml-mini__how">{miniText(lang, 'mini.' + id + '.how')}</p>
      <button type="button" className="ml-mini__btn ml-mini__pix" autoFocus onClick={onStart}>
        {miniText(lang, 'mini.tapStart')}
      </button>
    </div>
  );
}

/** The end stamp: a pixel-bordered word that thumps onto the result card. */
function stampKey(score: number): string {
  if (score >= 0.8) return 'mini.stamp.great';
  return score >= 0.5 ? 'mini.stamp.ok' : 'mini.stamp.try';
}

export function ResultCard({ lang, result, onDone }: { lang: Lang; result: MiniGameResult; onDone(): void }) {
  const pct = Math.round(result.score * 100);
  const t = (key: string) => miniText(lang, key);
  return (
    <div className="ml-mini__card ml-mini__card--result ml-mini__pix" role="status">
      <div className="ml-mini__stamp">{t(stampKey(result.score))}</div>
      <p className="ml-mini__score">{t('mini.result.score')} <span className="ml-mini__big">{pct}%</span></p>
      <div className="ml-mini__bar">
        <div className="ml-mini__bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="ml-mini__lesson">{miniText(lang, result.summaryKey, result.vars)}</p>
      <button type="button" className="ml-mini__btn ml-mini__pix" autoFocus onClick={onDone}>
        {t('mini.result.next')}
      </button>
    </div>
  );
}
