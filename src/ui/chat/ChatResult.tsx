import { useMemo, useState } from 'react';
import type { Card } from '../../engine/events';
import type { ChoiceResult, GameState } from '../../engine/types';
import { qualities, type Qualities } from '../../world3d/qualities';
import { reactionFor } from '../mascot/reaction';
import { currentEvent, type TrailEntry } from '../session';
import { MascotBubble, PlayerBubble, SpeakerBubble, Typed } from './Bubble';
import { ChatFrame } from './ChatFrame';
import { termLabel, textVars } from './chatVars';
import { MiniReceipt } from './MiniReceipt';
import { useBeat } from './useBeat';
import { useChatT } from './useChatT';

const FALLBACK_WEALTH_STEP = 3000;

/** Without the session's before/after, rebuild a rough "before" from the result's own deltas. */
function fallbackEntry(state: GameState, result: ChoiceResult): { before: Qualities; after: Qualities } {
  const after = qualities(state);
  const d = result.delta;
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const wealthStep = Math.sign(d.cash) * Math.min(10, Math.abs(d.cash) / FALLBACK_WEALTH_STEP);
  return { after, before: { ...after, joy: clamp(after.joy - d.happiness), bonds: clamp(after.bonds - d.relationships), wealth: clamp(after.wealth - wealthStep) } };
}

/**
 * What your choice did, said by Slip: the player's reply stays on screen, the story's outcome lands, Slip reacts
 * (face and line), then hands over a mini receipt. `entry` is session.trail's last item; without it the reaction is a rough guess.
 */
export function ChatResult({ state, card, result, entry, onNext }: { state: GameState; card: Card; result: ChoiceResult; entry?: Pick<TrailEntry, 'before' | 'after'>; onNext: () => void }) {
  const { t, lang } = useChatT();
  const ev = currentEvent(card);
  const choice = ev.choices.find((c) => c.id === result.choiceId)!;
  const vars = textVars(state, lang);
  const base = `ev.${ev.id}.${choice.id}`;
  const { before, after } = useMemo(() => entry ?? fallbackEntry(state, result), [entry, state, result]);
  const reaction = useMemo(
    () => reactionFor(before, after, choice.tags, result.notices.map((n) => n.split(':')[0]), `${ev.id}:${choice.id}:${state.turn}`),
    [before, after, choice, result, ev.id, state.turn],
  );
  const [stage, setStage] = useState(result.outcomeId ? 0 : 1);
  const [skip, setSkip] = useState(0);
  const [talking, setTalking] = useState(false);
  const beat = useBeat();
  const advance = (from: number) => () => beat(() => setStage((s) => (s === from ? from + 1 : s)));
  const emote = stage < 1 ? 'curious' : reaction.emote;
  const footer = stage >= 2 && (
    <button type="button" className="ml-chat-btn" data-testid="next" onClick={onNext} autoFocus>{t('result.next')}</button>
  );

  return (
    <ChatFrame testId="result" emote={emote} emoteKey={Math.min(stage, 1)} talking={talking} term={termLabel(state, t)} footer={footer} onSkip={() => setSkip((n) => n + 1)}>
      <PlayerBubble name={t('mascot.you')} testId="chosen"><p className="ml-chat__line">{t(base, vars)}</p></PlayerBubble>
      {result.outcomeId && (
        <SpeakerBubble speaker={ev.speaker} name={t(`speaker.${ev.speaker}`)} testId="outcome">
          <p className="ml-chat__line"><Typed text={t(`${base}.${result.outcomeId}`, vars)} skipTick={skip} onDone={advance(0)} /></p>
        </SpeakerBubble>
      )}
      {stage >= 1 && <MascotBubble name={t('mascot.name')} text={t(reaction.lineKey)} skipTick={skip} onTyping={setTalking} onDone={advance(1)} testId="reaction" />}
      {stage >= 2 && <MiniReceipt state={state} result={result} base={base} vars={vars} before={before} after={after} />}
    </ChatFrame>
  );
}
