import { describe, expect, it } from 'vitest';
import { arc, circle, coordsOf, interval, plot, scaleOf, trimPath, vec2, type Cubic, type Path } from '../index.js';

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
