/**
 * The four curves a value can travel along between two moments.
 *
 * They are the whole of the shape a track can hold. A key is either flat where
 * it sits or it is not, and two keys give four pairings: straight through,
 * still at the start, still at the end, and still at both.
 *
 * Every one of them takes and returns zero to one, so a caller decides what the
 * value at each end is and this decides only the pace between them.
 */

/** A curve maps how far through a span the clock is onto how far through the
 * change the value is. */
export type Curve = (along: number) => number;

/** No easing at all: the value moves at one rate the whole way. */
export const linear: Curve = (along) => along;

/** Quadratic ease in: flat at the start, so the value leaves from rest and
 * arrives at speed. */
export const easeIn: Curve = (along) => along * along;

/** Quadratic ease out: flat at the end, so the value leaves at speed and
 * settles rather than stopping dead. */
export const easeOut: Curve = (along) => 1 - (1 - along) * (1 - along);

/** Smoothstep: the cubic that is flat at both ends, Ken Perlin. */
export const smoothstep: Curve = (along) => along * along * (3 - 2 * along);

/**
 * The curve for a span whose ends are flat or not.
 *
 * This is the only place the four are chosen between, so a track and a figure's
 * timeline pace a change the same way rather than each deciding for itself.
 */
export function curveFor(fromFlat: boolean, toFlat: boolean): Curve {
  if (fromFlat && toFlat) return smoothstep;
  if (fromFlat) return easeIn;
  if (toFlat) return easeOut;
  return linear;
}
