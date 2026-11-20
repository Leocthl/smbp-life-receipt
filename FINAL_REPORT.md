# money-life: final report

## How to run
`npm install && npm run dev`, then open http://127.0.0.1:5198 (the dev server is running there now). `?seed=123` replays a life, `?lang=en` for English.
Checks: `npm run typecheck`, `npm test` (44 passing), `npm run e2e` (needs the dev server), `npm run balance` (10,000 lives per bot).

## Screenshots (shots/)
- Card: shots/desktop-card.png, shots/phone-card.png
- Year-end summary: shots/desktop-summary.png, shots/phone-summary.png
- Ending: shots/desktop-ending.png, shots/phone-ending.png (+ -ending-details.png with the breakdown open)
- English versions of all of the above: shots/en/
- Share card PNG: shots/desktop-share-card.png

## Balance in 3 lines
- 10,000 seeded lives per bot × 8 styles: no dominant strategy (indexer richest, spender happiest/closest, saver safest).
- All 9 ending labels reachable; all 8 styles land mostly in their own label (54.8% balanced to 100% saver).
- Spending styles are happiest but poorest and bankrupt 57-64% of the time; reported honestly in BALANCE_REPORT.md.

## Cantonese to check
608 zh lines listed in PROGRESS.md under "Cantonese for Leo to check", with a "look at these first" list
(code-switching words, two label names I added, the ending sentences, the Sonnet-drafted mid/later events).

## Assumptions
Listed in PROGRESS.md "Assumptions": personal-loan APR 12%, living costs, rents, 家用 levels, starting cash, deposit
return, insurance surrender schedule, 4% purchase costs, pay rises and lifestyle creep, student-scheme living loans capped
at HK$70k/yr, 4-year bankruptcy period, card restructuring, automatic belt-tightening, MPF thresholds kept at 7,100/30,000.

## Unfinished or unchecked
- Cantonese not reviewed by a native speaker; mid/later event text drafted by a Sonnet subagent and only partly reviewed.
- HK figures cited in src/data/hkFacts.ts were checked from web sources during the build; numbers marked ASSUMPTION were not.
- The "plain plan" comparison is one balanced-bot life on the same seed, so close 高風險贏家 / 過山車人生 calls can flip.
- Not fixed from reviews (LOW): 家用 raise from `jiayong.more` resets at graduation; delayed events land one turn late;
  annuity pays only until 65; mortgage refinancing modelled via lifestyle spending.
- The phone share-sheet path is untested: the e2e covers the desktop download only. On a real phone `navigator.share`
  runs after an awaited canvas draw, which some browsers may refuse as outside the tap; it then shows "take a
  screenshot instead".
- While bankrupt, any shortfall past a HK$120k cap is simply forgiven for a happiness cost (a simplification).
- E2E plays one seed (4242) with rotating choices at two sizes, in both zh and en (`E2E_LANG=en`, shots in shots/en/); keyboard-only play and reduced-motion were not
  automated (motion is under 300ms and reduced-motion CSS is in place).
- No git commit, push or deploy (not asked). Dev server left running on 5198; 5196 untouched.
