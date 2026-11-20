import type { Card } from '../../engine/events';
import type { ChoiceResult, GameState } from '../../engine/types';
import { ChatResult } from '../chat/ChatResult';
import type { TrailEntry } from '../session';

/**
 * What your choice did, as Slip's reply. Pass `entry` (the last item of session.trail) so Slip can react
 * to the real before/after six qualities; without it the reaction is estimated from the result.
 */
export function ResultScreen({ state, card, result, entry, onNext }: { state: GameState; card: Card; result: ChoiceResult; entry?: Pick<TrailEntry, 'before' | 'after'>; onNext: () => void }) {
  return <ChatResult state={state} card={card} result={result} entry={entry} onNext={onNext} />;
}
