import { hiddenTraitsIn } from './conditions';
import type { GameEvent } from './types';

/** Template variables a text may use; the UI fills them. */
export const TEXT_VARS = ['cardDebt', 'cash', 'salary', 'age', 'rent'];

/** Every locale key an event needs. */
export function requiredKeys(e: GameEvent): string[] {
  const k = [`ev.${e.id}.text`];
  if (e.jargon) k.push(`ev.${e.id}.textLow`);
  for (const c of e.choices) {
    const b = `ev.${e.id}.${c.id}`;
    k.push(b, `${b}.why`);
    if (c.literacyHint) k.push(`${b}.hint`);
    if (c.hidden) k.push(`${b}.fine`);
    for (const o of c.outcomes ?? []) k.push(`${b}.${o.id}`);
  }
  return k;
}

/** Content checks that make adding an event safe. Returns human-readable errors; empty = valid. */
export function validateContent(events: readonly GameEvent[], locales: Record<string, Record<string, string>>): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const e of events) {
    if (ids.has(e.id)) errors.push(`duplicate event id ${e.id}`);
    ids.add(e.id);
  }
  const expected = new Set<string>();
  for (const e of events) {
    const where = `event ${e.id}`;
    if (e.choices.length < 2 || e.choices.length > 4) errors.push(`${where}: needs 2-4 choices, has ${e.choices.length}`);
    if (!e.choices.some((c) => !c.requires)) errors.push(`${where}: at least one choice must have no requirement`);
    const cids = e.choices.map((c) => c.id);
    if (new Set(cids).size !== cids.length) errors.push(`${where}: duplicate choice ids`);
    if (e.ageRange[0] < 18 || e.ageRange[1] > 65 || e.ageRange[0] > e.ageRange[1]) errors.push(`${where}: bad ageRange`);
    if (e.weight <= 0) errors.push(`${where}: weight must be > 0`);
    const hiddenUsed = [...hiddenTraitsIn(e.conditions), ...(e.weightMods ?? []).flatMap((m) => hiddenTraitsIn(m.when))];
    if (hiddenUsed.length && (!e.reveals || !hiddenUsed.includes(e.reveals))) {
      errors.push(`${where}: conditions use hidden trait(s) ${hiddenUsed.join(', ')} so it must set reveals to one of them`);
    }
    for (const c of e.choices) {
      for (const d of c.delayed ?? []) {
        if (d.eventId && !events.some((x) => x.id === d.eventId)) errors.push(`${where}.${c.id}: delayed eventId ${d.eventId} does not exist`);
        if (d.afterTurns < 1) errors.push(`${where}.${c.id}: afterTurns must be >= 1`);
      }
      const outcomeHidden = (c.outcomes ?? []).flatMap((o) => (o.weightMods ?? []).flatMap((m) => hiddenTraitsIn(m.when)));
      const hooked = (c.traitHooks ?? []).map((h) => h.trait as string);
      for (const t of [...outcomeHidden, ...hiddenTraitsIn(c.requires)]) {
        if (!hooked.includes(t) && e.reveals !== t) errors.push(`${where}.${c.id}: uses hidden trait ${t} without a traitHook or reveals`);
      }
      if (c.tags.length === 0) errors.push(`${where}.${c.id}: needs at least one tag`);
    }
    for (const k of requiredKeys(e)) expected.add(k);
  }
  for (const [lang, dict] of Object.entries(locales)) {
    for (const k of expected) if (!dict[k]) errors.push(`[${lang}] missing text ${k}`);
    for (const k of Object.keys(dict)) {
      if (k.startsWith('ev.') && !expected.has(k)) errors.push(`[${lang}] unused text key ${k}`);
      const vars = [...dict[k].matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      for (const v of vars) if (!TEXT_VARS.includes(v)) errors.push(`[${lang}] ${k} uses unknown variable {${v}}`);
    }
  }
  return errors;
}
