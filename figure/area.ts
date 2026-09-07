/**
 * How much a path encloses.
 *
 * This is Green's theorem, which turns the area inside a closed loop into an
 * integral round its edge, and for a cubic that integral has a closed form. So
 * the answer is worked out rather than sampled, and it is exact for the shape
 * the cubics actually draw.
 *
 * The sign is the direction the loop is wound in, positive anticlockwise. That
 * is what makes a hole subtract: a loop wound the other way inside another one
 * encloses a negative amount, and the two added together are the ring.
 */
import type { Cubic, Path } from './path.js';
import type { Vec2 } from '../values/vec2.js';

/** Twice the area of the triangle two points make with the origin, positive
 * anticlockwise. */
function wedge(a: Vec2, b: Vec2): number {
  return a.x * b.y - b.x * a.y;
}

/**
 * What one piece contributes to the integral round the loop.
 *
 * Each pair of the piece's four points contributes the triangle it makes with
 * the origin, and the weights are what integrating a cubic against its own
 * derivative leaves: six, three, one, three, three and six twentieths, in the
 * order the pairs are taken.
 */
function pieceArea(from: Vec2, curve: Cubic): number {
  const { control1, control2, to } = curve;
  return (
    (6 * wedge(from, control1) +
      3 * wedge(from, control2) +
      wedge(from, to) +
      3 * wedge(control1, control2) +
      3 * wedge(control1, to) +
      6 * wedge(control2, to)) /
    20
  );
}

/**
 * How much a path encloses, positive where it is wound anticlockwise.
 *
 * A subpath left open is closed by the straight run back to where it started,
 * since an open loop encloses nothing on its own. Every subpath is added, so a
 * ring written as an outer loop and an inner loop wound the other way comes
 * back as the difference between the two discs.
 */
export function areaOf(path: Path): number {
  let total = 0;
  for (const subpath of path) {
    if (subpath.curves.length === 0) continue;
    let from = subpath.start;
    for (const curve of subpath.curves) {
      total += pieceArea(from, curve);
      from = curve.to;
    }
    total += wedge(from, subpath.start) / 2;
  }
  return total;
}
