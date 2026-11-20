import './cutscene.css';

export interface Overlay {
  readonly root: HTMLElement;
  /** resolves once when the viewer skips (button, Esc, and tap/space in tap mode) */
  readonly skipped: Promise<void>;
  /** true while the viewer holds the screen or space (hold mode only) */
  fast(): boolean;
  /** narration subtitle; '' hides it */
  line(text: string): void;
  dispose(): void;
}

export interface OverlayOptions {
  /** tap: any tap or space skips. hold: pressing fast-forwards, only the button and Esc skip */
  mode: 'tap' | 'hold';
  skipText: string;
  hint?: string;
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function createOverlay(o: OverlayOptions): Overlay {
  const host = document.querySelector<HTMLElement>('.ml-stage') ?? document.body;
  const root = el('div', 'ml-cut');
  const subtitle = el('div', 'ml-cut-line');
  subtitle.setAttribute('aria-live', 'polite');
  const button = el('button', 'ml-cut-skip', o.skipText);
  button.type = 'button';
  root.append(subtitle, button);
  if (o.hint) root.append(el('div', 'ml-cut-hint', o.hint));
  host.append(root);
  let resolveSkip: () => void = () => {};
  const skipped = new Promise<void>((r) => { resolveSkip = r; });
  let held = false;
  const pointerDown = (e: PointerEvent) => {
    if (e.target === button) return;
    if (o.mode === 'tap') resolveSkip(); else held = true;
  };
  const release = () => { held = false; };
  const keyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { resolveSkip(); return; }
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (o.mode === 'tap') resolveSkip(); else held = true;
  };
  const keyUp = (e: KeyboardEvent) => { if (e.key === ' ') held = false; };
  button.addEventListener('click', () => resolveSkip());
  root.addEventListener('pointerdown', pointerDown);
  root.addEventListener('pointerup', release);
  root.addEventListener('pointercancel', release);
  root.addEventListener('pointerleave', release);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  let shown = '';
  return {
    root, skipped, fast: () => held,
    line(text) {
      if (text === shown) return;
      shown = text;
      if (text) subtitle.textContent = text;
      subtitle.classList.toggle('ml-cut-line--on', text !== '');
    },
    dispose() {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      root.remove();
    },
  };
}
