// Hong Kong money facts used by the simulation. Checked 2026-11-20 by web search.
// Every number carries its source. "ASSUMPTION" means no firm 2026 source was found;
// those are also listed in PROGRESS.md.

export const HK = {
  mpf: {
    // MPFA, Mandatory contributions: 5% employee + 5% employer of relevant income.
    // https://www.mpfa.org.hk/en/mpf-system/mandatory-contributions
    rate: 0.05,
    // MPFA: minimum relevant income HK$7,100/month (employee pays nothing below it; employer still pays).
    minIncome: 7_100,
    // MPFA: maximum relevant income HK$30,000/month, so the cap is HK$1,500 each side.
    // A 2026 review proposes HK$10,500 / HK$40,000 but it was not adopted as of Nov 2026 (MPFA press release 2026-03-08).
    maxIncome: 30_000,
    // MPFA: benefits payable at 65 as a lump sum or in instalments.
    // https://www.mpfa.org.hk/en/mpf-system/withdrawal-of-benefits
    withdrawAge: 65,
    // MPFA DIS: service fee cap 0.75% + out-of-pocket cap 0.2% = 0.95% aggregate.
    // https://www.mpfa.org.hk/en/mpf-investment/portfolio/default-investment-strategy
    defaultFundFee: 0.0095,
    // MPFA: average fund expense ratio 1.35% (Sep 2023); actively managed HK equity funds ~1.43% (WTW citing MPFA, 2025).
    equityFundFee: 0.0143,
  },
  study: {
    // Government schedule (June 2024 announcement) confirmed by HKUST/CityU fee pages: HK$47,000 for 2026/27.
    tuitionPerYear: 47_000,
    // TSFS (means-tested): 1% p.a., interest only from repayment start, 15-year standard term. (HKBU SFA guide; SCMP)
    tsfsRate: 0.01,
    // NLSPS/NLSFT (non-means-tested): 2.173% p.a. from drawdown (HKU CEDARS page, updated 2025-12-01).
    nlsRate: 0.02173,
    // Standard repayment period 15 years (SCMP; LegCo ED paper 2011-12 extended 10 to 15 years).
    repayYears: 15,
  },
  credit: {
    // HKMA consumer guide illustrates 2.5%/month = 35% APR; issuer key facts statements show ~26%-34%.
    // https://www.hkma.gov.hk/eng/smart-consumers/credit-cards/
    cardApr: 0.35,
    // Personal instalment loans: ads say "as low as" ~1.3%-1.9% for top borrowers; HSBC 2025 redraw 18.12%.
    // ASSUMPTION: 12% is a typical rate for a young borrower with a thin credit file.
    personalLoanApr: 0.12,
    // HKMA: average new mortgage rate 3.26% (Jan 2026); CCB example H+1.3% = 3.25% (Mar 2026).
    mortgageRate: 0.0325,
  },
  pay: {
    // Job-portal data Q1 2026: graduate median starting pay HK$20,000, average HK$21,000 (The Standard).
    // HKBU GBA survey 2026: HK$19,500 flat. Standing adjusts around this.
    gradStart: { low: 17_500, mid: 20_000, high: 24_000 },
    // C&SD: median monthly employment income HK$23,000 (May-Jul 2026).
    medianMonthly: 23_000,
    // ASSUMPTION: student part-time / tutoring HK$150-250/hour, ~40 hours a month.
    partTimeMonthly: 6_000,
  },
  living: {
    // ASSUMPTION: student transport, phone, lunches ~HK$3,000/month living at home.
    studentLiving: 3_000,
    // ASSUMPTION: young worker food, transport, phone, basics ~HK$6,000/month.
    workerLiving: 6_000,
    // 2026 co-living listings HK$8,900-9,700 per room (Hmlet); CUHK survey subdivided flats avg HK$5,000.
    roomRent: 8_500,
    // Co-living studio HK$15,825/month (Hmlet 2026 listing). ASSUMPTION: a small studio ~HK$14,000.
    studioRent: 14_000,
  },
  rates: {
    // Syfe comparison 2026-11-02: best 3-month HKD time deposit 3.15%; standard savings ~0.001%.
    // ASSUMPTION: a player rolling time deposits earns ~2.5% on average over a life.
    savings: 0.025,
    // Composite CPI 1.9% (Sep 2026, C&SD); MPFA uses 1.8% annualised inflation since 2000.
    inflation: 0.02,
  },
  tax: {
    // IRD salaries tax: basic allowance HK$132,000; bands of HK$50,000 at 2/6/10/14%, then 17%.
    // https://www.ird.gov.hk/eng/tax/ind_stp.htm
    basicAllowance: 132_000,
    bandWidth: 50_000,
    bandRates: [0.02, 0.06, 0.1, 0.14],
    topRate: 0.17,
    // IRD: MPF mandatory contributions deductible up to HK$18,000 a year.
    mpfDeductionCap: 18_000,
  },
  insurance: {
    // Insurance Authority caps illustrated IRR at 6.0% for HKD plans (from 2025-07-01, via 10Life).
    // Endowus example: 4.72% IRR at 100% bonus fulfilment, 3.38% at 60%. We draw a realised IRR between those.
    irrLow: 0.025,
    irrHigh: 0.045,
    // Bowtie example: first-year surrender of a 5-year plan can mean -13% IRR; break-even years 1-10.
    // ASSUMPTION: surrender value = 40% of account value in year 1, +8 points a year, full from year 8.
    surrenderBase: 0.4,
    surrenderStep: 0.08,
  },
  // IFEC study: average monthly allowance to parents HK$5,590 (sandwich-generation parents, 2019).
  // ASSUMPTION: a working young adult living at home gives HK$3,000-6,000.
  familyAllowanceWorking: { low: 6_000, middle: 4_000, high: 2_500 },
} as const;
