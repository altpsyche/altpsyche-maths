/**
 * Where two cubics cross.
 *
 * Two curves whose boxes miss each other cannot cross, so a pair is halved by
 * de Casteljau's construction and only the halves whose boxes still overlap are
 * followed down, until both are smaller than the tolerance. A box is bigger
 * than the curve inside it, so a pair that small is kept only when the straight
 * runs across the two pieces come within the tolerance of each other. What is
 * left is a run of touching hits per meeting rather than one hit, so the run is
 * joined up and answered once, and then sharpened by Newton's method on the
 * pair, which is what takes a crossing of two straight pieces from the
 * tolerance to the last few bits.
 */
import { vec2, type Vec2 } from '../values/vec2.js';
import type { Cubic } from './path.js';

/** One place two curves meet, as a fraction along each of them and the point
 * itself. */
export interface Crossing {
  readonly alongFirst: number;
  readonly alongSecond: number;
  readonly point: Vec2;
}

export interface CrossingOptions {
  /** How close two pieces come before they count as meeting, in the picture's
   * own units. */
  readonly tolerance?: number;
}

/** How close two pieces come before they count as meeting. It decides which
 * meetings are told apart rather than how sharp one is, since Newton's method
 * supplies the sharpness afterwards. */
const TOLERANCE = 1e-6;

/** How many pairs the search may open before it answers with where it had got
 * to, which is what stops two curves lying on top of each other for a stretch
 * from halving forever. */
const BUDGET = 500_000;

/** How deep the halving goes, which a tolerance of zero would otherwise leave
 * unbounded. */
const DEPTH = 60;

/** Below this the two tangents are parallel, Newton's step divides by nothing,
 * and the answer stays the one the halving gave. */
const PARALLEL = 1e-12;

/** How far Newton is allowed to move a cluster before its step is read as a
 * jump to a different crossing and thrown away. */
const REACH = 1e-3;

type Hull = readonly [Vec2, Vec2, Vec2, Vec2];

interface Box {
  readonly lowX: number;
  readonly highX: number;
  readonly lowY: number;
  readonly highY: number;
}

/** One meeting as the search found it, carrying the stretch of each curve it
 * was found in so that a run of them can be joined up. */
interface Hit extends Crossing {
  readonly firstLow: number;
  readonly firstHigh: number;
  readonly secondLow: number;
  readonly secondHigh: number;
}

interface Pair {
  readonly first: Hull;
  readonly firstLow: number;
  readonly firstHigh: number;
  readonly second: Hull;
  readonly secondLow: number;
  readonly secondHigh: number;
  readonly depth: number;
}

/** A segment written as its four points, since a segment carries where it ends
 * and not where it began. */
function hullOf(from: Vec2, curve: Cubic): Hull {
  return [from, curve.control1, curve.control2, curve.to];
}

/** The box round the four points, which holds the curve because a cubic never
 * leaves the hull of the points it is written from. */
function boxOf(hull: Hull): Box {
  let lowX = hull[0].x;
  let highX = hull[0].x;
  let lowY = hull[0].y;
  let highY = hull[0].y;
  for (let at = 1; at < 4; at++) {
    const point = hull[at];
    if (point.x < lowX) lowX = point.x;
    if (point.x > highX) highX = point.x;
    if (point.y < lowY) lowY = point.y;
    if (point.y > highY) highY = point.y;
  }
  return { lowX, highX, lowY, highY };
}

function spread(box: Box): number {
  return Math.max(box.highX - box.lowX, box.highY - box.lowY);
}

/** Whether two boxes miss, with the tolerance added on both sides so two curves
 * touching at exactly one point are not lost to rounding. */
function apart(a: Box, b: Box, slack: number): boolean {
  return (
    a.lowX - slack > b.highX ||
    b.lowX - slack > a.highX ||
    a.lowY - slack > b.highY ||
    b.lowY - slack > a.highY
  );
}

/** How far a point sits from a straight run between two points. */
function offSegment(point: Vec2, from: Vec2, to: Vec2): number {
  const run = vec2.sub(to, from);
  const square = vec2.dot(run, run);
  const along = square === 0 ? 0 : held(vec2.dot(vec2.sub(point, from), run) / square);
  return vec2.distance(point, vec2.add(from, vec2.scale(run, along)));
}

/**
 * How far apart two pieces are, taken between the straight runs across them.
 *
 * A piece no bigger than the tolerance leaves its own chord by a fraction of
 * that, so the chords answer for the curves here, and this is what tells a
 * meeting from two boxes that merely overlap without their curves coming close.
 */
function chordGap(first: Hull, second: Hull): number {
  const a = first[0];
  const b = first[3];
  const c = second[0];
  const d = second[3];
  const ab = vec2.sub(b, a);
  const cd = vec2.sub(d, c);
  const under = ab.x * cd.y - ab.y * cd.x;
  if (under !== 0) {
    const ac = vec2.sub(c, a);
    const alongFirst = (ac.x * cd.y - ac.y * cd.x) / under;
    const alongSecond = (ac.x * ab.y - ac.y * ab.x) / under;
    if (alongFirst >= 0 && alongFirst <= 1 && alongSecond >= 0 && alongSecond <= 1) return 0;
  }
  return Math.min(
    offSegment(a, c, d),
    offSegment(b, c, d),
    offSegment(c, a, b),
    offSegment(d, a, b)
  );
}

/** A segment cut in half, both pieces drawing what the whole drew. */
function halves(hull: Hull): [Hull, Hull] {
  const a = vec2.lerp(hull[0], hull[1], 0.5);
  const b = vec2.lerp(hull[1], hull[2], 0.5);
  const c = vec2.lerp(hull[2], hull[3], 0.5);
  const d = vec2.lerp(a, b, 0.5);
  const e = vec2.lerp(b, c, 0.5);
  const middle = vec2.lerp(d, e, 0.5);
  return [
    [hull[0], a, d, middle],
    [middle, e, c, hull[3]],
  ];
}

function pointAt(hull: Hull, along: number): Vec2 {
  const u = 1 - along;
  const a = u * u * u;
  const b = 3 * u * u * along;
  const c = 3 * u * along * along;
  const d = along * along * along;
  return vec2(
    a * hull[0].x + b * hull[1].x + c * hull[2].x + d * hull[3].x,
    a * hull[0].y + b * hull[1].y + c * hull[2].y + d * hull[3].y
  );
}

/** Which way the curve is heading, read off the four points the search already
 * holds rather than off a piece, so following a pair down allocates nothing. */
function slopeAt(hull: Hull, along: number): Vec2 {
  const u = 1 - along;
  const a = 3 * u * u;
  const b = 6 * u * along;
  const c = 3 * along * along;
  return vec2(
    a * (hull[1].x - hull[0].x) + b * (hull[2].x - hull[1].x) + c * (hull[3].x - hull[2].x),
    a * (hull[1].y - hull[0].y) + b * (hull[2].y - hull[1].y) + c * (hull[3].y - hull[2].y)
  );
}

/** A fraction pulled back onto the segment, so a crossing at an end lands on
 * the end exactly rather than a hair outside it. */
function held(along: number): number {
  return along < 0 ? 0 : along > 1 ? 1 : along;
}

function gapBetween(first: Hull, second: Hull, alongFirst: number, alongSecond: number): number {
  return vec2.distance(pointAt(first, alongFirst), pointAt(second, alongSecond));
}

/**
 * One cluster moved onto the crossing itself, by Newton's method on the pair of
 * curves: the step that takes the difference between the two points to zero is
 * the two tangents solved as a two by two system.
 *
 * A tangency has no such step, since the tangents are parallel there and the
 * system has no answer, so the halving's own reading is what stands.
 */
function sharpened(first: Hull, second: Hull, start: Crossing): Crossing {
  let alongFirst = start.alongFirst;
  let alongSecond = start.alongSecond;
  let gap = gapBetween(first, second, alongFirst, alongSecond);
  for (let step = 0; step < 12; step++) {
    const apartBy = vec2.sub(pointAt(first, alongFirst), pointAt(second, alongSecond));
    const heading = slopeAt(first, alongFirst);
    const other = slopeAt(second, alongSecond);
    const under = other.x * heading.y - heading.x * other.y;
    if (Math.abs(under) < PARALLEL) break;
    const moveFirst = (apartBy.x * other.y - other.x * apartBy.y) / under;
    const moveSecond = (apartBy.x * heading.y - heading.x * apartBy.y) / under;
    if (Math.abs(moveFirst) > REACH || Math.abs(moveSecond) > REACH) break;
    const nextFirst = held(alongFirst + moveFirst);
    const nextSecond = held(alongSecond + moveSecond);
    const nextGap = gapBetween(first, second, nextFirst, nextSecond);
    if (nextGap > gap) break;
    alongFirst = nextFirst;
    alongSecond = nextSecond;
    gap = nextGap;
    if (gap === 0) break;
  }
  return { alongFirst, alongSecond, point: pointAt(first, alongFirst) };
}

/**
 * A run of hits reported as the places they gather at.
 *
 * Every hit carries the stretch of each curve it was found in, and two hits
 * whose stretches touch on both curves are the same meeting: the stretch
 * between them was never thrown away, so the curves stayed within the tolerance
 * across it. A gap in the run is the curves moving apart by more than the
 * tolerance, which is two meetings rather than one.
 */
function clustered(hits: readonly Hit[]): Crossing[] {
  const inOrder = [...hits].sort((a, b) => a.firstLow - b.firstLow);
  const groups: {
    firstLow: number;
    firstHigh: number;
    secondLow: number;
    secondHigh: number;
    sumFirst: number;
    sumSecond: number;
    sum: Vec2;
    count: number;
  }[] = [];
  for (const hit of inOrder) {
    const joined = groups.find(
      (group) =>
        hit.firstLow <= group.firstHigh &&
        hit.firstHigh >= group.firstLow &&
        hit.secondLow <= group.secondHigh &&
        hit.secondHigh >= group.secondLow
    );
    if (joined) {
      joined.firstHigh = Math.max(joined.firstHigh, hit.firstHigh);
      joined.firstLow = Math.min(joined.firstLow, hit.firstLow);
      joined.secondHigh = Math.max(joined.secondHigh, hit.secondHigh);
      joined.secondLow = Math.min(joined.secondLow, hit.secondLow);
      joined.sumFirst += (hit.firstLow + hit.firstHigh) / 2;
      joined.sumSecond += (hit.secondLow + hit.secondHigh) / 2;
      joined.sum = vec2.add(joined.sum, hit.point);
      joined.count += 1;
      continue;
    }
    groups.push({
      firstLow: hit.firstLow,
      firstHigh: hit.firstHigh,
      secondLow: hit.secondLow,
      secondHigh: hit.secondHigh,
      sumFirst: (hit.firstLow + hit.firstHigh) / 2,
      sumSecond: (hit.secondLow + hit.secondHigh) / 2,
      sum: hit.point,
      count: 1,
    });
  }
  return groups.map((group) => ({
    alongFirst: group.sumFirst / group.count,
    alongSecond: group.sumSecond / group.count,
    point: vec2.scale(group.sum, 1 / group.count),
  }));
}


/** How many places the coarse sweep looks at before it decides which part of a
 * curve a point is nearest. */
const SWEEP = 32;

/** How hard the curve is turning at a place, which Newton needs because the
 * nearest point moves as the curve bends away from it. */
function bendAt(hull: Hull, along: number): Vec2 {
  const u = 1 - along;
  return vec2(
    6 * (u * (hull[2].x - 2 * hull[1].x + hull[0].x) + along * (hull[3].x - 2 * hull[2].x + hull[1].x)),
    6 * (u * (hull[2].y - 2 * hull[1].y + hull[0].y) + along * (hull[3].y - 2 * hull[2].y + hull[1].y))
  );
}

/**
 * Where on a curve a point sits nearest, as a fraction along it, and how far
 * away it is there.
 *
 * A coarse sweep picks which part of the curve to believe, and Newton's method
 * on the distance finishes it, since the nearest point on a cubic is a fifth
 * degree root and solving one is more than this needs. The sweep gives up before
 * Newton when its best is further off than the tolerance plus the most one step
 * of the sweep can be hiding, since no refining brings it under from there.
 */
function nearestPlace(hull: Hull, point: Vec2, tolerance: number): { along: number; gap: number } {
  let along = 0;
  let gap = Infinity;
  for (let step = 0; step <= SWEEP; step++) {
    const at = step / SWEEP;
    const away = vec2.distance(pointAt(hull, at), point);
    if (away < gap) {
      gap = away;
      along = at;
    }
  }
  const reach = spread(boxOf(hull)) * 2;
  if (gap > tolerance + reach / SWEEP) return { along, gap };

  for (let step = 0; step < 12; step++) {
    const away = vec2.sub(pointAt(hull, along), point);
    const heading = slopeAt(hull, along);
    const turning = vec2.dot(heading, heading) + vec2.dot(away, bendAt(hull, along));
    if (Math.abs(turning) < PARALLEL) break;
    const next = held(along - vec2.dot(away, heading) / turning);
    const closer = vec2.distance(pointAt(hull, next), point);
    if (!(closer < gap)) break;
    along = next;
    gap = closer;
  }
  return { along, gap };
}

/** How many places along a shared stretch are checked to still be on the other
 * curve before the stretch is believed. */
const ALONG_SHARED = 12;

/**
 * The two ends of the stretch two curves cover together, when they cover one.
 *
 * Halving into a stretch like that answers it as a spray of meetings, because
 * every pair of small pieces along it overlaps and the budget runs out before
 * the run is walked. So the stretch is found first, from the ends of each curve
 * that lie on the other, and answered by where it starts and where it ends.
 *
 * Two curves meeting at a single point are not a stretch and are left to the
 * halving, which places one meeting more sharply than a sweep can.
 */
function sharedStretch(first: Hull, second: Hull, tolerance: number): Crossing[] | null {
  const ends: { first: number; second: number }[] = [];
  for (const along of [0, 1]) {
    const place = nearestPlace(second, pointAt(first, along), tolerance);
    if (place.gap <= tolerance) ends.push({ first: along, second: place.along });
  }
  for (const along of [0, 1]) {
    const place = nearestPlace(first, pointAt(second, along), tolerance);
    if (place.gap <= tolerance) ends.push({ first: place.along, second: along });
  }
  if (ends.length < 2) return null;

  let low = ends[0];
  let high = ends[0];
  for (const end of ends) {
    if (end.first < low.first) low = end;
    if (end.first > high.first) high = end;
  }
  const from = pointAt(first, low.first);
  const to = pointAt(first, high.first);
  if (vec2.distance(from, to) <= tolerance) return null;

  for (let step = 1; step < ALONG_SHARED; step++) {
    const along = low.first + ((high.first - low.first) * step) / ALONG_SHARED;
    if (nearestPlace(second, pointAt(first, along), tolerance).gap > tolerance) return null;
  }

  return [
    { alongFirst: low.first, alongSecond: low.second, point: from },
    { alongFirst: high.first, alongSecond: high.second, point: to },
  ];
}

/**
 * Every place two cubics cross, as a fraction along each and the point.
 *
 * Each segment is given the point it starts from, since a segment carries where
 * it ends and not where it began. Two curves covering the same stretch answer
 * with the two ends of that stretch, so a caller reading the answer as places to
 * cut at gets the stretch marked off rather than chopped into slivers.
 */
export function curveCrossings(
  fromFirst: Vec2,
  first: Cubic,
  fromSecond: Vec2,
  second: Cubic,
  options: CrossingOptions = {}
): Crossing[] {
  const tolerance = options.tolerance ?? TOLERANCE;
  const firstHull = hullOf(fromFirst, first);
  const secondHull = hullOf(fromSecond, second);
  if (apart(boxOf(firstHull), boxOf(secondHull), tolerance)) return [];
  const shared = sharedStretch(firstHull, secondHull, tolerance);
  if (shared) return shared;

  const stack: Pair[] = [
    {
      first: firstHull,
      firstLow: 0,
      firstHigh: 1,
      second: secondHull,
      secondLow: 0,
      secondHigh: 1,
      depth: 0,
    },
  ];
  const hits: Hit[] = [];
  let opened = 0;

  const record = (pair: Pair) => {
    const alongFirst = (pair.firstLow + pair.firstHigh) / 2;
    const alongSecond = (pair.secondLow + pair.secondHigh) / 2;
    hits.push({
      alongFirst,
      alongSecond,
      point: pointAt(firstHull, alongFirst),
      firstLow: pair.firstLow,
      firstHigh: pair.firstHigh,
      secondLow: pair.secondLow,
      secondHigh: pair.secondHigh,
    });
  };

  while (stack.length > 0) {
    const pair = stack.pop() as Pair;
    opened += 1;
    const firstBox = boxOf(pair.first);
    const secondBox = boxOf(pair.second);
    if (apart(firstBox, secondBox, tolerance)) continue;
    if (opened >= BUDGET) {
      record(pair);
      break;
    }
    const cutFirst = spread(firstBox) > tolerance;
    const cutSecond = spread(secondBox) > tolerance;
    if (!cutFirst && !cutSecond) {
      if (chordGap(pair.first, pair.second) <= tolerance) record(pair);
      continue;
    }
    if (pair.depth >= DEPTH) {
      record(pair);
      continue;
    }
    const firstMid = (pair.firstLow + pair.firstHigh) / 2;
    const secondMid = (pair.secondLow + pair.secondHigh) / 2;
    const firstParts = cutFirst
      ? halves(pair.first).map((hull, side) => ({
          hull,
          low: side === 0 ? pair.firstLow : firstMid,
          high: side === 0 ? firstMid : pair.firstHigh,
        }))
      : [{ hull: pair.first, low: pair.firstLow, high: pair.firstHigh }];
    const secondParts = cutSecond
      ? halves(pair.second).map((hull, side) => ({
          hull,
          low: side === 0 ? pair.secondLow : secondMid,
          high: side === 0 ? secondMid : pair.secondHigh,
        }))
      : [{ hull: pair.second, low: pair.secondLow, high: pair.secondHigh }];
    for (const left of firstParts) {
      for (const right of secondParts) {
        stack.push({
          first: left.hull,
          firstLow: left.low,
          firstHigh: left.high,
          second: right.hull,
          secondLow: right.low,
          secondHigh: right.high,
          depth: pair.depth + 1,
        });
      }
    }
  }

  return clustered(hits).map((crossing) => sharpened(firstHull, secondHull, crossing));
}
