// Real touch on a phone (CDP touch events): the joystick walks the avatar on screen, and the sheet's panels scroll without moving the sheet.
// Usage: node e2e/touch.mjs. Needs the dev server (the ?debug=1 hook exposes the stage). Exits 1 on any failure.
import { PHONES, launch, settle, startLife, tap } from './lib.mjs';

const fails = [];
const expect = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails.push(what); };
const browser = await launch();
try {
  const context = await browser.newContext(PHONES[0].options);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const swipe = async (x, y0, y1) => {
    await touch('touchStart', x, y0);
    for (let i = 1; i <= 8; i++) { await touch('touchMove', x, y0 + ((y1 - y0) * i) / 8); await page.waitForTimeout(16); }
    await touch('touchEnd', x, y1);
    await page.waitForTimeout(300);
  };
  const snap = () => page.locator('main.ml-stage').getAttribute('data-snap');
  const scrollTop = (sel) => page.evaluate((s) => document.querySelector(s)?.scrollTop ?? -1, sel);

  // 1. joystick: walk until a card asks for a walk, then push the stick for a second and a half
  await page.goto(`${process.env.ML_BASE ?? 'http://127.0.0.1:5198'}/?seed=4242&lang=en&debug=1`);
  await tap(page, page.getByTestId('start-btn'), true);
  await tap(page, page.getByTestId('begin-life'), true);
  for (let i = 0; i < 40 && !(await page.getByTestId('walk-skip').isVisible()); i++) {
    await page.locator('[data-testid^=choice-], [data-testid=walk-skip]').first().waitFor({ state: 'visible' });
    if (await page.getByTestId('walk-skip').isVisible()) break;
    await tap(page, page.locator('[data-testid^=choice-]').first(), true);
    await tap(page, page.getByTestId('confirm'), true);
    await page.getByTestId('next').waitFor({ state: 'visible' });
    await tap(page, page.getByTestId('next'), true);
    await page.waitForTimeout(300);
    const summary = page.getByTestId('summary-next');
    if (await summary.isVisible()) await tap(page, summary, true);
  }
  await page.getByTestId('walk-skip').waitFor({ state: 'visible' });
  await page.waitForTimeout(1500);
  const where = () => page.evaluate(() => {
    const s = window.__mlStage, p = s.avatar().group.position.clone().project(s.camera().cam);
    return { x: s.avatar().group.position.x, z: s.avatar().group.position.z, sx: ((p.x + 1) / 2) * innerWidth, sy: ((1 - p.y) / 2) * innerHeight };
  });
  const before = await where();
  const joy = await page.locator('.ml-stage-joy').boundingBox();
  const cx = joy.x + joy.width / 2, cy = joy.y + joy.height / 2;
  await touch('touchStart', cx, cy);
  await touch('touchMove', cx + 40, cy - 30);
  await page.waitForTimeout(1500);
  const plate = await page.locator('.ml-flow-walk').boundingBox();
  const during = await where();
  await touch('touchEnd', cx, cy);
  const moved = Math.hypot(during.x - before.x, during.z - before.z);
  expect(moved > 1, `joystick walks the avatar (${moved.toFixed(1)} world units)`);
  expect(during.sy > 80 && during.sy < plate.y && during.sx > 0 && during.sx < 360 + 1, `avatar stays on screen above the walk plate (y ${Math.round(during.sy)} < ${Math.round(plate.y)})`);

  // 2. panels scroll by touch without moving the sheet: skip the walk, play to a result and a summary
  await tap(page, page.getByTestId('walk-skip'), true);
  let sawResult = false, sawSummary = false;
  for (let i = 0; i < 60 && !(sawResult && sawSummary); i++) {
    await page.locator('[data-testid^=choice-], [data-testid=walk-skip], [data-testid=next], [data-testid=summary-next]').first().waitFor({ state: 'visible' });
    if (await page.getByTestId('walk-skip').isVisible()) { await tap(page, page.getByTestId('walk-skip'), true); continue; }
    if (await page.getByTestId('summary-next').isVisible()) {
      await settle(page);
      const body = '.ml-receipt__body', max = await page.evaluate((s) => { const e = document.querySelector(s); return e.scrollHeight - e.clientHeight; }, body);
      if (!sawSummary && max > 20) {
        const r = await page.locator(body).boundingBox(), s0 = await snap();
        await swipe(r.x + r.width / 2, r.y + r.height - 80, r.y + 60);
        expect((await scrollTop(body)) > 0 && (await snap()) === s0, `summary scrolls by touch, sheet stays ${s0}`);
        sawSummary = true;
      }
      await tap(page, page.getByTestId('summary-next'), true);
    } else if (await page.getByTestId('next').isVisible()) {
      await settle(page);
      const max = await page.evaluate(() => { const e = document.querySelector('.ml-chat__thread'); return e.scrollHeight - e.clientHeight; });
      if (!sawResult && max > 20) {
        await page.evaluate(() => { document.querySelector('.ml-chat__thread').scrollTop = 0; });
        const r = await page.locator('.ml-chat__thread').boundingBox(), s0 = await snap();
        await swipe(r.x + r.width / 2, r.y + r.height - 40, r.y + 30);
        expect((await scrollTop('.ml-chat__thread')) > 0 && (await snap()) === s0, `result thread scrolls by touch, sheet stays ${s0}`);
        sawResult = true;
      }
      await tap(page, page.getByTestId('next'), true);
    } else {
      await tap(page, page.locator('[data-testid^=choice-]').first(), true);
      await tap(page, page.getByTestId('confirm'), true);
    }
    await page.waitForTimeout(250);
  }
  expect(sawResult, 'found a scrollable result thread');
  expect(sawSummary, 'found a scrollable summary');
  await context.close();
} finally {
  await browser.close();
}
console.log(fails.length ? `TOUCH FAIL: ${fails.length}` : 'TOUCH PASS');
process.exit(fails.length ? 1 : 0);
