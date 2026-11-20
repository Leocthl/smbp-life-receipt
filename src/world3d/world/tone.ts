import type { Regime } from '../../engine/types';

/** Sky, light and weather for each market regime. */
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
  bull: { sky: 0x6fb0d8, tint: [1.12, 1.05, 0.9], sat: 1.25, cloud: 0xf4f1e6, clouds: 3, rain: false, sun: { y: 9, color: 0xfff0b8 }, water: [0x3c6ea8, 0x6fb0d8, 0xb5e2f0], glow: 0 },
  normal: { sky: 0x3c6ea8, tint: [1, 1, 1], sat: 1, cloud: 0xe4e8f0, clouds: 4, rain: false, sun: { y: 10, color: 0xffe9a8 }, water: [0x2a3f6e, 0x3c6ea8, 0x8fc0e0], glow: 0 },
  correction: { sky: 0x8a95b8, tint: [0.9, 0.94, 1], sat: 0.78, cloud: 0xa0a8c0, clouds: 8, rain: false, sun: null, water: [0x2a3f6e, 0x4a5f8e, 0x8a95b8], glow: 0.05 },
  crash: { sky: 0x23263a, tint: [0.62, 0.7, 0.92], sat: 0.65, cloud: 0x3a3f5c, clouds: 10, rain: true, sun: null, water: [0x1a2444, 0x2a3f6e, 0x8a95b8], glow: 0.12 },
  recovery: { sky: 0xffb3a7, tint: [1.1, 0.98, 0.9], sat: 1.1, cloud: 0xffb3a7, clouds: 5, rain: false, sun: { y: 4.5, color: 0xffd27a }, water: [0x3c6ea8, 0x8a95b8, 0xffb3a7], glow: 0.02 },
};

export const toneFor = (r: Regime): Tone => TONES[r];
