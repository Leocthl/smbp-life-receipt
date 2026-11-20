import { ALL_EVENTS } from '../src/data/events';
import { botChoose, type BotId } from '../src/engine/bots';
import { drawCards, resolveChoice } from '../src/engine/events';
import { monthlyExpense, monthlyIncome } from '../src/engine/finance';
import { newGame } from '../src/engine/sim';
import { endTurn } from '../src/engine/turn';
import { makeRng, streamSeed } from '../src/engine/rng';
const bot = (process.argv[2] ?? 'balanced') as BotId;
const rows: string[] = [];
const ages: Record<string, number> = {};
for (let seed = 1; seed <= 200; seed++) {
  let s = newGame(seed);
  const rng = makeRng(streamSeed(seed, 'bot:' + bot));
  const recent: string[] = [];
  while (!s.done) {
    const { state, cards } = drawCards(s, ALL_EVENTS); s = state;
    for (const c of cards) {
      const ev = ALL_EVENTS.find((e) => e.id === c.eventId)!;
      const id = botChoose(s, ev, bot, rng);
      s = resolveChoice(s, ALL_EVENTS, ev.id, id).state;
      recent.push(ev.id + ':' + id); if (recent.length > 4) recent.shift();
    }
    const pre = { job: s.job, sal: s.salary, net: Math.round(monthlyIncome(s) - monthlyExpense(s)), exp: Object.values(s.expenses).map(Math.round).join('/') , debts: s.debts.map(d => d.kind[0] + Math.round(d.balance/1e3)).join(',') };
    const r = endTurn(s); s = r.state;
    if (r.summary.notices.includes('bankrupt')) {
      const band = Math.floor(r.summary.age / 10) * 10 + 's';
      ages[band] = (ages[band] ?? 0) + 1;
      if (rows.length < 12) rows.push(`seed ${seed} age ${r.summary.age} ${JSON.stringify(pre)} ${recent.join(' ')}`);
      break;
    }
  }
}
console.log(ages); console.log(rows.join('\n'));
