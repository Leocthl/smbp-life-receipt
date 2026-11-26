import { newGame } from '../engine/sim';
import { translate, type Lang } from '../i18n';
import type { SpotId } from './contracts';
import { worldFor } from './descriptor';
import { descriptorFromQuery } from './lookWorld';
import { createStage, INSET_EVENT } from './stage';

// ?look=stage : the real engine's life, shown in the 3D stage. ?goal=bank walks the beacon and toasts on arrival.
// &scope=room|home|block|district|city (plus the ?look=world query knobs) shows that scope instead; &inset=bottom,top,right fakes the sheet/HUD/panel the app reports.
// &pos=x,z puts the hero there; &auto=1 walks the hero to the goal by itself (screenshots).
const SPOT_IDS: readonly SpotId[] = ['home', 'office', 'bank', 'market', 'cafe', 'park', 'clinic', 'campus', 'pier'];

function isSpot(v: string | null): v is SpotId {
  return v !== null && (SPOT_IDS as readonly string[]).includes(v);
}

function showToast(container: HTMLElement, text: string) {
  const toast = document.createElement('div');
  toast.className = 'ml-stage-toast';
  toast.textContent = text;
  container.append(toast);
  requestAnimationFrame(() => toast.classList.add('ml-stage-toast--on'));
}

export async function mountLookStage(container: HTMLElement): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const lang: Lang = params.get('lang') === 'en' ? 'en' : 'zh';
  const seed = Number(params.get('seed')) || 1;
  const goal = params.get('goal');
  try {
    const d = params.has('scope') ? descriptorFromQuery(params) : worldFor(newGame(seed));
    const stage = createStage(container, d, seed, { lang });
    const inset = (params.get('inset') ?? '').split(',').map(Number);
    if (inset.length === 3 && inset.every(Number.isFinite)) window.dispatchEvent(new CustomEvent(INSET_EVENT, { detail: { bottom: inset[0], top: inset[1], right: inset[2] } }));
    void stage.animate(() => { document.title = 'ready'; return true; });
    if (isSpot(goal)) {
      await stage.goTo(goal);
      showToast(container, translate(lang, 'stage.goal.arrived', { spot: translate(lang, `stage.spot.${goal}`) }));
    }
  } catch (e) {
    const panel = document.createElement('div');
    panel.className = 'ml-stage-panel';
    panel.textContent = e instanceof Error ? e.message : String(e);
    container.append(panel);
  }
}
