import type { Spot } from '../contracts';

/** Where everything stands. x grows to the right-and-down on screen, z to the left-and-down; the camera looks from +x +z. */
export const BOUNDS = 13;
export const FRONT_Z = -9.5; // fronts of the back row of buildings
export const ROAD = { z0: -6.55, z1: -2.65, tramZ: -4.6 };
export const SEA_Z = 9.7;

export const HOME_X = -8.875;
export const HOME_DOOR = { x: HOME_X, z: -7.7 };

export const SPOTS: Spot[] = [
  { id: 'home', x: HOME_X, z: -7.7, r: 1.6 },
  { id: 'cafe', x: -1.5, z: -7.7, r: 1.5 },
  { id: 'bank', x: 4.25, z: -7.7, r: 1.5 },
  { id: 'office', x: 10.45, z: -7.7, r: 1.6 },
  { id: 'clinic', x: -8.6, z: 1, r: 1.6 },
  { id: 'campus', x: -8, z: 6, r: 1.7 },
  { id: 'park', x: -2.5, z: 3.5, r: 2.2 },
  { id: 'market', x: 6.5, z: 1.8, r: 1.8 },
  { id: 'pier', x: 8, z: 12.2, r: 1.2 },
];
