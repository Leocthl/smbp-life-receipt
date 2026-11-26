import type { Lang } from '../i18n';

export interface ShareCardAxis {
  leftCode: string;
  rightCode: string;
  leftLabel: string;
  rightLabel: string;
  leftPct: number;
  rightPct: number;
  winner: string;
}

export interface ShareCardText {
  title: string;
  ages: string;
  label: string;
  desc: string;
  netWorthLabel: string;
  netWorth: string;
  goal: string;
  footer: string;
  mbtiCode?: string;
  mbtiTitle?: string;
  rarity?: string;
  grade?: string;
  axes?: ShareCardAxis[];
  barcodeDigits?: string;
}

const W = 1080, H = 1350, U = 9; // U: one "pixel" of the frame, 3 CSS px at 3x
const CARD = { x: 72, y: 96, w: 936, h: 1134 };
const PAD = CARD.x + 56;
const C = {
  sky: ['#8fd3ff', '#9ad8ff', '#a6ddff', '#b3e2ff', '#bfe7ff', '#cdeeff'], cloud: '#fffaf0', hill: '#7ed07a', hillDeep: '#4fa857',
  paper: '#fffaf0', cream: '#fff6dc', ink: '#2b3a55', text: '#1f2a44', muted: '#566683', stamp: '#d94a32', marker: '#ffe58a',
  sun: '#ffd85a', green: '#7ed07a', turquoise: '#4cc3d9', coral: '#ff8a6b', lilac: '#b9a7ff', skyChip: '#8fd3ff', line: '#b3c7dc',
  shadow: 'rgba(43,58,85,0.25)', track: '#e9f1f8',
};
const POLE_COLORS: Readonly<Record<string, string>> = {
  S: C.green,
  E: C.sun,
  G: C.turquoise,
  V: C.coral,
  I: C.skyChip,
  K: C.lilac,
  P: '#a8e4a0',
  A: '#ffb59f',
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
  // perforated top edge: square bites in pixel steps
  ctx.fillStyle = C.ink;
  for (let px = x + U; px < x + w - 2 * U; px += 4 * U) ctx.fillRect(px, y + 2 * U, 2 * U, 2 * U);
}

function stampBox(ctx: CanvasRenderingContext2D, label: string, compact = false) {
  ctx.save();
  ctx.translate(CARD.x + CARD.w - 210, compact ? 236 : 262);
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

function drawMiniAxes(ctx: CanvasRenderingContext2D, axes: ShareCardAxis[], startY: number): number {
  const contentW = W - 2 * PAD;
  const colGap = 28;
  const colW = (contentW - colGap) / 2;
  const rowH = 74;
  axes.slice(0, 4).forEach((ax, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = PAD + col * (colW + colGap);
    const y = startY + row * rowH;
    const leftWins = ax.winner === ax.leftCode;
    const winPct = leftWins ? ax.leftPct : ax.rightPct;

    ctx.font = `800 24px ${FONT}`;
    ctx.fillStyle = leftWins ? C.ink : C.muted;
    ctx.textAlign = 'left';
    ctx.fillText(`${ax.leftCode} ${ax.leftLabel}`, x, y + 24, colW * 0.48);

    ctx.fillStyle = !leftWins ? C.ink : C.muted;
    ctx.textAlign = 'right';
    ctx.fillText(`${ax.rightLabel} ${ax.rightCode}`, x + colW, y + 24, colW * 0.48);

    ctx.font = `900 22px ${MONO}`;
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.fillText(`${winPct}%`, x + colW / 2, y + 24);
    ctx.textAlign = 'left';

    const barY = y + 36;
    const barH = 22;
    frame(ctx, x + 4, barY, colW - 8, barH, C.track, C.ink, 4);
    const innerW = colW - 12;
    const fillW = Math.max(12, Math.round((innerW * winPct) / 100));
    ctx.fillStyle = POLE_COLORS[ax.winner] ?? C.turquoise;
    if (leftWins) ctx.fillRect(x + 6, barY + 2, fillW, barH - 4);
    else ctx.fillRect(x + colW - 6 - fillW, barY + 2, fillW, barH - 4);

    // center 50% tick
    ctx.fillStyle = 'rgba(43,58,85,0.45)';
    ctx.fillRect(x + Math.round(colW / 2) - 2, barY, 4, barH);
  });
  return startY + Math.ceil(Math.min(4, axes.length) / 2) * rowH;
}

function drawReceiptBarcode(ctx: CanvasRenderingContext2D, digits: string, code: string | undefined, y: number) {
  const barW = 540;
  const startX = Math.round((W - barW) / 2);
  let cursor = startX;
  ctx.fillStyle = C.ink;
  // left guard
  ctx.fillRect(cursor, y, 6, 46); cursor += 12;
  ctx.fillRect(cursor, y, 6, 46); cursor += 14;
  for (let i = 0; i < digits.length; i++) {
    const d = digits.charCodeAt(i) - 48;
    const w1 = 4 + (d % 3) * 3;
    const g1 = 4 + ((d >> 1) % 2) * 3;
    const w2 = 4 + ((d + i) % 2) * 3;
    const g2 = 6 + ((d >> 2) % 2) * 3;
    if (cursor + w1 < startX + barW - 30) ctx.fillRect(cursor, y, w1, 42);
    cursor += w1 + g1;
    if (cursor + w2 < startX + barW - 30) ctx.fillRect(cursor, y, w2, 42);
    cursor += w2 + g2;
  }
  // right guard
  ctx.fillRect(startX + barW - 22, y, 6, 46);
  ctx.fillRect(startX + barW - 10, y, 6, 46);

  const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1-');
  ctx.font = `700 22px ${MONO}`;
  ctx.fillStyle = C.muted;
  ctx.textAlign = 'center';
  ctx.fillText(`RCPT ${formatted}${code ? ` · ${code}` : ''}`, W / 2, y + 72);
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

  const hasMbti = Boolean(t.mbtiCode);
  const contentW = W - 2 * PAD;

  if (!hasMbti) {
    // Classic layout preserved for callers without MBTI fields
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

  // Enhanced MBTI Thermal Receipt layout
  let y = 212;
  ctx.font = `800 54px ${FONT}`;
  ctx.fillStyle = C.text;
  ctx.fillText(t.title, PAD, y, contentW - 300);
  y += 46;

  // Ages + Rarity + Grade pills
  ctx.font = `600 28px ${FONT}`;
  ctx.fillStyle = C.muted;
  ctx.fillText(t.ages, PAD, y);
  let chipX = PAD + ctx.measureText(t.ages).width + 24;
  if (t.rarity) {
    ctx.font = `800 24px ${MONO}`;
    const rw = ctx.measureText(t.rarity).width + 28;
    frame(ctx, chipX, y - 26, rw, 36, C.sun, C.ink, 4);
    ctx.fillStyle = C.ink;
    ctx.fillText(t.rarity, chipX + 14, y - 1);
    chipX += rw + 18;
  }
  if (t.grade) {
    ctx.font = `800 24px ${MONO}`;
    const gw = ctx.measureText(t.grade).width + 28;
    if (chipX + gw < CARD.x + CARD.w - 340) {
      frame(ctx, chipX, y - 26, gw, 36, C.turquoise, C.ink, 4);
      ctx.fillStyle = C.ink;
      ctx.fillText(t.grade, chipX + 14, y - 1);
    }
  }

  // MBTI 4-letter pixel plate + Archetype Title
  y = 304;
  const code = t.mbtiCode!;
  const tileSize = 72;
  const tileGap = 14;
  [...code].forEach((ch, idx) => {
    const tx = PAD + idx * (tileSize + tileGap);
    frame(ctx, tx, y, tileSize, tileSize, POLE_COLORS[ch] ?? C.sun, C.ink, 5);
    ctx.font = `900 46px ${MONO}`;
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.fillText(ch, tx + tileSize / 2, y + 52);
  });
  ctx.textAlign = 'left';

  if (t.mbtiTitle) {
    const titleX = PAD + 4 * (tileSize + tileGap) + 14;
    const maxTitleW = W - PAD - titleX;
    ctx.font = `900 42px ${FONT}`;
    ctx.fillStyle = C.text;
    ctx.fillText(t.mbtiTitle, titleX, y + 50, maxTitleW);
  }

  // Behaviour label plate
  y += 108;
  ctx.font = `900 56px ${FONT}`;
  const lw = Math.min(contentW, ctx.measureText(t.label).width + 52);
  frame(ctx, PAD, y, lw, 84, C.sun, C.ink, 6);
  ctx.fillStyle = C.text;
  ctx.fillText(t.label, PAD + 26, y + 60, lw - 40);
  y += 126;

  // Description (capped neatly to 2 lines)
  ctx.font = `500 32px ${FONT}`;
  ctx.fillStyle = C.text;
  const descLines = wrap(ctx, t.desc, contentW, lang).slice(0, 2);
  for (const line of descLines) {
    ctx.fillText(line, PAD, y);
    y += 44;
  }

  y += 12;
  drawDashedRule(ctx, y);
  y += 58;

  // Net worth row
  ctx.font = `700 36px ${FONT}`;
  ctx.fillStyle = C.text;
  ctx.fillText(t.netWorthLabel, PAD, y);
  ctx.textAlign = 'right';
  ctx.font = `900 52px ${MONO}`;
  ctx.fillText(t.netWorth, W - PAD, y);
  ctx.textAlign = 'left';
  y += 30;

  // 4 mini spectrum bars
  if (t.axes && t.axes.length > 0) {
    y = drawMiniAxes(ctx, t.axes, y);
    y += 18;
  } else {
    y += 24;
  }

  // Goal verdict highlighter box
  ctx.font = `500 32px ${FONT}`;
  const goalLines = wrap(ctx, t.goal, contentW - 44, lang).slice(0, 3);
  const goalBoxH = goalLines.length * 44 + 34;
  frame(ctx, PAD, y, contentW, goalBoxH, C.marker, C.ink, 6);
  ctx.fillStyle = C.text;
  goalLines.forEach((l, i) => ctx.fillText(l, PAD + 22, y + 48 + i * 44));

  // Stamp top-right
  stampBox(ctx, t.label, true);

  // Barcode + Footer pinned cleanly to the bottom of the thermal card
  const footerY = CARD.y + CARD.h - 26;
  if (t.barcodeDigits) {
    const barcodeY = Math.max(y + goalBoxH + 22, footerY - 110);
    if (barcodeY + 72 < footerY) {
      drawReceiptBarcode(ctx, t.barcodeDigits, t.mbtiCode, barcodeY);
    }
  }
  ctx.font = `400 24px ${FONT}`;
  ctx.fillStyle = C.muted;
  ctx.fillText(t.footer, PAD, footerY, contentW);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not make the image'))), 'image/png'));
}
