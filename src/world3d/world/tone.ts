import type { Regime } from '../../engine/types';

/** Sky, light and weather for each market regime. Bright by default; only a crash goes properly dark. */
export interface Tone {
  sky: number;
  tint: [number, number, number];
  sat: number;
  /** cloud colour and how many */
  cloud: number; clouds: number;
  rain: boolean;
  sun: { y: number; color: number } | null;
  water: [number, number, number];
  /** boosts glow so lights pop in the dark */
  glow: number;
}

const TONES: Record<Regime, Tone> = {
  bull: { sky: 0x8fd3ff, tint: [1.06, 1.03, 0.96], sat: 1.15, cloud: 0xffffff, clouds: 3, rain: false, sun: { y: 9, color: 0xfff6dc }, water: [0x2a9fc0, 0x4cc3d9, 0xcdeeff], glow: 0 },
  normal: { sky: 0x8fd3ff, tint: [1, 1, 1], sat: 1.05, cloud: 0xffffff, clouds: 4, rain: false, sun: { y: 10, color: 0xfff6dc }, water: [0x2a9fc0, 0x4cc3d9, 0xcdeeff], glow: 0 },
  correction: { sky: 0xcdeeff, tint: [0.96, 0.98, 1], sat: 0.9, cloud: 0xc9d3e6, clouds: 7, rain: false, sun: null, water: [0x3d7fc4, 0x2a9fc0, 0xc9d3e6], glow: 0.03 },
  crash: { sky: 0x4a5578, tint: [0.74, 0.8, 0.96], sat: 0.72, cloud: 0x6b789c, clouds: 9, rain: true, sun: null, water: [0x1f2a44, 0x3d7fc4, 0xc9d3e6], glow: 0.1 },
  recovery: { sky: 0xcdeeff, tint: [1.08, 1.0, 0.94], sat: 1.12, cloud: 0xffe0c8, clouds: 4, rain: false, sun: { y: 5, color: 0xffd85a }, water: [0x2a9fc0, 0x4cc3d9, 0xffe0c8], glow: 0.02 },
};

export const toneFor = (r: Regime): Tone => TONES[r];
