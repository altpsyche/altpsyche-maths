/**
 * Walking one path into another.
 *
 * Two paths can only be walked between when they hold the same number of points,
 * so the one with fewer is subdivided until they match. Everything is a cubic
 * already, which is what makes this possible at all: there is no case where a
 * line has to become an arc, because a line is an arc whose controls sit on it.
 */
import { vec2 } from '../values/vec2.js';
import type { Cubic, Path, Subpath } from './path.js';
import { pointOn } from './path.js';

/** One segment cut into two at a fraction, both pieces kept, which is how a
 * subpath gains a point without changing shape. */
function halves(from: Cubic['to'], curve: Cubic, along: number): [Cubic, Cubic] {
  const a = vec2.lerp(from, curve.control1, along);
  const b = vec2.lerp(curve.control1, curve.control2, along);
  const c = vec2.lerp(curve.control2, curve.to, along);
  const d = vec2.lerp(a, b, along);
  const e = vec2.lerp(b, c, along);
  const middle = vec2.lerp(d, e, along);
  return [
    { control1: a, control2: d, to: middle },
    { control1: e, control2: c, to: curve.to },
  ];
}

/**
 * A subpath rewritten to hold exactly this many segments, drawing the same shape.
 *
 * The extra cuts are spread across the longest segments one at a time rather than
 * all put in the first, so the points stay roughly evenly spaced and the walk
 * between two paths does not drag one region while another sits still.
 */
function withCurves(subpath: Subpath, wanted: number): Subpath {
  if (subpath.curves.length >= wanted || subpath.curves.length === 0) return subpath;
  let curves = [...subpath.curves];
  while (curves.length < wanted) {
    let longest = 0;
    let best = -1;
    let from = subpath.start;
    for (let at = 0; at < curves.length; at++) {
      const span = vec2.distance(from, pointOn(from, curves[at], 1));
      if (span > longest) {
        longest = span;
        best = at;
      }
      from = curves[at].to;
    }
    const cutAt = best < 0 ? 0 : best;
    let start = subpath.start;
    for (let at = 0; at < cutAt; at++) start = curves[at].to;
    const [first, second] = halves(start, curves[cutAt], 0.5);
    curves = [...curves.slice(0, cutAt), first, second, ...curves.slice(cutAt + 1)];
  }
  return { start: subpath.start, curves, closed: subpath.closed };
}

/** A subpath standing still at one point, for a path that has fewer subpaths
 * than the one it is becoming. It draws nothing and it gives the other side
 * something to walk from. */
function collapsed(at: Subpath['start'], curves: number): Subpath {
  return {
    start: at,
    curves: Array.from({ length: curves }, () => ({ control1: at, control2: at, to: at })),
    closed: false,
  };
}

/** Where a path sits, for a subpath the other side does not have. Its own first
 * point, so a shape appearing grows out of where the shape beside it starts. */
function anchorOf(path: Path): Subpath['start'] {
  return path.length > 0 ? path[0].start : vec2(0, 0);
}

/** The two paths rewritten to the same shape of point list, drawing exactly what
 * they drew before. */
export function alignPaths(from: Path, to: Path): [Path, Path] {
  const count = Math.max(from.length, to.length);
  const left: Subpath[] = [];
  const right: Subpath[] = [];
  for (let at = 0; at < count; at++) {
    const a = from[at];
    const b = to[at];
    if (a && b) {
      const curves = Math.max(a.curves.length, b.curves.length);
      left.push(withCurves(a, curves));
      right.push(withCurves(b, curves));
      continue;
    }
    if (a) {
      left.push(a);
      right.push(collapsed(anchorOf(to), a.curves.length));
      continue;
    }
    if (b) {
      left.push(collapsed(anchorOf(from), b.curves.length));
      right.push(b);
    }
  }
  return [left, right];
}

/** Part way from one path to another, point by point, after aligning them. */
export function lerpPath(from: Path, to: Path, along: number): Path {
  const [a, b] = alignPaths(from, to);
  return a.map((subpath, at) => {
    const other = b[at];
    return {
      start: vec2.lerp(subpath.start, other.start, along),
      curves: subpath.curves.map((curve, piece) => {
        const twin = other.curves[piece];
        return {
          control1: vec2.lerp(curve.control1, twin.control1, along),
          control2: vec2.lerp(curve.control2, twin.control2, along),
          to: vec2.lerp(curve.to, twin.to, along),
        };
      }),
      closed: along < 0.5 ? subpath.closed : other.closed,
    };
  });
}
