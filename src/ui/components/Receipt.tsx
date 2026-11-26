import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSheetFit } from '../sheet/sheetFit';
import { PixelIcon } from './PixelIcon';
import type { Sprite } from './sprites';
import './slip.css';

/** top edge (28) + the body's vertical padding (26) + the ink line under it (3): what the sheet needs on top of the content itself */
const CHROME_PX = 57;

/**
 * The paper slip every screen is printed on: a pixel-perforated top edge with a drag-handle look, optional stamp.
 * `foot` is the pinned action (the main button): it sits under the scrolling body, never over its content, with a fade
 * above it while there is more to read. The slip tells the sheet how tall it wants to be so the phone can open it taller.
 */
export function Receipt({ children, testId, stamp, className, foot }: { children: ReactNode; testId?: string; stamp?: string; className?: string; foot?: ReactNode }) {
  const report = useSheetFit();
  const body = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const hasFoot = Boolean(foot);

  useEffect(() => {
    const box = body.current;
    const content = inner.current;
    if (!box || !content) return undefined;
    const measure = () => {
      setMore(box.scrollTop + box.clientHeight < box.scrollHeight - 2);
      report(CHROME_PX + content.offsetHeight + (bar.current?.offsetHeight ?? 0));
    };
    measure();
    const watcher = new ResizeObserver(measure);
    watcher.observe(content);
    watcher.observe(box);
    box.addEventListener('scroll', measure, { passive: true });
    return () => {
      watcher.disconnect();
      box.removeEventListener('scroll', measure);
    };
  }, [report, hasFoot]);

  return (
    <section className={`ml-receipt ${hasFoot ? 'ml-receipt--foot ' : ''}${className ?? ''}`} data-testid={testId} data-more={more ? '' : undefined}>
      <div className="ml-receipt__edge ml-receipt__edge--top" aria-hidden="true" data-grab><span className="ml-receipt__handle" /></div>
      <div className="ml-receipt__body" ref={body}>
        <div className="ml-receipt__inner" ref={inner}>{children}</div>
        {stamp && <div className="ml-stamp" role="status">{stamp}</div>}
      </div>
      {foot && <div className="ml-receipt__foot" ref={bar}>{foot}</div>}
      <div className="ml-receipt__edge ml-receipt__edge--bottom" aria-hidden="true" />
    </section>
  );
}

export function Line({ label, value, strong, tone, icon }: { label: ReactNode; value: ReactNode; strong?: boolean; tone?: 'up' | 'down'; icon?: Sprite }) {
  return (
    <div className={`ml-line${strong ? ' ml-line--strong' : ''}${tone ? ` ml-line--${tone}` : ''}`}>
      {icon && <PixelIcon sprite={icon} scale={2} className="ml-line__icon" />}
      <span className="ml-line__label">{label}</span>
      <span className="ml-line__dots" aria-hidden="true" />
      <span className="ml-line__value">{value}</span>
    </div>
  );
}
