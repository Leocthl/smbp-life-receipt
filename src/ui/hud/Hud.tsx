import { useEffect, useRef, type ReactNode } from 'react';
import { runway, netWorth } from '../../engine/finance';
import type { GameState } from '../../engine/types';
import { PixelIcon } from '../components/PixelIcon';
import { ICONS, type Sprite } from '../components/sprites';
import { WEATHER } from '../components/weather';
import { ageLabel, money, signed } from '../format';
import { shownRegime } from '../flow';
import { useI18n } from '../i18nContext';
import { useChange, useTween } from '../juice/motion';
import { HelpButton, SoundButton } from './Tools';
import './hud.css';

/** A number that flashes green or red for a moment when it goes up or down. `value` is the real target, `text` the tweened display. */
function Num({ value, text }: { value: number; text: string }) {
  const prev = useRef(value);
  const dir = value > prev.current ? 'up' : value < prev.current ? 'down' : '';
  useEffect(() => { prev.current = value; }, [value]);
  return <span key={value} className={`ml-hud__num${dir ? ` ml-hud__num--${dir}` : ''}`}>{text}</span>;
}

/** The floating "+$500" / "-$3,000": an arrow and a sign as well as a colour, so it never relies on colour alone. */
function Delta({ delta, n, text }: { delta: number; n: number; text: string }) {
  if (!delta) return null;
  return <span key={n} className={`ml-hud__delta ml-hud__delta--${delta > 0 ? 'up' : 'down'}`} aria-hidden="true" data-testid="delta">{delta > 0 ? '▲' : '▼'} {text}</span>;
}

function Counter({ testId, icon, label, sub, value, format, deltaText }: { testId: string; icon: Sprite; label: string; sub?: ReactNode; value: number; format: (n: number) => string; deltaText: (d: number) => string }) {
  const shown = useTween(value);
  const ch = useChange(value);
  const worried = ch.delta < 0 && value < 0 && value - ch.delta >= 0; // just fell below zero
  const pulse = ch.delta ? ` ml-hud__pulse--${ch.delta > 0 ? 'up' : 'down'}` : '';
  return (
    <div className={`ml-hud__counter${value < 0 ? ' ml-hud__counter--neg' : ''}${pulse}${worried ? ' ml-hud__counter--shake' : ''}`} data-testid={testId}>
      <PixelIcon sprite={icon} scale={2} />
      <span className="ml-hud__stack">
        <span className="ml-hud__label">{label}{sub}</span>
        <Num value={value} text={format(Math.round(shown))} />
      </span>
      <Delta delta={Math.round(ch.delta)} n={ch.n} text={deltaText(ch.delta)} />
    </div>
  );
}

/** A 0..100 stat: pixel icon, number and a ten-block meter. */
function Meter({ icon, value, label, testId }: { icon: Sprite; value: number; label: string; testId: string }) {
  const shown = useTween(value);
  const ch = useChange(value);
  const lit = Math.round(shown / 10);
  const pulse = ch.delta ? ` ml-hud__pulse--${ch.delta > 0 ? 'up' : 'down'}` : '';
  return (
    <div className={`ml-hud__chip ml-hud__meter${pulse}`} data-testid={testId} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <PixelIcon sprite={icon} scale={2} />
      <span className="ml-hud__stack">
        <Num value={value} text={String(Math.round(shown))} />
        <span className="ml-hud__pips" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => <span key={i} className={i < lit ? 'is-on' : ''} />)}
        </span>
      </span>
      <Delta delta={Math.round(ch.delta)} n={ch.n} text={`${ch.delta > 0 ? '+' : ''}${Math.round(ch.delta)}`} />
    </div>
  );
}

function LangButton({ onLang }: { onLang: () => void }) {
  const { t } = useI18n();
  return <button type="button" className="ml-lang" data-testid="lang" onClick={onLang}>{t('app.lang')}</button>;
}

interface HudProps {
  state?: GameState | null;
  hexSlot?: ReactNode;
  onLang?: () => void;
  /** reopens the how-to-play dialog (the "?" button) */
  onHelp?: () => void;
  /** a film is playing: the bar stays mounted (so deltas are not lost) but out of sight */
  away?: boolean;
  /** the tutorial is pointing at the numbers: lift the bar above its dimmer */
  spotlight?: boolean;
}

function FullHud({ state, hexSlot, onLang, onHelp, away, spotlight }: HudProps & { state: GameState }) {
  const { t, lang } = useI18n();
  const rw = runway(state);
  const age = useChange(Math.floor(state.age), 900);
  const regime = shownRegime(state); // last year's weather: this year's is a spoiler until the year-end receipt
  const weather = t(`hud.weather.${regime}`);
  const compact = (n: number) => money(n, lang, true);
  const cls = `ml-hud${onLang ? '' : ' ml-hud--nolang'}${away ? ' ml-hud--away' : ''}${spotlight ? ' ml-hud--spot' : ''}`;
  return (
    <header className={cls} aria-label={t('tape.label')}>
      {hexSlot && <div className="ml-hud__hex">{hexSlot}</div>}
      <div className="ml-hud__main">
        <div className="ml-hud__row">
          <Counter
            testId="stat-cash" icon={ICONS.coin} label={t('stat.cash')} value={state.cash} format={compact} deltaText={(d) => signed(d, lang)}
            sub={<span className={`ml-hud__runway${rw < 1 ? ' ml-hud__runway--low' : ''}`} data-testid="stat-runway" title={t('stat.runway')}> · {t('stat.runway.unit', { n: rw >= 99 ? '99+' : rw.toFixed(1) })}</span>}
          />
          <Counter testId="stat-networth" icon={ICONS.gem} label={t('hud.netWorth')} value={netWorth(state)} format={compact} deltaText={(d) => signed(d, lang)} />
          {onLang && <LangButton onLang={onLang} />}
        </div>
        <div className="ml-hud__row ml-hud__row--meta">
          <span key={age.n} className={`ml-hud__chip ml-hud__age ml-tape__age${age.delta ? ' ml-hud__age--pop' : ''}`}>{t('stat.age', { age: ageLabel(state.age) })}<span className="ml-hud__weather" title={weather} role="img" aria-label={weather}><PixelIcon sprite={WEATHER[regime]} scale={2} /></span></span>
          <Meter icon={ICONS.heart} value={state.happiness} label={t('stat.happiness')} testId="stat-happiness" />
          <Meter icon={ICONS.people} value={state.relationships} label={t('stat.relationships')} testId="stat-relationships" />
          <div className="ml-hud__tools">
            <SoundButton />
            {onHelp && <HelpButton onHelp={onHelp} />}
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * The top bar over the world: age, cash, net worth, happiness, people and the market weather, with sound and help buttons.
 * Props: `state` (null shows only the sound and language buttons, for the start and intro screens),
 * `hexSlot` for a 56px HexBadge, `onLang` to show the language toggle (data-testid="lang").
 */
export function Hud(props: HudProps) {
  const { state, onLang } = props;
  if (!state) return onLang ? <div className="ml-hud ml-hud--bare"><SoundButton /><LangButton onLang={onLang} /></div> : null;
  return <FullHud {...props} state={state} />;
}
