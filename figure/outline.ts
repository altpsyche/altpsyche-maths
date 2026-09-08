/**
 * The filled outline of a stroked path.
 *
 * A painter draws a stroke at one width along its whole length, so a stroke
 * whose width changes has to be geometry instead. The outline is the two sides
 * of the stroke walked as one closed loop, and what reaches a painter is a
 * filled path both of them already draw.
 *
 * The loop is built on a flattening rather than on the cubics. The offset of a
 * cubic is not a cubic, so offsetting one means either fitting cubics to the
 * result or walking a polyline, and a polyline is also what a width read at
 * every point along the length wants.
 *
 * Caps, joins and the miter limit are the SVG specification's, and the defaults
 * here are its defaults: a butt cap, a miter join, and a limit of four.
 */
import { vec2, type Vec2 } from '../values/vec2.js';
import { polygon, type Path } from './path.js';
import { flattenRuns } from './inside.js';
import type { Stroke } from './mark.js';

export interface OutlineOptions {
  /** What the two ends of an open stroke are finished with. */
  readonly cap?: NonNullable<Stroke['cap']>;
  /** What fills the wedge on the outside of a corner. */
  readonly join?: NonNullable<Stroke['join']>;
  /** How far a miter may reach past its corner, as a multiple of the width,
   * before the join is cut back to a bevel. */
  readonly miterLimit?: number;
  /** How far the outline may sit from the true offset, in figure units. */
  readonly tolerance?: number;
}

/**
 * How far the outline may sit from the true offset, in figure units.
 *
 * At the hundred pixels to the unit the demos draw at this is a tenth of a
 * pixel. The other tolerance in this package decides which two places are read
 * as one and is a millionth, which here would spend a few thousand points on a
 * curve nothing can see the corners of.
 */
const FLATNESS = 1e-3;

/** The SVG specification's own default, which cuts a miter back to a bevel once
 * the corner reaches four times the width. */
const MITER_LIMIT = 4;

/** How close two points come before the walk reads them as one, below which a
 * run between them has no direction to offset along. */
const SAME_PLACE = 1e-12;

interface Settings {
  readonly cap: NonNullable<Stroke['cap']>;
  readonly join: NonNullable<Stroke['join']>;
  readonly limit: number;
  readonly tolerance: number;
}

function samePlace(a: Vec2, b: Vec2): boolean {
  return Math.abs(a.x - b.x) <= SAME_PLACE && Math.abs(a.y - b.y) <= SAME_PLACE;
}

/** The run with every repeated point dropped, and the closing repeat with it
 * where the run is a loop, since a loop's last point is its first. */
function withoutRepeats(points: readonly Vec2[], loop: boolean): Vec2[] {
  const kept: Vec2[] = [];
  for (const point of points) {
    if (kept.length === 0 || !samePlace(kept[kept.length - 1], point)) kept.push(point);
  }
  while (loop && kept.length > 1 && samePlace(kept[0], kept[kept.length - 1])) kept.pop();
  return kept;
}

/** Which way each run of the walk heads, one per pair of neighbouring points
 * and one more from the last point back to the first where the walk is a loop. */
function headingsOf(points: readonly Vec2[], loop: boolean): Vec2[] {
  const headings: Vec2[] = [];
  for (let at = 1; at < points.length; at++) {
    headings.push(vec2.normalize(vec2.sub(points[at], points[at - 1])));
  }
  if (loop) headings.push(vec2.normalize(vec2.sub(points[0], points[points.length - 1])));
  return headings;
}

/**
 * The points of a turn about a centre, both ends left out because whatever
 * asked for the turn has already placed them.
 *
 * The step is the widest angle whose chord stays inside the tolerance, which
 * for a radius r and a step d leaves the chord r(1 − cos(d/2)) short.
 */
function turnPoints(centre: Vec2, from: Vec2, sweep: number, radius: number, tolerance: number): Vec2[] {
  const widest = radius > tolerance ? 2 * Math.acos(1 - tolerance / radius) : Math.PI;
  const steps = Math.max(1, Math.ceil(Math.abs(sweep) / widest));
  const spoke = vec2.sub(from, centre);
  const points: Vec2[] = [];
  for (let step = 1; step < steps; step++) {
    points.push(vec2.add(centre, vec2.rotate(spoke, (sweep * step) / steps)));
  }
  return points;
}

/** Where two offset runs cross, which is the point a miter reaches. Runs that
 * are parallel never meet and have no such point. */
function meetOf(a: Vec2, alongA: Vec2, b: Vec2, alongB: Vec2): Vec2 | null {
  const denominator = vec2.cross(alongA, alongB);
  if (denominator === 0) return null;
  const along = vec2.cross(vec2.sub(b, a), alongB) / denominator;
  return vec2.add(a, vec2.scale(alongA, along));
}

/**
 * What the offset side does at one corner.
 *
 * The offset is taken to the left of the walk, so the side is on the outside of
 * the corner where the walk turns right, and that is the side a cap-shaped join
 * has a wedge to fill. On the inside the two offsets have already crossed, and
 * the point where they cross is the corner the side turns at, so the outline
 * does not double back over itself and count its own area twice.
 */
function cornerInto(
  into: Vec2[],
  corner: Vec2,
  incoming: Vec2,
  outgoing: Vec2,
  reach: number,
  half: number,
  settings: Settings
): void {
  const a = vec2.add(corner, vec2.scale(vec2.perpendicular(incoming), half));
  const b = vec2.add(corner, vec2.scale(vec2.perpendicular(outgoing), half));
  const turn = vec2.cross(incoming, outgoing);
  const outside = turn < 0;

  if (!outside || settings.join === 'miter') {
    const tip = meetOf(a, incoming, b, outgoing);
    const far = outside ? settings.limit * half : reach;
    if (tip && vec2.distance(tip, corner) <= far) {
      into.push(tip);
      return;
    }
  }

  if (outside && settings.join === 'round') {
    const sweep = Math.atan2(
      vec2.cross(vec2.sub(a, corner), vec2.sub(b, corner)),
      vec2.dot(vec2.sub(a, corner), vec2.sub(b, corner))
    );
    into.push(a, ...turnPoints(corner, a, sweep, half, settings.tolerance), b);
    return;
  }

  into.push(a, b);
}

/** How far a corner's miter may reach before it is longer than the runs it
 * joins, which is what keeps an inward corner from spiking past them. */
function reachAt(points: readonly Vec2[], at: number): number {
  const count = points.length;
  const back = vec2.distance(points[at], points[(at - 1 + count) % count]);
  const on = vec2.distance(points[at], points[(at + 1) % count]);
  return Math.min(back, on);
}

/** One side of the stroke, offset to the left of the walk by half the width. */
function offsetSide(points: readonly Vec2[], loop: boolean, half: number, settings: Settings): Vec2[] {
  const headings = headingsOf(points, loop);
  const side: Vec2[] = [];
  if (!loop) side.push(vec2.add(points[0], vec2.scale(vec2.perpendicular(headings[0]), half)));

  const first = loop ? 0 : 1;
  const last = loop ? points.length - 1 : points.length - 2;
  for (let at = first; at <= last; at++) {
    const incoming = headings[(at - 1 + headings.length) % headings.length];
    cornerInto(side, points[at], incoming, headings[at], reachAt(points, at), half, settings);
  }

  if (!loop) {
    const heading = headings[headings.length - 1];
    side.push(vec2.add(points[points.length - 1], vec2.scale(vec2.perpendicular(heading), half)));
  }
  return side;
}

/** What one end of an open stroke is finished with, between the point the near
 * side ends at and the point the far side begins from. */
function capPoints(end: Vec2, heading: Vec2, half: number, settings: Settings): Vec2[] {
  const side = vec2.scale(vec2.perpendicular(heading), half);
  const near = vec2.add(end, side);
  if (settings.cap === 'round') return turnPoints(end, near, -Math.PI, half, settings.tolerance);
  if (settings.cap === 'square') {
    const past = vec2.scale(heading, half);
    return [vec2.add(near, past), vec2.add(vec2.sub(end, side), past)];
  }
  return [];
}

/** A run with no length draws its cap and nothing else, which is the SVG
 * specification's rule and what keeps a stroked dot from vanishing. */
function capAlone(at: Vec2, half: number, settings: Settings): Vec2[] | null {
  if (settings.cap === 'round') {
    const from = vec2(at.x + half, at.y);
    return [from, ...turnPoints(at, from, 2 * Math.PI, half, settings.tolerance)];
  }
  if (settings.cap === 'square') {
    return [
      vec2(at.x - half, at.y - half),
      vec2(at.x + half, at.y - half),
      vec2(at.x + half, at.y + half),
      vec2(at.x - half, at.y + half),
    ];
  }
  return null;
}

/**
 * A path stroked at a width, as the filled outline of that stroke.
 *
 * An open subpath becomes one loop: the left side out, the cap, the right side
 * back, and the cap at the start. A closed subpath becomes two loops wound
 * against each other, which is what the nonzero rule reads as a ring rather
 * than as a disc.
 *
 * A width of nothing or less has no outline and gives an empty path.
 */
export function outlinePath(path: Path, width: number, options: OutlineOptions = {}): Path {
  const half = width / 2;
  if (!(half > 0)) return [];
  const settings: Settings = {
    cap: options.cap ?? 'butt',
    join: options.join ?? 'miter',
    limit: options.miterLimit ?? MITER_LIMIT,
    tolerance: options.tolerance ?? FLATNESS,
  };

  const loops: Vec2[][] = [];
  for (const run of flattenRuns(path, { tolerance: settings.tolerance })) {
    const points = withoutRepeats(run.points, run.closed);
    if (points.length < 2) {
      const alone = capAlone(points[0], half, settings);
      if (alone) loops.push(alone);
      continue;
    }

    // A loop of two points has doubled back on itself and has ends, so it is
    // walked as an open stroke and gets the caps that go with them.
    const loop = run.closed && points.length > 2;
    if (loop) {
      loops.push(offsetSide(points, true, half, settings));
      loops.push(offsetSide([...points].reverse(), true, half, settings));
      continue;
    }

    const back = [...points].reverse();
    const ending = vec2.normalize(vec2.sub(points[points.length - 1], points[points.length - 2]));
    const starting = vec2.normalize(vec2.sub(points[0], points[1]));
    loops.push([
      ...offsetSide(points, false, half, settings),
      ...capPoints(points[points.length - 1], ending, half, settings),
      ...offsetSide(back, false, half, settings),
      ...capPoints(points[0], starting, half, settings),
    ]);
  }

  return loops.flatMap((loop) => polygon(withoutRepeats(loop, true)));
}
