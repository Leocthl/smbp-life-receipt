import { describe, expect, it } from 'vitest';
import { cycleSnap, nearestSnap, settleSnap, snapHeights, stepSnap } from '../src/ui/sheet/snaps';

const H = snapHeights(844, 0);

describe('bottom sheet snaps', () => {
  it('has three ordered heights that leave the HUD clear', () => {
    expect(H.peek).toBeLessThan(H.half);
    expect(H.half).toBeLessThan(H.full);
    expect(844 - H.full).toBeGreaterThanOrEqual(92);
  });
  it('keeps the order on a short phone', () => {
    const s = snapHeights(600, 34);
    expect(s.peek).toBeLessThan(s.half);
    expect(s.half).toBeLessThan(s.full);
  });
  it('settles on the nearest snap when released slowly', () => {
    expect(nearestSnap(H.half + 20, H)).toBe('half');
    expect(settleSnap(H.half + 20, 0, H)).toBe('half');
    expect(settleSnap(H.peek + 10, 0, H)).toBe('peek');
  });
  it('a fling carries past the nearest snap', () => {
    expect(settleSnap(H.half - 30, 2.5, H)).toBe('full'); // quick swipe up from just under half
    expect(settleSnap(H.half + 30, -2.5, H)).toBe('peek'); // quick swipe down
  });
  it('cycles and steps', () => {
    expect(cycleSnap('peek')).toBe('half');
    expect(cycleSnap('full')).toBe('peek');
    expect(stepSnap('full', 1)).toBe('full');
    expect(stepSnap('peek', -1)).toBe('peek');
    expect(stepSnap('half', -1)).toBe('peek');
  });
});
