import { useEffect, useRef, type ReactNode } from 'react';
import { Mascot } from '../mascot/Mascot';
import { useSheetFit } from '../sheet/sheetFit';
import type { Emote } from '../mascot/emotes';
import { useChatT } from './useChatT';
import '../mascot/mascot.css';
import './chat.css';

/** padding round the thread's content (top + bottom), mirrored by chat.css. The sheet needs room for the replies, the header and the footer; the story above them scrolls. */
const THREAD_PAD = 16;
/** the chat's own bottom margin inside the sheet (sheet.css) */
const CHAT_MARGIN = 6;

export interface ChatFrameProps {
  testId: string;
  emote: Emote;
  emoteKey: number;
  talking: boolean;
  term?: string;
  /** the one line the phone sheet shows next to Slip's face when it is peeking */
  peek?: string;
  /** report how tall the content wants to be, so the phone sheet can open taller for a long list of choices */
  fit?: boolean;
  footer?: ReactNode;
  onSkip: () => void;
  children: ReactNode;
}

/** The chat panel: Slip in a pixel frame on top, a scrolling thread (a live log) below, a pinned action row at the bottom. */
export function ChatFrame({ testId, emote, emoteKey, talking, term, peek, fit = false, footer, onSkip, children }: ChatFrameProps) {
  const { t } = useChatT();
  const report = useSheetFit();
  const thread = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLElement>(null);
  const foot = useRef<HTMLElement>(null);
  const hasFoot = Boolean(footer);

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
    const watcher = new ResizeObserver(() => {
      toEnd();
      if (fit && foot.current && content.lastElementChild) report((head.current?.offsetHeight ?? 0) + (content.lastElementChild as HTMLElement).offsetHeight + THREAD_PAD + foot.current.offsetHeight + CHAT_MARGIN);
    });
    watcher.observe(content);
    return () => watcher.disconnect();
  }, [fit, report, hasFoot]);

  return (
    <section className="ml-chat" data-testid={testId}>
      <header className="ml-chat__head" ref={head} data-grab>
        <div className="ml-chat__frame"><Mascot emote={emote} emoteKey={emoteKey} talking={talking} label={t(`mascot.mood.${emote}`)} /></div>
        <div className="ml-chat__who">
          <span className="ml-chat__name">{t('mascot.name')}</span>
          {term && <span className="ml-chat__term">{term}</span>}
          <span className="ml-chat__mood" aria-hidden="true">{t(`mascot.mood.${emote}`)}</span>
          {peek && <span className="ml-chat__peek" aria-hidden="true">{peek}</span>}
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
      {footer && <footer className="ml-chat__foot" ref={foot}>{footer}</footer>}
    </section>
  );
}
