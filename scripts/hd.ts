import { playLife } from '../src/engine/sim';
import { lifeStats } from '../src/engine/endings';
const bot = (process.argv[2] ?? 'tipChaser') as any;
for (let i = 1; i <= 6; i++) {
  const s = playLife(i, bot);
  const st = lifeStats(s, 1);
  const h40 = s.history.find((h) => h.age >= 40)!;
  console.log(i, 'hdYears', Math.round(st.highDebtYears), 'interest', Math.round(st.interest / 1e3) + 'k', 'cash@40', Math.round(h40.cash / 1e3) + 'k', 'hid@40', Math.round(h40.highInterestDebt / 1e3) + 'k', 'end debts', JSON.stringify(s.debts.map((d) => [d.kind, Math.round(d.balance), d.rate, Math.round(d.instalment)])));
}
