import type { Scope } from '../descriptor';

// Where keepsakes can go. Indoors: fixed furniture slots. Outdoors: zones of open pavement and lawn.

export type SlotType = 'desk' | 'shelf' | 'floor' | 'wall';
export interface Slot { x: number; y: number; z: number; type: SlotType; wall?: 'x' | 'z' }
export interface Zone { x0: number; x1: number; z0: number; z1: number }

const S = (type: SlotType, x: number, y: number, z: number, wall?: 'x' | 'z'): Slot => ({ type, x, y, z, wall });

/** The bedroom: desk, bookcase, wall shelf, floor, posters. Same slots in the room and the flat, so keepsakes stay put. */
export const BEDROOM_SLOTS: Slot[] = [
  S('desk', -2.5, 0.85, -2.5), S('desk', -1.8, 0.85, -2.5), S('desk', -1.1, 0.85, -2.5),
  S('shelf', 2.1, 0.92, -2.65), S('shelf', 2.8, 0.92, -2.65), S('shelf', 2.1, 1.62, -2.65), S('shelf', 2.8, 1.62, -2.65), S('shelf', 2.1, 2.32, -2.65), S('shelf', 2.8, 2.32, -2.65),
  S('shelf', -2.5, 1.95, -2.7), S('shelf', -1.8, 1.95, -2.7), S('shelf', -1.1, 1.95, -2.7),
  S('floor', -0.2, 0, 1.9), S('floor', 0.8, 0, 2.3), S('floor', 1.9, 0, 1.2), S('floor', 2.4, 0, 2.4), S('floor', 0.4, 0, 0.4), S('floor', 1.8, 0, -0.5), S('floor', -0.1, 0, -1.3),
  S('floor', 1.2, 0, -1.7), S('floor', 2.4, 0, -1.3), S('floor', -0.3, 0, -0.3),
  S('wall', -2.87, 2.0, -1.2, 'x'), S('wall', -2.87, 2.0, 0.3, 'x'), S('wall', -2.87, 2.0, 1.3, 'x'), S('wall', -2.87, 2.0, 2.3, 'x'),
];

/** Where the avatar stands in each indoor scope: keepsakes keep clear of it (and off its camera-facing side). */
export const HERO_AT: Partial<Record<Scope, { x: number; z: number }>> = { room: { x: 1, z: 1.5 }, home: { x: 5, z: 1 } };

/** True when a floor slot would crowd the hero: close by, or in front of it from the camera (+x +z). */
export function crowdsHero(s: Slot, hero: { x: number; z: number } | undefined): boolean {
  if (!hero || s.type !== 'floor') return false;
  const d = Math.hypot(s.x - hero.x, s.z - hero.z);
  return d < 2 || (d < 3.2 && s.x + s.z > hero.x + hero.z - 0.5);
}

/** The living room next door (the flat scope). */
export const LIVING_SLOTS: Slot[] = [
  S('floor', 4.5, 0, 0.6), S('floor', 5.4, 0, 1.9), S('floor', 8.4, 0, 1.6), S('floor', 9.2, 0, 0.2), S('floor', 3.9, 0, 2.4), S('floor', 7.3, 0, 2.5), S('floor', 6.2, 0, -1.2), S('floor', 9.4, 0, 2.6),
  S('desk', 5.9, 0.8, -0.1), S('desk', 6.9, 0.8, 0.5), S('desk', 8.3, 0.98, -2.6), S('desk', 9.0, 0.98, -2.6),
  S('shelf', 3.7, 1.1, -2.7), S('shelf', 4.7, 1.1, -2.7),
  S('wall', 8.3, 2.3, -2.87, 'z'), S('wall', 9.3, 2.3, -2.87, 'z'), S('wall', 6.4, 2.4, -2.87, 'z'),
];

const BANK: Zone = { x0: 2.4, x1: 6.1, z0: -8.9, z1: -7.9 };
const HOMEF: Zone = { x0: -11.3, x1: -6.3, z0: -8.9, z1: -8.0 };
const OFFICE: Zone = { x0: 8.6, x1: 12.4, z0: -8.9, z1: -8.0 };
const CAFE: Zone = { x0: -3.4, x1: 0.4, z0: -8.9, z1: -8.1 };
const PARK: Zone = { x0: -5.8, x1: 1, z0: -0.4, z1: 3.8 };
const MARKET: Zone = { x0: 3, x1: 11, z0: 0.6, z1: 3 };
const CLINIC: Zone = { x0: -9.6, x1: -8.2, z0: -0.8, z1: 2.8 };
const PIER: Zone = { x0: 7.5, x1: 8.5, z0: 10.3, z1: 12.8 };
const CAMPUS: Zone = { x0: -9, x1: -6.8, z0: 4, z1: 8 };
const PLAZA: Zone = { x0: 3, x1: 12, z0: 6.2, z1: 8 };

const ZONES: Record<string, Zone[]> = {
  save: [BANK], safe: [BANK], sell: [BANK, PLAZA], hold: [BANK, PLAZA], invest: [PARK], risky: [PIER, OFFICE], spend: [MARKET],
  fun: [PARK, CAMPUS], family: [HOMEF], debt: [HOMEF], career: [OFFICE], work: [OFFICE], insure: [CLINIC], status: [CAFE], none: [PARK],
};

/** Zones usable at this scope (the block scope ends before the harbour and the campus). */
export function zonesFor(scope: Scope, tag: string): Zone[] {
  const all = ZONES[tag] ?? ZONES.none;
  const ok = all.filter((z) => scope !== 'block' || z.z1 <= 4);
  return ok.length > 0 ? ok : [BANK];
}

/** How much bigger a keepsake is drawn the farther out the camera is. */
export const SCOPE_SCALE: Record<Scope, number> = { room: 1.5, home: 1.5, block: 2, district: 2.4, city: 2.8 };
