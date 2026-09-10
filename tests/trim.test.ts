import { describe, expect, it } from 'vitest';
import { arc, circle, lengthOf, line, pathWindow, pointAlong, trimPath, vec2, type Path } from '../index.js';

/**
 * The true length of a path, by a fine polyline walk.
 *
 * Four thousand steps a piece rather than the sixteen the package measures with,
 * so this reads the geometry and not the table the geometry was cut by.
 */
const STEPS = 4096;

function trueLength(path: Path): number {
  let total = 0;
  for (const subpath of path) {
    let from = subpath.start;
    for (const curve of subpath.curves) {
      let previous = from;
      for (let step = 1; step <= STEPS; step++) {
        const along = step / STEPS;
        const u = 1 - along;
        const point = vec2(
          u * u * u * from.x +
            3 * u * u * along * curve.control1.x +
            3 * u * along * along * curve.control2.x +
            along * along * along * curve.to.x,
          u * u * u * from.y +
            3 * u * u * along * curve.control1.y +
            3 * u * along * along * curve.control2.y +
            along * along * along * curve.to.y
        );
        total += Math.hypot(point.x - previous.x, point.y - previous.y);
        previous = point;
      }
      from = curve.to;
    }
  }
  return total;
}

/** A path whose pieces differ in size by a factor of ten, which is what a cut by
 * length has to be even across and a cut by piece is not. */
const uneven: Path = [
  {
    start: vec2(0, 0),
    curves: [
      { control1: vec2(0.1, 0), control2: vec2(0.2, 0), to: vec2(0.3, 0) },
      { control1: vec2(1.3, 0), control2: vec2(2.3, 0), to: vec2(3.3, 0) },
    ],
    closed: false,
  },
];

/** The worst distance between the run a window was asked for and the run it
 * drew, over every pair of twentieths, as a share of the whole length. */
function worstRun(path: Path): number {
  const whole = trueLength(path);
  let worst = 0;
  for (let opens = 0; opens < 20; opens++) {
    for (let closes = opens + 1; closes <= 20; closes++) {
      const drawn = trueLength(pathWindow(path, opens / 20, closes / 20));
      worst = Math.max(worst, Math.abs(drawn / whole - (closes - opens) / 20));
    }
  }
  return worst;
}

describe('a window between two fractions', () => {
  it('draws the run it was asked for along a straight path of uneven pieces', () => {
    expect(worstRun(uneven)).toBeLessThan(1e-12);
  });

  it('draws the run it was asked for along a curve, inside the cut error', () => {
    // The near and the far end each carry the error a cut by length leaves, so a
    // window is out by twice what a trim is: 2.718e-4 of the whole against 1.359e-4.
    expect(worstRun(arc(vec2(0, 0), 1, 0, Math.PI / 2))).toBeLessThan(3e-4);
  });

  it('draws the run it was asked for across the pieces of a circle', () => {
    expect(worstRun(circle(vec2(0, 0), 1))).toBeLessThan(4e-5);
  });

  it('is the path itself at nothing to one, untouched', () => {
    const path = circle(vec2(0, 0), 1);
    expect(pathWindow(path, 0, 1)).toBe(path);
    expect(pathWindow(path, -1, 2)).toBe(path);
  });

  it('is no path at all where the far end is at or behind the near one', () => {
    const path = circle(vec2(0, 0), 1);
    expect(pathWindow(path, 0.5, 0.5)).toEqual([]);
    expect(pathWindow(path, 0.7, 0.3)).toEqual([]);
  });

  it('starts and ends where the path itself is at those two fractions', () => {
    const path = circle(vec2(0, 0), 1);
    const window = pathWindow(path, 0.2, 0.65);
    const opens = pointAlong(path, 0.2);
    const closes = pointAlong(path, 0.65);
    const last = window[window.length - 1];
    expect(window[0].start.x).toBeCloseTo(opens!.x, 12);
    expect(window[0].start.y).toBeCloseTo(opens!.y, 12);
    expect(last.curves[last.curves.length - 1].to.x).toBeCloseTo(closes!.x, 12);
    expect(last.curves[last.curves.length - 1].to.y).toBeCloseTo(closes!.y, 12);
  });

  it('opens a subpath it cuts and leaves a subpath it covers whole closed', () => {
    const path = circle(vec2(0, 0), 1);
    expect(pathWindow(path, 0.1, 0.9)[0].closed).toBe(false);
    expect(pathWindow(path, 0, 1)[0].closed).toBe(true);
  });

  it('leaves out a subpath it never reaches', () => {
    const two: Path = [...line(vec2(0, 0), vec2(1, 0)), ...line(vec2(0, 1), vec2(1, 1))];
    expect(pathWindow(two, 0.6, 1)).toHaveLength(1);
    expect(pathWindow(two, 0.4, 0.6)).toHaveLength(2);
  });

  it('is what a trim from the start already was', () => {
    const path = arc(vec2(0, 0), 1, 0, Math.PI / 2);
    for (let step = 0; step <= 20; step++) {
      expect(lengthOf(trimPath(path, step / 20))).toBeCloseTo(lengthOf(pathWindow(path, 0, step / 20)), 12);
    }
  });
});
