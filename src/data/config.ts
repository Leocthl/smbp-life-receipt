// Game-wide tuning knobs. Content lives in other data files.
export const CONFIG = {
  /** show portfolio on the live stats bar; by default only in the year-end summary */
  showPortfolioLive: false,
  startAge: 18,
  uniTurns: 8,          // one per semester, ages 18-22
  retireAge: 65,
  /** turns = 8 semesters + 43 working years (22..64) */
  get totalTurns() { return this.uniTurns + (this.retireAge - 22); },
  startHappiness: 60,
  startRelationships: 55,
  happinessBaseline: 55,
  relationshipsBaseline: 50,
  /** pull towards baseline per year */
  driftPerYear: 0.12,
  /** happiness baseline from everyday lifestyle spending: +1 per this many HK$/month, capped */
  lifestylePerPoint: 1_000,
  lifestyleCap: 12,
  /** each 'fun' decision leaves a lasting memory: +1 to the baseline, capped */
  memoryCap: 10,
  /** months of expenses kept as a buffer before auto-repaying card debt */
  cardRepayBufferMonths: 1,
  /** credit line before auto personal loan kicks in, in months of income (students: fixed) */
  cardLimitMonths: 2,
  studentCardLimit: 10_000,
  /** bankruptcy if unsecured debt exceeds this many months of income (or fixed for students) */
  bankruptcyMonths: 30,
  studentBankruptcy: 120_000,
  /** years before a bankrupt is discharged (HK: normally 4) */
  bankruptcyYears: 4,
  /** happiness baseline penalty while bankrupt */
  bankruptcyStress: 12,
  /** ASSUMPTION: cap on living-cost borrowing from TSFS/NLS per study year */
  studentLivingLoanPerYear: 70_000,
  /** ASSUMPTION: card debt above the limit is rolled by the bank into a 5-year personal loan */
  restructureYears: 5,
  /** ASSUMPTION: when costs outrun income with no cushion, households cut back by this share each year */
  beltTighten: { lifestyle: 0.5, living: 0.85, happiness: 3 },
  /** stress per year when runway below 1 month */
  lowRunwayStress: 6,
  /** events per turn by age band: [maxAge, chance of 1st card, chance of 2nd card] */
  cardsPerTurn: [
    [22, 1, 0.25],
    [26, 1, 0.45],
    [36, 1, 0.2],
    [66, 0.55, 0],
  ] as [number, number, number][],
  /** real pay rise on top of inflation (ASSUMPTION: HK real wage growth ~1-2%/yr, more for high-standing grads) */
  annualRaise: { low: 0.01, mid: 0.015, high: 0.025 },
  /** salary growth stops rising faster than inflation after this age */
  careerPeakAge: 45,
  /** share of each pay rise that quietly becomes everyday spending (lifestyle creep) */
  lifestyleCreep: 0.25,
  /** when pay is cut, everyday spending shrinks by this share of the cut (people downshift) */
  downshift: 0.5,
  /** brokerage / platform cost per buy, as a fraction */
  tradeCost: { index: 0.001, bond: 0.001, stock: 0.003, crypto: 0.01, savings: 0, property: 0 },
} as const;
