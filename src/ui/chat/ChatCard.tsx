import { useEffect, useRef, useState } from 'react';
import { availableChoices, type Card } from '../../engine/events';
import type { GameState } from '../../engine/types';
import { currentEvent } from '../session';
import type { Emote } from '../mascot/emotes';
import { MascotBubble, SpeakerBubble, Typed } from './Bubble';
import { ChatFrame } from './ChatFrame';
import { termLabel, textVars } from './chatVars';
import { askKey, introEmote, introKey } from './introLines';
import { Replies } from './Replies';
import { useBeat } from './useBeat';
import { useChatT } from './useChatT';

const LAST_STAGE = 3;

/**
 * One decision as a conversation: Slip announces who is calling, the speaker says their piece, Slip asks,
 * and the choices appear as the player's own reply bubbles. Tap a reply, then send it.
 */
export function ChatCard({ state, card, onChoose }: { state: GameState; card: Card; onChoose: (id: string) => void }) {
  const { t, lang } = useChatT();
  const ev = currentEvent(card);
  const choices = availableChoices(state, ev);
  const vars = textVars(state, lang);
  const lit = state.character.hidden.literacy;
  const textKey = ev.jargon && lit === 'low' ? `ev.${ev.id}.textLow` : `ev.${ev.id}.text`;
  const [stage, setStage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [talking, setTalking] = useState(false);
  const beat = useBeat();
  const replies = useRef<HTMLDivElement>(null);
  useEffect(() => { setStage(0); setSelected(null); }, [card]);
  const after = (from: number) => () => beat(() => setStage((s) => (s === from ? from + 1 : s)));
  useEffect(() => {
    if (stage === LAST_STAGE) replies.current?.querySelector('button')?.focus({ preventScroll: true });
  }, [stage]);

  const risky = choices.some((c) => c.tags.includes('risky') || c.tags.includes('debt'));
  const emote: Emote = stage === 0 ? introEmote(ev.speaker) : stage === 1 ? 'neutral' : risky ? 'thinking' : 'curious';
  const footer = stage >= LAST_STAGE && (
    <button type="button" className="ml-chat-btn" data-testid="confirm" disabled={!selected} onClick={() => selected && onChoose(selected)}>
      {selected ? t('card.pick') : t('card.choose')}
    </button>
  );

  return (
    <ChatFrame testId="card" emote={emote} emoteKey={Math.min(stage, 2)} talking={talking} term={termLabel(state, t)} peek={t(textKey, vars)} fit footer={footer} onSkip={() => setSkip((n) => n + 1)}>
      <MascotBubble key={`i${card.eventId}`} name={t('mascot.name')} text={t(introKey(ev.speaker, ev.id), vars)} skipTick={skip} onTyping={setTalking} onDone={after(0)} />
      {stage >= 1 && (
        <SpeakerBubble speaker={ev.speaker} name={t(`speaker.${ev.speaker}`)} testId="card-text">
          <p className="ml-chat__line"><Typed text={t(textKey, vars)} skipTick={skip} onDone={after(1)} /></p>
          {card.reveal && <p className="ml-chat__reveal" data-testid="reveal"><strong>{t('card.reveal')}</strong> {t(`trait.${card.reveal}`)}</p>}
        </SpeakerBubble>
      )}
      {stage >= 2 && <MascotBubble name={t('mascot.name')} text={t(askKey(ev.id, state.turn))} skipTick={skip} onTyping={setTalking} onDone={after(2)} />}
      {stage >= LAST_STAGE && <Replies ref={replies} state={state} event={ev} choices={choices} vars={vars} selected={selected} onSelect={setSelected} />}
    </ChatFrame>
  );
}
