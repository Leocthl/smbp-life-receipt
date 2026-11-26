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
    let pinned = 0; // where toEnd last left the scroll; moving away from it means the player scrolled
    // newest bubble at the bottom; a tall one (the receipt) keeps the line before it in view instead
    const toEnd = () => {
      const last = content.lastElementChild as HTMLElement | null;
      const prev = last?.previousElementSibling as HTMLElement | null;
      const gap = prev ? prev.getBoundingClientRect().top - content.getBoundingClientRect().top : 0;
      const fromPrev = last?.dataset.scroll === 'from-previous' && prev;
      box.scrollTop = fromPrev ? gap - 6 : box.scrollHeight;
      pinned = box.scrollTop;
      // the one older turn the top edge slices through is hidden (until the player scrolls up), so the first bubble in view is always whole
      for (const c of Array.from(content.children)) c.removeAttribute('data-fold');
      if (fromPrev) return;
      const edge = box.getBoundingClientRect().top;
      const sliced = Array.from(content.children).slice(0, -1).find((c) => { const r = c.getBoundingClientRect(); return r.top < edge - 1 && r.bottom > edge + 1; });
      sliced?.setAttribute('data-fold', '');
    };
    // a soft fade where the thread is cut off, so a half-scrolled bubble reads as scrolled and not as broken
    const cuts = () => {
      if (Math.abs(box.scrollTop - pinned) > 4) for (const c of Array.from(content.children)) c.removeAttribute('data-fold');
      box.toggleAttribute('data-cut-t', box.scrollTop > 2 && !content.querySelector('[data-fold]'));
      box.toggleAttribute('data-cut-b', box.scrollTop + box.clientHeight < box.scrollHeight - 2);
    };
    toEnd();
    cuts();
    const watcher = new ResizeObserver(() => {
      toEnd();
      cuts();
      if (fit && foot.current && content.lastElementChild) {
        // the reply list (or the receipt) plus the line before it, so Slip's question is never what gets cut
        const last = content.lastElementChild as HTMLElement;
        const prev = last.previousElementSibling as HTMLElement | null;
        const span = prev ? content.getBoundingClientRect().bottom - prev.getBoundingClientRect().top : last.offsetHeight;
        report((head.current?.offsetHeight ?? 0) + span + THREAD_PAD + foot.current.offsetHeight + CHAT_MARGIN);
      }
    });
    watcher.observe(content);
    watcher.observe(box); // the sheet changing height (a snap, a drag) keeps the newest line in view too
    box.addEventListener('scroll', cuts, { passive: true });
    return () => {
      watcher.disconnect();
      box.removeEventListener('scroll', cuts);
    };
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
