import { useEffect, useRef, type ReactNode } from 'react';
import { Mascot } from '../mascot/Mascot';
import type { Emote } from '../mascot/emotes';
import { useChatT } from './useChatT';
import '../mascot/mascot.css';
import './chat.css';

export interface ChatFrameProps {
  testId: string;
  emote: Emote;
  emoteKey: number;
  talking: boolean;
  term?: string;
  footer?: ReactNode;
  onSkip: () => void;
  children: ReactNode;
}

/** The chat panel: Slip in a pixel frame on top, a scrolling thread (a live log) below, a pinned action row at the bottom. */
export function ChatFrame({ testId, emote, emoteKey, talking, term, footer, onSkip, children }: ChatFrameProps) {
  const { t } = useChatT();
  const thread = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = thread.current;
    const content = inner.current;
    if (!box || !content) return undefined;
    // newest bubble at the bottom; a tall one (the receipt) keeps the line before it in view instead
    const toEnd = () => {
      const last = content.lastElementChild as HTMLElement | null;
      const prev = last?.previousElementSibling as HTMLElement | null;
      const gap = prev ? prev.getBoundingClientRect().top - content.getBoundingClientRect().top : 0;
      box.scrollTop = last?.dataset.scroll === 'from-previous' && prev ? gap - 6 : box.scrollHeight;
    };
    toEnd();
    const watcher = new ResizeObserver(toEnd);
    watcher.observe(content);
    return () => watcher.disconnect();
  }, []);

  return (
    <section className="ml-chat" data-testid={testId}>
      <header className="ml-chat__head">
        <div className="ml-chat__frame"><Mascot emote={emote} emoteKey={emoteKey} talking={talking} label={t(`mascot.mood.${emote}`)} /></div>
        <div className="ml-chat__who">
          <span className="ml-chat__name">{t('mascot.name')}</span>
          {term && <span className="ml-chat__term">{term}</span>}
          <span className="ml-chat__mood" aria-hidden="true">{t(`mascot.mood.${emote}`)}</span>
        </div>
      </header>
      <div
        ref={thread}
        className="ml-chat__thread"
        role="log"
        aria-live="polite"
        aria-label={t('mascot.thread')}
        title={t('mascot.skipHint')}
        onClick={(e) => { if (!(e.target as HTMLElement).closest('button')) onSkip(); }}
      >
        <div ref={inner} className="ml-chat__inner">{children}</div>
      </div>
      {footer && <footer className="ml-chat__foot">{footer}</footer>}
    </section>
  );
}
