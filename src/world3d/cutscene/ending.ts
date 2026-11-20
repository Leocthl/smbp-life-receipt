import * as THREE from 'three';
import type { Lang } from '../../i18n';
import { translate } from '../../i18n';
import type { StageApi } from '../contracts';
import type { Qualities } from '../qualities';
import { type Fx, type Ctx, BREAKTHROUGH, WEATHER, sweepLight } from './endingFx';
import { FLAVOURS } from './flavours';
import { C, ball } from './fx';
import { asLabel, strongest, variant, weakest } from './logic';
import { buildCity, buildLand, buildPeople, buildSea } from './lookout';
import { NEUTRAL, bump, grade, lerp, mixGrade, setSky, skyAt, smooth, type Grade } from './look';
import { createOverlay, el, type Overlay } from './overlay';
import { createPropSet, setOpacity, type Prop } from './props';
import { ct } from './text';
import { cueRunner, runTimeline } from './timeline';
import { viewArea } from './yearEnd';

export interface EndingInfo {
  /** saverKing | moonlight | steady | riskWinner | rollercoaster | zenInvestor | debtJuggler | exitOnRed | familyPillar */
  label: string;
  q: Qualities;
  goalHit: boolean;
  age: number;
  lang: Lang;
}

// Clock, in seconds. Act 1 is the weak quality's weather, the turn is the strong quality breaking through,
// act 2 is the world transformed, then a cut to the hilltop at sunrise and the title card.
const T = { turn: 9.8, act2End: 19.4, cutOut: 19.4, hill: 20.8, line3: 22, card: 27, end: 33 } as const;
const HILL_AT: [number, number, number] = [-140, 0, 0]; // a long way along the camera's right axis, so the town never shows
const HILL_YAW = Math.PI;
const BRIGHT: Grade = { sat: 1.15, tint: [1.05, 1.02, 0.92] };
const NIGHT: Grade = { sat: 0.9, tint: [0.55, 0.6, 0.95] };

function buildTitle(info: EndingInfo, label: string): HTMLElement {
  const card = el('div', 'ml-cut-card');
  card.append(el('h2', 'ml-cut-card__title', translate(info.lang, 'label.' + label)));
  card.append(el('p', 'ml-cut-card__sub', ct(info.lang, 'cutscene.end.' + label)));
  card.append(el('p', 'ml-cut-card__goal', (info.goalHit ? '● ' : '○ ') + ct(info.lang, info.goalHit ? 'cutscene.goal.hit' : 'cutscene.goal.miss')));
  return card;
}

function washAt(c: number): number {
  const open = 1 - smooth(c / 1.2);
  const cut = smooth((c - 18.6) / 0.8) * (1 - smooth((c - T.hill) / 1.4));
  return Math.max(open, cut, smooth((c - (T.end - 1)) / 1));
}

function actSky(c: number, weatherSky: number, nightStart: boolean, base: number): number {
  if (c >= T.hill - 1) return skyAt([[T.hill - 1, C.slate], [T.hill + 0.8, 0xb9a7ff], [T.hill + 2.5, C.rose], [T.hill + 5, C.peach], [T.hill + 7, C.pale], [T.hill + 9.5, C.sky]], c);
  const keys: Array<readonly [number, number]> = nightStart
    ? [[0, base], [1.5, weatherSky], [T.turn, weatherSky], [T.turn + 1, C.ink], [14, C.ink], [16.5, C.peach], [18.5, C.sky]]
    : [[0, base], [1.5, weatherSky], [T.turn, weatherSky], [12, C.peach], [14.5, C.sky]];
  return skyAt(keys, c);
}

function actGrade(c: number, weather: Grade, nightStart: boolean): Grade {
  const intro = mixGrade(NEUTRAL, weather, smooth(c / 1.5));
  const turned = mixGrade(intro, nightStart ? NIGHT : BRIGHT, smooth((c - T.turn) / 2.4));
  return nightStart ? mixGrade(turned, BRIGHT, smooth((c - 14) / 3)) : turned;
}

function narration(c: number, lang: Lang, weak: string, strong: string): string {
  if (c >= 1.4 && c < T.turn - 0.2) return ct(lang, 'cutscene.act1.' + weak);
  if (c >= T.turn + 1.2 && c < T.act2End - 0.4) return ct(lang, 'cutscene.act2.' + strong);
  if (c >= T.line3 && c < T.card - 0.5) return ct(lang, 'cutscene.act3.age', { age: 65 });
  return '';
}

interface Hill { props: Prop[]; sun: Prop; update(c: number): void }

function buildHill(ps: ReturnType<typeof createPropSet>, info: EndingInfo, area: ReturnType<typeof viewArea>, flags: { partner: boolean; kids: number }, label: ReturnType<typeof asLabel>): Hill {
  const land = buildLand(ps, HILL_AT), city = buildCity(ps, HILL_AT), sea = buildSea(ps, HILL_AT);
  const people = buildPeople(ps, HILL_AT, info.q.bonds, flags);
  const sun = ps.add((b) => ball(b, 0, 0, 0.8, C.sun, { halo: 2.4, haloColor: C.glow }), { anchored: true, depth: 90, glow: 0.35 });
  const extra = FLAVOURS[label].hill?.({ ps, area, at: HILL_AT });
  const props = [land, city, sea, people];
  return {
    props, sun,
    update(c) {
      const on = c >= T.hill;
      props.forEach((p) => { p.root.visible = on; });
      const k = smooth((c - T.hill) / 8);
      sun.node.position.set(area.w * 0.25, lerp(2.2, 6.4, k), 0);
      setOpacity(sun, on ? 1 : 0);
      extra?.set(on ? 1 : 0, c);
    },
  };
}

function frameCamera(c: number, st: { yaw: number; pitch: number; viewHeight: number }, target: THREE.Vector3, o: { pos: THREE.Vector3; yaw0: number; pitch0: number; zoom: number }) {
  if (c >= T.hill - 0.8) {
    st.yaw = HILL_YAW + 0.1 * Math.sin(c * 0.25);
    st.pitch = 0.3;
    st.viewHeight = lerp(23, 19, smooth((c - T.hill) / 10));
    target.set(HILL_AT[0], 2.2, HILL_AT[2] + 2.5);
    return;
  }
  st.yaw = o.yaw0 + 0.55 * smooth(c / T.act2End);
  st.pitch = o.pitch0;
  st.viewHeight = c < T.turn ? lerp(o.zoom * 1.1, o.zoom, smooth(c / T.turn)) : lerp(o.zoom, 16, smooth((c - T.turn) / 4));
  target.set(o.pos.x, 1.0, o.pos.z);
}

/**
 * The ending, about 33 seconds: act 1 shows the weakest quality as weather, the strongest breaks through and the
 * world re-assembles, then a hilltop at sunrise with whoever the life brought, and a title card with one hopeful line.
 * Hold the screen or space for 4x; the button or Esc skips. Leaves the stage on the final world, camera released.
 */
export async function playEnding(stage: StageApi, info: EndingInfo, opts: { at?: number } = {}): Promise<void> {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const label = asLabel(info.label);
  const weak = weakest(info.q), strong = strongest(info.q, weak);
  const weather = WEATHER[weak], flavour = FLAVOURS[label];
  const { state, target, hold } = stage.camera();
  const saved = { ...state };
  const bg = stage.scene.background;
  const baseSky = bg instanceof THREE.Color ? bg.getHex() : C.sky;
  const d0 = stage.world();
  const area = viewArea(18);
  const ps = createPropSet(stage);
  const ov = createOverlay({ mode: 'hold', skipText: ct(info.lang, 'cutscene.skip'), hint: ct(info.lang, 'cutscene.hold') });
  const title = buildTitle(info, label);
  ov.root.append(title);
  stage.setControls(false);
  hold(true);
  try {
    const ctx: Ctx = { ps, area, pos: stage.avatar().group.position };
    const fx: Fx[] = [WEATHER[weak].make(ctx), BREAKTHROUGH[strong](ctx), ...(flavour.act2 ? [flavour.act2(ctx)] : [])];
    const sweep = sweepLight(ps, area);
    const hill = buildHill(ps, info, area, { partner: d0.partner, kids: d0.kids }, label);
    const cues = makeCues(stage, info, weak, strong);
    await runTimeline(stage, ov, { duration: reduced ? T.end - 1.5 : T.end, at: opts.at, from: reduced ? T.card : undefined, fastForward: true }, (c) => {
      cues(c);
      setSky(stage.scene, actSky(c, weather.sky, Boolean(flavour.nightStart), baseSky));
      grade(stage.scene, actGrade(c, weather.grade, Boolean(flavour.nightStart)));
      frameCamera(c, state, target, { pos: ctx.pos, yaw0: saved.yaw, pitch0: saved.pitch, zoom: weather.zoom ?? 15 });
      fx[0].set(bump(c, 0.6, 2.2, T.turn - 0.6, T.turn + 1), c);
      fx.slice(1).forEach((f) => f.set(bump(c, T.turn + 0.2, T.turn + 2.2, T.act2End - 0.8, T.act2End + 0.6), c));
      sweep.set(bump(c, T.turn - 0.4, T.turn + 0.8, T.turn + 2.2, T.turn + 3.2), c - T.turn);
      hill.update(c);
      ps.sync(c);
      void stage.fade(washAt(c), 0, C.cream);
      ov.line(narration(c, info.lang, weak, strong));
      title.classList.toggle('ml-cut-card--on', c >= T.card);
    });
  } finally {
    ps.dispose();
    ov.dispose();
    grade(stage.scene, NEUTRAL);
    setSky(stage.scene, baseSky);
    Object.assign(state, saved);
    hold(false);
    void stage.fade(0, 0, C.cream);
    stage.setControls(true);
  }
}

function makeCues(stage: StageApi, info: EndingInfo, weak: ReturnType<typeof weakest>, strong: ReturnType<typeof weakest>) {
  const d = stage.world();
  const at = (q: Qualities, regime: typeof d.regime) => () => stage.setWorld({ ...d, age: info.age, q, regime });
  return cueRunner([
    { at: 0, run: at(variant(weak, 6), weak === 'safety' ? 'crash' : 'correction') },
    { at: T.turn, run: at(variant(strong, 96), 'recovery') },
    { at: T.hill, run: at(info.q, 'normal') },
  ]);
}

export type { Overlay };
