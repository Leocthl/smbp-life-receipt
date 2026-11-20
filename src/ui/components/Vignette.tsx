import type { ReactElement } from 'react';
import type { Speaker, Tag } from '../../engine/types';

// Small flat scenes drawn in code: who is talking (left) and what your highlighted choice does (right).
// Colours come from CSS variables so the whole thing stays on the receipt palette.

export type Mood = 'idle' | 'spend' | 'save' | 'grow' | 'risky' | 'debt' | 'family' | 'safe' | 'sell' | 'work' | 'status';

const MOOD_BY_TAG: [Tag, Mood][] = [
  ['debt', 'debt'], ['risky', 'risky'], ['sell', 'sell'], ['fun', 'spend'], ['spend', 'spend'], ['family', 'family'],
  ['invest', 'grow'], ['hold', 'grow'], ['insure', 'safe'], ['save', 'save'], ['career', 'work'], ['work', 'work'],
  ['status', 'status'], ['safe', 'safe'],
];

export function moodFor(tags: Tag[] | undefined): Mood {
  if (!tags) return 'idle';
  return MOOD_BY_TAG.find(([t]) => tags.includes(t))?.[1] ?? 'idle';
}

const ink = 'var(--ml-ink)';
const paper = 'var(--ml-paper)';
const red = 'var(--ml-stamp)';
const soft = 'var(--ml-faint)';

function Person({ x, accessory }: { x: number; accessory?: ReactElement }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <circle cx="0" cy="34" r="11" fill={paper} stroke={ink} strokeWidth="2.5" />
      <path d="M-17 82 Q-17 52 0 50 Q17 52 17 82 Z" fill={ink} />
      {accessory}
    </g>
  );
}

const SPEAKERS: Record<Speaker, ReactElement> = {
  friend: <Person x={40} accessory={<path d="M-12 26 Q0 14 12 26 L14 22 Q0 8 -14 22 Z" fill={red} />} />,
  agent: <Person x={40} accessory={<g><path d="M0 52 L-4 62 L0 76 L4 62 Z" fill={red} /><rect x="16" y="64" width="18" height="14" rx="2" fill={paper} stroke={ink} strokeWidth="2.5" /></g>} />,
  landlord: <g><rect x="18" y="18" width="40" height="64" rx="2" fill={paper} stroke={ink} strokeWidth="2.5" /><circle cx="50" cy="52" r="3" fill={ink} /><path d="M58 40 l14 -6 m-4 2 l2 5 m-6 -3 l2 5" stroke={red} strokeWidth="3" fill="none" strokeLinecap="round" /></g>,
  headline: <g><rect x="12" y="20" width="62" height="58" fill={paper} stroke={ink} strokeWidth="2.5" /><rect x="18" y="26" width="50" height="7" fill={ink} /><path d="M20 66 L32 50 L42 58 L54 40 L66 70" stroke={red} strokeWidth="3" fill="none" strokeLinejoin="round" /></g>,
  boss: <g><Person x={40} accessory={<path d="M0 52 L-4 62 L0 76 L4 62 Z" fill={paper} />} /><rect x="6" y="68" width="68" height="8" fill={soft} /></g>,
  doctor: <Person x={40} accessory={<g><rect x="5" y="58" width="10" height="10" fill={paper} /><path d="M10 59 v8 M6 63 h8" stroke={red} strokeWidth="2.5" /></g>} />,
  parent: <g><Person x={30} /><g transform="translate(58 18) scale(0.75)"><Person x={0} /></g><path d="M44 74 h26 q-2 10 -13 10 q-11 0 -13 -10 Z" fill={paper} stroke={ink} strokeWidth="2" /></g>,
  bank: <g><rect x="10" y="30" width="64" height="42" rx="6" fill={paper} stroke={ink} strokeWidth="2.5" /><rect x="18" y="42" width="14" height="10" rx="2" fill={red} /><path d="M18 62 h40" stroke={ink} strokeWidth="2.5" strokeDasharray="4 3" /></g>,
  self: <g><Person x={36} /><path d="M50 62 h26 l-4 16 h-26 Z" fill={paper} stroke={ink} strokeWidth="2.5" /></g>,
  partner: <g><Person x={28} /><Person x={56} /><path d="M42 20 q-6 -8 -12 -2 q-4 6 12 16 q16 -10 12 -16 q-6 -6 -12 2 Z" fill={red} /></g>,
  phone: <g><rect x="22" y="12" width="38" height="70" rx="6" fill={ink} /><rect x="26" y="20" width="30" height="52" rx="2" fill={paper} /><rect x="29" y="26" width="20" height="8" rx="4" fill={soft} /><rect x="33" y="40" width="20" height="8" rx="4" fill={red} /><rect x="29" y="54" width="16" height="8" rx="4" fill={soft} /></g>,
  campus: <g><path d="M8 38 L42 18 L76 38 Z" fill={ink} /><rect x="12" y="40" width="60" height="4" fill={ink} /><path d="M18 46 v28 M30 46 v28 M42 46 v28 M54 46 v28 M66 46 v28" stroke={ink} strokeWidth="4" /><rect x="8" y="76" width="68" height="6" fill={ink} /></g>,
};

const MOODS: Record<Mood, ReactElement> = {
  idle: <g><circle cx="0" cy="0" r="4" fill={soft} /><circle cx="14" cy="0" r="4" fill={soft} /><circle cx="28" cy="0" r="4" fill={soft} /></g>,
  spend: <g><circle cx="0" cy="8" r="10" fill={paper} stroke={ink} strokeWidth="2.5" /><text x="0" y="13" textAnchor="middle" fontSize="13" fontWeight="700" fill={ink}>$</text><circle cx="24" cy="-8" r="8" fill={paper} stroke={ink} strokeWidth="2.5" /><path d="M36 -18 l8 -8" stroke={red} strokeWidth="3" strokeLinecap="round" /></g>,
  save: <g><path d="M-4 -8 h32 v6 h-2 v26 q0 6 -6 6 h-16 q-6 0 -6 -6 v-26 h-2 Z" fill={paper} stroke={ink} strokeWidth="2.5" /><circle cx="12" cy="14" r="6" fill={red} /></g>,
  grow: <g><path d="M12 26 V0" stroke={ink} strokeWidth="3" /><path d="M12 6 q-14 -2 -16 -16 q14 0 16 16 Z M12 0 q12 -4 16 -18 q-14 2 -16 18 Z" fill={ink} /><rect x="0" y="24" width="24" height="10" fill={red} /></g>,
  risky: <g><rect x="-2" y="-10" width="26" height="26" rx="4" fill={paper} stroke={ink} strokeWidth="2.5" transform="rotate(-12 11 3)" /><circle cx="6" cy="-2" r="2.5" fill={ink} /><circle cx="16" cy="8" r="2.5" fill={ink} /><circle cx="11" cy="3" r="2.5" fill={red} /></g>,
  debt: <g><rect x="-6" y="-6" width="40" height="26" rx="4" fill={paper} stroke={ink} strokeWidth="2.5" /><rect x="0" y="2" width="9" height="7" fill={red} /><path d="M-6 26 q8 8 16 0 q8 -8 16 0 q8 8 16 0" stroke={ink} strokeWidth="2.5" fill="none" /></g>,
  family: <path d="M14 26 q-26 -16 -16 -30 q8 -10 16 0 q8 -10 16 0 q10 14 -16 30 Z" fill={red} />,
  safe: <g><path d="M-8 6 q22 -26 44 0 Z" fill={ink} /><path d="M14 6 v20 q0 5 -5 5" stroke={ink} strokeWidth="2.5" fill="none" /><path d="M-8 6 q22 -6 44 0" stroke={red} strokeWidth="2" fill="none" /></g>,
  sell: <g><path d="M14 -16 v34" stroke={red} strokeWidth="4" /><path d="M2 8 l12 14 l12 -14" stroke={red} strokeWidth="4" fill="none" strokeLinejoin="round" /></g>,
  work: <g><rect x="-4" y="0" width="36" height="24" rx="3" fill={ink} /><path d="M8 0 v-6 h12 v6" stroke={ink} strokeWidth="2.5" fill="none" /><rect x="10" y="10" width="8" height="4" fill={red} /></g>,
  status: <path d="M14 -16 l6 12 l13 2 l-10 9 l3 13 l-12 -7 l-12 7 l3 -13 l-10 -9 l13 -2 Z" fill={red} stroke={ink} strokeWidth="2" />,
};

export function Vignette({ speaker, mood, picked }: { speaker: Speaker; mood: Mood; picked: boolean }) {
  return (
    <svg className="ml-vig" viewBox="0 0 160 90" role="img" aria-hidden="true" data-mood={mood} data-picked={picked ? 'yes' : 'no'}>
      <rect x="0" y="84" width="160" height="2" fill={soft} />
      <g className="ml-vig__actor">{SPEAKERS[speaker]}</g>
      <g transform="translate(108 46)">
        <g key={mood} className="ml-vig__prop">{MOODS[mood]}</g>
      </g>
    </svg>
  );
}
