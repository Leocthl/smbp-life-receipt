import { playLife } from '../src/engine/sim';
const bot = (process.argv[2] ?? 'saver') as any;
const ages: Record<string, number> = {}; const ev: Record<string, number> = {};
let n = 0;
for (let i = 1; i <= 300; i++) {
  const l = playLife(i, bot);
  if (!l.bankrupt) continue;
  n++;
  const firstNeg = l.history.findIndex((x) => x.highInterestDebt > 0);
  const a = String(Math.floor(l.history[firstNeg]?.age ?? -1));
  ages[a] = (ages[a] ?? 0) + 1;
  for (const d of l.decisionLog.filter((d) => d.turn <= firstNeg)) ev[d.eventId + ':' + d.choiceId] = (ev[d.eventId + ':' + d.choiceId] ?? 0) + 1;
}
console.log(bot, 'bankrupt', n, 'first debt age', JSON.stringify(ages));
console.log(Object.entries(ev).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => k + '=' + v).join(' '));
