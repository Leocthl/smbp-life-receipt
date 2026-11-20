import type { Lang } from '../i18n';

export interface ShareCardText { title: string; ages: string; label: string; desc: string; netWorthLabel: string; netWorth: string; goal: string; footer: string }

const W = 1080, H = 1350, PAD = 96;
const C = { table: '#2f5d50', paper: '#fbfaf4', ink: '#23262b', muted: '#6b6f73', stamp: '#c8243a', marker: '#ffe066' };
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

/** Draw the life receipt as a 1080x1350 PNG (a portrait social-post size). */
export function drawShareCard(t: ShareCardText, lang: Lang): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas is not available'));
  ctx.fillStyle = C.table;
  ctx.fillRect(0, 0, W, H);
  // paper with a torn bottom edge
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.moveTo(48, 48);
  ctx.lineTo(W - 48, 48);
  ctx.lineTo(W - 48, H - 80);
  for (let x = W - 48; x > 48; x -= 24) ctx.lineTo(x - 12, H - 64), ctx.lineTo(x - 24, H - 80);
  ctx.closePath();
  ctx.fill();

  let y = 170;
  const text = (s: string, size: number, color = C.ink, weight = 400) => {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    for (const l of wrap(ctx, s, W - 2 * PAD, lang)) { ctx.fillText(l, PAD, y); y += size * 1.45; }
  };
  text(t.title, 64, C.ink, 800);
  text(t.ages, 34, C.muted);
  y += 70;
  text(t.label, 96, C.ink, 800);
  y += 10;
  text(t.desc, 38, C.ink);
  y += 30;
  ctx.setLineDash([18, 12]); ctx.lineWidth = 4; ctx.strokeStyle = C.ink;
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke(); ctx.setLineDash([]);
  y += 80;
  ctx.font = `700 40px ${FONT}`; ctx.fillStyle = C.ink; ctx.fillText(t.netWorthLabel, PAD, y);
  ctx.textAlign = 'right'; ctx.font = `800 56px ${FONT}`; ctx.fillText(t.netWorth, W - PAD, y); ctx.textAlign = 'left';
  y += 70;
  // the goal line sits on the yellow highlighter, as on screen
  ctx.font = `400 38px ${FONT}`;
  const goal = wrap(ctx, t.goal, W - 2 * PAD - 48, lang);
  ctx.fillStyle = C.marker;
  ctx.fillRect(PAD, y, W - 2 * PAD, goal.length * 55 + 40);
  ctx.fillStyle = C.ink;
  goal.forEach((l, i) => ctx.fillText(l, PAD + 24, y + 62 + i * 55));
  y += goal.length * 55 + 40;
  // stamp
  ctx.save();
  ctx.translate(W - 290, 250); ctx.rotate(-0.12);
  ctx.strokeStyle = C.stamp; ctx.fillStyle = C.stamp; ctx.lineWidth = 7;
  ctx.font = `800 46px ${FONT}`;
  const sw = Math.min(380, ctx.measureText(t.label).width + 56);
  ctx.strokeRect(-sw / 2, -50, sw, 92);
  ctx.textAlign = 'center'; ctx.fillText(t.label, 0, 12, sw - 40);
  ctx.restore();
  y = H - 130;
  text(t.footer, 28, C.muted);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not make the image'))), 'image/png'));
}
