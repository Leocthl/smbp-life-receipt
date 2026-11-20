import type { ChoiceResult, GameState } from '../../engine/types';
import { QualityDelta } from '../hex/QualityDelta';
import { PixelIcon } from '../components/PixelIcon';
import { ICONS } from '../components/sprites';
import { signed } from '../format';
import { qualityDelta, type Qualities } from '../../world3d/qualities';
import { useChatT } from './useChatT';

const NOTICE_KEYS = ['auto_borrow', 'scheme_borrow', 'bankrupt', 'cannot_afford_property', 'no_cash_to_invest', 'forced_sale'];
const tone = (n: number) => (n > 0 ? 'up' : 'down');
const plus = (n: number) => `${n > 0 ? '+' : ''}${n}`;

/** Notices worth showing, once each, in the order the engine raised them. */
export const shownNotices = (result: ChoiceResult) => [...new Set(result.notices.map((n) => n.split(':')[0]))].filter((n) => NOTICE_KEYS.includes(n));

function Row({ label, value, dir, icon }: { label: string; value: string; dir?: 'up' | 'down'; icon?: (typeof ICONS)[string] }) {
  return (
    <div className={`ml-chat-slip__row${dir ? ` ml-chat-slip__row--${dir}` : ''}`}>
      {icon && <PixelIcon sprite={icon} scale={2} className="ml-chat-slip__icon" />}
      <span className="ml-chat-slip__label">{label}</span>
      <span className="ml-chat-slip__dots" aria-hidden="true" />
      <span className="ml-chat-slip__value">{value}</span>
    </div>
  );
}

/** Slip hands over what changed: a mini receipt with the money lines, notices, discoveries, the six-quality chips and a "why" note. */
export function MiniReceipt({ state, result, base, vars, before, after }: {
  state: GameState; result: ChoiceResult; base: string; vars: Record<string, string>; before: Qualities; after: Qualities;
}) {
  const { t, lang } = useChatT();
  const d = result.delta;
  const monthly = d.monthly ?? 0;
  const quiet = d.cash === 0 && d.happiness === 0 && d.relationships === 0 && monthly === 0;
  const notices = shownNotices(result);
  return (
    <div className="ml-chat-slip" data-testid="receipt" data-turn={state.turn} data-scroll="from-previous">
      <p className="ml-chat-slip__title">{t('mascot.receipt.title')}</p>
      <div className="ml-chat-slip__rows">
        {d.cash !== 0 && <Row icon={ICONS.coin} label={t('result.cash')} value={signed(d.cash, lang)} dir={tone(d.cash)} />}
        {d.happiness !== 0 && <Row icon={ICONS.heart} label={t('result.happiness')} value={plus(d.happiness)} dir={tone(d.happiness)} />}
        {d.relationships !== 0 && <Row icon={ICONS.people} label={t('result.relationships')} value={plus(d.relationships)} dir={tone(d.relationships)} />}
        {monthly !== 0 && <Row label={t('result.monthly')} value={`${signed(monthly, lang)}${t('perMonth')}`} dir={tone(monthly)} />}
        {quiet && <Row label={t('result.nothing')} value="" />}
      </div>
      {result.reveals.map((r) => (
        <p key={r} className="ml-chat__reveal" data-testid="reveal"><strong>{t('card.reveal')}</strong> {t(`trait.${r}`)}</p>
      ))}
      {notices.map((n) => <p key={n} className="ml-chat-slip__notice">{t(`notice.${n}`)}</p>)}
      <QualityDelta delta={qualityDelta(before, after)} />
      <p className="ml-chat-slip__why"><strong>{t('mascot.receipt.note')}</strong> {t(`${base}.why`, vars)}</p>
    </div>
  );
}
