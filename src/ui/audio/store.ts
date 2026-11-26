// Tiny external store for the sound switch, remembered in localStorage. useSyncExternalStore reads it.
const KEY = 'ml-muted';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false; // storage blocked: sound stays on, the choice just is not remembered
  }
}

let muted = read();

export const isMuted = (): boolean => muted;

export function setMutedFlag(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem(KEY, next ? '1' : '0');
  } catch {
    // not remembered
  }
  listeners.forEach((l) => l());
}

export function subscribeMuted(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
