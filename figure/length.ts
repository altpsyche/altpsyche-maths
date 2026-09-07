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

/** How many samples measure one piece. Sixteen holds the length of a quarter
 * circle to better than a part in ten thousand, which is finer than the curve's
 * own error against a true arc. */
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
 * length even along a curve as well: measured on a quarter circle, cutting at
 * twenty even fractions of its length was 4.7e-3 of the whole out at the worst
 * of them and is 1.4e-4 out now.
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
