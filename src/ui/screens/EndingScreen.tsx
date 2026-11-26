import { useMemo, useState, type CSSProperties } from 'react';
import { MOMENTS } from '../../data/endings';
import { buildEnding, type Moment } from '../../engine/endings';
import { buildHexReport, type HexAxisRead } from '../../engine/hexReport';
import type { GameState, Goal } from '../../engine/types';
import { NetWorthChart } from '../components/NetWorthChart';
import { PixelIcon } from '../components/PixelIcon';
import { Line, Receipt } from '../components/Receipt';
import { ICONS, QUALITY_ICONS } from '../components/sprites';
import { money } from '../format';
import { HexRadar } from '../hex/HexRadar';
import { useI18n } from '../i18nContext';
import { drawShareCard } from '../shareCard';
import { textVars } from './CardScreen';
import './screens.css';
import './endingReport.css';

const MONEY_VARS = new Set(['amount', 'value', 'diff', 'interest', 'fees', 'loss', 'salary', 'netWorth']);

function useFill() {
  const { t, lang } = useI18n();
  return (key: string, vars: Record<string, number | string>) =>
    t(key, Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, MONEY_VARS.has(k) && typeof v === 'number' ? money(v, lang, true) : v])));
}

function MomentList({ items, state }: { items: Moment[]; state: GameState }) {
  const fill = useFill();
  const { t, lang } = useI18n();
  const vars = textVars(state, lang);
  const choiceLabel = (m: Moment) => {
    if (m.entry.eventId.startsWith('dyn_')) return t(`dyn.${m.entry.eventId.slice(4)}.title`);
    if (m.entry.eventId.startsWith('free_')) return t(`free.act.${m.entry.choiceId}`);
    return t(`ev.${m.entry.eventId}.${m.entry.choiceId}`, vars);
  };
  return (
    <ol className="ml-ending__moments">
      {items.map((m) => (
        <li key={`${m.entry.turn}-${m.entry.eventId}`}>
          {fill(m.key, { ...m.vars, choice: choiceLabel(m) })}
        </li>
      ))}
    </ol>
  );
}

function formatSerial(digits: string): string {
  return digits.replace(/(\d{4})(?=\d)/g, '$1-');
}

/** Deterministic pixel barcode bar geometry from 16 receipt digits. */
function barcodeBars(digits: string): { x: number; w: number }[] {
  const bars: { x: number; w: number }[] = [];
  let cursor = 8;
  bars.push({ x: cursor, w: 3 }, { x: cursor + 6, w: 3 });
  cursor += 14;
  for (let i = 0; i < digits.length; i += 1) {
    const d = digits.charCodeAt(i) - 48;
    const w1 = 2 + (d % 3);
    const gap1 = 2 + ((d >> 1) % 2);
    const w2 = 2 + ((d + i) % 2);
    const gap2 = 3 + ((d >> 2) % 2);
    if (cursor + w1 <= 216) bars.push({ x: cursor, w: w1 });
    cursor += w1 + gap1;
    if (cursor + w2 <= 216) bars.push({ x: cursor, w: w2 });
    cursor += w2 + gap2;
  }
  bars.push({ x: 222, w: 3 }, { x: 228, w: 3 });
  return bars;
}

function HexAxisRow({ axis, index }: { axis: HexAxisRead; index: number }) {
  const { t } = useI18n();
  const deltaText = axis.delta > 0 ? `+${axis.delta}` : `${axis.delta}`;
  const deltaTone = axis.delta > 0 ? 'up' : axis.delta < 0 ? 'down' : 'flat';
  const fillStyle = {
    '--fill-w': `${Math.max(4, axis.score)}%`,
    '--bar-delay': `${180 + index * 55}ms`,
  } as CSSProperties;

  return (
    <div className="ml-hexr-axis" data-quality={axis.quality}>
      <div className="ml-hexr-axis__head">
        <span className="ml-hexr-axis__name">
          <PixelIcon sprite={QUALITY_ICONS[axis.quality]} scale={2} />
          <span>{t(`hex.q.${axis.quality}`)}</span>
        </span>
        <span className="ml-hexr-axis__stats">
          <span className={`ml-hexr-axis__delta ml-hexr-axis__delta--${deltaTone}`}>{deltaText}</span>
          <span className="ml-hexr-axis__tier" data-tier={axis.tier}>{t(`hexr.tier.${axis.tier}`)}</span>
          <strong className="ml-hexr-axis__score">{axis.score}</strong>
        </span>
      </div>
      <div className="ml-hexr-bar" role="meter" aria-label={t(`hex.q.${axis.quality}`)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={axis.score}>
        <span className="ml-hexr-bar__fill" data-quality={axis.quality} style={fillStyle} />
      </div>
      <p className="ml-hexr-axis__note">{t(`hexr.dim.${axis.quality}.${axis.tier}`)}</p>
    </div>
  );
}

/** Animated 6-Axis Life Hexagon thermal receipt; full life audit folds out underneath. */
export function EndingScreen({ state, goal, onAgain }: { state: GameState; goal: Goal; onAgain: () => void }) {
  const { t, lang } = useI18n();
  const fill = useFill();
  const ending = useMemo(() => buildEnding(state, goal), [state, goal]);
  const report = useMemo(() => buildHexReport(state, ending.stats), [state, ending.stats]);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState(false);

  const st = ending.stats;
  const labelName = t(`label.${ending.label}`);
  const archName = t(`hexr.arch.${report.archetype}.name`);
  const archMotto = t(`hexr.arch.${report.archetype}.motto`);
  const partnerName = t(`hexr.arch.${report.partnerArchetype}.name`);
  const partnerMotto = t(`hexr.arch.${report.partnerArchetype}.motto`);
  const serialFull = formatSerial(report.barcodeDigits);
  const serialShort = serialFull.slice(0, 9);
  const bars = useMemo(() => barcodeBars(report.barcodeDigits), [report.barcodeDigits]);

  const top = [...ending.moments]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MOMENTS.short)
    .sort((a, b) => a.entry.turn - b.entry.turn);

  const plainDiffPct = st.plainNetWorth > 0
    ? Math.round(((st.netWorth - st.plainNetWorth) / st.plainNetWorth) * 100)
    : 0;
  const vsPlainText = plainDiffPct >= 2
    ? t('hexr.scorecard.vsPlainUp', { pct: plainDiffPct })
    : plainDiffPct <= -2
      ? t('hexr.scorecard.vsPlainDown', { pct: Math.abs(plainDiffPct) })
      : t('hexr.scorecard.vsPlainEven');
  const vsPlainTone = plainDiffPct >= 2 ? 'up' : plainDiffPct <= -2 ? 'down' : 'even';

  async function share() {
    const text = `${t('share.text', { label: `${archName} · ${labelName}`, netWorth: money(st.netWorth, lang, true) })}\n${window.location.origin}`;
    try {
      const hexLabels = Object.fromEntries(report.axes.map((a) => [a.quality, t(`hex.q.${a.quality}`)])) as Record<HexAxisRead['quality'], string>;
      const blob = await drawShareCard({
        title: t('ending.title'),
        ages: t('ending.age'),
        label: labelName,
        desc: t(`label.${ending.label}.desc`),
        netWorthLabel: t('ending.netWorth'),
        netWorth: money(st.netWorth, lang),
        goal: fill(ending.goal.key, ending.goal.vars),
        footer: t('app.disclaimer'),
        archetypeName: archName,
        areaScore: t('hexr.header.area', { score: report.overallScore }),
        rarity: t('hexr.header.rarity', { pct: report.rarityPct }),
        grade: t('hexr.header.grade', { grade: report.grade }),
        hexValues: report.finalQ,
        hexLabels,
        barcodeDigits: report.barcodeDigits,
      }, lang);
      const files = [new File([blob], 'life-receipt.png', { type: 'image/png' })];
      if (navigator.canShare?.({ files })) await navigator.share({ files, text });
      else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'life-receipt.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
        await navigator.clipboard?.writeText(text).catch(() => undefined);
        setCopied(true);
      }
      setShareError(false);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setShareError(true);
    }
  }

  return (
    <Receipt testId="ending" stamp={labelName} className="ml-ending ml-ending--printing">
      {/* 1. Receipt Header Tape */}
      <header className="ml-ending__sec ml-ending__tape" style={{ '--sec-delay': '0ms' } as CSSProperties}>
        <div className="ml-ending__tape-top">
          <span className="ml-ending__brand">{t('hexr.header.brand')}</span>
          <div className="ml-ending__badges">
            <span className="ml-ending__pill">{t('hexr.header.area', { score: report.overallScore })}</span>
            <span className="ml-ending__pill">{t('hexr.header.rarity', { pct: report.rarityPct })}</span>
            <span className="ml-ending__pill ml-ending__pill--grade" data-grade={report.grade}>
              {t('hexr.header.grade', { grade: report.grade })}
            </span>
          </div>
        </div>
        <div className="ml-ending__tape-sub">
          <span className="ml-ending__serial">{t('hexr.header.serial', { serial: serialShort })}</span>
          <span className="ml-ending__grade-note">{t(`hexr.grade.${report.grade}`)}</span>
        </div>
      </header>

      {/* 2. Life Hexagon Hero Card */}
      <section className="ml-ending__sec ml-hexr-hero" style={{ '--sec-delay': '70ms' } as CSSProperties}>
        <p className="ml-hexr-hero__eyebrow">{t('hexr.hero.eyebrow')}</p>
        <div className="ml-hexr-hero__stage">
          <HexRadar values={report.finalQ} previous={report.startQ} size={360} max={320} />
        </div>
        <div className="ml-hexr-hero__chips">
          <span className="ml-hexr-chip">{t('hexr.hero.symmetry', { pct: report.symmetryPct })}</span>
          <span className="ml-hexr-chip">
            {t('hexr.hero.peaks', { a: t(`hex.q.${report.topTwo[0]}`), b: t(`hex.q.${report.topTwo[1]}`) })}
          </span>
        </div>
        <h2 className="ml-hexr-hero__name">{archName}</h2>
        <p className="ml-ending__label" data-testid="ending-label" data-label={ending.label}>{labelName}</p>
        <p className="ml-hexr-hero__motto">{archMotto}</p>
        <p className="ml-ending__desc">{t(`label.${ending.label}.desc`)}</p>
      </section>

      {/* 3. 6-Dimension Hexagon Breakdown */}
      <section className="ml-ending__sec ml-hexr-axes" style={{ '--sec-delay': '140ms' } as CSSProperties}>
        <h3 className="ml-ending__sec-head">{t('hexr.axes.title')}</h3>
        <div className="ml-hexr-axes__list">
          {report.axes.map((axis, i) => (
            <HexAxisRow key={axis.quality} axis={axis} index={i} />
          ))}
        </div>
      </section>

      {/* 4. Strengths & Blind Spots Panel */}
      <section className="ml-ending__sec" style={{ '--sec-delay': '210ms' } as CSSProperties}>
        <div className="ml-hexr-grid">
          <div className="ml-hexr-box ml-hexr-box--strengths">
            <h3 className="ml-hexr-box__title">
              <span className="ml-hexr-box__mark" aria-hidden="true">+</span>
              <span>{t('hexr.strengths.title')}</span>
            </h3>
            <ul className="ml-hexr-box__list">
              <li>{t(`hexr.arch.${report.archetype}.s1`)}</li>
              <li>{t(`hexr.arch.${report.archetype}.s2`)}</li>
              <li>{t(`hexr.arch.${report.archetype}.s3`)}</li>
            </ul>
          </div>
          <div className="ml-hexr-box ml-hexr-box--blindspots">
            <h3 className="ml-hexr-box__title">
              <span className="ml-hexr-box__mark" aria-hidden="true">!</span>
              <span>{t('hexr.blindspots.title')}</span>
            </h3>
            <ul className="ml-hexr-box__list">
              <li>{t(`hexr.arch.${report.archetype}.b1`)}</li>
              <li>{t(`hexr.arch.${report.archetype}.b2`)}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Financial Scorecard + Goal Verdict */}
      <section className="ml-ending__sec ml-ending__scorecard" style={{ '--sec-delay': '280ms' } as CSSProperties}>
        <h3 className="ml-ending__sec-head">{t('hexr.scorecard.title')}</h3>
        <Line icon={ICONS.gem} label={t('ending.netWorth')} value={money(st.netWorth, lang)} strong />
        <div className="ml-ending__vs-row">
          <span className={`ml-chip ml-chip--${vsPlainTone}`}>{vsPlainText}</span>
        </div>
        <div className="ml-score-strip">
          <div className="ml-score-cell">
            <PixelIcon sprite={ICONS.coin} scale={2} />
            <span className="ml-score-cell__label">{t('hexr.scorecard.peakSalary')}</span>
            <span className="ml-score-cell__val">{money(st.peakSalary, lang, true)}</span>
          </div>
          <div className="ml-score-cell">
            <PixelIcon sprite={ICONS.heart} scale={2} />
            <span className="ml-score-cell__label">{t('ending.happiness')}</span>
            <span className="ml-score-cell__val">{Math.round(st.avgHappiness)}</span>
          </div>
          <div className="ml-score-cell">
            <PixelIcon sprite={ICONS.people} scale={2} />
            <span className="ml-score-cell__label">{t('ending.relationships')}</span>
            <span className="ml-score-cell__val">{Math.round(st.avgRelationships)}</span>
          </div>
        </div>
        <p className="ml-ending__goal" data-testid="ending-goal">{fill(ending.goal.key, ending.goal.vars)}</p>
      </section>

      {/* 6. Key Turning Points ("What If") */}
      {top.length > 0 && (
        <section className="ml-ending__sec" style={{ '--sec-delay': '340ms' } as CSSProperties}>
          <h3 className="ml-summary__sub">{t('ending.moments')}</h3>
          <MomentList items={top} state={state} />
        </section>
      )}

      {/* Actions */}
      <div className="ml-ending__sec ml-ending__actions" style={{ '--sec-delay': '390ms' } as CSSProperties}>
        <button type="button" className="ml-btn" data-testid="share" onClick={share}>{copied ? t('ending.copied') : t('ending.share')}</button>
        <button type="button" className="ml-btn ml-btn--primary" data-testid="again" onClick={onAgain}>{t('ending.again')}</button>
      </div>
      {shareError && <p className="ml-result__notice" role="alert">{t('ending.shareFailed')}</p>}

      {/* 7. Full Life Audit */}
      <details className="ml-ending__more" data-testid="ending-details">
        <summary>{t('ending.more')}</summary>
        <Line label={t('ending.plain')} value={money(st.plainNetWorth, lang)} />
        <Line label={t('ending.happiness')} value={Math.round(st.avgHappiness)} />
        <Line label={t('ending.relationships')} value={Math.round(st.avgRelationships)} />
        <NetWorthChart history={state.history} />

        <div className="ml-partner-card">
          <div className="ml-partner-card__head">
            <span className="ml-partner-card__eyebrow">{t('hexr.partner.title')}</span>
            <span className="ml-ending__pill">{t(`hex.q.${report.growthEdge}`)} ↑</span>
          </div>
          <p className="ml-partner-card__name">{partnerName}</p>
          <p className="ml-partner-card__motto">{partnerMotto}</p>
          <p className="ml-partner-card__hint">{t('hexr.partner.hint')}</p>
        </div>

        {ending.moments.length > top.length && (
          <>
            <h3 className="ml-summary__sub">{t('ending.moreMoments')}</h3>
            <MomentList items={ending.moments.filter((m) => !top.includes(m))} state={state} />
          </>
        )}
        <h3 className="ml-summary__sub">{t('ending.mistakes')}</h3>
        {ending.mistakes.length === 0 && <p className="ml-fine">{t('ending.mistakes.none')}</p>}
        <ul className="ml-ending__mistakes">{ending.mistakes.map((m) => <li key={m.key}>{fill(m.key, m.vars)}</li>)}</ul>
        {ending.mistakes.length > 0 && <p className="ml-fine">{t('ending.mistakes.note')}</p>}
        {state.revealed.length > 0 && (
          <>
            <h3 className="ml-summary__sub">{t('ending.traits')}</h3>
            <ul className="ml-ending__mistakes">{state.revealed.map((r) => <li key={r}>{t(`trait.${r}`)}</li>)}</ul>
          </>
        )}
        <p className="ml-fine">{t('ending.start', { tier: t(`intro.tier.${state.character.familyTier}`), gpa: state.character.gpa.toFixed(2) })}</p>
      </details>

      {/* 8. Pixel Thermal Barcode Footer */}
      <footer className="ml-ending__barcode">
        <svg viewBox="0 0 240 40" className="ml-barcode__svg" aria-hidden="true" shapeRendering="crispEdges">
          {bars.map((b, idx) => (
            <rect key={idx} x={b.x} y={2} width={b.w} height={36} fill="var(--ml-ink)" />
          ))}
        </svg>
        <p className="ml-barcode__digits">{t('hexr.barcode.label', { serial: serialFull, score: report.overallScore })}</p>
      </footer>
      <p className="ml-fine">{t('app.disclaimer')}</p>
    </Receipt>
  );
}
