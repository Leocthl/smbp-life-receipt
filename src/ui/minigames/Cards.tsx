import type { Lang } from '../../i18n';
import { miniText } from './text';
import type { MiniGameId, MiniGameResult } from './types';

export function IntroCard({ lang, id, onStart }: { lang: Lang; id: MiniGameId; onStart(): void }) {
  return (
    <div className="ml-mini__card">
      <p className="ml-mini__how">{miniText(lang, 'mini.' + id + '.how')}</p>
      <button type="button" className="ml-mini__btn" autoFocus onClick={onStart}>
        {miniText(lang, 'mini.tapStart')}
      </button>
    </div>
  );
}

export function ResultCard({ lang, result, onDone }: { lang: Lang; result: MiniGameResult; onDone(): void }) {
  const pct = Math.round(result.score * 100);
  const t = (key: string) => miniText(lang, key);
  return (
    <div className="ml-mini__card ml-mini__card--result" role="status">
      <p className="ml-mini__label">{t('mini.result.title')}</p>
      <p className="ml-mini__score">{t('mini.result.score')} {pct}%</p>
      <div className="ml-mini__bar">
        <div className="ml-mini__bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="ml-mini__lesson">{miniText(lang, result.summaryKey, result.vars)}</p>
      <button type="button" className="ml-mini__btn" autoFocus onClick={onDone}>
        {t('mini.result.next')}
      </button>
    </div>
  );
}
