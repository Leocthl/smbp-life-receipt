// The outgoing slip fades and drops a few pixels while the new one slides in. React unmounts the old slip at once, so a
// copy of its last DOM is laid over the page for ~130ms (inert, no ids or test ids, never in the way of the new slip).

const EXIT_MS = 130;
const params = new URLSearchParams(window.location.search);
/** Test robots measure and click straight after a swap, so they get none unless ?exit=1 asks for it. */
const robot = navigator.webdriver && params.get('exit') !== '1';

export function exitGhost(old: HTMLElement | null): void {
  if (!old || old.hidden || robot || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const host = document.querySelector('.ml-app');
  if (!host) return;
  const ghost = old.cloneNode(true) as HTMLElement;
  const from = old.querySelectorAll('canvas');
  ghost.querySelectorAll('canvas').forEach((c, i) => c.getContext('2d')?.drawImage(from[i], 0, 0)); // canvases clone blank
  ghost.querySelectorAll('[data-testid], [id], [autofocus]').forEach((e) => { e.removeAttribute('data-testid'); e.removeAttribute('id'); e.removeAttribute('autofocus'); });
  ['data-testid', 'data-slip', 'tabindex'].forEach((a) => ghost.removeAttribute(a));
  ghost.setAttribute('aria-hidden', 'true');
  ghost.inert = true;
  ghost.classList.add('ml-stage--exit');
  host.prepend(ghost); // before the new slip, so the new one is on top
  window.setTimeout(() => ghost.remove(), EXIT_MS + 30);
}
