/**
 * Whether a point is inside a path.
 *
 * The count is taken on a flattening rather than on the cubics, because a ray
 * against a cubic is a cubic to solve and what is wanted here is a yes or a no
 * rather than a place. The geometry a boolean operation keeps stays the exact
 * cubics; only this decision is taken on the flattening.
 *
 * The rule is the nonzero winding rule, which is the rule a mark is already
 * drawn under, so a loop wound the other way inside another loop is a hole.
 * Every edge crossing the ray is counted with the sign of the direction it
 * crosses in, and an edge is counted at its lower end and not at its upper one,
 * which is what makes a ray leaving through a corner answer what every other
 * ray answers.
 */
import { vec2, type Vec2 } from '../values/vec2.js';
import type { Cubic, Path } from './path.js';
import { TOLERANCE } from './tolerance.js';

export interface FlattenOptions {
  /** How far a straight run may sit from the curve it stands for, in the
   * picture's own units. */
  readonly tolerance?: number;
}


/** How many times a piece may be halved, which a tolerance of zero would
 * otherwise leave unbounded. */
const DEPTH = 24;

/**
 * How many points a whole flattening may hold before it is refused.
 *
 * Halving is the only bound the depth gives, so with no ceiling on the count a
 * fine tolerance is a machine out of memory rather than a fine flattening. The
 * ceiling sits far above what the finest tolerance a figure asks for reaches.
 */
const POINTS = 1_000_000;

/** How far the two controls sit from the straight run between the ends.
 *
 * The curve itself stays within three quarters of this, so measuring the
 * controls asks for a little more than the tolerance rather than a little
 * less. */
function offChord(from: Vec2, curve: Cubic): number {
  const run = vec2.sub(curve.to, from);
  const span = Math.hypot(run.x, run.y);
  if (span === 0) {
    return Math.max(vec2.distance(curve.control1, from), vec2.distance(curve.control2, from));
  }
  const away = (point: Vec2) =>
    Math.abs(run.x * (point.y - from.y) - run.y * (point.x - from.x)) / span;
  return Math.max(away(curve.control1), away(curve.control2));
}

function walk(from: Vec2, curve: Cubic, tolerance: number, depth: number, into: Vec2[]): void {
  if (depth >= DEPTH || offChord(from, curve) <= tolerance) {
    into.push(curve.to);
    return;
  }
  if (into.length >= POINTS) {
    throw new Error(
      `a tolerance of ${tolerance} asks for more than ${POINTS} straight runs to stand for one ` +
        `curve, which is finer than this flattens`
    );
  }
  const a = vec2.lerp(from, curve.control1, 0.5);
  const b = vec2.lerp(curve.control1, curve.control2, 0.5);
  const c = vec2.lerp(curve.control2, curve.to, 0.5);
  const d = vec2.lerp(a, b, 0.5);
  const e = vec2.lerp(b, c, 0.5);
  const middle = vec2.lerp(d, e, 0.5);
  walk(from, { control1: a, control2: d, to: middle }, tolerance, depth + 1, into);
  walk(middle, { control1: e, control2: c, to: curve.to }, tolerance, depth + 1, into);
}

/** One subpath as a run of points, keeping whether it was written closed. */
export interface FlatRun {
  readonly points: readonly Vec2[];
  readonly closed: boolean;
}

/**
 * Every subpath as a run of points, left as it was written.
 *
 * The ends of an open run are kept apart, because an outline has caps to put
 * there and a run joined back to its start has no ends to put them on.
 */
export function flattenRuns(path: Path, options: FlattenOptions = {}): FlatRun[] {
  const tolerance = options.tolerance ?? TOLERANCE;
  const runs: FlatRun[] = [];
  for (const subpath of path) {
    if (subpath.curves.length === 0) continue;
    const points: Vec2[] = [subpath.start];
    let from = subpath.start;
    for (const curve of subpath.curves) {
      walk(from, curve, tolerance, 0, points);
      from = curve.to;
    }
    runs.push({ points, closed: subpath.closed });
  }
  return runs;
}

/**
 * Every subpath as a run of points, each loop closed.
 *
 * A subpath that was left open is closed by the straight run back to where it
 * started, since a path with an open loop has no inside until it has one.
 */
export function flattenPath(path: Path, options: FlattenOptions = {}): Vec2[][] {
  return flattenRuns(path, options).map(({ points }) => {
    const loop = [...points];
    const last = loop[loop.length - 1];
    if (last.x !== loop[0].x || last.y !== loop[0].y) loop.push(loop[0]);
    return loop;
  });
}

/** Which side of the run from one point to another a third point falls on,
 * positive to the left of it. */
function leftOf(from: Vec2, to: Vec2, point: Vec2): number {
  return (to.x - from.x) * (point.y - from.y) - (point.x - from.x) * (to.y - from.y);
}

/** How many times the loops wind round a point, counted along the ray heading
 * in the positive x direction. */
export function windingAt(loops: readonly (readonly Vec2[])[], point: Vec2): number {
  let winding = 0;
  for (const loop of loops) {
    for (let at = 1; at < loop.length; at++) {
      const from = loop[at - 1];
      const to = loop[at];
      if (from.y <= point.y) {
        if (to.y > point.y && leftOf(from, to, point) > 0) winding += 1;
      } else if (to.y <= point.y && leftOf(from, to, point) < 0) {
        winding -= 1;
      }
    }
  }
  return winding;
}

/** The nearest straight run of a flattening to a point: how far off it is, and
 * which way that run goes. */
export interface FlatEdge {
  readonly gap: number;
  readonly heading: Vec2;
}

/**
 * Which edge of a flattening a point sits nearest, and which way it runs.
 *
 * This is what tells a piece lying along another path's edge from one merely
 * near it, which the winding count cannot answer because a point on the edge
 * itself is the one place the count has no answer for.
 */
export function nearestEdge(loops: readonly (readonly Vec2[])[], point: Vec2): FlatEdge | null {
  let nearest: FlatEdge | null = null;
  for (const loop of loops) {
    for (let at = 1; at < loop.length; at++) {
      const from = loop[at - 1];
      const to = loop[at];
      const run = vec2.sub(to, from);
      const square = vec2.dot(run, run);
      const along = square === 0 ? 0 : Math.min(1, Math.max(0, vec2.dot(vec2.sub(point, from), run) / square));
      const gap = vec2.distance(point, vec2.add(from, vec2.scale(run, along)));
      if (!nearest || gap < nearest.gap) nearest = { gap, heading: run };
    }
  }
  return nearest;
}

/**
 * Whether a path holds a point, under the nonzero rule.
 *
 * A point sitting on the edge itself has no answer this can be right about, and
 * what comes back for one is whichever side the tolerance put it on.
 *
 * The path is flattened again on every call, which is a millisecond every three
 * points against a path of a hundred pieces. Asking about many points wants the
 * flattening made once and the count taken against it.
 */
export function containsPoint(path: Path, point: Vec2, options: FlattenOptions = {}): boolean {
  return windingAt(flattenPath(path, options), point) !== 0;
}
