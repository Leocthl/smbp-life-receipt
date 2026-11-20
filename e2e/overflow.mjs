// Walks every screen at phone and desktop sizes, in zh and en, and flags anything that overflows its box,
// sticks out of its parent or the viewport, or (desktop) makes the conversation scroll.
// Usage: node e2e/overflow.mjs   env: ML_ONLY=phone390,pc1280  ML_LANG=en  ML_LIFE=1|0 (full life on every size / only the first cards;
// default: a full life on the two tightest sizes, phone360 and pc1366, the first cards elsewhere)
// Exits 1 when anything is flagged. Screenshots of the first flagged screens go to shots/3d/overflow-*.png.
import { mkdirSync } from 'node:fs';
import { BASE, DESKTOPS, PHONES, launch, settle, startLife, tap, waitCard } from './lib.mjs';

const SHOTS = new URL('../shots/3d/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const ONLY = process.env.ML_ONLY?.split(',');
const LANGS = process.env.ML_LANG ? [process.env.ML_LANG] : ['zh', 'en'];
const PROFILES = [...PHONES, ...DESKTOPS].filter((p) => !ONLY || ONLY.includes(p.name));
const fullLife = (p) => (process.env.ML_LIFE ? process.env.ML_LIFE === '1' : ['phone360', 'pc1366'].includes(p.name));
const SCREENS = '[data-testid=card], [data-testid=result], [data-testid=summary], [data-testid=goal], [data-testid=ending], [data-testid=intro]';

/** Runs inside the page: returns a list of problems for the elements under root(s). */
function audit({ desktop, where }) {
  const problems = [];
  const hangParent = (p) => (/[。，、」』）！？；：]$/.test(p.textContent ?? '') ? 8 : 0);
  const vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const name = (el) => `${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className).split(' ').filter(Boolean).slice(0, 2).join('.')}`;
  const hidden = (el) => { const r = el.getBoundingClientRect(); return r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden'; };
  const roots = [...document.querySelectorAll('.ml-hud, .ml-stage, .ml-flow-walk, .ml-flow-hexpanel, .ml-mini, [data-testid=mini]')].filter((r) => !r.hidden);
  for (const root of roots) {
    for (const el of [root, ...root.querySelectorAll('*')]) {
      if (hidden(el) || el.closest('canvas, svg') || el.getAnimations({ subtree: true }).some((a) => a.effect?.getComputedTiming().iterations !== Infinity)) continue; // mid-slide pieces are measured once they land
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      const scrollsX = /(auto|scroll)/.test(cs.overflowX);
      // text or content wider than its own box (ellipsis and clamps are deliberate and skipped)
      // a CJK line may let its closing punctuation hang a few px past the box: that is the browser's own typesetting
      const hang = /[。，、」』）！？；：]$/.test(el.textContent ?? '') ? 8 : 0;
      if (!scrollsX && el.scrollWidth > el.clientWidth + 1 + hang && cs.display !== 'inline' && cs.textOverflow !== 'ellipsis' && !cs.webkitLineClamp?.match(/^[1-9]/) && el.clientWidth > 0 && cs.overflow !== 'hidden' ) {
        problems.push(`wider than its box (${el.scrollWidth} > ${el.clientWidth}): ${name(el)}`);
      }
      if (r.right > vw + 1 || r.left < -1) {
        if (!el.closest('.ml-stage[data-sheet] .ml-receipt__body') || r.width) problems.push(`outside the viewport (${Math.round(r.left)}..${Math.round(r.right)} of ${vw}): ${name(el)}`);
      }
      const p = el.parentElement;
      if (p && p !== document.body && root.contains(p) && !el.matches('.ml-stamp, .ml-sheet__grip, .ml-chat__frame *, .ml-receipt__edge *') && !/^(absolute|fixed)$/.test(cs.position)) {
        const pr = p.getBoundingClientRect(), pcs = getComputedStyle(p);
        if (pcs.display !== 'contents' && r.width && (r.right > pr.right + 4 + hangParent(p) || r.left < pr.left - 4)) problems.push(`sticks out of its parent (${Math.round(r.left)}..${Math.round(r.right)} vs ${Math.round(pr.left)}..${Math.round(pr.right)}): ${name(el)} in ${name(p)}`);
      }
    }
  }
  if (document.documentElement.scrollWidth > vw + 1) problems.push(`page scrolls sideways (${document.documentElement.scrollWidth} > ${vw})`);
  if (document.documentElement.scrollHeight > vh + 1) problems.push(`page scrolls down (${document.documentElement.scrollHeight} > ${vh})`);
  const thread = document.querySelector('.ml-chat__thread');
  if (desktop && thread && thread.scrollHeight > thread.clientHeight + 1 && document.querySelector('[data-testid^=choice-], [data-testid=next]')) {
    problems.push(`desktop conversation scrolls (${thread.scrollHeight} > ${thread.clientHeight})`);
  }
  const body = document.querySelector('.ml-receipt__body');
  if (desktop && body && body.scrollHeight > body.clientHeight + 1 && !document.querySelector('[data-testid=summary], [data-testid=ending]')) {
    problems.push(`desktop receipt scrolls (${body.scrollHeight} > ${body.clientHeight})`);
  }
  // a card must show every choice and the confirm button whole, at whatever snap the sheet opened (never below the fold, never clipped by the thread)
  const sheet = document.querySelector('.ml-stage[data-sheet]');
  if (document.querySelector('[data-testid^=choice-]') && (!sheet || sheet.dataset.snap !== 'peek')) {
    const box = thread?.getBoundingClientRect();
    for (const el of document.querySelectorAll('[data-testid^=choice-], [data-testid=confirm]')) {
      const r = el.getBoundingClientRect();
      const lim = el.matches('[data-testid=confirm]') ? { top: 0, bottom: vh } : { top: box?.top ?? 0, bottom: Math.min(box?.bottom ?? vh, vh) };
      if (r.height && (r.top < lim.top - 1 || r.bottom > lim.bottom + 1)) problems.push(`${el.getAttribute('data-testid')} not fully visible (${Math.round(r.top)}..${Math.round(r.bottom)} in ${Math.round(lim.top)}..${Math.round(lim.bottom)}, snap ${sheet?.dataset.snap ?? 'desktop'})`);
    }
  }
  for (const b of document.querySelectorAll('button')) {
    const r = b.getBoundingClientRect();
    if (r.width && b.closest('.ml-stage, .ml-hud, .ml-flow-walk') && !hidden(b) && r.height < 40) problems.push(`button too short (${Math.round(r.height)}px): ${(b.textContent ?? '').slice(0, 24)}`);
  }
  return problems.map((x) => `[${where}] ${x}`);
}

const found = new Map();
let shots = 0;
async function check(page, profile, lang, label) {
  await settle(page);
  const where = `${profile.name} ${lang} ${label}`;
  const problems = await page.evaluate(audit, { desktop: !profile.options.hasTouch, where });
  for (const p of problems) found.set(p.replace(/\(\d+[^)]*\)/g, '(n)'), p);
  if (problems.length && shots++ < 6) await page.screenshot({ path: `${SHOTS}overflow-${profile.name}-${lang}-${label.replace(/\W+/g, '_')}.png` });
}

/** The HUD with the widest numbers the game can print (money() goes compact above $100k) and the longest runway label. */
async function stressHud(page, profile, lang) {
  const wide = lang === 'zh' ? ['-$99,999', '-$123.4萬'] : ['-$99,999', '-$123k'];
  const saved = await page.evaluate(([cash, worth]) => {
    const els = ['stat-cash', 'stat-networth'].map((id) => document.querySelector(`[data-testid=${id}] .ml-hud__num`));
    const run = document.querySelector('[data-testid=stat-runway]');
    const before = [els[0]?.textContent, els[1]?.textContent, run?.textContent];
    if (els[0]) els[0].textContent = cash;
    if (els[1]) els[1].textContent = worth;
    if (run) run.textContent = ' · 99+ mo';
    return before;
  }, wide);
  await check(page, profile, lang, 'hud widest numbers');
  await page.evaluate((b) => {
    const els = ['stat-cash', 'stat-networth'].map((id) => document.querySelector(`[data-testid=${id}] .ml-hud__num`));
    if (els[0]) els[0].textContent = b[0]; if (els[1]) els[1].textContent = b[1];
    const run = document.querySelector('[data-testid=stat-runway]'); if (run) run.textContent = b[2];
  }, saved);
}

async function playLife(page, profile, lang, touch) {
  const full = fullLife(profile);
  const seen = new Set();
  let cards = 0;
  for (let step = 0; step < 800; step++) {
    const el = page.locator('main[data-slip]');
    const slip = await el.getAttribute('data-slip');
    const kind = slip.split('-').pop();
    if (kind === 'ending') {
      await page.getByTestId('ending').waitFor({ state: 'visible' });
      await check(page, profile, lang, 'ending');
      await tap(page, page.locator('[data-testid=ending-details] > summary'), touch);
      await check(page, profile, lang, 'ending details');
      return;
    }
    if (kind === 'goal') {
      await check(page, profile, lang, 'goal');
      await tap(page, page.getByTestId('goal-security'), touch);
      await tap(page, page.getByTestId('goal-go'), touch);
    } else if (kind === 'card') {
      await page.locator('[data-testid^=choice-], [data-testid=walk-skip]').first().waitFor({ state: 'visible' });
      if (await page.getByTestId('walk-skip').isVisible()) { await check(page, profile, lang, 'walk prompt'); }
      await waitCard(page, touch);
      const options = page.locator('[data-testid^=choice-]');
      const n = await options.count();
      await tap(page, options.nth(cards % n), touch);
      await page.getByTestId('confirm').and(page.locator(':enabled')).waitFor();
      await check(page, profile, lang, `card ${n} choices`);
      cards++;
      await tap(page, page.getByTestId('confirm'), touch);
    } else if (kind === 'result') {
      await page.getByTestId('next').waitFor({ state: 'visible' });
      await check(page, profile, lang, 'result');
      await tap(page, page.getByTestId('next'), touch);
    } else if (kind === 'summary') {
      await check(page, profile, lang, 'summary');
      await tap(page, page.getByTestId('summary-next'), touch);
    }
    await page.waitForFunction((p) => document.querySelector('main[data-slip]')?.getAttribute('data-slip') !== p, slip);
    await page.locator(SCREENS + ', [data-testid=walk]').first().waitFor({ state: 'visible' });
    if (!full && cards >= 4 && seen.size === 0) { seen.add('x'); return; }
  }
}

const browser = await launch();
try {
  for (const profile of PROFILES) for (const lang of LANGS) {
    let context = await browser.newContext(profile.options);
    let page = await context.newPage();
    const touch = Boolean(profile.options.hasTouch);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${BASE}/?seed=4242&lang=${lang}&debug=1`);
    await page.getByTestId('start-btn').waitFor({ state: 'visible' });
    await check(page, profile, lang, 'start');
    await tap(page, page.getByTestId('start-btn'), touch);
    await page.getByTestId('begin-life').waitFor({ state: 'visible' });
    await check(page, profile, lang, 'intro');
    await tap(page, page.getByTestId('begin-life'), touch);
    await page.locator('[data-testid^=choice-], [data-testid=walk-skip]').first().waitFor({ state: 'visible' });
    if (await page.getByTestId('walk-skip').isVisible()) { await check(page, profile, lang, 'walk prompt'); await tap(page, page.getByTestId('walk-skip'), touch); }
    await page.locator('[data-testid^=choice-]').first().waitFor({ state: 'visible' });
    await stressHud(page, profile, lang);
    if (touch) { // the sheet at each snap
      for (const snap of ['peek', 'full', 'half']) {
        const h = page.getByTestId('sheet-handle');
        for (let i = 0; i < 3 && (await h.getAttribute('data-snap')) !== snap; i++) await tap(page, h, true);
        await check(page, profile, lang, `sheet ${snap}`);
      }
    }
    await tap(page, page.getByTestId('hex-open'), touch);
    await page.getByTestId('hex-panel').waitFor({ state: 'visible' });
    await check(page, profile, lang, 'hex panel');
    await page.keyboard.press('Escape');
    // the life runs in a fresh page: tapping the handle above is a choice the sheet remembers, which would switch off its own "open full when it does not fit"
    await context.close();
    context = await browser.newContext(profile.options);
    page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await startLife(page, { lang, touch });
    await playLife(page, profile, lang, touch);
    if (errors.length) found.set(`errors ${profile.name} ${lang}`, `[${profile.name} ${lang}] page errors: ${errors.slice(0, 2).join(' | ')}`);
    await context.close();
    process.stdout.write(`done ${profile.name} ${lang}: ${found.size} distinct problems so far\n`);
  }
  // mini-games: the jump hook draws one on a canvas with its own overlay
  for (const profile of PROFILES.filter((p) => p.options.hasTouch || p.name === 'pc1280')) for (const m of ['budget', 'hold', 'compare']) for (const lang of LANGS) {
    const context = await browser.newContext(profile.options);
    const page = await context.newPage();
    await page.goto(`${BASE}/?look=minigame&m=${m}&lang=${lang}`);
    await page.waitForFunction(() => document.title === 'ready', null, { timeout: 30000 });
    await check(page, profile, lang, `minigame ${m}`);
    await page.goto(`${BASE}/?look=minigame&m=${m}&lang=${lang}&auto=1`); // straight into play: the stats bar, hold button or fund list
    await page.waitForTimeout(1500);
    await check(page, profile, lang, `minigame ${m} playing`);
    await context.close();
  }
} finally {
  await browser.close();
}
const list = [...found.values()];
if (list.length) { console.error(`OVERFLOW: ${list.length} distinct problems\n` + list.join('\n')); process.exit(1); }
console.log('OVERFLOW: zero problems');
