// Which ending label does each bot land in? Every label must be reachable; each style should mostly get its own.
import { BOT_IDS } from '../src/engine/bots';
import { lifeStats, metrics, pickLabel } from '../src/engine/endings';
import { playLife } from '../src/engine/sim';
const n = Number(process.argv[2] ?? 200);
const seen = new Set<string>();
for (const bot of BOT_IDS) {
  const counts: Record<string, number> = {};
  for (let i = 1; i <= n; i++) {
    const s = playLife(i, bot);
    const id = pickLabel(metrics(s, lifeStats(s))).id;
    counts[id] = (counts[id] ?? 0) + 1;
    seen.add(id);
  }
  console.log(bot.padEnd(10), Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${Math.round((v / n) * 100)}%`).join(' '));
}
console.log('labels reached:', [...seen].sort().join(', '));
