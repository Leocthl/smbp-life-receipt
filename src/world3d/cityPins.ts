import * as THREE from 'three';
import { AMBIENT_CHATTER_KEYS, type CityPin } from '../engine/cityHub';
import { translate, type Lang } from '../i18n';
import type { Spot, SpotId } from './contracts';
import { freeRect, type BoxPx, type Insets } from './frameFit';
import './cityPins.css';

export interface CityPinsHandle {
  setPins(pins: readonly CityPin[], spots: readonly Spot[]): void;
  setVisible(on: boolean): void;
  setLang(lang: Lang): void;
  onSelect(cb: ((pin: CityPin) => void) | null): void;
  update(frame: { t: number; cam: THREE.Camera; box: BoxPx; ins: Insets }): void;
  dispose(): void;
}

interface PinEntry {
  pin: CityPin;
  btn: HTMLButtonElement;
  labelEl: HTMLSpanElement;
  subEl: HTMLSpanElement;
}

const PIN_ANCHOR_Y: Partial<Record<SpotId, number>> = {
  office: 10.5,
  home: 8.8,
  bank: 6.8,
  clinic: 5.4,
  campus: 5.4,
  cafe: 5.0,
  market: 3.6,
  park: 3.5,
  pier: 3.2,
};
const DEFAULT_PIN_Y = 3.8;
const CHATTER_ANCHOR_Y = 2.2;
const CHATTER_CYCLE_S = 7;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const stopOnly = (e: Event) => {
  e.stopPropagation();
};

/**
 * Floating world-space opportunity pins + ambient Hong Kong street chatter overlay.
 */
export function createCityPins(container: HTMLElement, initialLang: Lang): CityPinsHandle {
  const root = document.createElement('div');
  root.className = 'ml-city-pins';
  root.hidden = true;

  const chatterEl = document.createElement('div');
  chatterEl.className = 'ml-street-chatter';
  chatterEl.setAttribute('aria-hidden', 'true');
  chatterEl.hidden = true;
  root.append(chatterEl);
  container.append(root);

  const reduced =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  let lang: Lang = initialLang;
  let visible = false;
  let selectCb: ((pin: CityPin) => void) | null = null;
  let entries: PinEntry[] = [];
  let spotMap = new Map<SpotId, Spot>();
  let outdoorSpots: Spot[] = [];

  let chatterSlot = -1;
  let chatterSpot: Spot | null = null;
  let chatterKey: string = AMBIENT_CHATTER_KEYS[0];

  const vec = new THREE.Vector3();

  function refreshCopy() {
    for (const entry of entries) {
      const label = translate(lang, entry.pin.labelKey);
      const sub = translate(lang, entry.pin.subKey);
      entry.labelEl.textContent = label;
      entry.subEl.textContent = sub;
      entry.btn.setAttribute('aria-label', `${label} — ${sub}`);
    }
    if (!chatterEl.hidden) {
      chatterEl.textContent = translate(lang, chatterKey);
    }
  }

  function clearEntries() {
    for (const entry of entries) {
      entry.btn.remove();
    }
    entries = [];
  }

  function pickNextChatter() {
    if (outdoorSpots.length === 0) {
      chatterSpot = null;
      return;
    }
    if (outdoorSpots.length === 1) {
      chatterSpot = outdoorSpots[0];
    } else {
      const candidates = chatterSpot ? outdoorSpots.filter((s) => s.id !== chatterSpot?.id) : outdoorSpots;
      chatterSpot = candidates[Math.floor(Math.random() * candidates.length)] ?? outdoorSpots[0];
    }
    const keys =
      AMBIENT_CHATTER_KEYS.length > 1
        ? AMBIENT_CHATTER_KEYS.filter((k) => k !== chatterKey)
        : AMBIENT_CHATTER_KEYS;
    chatterKey = keys[Math.floor(Math.random() * keys.length)] ?? AMBIENT_CHATTER_KEYS[0];
    chatterEl.textContent = translate(lang, chatterKey);
  }

  function buildEntry(pin: CityPin): PinEntry {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ml-city-pin';
    btn.dataset.tag = pin.tag;
    btn.dataset.spot = pin.spot;
    btn.dataset.pinId = pin.id;
    if (pin.urgent) btn.dataset.urgent = '1';
    if (pin.visited) btn.dataset.visited = '1';

    const dot = document.createElement('span');
    dot.className = 'ml-city-pin__dot';
    dot.setAttribute('aria-hidden', 'true');

    const icon = document.createElement('span');
    icon.className = 'ml-city-pin__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = pin.icon;

    const body = document.createElement('span');
    body.className = 'ml-city-pin__body';

    const labelEl = document.createElement('span');
    labelEl.className = 'ml-city-pin__label';
    const label = translate(lang, pin.labelKey);
    labelEl.textContent = label;

    const subEl = document.createElement('span');
    subEl.className = 'ml-city-pin__sub';
    const sub = translate(lang, pin.subKey);
    subEl.textContent = sub;

    const check = document.createElement('span');
    check.className = 'ml-city-pin__check';
    check.setAttribute('aria-hidden', 'true');
    check.textContent = '✓';

    body.append(labelEl, subEl);
    btn.append(dot, icon, body, check);
    btn.setAttribute('aria-label', `${label} — ${sub}`);

    // Prevent clicks/taps on floating pins from initiating 3D orbit drags or ground taps.
    btn.addEventListener('pointerdown', stopOnly);
    btn.addEventListener('mousedown', stopOnly);
    btn.addEventListener('touchstart', stopOnly, { passive: true });
    btn.addEventListener('pointerup', stopOnly);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectCb?.(pin);
    });

    root.append(btn);
    return { pin, btn, labelEl, subEl };
  }

  return {
    setPins(pins, spots) {
      spotMap = new Map(spots.map((s) => [s.id, s]));
      const nonHome = spots.filter((s) => s.id !== 'home');
      outdoorSpots = nonHome.length > 0 ? nonHome : [...spots];
      chatterSlot = -1;
      chatterSpot = null;

      clearEntries();
      entries = pins.map(buildEntry);
    },

    setVisible(on) {
      visible = on;
      root.hidden = !on;
      if (!on) {
        chatterEl.hidden = true;
        chatterEl.classList.remove('ml-street-chatter--on');
      }
    },

    setLang(nextLang) {
      if (lang === nextLang) return;
      lang = nextLang;
      refreshCopy();
    },

    onSelect(cb) {
      selectCb = cb;
    },

    update({ t, cam, box, ins }) {
      if (!visible || box.w <= 0 || box.h <= 0) return;

      const rect = freeRect(box, {
        top: Math.max(ins.top, 96),
        bottom: Math.max(ins.bottom, 84),
        right: ins.right,
      });
      const padX = Math.min(72, rect.w * 0.4);
      const padY = Math.min(26, rect.h * 0.4);
      const placed: { x: number; y: number }[] = [];

      for (let idx = 0; idx < entries.length; idx += 1) {
        const entry = entries[idx];
        const spot = spotMap.get(entry.pin.spot);
        if (!spot) {
          entry.btn.hidden = true;
          continue;
        }
        entry.btn.hidden = false;

        const anchorY = PIN_ANCHOR_Y[spot.id] ?? DEFAULT_PIN_Y;
        vec.set(spot.x, anchorY, spot.z).project(cam);
        const sx = (vec.x * 0.5 + 0.5) * box.w;
        const sy = (-vec.y * 0.5 + 0.5) * box.h;
        const floatY = reduced ? 0 : Math.sin(t * 2.6 + idx * 1.3) * 3;
        const px = clamp(sx, rect.left + padX, rect.left + rect.w - padX);
        let py = clamp(sy + floatY, rect.top + padY, rect.top + rect.h - padY);

        // Nudge vertically if two pins project close together so badges stay crisp and readable.
        for (let pass = 0; pass < 3; pass += 1) {
          for (const prev of placed) {
            if (Math.abs(px - prev.x) < 126 && Math.abs(py - prev.y) < 44) {
              const dir = py <= prev.y ? -1 : 1;
              py = clamp(prev.y + dir * 46, rect.top + padY, rect.top + rect.h - padY);
            }
          }
        }
        placed.push({ x: px, y: py });

        entry.btn.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -50%)`;
      }

      if (reduced || outdoorSpots.length === 0) {
        chatterEl.hidden = true;
        chatterEl.classList.remove('ml-street-chatter--on');
        return;
      }

      const slot = Math.floor(t / CHATTER_CYCLE_S);
      const phase = t - slot * CHATTER_CYCLE_S;
      if (slot !== chatterSlot || !chatterSpot) {
        chatterSlot = slot;
        pickNextChatter();
      }

      if (!chatterSpot) {
        chatterEl.hidden = true;
        return;
      }

      vec.set(chatterSpot.x, CHATTER_ANCHOR_Y, chatterSpot.z).project(cam);
      const cx = clamp((vec.x * 0.5 + 0.5) * box.w, rect.left + padX, rect.left + rect.w - padX);
      const cy = clamp((-vec.y * 0.5 + 0.5) * box.h, rect.top + padY, rect.top + rect.h - padY);
      const overlapsPin = placed.some((p) => Math.abs(cx - p.x) < 116 && Math.abs(cy - 12 - p.y) < 38);

      chatterEl.hidden = overlapsPin;
      const showBubble = !overlapsPin && phase >= 0.4 && phase <= 6.1;
      chatterEl.classList.toggle('ml-street-chatter--on', showBubble);
      if (!overlapsPin) {
        chatterEl.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }
    },

    dispose() {
      selectCb = null;
      clearEntries();
      root.remove();
    },
  };
}
