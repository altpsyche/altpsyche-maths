import { describe, expect, it } from 'vitest';
import {
  at,
  durationOf,
  frameTimes,
  framesOf,
  group,
  loops,
  sameMarks,
  shape,
  circle,
  vec2,
  viewAt,
  type Figure,
} from '@altpsyche/maths';
import { tangent } from '../demos/tangent.js';
import { turns } from '../demos/rotate.js';

/**
 * A figure walked at a fixed step, checked against the two calls the walk is
 * made of: every frame's marks are `at` of the figure at that frame's own time
 * and every frame's view is `viewAt` at the same one.
 */

const WIDTH = 1080;
const HEIGHT = 600;

const still: Figure = {
  extent: { width: 4, height: 2 },
  still: 0,
  scene: group('one', [shape('disc', circle(vec2(0, 0), 1), {})]),
};

describe('frameTimes', () => {
  it('walks a rate in steps of exactly one over it', () => {
    const times = frameTimes(tangent, { fps: 30 });
    expect(times).toHaveLength(308);
    expect(times[0]).toBe(0);
    for (let index = 1; index < times.length; index += 1) {
      expect(times[index] - times[index - 1]).toBeCloseTo(1 / 30, 12);
    }
  });

  it('stops strictly before the duration', () => {
    const times = frameTimes(tangent, { fps: 30 });
    const duration = durationOf(tangent);
    expect(duration).toBeCloseTo(10.25, 12);
    expect(times[times.length - 1]).toBeLessThan(duration);
    expect(duration - times[times.length - 1]).toBeCloseTo(0.0166666, 6);
  });

  it('spreads a count over the whole figure instead', () => {
    expect(frameTimes(turns, { frames: 4 })).toEqual([0, 1.5, 3, 4.5]);
  });

  it('never hands back the frame a loop would show twice', () => {
    expect(loops(turns)).toBe(true);
    const times = frameTimes(turns, { frames: 4 });
    expect(times).not.toContain(durationOf(turns));
    const first = at(turns, times[0]);
    for (const seconds of times.slice(1)) expect(sameMarks(first, at(turns, seconds))).toBe(false);
    expect(sameMarks(first, at(turns, durationOf(turns)))).toBe(true);
  });

  it('walks one frame of a figure that never moves', () => {
    expect(frameTimes(still, { fps: 30 })).toEqual([0]);
  });
});

describe('framesOf', () => {
  it('reads its marks and its view at one time', () => {
    let worst = 0;
    for (const frame of framesOf(tangent, { fps: 12, width: WIDTH, height: HEIGHT })) {
      expect(sameMarks(frame.marks, at(tangent, frame.seconds), 0)).toBe(true);
      const wanted = viewAt(tangent, frame.seconds, WIDTH, HEIGHT);
      for (let part = 0; part < wanted.length; part += 1) {
        worst = Math.max(worst, Math.abs(frame.view[part] - wanted[part]));
      }
    }
    expect(worst).toBeLessThan(1e-12);
  });

  it('carries a view that moves with the figure it came from', () => {
    const frames = Array.from(framesOf(tangent, { fps: 12, width: WIDTH, height: HEIGHT }));
    // The sixth of a column-major matrix is how far the view is carried across.
    const across = frames.map((frame) => frame.view[6]);
    expect(Math.max(...across) - Math.min(...across)).toBeGreaterThan(1);
  });

  it('numbers its frames from nothing, in the order it read them', () => {
    const frames = Array.from(framesOf(turns, { frames: 4, width: WIDTH, height: HEIGHT }));
    expect(frames.map((frame) => frame.index)).toEqual([0, 1, 2, 3]);
    expect(frames.map((frame) => frame.seconds)).toEqual([0, 1.5, 3, 4.5]);
  });

  it('builds one frame for one frame read, and no more', () => {
    let built = 0;
    const counted: Figure = {
      extent: { width: 4, height: 2 },
      still: 0,
      duration: 10,
      scene: () => {
        built += 1;
        return group('one', [shape('disc', circle(vec2(0, 0), 1), {})]);
      },
    };
    const walk = framesOf(counted, { fps: 30, width: WIDTH, height: HEIGHT });
    expect(frameTimes(counted, { fps: 30 })).toHaveLength(300);
    expect(built).toBe(0);
    walk.next();
    expect(built).toBe(1);
    walk.next();
    expect(built).toBe(2);
  });
});
