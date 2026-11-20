/** Everything that decides how Slip (單仔) looks for one emote. Pure data: the drawing and animation live elsewhere. */
export type Emote = 'happy' | 'cheer' | 'proud' | 'worried' | 'shocked' | 'sad' | 'thinking' | 'curious' | 'love' | 'sleepy' | 'neutral';
export const EMOTES: readonly Emote[] = ['happy', 'cheer', 'proud', 'worried', 'shocked', 'sad', 'thinking', 'curious', 'love', 'sleepy', 'neutral'];

export type EyeKind = 'open' | 'happy' | 'proud' | 'wide' | 'sad' | 'love' | 'closed';
export type MouthKind = 'slot' | 'smile' | 'grin' | 'frown' | 'wavy' | 'O' | 'tilt' | 'small' | 'yawn';
export type BrowKind = 'none' | 'worry' | 'raise';
export type ArmKind = 'rest' | 'up' | 'wave' | 'cheek' | 'shock' | 'chin' | 'hips' | 'droop' | 'stretch';
export type FxKind = 'sparkle' | 'sweat' | 'bang' | 'qmark' | 'hearts' | 'confetti' | 'rain' | 'dots' | 'zzz';
export type CheekKind = 'normal' | 'blush' | 'pale';

export interface Face { eyes: EyeKind; mouth: MouthKind; brow: BrowKind; arms: ArmKind; cheeks: CheekKind; lookX?: number; lookY?: number }

export interface EmoteSpec {
  /** the burst: shown for BURST_MS with its effect */
  face: Face;
  fx?: FxKind;
  /** hop height in art pixels during the burst */
  hop: number;
  /** the face it settles into afterwards (its effect stops unless hold is set) */
  mood: Face;
  /** steady states keep their effect running forever */
  hold?: boolean;
}

export const BURST_MS = 1000;

const CALM: Face = { eyes: 'open', mouth: 'slot', brow: 'none', arms: 'rest', cheeks: 'normal' };
const GLAD: Face = { eyes: 'open', mouth: 'smile', brow: 'none', arms: 'rest', cheeks: 'blush' };
const UNEASY: Face = { eyes: 'open', mouth: 'wavy', brow: 'worry', arms: 'rest', cheeks: 'pale' };
const GLOOM: Face = { eyes: 'sad', mouth: 'frown', brow: 'worry', arms: 'droop', cheeks: 'pale' };
const THINK: Face = { eyes: 'open', mouth: 'tilt', brow: 'raise', arms: 'chin', cheeks: 'normal', lookX: 1, lookY: -1 };
const CURIOUS: Face = { eyes: 'open', mouth: 'small', brow: 'raise', arms: 'rest', cheeks: 'normal', lookX: 1 };
const SLEEPY: Face = { eyes: 'closed', mouth: 'small', brow: 'none', arms: 'droop', cheeks: 'normal' };

export const SPEC: Readonly<Record<Emote, EmoteSpec>> = {
  neutral: { face: CALM, hop: 0, mood: CALM, hold: true },
  happy: { face: { eyes: 'happy', mouth: 'smile', brow: 'none', arms: 'wave', cheeks: 'blush' }, fx: 'sparkle', hop: 2, mood: GLAD },
  cheer: { face: { eyes: 'happy', mouth: 'grin', brow: 'none', arms: 'up', cheeks: 'blush' }, fx: 'confetti', hop: 5, mood: GLAD },
  proud: { face: { eyes: 'proud', mouth: 'smile', brow: 'none', arms: 'hips', cheeks: 'blush' }, fx: 'sparkle', hop: 1, mood: GLAD },
  love: { face: { eyes: 'love', mouth: 'smile', brow: 'none', arms: 'cheek', cheeks: 'blush' }, fx: 'hearts', hop: 2, mood: GLAD },
  worried: { face: { eyes: 'open', mouth: 'wavy', brow: 'worry', arms: 'cheek', cheeks: 'pale' }, fx: 'sweat', hop: 0, mood: UNEASY },
  shocked: { face: { eyes: 'wide', mouth: 'O', brow: 'none', arms: 'shock', cheeks: 'pale' }, fx: 'bang', hop: 3, mood: UNEASY },
  sad: { face: GLOOM, fx: 'rain', hop: 0, mood: GLOOM },
  thinking: { face: THINK, fx: 'dots', hop: 0, mood: THINK, hold: true },
  curious: { face: CURIOUS, fx: 'qmark', hop: 1, mood: CURIOUS, hold: true },
  sleepy: { face: SLEEPY, fx: 'zzz', hop: 0, mood: SLEEPY, hold: true },
};

export const isEmote = (s: string | null | undefined): s is Emote => EMOTES.includes(s as Emote);
