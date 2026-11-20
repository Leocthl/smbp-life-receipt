// Core engine types. The engine is pure: state in, new state + events out. No UI, no text.

export type AssetId = 'savings' | 'index' | 'bond' | 'stock' | 'crypto' | 'mpf' | 'insurance' | 'property';
export const ASSET_IDS: readonly AssetId[] = ['savings', 'index', 'bond', 'stock', 'crypto', 'mpf', 'insurance', 'property'];
export type MarketAsset = Exclude<AssetId, 'insurance'> | 'mpfEquity' | 'cash';
export type Regime = 'bull' | 'normal' | 'correction' | 'crash' | 'recovery';
export type DebtKind = 'studentLoan' | 'creditCard' | 'personalLoan' | 'mortgage';
export type Temperament = 'impulsive' | 'lossAnxious' | 'fomo' | 'steady';
export type Literacy = 'low' | 'medium' | 'high';
export type FamilyTier = 'low' | 'middle' | 'high';
export type Standing = 'low' | 'mid' | 'high';
export type Category = 'daily' | 'investing' | 'career' | 'health' | 'family' | 'friends' | 'housing';
export type Goal = 'security' | 'freedom' | 'experiences' | 'family' | 'status';
export type Speaker =
  | 'friend' | 'agent' | 'landlord' | 'headline' | 'boss' | 'doctor' | 'parent' | 'bank'
  | 'self' | 'partner' | 'phone' | 'campus';
/** Behaviour tags on choices: bots pick by them and ending labels count them. */
export type Tag =
  | 'save' | 'invest' | 'risky' | 'spend' | 'safe' | 'debt' | 'family' | 'career'
  | 'sell' | 'hold' | 'fun' | 'status' | 'insure' | 'work';
export type HiddenTalent = 'freelancing' | 'negotiation' | 'networking';
export type VisibleTalent = 'tutoring' | 'design' | 'coding' | 'sports' | 'music';
/** Trait ids that can be revealed by events. */
export type TraitId = Temperament | 'chronic' | 'familyHistory' | 'fragileMind' | Literacy | HiddenTalent;

export interface Character {
  familyTier: FamilyTier;
  /** 家用 the player owes per month while living at home (HK$). */
  familyAllowance: number;
  familyDebt: number;
  /** Monthly help parents can give during uni (HK$). */
  parentHelp: number;
  siblingsToSupport: number;
  gpa: number;
  standing: Standing;
  talents: VisibleTalent[];
  hidden: {
    temperament: Temperament;
    chronic: boolean;
    familyHistory: boolean;
    fragileMind: boolean;
    literacy: Literacy;
    talents: HiddenTalent[];
  };
}

export interface Debt { kind: DebtKind; balance: number; rate: number; /** fixed monthly instalment, 0 = revolving */ instalment: number; }

export interface InsurancePlan {
  annualPremium: number;
  premiumYears: number;
  yearsPaid: number;
  /** account value before surrender charges */
  accountValue: number;
  startTurn: number;
}

export interface Pending { dueTurn: number; source: string; effect?: Effect; eventId?: string; when?: Condition; }

export interface CounterfactualRecord {
  /** what the money actually became */
  actual: MarketAsset | 'spent';
  /** the road not taken */
  alt: MarketAsset | 'spent';
  amount: number;
  key: string;
}

export interface DecisionLogEntry {
  turn: number;
  age: number;
  eventId: string;
  choiceId: string;
  outcomeId?: string;
  tags: Tag[];
  snapshot: { cash: number; netWorth: number; runway: number; happiness: number };
  /** immediate change in net worth from this decision */
  netWorthDelta: number;
  counterfactual?: CounterfactualRecord;
}

export interface TurnRecord {
  turn: number;
  age: number;
  regime: Regime;
  cash: number;
  netWorth: number;
  runway: number;
  happiness: number;
  relationships: number;
  income: number;
  spending: number;
  fees: number;
  highInterestDebt: number;
  investedRisky: number;
}

export interface MarketState {
  /** base regimes, one per life-year index (age 18 = 0) generated up front from the market stream */
  baseRegimes: Regime[];
  /** per-year standard-normal shocks per asset, generated up front */
  shocks: Record<string, number[]>;
  inflationShocks: number[];
  /** realised regime per year (after protection rules) */
  regimes: Regime[];
  /** price level per asset at the start of each turn (index = turn) */
  levels: Record<MarketAsset, number[]>;
  firstInvestTurn: number | null;
}

export interface Rngs { event: number; outcome: number; }

export interface GameState {
  seed: number;
  turn: number;
  age: number;
  done: boolean;
  character: Character;
  cash: number;
  happiness: number;
  relationships: number;
  job: 'student' | 'employed' | 'unemployed' | 'retired';
  /** monthly gross salary (HK$), 0 when not working */
  salary: number;
  /** monthly part-time / side income */
  sideIncome: number;
  /** the part of sideIncome that is a side business and survives graduation */
  hustle: number;
  /** turn of the last bankruptcy (no unsecured credit for a while after) */
  bankruptTurn: number | null;
  expenses: { rent: number; living: number; family: number; lifestyle: number };
  holdings: Record<Exclude<AssetId, 'insurance'>, number>;
  mpfFund: 'default' | 'equity';
  insurance: InsurancePlan | null;
  debts: Debt[];
  flags: string[];
  revealed: TraitId[];
  cooldowns: Record<string, number>;
  seen: Record<string, number>;
  pending: Pending[];
  /** event ids forced to appear next turn */
  queue: string[];
  decisionLog: DecisionLogEntry[];
  history: TurnRecord[];
  market: MarketState;
  rng: Rngs;
  /** running totals for the year-end summary and endings */
  totals: {
    fees: number; interest: number; surrenderLoss: number; bankruptcies: number;
    /** fees a player chose: trading costs and fund fees above a plain index fund (excludes MPF, deposits, property costs) */
    avoidableFees: number;
    /** this year so far (reset at each year-end summary) */
    turnIncome: number; turnSpending: number; turnFees: number; turnInterest: number; yearStartCash: number;
  };
  bankrupt: boolean;
}

// ---------- content DSL ----------

export type Stat = 'cash' | 'runway' | 'happiness' | 'relationships' | 'age' | 'salary' | 'netWorth'
  | 'debtHighInterest' | 'investedRisky' | 'gpa' | 'siblings' | 'familyDebt'
  /** cash + savings + index + bond + stock + crypto (MPF and property excluded: not spendable) */
  | 'liquid'
  /** monthly income minus monthly costs (negative = living beyond income) */
  | 'monthlyNet';

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { stat: Stat; op: '<' | '<=' | '>' | '>=' | '=='; value: number }
  | { flag: string }
  | { temperament: Temperament }
  | { literacy: Literacy }
  | { familyTier: FamilyTier }
  | { standing: Standing }
  | { talent: VisibleTalent | HiddenTalent }
  | { trait: 'chronic' | 'familyHistory' | 'fragileMind' }
  | { job: GameState['job'] }
  | { holds: AssetId; min?: number }
  | { debt: DebtKind }
  | { regime: Regime | Regime[] }
  | { chance: number };

/** A money amount: fixed, or scaled from current state. */
export type Amount = number | {
  of: 'monthlyIncome' | 'monthlyExpense' | 'cash' | 'holding' | 'debt';
  x: number;
  asset?: AssetId;
  debt?: DebtKind;
  min?: number;
  max?: number;
};

export interface Effect {
  cash?: Amount;
  happiness?: number;
  relationships?: number;
  invest?: { asset: Exclude<AssetId, 'insurance' | 'mpf'>; amount: Amount };
  sell?: { asset: Exclude<AssetId, 'mpf'>; fraction: number }[];
  borrow?: { kind: DebtKind; amount: Amount; rate?: number; years?: number };
  repay?: { kind: DebtKind; amount: Amount };
  salaryMult?: number;
  salarySet?: Amount;
  sideIncome?: number;
  /** side-business income: like sideIncome but survives graduation */
  hustle?: number;
  job?: GameState['job'];
  expense?: Partial<GameState['expenses']>;
  setFlags?: string[];
  clearFlags?: string[];
  mpfFund?: 'default' | 'equity';
  insurancePlan?: { annualPremium: Amount; years: number };
  buyProperty?: { price: Amount; downPct: number; rate: number; years: number };
  /** applies only if condition holds */
  when?: Condition;
}

export interface TraitHook { when: Condition; trait: TraitId; effects: Effect; }

export interface Outcome {
  id: string;
  weight: number;
  weightMods?: { when: Condition; mult: number }[];
  effects: Effect;
}

export interface Delayed { afterTurns: number; effects?: Effect; eventId?: string; when?: Condition; }

export interface CounterfactualSpec {
  actual: MarketAsset | 'spent';
  alt: MarketAsset | 'spent';
  amount: Amount;
  key: string;
}

export interface Choice {
  id: string;
  tags: Tag[];
  /** choice shown only if this holds (e.g. can afford it) */
  requires?: Condition;
  /** certain, visible effects */
  effects?: Effect;
  /** fine print: fees and charges the player may not notice */
  hidden?: Effect;
  outcomes?: Outcome[];
  delayed?: Delayed[];
  counterfactual?: CounterfactualSpec;
  /** literacy needed to see the hint text */
  literacyHint?: 'medium' | 'high';
  traitHooks?: TraitHook[];
}

export interface GameEvent {
  id: string;
  ageRange: [number, number];
  category: Category;
  speaker: Speaker;
  conditions?: Condition;
  weight: number;
  weightMods?: { when: Condition; mult: number }[];
  cooldown: number;
  once?: boolean;
  /** only appears when triggered by a delayed effect or queue */
  triggeredOnly?: boolean;
  /** hidden trait this event exposes the first time it fires (required if conditions use hidden traits) */
  reveals?: TraitId;
  /** event has a jargon-heavy text variant for low literacy */
  jargon?: boolean;
  choices: Choice[];
}

// ---------- engine outputs ----------

export interface Delta { cash: number; happiness: number; relationships: number; netWorthHint?: number; /** change in monthly income minus monthly costs */ monthly?: number }

export interface ChoiceResult {
  eventId: string;
  choiceId: string;
  outcomeId?: string;
  delta: Delta;
  reveals: TraitId[];
  /** flags or notices the UI can show (e.g. 'auto_borrow') */
  notices: string[];
}

export interface TurnSummary {
  turn: number;
  age: number;
  regime: Regime;
  income: number;
  spending: number;
  fees: number;
  interest: number;
  cashChange: number;
  portfolio: Record<string, number>;
  debts: { kind: DebtKind; balance: number; rate: number }[];
  notices: string[];
  reveals: TraitId[];
  yearEnd: boolean;
}
