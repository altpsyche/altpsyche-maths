/**
 * Cutting a path short, which is how a shape is drawn on rather than switched on.
 *
 * The cut is by length rather than by segment, so a path whose segments differ in
 * size is drawn at one steady pace. Parameterising by segment instead is cheaper
 * and reads wrong: a long side would be crossed in the same time as a short one
 * and the pen would visibly speed up and slow down. The length inside a segment
 * is read off that segment's own table for the same reason.
 */
import { vec2, type Vec2 } from '../values/vec2.js';
import { measurePath, parameterAt } from './length.js';
import type { Cubic, Path, Subpath } from './path.js';

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
  const { per, total } = measurePath(path);
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
      const measured = per[at][piece];
      const length = measured.total;
      if (walked + length <= wanted || length === 0) {
        curves.push(curve);
        walked += length;
        from = curve.to;
        continue;
      }
      curves.push(splitCubic(from, curve, parameterAt(measured, wanted - walked)));
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
