// Screenshot a page and refuse blank WebGL captures.
// Usage: node e2e/shot.mjs <url> <width> <height> <out.png> [waitMs=3000] [mobile=0]
import { chromium } from '/Users/leo/csProj/jeng-map/node_modules/playwright/index.mjs';

const [url, w, h, out, wait = '3000', mobile = '0'] = process.argv.slice(2);
if (!url || !out) { console.error('usage: shot.mjs url w h out [waitMs] [mobile]'); process.exit(2); }
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const isPhone = mobile === '1';
const context = await browser.newContext({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: isPhone ? 3 : 1, isMobile: isPhone, hasTouch: isPhone });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url);
await page.waitForFunction(() => document.title === 'ready' || document.querySelector('[data-ready]'), null, { timeout: 30000 });
await page.waitForTimeout(Number(wait)); // let a time-based animation reach a known state; this tool only takes pictures
const colours = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return 0;
  const probe = document.createElement('canvas'); probe.width = 64; probe.height = 64;
  const g = probe.getContext('2d'); g.drawImage(c, 0, 0, 64, 64);
  const d = g.getImageData(0, 0, 64, 64).data; const set = new Set();
  for (let i = 0; i < d.length; i += 4) set.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
  return set.size;
});
await page.screenshot({ path: out });
await browser.close();
console.log(JSON.stringify({ out, colours, errors }));
if (colours < 6) { console.error('BLANK: canvas has only', colours, 'colours'); process.exit(1); }
if (errors.length) process.exit(1);
