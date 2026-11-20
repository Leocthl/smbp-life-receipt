# 人生收據 Life Receipt

A finance life-sim set in Hong Kong. You play one life from 18 (first year of uni) to 65, one decision card at a
time: tuition loans, 家用, first card, MPF fund, renting or buying, weddings, layoffs, scams, parents getting older.
At 65 the game prints your "life receipt": a behaviour label (none is better than another), what you said you
wanted compared with what you did, the moments that mattered with "what if" numbers, and the avoidable mistakes.

Educational only, not financial advice.

## Run it

```bash
npm install
npm run dev          # http://127.0.0.1:5198
```

- `?seed=123` replays the same life (same character, same market); `?lang=en` starts in English (default 粵語).
- Plays on phone first (390×844, touch) and on desktop.

| Command | What it does |
|---|---|
| `npm run typecheck` | TypeScript, strict |
| `npm test` | Vitest: engine, market rules, content rules, endings, money regressions |
| `npm run e2e` | Playwright: a full life 18→65→ending at desktop and phone size, no console errors; screenshots to `shots/` (dev server must be running) |
| `npm run balance` | 10,000 seeded lives per bot strategy → `BALANCE_REPORT.md` (fewer for a quick look: `npm run balance -- 500`, printed only) |
| `npm run cantonese-list` | Rebuilds the "Cantonese for Leo to check" list in `PROGRESS.md` |
| `npx tsx scripts/labels.ts 150` | Quick check of which ending label each bot lands in |

## How it is built

- `src/engine/`: pure TypeScript, no UI and no text. State in, new state out; nothing is mutated.
  - `rng.ts` seeded streams (market, events, outcomes, character, bots) so one choice never shifts the market.
  - `market.ts` the whole market path is generated from the seed up front (bull / normal / correction / crash /
    recovery), with protection rules: no crash within 2 years of your first investment, a crash is always followed by
    recovery, no crash in the last 2 years.
  - `turn.ts` income, MPF, salaries tax, costs, debts, market, delayed effects, happiness drift. 8 semester turns, then
    yearly turns.
  - `events.ts` card drawing, choices, outcomes, hidden traits (always revealed the first time they matter).
  - `endings.ts` labels, goal comparison, moments and counterfactuals, mistakes.
  - `bots.ts` + `sim.ts` headless players used by tests and the balance report.
- `src/data/`: every number lives here. `hkFacts.ts` has the Hong Kong figures with sources; anything not sourced is
  marked `ASSUMPTION` and listed in `PROGRESS.md`. `config.ts` holds game tuning; `endings.ts` holds the label weights.
- `src/data/events/`: the event deck (`early.ts` 18-25, `mid.ts` 25-35, `later.ts` 35-65, `recurring.ts`).
- `src/i18n/{zh,en}/`: all text. zh is Hong Kong Cantonese.
- `src/ui/`: React screens. One visual idea, a thermal receipt on a cha chaan teng table; all classes start with `ml-`.

## How to add an event

1. **Pick the file by age**: `src/data/events/early.ts` (18-25), `mid.ts` (25-35), `later.ts` (35-65) or
   `recurring.ts` (repeats or triggered by other cards). Add an object to the array:

   ```ts
   {
     id: 'gym_membership',              // unique, snake_case; also the text key prefix
     ageRange: [22, 40],
     category: 'daily',                 // daily | investing | career | health | family | friends | housing
     speaker: 'friend',                 // picks the vignette drawing (see src/ui/components/Vignette.tsx)
     weight: 1,                         // how likely it is drawn, relative to other eligible events
     cooldown: 6,                       // turns before it can appear again
     // once: true                       // at most once per life
     // triggeredOnly: true              // never drawn at random; only appears when another card's `delayed` sends it
     conditions: { stat: 'cash', op: '>', value: 20_000 },   // optional: when the card can appear at all
     choices: [                          // 2 to 4 choices
       { id: 'year', tags: ['spend'], effects: { cash: -6_000, happiness: 3 },
         hidden: { expense: { lifestyle: 300 } } },          // fine print: only high literacy sees the hint
       { id: 'park', tags: ['save', 'safe'], effects: { happiness: 1 } },
       { id: 'trial', tags: ['spend', 'fun'], requires: { stat: 'cash', op: '>', value: 1_000 },
         outcomes: [                                          // one is picked by weight
           { id: 'keeps_going', weight: 1, effects: { happiness: 4 } },
           { id: 'gives_up', weight: 2, effects: { cash: -800 } },
         ] },
     ],
   },
   ```

   - **Tags** say what kind of choice it is (`save invest risky spend safe debt family career sell hold fun status insure
     work`). Bots choose by tags and ending labels count them, so tag honestly.
   - **Effects** can move cash, happiness, relationships, invest or sell, borrow or repay, change salary, side income,
     monthly expenses, flags, MPF fund, insurance or buy a flat. Amounts can be fixed or scaled, e.g.
     `{ of: 'monthlyIncome', x: -1.5, min: 20_000, max: 60_000 }`.
   - **delayed** brings a consequence or a follow-up card back later: `delayed: [{ afterTurns: 3, eventId: 'card_bill' }]`.
   - **counterfactual** records the road not taken for the ending, e.g.
     `counterfactual: { actual: 'spent', alt: 'index', amount: 6_000, key: 'gym' }`, then add `cf.gym` text in
     `src/i18n/*/endings.ts`.
   - **Hidden traits**: if `conditions` read a hidden trait (temperament, chronic illness, literacy...), set
     `reveals` so the player is told; or use `traitHooks` on a choice. The content test enforces this.
   - Every choice must make sense for somebody: avoid an option that is better on every axis. The balance report works
     at the level of whole play styles, so it won't catch a single lopsided choice; check by reading the effects.

2. **Write the text** in both `src/i18n/zh/events-<file>.ts` and `src/i18n/en/events-<file>.ts`:

   ```ts
   'ev.gym_membership.text': '朋友叫你一齊報健身室，年費六千。',
   'ev.gym_membership.year': '報一年',
   'ev.gym_membership.year.why': '有人陪會易啲堅持，但每月仲有啲雜費。',
   'ev.gym_membership.park': '去公園跑步算',
   'ev.gym_membership.park.why': '免費，靠自己自律。',
   'ev.gym_membership.trial': '試一個月先',
   'ev.gym_membership.trial.why': '細啲錢試水溫。',
   'ev.gym_membership.trial.keeps_going': '你真係去開，仲識咗新朋友。',
   'ev.gym_membership.trial.gives_up': '去咗兩次，之後冇再去。',
   ```

   Keys (the validator requires each one that applies):
   - `ev.<id>.text`, plus `.textLow` if the event has `jargon: true`;
   - `ev.<id>.<choice>` and `ev.<id>.<choice>.why` for every choice;
   - `ev.<id>.<choice>.<outcome>` for every outcome;
   - `ev.<id>.<choice>.hint` when the choice has `literacyHint`;
   - `ev.<id>.<choice>.fine` when the choice has `hidden` effects (the fine print, shown to high literacy). For the
     example above that means `'ev.gym_membership.year.fine': '年費之外，每月仲有毛巾同儲物櫃雜費。'`.

   Template variables: `{cash} {salary} {cardDebt} {age} {rent}`. zh is casual Hong Kong
   Cantonese; no brand names.

3. **Check it**: `npm test` runs the content validator (2-4 choices, unique ids, every key in zh and en, no stray keys,
   hidden-trait rules, triggered ids exist). Then `npm run balance -- 500` to see it doesn't create a dominant strategy,
   and `npm run cantonese-list` so the new zh lines are queued for review. (A balance run below 10,000 lives prints
   to the terminal and leaves `BALANCE_REPORT.md` alone; pass a path as the second argument to save it.)

## How to add an ending label

Add `{ id, weights }` to `LABELS` in `src/data/endings.ts` (weights over the behaviour metrics listed there), add
`label.<id>` and `label.<id>.desc` in both `src/i18n/*/endings.ts`, then run `npx tsx scripts/labels.ts 150` and
`npm run balance`: every label must stay reachable and each bot style should mostly land in its own.
