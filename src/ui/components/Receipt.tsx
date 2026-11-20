import type { ReactNode } from 'react';

/** The paper slip every screen is printed on: torn top and bottom edges, optional stamp. */
export function Receipt({ children, testId, stamp, className }: { children: ReactNode; testId?: string; stamp?: string; className?: string }) {
  return (
    <section className={`ml-receipt ${className ?? ''}`} data-testid={testId}>
      <div className="ml-receipt__edge ml-receipt__edge--top" aria-hidden="true" />
      <div className="ml-receipt__body">{children}</div>
      {stamp && <div className="ml-stamp" role="status">{stamp}</div>}
      <div className="ml-receipt__edge ml-receipt__edge--bottom" aria-hidden="true" />
    </section>
  );
}

export function Line({ label, value, strong, tone }: { label: ReactNode; value: ReactNode; strong?: boolean; tone?: 'up' | 'down' }) {
  return (
    <div className={`ml-line${strong ? ' ml-line--strong' : ''}${tone ? ` ml-line--${tone}` : ''}`}>
      <span className="ml-line__label">{label}</span>
      <span className="ml-line__dots" aria-hidden="true" />
      <span className="ml-line__value">{value}</span>
    </div>
  );
}
