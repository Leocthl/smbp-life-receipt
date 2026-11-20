import { BOT_IDS } from '../src/engine/bots';
import { lifeStats, metrics } from '../src/engine/endings';
import { playLife } from '../src/engine/sim';
const n = Number(process.argv[2] ?? 100);
const keys = ['save','invest','risky','spend','fun','debt','family','sell','hold','safe','lowRunway','highDebt','beatPlain','belowPlain','panicSells','bankrupt'] as const;
console.log('bot'.padEnd(10), keys.map(k => k.slice(0,6).padStart(7)).join(''));
for (const bot of BOT_IDS) {
  const acc: Record<string, number> = {};
  for (let i = 1; i <= n; i++) { const s = playLife(i, bot); const m = metrics(s, lifeStats(s)); for (const k of keys) acc[k] = (acc[k] ?? 0) + m[k] / n; }
  console.log(bot.padEnd(10), keys.map(k => acc[k].toFixed(2).padStart(7)).join(''));
}
