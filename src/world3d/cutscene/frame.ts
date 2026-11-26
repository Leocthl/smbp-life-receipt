import * as THREE from 'three';
import type { StageApi } from '../contracts';
import { camAxes, fitViewHeight, type BoxPx, type Insets } from '../frameFit';
import { scopeHalf, scopeMargin } from '../scopeFit';
import { framingFor } from '../world';

// Where a cutscene points the camera: always at what the viewer can see, i.e. the screen minus the skip button on top and
// the subtitle or card at the bottom, on a phone in portrait as much as on a wide desktop.

const WINDOW_SHARE = 0.62; // outdoors a cutscene looks at a window round the hero this share of the stage's view height wide
const WINDOW_MIN = 16;
const WINDOW_MAX = 34;

export interface Shot { centre: THREE.Vector3; viewHeight: number }

/** Size of the picture the cutscene overlay sits on. */
export function cutBox(): BoxPx {
  const host = document.querySelector<HTMLElement>('.ml-world__canvas')?.parentElement;
  return { w: host?.clientWidth || window.innerWidth, h: host?.clientHeight || window.innerHeight };
}

/**
 * The opening shot: indoors the whole room (zoomed out until it fits the free area), outdoors a window round the hero.
 * baseHeight is the stage's own view height when the cutscene started.
 */
export function openingShot(stage: StageApi, hero: THREE.Vector3, baseHeight: number, ins: Insets, yaw: number, pitch: number): Shot {
  const scope = stage.world().scope;
  if (scope === 'room' || scope === 'home') {
    const f = framingFor(scope), centre = new THREE.Vector3(...f.target);
    const half = scopeHalf(scope, f.target, yaw + 0.3, pitch); // the camera arcs a little, so allow for it
    return { centre, viewHeight: Math.max(f.viewHeight, fitViewHeight(cutBox(), ins, half, scopeMargin(scope) * 1.08)) };
  }
  return { centre: new THREE.Vector3(hero.x, 1.2, hero.z), viewHeight: Math.min(WINDOW_MAX, Math.max(WINDOW_MIN, baseHeight * WINDOW_SHARE)) };
}

/** Points the camera so that `centre` lands in the middle of the free area (the screen minus the insets). */
export function aim(target: THREE.Vector3, centre: THREE.Vector3, viewHeight: number, yaw: number, pitch: number, box: BoxPx, ins: Insets): void {
  const unit = viewHeight / box.h, { right, up } = camAxes(yaw, pitch);
  const down = ((ins.bottom - ins.top) / 2) * unit, left = (ins.right / 2) * unit;
  target.set(centre.x - up[0] * down + right[0] * left, centre.y - up[1] * down + right[1] * left, centre.z - up[2] * down + right[2] * left);
}
