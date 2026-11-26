import type { Lang } from '../i18n';
import { QUALITIES, type Quality } from '../world3d/qualities';

export interface ShareCardText {
  title: string;
  ages: string;
  label: string;
  desc: string;
  netWorthLabel: string;
  netWorth: string;
  goal: string;
  footer: string;
  archetypeName?: string;
  areaScore?: string;
  rarity?: string;
  grade?: string;
  hexValues?: Record<Quality, number>;
  hexLabels?: Record<Quality, string>;
  barcodeDigits?: string;
}

const W = 1080, H = 1350, U = 9; // U: one "pixel" of the frame, 3 CSS px at 3x
const CARD = { x: 72, y: 96, w: 936, h: 1134 };
const PAD = CARD.x + 56;
const C = {
  sky: ['#8fd3ff', '#9ad8ff', '#a6ddff', '#b3e2ff', '#bfe7ff', '#cdeeff'], cloud: '#fffaf0', hill: '#7ed07a', hillDeep: '#4fa857',
  paper: '#fffaf0', cream: '#fff6dc', ink: '#2b3a55', text: '#1f2a44', muted: '#566683', stamp: '#d94a32', marker: '#ffe58a',
  sun: '#ffd85a', green: '#7ed07a', turquoise: '#4cc3d9', grid: '#a9cfe0', coral: '#ff8a6b', lilac: '#b9a7ff', line: '#b3c7dc',
  shadow: 'rgba(43,58,85,0.25)', track: '#e9f1f8',
};
const QUALITY_COLORS: Readonly<Record<Quality, string>> = {
  wealth: C.sun,
  safety: C.turquoise,
  joy: C.coral,
  bonds: C.lilac,
  freedom: '#8fd3ff',
  growth: C.green,
};
const FONT = '"PingFang HK", "Noto Sans HK", "Microsoft JhengHei", system-ui, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

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
  ctx.fillStyle = C.ink;
  for (let px = x + U; px < x + w - 2 * U; px += 4 * U) ctx.fillRect(px, y + 2 * U, 2 * U, 2 * U);
}

function stampBox(ctx: CanvasRenderingContext2D, label: string, compact = false) {
  ctx.save();
  ctx.translate(CARD.x + CARD.w - 205, compact ? 236 : 262);
  ctx.rotate(-0.12);
  ctx.font = `800 ${compact ? 36 : 46}px ${FONT}`;
  const sw = Math.min(310, ctx.measureText(label).width + 52);
  const sh = compact ? 74 : 92;
  ctx.fillStyle = C.stamp;
  ctx.fillRect(-sw / 2 - 6, -sh / 2 - 6, sw + 12, sh + 12);
  ctx.fillStyle = C.paper;
  ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
  ctx.fillStyle = C.stamp;
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, compact ? 12 : 14, sw - 32);
  ctx.restore();
}

function drawDashedRule(ctx: CanvasRenderingContext2D, y: number) {
  ctx.fillStyle = C.ink;
  for (let x = PAD; x < W - PAD; x += 36) ctx.fillRect(x, y, 22, 6);
}

function drawShareHexagon(
  ctx: CanvasRenderingContext2D,
  values: Record<Quality, number>,
  labels: Record<Quality, string> | undefined,
  cx: number,
  cy: number,
  maxR: number,
) {
  const step = (Math.PI * 2) / QUALITIES.length;
  const start = -Math.PI / 2;
  const pt = (i: number, r: number): [number, number] => [cx + Math.cos(start + i * step) * r, cy + Math.sin(start + i * step) * r];

  // Concentric hex rings
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 3;
  for (const f of [1 / 3, 2 / 3, 1]) {
    ctx.beginPath();
    QUALITIES.forEach((_, i) => {
      const [x, y] = pt(i, maxR * f);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }
  // Spokes
  QUALITIES.forEach((_, i) => {
    const [x, y] = pt(i, maxR);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
  });

  // Filled life shape
  const pts = QUALITIES.map((q, i) => pt(i, (maxR * Math.max(0, Math.min(100, values[q]))) / 100));
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(76, 195, 217, 0.72)';
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Golden square pixel vertices
  pts.forEach(([x, y]) => {
    ctx.fillStyle = C.ink;
    ctx.fillRect(Math.round(x - 8), Math.round(y - 8), 16, 16);
    ctx.fillStyle = C.sun;
    ctx.fillRect(Math.round(x - 5), Math.round(y - 5), 10, 10);
  });

  // Axis labels + numeric scores
  QUALITIES.forEach((q, i) => {
    const [vx, vy] = pt(i, maxR + 26);
    const score = Math.round(values[q]);
    const name = labels?.[q] ?? q;
    ctx.font = `800 22px ${FONT}`;
    ctx.fillStyle = C.text;
    if (Math.abs(vx - cx) < 10) {
      ctx.textAlign = 'center';
      const base = vy < cy ? vy - 18 : vy + 18;
      ctx.fillText(`${name} ${score}`, vx, base);
    } else if (vx > cx) {
      ctx.textAlign = 'left';
      ctx.fillText(name, vx, vy - 2);
      ctx.font = `900 22px ${MONO}`;
      ctx.fillText(String(score), vx, vy + 24);
    } else {
      ctx.textAlign = 'right';
      ctx.fillText(name, vx, vy - 2);
      ctx.font = `900 22px ${MONO}`;
      ctx.fillText(String(score), vx, vy + 24);
    }
  });
  ctx.textAlign = 'left';
}

function drawMiniQualityBars(
  ctx: CanvasRenderingContext2D,
  values: Record<Quality, number>,
  labels: Record<Quality, string> | undefined,
  x: number,
  y: number,
  w: number,
) {
  const rowH = 56;
  QUALITIES.forEach((q, idx) => {
    const ry = y + idx * rowH;
    const val = Math.round(Math.max(0, Math.min(100, values[q])));
    const name = labels?.[q] ?? q;
    ctx.font = `800 22px ${FONT}`;
    ctx.fillStyle = C.text;
    ctx.textAlign = 'left';
    ctx.fillText(name, x, ry + 20);
    ctx.font = `900 22px ${MONO}`;
    ctx.textAlign = 'right';
    ctx.fillText(String(val), x + w, ry + 20);
    ctx.textAlign = 'left';

    const barY = ry + 28;
    const barH = 16;
    frame(ctx, x + 3, barY, w - 6, barH, C.track, C.ink, 3);
    const fillW = Math.max(8, Math.round(((w - 10) * val) / 100));
    ctx.fillStyle = QUALITY_COLORS[q];
    ctx.fillRect(x + 5, barY + 2, fillW, barH - 4);
  });
}

function drawReceiptBarcode(ctx: CanvasRenderingContext2D, digits: string, footerTag: string, y: number) {
  const barW = 540;
  const startX = Math.round((W - barW) / 2);
  let cursor = startX;
  ctx.fillStyle = C.ink;
  ctx.fillRect(cursor, y, 6, 44); cursor += 12;
  ctx.fillRect(cursor, y, 6, 44); cursor += 14;
  for (let i = 0; i < digits.length; i += 1) {
    const d = digits.charCodeAt(i) - 48;
    const w1 = 4 + (d % 3) * 3;
    const g1 = 4 + ((d >> 1) % 2) * 3;
    const w2 = 4 + ((d + i) % 2) * 3;
    const g2 = 6 + ((d >> 2) % 2) * 3;
    if (cursor + w1 < startX + barW - 30) ctx.fillRect(cursor, y, w1, 40);
    cursor += w1 + g1;
    if (cursor + w2 < startX + barW - 30) ctx.fillRect(cursor, y, w2, 40);
    cursor += w2 + g2;
  }
  ctx.fillRect(startX + barW - 22, y, 6, 44);
  ctx.fillRect(startX + barW - 10, y, 6, 44);

  const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1-');
  ctx.font = `700 22px ${MONO}`;
  ctx.fillStyle = C.muted;
  ctx.textAlign = 'center';
  ctx.fillText(`RCPT ${formatted} · ${footerTag}`, W / 2, y + 70);
  ctx.textAlign = 'left';
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

  const hasHex = Boolean(t.hexValues);
  const contentW = W - 2 * PAD;

  if (!hasHex) {
    let y = 250;
    const text = (s: string, size: number, color = C.text, weight = 400) => {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.fillStyle = color;
      for (const l of wrap(ctx, s, contentW, lang)) { ctx.fillText(l, PAD, y); y += size * 1.45; }
    };
    text(t.title, 64, C.text, 800);
    text(t.ages, 34, C.muted);
    y += 50;
    ctx.font = `900 92px ${FONT}`;
    const lw = Math.min(contentW, ctx.measureText(t.label).width + 64);
    frame(ctx, PAD, y - 82, lw, 124, C.sun);
    ctx.fillStyle = C.text; ctx.fillText(t.label, PAD + 32, y + 14, lw - 48);
    y += 110;
    text(t.desc, 38, C.text);
    y += 30;
    drawDashedRule(ctx, y);
    y += 80;
    ctx.font = `700 40px ${FONT}`; ctx.fillStyle = C.text; ctx.fillText(t.netWorthLabel, PAD, y);
    ctx.textAlign = 'right'; ctx.font = `800 56px ${FONT}`; ctx.fillText(t.netWorth, W - PAD, y); ctx.textAlign = 'left';
    y += 70;
    ctx.font = `400 38px ${FONT}`;
    const goal = wrap(ctx, t.goal, contentW - 48, lang);
    frame(ctx, PAD, y, contentW, goal.length * 55 + 40, C.marker, C.ink, 6);
    ctx.fillStyle = C.text;
    goal.forEach((l, i) => ctx.fillText(l, PAD + 24, y + 62 + i * 55));
    stampBox(ctx, t.label);
    y = CARD.y + CARD.h - 50;
    text(t.footer, 28, C.muted);
    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not make the image'))), 'image/png'));
  }

  // Enhanced Life Hexagon Receipt layout
  let y = 200;
  ctx.font = `800 50px ${FONT}`;
  ctx.fillStyle = C.text;
  ctx.fillText(t.title, PAD, y, contentW - 300);
  y += 46;

  // Ages + Area + Rarity + Grade pills
  ctx.font = `600 25px ${FONT}`;
  ctx.fillStyle = C.muted;
  ctx.fillText(t.ages, PAD, y);
  let chipX = PAD + ctx.measureText(t.ages).width + 16;
  for (const [label, bg] of [
    [t.areaScore, C.sun],
    [t.rarity, C.cream],
    [t.grade, C.turquoise],
  ] as const) {
    if (!label) continue;
    ctx.font = `800 20px ${MONO}`;
    const pw = ctx.measureText(label).width + 20;
    if (chipX + pw < CARD.x + CARD.w - 315) {
      frame(ctx, chipX, y - 22, pw, 32, bg, C.ink, 4);
      ctx.fillStyle = C.ink;
      ctx.fillText(label, chipX + 10, y - 1);
      chipX += pw + 12;
    }
  }

  // Archetype Name + Behaviour Label
  y = 322;
  if (t.archetypeName) {
    ctx.font = `900 44px ${FONT}`;
    ctx.fillStyle = C.text;
    ctx.fillText(t.archetypeName, PAD, y, contentW - 260);
    y += 58;
  }

  ctx.font = `900 48px ${FONT}`;
  const lw = Math.min(contentW, ctx.measureText(t.label).width + 48);
  frame(ctx, PAD, y - 42, lw, 68, C.sun, C.ink, 5);
  ctx.fillStyle = C.text;
  ctx.fillText(t.label, PAD + 24, y + 7, lw - 36);
  y += 62;

  // Description (capped neatly to 2 lines)
  ctx.font = `500 27px ${FONT}`;
  ctx.fillStyle = C.muted;
  for (const line of wrap(ctx, t.desc, contentW, lang).slice(0, 2)) {
    ctx.fillText(line, PAD, y);
    y += 36;
  }

  y += 6;
  drawDashedRule(ctx, y);
  y += 24;

  // Centerpiece: Left Hexagon Radar + Right 6-Dimension Bars
  const hexPanelW = 430;
  const hexPanelH = 340;
  frame(ctx, PAD, y, hexPanelW, hexPanelH, C.cream, C.ink, 5);
  drawShareHexagon(ctx, t.hexValues!, t.hexLabels, PAD + hexPanelW / 2, y + hexPanelH / 2 + 4, 102);

  const rightX = PAD + hexPanelW + 32;
  const rightW = W - PAD - rightX;
  drawMiniQualityBars(ctx, t.hexValues!, t.hexLabels, rightX, y + 6, rightW);

  y += hexPanelH + 50;

  // Net worth row
  ctx.font = `700 34px ${FONT}`;
  ctx.fillStyle = C.text;
  ctx.fillText(t.netWorthLabel, PAD, y);
  ctx.textAlign = 'right';
  ctx.font = `900 46px ${MONO}`;
  ctx.fillText(t.netWorth, W - PAD, y);
  ctx.textAlign = 'left';
  y += 24;

  // Goal box
  ctx.font = `400 32px ${FONT}`;
  const goalLines = wrap(ctx, t.goal, contentW - 44, lang).slice(0, 2);
  const goalH = Math.max(82, goalLines.length * 44 + 30);
  frame(ctx, PAD, y, contentW, goalH, C.marker, C.ink, 5);
  ctx.fillStyle = C.text;
  goalLines.forEach((l, i) => ctx.fillText(l, PAD + 22, y + 50 + i * 44));

  stampBox(ctx, t.label, true);

  if (t.barcodeDigits) {
    drawReceiptBarcode(ctx, t.barcodeDigits, t.areaScore ?? 'HEX', CARD.y + CARD.h - 142);
  }

  ctx.font = `500 24px ${FONT}`;
  ctx.fillStyle = C.muted;
  ctx.fillText(t.footer, PAD, CARD.y + CARD.h - 28, contentW);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not make the image'))), 'image/png'));
}
