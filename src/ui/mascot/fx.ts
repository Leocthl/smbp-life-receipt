import type { FxKind } from './emotes';
import { blit, blitShadow, noise, PAL, rect } from './pixels';
import { H, W } from './draw';

const HEART = ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'];
const DROP = ['.t.', 'ttt', 'twt', '.t.'];
const BANG = ['sss', 'sss', 'sss', 'sss', 'sss', '...', 'sss', 'sss'];
const QMARK = ['.lll.', 'll.ll', '...ll', '..ll.', '.ll..', '.....', '.ll..', '.ll..'];
const CLOUD = ['....cccccc....', '..ccbbbbbbcc..', '.cbbbbbbbbbbc.', 'cbbbbbbbbbbbbc', '.cccccccccccc.'];
const BUBBLE = ['.iiiiiiiiiii.', 'iwwwwwwwwwwwi', 'iwwwwwwwwwwwi', 'iwwwwwwwwwwwi', '.iiiiiiiwwii.', '......iii....'];
const Z_BIG = ['lllll', '...l.', '..l..', '.l...', 'lllll'];
const Z_SMALL = ['lll', '.l.', 'lll'];
const CONFETTI = [PAL.s, PAL.t, PAL.g, PAL.l, PAL.r, PAL.k];

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  if (size <= 0) return;
  rect(ctx, x, y, 1, 1, PAL.w);
  if (size >= 1) { rect(ctx, x - 1, y, 3, 1, PAL.s); rect(ctx, x, y - 1, 1, 3, PAL.s); rect(ctx, x, y, 1, 1, PAL.w); }
  if (size >= 2) { rect(ctx, x - 2, y, 5, 1, PAL.s); rect(ctx, x, y - 2, 1, 5, PAL.s); rect(ctx, x, y, 1, 1, PAL.w); }
}

function sparkles(ctx: CanvasRenderingContext2D, t: number) {
  const spots = [[7, 16], [49, 14], [5, 38], [51, 34], [28, 5]];
  spots.forEach(([x, y], i) => {
    const phase = (t * 2.4 + i * 0.37) % 1;
    sparkle(ctx, x, y, phase < 0.2 ? 1 : phase < 0.5 ? 2 : phase < 0.75 ? 1 : 0);
  });
}

function hearts(ctx: CanvasRenderingContext2D, t: number) {
  [0, 1, 2].forEach((i) => {
    const age = (t * 0.9 + i * 0.33) % 1;
    blit(ctx, HEART, 38 + i * 4 - Math.round(Math.sin(age * 6 + i) * 2), 20 - Math.round(age * 18));
  });
}

function confetti(ctx: CanvasRenderingContext2D, t: number) {
  for (let i = 0; i < 24; i += 1) {
    const speed = 22 + noise(i) * 26;
    const y = -4 + ((t * speed + noise(i + 40) * 12) % (H + 6));
    const x = 3 + noise(i + 9) * (W - 8) + Math.sin(t * 5 + i) * 1.5;
    const flat = i % 2 === 0;
    rect(ctx, x, y, flat ? 2 : 1, flat ? 1 : 2, CONFETTI[i % CONFETTI.length]);
  }
}

function rain(ctx: CanvasRenderingContext2D, t: number) {
  blit(ctx, CLOUD, 20 + Math.round(Math.sin(t * 3)), 1);
  for (let i = 0; i < 6; i += 1) {
    const y = 7 + ((t * 36 + i * 5) % 18);
    rect(ctx, 23 + i * 3 + (i % 2), y, 1, 3, PAL.t);
  }
}

function dots(ctx: CanvasRenderingContext2D, t: number) {
  blit(ctx, BUBBLE, 41, 2);
  const lit = 1 + Math.floor((t * 1.6) % 3.4);
  for (let i = 0; i < 3; i += 1) rect(ctx, 44 + i * 3, 6, 2, 2, i < lit ? PAL.i : PAL.f);
}

function zzz(ctx: CanvasRenderingContext2D, t: number) {
  [0, 1].forEach((i) => {
    const age = (t * 0.45 + i * 0.5) % 1;
    blit(ctx, i === 0 ? Z_SMALL : Z_BIG, 40 + Math.round(age * 6), 16 - Math.round(age * 14));
  });
}

/** One effect at time t (seconds since it started; steady ones loop). */
export function drawFx(ctx: CanvasRenderingContext2D, kind: FxKind, t: number, top: number) {
  switch (kind) {
    case 'sparkle': return sparkles(ctx, t);
    case 'hearts': return hearts(ctx, t);
    case 'confetti': return confetti(ctx, t);
    case 'rain': return rain(ctx, t);
    case 'dots': return dots(ctx, t);
    case 'zzz': return zzz(ctx, t);
    case 'sweat': return blit(ctx, DROP, 40, top + 3 + Math.min(8, Math.round(t * 9)));
    case 'bang': return blitShadow(ctx, BANG, 45, 2 - Math.round(Math.abs(Math.sin(t * 9)) * 2));
    case 'qmark': return blitShadow(ctx, QMARK, 44, 2 + Math.round(Math.sin(t * 4)));
  }
}
