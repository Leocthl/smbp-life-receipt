// Phone emulation: the camera must be perfectly still while nothing moves, also while the URL bar "resizes" the viewport.
// Usage: node e2e/camera.mjs [baseUrl]. Needs the dev server (the ?debug=1 hook exposes the stage). Exits 1 on any idle movement.
import { PHONES, launch, startLife } from './lib.mjs';

const IDLE_MS = 3000;
const browser = await launch();
let failed = false;
try {
  const context = await browser.newContext(PHONES[0].options);
  const page = await context.newPage();
  await startLife(page, { touch: true });
  await page.waitForTimeout(2500); // the framing tween has arrived
  const sample = (ms) => page.evaluate((ms) => new Promise((done) => {
    const c = window.__mlStage.camera(), log = [], t0 = performance.now();
    const frame = () => {
      log.push([c.cam.position.x, c.cam.position.y, c.cam.position.z, c.state.viewHeight, c.cam.top, c.cam.left].map((v) => +v.toFixed(5)).join());
      if (performance.now() - t0 < ms) requestAnimationFrame(frame); else done(log);
    };
    requestAnimationFrame(frame);
  }), ms);
  const moves = (log) => log.filter((v, i) => i > 0 && v !== log[i - 1]).length;

  const idle = await sample(IDLE_MS);
  console.log(`idle ${IDLE_MS}ms: ${idle.length} frames, ${moves(idle)} camera moves`);
  if (moves(idle) > 0) failed = true;

  // the URL bar sliding in and out: the viewport height changes 844 -> 780 -> 844; afterwards the camera must settle and stay put
  for (const h of [780, 844, 780, 844]) { await page.setViewportSize({ width: 390, height: h }); await page.waitForTimeout(200); }
  await page.waitForTimeout(2000);
  const after = await sample(IDLE_MS);
  console.log(`after resize: ${after.length} frames, ${moves(after)} camera moves`);
  if (moves(after) > 0) failed = true;

  // dragging the sheet re-centres the room smoothly, then it settles again
  const handle = page.getByTestId('sheet-handle');
  for (let i = 0; i < 2; i++) { await handle.tap(); await page.waitForTimeout(1500); }
  const settled = await sample(IDLE_MS);
  console.log(`after sheet change: ${settled.length} frames, ${moves(settled)} camera moves`);
  if (moves(settled) > 0) failed = true;
  await context.close();
} finally {
  await browser.close();
}
console.log(failed ? 'CAMERA FAIL: it moved while idle' : 'CAMERA PASS: perfectly still when idle');
process.exit(failed ? 1 : 0);
