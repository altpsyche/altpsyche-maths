import { describe, expect, it } from 'vitest';
import * as door from '@altpsyche/maths';
import {
  marksAt,
  durationOf,
  figureTime,
  frameTimesOf,
  framesOf,
  group,
  isLoop,
  sameMarks,
  shape,
  circle,
  vec2,
  viewAt,
  type Figure,
  type Frame,
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

describe('the door', () => {
  it('hands out every call frames out added', () => {
    for (const name of ['frameTimesOf', 'framesOf']) {
      expect(typeof (door as Record<string, unknown>)[name], name).not.toBe('undefined');
    }
    // A type is not a value, so the door is held to it by a frame that is one.
    const frame: Frame = framesOf(turns, { frames: 1, width: 8, height: 4 }).next().value as Frame;
    expect(Object.keys(frame).sort()).toEqual(['index', 'marks', 'seconds', 'view']);
  });
});

describe('frameTimesOf', () => {
  it('walks a rate in steps of exactly one over it', () => {
    const times = frameTimesOf(tangent, { fps: 30 });
    expect(times).toHaveLength(308);
    expect(times[0]).toBe(0);
    for (let index = 1; index < times.length; index += 1) {
      expect(times[index] - times[index - 1]).toBeCloseTo(1 / 30, 12);
    }
  });

  it('stops strictly before the duration', () => {
    const times = frameTimesOf(tangent, { fps: 30 });
    const duration = durationOf(tangent);
    expect(duration).toBeCloseTo(10.25, 12);
    expect(times[times.length - 1]).toBeLessThan(duration);
    expect(duration - times[times.length - 1]).toBeCloseTo(0.0166666, 6);
  });

  it('spreads a count over the whole figure instead', () => {
    expect(frameTimesOf(turns, { frames: 4 })).toEqual([0, 1.5, 3, 4.5]);
  });

  it('never hands back the frame a loop would show twice', () => {
    expect(isLoop(turns)).toBe(true);
    const times = frameTimesOf(turns, { frames: 4 });
    expect(times).not.toContain(durationOf(turns));
    const first = marksAt(turns, times[0]);
    for (const seconds of times.slice(1)) expect(sameMarks(first, marksAt(turns, seconds))).toBe(false);
    expect(sameMarks(first, marksAt(turns, durationOf(turns)))).toBe(true);
  });

  it('walks one frame of a figure that never moves', () => {
    expect(frameTimesOf(still, { fps: 30 })).toEqual([0]);
  });
});

describe('framesOf', () => {
  it('reads its marks and its view at one time', () => {
    let worst = 0;
    for (const frame of framesOf(tangent, { fps: 12, width: WIDTH, height: HEIGHT })) {
      expect(sameMarks(frame.marks, marksAt(tangent, frame.seconds), 0)).toBe(true);
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
    expect(frameTimesOf(counted, { fps: 30 })).toHaveLength(300);
    expect(built).toBe(0);
    walk.next();
    expect(built).toBe(1);
    walk.next();
    expect(built).toBe(2);
  });
});

describe('figureTime', () => {
  it('reads a moment inside the figure at that same moment', () => {
    expect(figureTime(turns, 2.5)).toBe(2.5);
    expect(figureTime(tangent, 2.5)).toBe(2.5);
  });

  it('holds a figure that is not a loop at its last picture', () => {
    expect(figureTime(tangent, durationOf(tangent) + 4)).toBe(durationOf(tangent));
  });

  it('wraps a figure that declares itself a loop', () => {
    expect(turns.loop).toBe(true);
    expect(figureTime(turns, durationOf(turns) + 1.5)).toBeCloseTo(1.5, 12);
    expect(figureTime(turns, durationOf(turns) * 3)).toBeCloseTo(0, 12);
  });

  it('reads nothing before the start and nothing from a figure with no length', () => {
    expect(figureTime(turns, -2)).toBe(0);
    expect(figureTime(still, 7)).toBe(0);
  });
});

describe('a walk longer than the figure', () => {
  it('counts the frames of the span it was given rather than of the figure', () => {
    expect(frameTimesOf(turns, { fps: 30, seconds: durationOf(turns) * 2 })).toHaveLength(360);
    expect(frameTimesOf(turns, { fps: 30, seconds: 2 })).toHaveLength(60);
  });

  it('draws a loop a second time rather than holding it', () => {
    const frames = [
      ...framesOf(turns, { fps: 30, width: WIDTH, height: HEIGHT, seconds: durationOf(turns) * 2 }),
    ];
    expect(frames).toHaveLength(360);
    for (let index = 0; index < 180; index += 1) {
      expect(sameMarks(frames[index].marks, frames[index + 180].marks, 1e-9), `frame ${index}`).toBe(
        true
      );
    }
  });

  it('holds the last picture of a figure that is not a loop', () => {
    const span = durationOf(tangent) * 2;
    const frames = [...framesOf(tangent, { fps: 4, width: WIDTH, height: HEIGHT, seconds: span })];
    expect(frames).toHaveLength(82);
    const last = marksAt(tangent, durationOf(tangent), WIDTH / HEIGHT);
    // The frame at 10.25 seconds is the end of the figure rather than past it,
    // so 41 of the 82 come before the end and 40 after it.
    const after = frames.filter((frame) => frame.seconds > durationOf(tangent));
    expect(after).toHaveLength(40);
    for (const frame of after) {
      expect(sameMarks(frame.marks, last, 1e-9), `${frame.seconds}s`).toBe(true);
    }
  });
});
