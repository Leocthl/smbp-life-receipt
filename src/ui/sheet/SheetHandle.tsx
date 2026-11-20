import type { KeyboardEvent } from 'react';
import { useI18n } from '../i18nContext';
import { enLayout } from '../../i18n/en/layout';
import { zhLayout } from '../../i18n/zh/layout';
import type { SheetApi } from './useSheet';
import './sheet.css';

const OWN = { zh: zhLayout, en: enLayout };

/** The grab bar on top of the phone sheet: drag it, tap it to cycle peek / half / full, or use the arrow keys. */
export function SheetHandle({ sheet }: { sheet: SheetApi }) {
  const { t, lang } = useI18n();
  const own = (key: string) => OWN[lang][key] ?? t(key);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); sheet.step(1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sheet.step(-1); }
  };
  return (
    <div className="ml-sheet__bar" data-grab>
      <button
        type="button" className="ml-sheet__handle" data-testid="sheet-handle" aria-expanded={sheet.snap !== 'peek'}
        aria-label={own('layout.sheet.handle')} title={own(`layout.sheet.${sheet.snap}`)} data-snap={sheet.snap}
        onClick={sheet.cycle} onKeyDown={onKey}
      >
        <span className="ml-sheet__grip" aria-hidden="true"><i /><i /><i /></span>
      </button>
    </div>
  );
}
