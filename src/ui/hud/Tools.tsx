import { PixelIcon } from '../components/PixelIcon';
import { setMuted, useMuted } from '../audio';
import { useI18n } from '../i18nContext';
import { TOOL_ICONS } from './toolSprites';

/** Sound on/off: 44px, remembered, instant. data-quiet keeps the global UI click off this one. */
export function SoundButton() {
  const { t } = useI18n();
  const muted = useMuted();
  return (
    <button
      type="button" className="ml-lang ml-hud__tool" data-testid="sound" data-quiet aria-pressed={!muted}
      aria-label={t('juice.sound')} title={t(muted ? 'juice.sound.off' : 'juice.sound.on')} onClick={() => setMuted(!muted)}
    >
      <PixelIcon sprite={muted ? TOOL_ICONS.soundOff : TOOL_ICONS.soundOn} scale={2} />
    </button>
  );
}

/** Reopens the how-to-play and glossary. */
export function HelpButton({ onHelp }: { onHelp: () => void }) {
  const { t } = useI18n();
  return (
    <button type="button" className="ml-lang ml-hud__tool" data-testid="help" aria-label={t('juice.help')} title={t('juice.help')} onClick={onHelp}>
      <PixelIcon sprite={TOOL_ICONS.help} scale={2} />
    </button>
  );
}
