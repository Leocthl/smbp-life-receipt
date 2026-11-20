import { playLife } from '../src/engine/sim';
const bot = (process.argv[2] ?? 'spender') as any; const seed = Number(process.argv[3] ?? 1);
const l = playLife(seed, bot);
console.log(l.character.familyTier, 'bankrupt', l.bankrupt);
for (const h of l.history) console.log([h.age, Math.round(h.cash/1e3)+'k', 'inc', Math.round(h.income/1e3), 'spend', Math.round(h.spending/1e3), 'hid', Math.round(h.highInterestDebt/1e3), 'nw', Math.round(h.netWorth/1e3), 'hap', h.happiness].join(' '));
console.log(l.decisionLog.map(d=>d.age+':'+d.eventId+':'+d.choiceId).join('  '));
console.log(JSON.stringify(l.expenses), l.salary, JSON.stringify(l.debts));
