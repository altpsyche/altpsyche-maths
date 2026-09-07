import { describe, expect, it } from 'vitest';
import {
  arc,
  circle,
  coordsOf,
  interval,
  lengthOf,
  line,
  plot,
  pointAlong,
  pointOn,
  scaleOf,
  trimPath,
  vec2,
  type Cubic,
  type Path,
} from '../index.js';

/**
 * The true length of a path, by a fine polyline walk.
 *
 * Four thousand steps a piece rather than the sixteen the package measures with,
 * so this reads the geometry and not the table the geometry was cut by.
 */
const STEPS = 4096;

function pointAt(from: { x: number; y: number }, curve: Cubic, along: number) {
  const u = 1 - along;
  return {
    x:
      u * u * u * from.x +
      3 * u * u * along * curve.control1.x +
      3 * u * along * along * curve.control2.x +
      along * along * along * curve.to.x,
    y:
      u * u * u * from.y +
      3 * u * u * along * curve.control1.y +
      3 * u * along * along * curve.control2.y +
      along * along * along * curve.to.y,
  };
}

function trueLength(path: Path): number {
  let total = 0;
  for (const subpath of path) {
    let from = subpath.start;
    for (const curve of subpath.curves) {
      let previous: { x: number; y: number } = from;
      for (let step = 1; step <= STEPS; step++) {
        const point = pointAt(from, curve, step / STEPS);
        total += Math.hypot(point.x - previous.x, point.y - previous.y);
        previous = point;
      }
      from = curve.to;
    }
  }
  return total;
}

/** The worst distance between what a cut asked for and what it drew, over twenty
 * even fractions, as a share of the whole length. */
function worstUneven(path: Path): number {
  const whole = trueLength(path);
  let worst = 0;
  for (let step = 1; step < 20; step++) {
    const wanted = step / 20;
    worst = Math.max(worst, Math.abs(trueLength(trimPath(path, wanted)) / whole - wanted));
  }
  return worst;
}

const coords = coordsOf(
  scaleOf(interval(-1, 4), interval(-4.6, 4.6)),
  scaleOf(interval(-1, 9), interval(-2.4, 2.4))
);

describe('a cut by length', () => {
  it('is even along one long curve, where the parameter is not', () => {
    // A cubic's parameter is not its length: the same step in parameter covers
    // more of the curve where the curve is moving fast. Reading the fraction of
    // the length as the parameter left this 4.7e-3 of the whole out.
    expect(worstUneven(arc(vec2(0, 0), 1, 0, Math.PI / 2))).toBeLessThan(2e-4);
  });

  it('is even across several pieces', () => {
    expect(worstUneven(circle(vec2(0, 0), 1))).toBeLessThan(2e-5);
  });

  it("is even along the demo's own curve", () => {
    expect(worstUneven(plot(coords, (x) => x * x))).toBeLessThan(1e-6);
  });

  it('is the whole path at a fraction of one and nothing at a fraction of nothing', () => {
    const path = arc(vec2(0, 0), 1, 0, Math.PI / 2);
    expect(trimPath(path, 1)).toBe(path);
    expect(trimPath(path, 2)).toBe(path);
    expect(trimPath(path, 0)).toEqual([]);
    expect(trimPath(path, -1)).toEqual([]);
  });

  it('grows with the fraction and never shrinks', () => {
    const path = circle(vec2(0, 0), 1);
    let previous = 0;
    for (let step = 1; step <= 20; step++) {
      const length = trueLength(trimPath(path, step / 20));
      expect(length).toBeGreaterThanOrEqual(previous);
      previous = length;
    }
  });
});

describe('how long a path is', () => {
  it('is exact for a straight line, since a chord of a straight line is the line', () => {
    expect(lengthOf(line(vec2(0, 0), vec2(3, 4)))).toBe(5);
    expect(lengthOf(line(vec2(-1, -1), vec2(-1, 5)))).toBeCloseTo(6, 12);
  });

  it('reads a circle a few parts in ten thousand short, because a chord cuts the corner', () => {
    const ring = circle(vec2(0, 0), 1);
    const fine = trueLength(ring);
    expect(lengthOf(ring)).toBeLessThan(fine);
    expect((fine - lengthOf(ring)) / fine).toBeLessThan(5e-4);
  });

  it('adds up every subpath', () => {
    const two = [...line(vec2(0, 0), vec2(3, 4)), ...line(vec2(0, 0), vec2(0, 6))];
    expect(lengthOf(two)).toBeCloseTo(11, 12);
  });

  it('is nothing for a path with no points', () => {
    expect(lengthOf([])).toBe(0);
  });
});

describe('the point a fraction along a path', () => {
  const quarter = arc(vec2(0, 0), 1, 0, Math.PI / 2);
  const gaps = (points: readonly { x: number; y: number }[]) =>
    points.slice(1).map((point, at) => Math.hypot(point.x - points[at].x, point.y - points[at].y));
  const spread = (points: readonly { x: number; y: number }[]) => {
    const sizes = gaps(points);
    return Math.max(...sizes) / Math.min(...sizes);
  };
  const walked = (path: Path, steps: number) =>
    Array.from({ length: steps + 1 }, (_, step) => pointAlong(path, step / steps)!);

  it('takes steps of one size where the parameter takes steps of many', () => {
    // A cubic covers more of itself per step of parameter where it is moving
    // fast, so even steps in parameter are uneven steps along the curve.
    const byParameter = Array.from({ length: 21 }, (_, step) =>
      pointOn(quarter[0].start, quarter[0].curves[0], step / 20)
    );
    expect(spread(byParameter)).toBeGreaterThan(1.06);
    expect(spread(walked(quarter, 20))).toBeLessThan(1.005);
  });

  it("takes even steps along the demo's own curve", () => {
    const coords = coordsOf(
      scaleOf(interval(-1, 4), interval(-4.6, 4.6)),
      scaleOf(interval(-1, 9), interval(-2.4, 2.4))
    );
    expect(spread(walked(plot(coords, (x) => x * x), 20))).toBeLessThan(1.002);
  });

  it('sits on the two ends exactly', () => {
    const path = line(vec2(-2, 1), vec2(3, 4));
    expect(pointAlong(path, 0)).toEqual(vec2(-2, 1));
    expect(pointAlong(path, 1)).toEqual(vec2(3, 4));
  });

  it('holds a fraction outside nothing to one at the nearer end', () => {
    const path = line(vec2(-2, 1), vec2(3, 4));
    expect(pointAlong(path, -3)).toEqual(vec2(-2, 1));
    expect(pointAlong(path, 9)).toEqual(vec2(3, 4));
  });

  it('crosses from one subpath into the next', () => {
    // Two lines of five and of six, so half the length lands part way along the
    // second of them rather than at its start.
    const two = [...line(vec2(0, 0), vec2(3, 4)), ...line(vec2(0, 0), vec2(0, 6))];
    const middle = pointAlong(two, 0.5)!;
    expect(middle.x).toBeCloseTo(0, 9);
    expect(middle.y).toBeCloseTo(0.5, 9);
  });

  it('is nothing for a path with no points, and its own start for a path of no length', () => {
    expect(pointAlong([], 0.5)).toBeNull();
    const still: Path = [{ start: vec2(2, 3), curves: [], closed: false }];
    expect(pointAlong(still, 0.5)).toEqual(vec2(2, 3));
  });
});
