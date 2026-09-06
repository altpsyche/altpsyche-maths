import { describe, expect, it } from 'vitest';
import { keyAt, sampleTrack, sampleTracks, withKey, withoutKey } from '@altpsyche/maths';
import type { Track } from '@altpsyche/maths';

/**
 * The curve between two keys and the order the keys are held in. Both halves are
 * measured at the midpoint of a segment, which is where the four shapes are
 * furthest apart: a straight line reads half, a start from rest reads a quarter,
 * a stop to rest reads three quarters, and a walk still at both ends reads half
 * again while getting there differently.
 */

const between = (fromSmooth: boolean, toSmooth: boolean): Track => [
  { time: 0, value: 0, smooth: fromSmooth },
  { time: 2, value: 1, smooth: toSmooth },
];

describe('sampleTrack', () => {
  it('has no value where it has no keys', () => {
    expect(sampleTrack([], 1)).toBeNull();
  });

  it('holds the first value before the first key and the last after the last', () => {
    const track = between(false, false);
    expect(sampleTrack(track, -5)).toBe(0);
    expect(sampleTrack(track, 0)).toBe(0);
    expect(sampleTrack(track, 2)).toBe(1);
    expect(sampleTrack(track, 900)).toBe(1);
  });

  it('walks in a straight line between two plain keys', () => {
    expect(sampleTrack(between(false, false), 1)).toBeCloseTo(0.5, 10);
    expect(sampleTrack(between(false, false), 0.5)).toBeCloseTo(0.25, 10);
  });

  it('starts from rest where the first key is smooth', () => {
    expect(sampleTrack(between(true, false), 1)).toBeCloseTo(0.25, 10);
  });

  it('stops to rest where the second key is smooth', () => {
    expect(sampleTrack(between(false, true), 1)).toBeCloseTo(0.75, 10);
  });

  it('is still at both ends where both keys are smooth', () => {
    expect(sampleTrack(between(true, true), 1)).toBeCloseTo(0.5, 10);
    expect(sampleTrack(between(true, true), 0.5)).toBeCloseTo(0.15625, 10);
  });

  it('reads the segment the time falls in, not the first one', () => {
    const track: Track = [
      { time: 0, value: 0 },
      { time: 1, value: 10 },
      { time: 3, value: 30 },
    ];
    expect(sampleTrack(track, 0.5)).toBeCloseTo(5, 10);
    expect(sampleTrack(track, 2)).toBeCloseTo(20, 10);
  });

  it('walks a list one component at a time', () => {
    const track: Track = [
      { time: 0, value: [0, 10, 100] },
      { time: 2, value: [1, 20, 0] },
    ];
    expect(sampleTrack(track, 1)).toEqual([0.5, 15, 50]);
  });

  it('holds the earlier value where there is nothing to walk between', () => {
    const flags: Track = [
      { time: 0, value: false },
      { time: 2, value: true },
    ];
    expect(sampleTrack(flags, 1.9)).toBe(false);
    expect(sampleTrack(flags, 2)).toBe(true);

    const lengths: Track = [
      { time: 0, value: [0, 0] },
      { time: 2, value: [1, 1, 1] },
    ];
    expect(sampleTrack(lengths, 1)).toEqual([0, 0]);
  });

  it('takes the later value where two keys share an instant', () => {
    const track: Track = [
      { time: 1, value: 0 },
      { time: 1, value: 5 },
      { time: 2, value: 9 },
    ];
    expect(sampleTrack(track, 1)).toBe(0);
    expect(sampleTrack(track, 1.5)).toBeCloseTo(7, 10);
  });
});

describe('sampleTracks', () => {
  it('reads every track at one time and leaves out the empty ones', () => {
    const values = sampleTracks(
      {
        u_tilt: between(false, false),
        u_zoom: [{ time: 0, value: 3 }],
        u_glow: [],
      },
      1
    );
    expect(values).toEqual({ u_tilt: 0.5, u_zoom: 3 });
  });
});

describe('withKey', () => {
  it('holds the keys in the order the sampler reads', () => {
    let track: Track = [];
    track = withKey(track, { time: 4, value: 1 });
    track = withKey(track, { time: 1, value: 0 });
    track = withKey(track, { time: 2, value: 0.5 });
    expect(track.map((key) => key.time)).toEqual([1, 2, 4]);
  });

  it('replaces the key at that time rather than stacking a second one', () => {
    const track = withKey(withKey([], { time: 1, value: 0 }), { time: 1, value: 7 });
    expect(track).toHaveLength(1);
    expect(track[0].value).toBe(7);
  });

  it('counts a time within half a frame as the same time', () => {
    const track = withKey(withKey([], { time: 1, value: 0 }), { time: 1.004, value: 7 });
    expect(track).toHaveLength(1);
  });
});

describe('withoutKey and keyAt', () => {
  it('takes out the key at a time and leaves the others', () => {
    const track = between(false, false);
    expect(withoutKey(track, 0)).toHaveLength(1);
    expect(withoutKey(track, 1)).toHaveLength(2);
  });

  it('finds the key a control draws itself as set from', () => {
    const track = between(false, false);
    expect(keyAt(track, 0)?.value).toBe(0);
    expect(keyAt(track, 1)).toBeUndefined();
  });
});
