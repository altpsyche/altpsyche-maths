import { describe, expect, it } from 'vitest';
import { circle, dashPath, lengthOf, line, polyline, vec2, type Path } from '../index.js';

const straight = line(vec2(0, 0), vec2(5, 0));

/** How much of a path a pattern draws, as a share of the whole, which is the
 * pattern's own duty cycle wherever the path holds a whole number of them. */
function drawnShare(path: Path, dash: readonly number[], offset = 0): number {
  return lengthOf(dashPath(path, dash, offset)) / lengthOf(path);
}

function dutyCycle(dash: readonly number[]): number {
  const pattern = dash.length % 2 === 0 ? dash : [...dash, ...dash];
  let on = 0;
  let all = 0;
  for (let at = 0; at < pattern.length; at += 1) {
    all += pattern[at];
    if (at % 2 === 0) on += pattern[at];
  }
  return on / all;
}

describe('dashPath', () => {
  it('cuts a line into the runs the pattern names', () => {
    // Five units under a pattern of two draw at 0 to 1, 2 to 3 and 4 to 5, so
    // the run at the far end is a whole dash and not the half the length left.
    const runs = dashPath(straight, [1, 1]);
    expect(runs).toHaveLength(3);
    for (const run of runs) expect(lengthOf([run])).toBeCloseTo(1, 12);
    runs.map((run) => run.start.x).forEach((at, index) => expect(at).toBeCloseTo(index * 2, 12));
  });

  it('repeats a pattern of odd length to make it even', () => {
    expect(dashPath(straight, [1])).toEqual(dashPath(straight, [1, 1]));
    expect(dashPath(straight, [1, 2, 3])).toEqual(dashPath(straight, [1, 2, 3, 1, 2, 3]));
  });

  it('draws the path solid where the pattern names no dash', () => {
    for (const pattern of [[], [0], [0, 0], [1, -1], [Number.NaN, 1]]) {
      expect(dashPath(straight, pattern)).toBe(straight);
    }
  });

  it('restarts the pattern at each subpath', () => {
    const two: Path = [...line(vec2(0, 0), vec2(1.5, 0)), ...line(vec2(0, 1), vec2(4, 1))];
    const runs = dashPath(two, [1, 1]);
    // The first subpath is one and a half patterns long, so the second still
    // opens with a whole dash rather than with the half the first left over.
    const second = runs.filter((run) => run.start.y === 1);
    expect(lengthOf([second[0]])).toBeCloseTo(1, 12);
    expect(second[0].start.x).toBeCloseTo(0, 12);
  });

  it('draws an offset of a whole pattern where an offset of nothing draws', () => {
    expect(dashPath(straight, [1, 0.5], 1.5)).toEqual(dashPath(straight, [1, 0.5], 0));
    expect(dashPath(straight, [1, 0.5], -3)).toEqual(dashPath(straight, [1, 0.5], 0));
  });

  it('opens partway into the pattern where the offset is part of one', () => {
    const runs = dashPath(straight, [1, 1], 0.5);
    expect(lengthOf([runs[0]])).toBeCloseTo(0.5, 12);
    expect(runs[0].start.x).toBeCloseTo(0, 12);
  });

  it('draws the share of a path the duty cycle names', () => {
    // Over a whole number of patterns, where no part pattern is left at the end
    // to draw more or less of the path than the cycle names.
    for (const pattern of [[1, 1], [0.5, 0.25], [2, 3], [0.2, 0.2, 0.6, 0.2]]) {
      const period = pattern.reduce((sum, run) => sum + run, 0) * (pattern.length % 2 === 0 ? 1 : 2);
      const over = line(vec2(0, 0), vec2(8 * period, 0));
      expect(drawnShare(over, pattern)).toBeCloseTo(dutyCycle(pattern), 12);
    }
  });

  it('hands a run that meets the next one back as one run', () => {
    // A gap of nothing leaves an unbroken line, which is what both other
    // painters draw and what two abutting runs under a round cap would not.
    expect(dashPath(straight, [1, 0])).toBe(straight);
  });

  it('cuts a closed subpath across its seam rather than at it', () => {
    const ring = circle(vec2(0, 0), 1);
    const around = lengthOf(ring);
    const runs = dashPath(ring, [around / 6.5, around / 6.5]);
    // The run holding the start point is one subpath and it begins before the
    // start and ends after it, where cutting at the seam would leave two.
    const crossing = runs.filter((run) => Math.abs(run.start.y) > 1e-9 && run.start.x > 0);
    expect(crossing).toHaveLength(1);
    expect(runs.every((run) => run.closed === false)).toBe(true);
  });

  it('leaves a closed subpath closed where the pattern draws all of it', () => {
    const ring = circle(vec2(0, 0), 1);
    expect(dashPath(ring, [lengthOf(ring) * 2, 0.1])).toBe(ring);
  });

  it('draws solid where the pattern is finer than the cutting is worth', () => {
    const long = polyline([vec2(0, 0), vec2(1000, 0)]);
    expect(dashPath(long, [0.01, 0.01])).toBe(long);
  });
});
