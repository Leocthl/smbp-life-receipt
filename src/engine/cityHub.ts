import type { SpotId } from '../world3d/contracts';
import type { Scope } from '../world3d/descriptor';
import { highInterestDebt } from './finance';
import { makeRng, streamSeed } from './rng';
import type { GameState } from './types';

export type PinTag = 'money' | 'bonds' | 'mood' | 'risk';

export interface CityPin {
  id: string;
  spot: SpotId;
  kind: 'action' | 'encounter';
  tag: PinTag;
  icon: string;
  labelKey: string;
  subKey: string;
  urgent?: boolean;
  visited?: boolean;
}

export const AMBIENT_CHATTER_KEYS: readonly string[] = [
  'hub.chat.0', 'hub.chat.1', 'hub.chat.2', 'hub.chat.3',
  'hub.chat.4', 'hub.chat.5', 'hub.chat.6', 'hub.chat.7',
];

interface SpotPinMeta {
  icon: string;
  tag: PinTag;
  labelKey: string;
  subKey: string;
}

const ACTION_META: Record<SpotId, SpotPinMeta> = {
  office: { icon: '💼', tag: 'money', labelKey: 'hub.pin.office', subKey: 'hub.pin.office.sub' },
  bank: { icon: '🏦', tag: 'money', labelKey: 'hub.pin.bank', subKey: 'hub.pin.bank.sub' },
  cafe: { icon: '☕', tag: 'bonds', labelKey: 'hub.pin.cafe', subKey: 'hub.pin.cafe.sub' },
  home: { icon: '🏠', tag: 'bonds', labelKey: 'hub.pin.home', subKey: 'hub.pin.home.sub' },
  market: { icon: '🧺', tag: 'mood', labelKey: 'hub.pin.market', subKey: 'hub.pin.market.sub' },
  park: { icon: '🌳', tag: 'mood', labelKey: 'hub.pin.park', subKey: 'hub.pin.park.sub' },
  clinic: { icon: '🏥', tag: 'mood', labelKey: 'hub.pin.clinic', subKey: 'hub.pin.clinic.sub' },
  campus: { icon: '🎓', tag: 'bonds', labelKey: 'hub.pin.campus', subKey: 'hub.pin.campus.sub' },
  pier: { icon: '⚓', tag: 'mood', labelKey: 'hub.pin.pier', subKey: 'hub.pin.pier.sub' },
};

const BASE_SPOTS: readonly SpotId[] = ['home', 'cafe', 'bank', 'office', 'clinic', 'market', 'park'];
const WIDE_SPOTS: readonly SpotId[] = ['campus', 'pier'];

/**
 * Generates 3–4 deterministic, state-aware city hub pins for the current year and world scope.
 * Always includes 1 random encounter pin on a remaining eligible spot.
 */
export function generateYearOpportunities(
  state: GameState,
  scope: Scope,
  visitedSpots: readonly SpotId[],
  nonce: number,
): CityPin[] {
  if (scope === 'room' || scope === 'home') return [];

  const eligible: SpotId[] =
    scope === 'district' || scope === 'city' ? [...BASE_SPOTS, ...WIDE_SPOTS] : [...BASE_SPOTS];

  const rng = makeRng(streamSeed(state.seed, `hub:${state.turn * 31 + nonce}`));
  const totalCount = Math.min(eligible.length, 3 + rng.int(2));
  const actionLimit = Math.max(1, totalCount - 1);

  const used = new Set<SpotId>();
  const actionPicks: { spot: SpotId; urgent: boolean }[] = [];

  const addAction = (spot: SpotId, urgent = false) => {
    if (actionPicks.length >= actionLimit || used.has(spot) || !eligible.includes(spot)) return;
    used.add(spot);
    actionPicks.push({ spot, urgent });
  };

  // 1. Recovery priority when burnt out or low happiness.
  if (state.flags.includes('burnt_out') || state.happiness < 45) {
    const recoveryPool: SpotId[] = eligible.includes('pier') ? ['clinic', 'park', 'pier'] : ['clinic', 'park'];
    addAction(rng.pick(recoveryPool), true);
  }

  // 2. Finance priority when holding meaningful cash or carrying debt.
  if (state.cash >= 10_000 || state.debts.some((d) => d.balance > 0)) {
    addAction('bank', highInterestDebt(state) > 0);
  }

  // 3. Work/social priority when employed.
  if (state.job === 'employed') {
    const workPool = (['office', 'cafe'] as const).filter((s) => !used.has(s));
    if (workPool.length > 0) addAction(rng.pick(workPool), false);
  }

  // Fill remaining action slots from unused eligible spots (preferring unvisited spots first).
  while (actionPicks.length < actionLimit) {
    const remaining = eligible.filter((s) => !used.has(s));
    if (remaining.length === 0) break;
    const unvisited = remaining.filter((s) => !visitedSpots.includes(s));
    const pool = unvisited.length > 0 ? unvisited : remaining;
    addAction(rng.pick(pool), false);
  }

  const pins: CityPin[] = actionPicks.map(({ spot, urgent }) => {
    const meta = ACTION_META[spot];
    return {
      id: `hub-${state.turn}-${nonce}-${spot}`,
      spot,
      kind: 'action',
      tag: meta.tag,
      icon: meta.icon,
      labelKey: meta.labelKey,
      subKey: meta.subKey,
      ...(urgent ? { urgent: true } : {}),
      visited: visitedSpots.includes(spot),
    };
  });

  // Always reserve 1 pin on a remaining spot for a live encounter.
  const encounterPool = eligible.filter((s) => !used.has(s));
  if (encounterPool.length > 0) {
    const unvisitedEncounter = encounterPool.filter((s) => !visitedSpots.includes(s));
    const spot = rng.pick(unvisitedEncounter.length > 0 ? unvisitedEncounter : encounterPool);
    pins.push({
      id: `hub-${state.turn}-${nonce}-${spot}-encounter`,
      spot,
      kind: 'encounter',
      tag: 'risk',
      icon: '🎲',
      labelKey: 'hub.pin.encounter',
      subKey: 'hub.pin.encounter.sub',
      visited: visitedSpots.includes(spot),
    });
  }

  return pins;
}
