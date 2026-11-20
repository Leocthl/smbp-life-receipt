import { createRoot } from 'react-dom/client';
import type { Lang } from '../../i18n';
import { I18nProvider, makeI18n } from '../i18nContext';
import { MiniGame } from './MiniGame';
import type { MiniGameId } from './types';

// Jump hook: ?look=minigame&m=budget|hold|compare (&lang=en, &auto=1). Seed 7. Sets document.title to 'ready' once drawn.

const IDS: MiniGameId[] = ['budget', 'hold', 'compare'];

export function mountLookMini(root: HTMLElement): () => void {
  const q = new URLSearchParams(window.location.search);
  const id: MiniGameId = IDS.find((x) => x === q.get('m')) ?? 'budget';
  const lang: Lang = q.get('lang') === 'en' ? 'en' : 'zh';
  const app = createRoot(root);
  app.render(
    <I18nProvider value={makeI18n(lang)}>
      <MiniGame id={id} seed={7} onDone={() => undefined} onSkip={() => undefined} />
    </I18nProvider>,
  );
  const timer = setInterval(() => {
    if (root.querySelector('canvas[data-drawn="1"]')) {
      document.title = 'ready';
      clearInterval(timer);
    }
  }, 100);
  return () => {
    clearInterval(timer);
    app.unmount();
  };
}
