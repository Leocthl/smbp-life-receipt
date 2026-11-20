# Brief: finance life-sim game for a finance-track hackathon

You are the builder for a new project in /Users/leo/csProj/money-life. Leo (a CUHK Year 1 student) is entering a finance-track hackathon. **SPEC.md in this folder is the contract: build everything it asks, in its 5 phases, in order, without stopping between phases.** It is Leo's own prompt. Where this brief adds something, the spec still wins on any conflict.

## Setup
- React + TypeScript + Vite, as SPEC.md says. Use Vitest for tests. Dev server on **port 5196** (5190 is taken).
- `git init` is fine, but don't commit, push or create a remote unless Leo asks.
- Don't deploy anywhere. Leo decides when it goes online.
- Subagents: **Sonnet 5.5 or Haiku 5.5 only, never Opus** (Leo's standing rule). Use Haiku at low effort for sweeps, screenshots and log reading, and Sonnet for writing event content or a code review.

## Lessons from Leo's last game (GESH, a papercraft board game, 6 to 18 Nov 2026)
That game also had choices that steer one of many endings, so these lessons carry straight over:
1. **Pure engine, headless sims.** Rules were pure, immutable functions with a seeded RNG (state in, new state plus events out). A headless simulator told us which endings could be reached. Ending weights had to be re-calibrated whenever the number of decisions changed. The check that mattered: a player who consistently picks one style should land in that style's ending most of the time, and every ending should be reachable. Do the same here for the bot strategies and labels.
2. **Leo dislikes "just a text box".** On GESH he asked for the decision text card to be replaced by a small animated cardboard diorama that acts the situation out and changes when you pick. Here the spec is text-based, so keep the text short. But give every decision card a small visual: a CSS/SVG vignette such as the speaker, the object or the place, with a tiny motion that switches when a choice is highlighted or picked. Build it in code, with no generated images and no real brands. Leo values a recognisable look, so pick one visual identity early and keep it consistent (something like paper, stickers or a receipt). Use the frontend-design or emil-design-eng skills for the look. Keep it light, and don't let it delay the phases.
3. **Phone first, from day one.** GESH needed a late phone pass. Here, test at **390×844 with touch** from Phase 3 on: one card on screen, thumb-sized buttons, no hover-only behaviour, nothing hanging outside its box.
4. **Smooth motion only.** A stepped, low-fps "stop motion" look was read as lag and had to be removed. Use ease-out transitions under about 300 ms, and respect prefers-reduced-motion.
5. **Cantonese copy.** Every new Cantonese line is yours and needs Leo's check. Keep a list in PROGRESS.md under "Cantonese for Leo to check". Use casual HK Cantonese, never invent sayings or idioms, keep English names readable, and keep one language per screen.
6. **Tests that last.**
   - Unit tests for the engine.
   - Playwright browser tests that wait for the element they act on, never a fixed delay. Use Playwright from `/Users/leo/csProj/jeng-map/node_modules/playwright/index.mjs`, or add it as a dev dependency. Launch Chromium with `--use-angle=metal --enable-gpu`.
   - Keep CSS class names unique, because two global clashes cost time on GESH.
7. **Original work only.** 八十億分之一 is the spirit reference. Copy nothing from it: no name, text, layout or art.
8. **Check the HK finance facts and cite them.** Get MPF rules (contribution rates, the income floor and cap, withdrawal at 65), the student-loan schemes, typical card APRs, salaries, rents and fees right for 2026 Hong Kong. Use web search, and put a source comment next to each number in the data files. If you're unsure, write a reasonable figure and add it to PROGRESS.md as an assumption. Show the "educational only, not financial advice" note.

## Done means
- All 5 phases are built, with the type-check and tests passing at the end of each one.
- PROGRESS.md, BALANCE_REPORT.md (10,000 seeded runs per bot strategy, with no dominant strategy) and README.md are written. The README explains how to add an event.
- The game is playable end to end at http://127.0.0.1:5196 on desktop and at phone size. A Playwright test plays a full life from 18 to 65 to the ending screen with no console errors, at both sizes.
- After Phase 3 and again at the end, run a code review with a Sonnet subagent and fix the high and medium findings.
- Save screenshots of the card, the year-end summary and the ending screen at both sizes in `shots/`.
- Finish with a worker_done report:
  - how to run it
  - the screenshot paths
  - the balance result in 3 lines
  - the Cantonese list
  - the assumptions
  - what isn't finished or wasn't checked
  Be honest about anything left unchecked.

Leo will look at it in Chrome himself, so leave the dev server running when you finish.
