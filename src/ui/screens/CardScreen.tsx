import type { Card } from '../../engine/events';
import type { GameState } from '../../engine/types';
import { ChatCard } from '../chat/ChatCard';

export { termLabel, textVars } from '../chat/chatVars';

/** One decision, played out as a chat with the mascot. See src/ui/chat/ChatCard.tsx. */
export function CardScreen({ state, card, onChoose }: { state: GameState; card: Card; onChoose: (id: string) => void }) {
  return <ChatCard state={state} card={card} onChoose={onChoose} />;
}
