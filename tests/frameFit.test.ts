import { describe, expect, it } from 'vitest';
import { boxCorners, camAxes, fitViewHeight, freeRect, halfExtent, toScreen } from '../src/world3d/frameFit';

const YAW = Math.PI / 4, PITCH = Math.atan(1 / Math.sqrt(2));

describe('frameFit', () => {
  it('camera up points up, right and up are perpendicular', () => {
    const { right, up } = camAxes(YAW, PITCH);
    expect(up[1]).toBeGreaterThan(0.5);
    expect(right[0] * up[0] + right[1] * up[1] + right[2] * up[2]).toBeCloseTo(0, 6);
  });

  it('a point further from the camera (-x,-z) sits higher on screen', () => {
    expect(toScreen([-3, 0, -3], YAW, PITCH).u).toBeGreaterThan(toScreen([3, 0, 3], YAW, PITCH).u);
  });

  it('a taller sheet needs a larger view height, and the result stays finite when the sheet covers the screen', () => {
    const box = { w: 390, h: 844 }, half = halfExtent(boxCorners(-3, 3, -3, 3, 3.4), [0, 1.2, 0], YAW, PITCH);
    const none = fitViewHeight(box, { top: 0, bottom: 0, right: 0 }, half);
    const peek = fitViewHeight(box, { top: 92, bottom: 120, right: 0 }, half);
    const full = fitViewHeight(box, { top: 92, bottom: 752, right: 0 }, half);
    expect(peek).toBeGreaterThanOrEqual(none); // a tall phone is width-limited until the sheet gets tall
    expect(full).toBeGreaterThan(peek);
    expect(Number.isFinite(full)).toBe(true);
    expect(freeRect(box, { top: 92, bottom: 752, right: 0 }).h).toBeCloseTo(844 * 0.3, 6);
  });

  it('a side panel makes a landscape room zoom out until it fits what is left', () => {
    const box = { w: 1280, h: 800 }, half = halfExtent(boxCorners(-3, 3, -3, 3, 3.4), [0, 1.2, 0], YAW, PITCH);
    const open = fitViewHeight(box, { top: 0, bottom: 0, right: 0 }, half);
    const docked = fitViewHeight(box, { top: 0, bottom: 0, right: 520 }, half);
    expect(docked).toBeGreaterThanOrEqual(open);
  });

  it('fitted content really lands inside the free rect', () => {
    const box = { w: 390, h: 844 }, ins = { top: 92, bottom: 464, right: 0 };
    const half = halfExtent(boxCorners(-3, 3, -3, 3, 3.4), [0, 1.2, 0], YAW, PITCH);
    const vh = fitViewHeight(box, ins, half, 1);
    const pxPerUnit = box.h / vh, free = freeRect(box, ins);
    expect(half.h * 2 * pxPerUnit).toBeLessThanOrEqual(free.h + 1e-6);
    expect(half.w * 2 * pxPerUnit).toBeLessThanOrEqual(free.w + 1e-6);
  });
});
