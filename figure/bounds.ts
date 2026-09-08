/**
 * The smallest box holding a path, worked out rather than sampled.
 *
 * A curve's furthest point is usually not one of the points it is written from,
 * so the box round the control points is bigger than the box round the curve.
 * The derivative of a cubic is a quadratic, so where each piece turns back on
 * itself is the root of a quadratic, and the box is those turns together with
 * the ends of every piece.
 */
import { interval, type Interval } from '../values/interval.js';
import { pointOn, type Cubic, type Path } from './path.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import type { Mark } from './mark.js';

export interface Bounds {
  readonly x: Interval;
  readonly y: Interval;
}

/** Below this a squared term counts as absent and the derivative is read as a
 * straight line, which is what a cubic written as a straight segment is. */
const FLAT = 1e-12;

/**
 * Where one piece turns back on itself along one axis, as fractions of its own
 * length strictly between its two ends.
 *
 * The ends are added by the caller, since they belong to the piece rather than
 * to its turns, and a piece with no turn at all still has them.
 */
function turns(from: number, control1: number, control2: number, to: number): number[] {
  const square = -from + 3 * control1 - 3 * control2 + to;
  const linear = 2 * from - 4 * control1 + 2 * control2;
  const constant = control1 - from;
  const inside = (at: number) => (at > 0 && at < 1 ? [at] : []);

  if (Math.abs(square) < FLAT) {
    if (Math.abs(linear) < FLAT) return [];
    return inside(-constant / linear);
  }
  const under = linear * linear - 4 * square * constant;
  if (under < 0) return [];
  const root = Math.sqrt(under);
  return [...inside((-linear + root) / (2 * square)), ...inside((-linear - root) / (2 * square))];
}

function grown(bounds: { low: number; high: number }, value: number): void {
  if (value < bounds.low) bounds.low = value;
  if (value > bounds.high) bounds.high = value;
}

function reach(into: { x: { low: number; high: number }; y: { low: number; high: number } }, point: Vec2): void {
  grown(into.x, point.x);
  grown(into.y, point.y);
}

function pieceReach(
  into: { x: { low: number; high: number }; y: { low: number; high: number } },
  from: Vec2,
  curve: Cubic
): void {
  reach(into, curve.to);
  for (const at of turns(from.x, curve.control1.x, curve.control2.x, curve.to.x)) {
    reach(into, pointOn(from, curve, at));
  }
  for (const at of turns(from.y, curve.control1.y, curve.control2.y, curve.to.y)) {
    reach(into, pointOn(from, curve, at));
  }
}

function empty() {
  return {
    x: { low: Infinity, high: -Infinity },
    y: { low: Infinity, high: -Infinity },
  };
}

function settled(box: ReturnType<typeof empty>): Bounds | null {
  if (box.x.low > box.x.high) return null;
  return { x: interval(box.x.low, box.x.high), y: interval(box.y.low, box.y.high) };
}

/** The box round a path, or nothing where the path holds no points. */
export function boundsOf(path: Path): Bounds | null {
  const box = empty();
  for (const subpath of path) {
    reach(box, subpath.start);
    let from = subpath.start;
    for (const curve of subpath.curves) {
      pieceReach(box, from, curve);
      from = curve.to;
    }
  }
  return settled(box);
}

/**
 * The box round a list of marks, or nothing where the list is empty.
 *
 * A text mark reaches only as far as its own anchor. How wide some text is
 * depends on which fonts the machine has, so a box that took it in would be a
 * different box on two machines, and nothing about a figure's layout may turn on
 * that.
 */
export function boundsOfMarks(marks: readonly Mark[]): Bounds | null {
  const box = empty();
  for (const mark of marks) {
    if (mark.kind === 'text') {
      reach(box, mark.at);
      continue;
    }
    for (const subpath of mark.path) {
      reach(box, subpath.start);
      let from = subpath.start;
      for (const curve of subpath.curves) {
        pieceReach(box, from, curve);
        from = curve.to;
      }
    }
  }
  return settled(box);
}

/** The middle of a box, which is what a turn or a growth happens about when a
 * figure names no other point. */
export function centreOf(bounds: Bounds): Vec2 {
  return vec2(interval.at(bounds.x, 0.5), interval.at(bounds.y, 0.5));
}

/**
 * The box both boxes hold, or nothing where they miss each other.
 *
 * Touching along an edge counts as meeting, so a box holds what sits exactly on
 * its boundary. Refusing that would drop a mark drawn along the edge of its own
 * clip, which is where an axis usually sits.
 */
export function overlapOf(one: Bounds, other: Bounds): Bounds | null {
  const a = { x: interval.ordered(one.x), y: interval.ordered(one.y) };
  const b = { x: interval.ordered(other.x), y: interval.ordered(other.y) };
  const from = vec2(Math.max(a.x.from, b.x.from), Math.max(a.y.from, b.y.from));
  const to = vec2(Math.min(a.x.to, b.x.to), Math.min(a.y.to, b.y.to));
  if (from.x > to.x || from.y > to.y) return null;
  return { x: interval(from.x, to.x), y: interval(from.y, to.y) };
}

/** The box reaching one margin further out on all four sides, which is what a
 * stroke of a given width adds to the geometry it is drawn along. */
export function grownBy(bounds: Bounds, margin: number): Bounds {
  const x = interval.ordered(bounds.x);
  const y = interval.ordered(bounds.y);
  return { x: interval(x.from - margin, x.to + margin), y: interval(y.from - margin, y.to + margin) };
}
