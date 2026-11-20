import type { ArmKind, BrowKind, CheekKind, EyeKind, MouthKind } from './emotes';
import { blit, line, PAL, rect } from './pixels';

/** Art-pixel canvas size and the body's fixed geometry. */
export const W = 56;
export const H = 56;
const L = 13;
const R = 42;
const BASE = 45;
const TOOTH = [0, 1, 2, 3, 2, 1];
const MID = 28;

/** What the drawing needs for one frame. */
export interface Pose {
  eyes: EyeKind; blink: boolean; mouth: MouthKind; brow: BrowKind; cheeks: CheekKind; arms: ArmKind;
  lookX: number; lookY: number;
  /** top edge of the body (smaller = taller) and vertical lift of the whole sprite */
  top: number; lift: number;
  /** length of the printed paper tongue, 0 = retracted */
  tongue: number;
  curl: number;
  /** seconds into the arm animation, for waves and stretches */
  armT: number;
  /** doodle progress 0..1 while the idle doodle plays, otherwise -1 */
  doodle: number;
}

const yb = (x: number, bottom: number) => bottom + TOOTH[(x - L) % TOOTH.length];

function drawShadow(ctx: CanvasRenderingContext2D, lift: number) {
  const shrink = Math.min(4, Math.round(lift / 2));
  ctx.fillStyle = 'rgba(43,58,85,0.2)';
  ctx.fillRect(L + 3 + shrink, 51, R - L - 5 - shrink * 2, 2);
  ctx.fillRect(L + 6 + shrink, 53, R - L - 11 - shrink * 2, 1);
}

function drawBody(ctx: CanvasRenderingContext2D, top: number, bottom: number) {
  for (let x = L + 1; x < R; x += 1) {
    const b = yb(x, bottom);
    rect(ctx, x, top + 1, 1, b - top - 1, x >= R - 2 ? PAL.d : PAL.p);
    rect(ctx, x, top, 1, 1, PAL.i);
  }
  for (let x = L; x <= R; x += 1) {
    const here = yb(x, bottom);
    const next = x < R ? yb(x + 1, bottom) : here;
    const lo = Math.min(here, next);
    rect(ctx, x, lo, 1, Math.max(here, next) - lo + 1, PAL.i);
  }
  rect(ctx, L, top + 1, 1, bottom - top, PAL.i);
  rect(ctx, R, top + 1, 1, bottom - top, PAL.i);
  rect(ctx, L + 2, top + 2, 3, 1, PAL.w);
  rect(ctx, L + 2, top + 3, 1, 1, PAL.w);
  // printed receipt marks
  rect(ctx, 21, top + 3, 14, 1, PAL.f);
  rect(ctx, 24, top + 5, 8, 1, PAL.f);
  for (let k = 0; k < 3; k += 1) {
    for (let x = L + 5; x < R - 4 - k * 4; x += 4) rect(ctx, x, bottom - 9 + k * 3, 3, 1, PAL.f);
  }
}

const CURL = ['..iiiii.', '.ipppppi', 'ippiiipi', 'ipi..iip', 'ippiiip.', '.iiiii..'];
function drawCurl(ctx: CanvasRenderingContext2D, top: number, flutter: number) {
  blit(ctx, CURL, L + 3 + flutter, top - 5);
}

const EYE: Readonly<Record<string, readonly string[]>> = {
  open: ['..iiii..', '.iiiiii.', 'iwwiiiii', 'iwwiiiii', 'iiiiiiii', 'iiiiiiii', 'iiiiiwii', '.iiiiii.', '..iiii..'],
  wide: ['.iiiiii.', 'iwwwwwwi', 'iwwwwwwi', 'iwwiiwwi', 'iwwiiwwi', 'iwwwwwwi', 'iwwwwwwi', '.iiiiii.'],
  happy: ['..iiii..', '.i....i.', 'i......i'],
  proud: ['i......i', '.i....i.', '..iiii..'],
  love: ['.rr..rr.', 'rwrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..', '...rr...'],
  blink: ['iiiiiiii', '.iiiiii.'],
  closed: ['iiiiiiii'],
};

function drawEyes(ctx: CanvasRenderingContext2D, p: Pose) {
  const kind = p.blink && (p.eyes === 'open' || p.eyes === 'sad') ? 'blink' : p.eyes === 'sad' ? 'open' : p.eyes;
  const rows = EYE[kind];
  const open = kind === 'open';
  const dx = open ? p.lookX : 0;
  const dy = open ? p.lookY : 0;
  const base = p.top + 7;
  const yOff = kind === 'happy' || kind === 'proud' ? 3 : kind === 'blink' ? 4 : kind === 'closed' ? 5 : kind === 'love' ? 1 : kind === 'wide' ? 1 : 0;
  [17, 31].forEach((x) => blit(ctx, rows, x + dx, base + dy + yOff));
  if (p.eyes === 'sad' && !p.blink) {
    rect(ctx, 18, base + 9, 1, 3, PAL.t);
    rect(ctx, 32, base + 9, 1, 3, PAL.t);
  }
}

function drawBrows(ctx: CanvasRenderingContext2D, top: number, brow: BrowKind) {
  const y = top + 7;
  const px = (pts: readonly (readonly [number, number])[]) => pts.forEach(([x, dy]) => rect(ctx, x, y + dy, 1, 1, PAL.i));
  if (brow === 'worry') {
    px([[18, -2], [19, -3], [20, -3], [21, -4], [22, -4], [32, -4], [33, -4], [34, -3], [35, -3], [36, -2]]);
  } else if (brow === 'raise') {
    px([[18, -3], [19, -3], [20, -3], [21, -3], [32, -5], [33, -5], [34, -5], [35, -5], [36, -4]]);
  }
}

function drawCheeks(ctx: CanvasRenderingContext2D, top: number, kind: CheekKind) {
  if (kind === 'pale') return;
  const y = top + 17;
  const w = kind === 'blush' ? 4 : 3;
  rect(ctx, 15, y, w, 2, PAL.k);
  rect(ctx, 41 - w, y, w, 2, PAL.k);
  if (kind === 'blush') {
    rect(ctx, 16, y + 2, 2, 1, PAL.k);
    rect(ctx, 38, y + 2, 2, 1, PAL.k);
  }
}

const MOUTH: Readonly<Record<string, readonly string[]>> = {
  smile: ['i.....i', '.iiiii.'],
  grin: ['iiiiiii', 'iiiiiii', 'irrrrri', '.irrri.', '..iii..'],
  frown: ['.iiiii.', 'i.....i'],
  wavy: ['.i.i.i.', 'i.i.i.i'],
  O: ['.ii.', 'iiii', 'iiii', '.ii.'],
  tilt: ['....ii', '..ii..', 'ii....'],
  small: ['ii', 'ii'],
  yawn: ['.iiiii.', 'iiiiiii', 'iirrrii', '.iiiii.'],
};

const SLOT_X = 24;
function drawMouth(ctx: CanvasRenderingContext2D, p: Pose) {
  const y = p.top + 19;
  if (p.tongue > 0 || p.mouth === 'slot') {
    rect(ctx, SLOT_X, y + 1, 8, 2, PAL.i);
    if (p.tongue > 0) drawTongue(ctx, y + 3, p.tongue);
    return;
  }
  const rows = MOUTH[p.mouth];
  blit(ctx, rows, MID - Math.floor(rows[0].length / 2), y + (p.mouth === 'tilt' ? 0 : 1));
}

function drawTongue(ctx: CanvasRenderingContext2D, y: number, len: number) {
  rect(ctx, SLOT_X + 1, y, 6, len, PAL.w);
  rect(ctx, SLOT_X, y, 1, len + 1, PAL.i);
  rect(ctx, SLOT_X + 7, y, 1, len + 1, PAL.i);
  for (let x = SLOT_X; x < SLOT_X + 8; x += 1) rect(ctx, x, y + len, 1, 1, PAL.i);
  rect(ctx, SLOT_X + 2, y + len, 1, 1, PAL.w);
  rect(ctx, SLOT_X + 5, y + len, 1, 1, PAL.w);
  for (let k = 1; k < len - 1; k += 2) rect(ctx, k % 4 === 1 ? SLOT_X + 2 : SLOT_X + 4, y + k, 2, 1, PAL.f);
}

/** Hand offsets from each shoulder, outward-positive in x: [left dx, left dy, right dx, right dy]. */
function armOffsets(kind: ArmKind, t: number): readonly [number, number, number, number] {
  const wig = Math.round(Math.sin(t * 9));
  switch (kind) {
    case 'up': return [3, -9 + wig, 3, -9 - wig];
    case 'wave': return [3, 6, 5, -6 + wig * 2];
    case 'cheek': return [-4, 0, -4, 0];
    case 'shock': return [6, -6, 6, -6];
    case 'chin': return [3, 6, -7, 5];
    case 'hips': return [5, 3, 5, 3];
    case 'droop': return [2, 7, 2, 7];
    case 'stretch': return [5, -10 + wig, 5, -10 - wig];
    default: return [3, 6, 3, 6];
  }
}

const HAND = ['.ii.', 'ippi', 'ippi', '.ii.'];
function hand(ctx: CanvasRenderingContext2D, x: number, y: number) {
  blit(ctx, HAND, x - 1, y - 1);
}

function drawArms(ctx: CanvasRenderingContext2D, p: Pose) {
  const sy = p.top + 17;
  const [ldx, ldy, rdx, rdy] = armOffsets(p.arms, p.armT);
  const sway = p.arms === 'rest' ? Math.round(Math.sin(p.armT * 2.4)) : 0;
  const ends: [number, number, number, number][] = [
    [L, sy, L - ldx, sy + ldy + sway],
    [R - 1, sy, R - 1 + rdx, sy + rdy + sway],
  ];
  ends.forEach(([x0, y0, x1, y1]) => line(ctx, x0, y0, x1, y1, PAL.i));
  ends.forEach(([, , x1, y1]) => hand(ctx, x1, y1));
}

/** The idle doodle: a little lilac heart scribbled on the receipt, drawn pixel by pixel with a pencil. */
const HEART = ['.ll.ll.', 'lllllll', 'lllllll', '.lllll.', '..lll..', '...l...'];
function drawDoodle(ctx: CanvasRenderingContext2D, p: Pose, bottom: number) {
  const px: [number, number][] = [];
  HEART.forEach((row, j) => { for (let i = 0; i < row.length; i += 1) if (row[i] === 'l') px.push([i, j]); });
  const shown = Math.min(px.length, Math.ceil(p.doodle * px.length));
  const x0 = 24;
  const y0 = bottom - 9;
  px.slice(0, shown).forEach(([i, j]) => rect(ctx, x0 + i, y0 + j, 1, 1, PAL.l));
  const [lx, ly] = px[Math.max(0, shown - 1)];
  const hx = x0 + lx + 3;
  const hy = y0 + ly + 3;
  line(ctx, R - 1, p.top + 17, hx, hy, PAL.i);
  hand(ctx, hx, hy);
  rect(ctx, hx - 1, hy - 5, 1, 4, PAL.s);
  rect(ctx, hx - 1, hy - 6, 1, 1, PAL.i);
}

/** Everything except the floating effects, back to front. */
export function drawMascot(ctx: CanvasRenderingContext2D, p: Pose) {
  ctx.clearRect(0, 0, W, H);
  drawShadow(ctx, p.lift);
  const top = p.top - p.lift;
  const bottom = BASE - p.lift;
  drawBody(ctx, top, bottom);
  const q = { ...p, top };
  drawBrows(ctx, top, p.brow);
  drawEyes(ctx, q);
  drawCheeks(ctx, top, p.cheeks);
  drawMouth(ctx, q);
  if (p.doodle >= 0) drawDoodle(ctx, q, bottom);
  else drawArms(ctx, q);
  drawCurl(ctx, top, p.curl);
}
