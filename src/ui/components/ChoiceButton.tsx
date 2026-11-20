import type { ReactNode } from 'react';
import { PixelIcon } from './PixelIcon';
import { GLYPHS } from './sprites';
import type { TagKey } from './tags';

/** A chunky pixel button: coloured glyph tile on the left, optional price tag on the right. */
export function ChoiceButton({ tag, on, testId, onClick, cost, costLabel, children }: {
  tag: TagKey; on: boolean; testId: string; onClick: () => void; cost?: string; costLabel?: string; children: ReactNode;
}) {
  return (
    <button type="button" aria-pressed={on} className={`ml-choice${on ? ' ml-choice--on' : ''}`} data-tag={tag} data-testid={testId} onClick={onClick}>
      <span className="ml-choice__glyph" aria-hidden="true"><PixelIcon sprite={GLYPHS[tag]} scale={3} /></span>
      <span className="ml-choice__body">{children}</span>
      {cost && <span className="ml-price" aria-label={costLabel}>{cost}</span>}
    </button>
  );
}
