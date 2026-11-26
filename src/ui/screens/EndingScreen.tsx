import { useMemo, useState, type CSSProperties } from 'react';
import { MOMENTS } from '../../data/endings';
import { buildEnding, type Moment } from '../../engine/endings';
import { buildFinancialMbti, type MbtiAxis } from '../../engine/mbti';
import type { GameState, Goal } from '../../engine/types';
import { NetWorthChart } from '../components/NetWorthChart';
import { PixelIcon } from '../components/PixelIcon';
import { Line, Receipt } from '../components/Receipt';
import { ICONS } from '../components/sprites';
import { money } from '../format';
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
  // Left guard bars
  bars.push({ x: cursor, w: 3 }, { x: cursor + 6, w: 3 });
  cursor += 14;
  for (let i = 0; i < digits.length; i++) {
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
  // Right guard bars
  bars.push({ x: 222, w: 3 }, { x: 228, w: 3 });
  return bars;
}

function AxisRow({ axis, index }: { axis: MbtiAxis; index: number }) {
  const { t } = useI18n();
  const leftWins = axis.winner === axis.leftCode;
  const winPct = leftWins ? axis.leftPct : axis.rightPct;
  const fillStyle = {
    '--fill-w': `calc(${winPct}% - 4px)`,
    '--bar-delay': `${220 + index * 65}ms`,
  } as CSSProperties;

  return (
    <div className="ml-mbti-axis">
      <div className="ml-mbti-axis__meta">
        <span className={`ml-mbti-axis__pole${leftWins ? ' ml-mbti-axis__pole--win' : ''}`}>
          <span className="ml-mbti-axis__code">{axis.leftCode}</span>
          <span>{t(`mbti.pole.${axis.leftCode}`)}</span>
        </span>
        <span className="ml-mbti-axis__pct">{winPct}% {axis.winner}</span>
        <span className={`ml-mbti-axis__pole${!leftWins ? ' ml-mbti-axis__pole--win' : ''}`}>
          <span>{t(`mbti.pole.${axis.rightCode}`)}</span>
          <span className="ml-mbti-axis__code">{axis.rightCode}</span>
        </span>
      </div>
      <div className="ml-mbti-bar" role="img" aria-label={`${t(`mbti.axis.${axis.id}`)}: ${winPct}% ${t(`mbti.pole.${axis.winner}`)}`}>
        <span className="ml-mbti-bar__mid" aria-hidden="true" />
        <span
          className={`ml-mbti-bar__fill ${leftWins ? 'ml-mbti-bar__fill--left' : 'ml-mbti-bar__fill--right'}`}
          data-pole={axis.winner}
          style={fillStyle}
        />
      </div>
    </div>
  );
}

/** Animated MBTI-style thermal receipt; the full life audit folds out underneath. */
export function EndingScreen({ state, goal, onAgain }: { state: GameState; goal: Goal; onAgain: () => void }) {
  const { t, lang } = useI18n();
  const fill = useFill();
  const ending = useMemo(() => buildEnding(state, goal), [state, goal]);
  const mbti = useMemo(() => buildFinancialMbti(state, ending.stats), [state, ending.stats]);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState(false);

  const st = ending.stats;
  const labelName = t(`label.${ending.label}`);
  const mbtiName = t(`mbti.type.${mbti.code}.name`);
  const mbtiMotto = t(`mbti.type.${mbti.code}.motto`);
  const partnerName = t(`mbti.type.${mbti.partnerCode}.name`);
  const partnerMotto = t(`mbti.type.${mbti.partnerCode}.motto`);
  const serialFull = formatSerial(mbti.barcodeDigits);
  const serialShort = serialFull.slice(0, 9);
  const bars = useMemo(() => barcodeBars(mbti.barcodeDigits), [mbti.barcodeDigits]);

  const top = [...ending.moments]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MOMENTS.short)
    .sort((a, b) => a.entry.turn - b.entry.turn);

  const plainDiffPct = st.plainNetWorth > 0
    ? Math.round(((st.netWorth - st.plainNetWorth) / st.plainNetWorth) * 100)
    : 0;
  const vsPlainText = plainDiffPct >= 2
    ? t('mbti.scorecard.vsPlainUp', { pct: plainDiffPct })
    : plainDiffPct <= -2
      ? t('mbti.scorecard.vsPlainDown', { pct: Math.abs(plainDiffPct) })
      : t('mbti.scorecard.vsPlainEven');
  const vsPlainTone = plainDiffPct >= 2 ? 'up' : plainDiffPct <= -2 ? 'down' : 'even';

  async function share() {
    const text = `${t('share.text', { label: `${mbti.code} ${mbtiName} · ${labelName}`, netWorth: money(st.netWorth, lang, true) })}\n${window.location.origin}`;
    try {
      const blob = await drawShareCard({
        title: t('ending.title'),
        ages: t('ending.age'),
        label: labelName,
        desc: t(`label.${ending.label}.desc`),
        netWorthLabel: t('ending.netWorth'),
        netWorth: money(st.netWorth, lang),
        goal: fill(ending.goal.key, ending.goal.vars),
        footer: t('app.disclaimer'),
        mbtiCode: mbti.code,
        mbtiTitle: mbtiName,
        rarity: t('mbti.header.rarity', { pct: mbti.rarityPct }),
        grade: t('mbti.header.grade', { grade: mbti.grade }),
        axes: mbti.axes.map((a) => ({
          leftCode: a.leftCode,
          rightCode: a.rightCode,
          leftLabel: t(`mbti.pole.${a.leftCode}`),
          rightLabel: t(`mbti.pole.${a.rightCode}`),
          leftPct: a.leftPct,
          rightPct: a.rightPct,
          winner: a.winner,
        })),
        barcodeDigits: mbti.barcodeDigits,
      }, lang);
      const files = [new File([blob], 'life-receipt.png', { type: 'image/png' })];
      if (navigator.canShare?.({ files })) await navigator.share({ files, text });
      else {
        // desktop: save the picture and copy the caption
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'life-receipt.png';
        a.click();
        // revoking straight away can cancel the download in some browsers
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
        await navigator.clipboard?.writeText(text).catch(() => undefined);
        setCopied(true);
      }
      setShareError(false);
    } catch (e) {
      // the user closing the share sheet is not an error worth showing
      if (!(e instanceof DOMException && e.name === 'AbortError')) setShareError(true);
    }
  }

  return (
    <Receipt testId="ending" stamp={labelName} className="ml-ending ml-ending--printing">
      {/* 1. Receipt Header Tape */}
      <header className="ml-ending__sec ml-ending__tape" style={{ '--sec-delay': '0ms' } as CSSProperties}>
        <div className="ml-ending__tape-top">
          <span className="ml-ending__brand">{t('mbti.header.brand')}</span>
          <div className="ml-ending__badges">
            <span className="ml-ending__pill">{t('mbti.header.rarity', { pct: mbti.rarityPct })}</span>
            <span className="ml-ending__pill ml-ending__pill--grade" data-grade={mbti.grade}>
              {t('mbti.header.grade', { grade: mbti.grade })}
            </span>
          </div>
        </div>
        <div className="ml-ending__tape-sub">
          <span className="ml-ending__serial">{t('mbti.header.serial', { serial: serialShort })}</span>
          <span className="ml-ending__grade-note">{t(`mbti.grade.${mbti.grade}`)}</span>
        </div>
      </header>

      {/* 2. MBTI Hero Card */}
      <section className="ml-ending__sec ml-mbti-hero" style={{ '--sec-delay': '70ms' } as CSSProperties}>
        <p className="ml-mbti-hero__eyebrow">{t('mbti.hero.eyebrow')}</p>
        <div className="ml-mbti-tiles" aria-label={mbti.code}>
          {[...mbti.code].map((ch, idx) => (
            <span
              key={`${ch}-${idx}`}
              className="ml-mbti-tile"
              data-pole={ch}
              style={{ '--tile-delay': `${110 + idx * 55}ms` } as CSSProperties}
            >
              {ch}
            </span>
          ))}
        </div>
        <h2 className="ml-mbti-hero__name">{mbtiName}</h2>
        <p className="ml-ending__label" data-testid="ending-label" data-label={ending.label}>{labelName}</p>
        <p className="ml-mbti-hero__motto">{mbtiMotto}</p>
        <p className="ml-ending__desc">{t(`label.${ending.label}.desc`)}</p>
      </section>

      {/* 3. 4-Axis Financial DNA Spectrum Bars */}
      <section className="ml-ending__sec ml-mbti-axes" style={{ '--sec-delay': '140ms' } as CSSProperties}>
        <h3 className="ml-ending__sec-head">{t('mbti.axes.title')}</h3>
        <div className="ml-mbti-axes__list">
          {mbti.axes.map((axis, i) => (
            <AxisRow key={axis.id} axis={axis} index={i} />
          ))}
        </div>
      </section>

      {/* 4. Strengths & Blind Spots Panel */}
      <section className="ml-ending__sec" style={{ '--sec-delay': '210ms' } as CSSProperties}>
        <div className="ml-mbti-grid">
          <div className="ml-mbti-box ml-mbti-box--strengths">
            <h3 className="ml-mbti-box__title">
              <span className="ml-mbti-box__mark" aria-hidden="true">+</span>
              <span>{t('mbti.strengths.title')}</span>
            </h3>
            <ul className="ml-mbti-box__list">
              <li>{t(`mbti.type.${mbti.code}.s1`)}</li>
              <li>{t(`mbti.type.${mbti.code}.s2`)}</li>
              <li>{t(`mbti.type.${mbti.code}.s3`)}</li>
            </ul>
          </div>
          <div className="ml-mbti-box ml-mbti-box--blindspots">
            <h3 className="ml-mbti-box__title">
              <span className="ml-mbti-box__mark" aria-hidden="true">!</span>
              <span>{t('mbti.blindspots.title')}</span>
            </h3>
            <ul className="ml-mbti-box__list">
              <li>{t(`mbti.type.${mbti.code}.b1`)}</li>
              <li>{t(`mbti.type.${mbti.code}.b2`)}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Financial Scorecard + Goal Verdict */}
      <section className="ml-ending__sec ml-ending__scorecard" style={{ '--sec-delay': '280ms' } as CSSProperties}>
        <h3 className="ml-ending__sec-head">{t('mbti.scorecard.title')}</h3>
        <Line icon={ICONS.gem} label={t('ending.netWorth')} value={money(st.netWorth, lang)} strong />
        <div className="ml-ending__vs-row">
          <span className={`ml-chip ml-chip--${vsPlainTone}`}>{vsPlainText}</span>
        </div>
        <div className="ml-score-strip">
          <div className="ml-score-cell">
            <PixelIcon sprite={ICONS.coin} scale={2} />
            <span className="ml-score-cell__label">{t('mbti.scorecard.peakSalary')}</span>
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
            <span className="ml-partner-card__eyebrow">{t('mbti.partner.title')}</span>
            <div className="ml-partner-card__tiles" aria-label={mbti.partnerCode}>
              {[...mbti.partnerCode].map((ch, idx) => (
                <span key={`${ch}-${idx}`} className="ml-mbti-tile ml-mbti-tile--sm" data-pole={ch}>{ch}</span>
              ))}
            </div>
          </div>
          <p className="ml-partner-card__name">{partnerName}</p>
          <p className="ml-partner-card__motto">{partnerMotto}</p>
          <p className="ml-partner-card__hint">{t('mbti.partner.hint')}</p>
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
        <p className="ml-barcode__digits">{t('mbti.barcode.label', { serial: serialFull, code: mbti.code })}</p>
      </footer>
      <p className="ml-fine">{t('app.disclaimer')}</p>
    </Receipt>
  );
}
