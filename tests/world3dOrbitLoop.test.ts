import { describe, expect, it } from 'vitest';
import {
  AVATAR_RADIUS,
  canWalkInScope,
  clampPitch,
  clampPitchOffset,
  clampZoom,
  DEFAULT_PITCH,
  isLoopingScope,
  isRoomLocked,
  normalizeAngle,
  ORBIT_PITCH_MAX,
  ORBIT_PITCH_MIN,
  ORBIT_ZOOM_MAX,
  ORBIT_ZOOM_MIN,
  resolvePositionWithWrap,
} from '../src/world3d/controls';

describe('3D orbit & looping open-world math', () => {
  it('clamps orbit pitch, pitch offsets, and zoom safely', () => {
    expect(clampPitch(0)).toBe(ORBIT_PITCH_MIN);
    expect(clampPitch(2)).toBe(ORBIT_PITCH_MAX);
    expect(clampPitch(DEFAULT_PITCH)).toBe(DEFAULT_PITCH);

    const lo = clampPitchOffset(-5, DEFAULT_PITCH);
    const hi = clampPitchOffset(5, DEFAULT_PITCH);
    expect(DEFAULT_PITCH + lo).toBeCloseTo(ORBIT_PITCH_MIN, 6);
    expect(DEFAULT_PITCH + hi).toBeCloseTo(ORBIT_PITCH_MAX, 6);

    expect(clampZoom(0.1)).toBe(ORBIT_ZOOM_MIN);
    expect(clampZoom(9)).toBe(ORBIT_ZOOM_MAX);
    expect(clampZoom(1.1)).toBe(1.1);
  });

  it('normalizes angles into (-PI, PI] for shortest-arc reset', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(Math.PI * 2 + 0.5)).toBeCloseTo(0.5, 6);
    expect(normalizeAngle(-Math.PI * 2 - 0.4)).toBeCloseTo(-0.4, 6);
    expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI, 6);
  });

  it('locks walking in age-18 room while unlocking looping in outdoor scopes', () => {
    expect(isRoomLocked('room')).toBe(true);
    expect(isRoomLocked('home')).toBe(false);
    expect(canWalkInScope('room', true)).toBe(false);
    expect(canWalkInScope('home', true)).toBe(true);
    expect(canWalkInScope('city', true)).toBe(true);
    expect(canWalkInScope('city', false)).toBe(false);

    expect(isLoopingScope('room')).toBe(false);
    expect(isLoopingScope('home')).toBe(false);
    expect(isLoopingScope('block')).toBe(true);
    expect(isLoopingScope('district')).toBe(true);
    expect(isLoopingScope('city')).toBe(true);
  });

  it('wraps coordinates toroidally with exact wrap deltas when wrap=true and clamps when wrap=false', () => {
    const world = { colliders: [], bounds: 13 };

    const wrappedPos = resolvePositionWithWrap({ x: 14.2, z: -13.5 }, world, true);
    expect(wrappedPos.pos.x).toBeCloseTo(-11.8, 6);
    expect(wrappedPos.pos.z).toBeCloseTo(12.5, 6);
    expect(wrappedPos.wrapX).toBe(-26);
    expect(wrappedPos.wrapZ).toBe(26);

    const clampedPos = resolvePositionWithWrap({ x: 14.2, z: -13.5 }, world, false);
    expect(clampedPos.pos.x).toBeCloseTo(13 - AVATAR_RADIUS, 6);
    expect(clampedPos.pos.z).toBeCloseTo(-(13 - AVATAR_RADIUS), 6);
    expect(clampedPos.wrapX).toBe(0);
    expect(clampedPos.wrapZ).toBe(0);
  });
});
