import { useEffect, useRef, type ReactNode } from 'react';
import type { Speaker } from '../../engine/types';
import { PixelIcon } from '../components/PixelIcon';
import { PORTRAITS } from '../components/sprites';
import { SPEAKER_HUE } from '../components/tags';
import { useTypewriter } from './useTypewriter';

/** Text that types in. Screen readers get the whole line at once; the visible part is hidden from them. */
export function Typed({ text, skipTick, onDone, onTyping }: { text: string; skipTick: number; onDone?: () => void; onTyping?: (typing: boolean) => void }) {
  const { shown, done } = useTypewriter(text, skipTick);
  const doneRef = useRef(onDone);
  const typingRef = useRef(onTyping);
  doneRef.current = onDone;
  typingRef.current = onTyping;
  useEffect(() => {
    typingRef.current?.(!done);
    if (done) doneRef.current?.();
  }, [done]);
  useEffect(() => () => typingRef.current?.(false), []);
  return (
    <>
      <span aria-hidden="true">{shown}</span>
      <span className="ml-chat__ghost" aria-hidden="true">{text.slice(shown.length)}</span>
      <span className="ml-sr">{text}</span>
    </>
  );
}

interface TypedProps { text: string; skipTick: number; onDone?: () => void; onTyping?: (typing: boolean) => void }

/** A line from Slip, on the left, with a name tag. */
export function MascotBubble({ name, testId, ...typed }: TypedProps & { name: string; testId?: string }) {
  return (
    <div className="ml-chat-row ml-chat-row--them">
      <span className="ml-chat-name ml-chat-name--slip">{name}</span>
      <p className="ml-chat-bubble ml-chat-bubble--slip" data-testid={testId}><Typed {...typed} /></p>
    </div>
  );
}

/** A line from whoever is talking in the story, with their pixel portrait and name plate. */
export function SpeakerBubble({ speaker, name, testId, children }: { speaker: Speaker; name: string; testId?: string; children: ReactNode }) {
  return (
    <div className="ml-chat-row ml-chat-row--them">
      <span className="ml-chat-name" data-hue={SPEAKER_HUE[speaker]}>
        <PixelIcon sprite={PORTRAITS[speaker]} scale={1} className="ml-chat-name__icon" />
        {name}
      </span>
      <div className="ml-chat-bubble ml-chat-bubble--speaker" data-hue={SPEAKER_HUE[speaker]} data-testid={testId}>{children}</div>
    </div>
  );
}

/** What the player said, on the right. */
export function PlayerBubble({ name, testId, children }: { name: string; testId?: string; children: ReactNode }) {
  return (
    <div className="ml-chat-row ml-chat-row--you">
      <span className="ml-chat-name ml-chat-name--you">{name}</span>
      <div className="ml-chat-bubble ml-chat-bubble--you" data-testid={testId}>{children}</div>
    </div>
  );
}
