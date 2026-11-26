import { useEffect, useState } from 'react';
import { availableDynamicChoices, type DynamicChoice, type DynamicEvent, type DynamicResult } from '../../engine/procedural';
import { spotMenuFor, type FreeActionOption, type FreeActionResult, type FreeSpotKey } from '../../engine/freeChoice';
import type { GameState } from '../../engine/types';
import { Line, Receipt } from '../components/Receipt';
import { money, signed } from '../format';
import { useI18n } from '../i18nContext';
import './freeAction.css';

const MONEY_KEYS = new Set(['stake', 'gain', 'loss', 'payout', 'pay', 'bonus', 'treat', 'moon', 'rug', 'amount', 'cost', 'profit', 'diyCost', 'deposit', 'budgetCost', 'gift', 'modest', 'fee']);

function formatVars(vars: Record<string, number | string>, lang: 'zh' | 'en'): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, MONEY_KEYS.has(k) && typeof v === 'number' ? money(v, lang, true) : v]),
  );
}

/** Procedurally rolled live HK random event card with odds badge and instant outcome view. */
export function DynamicCardView({
  state,
  event,
  result,
  onChoose,
  onNext,
}: {
  state: GameState;
  event: DynamicEvent;
  result: DynamicResult | null;
  onChoose: (choiceId: string) => void;
  onNext: () => void;
}) {
  const { t, lang } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { setSelected(null); }, [event.id]);
  const vars = formatVars(event.vars, lang);
  const choices = availableDynamicChoices(state, event);

  if (result) {
    const rVars = formatVars(result.vars, lang);
    return (
      <Receipt
        testId="result"
        className="ml-dyn"
        foot={<button type="button" className="ml-btn ml-btn--primary" data-testid="next" onClick={onNext} autoFocus>{t('dyn.next')}</button>}
      >
        <div className="ml-dyn__badge">{t('dyn.badge')}</div>
        <h2 className="ml-dyn__title">{t(event.titleKey, vars)}</h2>
        <p className="ml-result__outcome">{t(result.outcomeKey, rVars)}</p>
        <div className="ml-result__lines">
          {result.delta.cash !== 0 && (
            <Line label={t('stat.cash')} value={signed(result.delta.cash, lang)} tone={result.delta.cash > 0 ? 'up' : 'down'} />
          )}
          {result.delta.happiness !== 0 && (
            <Line label={t('stat.happiness')} value={`${result.delta.happiness > 0 ? '+' : ''}${result.delta.happiness}`} tone={result.delta.happiness > 0 ? 'up' : 'down'} />
          )}
          {result.delta.relationships !== 0 && (
            <Line label={t('stat.relationships')} value={`${result.delta.relationships > 0 ? '+' : ''}${result.delta.relationships}`} tone={result.delta.relationships > 0 ? 'up' : 'down'} />
          )}
        </div>
      </Receipt>
    );
  }

  return (
    <Receipt
      testId="card"
      className="ml-dyn"
      foot={(
        <button
          type="button"
          className="ml-btn ml-btn--primary"
          data-testid="confirm"
          disabled={!selected}
          onClick={() => selected && onChoose(selected)}
        >
          {selected ? t('card.pick') : t('card.choose')}
        </button>
      )}
    >
      <div className="ml-dyn__badge" data-testid="dyn-badge">
        {event.badgeOdds !== undefined ? t('dyn.badgeOdds', { odds: event.badgeOdds }) : t('dyn.badge')}
      </div>
      <h2 className="ml-dyn__title">{t(event.titleKey, vars)}</h2>
      <p className="ml-card__text" data-testid="card-text">{t(event.textKey, vars)}</p>
      <div className="ml-card__choices">
        {choices.map((c: DynamicChoice) => {
          const active = selected === c.id;
          return (
            <button
              key={c.id}
              type="button"
              className={`ml-choice${active ? ' ml-choice--on' : ''}`}
              data-testid={`choice-${c.id}`}
              data-tag={c.tags[0] ?? 'safe'}
              aria-pressed={active}
              onClick={() => setSelected(c.id)}
            >
              <span className="ml-choice__glyph" aria-hidden="true">🎲</span>
              <span className="ml-choice__body">
                <span className="ml-choice__label">{t(c.labelKey, vars)}</span>
                <span className="ml-choice__hint">{t(c.whyKey, vars)}</span>
              </span>
              {c.odds !== undefined ? (
                <span className="ml-price">{t('dyn.oddsTag', { odds: Math.round(c.odds * 100) })}</span>
              ) : c.previewCash !== undefined && c.previewCash !== 0 ? (
                <span className="ml-price">{signed(c.previewCash, lang)}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </Receipt>
  );
}

/** Open-world spot menu with custom HK$ slider for player-initiated free actions. */
export function FreeActionModal({
  state,
  spot,
  result,
  remaining,
  onPick,
  onClose,
}: {
  state: GameState;
  spot: FreeSpotKey;
  result: FreeActionResult | null;
  remaining: number;
  onPick: (option: FreeActionOption, customAmount?: number) => void;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const menu = spotMenuFor(state, spot);
  const firstEnabled = menu.options.find((o) => o.enabled)?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(firstEnabled);
  const selected = menu.options.find((o) => o.id === selectedId) ?? null;
  const [amount, setAmount] = useState<number>(selected?.slider?.defaultValue ?? 0);

  useEffect(() => {
    const first = menu.options.find((o) => o.enabled) ?? null;
    setSelectedId(first?.id ?? null);
    setAmount(first?.slider?.defaultValue ?? 0);
  }, [spot]);

  useEffect(() => {
    if (selected?.slider) setAmount(selected.slider.defaultValue);
  }, [selected?.id]);

  if (result) {
    return (
      <Receipt
        testId="free-result"
        className="ml-free"
        foot={<button type="button" className="ml-btn ml-btn--primary" onClick={onClose} autoFocus>{t('free.done')}</button>}
      >
        <h2 className="ml-dyn__title">{t(menu.titleKey)}</h2>
        <p className="ml-result__outcome">{t(result.outcomeKey)}</p>
        <div className="ml-result__lines">
          {result.delta.cash !== 0 && (
            <Line label={t('stat.cash')} value={signed(result.delta.cash, lang)} tone={result.delta.cash > 0 ? 'up' : 'down'} />
          )}
          {result.delta.happiness !== 0 && (
            <Line label={t('stat.happiness')} value={`${result.delta.happiness > 0 ? '+' : ''}${result.delta.happiness}`} tone={result.delta.happiness > 0 ? 'up' : 'down'} />
          )}
          {result.delta.relationships !== 0 && (
            <Line label={t('stat.relationships')} value={`${result.delta.relationships > 0 ? '+' : ''}${result.delta.relationships}`} tone={result.delta.relationships > 0 ? 'up' : 'down'} />
          )}
        </div>
      </Receipt>
    );
  }

  const slider = selected?.slider;
  const setPct = (pct: number) => {
    if (!slider) return;
    const raw = Math.round((slider.max * pct) / slider.step) * slider.step;
    setAmount(Math.max(slider.min, Math.min(slider.max, raw)));
  };

  return (
    <Receipt
      testId="free-modal"
      className="ml-free"
      foot={(
        <div className="ml-free__foot">
          <button type="button" className="ml-btn" onClick={onClose}>{t('free.close')}</button>
          <button
            type="button"
            className="ml-btn ml-btn--primary"
            disabled={!selected || !selected.enabled || remaining <= 0}
            onClick={() => selected && onPick(selected, slider ? amount : undefined)}
          >
            {t('free.confirm')}
          </button>
        </div>
      )}
    >
      <div className="ml-free__head">
        <h2 className="ml-dyn__title">{t(menu.titleKey)}</h2>
        <span className="ml-free__quota">{remaining > 0 ? t('world.freeLeft', { n: remaining }) : t('world.freeDone')}</span>
      </div>
      <p className="ml-free__sub">{t(menu.subtitleKey)}</p>
      <div className="ml-card__choices">
        {menu.options.map((opt) => {
          const active = selectedId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              className={`ml-choice${active ? ' ml-choice--on' : ''}`}
              data-tag={opt.tags[0] ?? 'safe'}
              disabled={!opt.enabled}
              aria-pressed={active}
              onClick={() => { setSelectedId(opt.id); if (opt.slider) setAmount(opt.slider.defaultValue); }}
            >
              <span className="ml-choice__glyph" aria-hidden="true">{opt.triggersMystery ? '🎲' : '✦'}</span>
              <span className="ml-choice__body">
                <span className="ml-choice__label">{t(opt.labelKey)}</span>
                <span className="ml-choice__hint">{opt.enabled ? t(opt.descKey) : t(opt.disabledKey ?? 'free.needCash')}</span>
              </span>
              {opt.fixedAmount !== undefined && opt.fixedAmount > 0 && (
                <span className="ml-price">{money(opt.fixedAmount, lang, true)}</span>
              )}
            </button>
          );
        })}
      </div>

      {slider && selected?.enabled && (
        <div className="ml-free__slider">
          <div className="ml-free__slider-top">
            <label htmlFor="ml-free-amt">{t('free.amount')}</label>
            <strong>{money(amount, lang)}</strong>
          </div>
          <input
            id="ml-free-amt"
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <div className="ml-free__pills">
            {[0.15, 0.35, 0.6, 1].map((p) => (
              <button key={p} type="button" className="ml-btn ml-free__pill" onClick={() => setPct(p)}>
                {p === 1 ? 'MAX' : `${Math.round(p * 100)}%`}
              </button>
            ))}
          </div>
        </div>
      )}
    </Receipt>
  );
}
