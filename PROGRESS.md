# PROGRESS — 人生收據 Life Receipt (money-life)

Finance life-sim for HK university students. SPEC.md is the contract; BRIEF.md adds the Orca brief.
Dev server: **http://127.0.0.1:5198**. Port 5196 is held by another project, so the coordinator assigned 5198.

## Plan (written before code)

### File structure
```
src/
  engine/            pure TypeScript, no UI, no text — runs headless
    types.ts         state, character, event DSL, outputs
    rng.ts           mulberry32, separate streams (market / event / outcome)
    market.ts        regime path pre-generated per seed + protection rules + price levels
    finance.ts       MPF, salaries tax, net worth, runway, amounts
    conditions.ts    declarative condition evaluator
    effects.ts       apply effect DSL to a cloned draft
    state.ts         new game, copy-on-write clone
    turn.ts          end-of-turn loop (income, costs, debts, market, delayed, drift)
    character.ts     character generation (Phase 2)
    events.ts        draw + resolve events (Phase 2)
    bots.ts / sim.ts headless bots and simulator
    endings.ts       labels, goal comparison, counterfactuals, mistakes (Phase 4)
  data/              all content and numbers (cited)
    hkFacts.ts config.ts market.ts traits.ts endings.ts events/*.ts
  i18n/              zh (default, casual Cantonese) + en
  ui/                React screens and vignettes
scripts/             balance.ts, cantonese-list.ts
tests/               vitest unit tests
e2e/                 Playwright full-life run + screenshots
```

### Key types (src/engine/types.ts)
- **GameState**: seed, turn, age, cash, happiness, relationships, job, salary, expenses, holdings by asset,
  mpfFund, insurance plan, debts[], flags[], revealed traits, cooldowns, pending delayed effects, queue,
  decisionLog[], history[], market (pre-generated regimes + realised price levels), rng stream states.
- **Character**: familyTier, 家用 per month, familyDebt, parentHelp, siblingsToSupport, gpa/standing, talents;
  hidden: temperament, chronic, familyHistory, fragileMind, literacy, hidden talents.
- **GameEvent**: id, ageRange, category, speaker, conditions, weight(+mods), cooldown, once, triggeredOnly,
  reveals (hidden trait), jargon, choices[2-4].
- **Choice**: id, tags (behaviour, used by bots and labels), requires, effects, hidden (fine print),
  outcomes (weighted, state-dependent), delayed, counterfactual, literacyHint, traitHooks.
- Text never lives in the engine: keys are `ev.<id>.text`, `ev.<id>.<choice>`, `.why`, `.<outcome>`.

## Phase 1 — setup, types, RNG, market, turn loop, headless sim ✅
- Vite + React + TS + Vitest; `npm run dev` serves on 127.0.0.1:5198 with strictPort.
- Seeded mulberry32 with separate streams, so the market path never depends on choices.
- Market: 5 regimes with a Markov chain; per-asset regime means + log-normal noise; fees; inflation.
  Rules: no crash within 2 years of the first voluntary investment (index/bond/stock/crypto; MPF does not count, fixed after review), a crash is always followed by recovery,
  no crash in the last 2 years, never 3 crash years in a row.
- Turn loop: semesters (8) then years (43); income, MPF 5%+5% with floor/cap, salaries tax, tuition,
  costs, insurance premiums, debt interest/instalments, card auto-repay, auto-borrow, bankruptcy,
  delayed effects, happiness drift, inflation, raises with lifestyle creep, graduation, MPF lump sum at 65.
- Headless: `runLife(seed)`; `npx tsx scripts/quick-sim.ts 300`.
- Tests: 14 passing (rng, market protection rules, realistic index CAGR, MPF/tax, purity, full life).
- Unfinished: events, characters, bots (Phase 2+). With no events, a life ends around HK$10M nominal —
  events (rent, family, weddings, fun) are meant to bring this down; tuned in Phase 5.

## Phase 2 — characters + event engine + seed events ✅
- `generateCharacter(seed)`: family tier, 家用, family debt, parents' help, siblings, GPA/standing, visible talent;
  hidden temperament, chronic illness, family history, fragile mental health, financial literacy, hidden talents.
- Event engine (`src/engine/events.ts`): eligibility (age, cooldown, once, conditions), weights with modifiers,
  queue for triggered events, 0-2 cards per turn by age band (dense 18-35, sparse after 35),
  choices with requirements, certain effects, fine print, trait hooks, weighted outcomes, delayed effects, counterfactual log.
- Hidden traits are never applied silently: trait hooks and `reveals` emit a reveal the first time, and only for traits
  the character really has; literacy is revealed on the first jargon card.
- Content: 17 seed events for 18-25 + 6 recurring/triggered (`early.ts`, `recurring.ts`, written by me);
  15 events for 25-35 and 10 for 35-65 (`mid.ts`, `later.ts`, written by a Sonnet subagent, reviewed and patched).
- `validateContent`: 2-4 choices, unique ids, triggered ids exist, hidden-trait rules, every text key in zh and en, no stray keys, known template vars.
- Bots (8 strategies) and `playLife(seed, bot)`; `npx tsx scripts/quick-sim.ts 300` prints per-bot spread.
- Engine fixes found by the sims: students on loan schemes borrow living costs from the scheme; liquid holdings are drawn
  down before any borrowing; bankruptcy sells liquid assets first; pay cuts shrink everyday spending; early retirement
  gated on liquid wealth (MPF is locked till 65); a `budget_check` card offers a way out of card debt.
- Tests: 27 passing.
- Unfinished: balance (spender/debtor/tip bots go bankrupt 70-90% of the time; net worth spread untuned) → Phase 5.

## Phase 3 — playable UI ✅
- Thermal-receipt look on a cha chaan teng green table: each screen is a slip that prints in (260ms), a red stamp lands
  on results (220ms), a yellow highlighter marks the key line. One visual identity across all cards.
- Screens: start → character intro → decision card → result → year-end summary (portfolio only shown here) → ending.
- Decision cards: two-step select then confirm (no accidental taps on phone); every card has an SVG vignette for its
  speaker (12 speakers) whose props react to the highlighted choice's tags and again when picked.
- Hints by literacy: low literacy sees the plain text variant of jargon cards; fine print only for high literacy.
- Language toggle zh/en (one language per screen), `?seed=` and `?lang=` URL params, buttons at least 44px,
  ease-out motion under 300ms, `prefers-reduced-motion` respected, `ml-` class prefix throughout.
- Playwright run (`npm run e2e`): 18→65→ending at 1280×900 and 390×844 (touch), waits on elements only,
  checks sideways scroll, button size and content overflow, fails on any console error. Screenshots in `shots/`.
- Sonnet code review (20 findings). Fixed all HIGH and MEDIUM:
  - crash protection now keyed to the first voluntary investment, not the first MPF payslip;
  - each instalment loan is its own tranche (a top-up no longer re-amortises a car loan at 12% over 3 years);
  - student part-time pay stops at graduation; only a side business (`hustle`) carries on;
  - dominant income choices: paying your own tuition now costs grades; the evening job in `budget_check` lasts 2 years;
  - bankruptcy has a 4-year period with no new card credit and no second wipe;
  - the year-end receipt reconciles (cash change counted from the start of the year, plus an "other" line);
  - student-scheme living-cost borrowing is capped per year and shown as a notice;
  - choices gated on spendable cash, not runway; wedding banquet and home purchase gated on real affordability;
  - bond fund now reachable (`retirement_income.bonds`); `resolveChoice` rejects unavailable choices;
  - keyboard focus ring visible on paper and highlight; focus and scroll reset on each new slip; choice buttons use
    `aria-pressed` instead of half-built radio semantics; result shows changes to the monthly budget.
  - Also fixed: insurance premium counted in monthly costs; `localStorage` guarded; tape `aria-label` translated; nudge
    animation no longer loops.
- Engine fixes found while balancing after the review: auto-borrowing is a revolving 12% overdraft (fixed instalments made
  each year's gap bigger), card debt above the limit is rolled into a 5-year loan, households cut back automatically
  when costs outrun income with no cushion (costs happiness), `budget_check` also appears on a running monthly deficit,
  家用 no longer inflates by itself, the card bill comes back if you only pay the minimum.
- Not fixed (LOW): `jiayong.more` resets at graduation; mortgage refi modelled through lifestyle spending;
  delayed events land one turn later than `afterTurns`; the annuity stops paying at 65 because the game ends there.

## Phase 4 — endings ✅
- At 65 the player is asked what mattered most (security / freedom / experiences / family / status); the ending reflects
  that against the record (`compareGoal`), never as a verdict.
- Labels are config-driven (`src/data/endings.ts`): weighted behaviour metrics, highest score wins. Nine labels, none
  ranked: 佛系儲蓄王, 月光族, 穩健型, 高風險贏家, 過山車人生, 佛系投資者, 負債周轉型, 見紅就走型, 家庭支柱.
- Moments that mattered: up to 6 decisions, ranked by size, shown in life order; counterfactuals are computed from the
  real market path ("holding would be worth $X more today"); the short view shows the top 3 and names the choice.
- Avoidable mistakes listed separately (no cushion, long high-interest debt, fees, early surrender, selling in a drop,
  phone scam), with a note that they are not a verdict on the life.
- "What was possible": the same seed and character played by the balanced bot.
- Short shareable receipt by default (label, net worth, goal line, 3 moments, share / play again); a fold-out with the
  plain-plan comparison, averages, net worth chart, all moments, mistakes and traits discovered. Disclaimer on every ending.
- Label check (150 lives per bot, `npx tsx scripts/labels.ts 150`): saver→佛系儲蓄王 100%, indexer→佛系投資者 82%,
  tipChaser→高風險贏家/過山車 96%, debtor→負債周轉型 79%, family→家庭支柱 63%, balanced→穩健型 55%,
  panic→見紅就走型 43%, spender→月光族 45% / 負債周轉型 54%. All nine labels reachable.
- (The label shares above are from before the final tuning; final figures are in Phase 5 and `BALANCE_REPORT.md`.)
- Tests: 40 passing at this point (endings: label spread, reachability, text keys, counterfactual maths, goal, mistakes; money
  regression tests for the review fixes). E2E passes at both sizes.

## Phase 5 — polish, share card, balance, README ✅
- Shareable result card: "Share result" draws a 1080×1350 receipt PNG (label, net worth, goal line, disclaimer) on a
  canvas (`src/ui/shareCard.ts`); phones get the system share sheet with the image, desktops download it. The e2e run
  presses it and checks the PNG downloads (`shots/desktop-share-card.png`).
- i18n: every new string in zh and en; `scripts/scan-i18n.ts` flags mixed-language strings. The only English words left
  in zh are everyday HK code-switching (offer, claim, group chat, HR, freelance), listed for Leo below.
- Balance (`npm run balance`, 10,000 lives per bot, `BALANCE_REPORT.md`): no dominant strategy; every label reachable;
  all 8 bots land mostly in their own label (lowest: balanced 54.8%). Report includes per-outcome margins and an honest
  reading (spending styles are happiest but poorest and most often bankrupt).
- README: how to run, how it is built, how to add an event (example checked against the real validator) and a label.
- Final Sonnet review (14 findings). Fixed all HIGH and MEDIUM:
  - "fees" mistake now counts only avoidable fees (trading, fund fees above an index fund), not MPF or stamp duty;
  - the year-end receipt adds up: fees and interest are shown as "not cash" lines under the total;
  - a sell before a further fall is told as money saved, never "worth -$X more"; only costly sells count as a mistake;
  - no unlimited borrowing while bankrupt (small cap, then you go without, with a happiness cost);
  - README key list (`.fine`, `.hint`, `triggeredOnly`) fixed; small balance runs no longer overwrite the report;
  - dominance report shows margins and flags labels under 50%; label tests tightened (100 lives, >50% for most styles);
  - instalment loans charge interest on the average balance, so a 3-year loan clears in 3 years.
  - LOW fixed: looping nudge removed (all motion under 300ms), share download URL revoked later, no regex lookbehind
    (old iOS), details no longer repeat the top 3 moments, "top monthly income" wording, dead constant.
  - LOW not fixed: the plain-plan comparison is one balanced-bot life on the same seed (its events differ from the
    player's), so the 高風險贏家 / 過山車人生 split can flip when the two are close.
- Tests: 44 passing. E2E passes at 1280×900 and 390×844 with no console errors.

## Assumptions
- Port 5198 instead of 5196 (coordinator decision).
- Numbers marked ASSUMPTION in `src/data/hkFacts.ts` and `src/data/market.ts`: personal-loan APR 12%,
  part-time HK$6,000/month, student living HK$3,000, worker living HK$6,000, room/studio rent,
  average time-deposit return 2.5%, insurance surrender schedule, 家用 levels, starting cash by tier,
  property costs 4% on purchase (stamp duty, legal, agent), real pay rises 1-2.5%, 25% lifestyle creep, HK property regime returns.
- Engine assumptions (in `src/data/config.ts`): TSFS/NLS also lend for living costs, capped at HK$70,000 per study year;
  bankrupts get no new card credit for 4 years; card debt above the limit is rolled into a 5-year personal loan;
  auto-borrowing beyond the card is a revolving 12% loan; households cut lifestyle by half and daily costs by 15% a year
  while costs outrun income with no cushion; early retirement trims daily costs by a fifth; 家用 stays at its nominal level
  unless an event changes it; an evening job lasts about 2 years; paying your own tuition by working costs ~5% starting pay;
  while bankrupt, borrowing is capped at HK$120,000 and any shortfall beyond that is "gone without" (forgiven, at a
  happiness cost) rather than tracked as debt.
- MPF income thresholds kept at HK$7,100 / HK$30,000: the 2026 review (HK$10,500 / HK$40,000) was a proposal, not adopted, as of Nov 2026.
- Salaries tax ignores the standard-rate cap and the 2nd tier above HK$5M (irrelevant for this game's incomes).
- Money is nominal HK$; inflation runs ~2%/yr.

## Cantonese for Leo to check

Look at these first:
- English words kept as everyday HK code-switching: offer (`ev.internship.text`, `ev.headhunter.counter`,
  `ev.layoff.any`), claim (`ev.medical_bill.insured`, `ev.medical_insurance.text`), Group chat (`ev.japan_trip.text`),
  HR (`ev.mpf_choice.text`), freelance (`trait.freelancing`, `ev.side_hustle.gigs`). Swap for Chinese if they feel off.
- Label names: 見紅就走型 and 過山車人生 are mine (the brief's list did not include them); 負債周轉型 and the rest are from the brief.
- Ending lines: `goal.*`, `cf.*`, `mistake.*`, `moment.*` (they mix numbers into sentences; check the flow).
- Event texts in `events-mid` and `events-later` were drafted by a Sonnet subagent and only partly reviewed by me.

<!-- cantonese:start -->
608 lines, all written by the builder and not yet checked by Leo.

- `app.title` — 人生收據
- `app.tagline` — 由 18 歲到 65 歲，每個決定都係一張單。
- `app.disclaimer` — 只供教育用途，唔係理財建議。
- `app.lang` — English
- `start.new` — 開始新人生
- `start.seed` — 人生編號 {seed}
- `intro.title` — 出世紙（理財版）
- `intro.family` — 家境
- `intro.tier.low` — 基層
- `intro.tier.middle` — 中產
- `intro.tier.high` — 富裕
- `intro.allowance` — 每月家用
- `intro.familyDebt` — 屋企欠債
- `intro.parentHelp` — 屋企每月資助
- `intro.siblings` — 要幫手養嘅兄弟姊妹
- `intro.gpa` — GPA
- `intro.talent` — 明顯嘅才能
- `intro.hidden` — 性格、健康、理財知識：要慢慢先知
- `intro.cash` — 銀包
- `intro.go` — 入大學
- `talent.tutoring` — 識補習
- `talent.design` — 識設計
- `talent.coding` — 識寫程式
- `talent.sports` — 運動好
- `talent.music` — 識音樂
- `none` — 冇
- `stat.cash` — 現金
- `stat.runway` — 可撐
- `stat.runway.unit` — {n} 個月
- `stat.happiness` — 開心
- `stat.relationships` — 人際
- `stat.age` — {age} 歲
- `stat.portfolio` — 投資
- `term.sem` — {age} 歲，第 {n} 學期
- `term.year` — {age} 歲
- `card.pick` — 揀呢個
- `card.choose` — 揀一個
- `card.reveal` — 你發現咗：
- `card.hint` — 細字提示
- `result.next` — 下一步
- `result.cash` — 現金
- `result.happiness` — 開心
- `result.relationships` — 人際
- `result.stamp` — 已決定
- `result.nothing` — 冇即時變化
- `result.monthly` — 每月收支
- `perMonth` — ／月
- `speaker.friend` — 朋友
- `speaker.agent` — 經紀
- `speaker.landlord` — 業主
- `speaker.headline` — 新聞
- `speaker.boss` — 老闆
- `speaker.doctor` — 醫生
- `speaker.parent` — 屋企人
- `speaker.bank` — 銀行
- `speaker.self` — 你自己
- `speaker.partner` — 另一半
- `speaker.phone` — 手機
- `speaker.campus` — 學校
- `summary.title` — {age} 歲年結
- `summary.income` — 收入（扣稅同強積金後）
- `summary.spending` — 開支
- `summary.fees` — 收費（喺投資入面扣，唔計現金）
- `summary.interest` — 利息（加落債度，唔計現金）
- `summary.cashChange` — 現金變化
- `summary.other` — 其他（決定、還債、投資）
- `summary.portfolio` — 資產
- `summary.debts` — 債務
- `summary.noDebt` — 冇債
- `summary.market` — 市況：{regime}
- `summary.next` — 過咗呢年
- `regime.bull` — 牛市，乜都升
- `regime.normal` — 平穩，市場慢慢行
- `regime.correction` — 調整，跌咗一截
- `regime.crash` — 股災，好多人蝕到喊
- `regime.recovery` — 反彈，慢慢升返
- `asset.savings` — 定期存款
- `asset.index` — 指數基金
- `asset.bond` — 債券基金
- `asset.stock` — 個別股票
- `asset.crypto` — 加密貨幣
- `asset.mpf` — 強積金
- `asset.insurance` — 儲蓄保（退保價值）
- `asset.property` — 物業
- `debt.studentLoan` — 學生貸款
- `debt.creditCard` — 信用卡
- `debt.personalLoan` — 私人貸款
- `debt.mortgage` — 按揭
- `notice.auto_borrow` — 現金唔夠，自動碌咗卡或借咗錢。
- `notice.bankrupt` — 債務太多，申請咗破產。卡冇咗，生活要重新嚟過。
- `notice.mpf_withdrawn` — 65 歲，強積金一筆過攞返。
- `notice.forced_sale` — 現金唔夠，賣咗部分投資頂住。
- `notice.cannot_afford_property` — 首期唔夠，買唔成。
- `notice.no_cash_to_invest` — 冇閒錢，投資唔到。
- `notice.delayed` — 之前嘅決定，今年有後果。
- `notice.card_restructure` — 卡數爆咗額，銀行將超出嘅部分轉做分期私人貸款。
- `notice.went_without` — 破產期間借唔到錢，唔夠嘅部分你只能慳、唔使。
- `notice.belt_tighten` — 入唔敷支又冇積蓄，你被逼慳啲：消遣同日常開支都減咗。
- `notice.scheme_borrow` — 錢唔夠使，差額由學生貸款補上，畢業後要還。
- `tape.label` — 你嘅狀況
- `trait.impulsive` — 原來你係衝動型消費者：見到就想買。
- `trait.lossAnxious` — 你見個市一跌就手震。原來你好怕蝕。
- `trait.fomo` — 見人哋賺錢你就坐唔定。你好怕錯過。
- `trait.steady` — 跌市你都冇乜感覺。你係淡定型。
- `trait.chronic` — 原來你有長期病，要長期睇醫生。
- `trait.familyHistory` — 原來屋企有遺傳病史，要留意身體。
- `trait.fragileMind` — 壓力大嘅時候，你情緒好易受影響。
- `trait.low` — 啲理財術語你睇唔明。條款細字會比較難捉。
- `trait.medium` — 你睇得明大部分理財條款。
- `trait.high` — 你好識睇條款細字，啲伏你一眼睇穿。
- `trait.freelancing` — 原來你好識自己搵客，做 freelance 有天份。
- `trait.negotiation` — 原來你好識講價。
- `trait.networking` — 原來你人脈好廣，機會會自己搵上門。
- `ending.placeholder` — 65 歲，張收據印完喇。
- `ending.netWorth` — 最後身家
- `ending.again` — 再嚟一次
- `goalq.title` — 65 歲喇。回頭望，你最想要嘅係乜？
- `goalq.security` — 安全感：唔使為錢擔心
- `goalq.freedom` — 自由：唔使睇人面色
- `goalq.experiences` — 經歷：去過、玩過、試過
- `goalq.family` — 屋企人：照顧到身邊人
- `goalq.status` — 地位：有樓、有職位
- `goalq.go` — 印出收據
- `goal.security.hit` — 你想要安全感。你平均有 {runway} 個月嘅存糧，好少要為下個月擔心。
- `goal.security.miss` — 你想要安全感，但有 {n} 年你嘅存糧撐唔到一個月。
- `goal.freedom.early` — 你想要自由。你 {age} 歲就唔使再返工。
- `goal.freedom.hit` — 你想要自由。你大部分日子都冇背住高息債。
- `goal.freedom.miss` — 你想要自由，但有 {n} 年你背住高息債。
- `goal.experiences.hit` — 你想要經歷。你畀咗自己 {n} 次真正去玩，記憶好多。
- `goal.experiences.miss` — 你想要經歷，但成世得 {n} 次真正放縱自己。
- `goal.family.hit` — 你想照顧屋企人。你為佢哋做咗 {n} 次決定，關係一直唔錯。
- `goal.family.miss` — 你想照顧屋企人，但人際分平均得 {rel}。
- `goal.status.hit` — 你想要地位。你有樓或者月入去到 {salary}。
- `goal.status.miss` — 你想要地位，但最高月入大約 {salary}，又未有自己嘅樓。
- `label.saverKing` — 佛系儲蓄王
- `label.saverKing.desc` — 錢係慢慢儲返嚟，唔追高、唔借錢，瞓得好。
- `label.moonlight` — 月光族
- `label.moonlight.desc` — 出糧就使，使完就等下個月。開心係真，存糧就少。
- `label.steady` — 穩健型
- `label.steady.desc` — 儲一啲、投資一啲、玩一啲，冇一樣去到盡。
- `label.riskWinner` — 高風險贏家
- `label.riskWinner.desc` — 你鍾意搏，而今次啲骰仔企喺你嗰邊。
- `label.rollercoaster` — 過山車人生
- `label.rollercoaster.desc` — 大上大落，搏過好多次，有贏有輸。
- `label.zenInvestor` — 佛系投資者
- `label.zenInvestor.desc` — 買咗就由佢，跌市都照揸，交俾時間。
- `label.debtJuggler` — 負債周轉型
- `label.debtJuggler.desc` — 今日用聽日嘅錢，成日喺幾張卡同貸款之間轉。
- `label.exitOnRed` — 見紅就走型
- `label.exitOnRed.desc` — 市一跌你就想走，安心係買到，但升返嗰段冇你份。
- `label.familyPillar` — 家庭支柱
- `label.familyPillar.desc` — 好多錢都係為屋企人使，換返嚟嘅係一班信你嘅人。
- `ending.title` — 人生收據
- `ending.age` — 18 至 65 歲
- `ending.plain` — 同一個起點，平穩咁行大約會有
- `ending.happiness` — 平均開心
- `ending.relationships` — 平均人際
- `ending.moments` — 幾個關鍵時刻
- `ending.moreMoments` — 其他關鍵時刻
- `ending.mistakes` — 可以避免嘅位
- `ending.mistakes.none` — 冇乜明顯可以避免嘅錯。
- `ending.mistakes.note` — 呢啲唔代表成世做錯，只係下次可以留意。
- `ending.more` — 睇詳細
- `ending.less` — 收埋
- `ending.chart` — 身家走勢
- `ending.share` — 分享結果
- `ending.copied` — 已儲存圖片
- `ending.shareFailed` — 分享唔到。你可以截圖分享。
- `ending.start` — 出世時：{tier}，GPA {gpa}
- `ending.traits` — 你一路發現咗：
- `moment.gain` — {age} 歲揀咗「{choice}」，身家即時多咗 {amount}。
- `moment.loss` — {age} 歲揀咗「{choice}」，身家即時少咗 {amount}。
- `cf.panic_sell` — {age} 歲你喺跌市沽咗 {amount}。如果揸到今日，會多 {diff}。
- `cf.panic_sell_saved` — {age} 歲你喺跌市沽咗 {amount}。之後仲跌，沽咗反而少蝕 {diff}。
- `cf.trip` — {age} 歲嗰次大阪旅行使咗 {amount}。放落指數基金今日值 {value}，但嗰啲相係買唔返嘅。
- `cf.summer_trip` — {age} 歲嗰個暑假旅行使咗 {amount}。放落指數基金今日值 {value}。
- `cf.treat` — {age} 歲犒賞自己使咗 {amount}。放落指數基金今日值 {value}。
- `cf.wedding` — {age} 歲擺酒使咗 {amount}。放落指數基金今日值 {value}。
- `mistake.noBuffer` — 冇緊急錢：有 {n} 年存糧唔夠一個月。
- `mistake.highDebt` — 高息債：背咗 {n} 年，利息總共俾咗 {interest}。
- `mistake.fees` — 收費：成世喺高收費產品同買賣上俾咗 {fees}，好多時冇為意。
- `mistake.surrender` — 提早退保：拎返嘅錢少過供落去，蝕咗 {loss}。
- `mistake.panic` — 跌市沽貨：一共 {n} 次喺低位走咗。
- `mistake.scam` — 電話騙案：俾人呃咗一筆錢。
- `share.text` — 我嘅人生收據：{label}。65 歲身家 {netWorth}。你又會係邊型？
- `ev.tuition.text` — 媽媽：「大學學費一年四萬七，你自己諗下點搞。」
- `ev.tuition.tsfs` — 申請入息審查嘅學生貸款
- `ev.tuition.tsfs.why` — 息率 1%，讀緊書唔計息，畢業後分 15 年還。
- `ev.tuition.nls` — 借免入息審查貸款
- `ev.tuition.nls.why` — 唔使審查，但由借錢嗰日開始計息。
- `ev.tuition.family` — 屋企幫手俾
- `ev.tuition.family.why` — 你冇債，但屋企人記住咗呢份人情。
- `ev.tuition.self` — 自己返工交
- `ev.tuition.self.why` — 冇債，但每個學期都要捱更抵夜。
- `ev.part_time.text` — 補習社老闆：「逢星期三、六晚，一個鐘 $180，做唔做？」
- `ev.part_time.take` — 做！
- `ev.part_time.take.ok` — 辛苦少少，成績都頂得住。
- `ev.part_time.take.slip` — 錢係多咗，但成績跌咗少少。
- `ev.part_time.take.why` — 時間都係錢，兩樣好難同時攞盡。
- `ev.part_time.tutor` — 自己接私補，叫價高啲
- `ev.part_time.tutor.why` — 你本身識教書，私補時薪高好多。
- `ev.part_time.focus` — 唔做住，專心讀書
- `ev.part_time.focus.why` — 好成績會令第一份人工高少少。
- `ev.japan_trip.text` — Group chat：「暑假大阪五日四夜！機票酒店每人 $8,000，入唔入？」
- `ev.japan_trip.go` — 入！用儲落嘅錢
- `ev.japan_trip.go.why` — 用自己儲嘅錢去玩，玩得安心。
- `ev.japan_trip.card` — 入！碌卡先，返嚟先算
- `ev.japan_trip.card.why` — 玩係一樣咁開心，但張卡會開始計息。
- `ev.japan_trip.skip` — 唔去喇，慳返
- `ev.japan_trip.skip.why` — 錢係慳咗，但 group chat 啲相你冇份。
- `ev.jiayong.text` — 媽媽：「屋企今個月有啲緊，你可唔可以俾多少少家用？」
- `ev.jiayong.more` — 每個月加 $1,000
- `ev.jiayong.more.why` — 每月固定支出多咗，但屋企人輕鬆好多。
- `ev.jiayong.once` — 一次過俾 $5,000
- `ev.jiayong.once.why` — 解咗燃眉之急，之後唔使長期加。
- `ev.jiayong.no` — 講明自己都好緊
- `ev.jiayong.no.why` — 錢留喺你度，但飯枱上靜咗好多。
- `ev.insurance_pitch.text` — 中學同學而家做保險：「呢個儲蓄計劃保證有錢收，供五年，二十年後差唔多翻倍！」
- `ev.insurance_pitch.textLow` — 中學同學：「呢份分紅保單保證現金價值加非保證歸原紅利同終期紅利，預期內部回報率 4.7%，供五年就得！」
- `ev.insurance_pitch.sign` — 簽，幫下老同學
- `ev.insurance_pitch.sign.hint` — 細字：頭幾年退保，只拎得返一部分供款。
- `ev.insurance_pitch.sign.why` — 儲蓄保要供足年期先值錢，中途走人會蝕。
- `ev.insurance_pitch.ask` — 叫佢俾份利益說明文件睇清楚先
- `ev.insurance_pitch.ask.hint` — 「翻倍」嗰個數係假設紅利全數派發，唔係保證。
- `ev.insurance_pitch.ask.why` — 睇清楚先簽，條數就唔會嚇親你。
- `ev.insurance_pitch.decline` — 多謝，暫時唔使住
- `ev.insurance_pitch.decline.why` — 你冇蝕錢，只係舊同學有少少失望。
- `ev.hot_tip.text` — 朋友傳訊息：「我表哥話隻新幣下個月上大交易所，入住先啦！」
- `ev.hot_tip.allin` — 入一半身家
- `ev.hot_tip.allin.moon` — 真係升咗！你嘅錢變咗三倍。
- `ev.hot_tip.allin.meh` — 炒咗兩個禮拜，差唔多打和，仲蝕少少手續費。
- `ev.hot_tip.allin.rug` — 個幣歸零前夕你走得切，得返一成。
- `ev.hot_tip.allin.why` — 貼士嘅回報好少，但大升嘅故事最易傳開。
- `ev.hot_tip.small` — 小注 $3,000 玩下
- `ev.hot_tip.small.moon` — 中咗！$3,000 變 $12,000。
- `ev.hot_tip.small.meh` — 玩完返嚟得返 $2,500。
- `ev.hot_tip.small.rug` — 個幣冇咗，得返 $300。
- `ev.hot_tip.small.why` — 只係玩得起嘅錢，輸咗都唔會傷筋動骨。
- `ev.hot_tip.pass` — 唔理佢
- `ev.hot_tip.pass.why` — 你唔會知中唔中，但肯定唔會輸。
- `ev.first_crash.text` — 新聞：「環球股市急跌，一個月跌兩成。」你個基金戶口一片紅。
- `ev.first_crash.hold` — 唔郁，照揸
- `ev.first_crash.hold.why` — 跌市只係帳面蝕，未賣都未算數。
- `ev.first_crash.sell` — 即刻沽晒，保住剩低嘅
- `ev.first_crash.sell.why` — 沽咗心安，但之後反彈你就冇份。
- `ev.first_crash.buy` — 趁平再買多啲
- `ev.first_crash.buy.why` — 平咗先買，但冇人知仲會唔會再跌。
- `ev.card_cashback.text` — 銀行推廣員：「學生信用卡！簽 $3,000 送 $500 現金回贈，免年費㗎！」
- `ev.card_cashback.full` — 申請，每月還清
- `ev.card_cashback.full.why` — 回贈係白賺，因為你每月都還清。
- `ev.card_cashback.free` — 申請，想用就用
- `ev.card_cashback.free.fine` — 細字：最低還款額之外嘅結欠，年利率大約 35%。
- `ev.card_cashback.free.why` — 碌卡唔覺痛，月結單先至痛。
- `ev.card_cashback.decline` — 唔要喇
- `ev.card_cashback.decline.why` — 冇回贈，但都冇月結單。
- `ev.ipo.text` — 新聞：「科技巨企招股，散戶超額認購 300 倍。」朋友：「抽唔抽？」
- `ev.ipo.textLow` — 新聞：「大型科技股 IPO，孖展認購額達 300 倍，暗盤交投活躍。」朋友：「借孖展抽多幾手！」
- `ev.ipo.cash` — 用現金抽一手
- `ev.ipo.cash.hint` — 超購 300 倍即係大部分人一手都抽唔到。
- `ev.ipo.cash.pop` — 抽中！上市日升咗，賺咗少少。
- `ev.ipo.cash.flop` — 抽中，但一上市就潛水。
- `ev.ipo.cash.none` — 抽唔中，只係俾咗手續費。
- `ev.ipo.cash.why` — 新股好熱，但抽中嘅機會好細。
- `ev.ipo.margin` — 借孖展抽多啲
- `ev.ipo.margin.fine` — 細字：孖展利息同手續費，抽唔中都要俾。
- `ev.ipo.margin.pop` — 抽中好多手，上市日大升！
- `ev.ipo.margin.flop` — 抽中好多手，一上市就跌。
- `ev.ipo.margin.none` — 一手都冇，但孖展利息照計。
- `ev.ipo.margin.why` — 借錢放大咗贏同輸，利息就一定要俾。
- `ev.ipo.skip` — 唔抽
- `ev.ipo.skip.why` — 冇著數，但都冇蝕。
- `ev.medical_bill.text` — 醫生：「要做個小手術。私家醫院報價 $38,000，公立要排幾個月。」
- `ev.medical_bill.private` — 去私家，快啲搞掂
- `ev.medical_bill.private.why` — 快係快，但一筆過要好多錢。
- `ev.medical_bill.public` — 排公立
- `ev.medical_bill.public.ok` — 排咗幾個月，最後順利做完。
- `ev.medical_bill.public.worse` — 等得太耐，要補做治療，最後都要俾錢。
- `ev.medical_bill.public.why` — 公立平，但要用時間同健康去等。
- `ev.medical_bill.insured` — 用醫保 claim
- `ev.medical_bill.insured.why` — 你之前每月俾嘅保費，今日派上用場。
- `ev.medical_insurance.text` — 保險經紀：「醫療保險每月 $600 左右，入院可以 claim，買唔買？」
- `ev.medical_insurance.buy` — 買，安心啲
- `ev.medical_insurance.buy.why` — 每月固定支出，換嚟入院唔使一筆過俾晒。
- `ev.medical_insurance.skip` — 後生冇病，唔使住
- `ev.medical_insurance.skip.why` — 每月慳咗錢，但大病就要自己硬食。
- `ev.move_out.text` — 又同屋企人嗌交。朋友：「搬出嚟同我夾租啦！」
- `ev.move_out.room` — 同朋友夾租一間房
- `ev.move_out.room.why` — 自由咗，但每月要多俾一大筆租。
- `ev.move_out.studio` — 自己租開放式單位
- `ev.move_out.studio.why` — 好舒服，但租金食咗人工一大份。
- `ev.move_out.stay` — 忍下，住屋企儲錢
- `ev.move_out.stay.why` — 慳到租，但私人空間就冇咁多。
- `ev.rent_increase.text` — 業主傳訊息：「下個月起加租 $1,500，唔得就搬啦。」
- `ev.rent_increase.accept` — 算數，照加
- `ev.rent_increase.accept.why` — 慳返搬屋嘅麻煩，但每月貴咗。
- `ev.rent_increase.haggle` — 同業主講價
- `ev.rent_increase.haggle.win` — 業主讓步，只加 $500。
- `ev.rent_increase.haggle.lose` — 業主唔肯讓，照加。
- `ev.rent_increase.haggle.why` — 講價唔使錢，最差都係照加。
- `ev.rent_increase.move` — 搬去遠啲但平啲
- `ev.rent_increase.move.why` — 租平咗，但搬屋要錢，返工又遠咗。
- `ev.internship.text` — 暑假兩個 offer：銀行實習每月 $9,000，餐廳兼職每月 $14,000。
- `ev.internship.intern` — 去銀行實習
- `ev.internship.intern.why` — 而家錢少啲，但履歷靚咗，第一份工人工高啲。
- `ev.internship.paid` — 去餐廳搵多啲錢
- `ev.internship.paid.why` — 即刻多錢，但履歷冇咩加分。
- `ev.internship.travel` — 兩個都唔做，去背包旅行
- `ev.internship.travel.why` — 錢冇咗，但你好開心。
- `ev.mpf_choice.text` — HR：「MPF 你想揀邊個基金？唔揀就跟預設投資策略。」
- `ev.mpf_choice.textLow` — HR：「請喺強積金成分基金之中揀選，否則會按預設投資策略，即核心累積基金同 65 歲後基金分配。」
- `ev.mpf_choice.default` — 跟預設
- `ev.mpf_choice.default.why` — 預設基金收費有上限，自動隨年紀減風險。
- `ev.mpf_choice.equity` — 揀全股票基金，搏高回報
- `ev.mpf_choice.equity.hint` — 股票基金平均收費大約 1.4%，預設策略封頂 0.95%。
- `ev.mpf_choice.equity.why` — 升市跑得快啲，跌市跌得深啲，收費仲貴啲。
- `ev.mpf_choice.ask` — 問清楚收費先揀
- `ev.mpf_choice.ask.hint` — 收費每年 1% 差異，四十年後可以差成兩成。
- `ev.mpf_choice.ask.why` — 你知自己俾緊幾多收費，已經贏咗好多人。
- `ev.laptop.text` — 部手提電腦慢到郁唔到。新款 $14,000，可以分 12 期免息。
- `ev.laptop.new` — 買新款，分期
- `ev.laptop.new.why` — 免息分期唔蝕錢，但每月供款鎖死你一年。
- `ev.laptop.refurb` — 買部翻新機
- `ev.laptop.refurb.why` — 平好多，夠用就得。
- `ev.laptop.keep` — 捱住先
- `ev.laptop.keep.why` — 慳住先，但部機可能喺死線前壞。
- `ev.side_hustle.text` — 朋友：「一齊開網店賣手作啦！每人夾 $10,000 本錢。」
- `ev.side_hustle.shop` — 夾錢開舖
- `ev.side_hustle.shop.works` — 網店有客！每月有啲外快。
- `ev.side_hustle.shop.flops` — 賣唔出，本錢冇咗。
- `ev.side_hustle.shop.why` — 大部分小生意頭一年都撈唔起，但有人會成功。
- `ev.side_hustle.gigs` — 唔夾錢，自己接 freelance
- `ev.side_hustle.gigs.why` — 冇本錢風險，用時間換錢。
- `ev.side_hustle.decline` — 唔搞喇
- `ev.side_hustle.decline.why` — 冇風險，都冇外快。
- `ev.money_surplus.text` — 年尾計數，戶口多咗一筆錢。點擺好？
- `ev.money_surplus.savings` — 放定期
- `ev.money_surplus.savings.why` — 穩陣，利息細細，跑唔贏通脹幾多。
- `ev.money_surplus.index` — 買大型指數基金，長揸
- `ev.money_surplus.index.why` — 分散晒，長線跟住成個市場升跌。
- `ev.money_surplus.hot` — 買熱門科技股
- `ev.money_surplus.hot.why` — 一隻股票可以飛，亦可以跌一半。
- `ev.money_surplus.treat` — 犒賞自己，去旅行
- `ev.money_surplus.treat.why` — 辛苦咗一年，識得享受都係一種平衡。
- `ev.market_drop.text` — 新聞：「股市急跌，分析員：可能仲有排跌。」你個戶口又紅晒。
- `ev.market_drop.hold` — 照揸唔郁
- `ev.market_drop.hold.why` — 以前每次大跌，最後都有反彈，不過要等。
- `ev.market_drop.sell` — 沽晒佢，唔想再睇
- `ev.market_drop.sell.why` — 心係安咗，但蝕咗嘅就變咗真蝕。
- `ev.market_drop.buy` — 有閒錢，趁低再買
- `ev.market_drop.buy.why` — 跌市買平貨，前提係你有後備錢。
- `ev.budget_check.text` — 銀行 app 通知：「你嘅信用卡結欠已經好高。」月尾又唔夠錢。
- `ev.budget_check.cut` — 減少食飯消遣
- `ev.budget_check.cut.why` — 每月少使啲，債先會開始減。
- `ev.budget_check.extra` — 晚上接多份兼職
- `ev.budget_check.extra.why` — 多咗收入，但休息時間少咗。
- `ev.budget_check.carry` — 照舊，下個月先算
- `ev.budget_check.carry.why` — 生活質素保住咗，但卡數繼續以高息滾。
- `ev.budget_check.cheaper` — 搬去平啲嘅地方
- `ev.budget_check.cheaper.why` — 租平咗一大截，但要搬屋，地方又細咗。
- `ev.card_bill.text` — 信用卡月結單：欠 {cardDebt}。最低還款額好細，好吸引。
- `ev.card_bill.full` — 一次過還清
- `ev.card_bill.full.why` — 還清就唔使俾 35% 利息。
- `ev.card_bill.min` — 俾最低還款額先
- `ev.card_bill.min.why` — 而家鬆啲，但餘額每年滾 35% 利息。
- `ev.card_bill.loan` — 借私人貸款還卡數
- `ev.card_bill.loan.why` — 用平啲嘅息還貴啲嘅債，但債都仲喺度。
- `ev.insurance_strain.text` — 保險經紀：「又到供款期喇！記得準時供呀。」你戶口得返 {cash}。
- `ev.insurance_strain.keep` — 咬實牙關照供
- `ev.insurance_strain.keep.why` — 供滿年期先至唔蝕。
- `ev.insurance_strain.surrender` — 退保，唔供喇
- `ev.insurance_strain.surrender.why` — 頭幾年退保，拎返嘅錢少過你供落去嘅。
- `ev.insurance_strain.borrow` — 借錢頂住先
- `ev.insurance_strain.borrow.why` — 保單保住咗，但多咗一筆債。
- `ev.chronic_flare.text` — 醫生：「你呢個係長期病，要定期覆診同食藥。」
- `ev.chronic_flare.treat` — 照醫生講，即刻治
- `ev.chronic_flare.treat.why` — 早啲處理，長遠平啲。
- `ev.chronic_flare.delay` — 拖住先，冇錢
- `ev.chronic_flare.delay.why` — 拖得一時，之後可能更貴。
- `ev.chronic_flare.insured` — 用醫保
- `ev.chronic_flare.insured.why` — 醫保幫你頂咗大部分。
- `ev.headhunter.text` — 獵頭打嚟：「有間公司想請你，人工加兩成，約日傾下？」
- `ev.headhunter.jump` — 跳槽
- `ev.headhunter.jump.why` — 人工高咗，但新公司未必好過而家。
- `ev.headhunter.jump.fine` — 細字：試用期內冇年尾雙糧，之前嗰份花紅亦會冇咗。
- `ev.headhunter.jump.great` — 新老闆好賞識你，即刻再加人工。
- `ev.headhunter.jump.same` — 新公司同舊公司差唔多，只係人工高咗。
- `ev.headhunter.jump.bad` — 新團隊鬥得好犀利，你有啲後悔。
- `ev.headhunter.counter` — 拎住 offer 同老闆傾加薪
- `ev.headhunter.counter.why` — 有 offer 喺手，傾加薪先有底氣。
- `ev.headhunter.counter.raise` — 老闆即刻同你加咗人工。
- `ev.headhunter.counter.nothing` — 老闆話冇預算，仲覺得你想走。
- `ev.headhunter.stay` — 多謝，唔跳
- `ev.headhunter.stay.why` — 穩陣，但之後會時不時諗跳咗會點。
- `ev.wedding.text` — 伴侶：「我哋結婚好唔好？酒席要唔要擺？兩邊爸媽都想擺。」
- `ev.wedding.banquet` — 擺酒席
- `ev.wedding.banquet.why` — 好熱鬧，成本高，不過會收返啲人情。
- `ev.wedding.banquet.fine` — 細字：酒席之外仲有化妝、攝影同加茶位等雜費。
- `ev.wedding.small` — 簡單註冊，食餐飯
- `ev.wedding.small.why` — 慳到好多錢，不過長輩未必開心。
- `ev.wedding.trip` — 註冊完去旅行
- `ev.wedding.trip.why` — 錢花喺兩個人身上，不過親戚會有微言。
- `ev.friend_wedding.text` — 朋友：「下個月我結婚，一定要嚟呀！」
- `ev.friend_wedding.generous` — 封大封利是
- `ev.friend_wedding.generous.why` — 朋友好開心，你荷包少咗一截。
- `ev.friend_wedding.normal` — 封 $2,000
- `ev.friend_wedding.normal.why` — 唔多唔少，禮數到位。
- `ev.friend_wedding.excuse` — 推咗，只寄個細封
- `ev.friend_wedding.excuse.why` — 慳咗錢，不過朋友會記住你冇出現。
- `ev.first_home.text` — 地產經紀：「新界個 400 呎單位，$5,500,000，仲有人睇緊，聽日就冇㗎喇！」
- `ev.first_home.buy` — 買，首期一成
- `ev.first_home.buy.why` — 一買就有屋，但每個月要供好多年。
- `ev.first_home.buy.fine` — 細字：管理費、差餉同維修，每個月大約多 $1,500。
- `ev.first_home.small` — 買細啲嘅舊樓
- `ev.first_home.small.why` — 樓價平啲，月供輕啲，但地方細。
- `ev.first_home.small.fine` — 細字：舊樓管理費同維修費通常更高。
- `ev.first_home.parents` — 問爸媽借首期
- `ev.first_home.parents.why` — 有人幫手先買到，但屋企會期望你多俾家用。
- `ev.first_home.parents.fine` — 細字：管理費、差餉同維修，每個月大約多 $1,500。
- `ev.first_home.rent` — 繼續租
- `ev.first_home.rent.why` — 唔使揹按揭，但租金年年升。
- `ev.car_purchase.text` — 車行：「新車分期六年，月供好輕，睇下先啦？」
- `ev.car_purchase.new` — 買新車，貸款六年
- `ev.car_purchase.new.why` — 好威風，但每個月多咗好多固定支出。
- `ev.car_purchase.new.fine` — 細字：車位租金同保險冇計喺廣告價入面。
- `ev.car_purchase.used` — 買二手車
- `ev.car_purchase.used.why` — 平好多，但舊車可能時不時壞。
- `ev.car_purchase.none` — 唔買，搭車
- `ev.car_purchase.none.why` — 慳錢，不過朋友去郊外你要睇住佢哋走。
- `ev.promotion_burnout.text` — 老闆：「部門主管個位想俾你做，人工加三成，不過要成日加班。」
- `ev.promotion_burnout.accept` — 接受升職
- `ev.promotion_burnout.accept.why` — 人工高咗，但時間同精神都要俾出去。
- `ev.promotion_burnout.accept.smooth` — 你頂得住，仲學到好多嘢。
- `ev.promotion_burnout.accept.burnout` — 壓力太大，你病咗幾個禮拜，要休息同睇醫生。
- `ev.promotion_burnout.decline` — 多謝，唔接
- `ev.promotion_burnout.decline.why` — 生活輕鬆啲，不過同事會升到你前面。
- `ev.promotion_burnout.leave` — 先放長假再答覆
- `ev.promotion_burnout.leave.why` — 休息夠先接，但公司等你要時間。
- `ev.parents_medical.text` — 媽媽：「爸爸要入院做檢查，醫生話私家快啲，不過要幾萬蚊……」
- `ev.parents_medical.private` — 俾私家，快啲搞掂
- `ev.parents_medical.private.why` — 快係快，但一次過要俾好多。
- `ev.parents_medical.public` — 排公立
- `ev.parents_medical.public.why` — 平，但要用時間同擔心去換。
- `ev.parents_medical.public.ok` — 排咗一陣，最後都順利。
- `ev.parents_medical.public.worse` — 等到病情加重，要加做檢查同治療。
- `ev.parents_medical.share` — 叫親戚一齊分擔
- `ev.parents_medical.share.why` — 自己俾少啲，但為咗錢爭拗過。
- `ev.baby.text` — 伴侶：「我哋……係咪應該生細路喇？」
- `ev.baby.have` — 生，自己湊
- `ev.baby.have.why` — 好開心，但奶粉、託兒同時間都係大開支。
- `ev.baby.helper` — 請外傭幫手
- `ev.baby.helper.why` — 輕鬆好多，但每個月多咗一筆固定人工。
- `ev.baby.nope` — 暫時唔生
- `ev.baby.nope.why` — 又自由又慳錢，不過屋企人會有意見。
- `ev.friend_loan.text` — 朋友：「呢排周轉唔到，可唔可以借我一筆錢？大概你個半月人工。下個月一定還！」
- `ev.friend_loan.lend` — 借，寫低張單
- `ev.friend_loan.lend.why` — 借錢俾朋友，連友情都押咗落去。
- `ev.friend_loan.lend.repaid` — 朋友真係還咗，仲請你食飯。
- `ev.friend_loan.lend.partial` — 還咗一部分，之後就冇再提。
- `ev.friend_loan.lend.ghosted` — 之後佢少咗搵你，錢冇聲息。
- `ev.friend_loan.gift` — 送 $5,000，唔使還
- `ev.friend_loan.gift.why` — 當送俾佢，心入面少啲負擔。
- `ev.friend_loan.decline` — 唔借
- `ev.friend_loan.decline.why` — 錢保住咗，但朋友會覺得你唔講義氣。
- `ev.layoff.text` — 老闆：「公司要精簡人手，今個月尾係你最後一日。」
- `ev.layoff.search` — 唔急，慢慢搵工
- `ev.layoff.search.why` — 有緩衝先可以揀，但等得耐就係燒緊錢。
- `ev.layoff.search.quick` — 好快有新工，人工差唔多。
- `ev.layoff.search.slow` — 搵咗大半年先有工，要食老本。
- `ev.layoff.search.long` — 搵咗成年，儲落嘅錢用咗一大半。
- `ev.layoff.any` — 即刻接第一份 offer
- `ev.layoff.any.why` — 收入冇斷，不過人工低咗好多。
- `ev.layoff.retrain` — 報班進修，再搵工
- `ev.layoff.retrain.why` — 短期辛苦，但學到嘅嘢可能有回報。
- `ev.part_time_master.text` — 大學：「兼讀碩士課程，夜晚上堂，兩年畢業，申請就嚟截止。」
- `ev.part_time_master.enrol` — 報名讀碩士
- `ev.part_time_master.enrol.why` — 讀書要錢又要時間，但可能升到職。
- `ev.part_time_master.enrol.fine` — 細字：學費年年加，仲有書本同報告雜費。
- `ev.part_time_master.course` — 報短期證書課程
- `ev.part_time_master.course.why` — 平啲、短啲，加人工嘅機會都細啲。
- `ev.part_time_master.skip` — 唔讀
- `ev.part_time_master.skip.why` — 錢同時間都留低咗，不過學歷冇進步。
- `ev.crypto_mania.text` — 朋友：「全部人都入緊場！我表哥兩個禮拜賺咗半年人工，你唔入？」
- `ev.crypto_mania.allin` — 入一半現金
- `ev.crypto_mania.allin.why` — 大賺嘅故事人人講，蝕嘅冇人提。
- `ev.crypto_mania.small` — 試少少，$10,000
- `ev.crypto_mania.small.why` — 輸咗都唔會傷筋動骨。
- `ev.crypto_mania.pass` — 唔入
- `ev.crypto_mania.pass.why` — 冇賺到，但亦唔使睇住個價心跳。
- `ev.health_check_family.text` — 醫生：「你爸爸嗰邊家族有高風險，建議你做詳細篩查。」
- `ev.health_check_family.screen` — 做詳細篩查
- `ev.health_check_family.screen.why` — 篩查要錢，但早發現就易處理。
- `ev.health_check_family.screen.clear` — 一切正常，你放心咗。
- `ev.health_check_family.screen.caught` — 發現早期問題，及早處理。
- `ev.health_check_family.ignore` — 暫時唔理
- `ev.health_check_family.ignore.why` — 想唔到咁多，但問題可能拖大。
- `ev.health_check_family.insure` — 加買醫療保險
- `ev.health_check_family.insure.why` — 每月多俾，大病就唔使一筆過負擔。
- `ev.health_check_family.insure.fine` — 細字：因為家族病史，保費會加徵，部分病要等兩年先保。
- `ev.sibling_help.text` — 媽媽：「你細佬要交學費，屋企一時間拿唔出，你幫下佢啦。」
- `ev.sibling_help.gift` — 一次過俾錢幫佢
- `ev.sibling_help.gift.why` — 佢過到難關，你嘅儲蓄少咗。
- `ev.sibling_help.monthly` — 每月俾佢生活費
- `ev.sibling_help.monthly.why` — 長期穩定，但你每個月少咗一筆。
- `ev.sibling_help.refuse` — 叫佢自己諗辦法
- `ev.sibling_help.refuse.why` — 錢留低咗，不過家人之間會有疙瘩。
- `ev.friends_emigrate.text` — 朋友：「我哋全家下個月移民英國喇，走之前食餐飯？」
- `ev.friends_emigrate.farewell` — 請食飯，好好道別
- `ev.friends_emigrate.farewell.why` — 有啲唔捨得，但至少好好講咗再見。
- `ev.friends_emigrate.explore` — 都去了解下移民
- `ev.friends_emigrate.explore.why` — 花啲錢睇下出路，可能好，可能唔啱。
- `ev.friends_emigrate.stay` — 祝福佢，繼續生活
- `ev.friends_emigrate.stay.why` — 錢冇花，但少咗個老友。
- `ev.kid_tuition.text` — 學校通告：「新學年學費、活動費同補習班安排如下。」
- `ev.kid_tuition.intl` — 轉國際學校
- `ev.kid_tuition.intl.why` — 環境好、學費貴，細路可能好開心。
- `ev.kid_tuition.tutor` — 報補習班
- `ev.kid_tuition.tutor.why` — 成績可能好啲，但細路冇乜玩樂時間。
- `ev.kid_tuition.tutor.fine` — 細字：模擬試卷、暑期班同教材另計。
- `ev.kid_tuition.home` — 自己教，唔補習
- `ev.kid_tuition.home.why` — 慳錢，不過晚晚陪做功課好攰。
- `ev.elder_care.text` — 媽媽：「爸爸跌倒入院，醫生話出院後要有人長期照顧。」
- `ev.elder_care.home` — 送去私人老人院
- `ev.elder_care.home.why` — 有專人睇，但月費係長期支出。
- `ev.elder_care.helper` — 請外傭照顧
- `ev.elder_care.helper.why` — 喺屋企住，但要請人，成本都唔低。
- `ev.elder_care.carer` — 自己減少工時照顧
- `ev.elder_care.carer.why` — 陪到佢，不過收入少咗。
- `ev.elder_care.waitlist` — 輪候資助院舍
- `ev.elder_care.waitlist.why` — 資助院舍平，但要等。
- `ev.elder_care.waitlist.soon` — 好快輪到，每月費用唔高。
- `ev.elder_care.waitlist.long` — 等咗好耐，期間要臨時請人。
- `ev.layoff_late.text` — 老闆：「呢輪重組，你個職位冇咗。公司俾你六個月遣散費。」
- `ev.layoff_late.search` — 慢慢搵工
- `ev.layoff_late.search.why` — 年紀大咗搵工慢，遣散費要頂住。
- `ev.layoff_late.search.found` — 搵到新工，但人工低咗。
- `ev.layoff_late.search.slow` — 面試好多，都話你太資深，搵咗好耐。
- `ev.layoff_late.any` — 接受低薪工作
- `ev.layoff_late.any.why` — 好快有收入，人工少咗好多。
- `ev.layoff_late.retire` — 直接提早退休
- `ev.layoff_late.retire.why` — 有儲蓄就可以收工，但要靠自己食老本。
- `ev.insurance_matures.text` — 保險經紀：「你嗰張儲蓄保單供咗一排，而家可以提取、繼續放，或者借錢㗎。」
- `ev.insurance_matures.textLow` — 經紀：「你份分紅保單已繳足保費，可以退保取回現金價值、保留累積紅利，或者做保單貸款。」
- `ev.insurance_matures.cash_out` — 退保拎錢
- `ev.insurance_matures.cash_out.why` — 攞到現金，但蝕咗等多幾年嘅回報。
- `ev.insurance_matures.cash_out.hint` — 細字：而家退保會被扣退保費用，唔係全數拎返。
- `ev.insurance_matures.keep` — 繼續放
- `ev.insurance_matures.keep.why` — 錢放喺保單入面，要用就冇咁方便。
- `ev.insurance_matures.keep.hint` — 放得越耐，回報越接近預期。
- `ev.insurance_matures.loan` — 用保單借錢
- `ev.insurance_matures.loan.why` — 借到錢，但利息每年都加上去。
- `ev.insurance_matures.loan.hint` — 借錢會計息，利息會由戶口價值扣。
- `ev.insurance_matures.loan.fine` — 細字：貸款利息每年滾存，逾期未還會影響保單價值。
- `ev.mortgage_refi.text` — 銀行：「你嘅按揭優惠期滿喇，可以轉到新計劃，息率低啲。」
- `ev.mortgage_refi.textLow` — 銀行：「你嘅按揭優惠期屆滿，可轉按至新計劃，息差更低，另需自費估價同律師費。」
- `ev.mortgage_refi.switch` — 轉按至新計劃
- `ev.mortgage_refi.switch.why` — 每月供款慳少少，但一開始要俾手續費。
- `ev.mortgage_refi.switch.hint` — 轉按要俾估價費、律師費同提早還款費。
- `ev.mortgage_refi.switch.fine` — 細字：估價費、律師費同提早還款費用，加埋約 $8,000。
- `ev.mortgage_refi.prepay` — 還咗一半現金落按揭
- `ev.mortgage_refi.prepay.why` — 利息少咗，但手頭現金少咗。
- `ev.mortgage_refi.stay` — 唔轉，照舊
- `ev.mortgage_refi.stay.why` — 唔使搞，但息差高咗，每個月供款貴少少。
- `ev.scam_call.text` — 來電：「我哋係銀行保安部，你戶口有可疑交易，請按 1 轉駁職員。」
- `ev.scam_call.press` — 按 1 聽下
- `ev.scam_call.press.why` — 騙徒好會扮，一緊張就容易中招。
- `ev.scam_call.press.real` — 原來真係銀行打嚟，你戶口冇事。
- `ev.scam_call.press.scam` — 你照指示轉咗錢，先知中咗騙案。
- `ev.scam_call.hangup` — 收線
- `ev.scam_call.hangup.why` — 收線最穩陣，但偶然會誤事。
- `ev.scam_call.hangup.ok` — 收咗線冇事。
- `ev.scam_call.hangup.real` — 原來真係銀行，信用卡被凍結，要補辦。
- `ev.scam_call.callback` — 用官方電話打返去查
- `ev.scam_call.callback.why` — 多花啲時間，但最穩陣。
- `ev.early_retire_thought.text` — 你望住呢排嘅月結單，心諗：「如果而家唔做，會點？」
- `ev.early_retire_thought.retire_now` — 提早退休
- `ev.early_retire_thought.retire_now.why` — 時間自由咗，但收入停咗，全靠儲蓄。
- `ev.early_retire_thought.part_time` — 轉做兼職
- `ev.early_retire_thought.part_time.why` — 輕鬆好多，但收入同強積金都少咗。
- `ev.early_retire_thought.keep_working` — 照做到 65
- `ev.early_retire_thought.keep_working.why` — 收入穩定，但越做越攰。
- `ev.kid_down_payment.text` — 仔女：「我想買樓，首期差一截，可唔可以幫手？」
- `ev.kid_down_payment.full` — 俾晒首期
- `ev.kid_down_payment.full.why` — 佢好開心，你嘅儲蓄少咗一大截。
- `ev.kid_down_payment.part` — 俾一部分
- `ev.kid_down_payment.part.why` — 幫到佢，你都留返啲錢。
- `ev.kid_down_payment.lend` — 借俾佢，要還
- `ev.kid_down_payment.lend.why` — 你有壓力，佢都有壓力。
- `ev.kid_down_payment.no` — 叫佢自己慢慢儲
- `ev.kid_down_payment.no.why` — 你嘅錢保住咗，但仔女有啲失望。
- `ev.downsize_flat.text` — 地產經紀：「你間屋而家升咗好多，換細啲住啱啲啦，仲可以套現。」
- `ev.downsize_flat.downsize` — 賣大屋，買細屋
- `ev.downsize_flat.downsize.why` — 釋放咗啲資金，但要搬屋同適應細地方。
- `ev.downsize_flat.sell_rent` — 賣屋，租屋住
- `ev.downsize_flat.sell_rent.why` — 有大筆現金，不過每月要俾租。
- `ev.downsize_flat.stay` — 繼續住
- `ev.downsize_flat.stay.why` — 住慣咗，維修同管理費照俾。
- `ev.retirement_income.text` — 經紀：「快退休喇，退休金想點用？定期年金每月有錢收，不過本金鎖咗。」
- `ev.retirement_income.textLow` — 經紀：「臨近退休，可將部分資金投入年金，保證每月派息，惟本金不可提取，亦未必追得上通脹。」
- `ev.retirement_income.annuity` — 買定期年金
- `ev.retirement_income.annuity.why` — 收入穩定，但資金唔再靈活。
- `ev.retirement_income.annuity.hint` — 本金鎖咗，每月收固定金額，通脹會蝕購買力。
- `ev.retirement_income.bonds` — 一半放債券基金
- `ev.retirement_income.bonds.why` — 比定期多少少回報，上落都唔會太大。
- `ev.retirement_income.keep` — 照放銀行戶口，唔郁
- `ev.retirement_income.keep.why` — 簡單，但現金放耐咗會俾通脹蝕。
- `ev.retirement_income.invested` — 一部分繼續投資
- `ev.retirement_income.invested.why` — 有機會升，但跌市會影響退休生活。
- `ev.retirement_income.invested.hint` — 市況好會升，市況差會跌，退休前後尤其要留意。
<!-- cantonese:end -->
