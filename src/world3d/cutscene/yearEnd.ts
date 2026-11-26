import * as THREE from 'three';
import type { Regime } from '../../engine/types';
import type { Lang } from '../../i18n';
import { translate } from '../../i18n';
import type { StageApi } from '../contracts';
import type { Qualities, Quality } from '../qualities';
import { C, ball, stars, type Area } from './fx';
import { aim, cutBox, openingShot } from './frame';
import { NEUTRAL, bump, grade, lerp, setSky, skyAt, smooth, type Grade } from './look';
import { topChanges } from './logic';
import { createOverlay, el } from './overlay';
import { createPropSet, REF_VIEW, setOpacity } from './props';
import { ct } from './text';
import { runTimeline } from './timeline';
import { makeYearFx } from './yearFx';

export interface YearEndInfo {
  age: number;
  regime: Regime;
  before: Qualities;
  after: Qualities;
  headlineKey?: string;
  lang: Lang;
}

const SECONDS = 5.2;
const REDUCED_SECONDS = 1.5;
const CARD_AT = 1.9; // seconds in
const SKIP_ROW = 76; // the skip button and the top of the picture
const CARD_GAP = 26; // the card's margin from the bottom (cutscene.css)
const DELTA_ICON: Record<Quality, string> = { wealth: '💰', safety: '☂️', joy: '😊', bonds: '💞', freedom: '🕊️', growth: '🌱' };
/** how big a move reads: one, two or three arrows, so a swing of 100 points is not shown as a crash number */
export const arrows = (d: number): string => (d > 0 ? '▲' : '▼').repeat(Math.abs(d) >= 30 ? 3 : Math.abs(d) >= 10 ? 2 : 1);

/** Screen area (half extents, at REF_VIEW) an anchored effect must cover, with a margin. Anchored props are scaled with the camera, so this holds at any zoom. */
export function viewArea(viewHeight: number = REF_VIEW): Area {
  const { w, h } = cutBox(), aspect = Math.max(0.4, w / Math.max(1, h));
  return { w: (viewHeight * aspect) / 2 * 1.2 + 0.6, h: (viewHeight / 2) * 1.2 + 0.6 };
}

function skyKeys(base: number, regime: Regime): ReadonlyArray<readonly [number, number]> {
  if (regime === 'crash') return [[0, base], [0.25, 0x7f98b8], [0.5, 0x5f7aa6], [0.7, 0x8fa8c8], [1, base]];
  // a bright dusk: peach, a deep but clear blue night, then a golden dawn back to the day sky (blue into gold never passes through mauve)
  return [[0, base], [0.22, C.peach], [0.4, 0x6f8fe0], [0.52, 0x4a6bc2], [0.62, 0x6fb0f0], [0.76, 0xffe6b8], [1, base]];
}

function buildCard(info: YearEndInfo): HTMLElement {
  const card = el('div', 'ml-cut-card');
  card.append(el('h2', 'ml-cut-card__title', ct(info.lang, 'cutscene.year.title', { age: Math.floor(info.age) })));
  const head = info.headlineKey ? translate(info.lang, info.headlineKey) : ct(info.lang, 'cutscene.year.' + info.regime);
  card.append(el('p', 'ml-cut-card__sub', head));
  const changes = topChanges(info.before, info.after);
  if (changes.length === 0) { card.append(el('p', 'ml-cut-card__sub', ct(info.lang, 'cutscene.year.quiet'))); return card; }
  const list = el('ul', 'ml-cut-card__list');
  for (const c of changes) {
    const row = el('li', 'ml-cut-card__row ml-cut-card__row--' + (c.d > 0 ? 'up' : 'down'));
    row.append(el('span', 'ml-cut-card__icon', DELTA_ICON[c.q]), el('span', 'ml-cut-card__label', translate(info.lang, 'hex.q.' + c.q)), el('span', 'ml-cut-card__arrows', arrows(c.d)));
    list.append(row);
  }
  card.append(list);
  return card;
}

function nightGrade(u: number, regime: Regime): Grade {
  const n = bump(u, 0.28, 0.42, 0.58, 0.72);
  const rainy = regime === 'crash' ? 1 - smooth((u - 0.5) / 0.2) : 0;
  return { sat: 1 - 0.08 * n - 0.25 * rainy, tint: [lerp(1, 0.8, n), lerp(1, 0.86, n), 1] };
}

/**
 * The end-of-year vignette: the sun sets and rises over the neighbourhood, the camera arcs, weather follows the
 * market regime, and a card lists what changed. The caller has already called setWorld with the new state.
 * Tap, space or Esc skips; reduced motion shows a still for about a second and a half.
 */
export async function playYearEnd(stage: StageApi, info: YearEndInfo, opts: { at?: number } = {}): Promise<void> {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { state, target, hold } = stage.camera();
  const saved = { ...state };
  const bg = stage.scene.background;
  const baseSky = bg instanceof THREE.Color ? bg.getHex() : C.sky;
  const duration = reduced ? REDUCED_SECONDS : SECONDS;
  const area = viewArea();
  const ps = createPropSet(stage);
  const ov = createOverlay({ mode: 'tap', skipText: ct(info.lang, 'cutscene.skip') });
  const card = buildCard(info);
  ov.root.append(card);
  const box = cutBox(), ins = { top: SKIP_ROW, bottom: card.offsetHeight + CARD_GAP + 12, right: 0 };
  const hero = stage.avatar().group.position;
  const shot = openingShot(stage, hero, saved.viewHeight, ins, saved.yaw, state.pitch);
  stage.setControls(false);
  hold(true);
  try {
    const fx = reduced ? () => undefined : makeYearFx(ps, area, info.regime);
    const sun = ps.add((b) => ball(b, 0, 0, 1.1, C.sun, { halo: 2.6, haloColor: C.peach }), { anchored: true, depth: -30, glow: 0.3 });
    const moon = ps.add((b) => ball(b, 0, 0, 0.7, C.cream, { halo: 2.2, haloColor: C.pale }), { anchored: true, depth: -30, glow: 0.2 });
    const night = ps.add((b) => stars(b, area, 70), { anchored: true, depth: -30, glow: 0.3 });
    const keys = skyKeys(baseSky, info.regime);
    await runTimeline(stage, ov, { duration, at: opts.at }, (c) => {
      const u = reduced ? 1 : Math.min(1, c / duration);
      setSky(stage.scene, skyAt(keys, u));
      grade(stage.scene, reduced ? NEUTRAL : nightGrade(u, info.regime));
      state.viewHeight = lerp(shot.viewHeight, shot.viewHeight * 0.94, smooth(u));
      state.yaw = saved.yaw + 0.4 * smooth(u);
      aim(target, shot.centre, state.viewHeight, state.yaw, state.pitch, box, ins);
      const sunK = reduced ? 0 : 1 - bump(u, 0.3, 0.42, 0.58, 0.7);
      sun.node.position.set(-area.w * 0.45 + area.w * 0.5 * u, area.h * (0.78 - 0.34 * Math.sin(Math.min(1, u / 0.45) * Math.PI * 0.5) + 0.34 * smooth((u - 0.55) / 0.45)), 0);
      setOpacity(sun, sunK);
      moon.node.position.set(lerp(-area.w * 0.55, area.w * 0.55, u), area.h * 0.8 - Math.sin(u * Math.PI) * 0.1 * area.h, 0);
      setOpacity(moon, reduced ? 0 : bump(u, 0.3, 0.42, 0.58, 0.7));
      setOpacity(night, reduced ? 0 : bump(u, 0.32, 0.45, 0.55, 0.68));
      fx(u, c);
      ps.sync(c);
      card.classList.toggle('ml-cut-card--on', reduced || c >= CARD_AT);
    });
  } finally {
    ps.dispose();
    ov.dispose();
    grade(stage.scene, NEUTRAL);
    setSky(stage.scene, baseSky);
    Object.assign(state, saved);
    hold(false);
    stage.setControls(true);
  }
}