import type { WorldDescriptor } from './descriptor';

/** What the character wears, worked out from the descriptor. Pure. */
export interface AvatarLook {
  top: number; sleeve: number; pants: number; shoes: number; hair: number; skin: number;
  hairStyle: 'short' | 'thin' | 'bun';
  hood: boolean; backpack: number | null; tie: number | null; cardigan: boolean; gold: boolean; shades: boolean; blazer: number | null;
  patches: boolean; eyeBags: boolean; cane: boolean;
  /** forward lean of the torso, radians */
  slouch: number;
  /** -1 frown .. 1 smile */
  mood: number;
  /** how lively the walk is */
  vigor: number;
}

const dim = (hex: number, k: number) => {
  const m = (s: number) => Math.round(((hex >> s) & 255) * k);
  return (m(16) << 16) | (m(8) << 8) | m(0);
};

export function lookFor(d: WorldDescriptor, seed: number): AvatarLook {
  const old = d.stage === 'retired' || d.age >= 60, mid = d.age >= 50 && !old, young = d.stage === 'uni' || d.age < 24;
  const rich = d.lifestyle;
  const dark = (d.burntOut ? 0.62 : 1) * (d.bankrupt ? 0.8 : 1);
  const skin = [0xffd2b0, 0xe8b48a, 0xc98f62][Math.abs(seed) % 3];
  let top = 0xf4f1e6, pants = 0x23263a, hair = 0x14161f;
  if (young) { top = 0x6fb0d8; pants = 0x2a3f6e; }
  else if (old) { top = 0xa86a3a; pants = 0x5b6488; hair = 0xc4cbe0; }
  else if (mid) { top = 0xb5e2f0; hair = 0x8a95b8; }
  else if (d.job === 'unemployed') top = 0x4f8a6b;
  const blazer = rich > 0.65 ? 0x5a4a8a : rich > 0.35 && !young && !old ? 0x3a3f5c : null;
  const slouch = (d.burntOut ? 0.32 : 0) + (d.q.joy < 30 ? 0.12 : 0) + (old ? 0.1 : 0);
  return {
    top: dim(top, dark), sleeve: dim(old ? 0xf4f1e6 : top, dark), pants: dim(pants, dark), shoes: old ? 0x6b3f2a : 0xf4f1e6, hair, skin,
    hairStyle: old ? 'thin' : d.q.bonds > 85 && !young ? 'bun' : 'short',
    hood: young, backpack: young ? 0xd8504a : null,
    tie: !young && !old && d.job === 'employed' ? dim(0xd8504a, dark) : null,
    cardigan: old, gold: rich > 0.4, shades: rich > 0.75, blazer: blazer === null ? null : dim(blazer, dark),
    patches: d.bankrupt, eyeBags: d.burntOut, cane: old,
    slouch: Math.min(0.5, slouch),
    mood: Math.max(-1, Math.min(1, (d.q.joy - 50) / 40 - (d.burntOut ? 0.6 : 0))),
    vigor: 0.7 + d.q.joy / 160,
  };
}
