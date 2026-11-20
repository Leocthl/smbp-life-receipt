// Quick headless check: N lives per bot, net worth spread and bankruptcy rate.
import { BOT_IDS } from '../src/engine/bots';
import { netWorth } from '../src/engine/finance';
import { playLife } from '../src/engine/sim';
const n = Number(process.argv[2] ?? 200);
for (const bot of BOT_IDS) {
  const lives = Array.from({ length: n }, (_, i) => playLife(i + 1, bot));
  const nws = lives.map(netWorth).sort((a, b) => a - b);
  const q = (p: number) => (nws[Math.floor(p * (n - 1))] / 1e6).toFixed(2);
  const bk = lives.filter((l) => l.bankrupt).length / n;
  const hap = lives.reduce((a, l) => a + l.history.reduce((x, h) => x + h.happiness, 0) / l.history.length, 0) / n;
  const rel = lives.reduce((a, l) => a + l.history.reduce((x, h) => x + h.relationships, 0) / l.history.length, 0) / n;
  console.log(`${bot.padEnd(10)} p10=${q(0.1)}M med=${q(0.5)}M p90=${q(0.9)}M bankrupt=${(bk * 100).toFixed(1)}% happy=${hap.toFixed(1)} rel=${rel.toFixed(1)}`);
}
