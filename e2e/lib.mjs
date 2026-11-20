// Shared helpers for the browser checks (overflow.mjs, camera.mjs). One browser at a time; always close it.
import { chromium } from '/Users/leo/csProj/jeng-map/node_modules/playwright/index.mjs';

export const BASE = process.env.ML_BASE ?? 'http://127.0.0.1:5198';
export const PHONES = [
  { name: 'phone390', viewport: { width: 390, height: 844 } },
  { name: 'phone360', viewport: { width: 360, height: 740 } },
  { name: 'phone430', viewport: { width: 430, height: 932 } },
].map((p) => ({ ...p, options: { viewport: p.viewport, deviceScaleFactor: 3, isMobile: true, hasTouch: true } }));
export const DESKTOPS = [
  { name: 'pc1280', viewport: { width: 1280, height: 800 } },
  { name: 'pc1440', viewport: { width: 1440, height: 900 } },
  { name: 'pc1366', viewport: { width: 1366, height: 768 } },
].map((p) => ({ ...p, options: { viewport: p.viewport } }));

export const launch = () => chromium.launch({ args: ['--use-angle=metal', '--enable-gpu'] });

export async function tap(page, locator, touch) {
  await locator.waitFor({ state: 'visible' });
  if (touch) await locator.tap(); else await locator.click();
}

/** Opens the game, starts a life and waits for the first decision (skipping the walk prompt). */
export async function startLife(page, { lang = 'en', seed = 4242, touch = false, query = '' } = {}) {
  await page.goto(`${BASE}/?seed=${seed}&lang=${lang}&debug=1${query}`);
  await tap(page, page.getByTestId('start-btn'), touch);
  await tap(page, page.getByTestId('begin-life'), touch);
  await waitCard(page, touch);
}

export async function waitCard(page, touch) {
  await page.locator('[data-testid^=choice-], [data-testid=walk-skip]').first().waitFor({ state: 'visible' });
  if (await page.getByTestId('walk-skip').isVisible()) await tap(page, page.getByTestId('walk-skip'), touch);
  await page.locator('[data-testid^=choice-]').first().waitFor({ state: 'visible' });
}

/** Finite animations (slip print, stamp, sheet slide) have ended, so measurements are not mid-flight. */
export async function settle(page) {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
    .map((a) => a.finished.catch(() => undefined))));
  await page.waitForTimeout(350);
}
