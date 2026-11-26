import { useEffect, useRef, useState } from 'react';
import { buildEnding } from '../../engine/endings';
import { play, playFanfare, type EndingTone } from '../audio';
import { reactionFor } from '../mascot/reaction';
import { currentEvent, type Session } from '../session';
import { haptic } from './motion';
import { detectMilestones, snapOf, type MilestoneId } from './milestones';

export interface Toast { key: number; id: Exclude<MilestoneId, 'broke'> }

const GOOD_LABELS = new Set(['saverKing', 'steady', 'riskWinner', 'zenInvestor', 'familyPillar']);
const COIN_TICKS = 3;
const MAX_TOASTS = 2;

/** Which fanfare an ending label gets: bright for the labels that built something, wry for the debt-ridden, warm otherwise. */
export const endingTone = (label: string): EndingTone => (GOOD_LABELS.has(label) ? 'triumph' : label === 'debtJuggler' ? 'wry' : 'warm');

/** A short ladder of coin ticks that follows the ka-ching while the cash number rolls. */
function coinTicks(dir: number): void {
  for (let i = 1; i <= COIN_TICKS; i += 1) window.setTimeout(() => play('coin', dir), 110 * i);
}

/**
 * Watches the session and turns what just happened into feel: ka-ching and chirps on a result, a chime at the year-end,
 * a fanfare at the ending, and short celebrations for milestones. Silent while `quiet` (the ?fast auto-player).
 * Returns the toasts to show and a way to dismiss one.
 */
export function useJuice(session: Session | null, quiet: boolean): { toasts: Toast[]; dismiss: (key: number) => void } {
  const prev = useRef<Session | null>(null);
  const done = useRef(new Set<MilestoneId>());
  const keys = useRef(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const before = prev.current;
    prev.current = session;
    if (!session || !before || before === session) return;
    const newLife = before.state.seed !== session.state.seed || session.state.turn < before.state.turn;
    if (newLife) { done.current = new Set(); setToasts([]); return; }
    if (quiet) return;

    const from = before.screen.kind;
    const s = session.screen;
    if (s.kind !== from) {
      if (s.kind === 'result') {
        const cash = s.result.delta.cash;
        if (cash !== 0) { play('kaching', cash); coinTicks(Math.sign(cash)); }
        const ev = currentEvent(s.card);
        const entry = session.trail[session.trail.length - 1];
        const tags = ev.choices.find((c) => c.id === s.result.choiceId)?.tags ?? [];
        if (entry) {
          const tone = reactionFor(entry.before, entry.after, tags, s.result.notices.map((n) => n.split(':')[0]), `${ev.id}:${s.result.choiceId}`).tone;
          if (tone === 'good') window.setTimeout(() => play('chirpHappy'), 420);
          else if (tone === 'bad') window.setTimeout(() => play('chirpWorried'), 420);
        }
      } else if (s.kind === 'summary') play('yearEnd');
      else if (s.kind === 'ending') playFanfare(endingTone(buildEnding(session.state, s.goal).label));
    }

    const hits = detectMilestones(snapOf(before.state), snapOf(session.state), done.current);
    const cheers = hits.filter((h): h is Toast['id'] => h !== 'broke');
    cheers.forEach((h) => done.current.add(h));
    if (hits.includes('broke')) { play('chirpWorried'); haptic(30); }
    if (cheers.length) {
      play('milestone');
      haptic([20, 40, 20]);
      setToasts((list) => [...list, ...cheers.map((id) => ({ key: (keys.current += 1), id }))].slice(-MAX_TOASTS));
    }
  }, [session, quiet]);

  return { toasts, dismiss: (key) => setToasts((list) => list.filter((t) => t.key !== key)) };
}
