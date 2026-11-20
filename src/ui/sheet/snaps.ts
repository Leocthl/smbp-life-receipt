// Pure maths for the phone's bottom sheet: three resting heights, which one a drag should settle on. Heights in CSS px.

export type Snap = 'peek' | 'half' | 'full';
export const SNAPS: readonly Snap[] = ['peek', 'half', 'full'];

/** Slip's face and one line, plus the handle. Mirrored by sheet.css. */
export const PEEK_PX = 120;
export const HALF_RATIO = 0.55;
export const FULL_RATIO = 0.9;
/** The HUD's two rows stay clear above a full sheet. Mirrored by sheet.css. */
export const HUD_CLEAR_PX = 92;
/** The grab bar above the panel; the sheet's content needs this much on top of its own height. */
export const BAR_PX = 44;
/** The walk prompt and the joystick under it cover this much of the bottom on a phone, so the avatar is framed above them. */
export const WALK_INSET_PX = 250;
/** How far ahead a fling looks: the drag is projected this long at its release speed. */
const FLING_MS = 160;

export type Heights = Record<Snap, number>;

/** viewport: window height; safeBottom / safeTop: the device's notch and home-bar insets. */
export function snapHeights(viewport: number, safeBottom: number, safeTop = 0): Heights {
  const full = Math.min(viewport * FULL_RATIO, viewport - HUD_CLEAR_PX - safeTop);
  const half = Math.min(viewport * HALF_RATIO, full - 40);
  return { peek: PEEK_PX + safeBottom, half, full };
}

/** The snap whose height is closest to h. */
export function nearestSnap(h: number, heights: Heights): Snap {
  return SNAPS.reduce((best, s) => (Math.abs(heights[s] - h) < Math.abs(heights[best] - h) ? s : best), 'half' as Snap);
}

/** Where a released drag settles: the height it would reach in FLING_MS at velocity v (px/ms, positive = upwards). */
export function settleSnap(h: number, v: number, heights: Heights): Snap {
  return nearestSnap(h + v * FLING_MS, heights);
}

/** Tap on the handle: peek, then half, then full, then back to peek. */
export function cycleSnap(s: Snap): Snap {
  return SNAPS[(SNAPS.indexOf(s) + 1) % SNAPS.length];
}

/** Arrow keys: one step up (+1) or down (-1), stopping at the ends. */
export function stepSnap(s: Snap, dir: 1 | -1): Snap {
  return SNAPS[Math.max(0, Math.min(SNAPS.length - 1, SNAPS.indexOf(s) + dir))];
}
