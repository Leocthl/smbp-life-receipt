import type { Lang } from '../i18n';

export interface ShareCardText { title: string; ages: string; label: string; desc: string; netWorthLabel: string; netWorth: string; goal: string; footer: string }

const W = 1080, H = 1350, U = 9; // U: one "pixel" of the frame, 3 CSS px at 3x
const CARD = { x: 72, y: 96, w: 936, h: 1134 };
const PAD = CARD.x + 60;
const C = {
  sky: ['#8fd3ff', '#9ad8ff', '#a6ddff', '#b3e2ff', '#bfe7ff', '#cdeeff'], cloud: '#fffaf0', hill: '#7ed07a', hillDeep: '#4fa857',
  paper: '#fffaf0', ink: '#2b3a55', text: '#1f2a44', muted: '#566683', stamp: '#d94a32', marker: '#ffe58a', sun: '#ffd85a', line: '#b3c7dc',
  shadow: 'rgba(43,58,85,0.25)',
};
const FONT = '"PingFang HK", "Noto Sans HK", "Microsoft JhengHei", system-ui, sans-serif';

/** Break text into lines that fit: Chinese can break between any characters, English only at spaces. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, lang: Lang): string[] {
  const tokens = lang === 'zh' ? [...text] : text.split(' ').map((w, i, a) => (i < a.length - 1 ? `${w} ` : w));
  const lines: string[] = [];
  let line = '';
  for (const tok of tokens) {
    if (line && ctx.measureText(line + tok).width > width) { lines.push(line.trimEnd()); line = tok.trimStart(); }
    else line += tok;
  }
  return line ? [...lines, line] : lines;
}

/** A pixel frame: ink border with the four corner pixels cut out, like the on-screen panels. */
function frame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, face: string, ink = C.ink, u = U) {
  ctx.fillStyle = ink;
  ctx.fillRect(x - u, y, w + 2 * u, h);
  ctx.fillRect(x, y - u, w, h + 2 * u);
  ctx.fillStyle = face;
  ctx.fillRect(x, y, w, h);
}

function backdrop(ctx: CanvasRenderingContext2D) {
  const band = H / C.sky.length;
  C.sky.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * band, W, band + 1); });
  ctx.fillStyle = C.cloud;
  for (const [x, y, w] of [[60, 40, 150], [820, 24, 190], [420, 1262, 160]]) { ctx.fillRect(x, y, w, 3 * U); ctx.fillRect(x + U * 2, y - U, w - U * 4, U); }
  ctx.fillStyle = C.hill;
  ctx.fillRect(0, H - 90, W, 90);
  ctx.fillStyle = C.hillDeep;
  for (let x = 0; x < W; x += 54) ctx.fillRect(x, H - 90, 27, U);
}

function paperCard(ctx: CanvasRenderingContext2D) {
  const { x, y, w, h } = CARD;
  ctx.fillStyle = C.shadow;
  ctx.fillRect(x + 3 * U, y + 3 * U, w, h);
  frame(ctx, x, y, w, h, C.paper);
  // perforated top edge: square bites in pixel steps
  ctx.fillStyle = C.ink;
  for (let px = x + U; px < x + w - 2 * U; px += 4 * U) ctx.fillRect(px, y + 2 * U, 2 * U, 2 * U);
}

function stampBox(ctx: CanvasRenderingContext2D, label: string) {
  ctx.save();
  ctx.translate(CARD.x + CARD.w - 290, 250); ctx.rotate(-0.12);
  ctx.font = `800 46px ${FONT}`;
  const sw = Math.min(400, ctx.measureText(label).width + 64);
  ctx.fillStyle = C.stamp;
  ctx.fillRect(-sw / 2 - 6, -56, sw + 12, 104);
  ctx.fillStyle = C.paper;
  ctx.fillRect(-sw / 2, -50, sw, 92);
  ctx.fillStyle = C.stamp; ctx.textAlign = 'center';
  ctx.fillText(label, 0, 12, sw - 40);
  ctx.restore();
}

/** Draw the life receipt as a 1080x1350 PNG (a portrait social-post size) in the bright pixel look. */
export function drawShareCard(t: ShareCardText, lang: Lang): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas is not available'));
  ctx.imageSmoothingEnabled = false;
  backdrop(ctx);
  paperCard(ctx);

  let y = 250;
  const text = (s: string, size: number, color = C.text, weight = 400) => {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    for (const l of wrap(ctx, s, W - 2 * PAD, lang)) { ctx.fillText(l, PAD, y); y += size * 1.45; }
  };
  text(t.title, 64, C.text, 800);
  text(t.ages, 34, C.muted);
  y += 50;
  // the label sits on a sun-yellow plate
  ctx.font = `900 92px ${FONT}`;
  const lw = Math.min(W - 2 * PAD, ctx.measureText(t.label).width + 64);
  frame(ctx, PAD, y - 82, lw, 124, C.sun);
  ctx.fillStyle = C.text; ctx.fillText(t.label, PAD + 32, y + 14, lw - 48);
  y += 110;
  text(t.desc, 38, C.text);
  y += 30;
  ctx.fillStyle = C.ink;
  for (let x = PAD; x < W - PAD; x += 36) ctx.fillRect(x, y, 22, 6);
  y += 80;
  ctx.font = `700 40px ${FONT}`; ctx.fillStyle = C.text; ctx.fillText(t.netWorthLabel, PAD, y);
  ctx.textAlign = 'right'; ctx.font = `800 56px ${FONT}`; ctx.fillText(t.netWorth, W - PAD, y); ctx.textAlign = 'left';
  y += 70;
  // the goal line sits on the yellow highlighter, as on screen
  ctx.font = `400 38px ${FONT}`;
  const goal = wrap(ctx, t.goal, W - 2 * PAD - 48, lang);
  frame(ctx, PAD, y, W - 2 * PAD, goal.length * 55 + 40, C.marker, C.ink, 6);
  ctx.fillStyle = C.text;
  goal.forEach((l, i) => ctx.fillText(l, PAD + 24, y + 62 + i * 55));
  stampBox(ctx, t.label);
  y = CARD.y + CARD.h - 50;
  text(t.footer, 28, C.muted);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not make the image'))), 'image/png'));
}
