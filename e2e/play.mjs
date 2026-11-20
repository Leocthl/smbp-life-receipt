// Full-life browser run, desktop and phone (390x844, touch). Waits on elements, never fixed delays.
// Usage: node e2e/play.mjs [baseUrl]   (dev server must be running: npm run dev)
import { mkdirSync } from 'node:fs';
import { chromium } from '/Users/leo/csProj/jeng-map/node_modules/playwright/index.mjs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:5198';
const SEED = 4242;
// E2E_LANG=en plays in English and saves screenshots to shots/en/
const LANG = process.env.E2E_LANG === 'en' ? 'en' : 'zh';
const SHOTS = new URL(LANG === 'en' ? '../shots/en/' : '../shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const PROFILES = [
  { name: 'desktop', options: { viewport: { width: 1280, height: 900 } } },
  { name: 'phone', options: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
];
const SCREENS = '[data-testid=card], [data-testid=result], [data-testid=summary], [data-testid=goal], [data-testid=ending]';

async function press(page, locator, touch) {
  await locator.waitFor({ state: 'visible' });
  if (touch) await locator.tap();
  else await locator.click();
}

/** After an action, wait until the slip on screen has changed. */
async function nextSlip(page, prev) {
  await page.waitForFunction((p) => document.querySelector('main[data-slip]')?.getAttribute('data-slip') !== p, prev);
  await page.locator(SCREENS).first().waitFor({ state: 'visible' });
  return page.locator('main[data-slip]').getAttribute('data-slip');
}

/** Wait until every finite animation (slip print, stamp, prop pop) has finished, so shots are not mid-fade. */
async function settle(page) {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
    .map((a) => a.finished.catch(() => undefined))));
}

async function checkLayout(page, where) {
  await settle(page);
  const problems = await page.evaluate(() => {
    const out = [];
    const docW = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > docW + 1) {
      const wide = [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > docW + 1).map((el) => `${el.tagName.toLowerCase()}.${el.className?.baseVal ?? el.className}`).slice(0, 4);
      out.push(`page scrolls sideways (${document.documentElement.scrollWidth} > ${docW}): ${wide.join(', ')}`);
    }
    for (const el of document.querySelectorAll('button')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.height < 44) out.push(`button too small (${Math.round(r.height)}px): ${el.textContent?.slice(0, 30)}`);
      if (r.right > docW + 1 || r.left < -1) out.push(`button outside the screen: ${el.textContent?.slice(0, 30)}`);
    }
    for (const el of document.querySelectorAll('.ml-receipt__body *')) {
      const parent = el.closest('.ml-receipt__body').getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > parent.right + 1 || r.left < parent.left - 1)) out.push(`content spills out of the card: <${el.tagName.toLowerCase()} class="${el.className?.baseVal ?? el.className}">`);
    }
    return out;
  });
  if (problems.length) throw new Error(`[${where}] layout: ${[...new Set(problems)].slice(0, 5).join('; ')}`);
}

async function playProfile(browser, profile) {
  const context = await browser.newContext(profile.options);
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`console.${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  const touch = Boolean(profile.options.hasTouch);
  await page.goto(`${BASE}/?seed=${SEED}&lang=${LANG}`);
  await press(page, page.getByTestId('start-btn'), touch);
  await press(page, page.getByTestId('begin-life'), touch);
  let slip = await nextSlip(page, 'start');
  const shot = { card: false, summary: false };
  let steps = 0, cards = 0, summaries = 0;
  while (steps++ < 600) {
    const kind = slip.split('-').pop();
    if (kind === 'ending') break;
    if (kind === 'goal') {
      await press(page, page.getByTestId('goal-security'), touch);
      await press(page, page.getByTestId('goal-go'), touch);
      slip = await nextSlip(page, slip);
      continue;
    }
    if (kind === 'card') {
      const options = page.locator('[data-testid^=choice-]');
      await options.first().waitFor({ state: 'visible' });
      const n = await options.count();
      await press(page, options.nth(cards % n), touch);
      await page.getByTestId('confirm').and(page.locator(':enabled')).waitFor();
      if (!shot.card && cards >= 2) { await checkLayout(page, `${profile.name} card`); await page.screenshot({ path: `${SHOTS}${profile.name}-card.png`, fullPage: true }); shot.card = true; }
      cards++;
      await press(page, page.getByTestId('confirm'), touch);
    } else if (kind === 'result') {
      await press(page, page.getByTestId('next'), touch);
    } else if (kind === 'summary') {
      if (!shot.summary && summaries >= 5) { await checkLayout(page, `${profile.name} summary`); await page.screenshot({ path: `${SHOTS}${profile.name}-summary.png`, fullPage: true }); shot.summary = true; }
      summaries++;
      await press(page, page.getByTestId('summary-next'), touch);
    } else {
      throw new Error(`unknown screen ${slip}`);
    }
    slip = await nextSlip(page, slip);
  }
  await page.getByTestId('ending').waitFor({ state: 'visible' });
  await checkLayout(page, `${profile.name} ending`);
  await page.screenshot({ path: `${SHOTS}${profile.name}-ending.png`, fullPage: true });
  await press(page, page.locator('[data-testid=ending-details] > summary'), touch);
  await checkLayout(page, `${profile.name} ending details`);
  await page.screenshot({ path: `${SHOTS}${profile.name}-ending-details.png`, fullPage: true });
  const label = await page.getByTestId('ending-label').getAttribute('data-label');
  if (!touch) {
    // share card: force the download path (no OS share sheet in a test) and check a PNG comes out
    await page.evaluate(() => { Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }); });
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('share').click()]);
    const file = `${SHOTS}${profile.name}-share-card.png`;
    await download.saveAs(file);
    if (download.suggestedFilename() !== 'life-receipt.png') throw new Error(`[${profile.name}] share card named ${download.suggestedFilename()}`);
  }
  const age = await page.locator('.ml-tape__age').textContent();
  await context.close();
  if (!age?.includes('65')) throw new Error(`[${profile.name}] ending reached at "${age}", expected 65`);
  if (errors.length) throw new Error(`[${profile.name}] console errors:\n${errors.join('\n')}`);
  return { profile: profile.name, cards, summaries, age, label };
}

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });
try {
  // E2E_ONLY=phone runs a single profile while debugging
  for (const p of PROFILES.filter((x) => !process.env.E2E_ONLY || x.name === process.env.E2E_ONLY)) console.log(JSON.stringify(await playProfile(browser, p)));
  console.log('E2E PASS');
} catch (e) {
  console.error('E2E FAIL', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
