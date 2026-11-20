import type { Regime } from '../../engine/types';
import { ICONS, type Sprite } from './sprites';

/** Market weather: a bull market is sunny, a crash is a storm, recovery brings the rainbow. */
export const WEATHER: Readonly<Record<Regime, Sprite>> = {
  bull: ICONS.sun, normal: ICONS.suncloud, correction: ICONS.cloud, crash: ICONS.storm, recovery: ICONS.rainbow,
};
