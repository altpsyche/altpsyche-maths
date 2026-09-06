/**
 * Cutting a path short, which is how a shape is drawn on rather than switched on.
 *
 * The cut is by length rather than by segment, so a path whose segments differ in
 * size is drawn at one steady pace. Parameterising by segment instead is cheaper
 * and reads wrong: a long side would be crossed in the same time as a short one
 * and the pen would visibly speed up and slow down.
 */
import { vec2, type Vec2 } from '../values/vec2.js';
import { pointOn, type Cubic, type Path, type Subpath } from './path.js';

/** How many samples measure one segment. Sixteen holds the length of a quarter
 * circle to better than a part in ten thousand, which is finer than the curve's
 * own error against a true arc. */
const SAMPLES = 16;

/**
 * A cubic cut at a fraction of its own parameter, keeping the first piece.
 *
 * De Casteljau: the same repeated interpolation that evaluates the curve gives
 * the control points of both halves as it goes.
 */
function splitCubic(from: Vec2, curve: Cubic, along: number): Cubic {
  const a = vec2.lerp(from, curve.control1, along);
  const b = vec2.lerp(curve.control1, curve.control2, along);
  const c = vec2.lerp(curve.control2, curve.to, along);
  const d = vec2.lerp(a, b, along);
  const e = vec2.lerp(b, c, along);
  return { control1: a, control2: d, to: vec2.lerp(d, e, along) };
}

/** A segment's length, measured by walking it in straight steps. */
function segmentLength(from: Vec2, curve: Cubic): number {
  let total = 0;
  let previous = from;
  for (let at = 1; at <= SAMPLES; at++) {
    const point = pointOn(from, curve, at / SAMPLES);
    total += vec2.distance(previous, point);
    previous = point;
  }
  return total;
}

/** Every segment's length and the total, which is what a cut by length needs
 * before it can find which segment the cut falls in. */
function lengths(path: Path): { per: number[][]; total: number } {
  let total = 0;
  const per = path.map((subpath) => {
    let from = subpath.start;
    return subpath.curves.map((curve) => {
      const length = segmentLength(from, curve);
      from = curve.to;
      total += length;
      return length;
    });
  });
  return { per, total };
}

/**
 * The path up to a fraction of its total length.
 *
 * A fraction at or past one is the path itself, untouched, so a finished drawing
 * is the same geometry the author wrote rather than a rebuilt copy of it. A
 * subpath the cut has not reached is left out entirely, and the one it lands in
 * ends with a segment split where the cut falls.
 */
export function trimPath(path: Path, fraction: number): Path {
  if (fraction >= 1) return path;
  if (fraction <= 0) return [];
  const { per, total } = lengths(path);
  if (total === 0) return path;

  const wanted = total * fraction;
  let walked = 0;
  const kept: Subpath[] = [];

  for (let at = 0; at < path.length; at++) {
    const subpath = path[at];
    const curves: Cubic[] = [];
    let from = subpath.start;
    let cut = false;

    for (let piece = 0; piece < subpath.curves.length; piece++) {
      const curve = subpath.curves[piece];
      const length = per[at][piece];
      if (walked + length <= wanted || length === 0) {
        curves.push(curve);
        walked += length;
        from = curve.to;
        continue;
      }
      curves.push(splitCubic(from, curve, (wanted - walked) / length));
      cut = true;
      break;
    }

    // A subpath cut part way through stops being closed, because the join back
    // to its start is one of the parts that has not been drawn yet.
    if (curves.length > 0) kept.push({ start: subpath.start, curves, closed: cut ? false : subpath.closed });
    if (cut) break;
  }

  return kept;
}
