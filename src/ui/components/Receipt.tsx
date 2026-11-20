import type { ReactNode } from 'react';
import { PixelIcon } from './PixelIcon';
import type { Sprite } from './sprites';
import './slip.css';

/** The paper slip every screen is printed on: a pixel-perforated top edge with a drag-handle look, optional stamp. */
export function Receipt({ children, testId, stamp, className }: { children: ReactNode; testId?: string; stamp?: string; className?: string }) {
  return (
    <section className={`ml-receipt ${className ?? ''}`} data-testid={testId}>
      <div className="ml-receipt__edge ml-receipt__edge--top" aria-hidden="true" data-grab><span className="ml-receipt__handle" /></div>
      <div className="ml-receipt__body">
        {children}
        {stamp && <div className="ml-stamp" role="status">{stamp}</div>}
      </div>
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
