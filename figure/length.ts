/**
 * How long a path is, measured piece by piece, and where a length falls inside
 * one piece.
 *
 * A cubic's parameter is not its length: the same step in parameter covers more
 * of the curve where the curve is moving fast. So anything that walks a path at
 * a steady pace needs the two related, and this is the table that relates them.
 *
 * The table is sampled rather than solved. A cubic's length has no closed form,
 * so every library that measures one either samples it or integrates it
 * numerically, and the samples are wanted anyway.
 */
import { vec2, type Vec2 } from '../values/vec2.js';
import { pointOn, type Cubic, type Path } from './path.js';
import { clamp } from '../values/scalar.js';

/**
 * How many samples measure one piece, which is even so the same points give a
 * second sum at half the resolution.
 *
 * A chord cuts the corner off the arc it spans, so a sum of chords is short of
 * the true length by an amount that falls as the square of the count. Two sums
 * whose counts differ by a factor of two are what Richardson extrapolation needs
 * to cancel that term, and the coarse sum costs no new points because it joins
 * every other one already taken.
 */
const SAMPLES = 16;

export interface Measured {
  /** The length reached at each sample parameter, starting at nothing and
   * ending at the whole, so the piece's own parameter can be read back out of a
   * length. */
  readonly upTo: readonly number[];
  readonly total: number;
}

export interface Measure {
  /** Every piece of every subpath, in the order a walk crosses them. */
  readonly per: readonly (readonly Measured[])[];
  readonly total: number;
}

function measureCurve(from: Vec2, curve: Cubic): Measured {
  const upTo: number[] = [0];
  const points: Vec2[] = [from];
  let total = 0;
  let previous = from;
  for (let at = 1; at <= SAMPLES; at++) {
    const point = pointOn(from, curve, at / SAMPLES);
    total += vec2.distance(previous, point);
    upTo.push(total);
    points.push(point);
    previous = point;
  }

  // Richardson extrapolation over the fine sum and the sum across every other
  // point, which cancels the square term the chord error is mostly made of.
  let coarse = 0;
  for (let at = 2; at <= SAMPLES; at += 2) coarse += vec2.distance(points[at - 2], points[at]);
  const richer = (4 * total - coarse) / 3;

  // The table is stretched by the same factor as the total, so a length read
  // back out of it lands at the parameter the uncorrected table put it at and
  // no entry crosses the one before it.
  const stretch = total > 0 ? richer / total : 1;
  return { upTo: upTo.map((reached) => reached * stretch), total: richer };
}

/** Every piece's length and the whole, which is what a walk by length needs
 * before it can find which piece a place falls in. */
export function measurePath(path: Path): Measure {
  let total = 0;
  const per = path.map((subpath) => {
    let from = subpath.start;
    return subpath.curves.map((curve) => {
      const measured = measureCurve(from, curve);
      from = curve.to;
      total += measured.total;
      return measured;
    });
  });
  return { per, total };
}

/**
 * The parameter a length into one piece.
 *
 * Reading the fraction of the length as the parameter is exact only where the
 * curve moves at one rate, which is a straight line. Walking the table instead
 * and interpolating inside the one sample the length lands in makes a cut by
 * length even along a curve as well.
 */
export function parameterAt(measured: Measured, wanted: number): number {
  const { upTo, total } = measured;
  if (!(total > 0) || wanted <= 0) return 0;
  if (wanted >= total) return 1;
  let sample = 1;
  while (sample < upTo.length - 1 && upTo[sample] < wanted) sample++;
  const low = upTo[sample - 1];
  const high = upTo[sample];
  const within = high > low ? (wanted - low) / (high - low) : 0;
  return (sample - 1 + within) / SAMPLES;
}

/** The length into one piece at a parameter, read out of the same table
 * `parameterAt` reads, so the two are inverses of each other. */
function lengthAtParameter(measured: Measured, along: number): number {
  const { upTo } = measured;
  const at = clamp(along, 0, 1) * SAMPLES;
  const sample = Math.min(Math.floor(at), SAMPLES - 1);
  return upTo[sample] + (upTo[sample + 1] - upTo[sample]) * (at - sample);
}

/** How many parameters one piece is sampled at before the nearest is refined. */
const SEEDS = 32;

/** The parameter on one piece whose point sits nearest a place. */
function nearestParameter(from: Vec2, curve: Cubic, place: Vec2): number {
  const gapAt = (along: number) => vec2.distance(pointOn(from, curve, along), place);
  let seed = 0;
  for (let at = 1; at <= SEEDS; at++) if (gapAt(at / SEEDS) < gapAt(seed / SEEDS)) seed = at;
  // Golden-section search over the two samples either side of the nearest seed.
  let low = Math.max(0, (seed - 1) / SEEDS);
  let high = Math.min(1, (seed + 1) / SEEDS);
  const ratio = (Math.sqrt(5) - 1) / 2;
  while (high - low > 1e-12) {
    const left = high - ratio * (high - low);
    const right = low + ratio * (high - low);
    if (gapAt(left) < gapAt(right)) high = right;
    else low = left;
  }
  return (low + high) / 2;
}

/**
 * The fraction of a path's length at the point on it nearest a place, which is
 * the fraction `pointAlong` returns that point for.
 *
 * A path with no length has one point, which is at the fraction nothing.
 */
export function fractionNearest(path: Path, place: Vec2): number {
  const { per, total } = measurePath(path);
  if (!(total > 0)) return 0;
  let gap = Infinity;
  let reached = 0;
  let walked = 0;
  path.forEach((subpath, at) => {
    let from = subpath.start;
    subpath.curves.forEach((curve, piece) => {
      const measured = per[at][piece];
      const along = nearestParameter(from, curve, place);
      const distance = vec2.distance(pointOn(from, curve, along), place);
      if (distance < gap) {
        gap = distance;
        reached = walked + lengthAtParameter(measured, along);
      }
      walked += measured.total;
      from = curve.to;
    });
  });
  return clamp(reached / total, 0, 1);
}

/** How long a path is, in figure units, across every subpath it contains. */
export function lengthOf(path: Path): number {
  return measurePath(path).total;
}

/**
 * The point a fraction of the way along a path, measured by length rather than
 * by piece or by parameter.
 *
 * A fraction outside nothing to one is held at the nearer end, so a walk that
 * overshoots stops at the end of the path rather than carrying on past it. A
 * path with no points has no such place and returns nothing.
 */
export function pointAlong(path: Path, fraction: number): Vec2 | null {
  if (path.length === 0) return null;
  const { per, total } = measurePath(path);
  if (!(total > 0)) return path[0].start;

  const wanted = total * clamp(fraction, 0, 1);
  let walked = 0;
  for (let at = 0; at < path.length; at++) {
    const subpath = path[at];
    let from = subpath.start;
    for (let piece = 0; piece < subpath.curves.length; piece++) {
      const curve = subpath.curves[piece];
      const measured = per[at][piece];
      if (walked + measured.total >= wanted) return pointOn(from, curve, parameterAt(measured, wanted - walked));
      walked += measured.total;
      from = curve.to;
    }
  }

  // Reached only when the lengths added up a hair short of the whole, so the
  // place asked for is the far end.
  const last = path[path.length - 1];
  return last.curves.length > 0 ? last.curves[last.curves.length - 1].to : last.start;
}
