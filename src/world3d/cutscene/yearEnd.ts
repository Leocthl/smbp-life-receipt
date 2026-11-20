import * as THREE from 'three';
import type { Regime } from '../../engine/types';
import type { Lang } from '../../i18n';
import { translate } from '../../i18n';
import type { StageApi } from '../contracts';
import type { Qualities } from '../qualities';
import { C, ball, stars, type Area } from './fx';
import { NEUTRAL, bump, grade, lerp, setSky, skyAt, smooth, type Grade } from './look';
import { topChanges } from './logic';
import { createOverlay, el } from './overlay';
import { createPropSet, setOpacity } from './props';
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
const MIN_VIEW = 13;

/** Screen area (half extents) an anchored effect must cover at this view height, with a margin. */
export function viewArea(viewHeight: number): Area {
  const aspect = Math.max(0.4, window.innerWidth / Math.max(1, window.innerHeight));
  return { w: (viewHeight * aspect) / 2 * 1.2 + 0.6, h: (viewHeight / 2) * 1.2 + 0.6 };
}

function skyKeys(base: number, regime: Regime): ReadonlyArray<readonly [number, number]> {
  if (regime === 'crash') return [[0, base], [0.25, C.slate], [0.5, C.ink], [0.7, C.slate], [1, base]];
  return [[0, base], [0.22, C.peach], [0.4, 0x3a4a6b], [0.52, C.ink], [0.7, C.rose], [1, base]];
}

function buildCard(info: YearEndInfo): HTMLElement {
  const card = el('div', 'ml-cut-card');
  card.append(el('h2', 'ml-cut-card__title', ct(info.lang, 'cutscene.year.title', { age: info.age })));
  const head = info.headlineKey ? translate(info.lang, info.headlineKey) : ct(info.lang, 'cutscene.year.' + info.regime);
  card.append(el('p', 'ml-cut-card__sub', head));
  const changes = topChanges(info.before, info.after);
  if (changes.length === 0) { card.append(el('p', 'ml-cut-card__sub', ct(info.lang, 'cutscene.year.quiet'))); return card; }
  const list = el('ul', 'ml-cut-card__list');
  for (const c of changes) {
    const row = el('li', 'ml-cut-card__row ml-cut-card__row--' + (c.d > 0 ? 'up' : 'down'));
    row.append(el('span', '', (c.d > 0 ? '▲ ' : '▼ ') + translate(info.lang, 'hex.q.' + c.q)), el('span', '', (c.d > 0 ? '+' : '') + c.d));
    list.append(row);
  }
  card.append(list);
  return card;
}

function nightGrade(u: number, regime: Regime): Grade {
  const n = bump(u, 0.28, 0.42, 0.58, 0.72);
  const rainy = regime === 'crash' ? 1 - smooth((u - 0.5) / 0.2) : 0;
  return { sat: 1 - 0.15 * n - 0.3 * rainy, tint: [lerp(1, 0.62, n), lerp(1, 0.7, n), lerp(1, 0.95, n)] };
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
  const vh = Math.max(MIN_VIEW, state.viewHeight);
  const area = viewArea(vh);
  const ps = createPropSet(stage);
  const ov = createOverlay({ mode: 'tap', skipText: ct(info.lang, 'cutscene.skip') });
  const card = buildCard(info);
  ov.root.append(card);
  stage.setControls(false);
  hold(true);
  try {
    const fx = reduced ? () => undefined : makeYearFx(ps, area, info.regime);
    const sun = ps.add((b) => ball(b, 0, 0, 1.1, C.sun, { halo: 2.6, haloColor: C.peach }), { anchored: true, depth: -30, glow: 0.3 });
    const moon = ps.add((b) => ball(b, 0, 0, 0.7, C.cream, { halo: 2.2, haloColor: C.pale }), { anchored: true, depth: -30, glow: 0.2 });
    const night = ps.add((b) => stars(b, area, 70), { anchored: true, depth: -30, glow: 0.3 });
    const keys = skyKeys(baseSky, info.regime);
    const pos = stage.avatar().group.position;
    await runTimeline(stage, ov, { duration, at: opts.at }, (c) => {
      const u = reduced ? 1 : Math.min(1, c / duration);
      setSky(stage.scene, skyAt(keys, u));
      grade(stage.scene, reduced ? NEUTRAL : nightGrade(u, info.regime));
      target.set(pos.x, 0.9, pos.z);
      state.viewHeight = lerp(vh, vh * 0.86, smooth(u));
      state.yaw = saved.yaw + 0.6 * smooth(u);
      const sunK = reduced ? 0 : 1 - bump(u, 0.3, 0.42, 0.58, 0.7);
      sun.node.position.set(-area.w * 0.45 + area.w * 0.5 * u, area.h * (0.78 - 0.34 * Math.sin(Math.min(1, u / 0.45) * Math.PI * 0.5) + 0.34 * smooth((u - 0.55) / 0.45)), 0);
      setOpacity(sun, sunK);
      moon.node.position.set(lerp(-area.w * 0.5, area.w * 0.5, u), area.h * 0.55 - Math.sin(u * Math.PI) * 0.2 * area.h, 0);
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
