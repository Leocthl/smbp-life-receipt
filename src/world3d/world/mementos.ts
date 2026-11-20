import type { Category } from '../../engine/types';
import type { Memento, Scope } from '../descriptor';
import { drawProp, type Surf } from './props';
import { BEDROOM_SLOTS, LIVING_SLOTS, SCOPE_SCALE, zonesFor, type Slot, type SlotType } from './slots';
import type { Ctx } from './ctx';

// Every decision leaves a keepsake. Placement is seeded by eventId + turn, so a prop never jumps when the world rebuilds.

const ACCENT: Record<Category, number> = { investing: 0x4cc3d9, family: 0xb9a7ff, health: 0x7ed07a, housing: 0xfff6dc, friends: 0xff8a6b, career: 0xffd85a, daily: 0xffc29b };

const PREFER: Record<string, SlotType[]> = {
  save: ['shelf', 'desk', 'floor'], invest: ['floor', 'shelf'], risky: ['desk', 'wall', 'floor'], spend: ['floor', 'desk'], fun: ['floor', 'wall', 'shelf'],
  family: ['shelf', 'wall', 'desk'], career: ['desk', 'wall'], work: ['desk', 'wall'], debt: ['floor', 'desk'], insure: ['floor'],
  status: ['desk', 'shelf'], safe: ['floor'], sell: ['shelf', 'desk'], hold: ['shelf', 'desk'], none: ['floor', 'shelf'],
};
const ANY: SlotType[] = ['floor', 'desk', 'shelf', 'wall'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

/** 0.75 .. 1.65 from the money a decision moved. */
const sizeOf = (m: Memento) => Math.min(1.65, 0.75 + 0.3 * Math.log10(1 + Math.abs(m.netWorthDelta) / 1000));

function takeSlot(groups: Slot[][], used: Set<Slot>, m: Memento): Slot | null {
  const prefer = [...(PREFER[m.tag] ?? PREFER.none), ...ANY];
  for (const slots of groups) for (const type of prefer) {
    const free = slots.filter((s) => s.type === type && !used.has(s));
    if (free.length > 0) { const s = free[Math.floor(hash(m.eventId + m.turn + type) * free.length)]; used.add(s); return s; }
  }
  return null;
}

function opts(ctx: Ctx, m: Memento, scale: number, x: number, y: number, z: number) {
  const grow = Math.max(0, Math.min(1.6, (ctx.d.age - m.age) / 12));
  const fill = Math.max(0.25, Math.min(1, 0.3 + Math.abs(m.netWorthDelta) / 30000 + (ctx.d.age - m.age) / 30));
  return { x, y, z, s: sizeOf(m) * scale, acc: ACCENT[m.category] ?? 0xffc29b, grow, fill };
}

/** Draws one keepsake per decision; the newest goes on the fresh surface so the stage can grow just that prop. */
export function buildMementos(ctx: Ctx, scope: Scope, props: Surf, fresh: Surf): void {
  const ms = ctx.d.mementos, indoor = scope === 'room' || scope === 'home';
  const used = new Set<Slot>();
  const groups = scope === 'home' ? [BEDROOM_SLOTS, LIVING_SLOTS] : [BEDROOM_SLOTS];
  ms.forEach((m, i) => {
    const f = i === ms.length - 1 ? fresh : props, key = m.eventId + m.turn;
    if (indoor) {
      const slot = takeSlot(groups, used, m);
      const x = slot?.x ?? -0.5 + (i % 5) * 0.7, z = slot?.z ?? 0.3 + Math.floor(i / 5) * 0.5; // overflow: a row on the floor
      drawProp(f, m.tag, { ...opts(ctx, m, SCOPE_SCALE[scope], x, slot?.y ?? 0, z), wall: slot?.wall }, slot?.type === 'wall');
      return;
    }
    const zones = zonesFor(scope, m.tag), zn = zones[Math.floor(hash(key + 'z') * zones.length)];
    const x = zn.x0 + hash(key + 'x') * (zn.x1 - zn.x0), z = zn.z0 + hash(key + 'y') * (zn.z1 - zn.z0);
    drawProp(f, m.tag, opts(ctx, m, SCOPE_SCALE[scope], x, 0, z), false);
  });
}
