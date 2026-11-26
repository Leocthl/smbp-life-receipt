import { forwardRef } from 'react';
import type { Choice, GameEvent, GameState, Literacy } from '../../engine/types';
import { PixelIcon } from '../components/PixelIcon';
import { GLYPHS } from '../components/sprites';
import { choiceCost, tagKey } from '../components/tags';
import { money } from '../format';
import { useChatT } from './useChatT';

const RANK: Record<Literacy, number> = { low: 0, medium: 1, high: 2 };
/** the choices settle in one after another, quickly and unevenly (30-60ms apart, 240ms for the whole list); every button is tappable from the first frame */
const STAGGER_MS = [0, 30, 70, 120, 180, 240];

interface RepliesProps {
  state: GameState;
  event: GameEvent;
  choices: Choice[];
  vars: Record<string, string>;
  selected: string | null;
  onSelect: (id: string) => void;
}

/** The player's possible replies as right-hand bubbles. Keeps every old testid, price tag, hint and fine-print rule. */
export const Replies = forwardRef<HTMLDivElement, RepliesProps>(function Replies({ state, event, choices, vars, selected, onSelect }, ref) {
  const { t, lang } = useChatT();
  const lit = state.character.hidden.literacy;
  return (
    <div ref={ref} className="ml-chat__replies" role="group" aria-label={t('card.choose')}>
      <span className="ml-chat-name ml-chat-name--you">{t('mascot.you')}</span>
      {choices.map((c, i) => {
        const on = c.id === selected;
        const hint = on && c.literacyHint && RANK[lit] >= RANK[c.literacyHint];
        const fine = on && c.hidden && lit === 'high';
        const cost = choiceCost(state, c);
        const tag = tagKey(c.tags);
        const key = `ev.${event.id}.${c.id}`;
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            className={`ml-chat-choice${on ? ' ml-chat-choice--on' : ''}`}
            data-tag={tag}
            data-testid={`choice-${c.id}`}
            style={{ animationDelay: `${STAGGER_MS[Math.min(i, STAGGER_MS.length - 1)]}ms` }}
            onClick={() => onSelect(c.id)}
          >
            <span className="ml-chat-choice__glyph" aria-hidden="true"><PixelIcon sprite={GLYPHS[tag]} scale={3} /></span>
            <span className="ml-chat-choice__body">
              <span className="ml-chat-choice__label">{t(key, vars)}</span>
              {hint && <span className="ml-chat-choice__hint">{t(`${key}.hint`, vars)}</span>}
              {fine && <span className="ml-chat-choice__hint">{t(`${key}.fine`, vars)}</span>}
            </span>
            {cost > 0 && <span className="ml-chat-price" aria-label={t('card.cost', { n: money(cost, lang) })}>{money(cost, lang, true)}</span>}
          </button>
        );
      })}
    </div>
  );
});
