# Hackathon spec (Leo's Google Doc, copied 2026-11-20)

Source: https://docs.google.com/document/d/1CIzz0MNCN0fwDuvZUj3fON5JIXzFdQ6pI14upGUkMbs

You are building a casual, replayable web game for financial education, aimed at Hong Kong university students. The player lives a randomly generated life from university (age 18) to retirement (age 65) in a text-based, choice-driven format, similar in spirit to 八十億分之一 but focused only on money-related decisions. It must feel fun and light, not like a lecture. The depth comes from realistic trade-offs and delayed consequences, not from long text.


## HOW TO WORK
- Build the whole game in the 5 phases listed at the bottom, in order, without stopping between phases.
- At the end of each phase: (1) run type-check and tests, (2) fix errors, (3) append a short summary to PROGRESS.md (what was built, what is unfinished, any assumptions you made).
- Do not start a phase until the previous one compiles and its tests pass.
- If something is ambiguous, make the most reasonable assumption, record it in PROGRESS.md, and continue. Do not stop to ask unless it blocks the build entirely.
- Before writing code, output a short plan: file structure plus the TypeScript types for state, event, and character.


## TECH
- React + TypeScript + Vite. No backend; runs fully in the browser.
- Mobile-first UI, one decision card at a time.
- Game logic is pure TypeScript, fully separate from the UI, so it can run headless.
- All content (events, traits, endings, copy) lives in data files, never hardcoded in logic.
- Seeded random number generator so runs are reproducible.
- All player-facing text is i18n-ready: Traditional Chinese (Cantonese-flavored, casual) by default, English as a second language file.


## TIMELINE
- University (18-22): one turn per semester (8 turns).
- Working years (22-65): one turn per year.
- Content is densest at ages 18-35. After 35, events are fewer and mostly play out consequences of earlier choices.
- Retirement at 65, including MPF withdrawal.


## PLAYER STATE
Visible: cash (HK$), runway (months of survival without income, derived), happiness (0-100), relationships (0-100).
Hidden or semi-hidden:
- investments by asset type. Config flag `showPortfolioLive` (default false): by default show the portfolio only in a year-end summary.
- debts (student loan, credit card, personal loan) with interest rates
- net worth: hidden until the ending
- flags: set of strings recording past choices (e.g. "signed_savings_insurance_24m")
- decisionLog: every decision with turn, choice, and a counterfactual snapshot


## ASSET TYPES (generic names only, no real brands)
Savings account, broad index fund, bond fund, single stock, crypto, MPF (default fund vs self-chosen), savings insurance plan (with surrender penalty), property (later stages).


## MARKET SIMULATION
- Regime-based returns (bull, normal, correction, crash, recovery) loosely inspired by real history (dot-com, 2008, 2020), with realistic volatility per asset type.
- Include inflation and quiet fees (fund fees, insurance charges).
- Early-game protection: the first crash must not occur within the first 2 years of the player investing, and every crash must be followed by a recovery within a playable time frame so the player feels the dip and the rebound.
- Typical outcomes must reflect reality. Rare huge wins (crypto, meme stock) are possible but rare. Gambling must not be a winning normal strategy.


## CHARACTER GENERATION (random at start, finance-relevant only)
Visible at spawn:
- family income tier, 家用 owed per month, family debt, parents' ability to help, siblings to support
- GPA/academic standing (affects scholarships, internship quality, starting salary range; must NOT affect investment returns)
- obvious talents (e.g. tutoring)
Hidden at spawn, revealed through events:
- temperament: impulsive spender / loss-anxious / FOMO-prone / steady
- health: chronic condition, family medical history, mental health
- financial literacy (low/medium/high): controls how much fine print and jargon the player can decode. Low = jargon-heavy pitches, fewer hints. High = extra hints.
- hidden talents (freelancing, negotiation, networking)
Rule: when a hidden trait first triggers, show a short, clear in-game moment explaining it (e.g. "You froze when the market dropped."). Never penalize silently.


## EVENT SYSTEM (the core)
Each event is a data object with:
- id, ageRange, category (daily life, investing, career, health, family, friends, housing)
- conditions: declarative rules over state (cash < X, has flag, temperament, family tier, etc.)
- weight and cooldown
- shortText: 1-3 punchy lines in the voice of a real person (friend, agent, landlord, headline). Show what a real person would see, not the true odds.
- choices (2-4), each with: label, visibleEffects, hiddenEffects (fine print, fees), probabilisticOutcomes (can depend on state), setsFlags, delayedEffects [{ afterTurns, effect or triggers eventId }], counterfactual tag, optional literacyHints
- reveal: a one-line casual "why that happened" shown after the outcome, never preachy
Design rules:
1. No dominant option. Every choice has a real cost and benefit that depend on the player's situation.
2. The same event plays differently depending on runway, debt, and past flags.
3. Delayed and chained consequences are encouraged.
4. Some events force trade-offs (two good things, cash for one); some have no good option (emergencies).
5. Fun spending is rewarded with happiness/relationships. The lesson is "spend within your means," not "don't spend."
Seed content: write 15 events for ages 18-25: part-time job, tuition/student loan, Japan trip with friends, 家用 pressure, agent pitching "guaranteed" savings insurance, friend's hot stock/crypto tip, first crash while holding an index fund, credit card cashback offer, IPO subscription, emergency medical bill, rent increase, internship vs paid work, MPF choice at first job, laptop upgrade, side-hustle opportunity. Also write about 15 more events for ages 25-35 (job change, wedding, first home pressure, car, promotion vs burnout, parents' medical costs, etc.). Keep them in data files so I can add more later.


## ENDINGS (reflect, don't judge)
- No single score and no declared "winner."
- At the end, ask what the player wanted from life (security / freedom / experiences / family / status), then compare it to actual behavior from decisionLog and stats (e.g. "You wanted security, but your runway was under 1 month for 8 years.").
- "Moments that mattered": a timeline of 3-6 key decisions with counterfactuals (e.g. "You panic-sold at 24. Holding would be worth HK$X more today.").
- Descriptive, config-driven labels based on behavior patterns, none ranked above others (e.g. 佛系儲蓄王, 月光族, 穩健型, 高風險贏家, 佛系投資者, 負債周轉型).
- "Avoidable mistakes" shown separately (no buffer, long high-interest debt, unnoticed fees) without calling the whole life bad.
- Compare the outcome to what was possible from the player's starting point.
- Default ending screen is short and shareable; detailed breakdown is expandable.
- Include an "educational only, not financial advice" note.


## BALANCE TESTING
Build a headless simulator that runs 10,000 seeded playthroughs with fixed bot strategies (never invest, always index fund, always spend on fun, panic-sell on drops, chase every tip, etc.). Output final net worth distribution, bankruptcy rate, and ending label distribution per strategy. No single strategy should dominate. If one does, adjust market and event numbers and rerun. Save the results in BALANCE_REPORT.md.


## PHASES
Phase 1: Project setup, types, seeded RNG, market simulation, turn loop, headless simulator.
Phase 2: Character generation and event engine (conditions, weights, delayed effects, flags) with the seed events.
Phase 3: Playable UI (decision cards, stat display, year-end summary).
Phase 4: Endings (priority question, timeline, counterfactuals, labels, avoidable mistakes).
Phase 5: Polish (i18n Chinese/English, shareable result card, balance pass using the simulator, README with instructions for adding new events).
