/**
 * The geometry every drawn shape is made of.
 *
 * A path is a list of subpaths, and a subpath is a starting point followed by
 * cubic Bézier segments. Everything is a cubic, a straight line included, with
 * its two controls placed a third and two thirds of the way along. One shape for
 * every curve is what makes two paths interpolable: walking one path into
 * another is walking each control point to the matching one, and a line turning
 * into an arc needs no special case.
 */
import { vec2, type Vec2 } from '../values/vec2.js';
import { mat3, type Mat3 } from '../values/mat3.js';

/** One cubic segment, carrying its two controls and where it ends. Where it
 * begins is wherever the segment before it ended. */
export interface Cubic {
  readonly control1: Vec2;
  readonly control2: Vec2;
  readonly to: Vec2;
}

export interface Subpath {
  readonly start: Vec2;
  readonly curves: readonly Cubic[];
  /** A closed subpath joins its end back to its start, which is what decides
   * whether a fill has a straight edge there and whether the stroke has ends. */
  readonly closed: boolean;
}

export type Path = readonly Subpath[];

/** A straight segment written as a cubic, with the controls on the line at a
 * third and two thirds, which is the placement that leaves the pace even. */
export function straight(from: Vec2, to: Vec2): Cubic {
  return {
    control1: vec2.lerp(from, to, 1 / 3),
    control2: vec2.lerp(from, to, 2 / 3),
    to,
  };
}

export function line(from: Vec2, to: Vec2): Path {
  return [{ start: from, curves: [straight(from, to)], closed: false }];
}

function through(points: readonly Vec2[], closed: boolean): Path {
  if (points.length < 2) return [];
  const start = points[0];
  const curves: Cubic[] = [];
  for (let at = 1; at < points.length; at++) curves.push(straight(points[at - 1], points[at]));
  if (closed) curves.push(straight(points[points.length - 1], start));
  return [{ start, curves, closed }];
}

/** An open run of straight segments. */
export function polyline(points: readonly Vec2[]): Path {
  return through(points, false);
}

/** A closed run of straight segments. */
export function polygon(points: readonly Vec2[]): Path {
  return through(points, true);
}

/** An axis-aligned rectangle from its corner and its size. */
export function rect(corner: Vec2, width: number, height: number): Path {
  return polygon([
    corner,
    vec2(corner.x + width, corner.y),
    vec2(corner.x + width, corner.y + height),
    vec2(corner.x, corner.y + height),
  ]);
}

/**
 * How far a circle's control points sit from the ends of a quarter arc, as a
 * fraction of the radius.
 *
 * Four cubics cannot be a circle exactly, and this is the value that makes the
 * error smallest: the arc passes through both ends and the midpoint, and leaves
 * the true radius by a few parts in ten thousand of it between them.
 */
const KAPPA = 0.5522847498307936;

/** A circle as four cubic quarters, anticlockwise from the positive x axis. */
export function circle(centre: Vec2, radius: number): Path {
  const k = radius * KAPPA;
  const right = vec2(centre.x + radius, centre.y);
  const top = vec2(centre.x, centre.y + radius);
  const left = vec2(centre.x - radius, centre.y);
  const bottom = vec2(centre.x, centre.y - radius);
  return [
    {
      start: right,
      curves: [
        { control1: vec2(right.x, right.y + k), control2: vec2(top.x + k, top.y), to: top },
        { control1: vec2(top.x - k, top.y), control2: vec2(left.x, left.y + k), to: left },
        { control1: vec2(left.x, left.y - k), control2: vec2(bottom.x - k, bottom.y), to: bottom },
        { control1: vec2(bottom.x + k, bottom.y), control2: vec2(right.x, right.y - k), to: right },
      ],
      closed: true,
    },
  ];
}

/**
 * An arc as a run of cubics, each covering at most a quarter turn.
 *
 * A single cubic drifts from a true arc as the angle it covers grows, so the
 * sweep is cut into quarters or less and the control distance is derived per
 * piece rather than taken from the circle's constant.
 */
export function arc(centre: Vec2, radius: number, fromAngle: number, toAngle: number): Path {
  const sweep = toAngle - fromAngle;
  if (sweep === 0 || radius === 0) return [];
  const pieces = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2)));
  const step = sweep / pieces;
  const reach = (4 / 3) * Math.tan(step / 4);
  const at = (angle: number) => vec2(centre.x + radius * Math.cos(angle), centre.y + radius * Math.sin(angle));
  const start = at(fromAngle);
  const curves: Cubic[] = [];
  for (let piece = 0; piece < pieces; piece++) {
    const a0 = fromAngle + step * piece;
    const a1 = a0 + step;
    const p0 = at(a0);
    const p1 = at(a1);
    const t0 = vec2(-Math.sin(a0), Math.cos(a0));
    const t1 = vec2(-Math.sin(a1), Math.cos(a1));
    curves.push({
      control1: vec2.add(p0, vec2.scale(t0, reach * radius)),
      control2: vec2.sub(p1, vec2.scale(t1, reach * radius)),
      to: p1,
    });
  }
  return [{ start, curves, closed: false }];
}

/** A point on a cubic, with the segment's own start passed in because a segment
 * carries where it ends and not where it began. */
export function pointOn(from: Vec2, curve: Cubic, along: number): Vec2 {
  const u = 1 - along;
  const a = u * u * u;
  const b = 3 * u * u * along;
  const c = 3 * u * along * along;
  const d = along * along * along;
  return vec2(
    a * from.x + b * curve.control1.x + c * curve.control2.x + d * curve.to.x,
    a * from.y + b * curve.control1.y + c * curve.control2.y + d * curve.to.y
  );
}

/** Which way a piece is heading at a fraction along it, which is the derivative
 * of a cubic and so a quadratic over the gaps between neighbouring points. */
export function slopeOn(from: Vec2, curve: Cubic, along: number): Vec2 {
  const u = 1 - along;
  const a = 3 * u * u;
  const b = 6 * u * along;
  const c = 3 * along * along;
  return vec2(
    a * (curve.control1.x - from.x) + b * (curve.control2.x - curve.control1.x) + c * (curve.to.x - curve.control2.x),
    a * (curve.control1.y - from.y) + b * (curve.control2.y - curve.control1.y) + c * (curve.to.y - curve.control2.y)
  );
}

/**
 * One piece cut into two at a fraction, both pieces drawing what the whole
 * drew, by de Casteljau's construction.
 *
 * The piece's own start is passed in because a piece carries where it ends and
 * not where it began.
 */
export function splitCurve(from: Vec2, curve: Cubic, along: number): [Cubic, Cubic] {
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

/** Every point of a path moved by a transform, which is how a group's transform
 * reaches the geometry rather than being carried alongside it. */
export function transformPath(path: Path, m: Mat3): Path {
  const point = (v: Vec2) => mat3.transformPoint(m, v);
  return path.map((subpath) => ({
    start: point(subpath.start),
    curves: subpath.curves.map((curve) => ({
      control1: point(curve.control1),
      control2: point(curve.control2),
      to: point(curve.to),
    })),
    closed: subpath.closed,
  }));
}

/** How many points a path holds, which is what two paths have to agree on
 * before one can be walked into the other. */
export function pointCount(path: Path): number {
  return path.reduce((total, subpath) => total + 1 + subpath.curves.length * 3, 0);
}
