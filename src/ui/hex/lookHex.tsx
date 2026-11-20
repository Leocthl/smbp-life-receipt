import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { LOCALES, type Lang } from '../../i18n';
import { enHex } from '../../i18n/en/hex';
import { zhHex } from '../../i18n/zh/hex';
import { qualityDelta, type Qualities } from '../../world3d/qualities';
import { I18nProvider, type I18n } from '../i18nContext';
import { DecisionTrail, type TrailEntry } from './DecisionTrail';
import { HexBadge } from './HexBadge';
import { HexRadar } from './HexRadar';
import { QualityDelta } from './QualityDelta';
import './hex.css';

// ?look=hex : all four hex pieces with fake data on a dark page. ?lang=en for English.

const START: Qualities = { wealth: 22, safety: 40, joy: 58, bonds: 61, freedom: 35, growth: 30 };
const NOW: Qualities = { wealth: 28, safety: 34, joy: 61, bonds: 61, freedom: 35, growth: 42 };
const EVENTS: [string, string[]][] = [
  ['tuition', ['tsfs', 'nls', 'family', 'self']],
  ['part_time', ['take', 'tutor', 'focus']],
  ['japan_trip', ['go']],
];
const TRAIL_LENGTH = 64;
const KEYS = ['wealth', 'safety', 'joy', 'bonds', 'freedom', 'growth'] as const;

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** Deterministic walk through the six qualities, with some zero moves. */
function fakeTrail(n: number): TrailEntry[] {
  const out: TrailEntry[] = [];
  let cur = START;
  for (let i = 0; i < n; i += 1) {
    const [id, choices] = EVENTS[i % EVENTS.length];
    const choice = choices[(i * 7) % choices.length];
    const next = { ...cur } as Qualities;
    KEYS.forEach((k, j) => {
      const step = (i * (j + 3) * 31) % 13 - 6;
      next[k] = clamp(cur[k] + ((i + j) % 4 === 0 ? 0 : step));
    });
    out.push({ turn: i + 1, age: 18 + Math.floor((i * 47) / TRAIL_LENGTH), titleKey: `ev.${id}.text`, choiceKey: `ev.${id}.${choice}`, before: cur, after: next });
    cur = next;
  }
  return out;
}

/** Dictionary lookup with the same {var} fill as src/i18n, over both the event text and the hex strings. */
function makeT(lang: Lang): I18n['t'] {
  const dict: Record<string, string> = { ...LOCALES[lang], ...(lang === 'en' ? enHex : zhHex) };
  return (key, vars = {}) => (dict[key] ?? key).replace(/\{(\w+)\}/g, (m, v: string) => (v in vars ? String(vars[v]) : m));
}

function LookPage() {
  useEffect(() => { document.title = 'ready'; }, []);
  const trail = fakeTrail(TRAIL_LENGTH);
  return (
    <div className="ml-hex-look">
      <main className="ml-hex-look__inner">
        <section className="ml-hex-look__frame">
          <h2 className="ml-hex-look__h">HexRadar</h2>
          <HexRadar values={NOW} previous={START} />
        </section>
        <section className="ml-hex-look__frame ml-hex-look__frame--hud">
          <h2 className="ml-hex-look__h">HexBadge</h2>
          <HexBadge values={NOW} />
        </section>
        <section className="ml-hex-look__frame">
          <h2 className="ml-hex-look__h">QualityDelta</h2>
          <QualityDelta delta={qualityDelta(START, NOW)} />
        </section>
        <section className="ml-hex-look__frame">
          <h2 className="ml-hex-look__h">DecisionTrail</h2>
          <DecisionTrail entries={trail} defaultOpen={Number(new URLSearchParams(window.location.search).get('open')) || null} />
        </section>
      </main>
    </div>
  );
}

export function mountLookHex(container: HTMLElement) {
  const lang: Lang = new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'zh';
  createRoot(container).render(
    <I18nProvider value={{ lang, t: makeT(lang) }}>
      <LookPage />
    </I18nProvider>,
  );
}
