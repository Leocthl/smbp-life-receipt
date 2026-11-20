import { useMemo, useState } from 'react';
import { MOMENTS } from '../../data/endings';
import { buildEnding, type Moment } from '../../engine/endings';
import type { GameState, Goal } from '../../engine/types';
import { NetWorthChart } from '../components/NetWorthChart';
import { Line, Receipt } from '../components/Receipt';
import { ICONS } from '../components/sprites';
import { money } from '../format';
import { useI18n } from '../i18nContext';
import { textVars } from './CardScreen';
import { drawShareCard } from '../shareCard';
import './screens.css';

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
  return (
    <ol className="ml-ending__moments">
      {items.map((m) => (
        <li key={`${m.entry.turn}-${m.entry.eventId}`}>
          {fill(m.key, { ...m.vars, choice: t(`ev.${m.entry.eventId}.${m.entry.choiceId}`, vars) })}
        </li>
      ))}
    </ol>
  );
}

/** Short, shareable receipt by default; the breakdown folds out underneath. */
export function EndingScreen({ state, goal, onAgain }: { state: GameState; goal: Goal; onAgain: () => void }) {
  const { t, lang } = useI18n();
  const fill = useFill();
  const ending = useMemo(() => buildEnding(state, goal), [state, goal]);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState(false);
  const st = ending.stats;
  const labelName = t(`label.${ending.label}`);
  const top = [...ending.moments].sort((a, b) => b.weight - a.weight).slice(0, MOMENTS.short).sort((a, b) => a.entry.turn - b.entry.turn);

  async function share() {
    const text = `${t('share.text', { label: labelName, netWorth: money(st.netWorth, lang, true) })}\n${window.location.origin}`;
    try {
      const blob = await drawShareCard({
        title: t('ending.title'), ages: t('ending.age'), label: labelName, desc: t(`label.${ending.label}.desc`),
        netWorthLabel: t('ending.netWorth'), netWorth: money(st.netWorth, lang), goal: fill(ending.goal.key, ending.goal.vars),
        footer: t('app.disclaimer'),
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
    <Receipt testId="ending" stamp={labelName} className="ml-ending">
      <h2 className="ml-ending__title">{t('ending.title')}</h2>
      <p className="ml-ending__ages">{t('ending.age')}</p>
      <p className="ml-ending__label" data-testid="ending-label" data-label={ending.label}>{labelName}</p>
      <p className="ml-ending__desc">{t(`label.${ending.label}.desc`)}</p>
      <Line icon={ICONS.gem} label={t('ending.netWorth')} value={money(st.netWorth, lang)} strong />
      <p className="ml-ending__goal" data-testid="ending-goal">{fill(ending.goal.key, ending.goal.vars)}</p>
      {top.length > 0 && (<><h3 className="ml-summary__sub">{t('ending.moments')}</h3><MomentList items={top} state={state} /></>)}
      <div className="ml-ending__actions">
        <button type="button" className="ml-btn" data-testid="share" onClick={share}>{copied ? t('ending.copied') : t('ending.share')}</button>
        <button type="button" className="ml-btn ml-btn--primary" data-testid="again" onClick={onAgain}>{t('ending.again')}</button>
      </div>
      {shareError && <p className="ml-result__notice" role="alert">{t('ending.shareFailed')}</p>}
      <details className="ml-ending__more" data-testid="ending-details">
        <summary>{t('ending.more')}</summary>
        <Line label={t('ending.plain')} value={money(st.plainNetWorth, lang)} />
        <Line label={t('ending.happiness')} value={Math.round(st.avgHappiness)} />
        <Line label={t('ending.relationships')} value={Math.round(st.avgRelationships)} />
        <p className="ml-fine">{t('ending.start', { tier: t(`intro.tier.${state.character.familyTier}`), gpa: state.character.gpa.toFixed(2) })}</p>
        <NetWorthChart history={state.history} />
        {ending.moments.length > top.length && (<><h3 className="ml-summary__sub">{t('ending.moreMoments')}</h3><MomentList items={ending.moments.filter((m) => !top.includes(m))} state={state} /></>)}
        <h3 className="ml-summary__sub">{t('ending.mistakes')}</h3>
        {ending.mistakes.length === 0 && <p className="ml-fine">{t('ending.mistakes.none')}</p>}
        <ul className="ml-ending__mistakes">{ending.mistakes.map((m) => <li key={m.key}>{fill(m.key, m.vars)}</li>)}</ul>
        {ending.mistakes.length > 0 && <p className="ml-fine">{t('ending.mistakes.note')}</p>}
        {state.revealed.length > 0 && (
          <><h3 className="ml-summary__sub">{t('ending.traits')}</h3>
            <ul className="ml-ending__mistakes">{state.revealed.map((r) => <li key={r}>{t(`trait.${r}`)}</li>)}</ul></>
        )}
      </details>
      <p className="ml-fine">{t('app.disclaimer')}</p>
    </Receipt>
  );
}
