import type { GameState } from '../../engine/types';
import { Hud } from '../hud/Hud';

/** Kept so App.tsx keeps working until it mounts the Hud directly (with hexSlot and onLang). */
export function StatsTape({ state }: { state: GameState }) {
  return <Hud state={state} />;
}
