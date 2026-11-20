import { useEffect, useRef, type ReactNode } from 'react';
import { runway, netWorth } from '../../engine/finance';
import { regimeForTurn } from '../../engine/market';
import type { GameState } from '../../engine/types';
import { PixelIcon } from '../components/PixelIcon';
import { ICONS, type Sprite } from '../components/sprites';
import { WEATHER } from '../components/weather';
import { ageLabel, money } from '../format';
import { useI18n } from '../i18nContext';
import './hud.css';

/** A number that flashes green or red for a moment when it goes up or down. */
function Num({ value, text }: { value: number; text: string }) {
  const prev = useRef(value);
  const dir = value > prev.current ? 'up' : value < prev.current ? 'down' : '';
  useEffect(() => { prev.current = value; }, [value]);
  return <span key={value} className={`ml-hud__num${dir ? ` ml-hud__num--${dir}` : ''}`}>{text}</span>;
}

function Counter({ testId, icon, label, sub, value, text }: { testId: string; icon: Sprite; label: string; sub?: ReactNode; value: number; text: string }) {
  return (
    <div className={`ml-hud__counter${value < 0 ? ' ml-hud__counter--neg' : ''}`} data-testid={testId}>
      <PixelIcon sprite={icon} scale={2} />
      <span className="ml-hud__stack">
        <span className="ml-hud__label">{label}{sub}</span>
        <Num value={value} text={text} />
      </span>
    </div>
  );
}

/** A 0..100 stat: pixel icon, number and a ten-block meter. */
function Meter({ icon, value, label, testId }: { icon: Sprite; value: number; label: string; testId: string }) {
  const lit = Math.round(value / 10);
  return (
    <div className="ml-hud__chip ml-hud__meter" data-testid={testId} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <PixelIcon sprite={icon} scale={2} />
      <span className="ml-hud__stack">
        <Num value={value} text={String(value)} />
        <span className="ml-hud__pips" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => <span key={i} className={i < lit ? 'is-on' : ''} />)}
        </span>
      </span>
    </div>
  );
}

function LangButton({ onLang }: { onLang: () => void }) {
  const { t } = useI18n();
  return <button type="button" className="ml-lang" data-testid="lang" onClick={onLang}>{t('app.lang')}</button>;
}

/**
 * The top bar over the world: age, cash, net worth, happiness, people and the market weather.
 * Props: `state` (null shows only the language button, for the start and intro screens),
 * `hexSlot` for a 56px HexBadge, `onLang` to show the language toggle (data-testid="lang").
 */
export function Hud({ state, hexSlot, onLang }: { state?: GameState | null; hexSlot?: ReactNode; onLang?: () => void }) {
  const { t, lang } = useI18n();
  if (!state) return onLang ? <div className="ml-hud ml-hud--bare"><LangButton onLang={onLang} /></div> : null;
  const rw = runway(state);
  const regime = regimeForTurn(state.market, Math.min(state.turn, state.market.levels.cash.length - 1));
  const weather = t(`hud.weather.${regime}`);
  return (
    <header className={`ml-hud${onLang ? '' : ' ml-hud--nolang'}`} aria-label={t('tape.label')}>
      {hexSlot && <div className="ml-hud__hex">{hexSlot}</div>}
      <div className="ml-hud__main">
        <div className="ml-hud__row">
          <Counter
            testId="stat-cash" icon={ICONS.coin} label={t('stat.cash')} value={state.cash} text={money(state.cash, lang, true)}
            sub={<span className={`ml-hud__runway${rw < 1 ? ' ml-hud__runway--low' : ''}`} data-testid="stat-runway" title={t('stat.runway')}> · {t('stat.runway.unit', { n: rw >= 99 ? '99+' : rw.toFixed(1) })}</span>}
          />
          <Counter testId="stat-networth" icon={ICONS.gem} label={t('hud.netWorth')} value={netWorth(state)} text={money(netWorth(state), lang, true)} />
          {onLang && <LangButton onLang={onLang} />}
        </div>
        <div className="ml-hud__row ml-hud__row--meta">
          <span className="ml-hud__chip ml-hud__age ml-tape__age">{t('stat.age', { age: ageLabel(state.age) })}</span>
          <Meter icon={ICONS.heart} value={state.happiness} label={t('stat.happiness')} testId="stat-happiness" />
          <Meter icon={ICONS.people} value={state.relationships} label={t('stat.relationships')} testId="stat-relationships" />
          <span className="ml-hud__chip ml-hud__weather" title={weather} role="img" aria-label={weather}><PixelIcon sprite={WEATHER[regime]} scale={2} /></span>
        </div>
      </div>
    </header>
  );
}
