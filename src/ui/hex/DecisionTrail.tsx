import { useState } from 'react';
import type { Qualities } from '../../world3d/qualities';
import { qualityDelta } from '../../world3d/qualities';
import { useI18n } from '../i18nContext';
import { HexRadar } from './HexRadar';
import { QualityDelta } from './QualityDelta';
import './hex.css';

export interface TrailEntry {
  turn: number;
  age: number;
  titleKey: string;
  choiceKey: string;
  before: Qualities;
  after: Qualities;
}

/** Every decision in order. Tap one to see its shape before and after; defaultOpen is for the jump page. */
export function DecisionTrail({ entries, defaultOpen = null }: { entries: readonly TrailEntry[]; defaultOpen?: number | null }) {
  const { t } = useI18n();
  const [openTurn, setOpenTurn] = useState<number | null>(defaultOpen);
  if (entries.length === 0) return <p className="ml-hex-trail__empty">{t('hex.trail.empty')}</p>;
  return (
    <ol className="ml-hex-trail" aria-label={t('hex.trail.label')}>
      {entries.map((e) => {
        const open = openTurn === e.turn;
        return (
          <li key={e.turn} className="ml-hex-trail__item">
            <button
              type="button"
              className="ml-hex-trail__btn"
              aria-expanded={open}
              onClick={() => setOpenTurn(open ? null : e.turn)}
            >
              <span className="ml-hex-trail__age">{t('hex.trail.age', { age: e.age })}</span>
              <span className="ml-hex-trail__title">{t(e.titleKey)}</span>
              <span className="ml-hex-trail__choice">{t(e.choiceKey)}</span>
            </button>
            <QualityDelta delta={qualityDelta(e.before, e.after)} />
            {open && (
              <div className="ml-hex-trail__detail">
                <HexRadar values={e.after} previous={e.before} size={320} max={340} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
