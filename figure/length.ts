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
 * How many samples measure one piece.
 *
 * A chord cuts the corner off the arc it spans, so a total read this way is
 * short of the true one. What the count is chosen for is the evenness of a walk
 * rather than the total, and a share of the length is a ratio the shortfall
 * largely cancels out of. Doubling it costs twice the work in every cut and
 * every walk and buys a total four times closer, which nothing here has asked
 * for.
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
  let total = 0;
  let previous = from;
  for (let at = 1; at <= SAMPLES; at++) {
    const point = pointOn(from, curve, at / SAMPLES);
    total += vec2.distance(previous, point);
    upTo.push(total);
    previous = point;
  }
  return { upTo, total };
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

/** How long a path is, in figure units, across every subpath it holds. It reads
 * a little short of the truth, by the chord error the sample count above
 * states. */
export function lengthOf(path: Path): number {
  return measurePath(path).total;
}

/**
 * The point a fraction of the way along a path, measured by length rather than
 * by piece or by parameter.
 *
 * A fraction outside nothing to one is held at the nearer end, so a walk that
 * overshoots stops at the end of the path rather than carrying on past it. A
 * path with no points has no such place and hands back nothing.
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
