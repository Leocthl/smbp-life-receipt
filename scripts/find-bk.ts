import { playLife } from '../src/engine/sim';
const bot = (process.argv[2] ?? 'saver') as any;
for (let i = 1; i <= 300; i++) {
  const l = playLife(i, bot);
  if (!l.bankrupt) continue;
  const k = l.history.findIndex((x) => x.highInterestDebt > 0);
  if (l.history[k].age < 50) continue;
  console.log('seed', i, l.character.familyTier, 'salary', l.salary, JSON.stringify(l.expenses, (_, v) => typeof v === 'number' ? Math.round(v) : v));
  for (const h of l.history.slice(k - 6, k + 3)) console.log([h.age, Math.round(h.cash / 1e3), 'inc', Math.round(h.income / 1e3), 'sp', Math.round(h.spending / 1e3), 'hid', Math.round(h.highInterestDebt / 1e3), 'nw', Math.round(h.netWorth / 1e3)].join(' '));
  console.log(l.decisionLog.filter((d) => d.age >= 40).map((d) => d.age + ':' + d.eventId + ':' + d.choiceId).join(' '));
  console.log(JSON.stringify(l.debts));
  break;
}
