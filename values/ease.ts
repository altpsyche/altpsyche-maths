/**
 * The six curves a value can travel along between two moments.
 *
 * Four of them are monotone, which means the value never turns back: straight
 * through, still at the start, still at the end, and still at both. Those four
 * are what a pair of keys chooses between, since a key says only whether it is
 * flat where it sits. The other two cannot come from a flat flag, because one
 * goes past its destination before settling on it and the other returns to
 * where it began.
 *
 * Every one of them takes zero to one, so a caller decides what the value at
 * each end is and this decides only the pace between them. Five of them return
 * zero to one as well, and `thereAndBack` is the exception both ways: it reaches
 * one halfway through and is zero again at one.
 *
 * Each curve has a name here, so a figure written to a file names its pacing
 * rather than carrying a closure that no file can hold.
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

/** Robert Penner's back-ease constant, and the coefficient the cubic term takes
 * from it so the curve still reaches exactly one at one. */
const BACK = 1.70158;
const BACK_CUBIC = BACK + 1;

/** The back ease out, Robert Penner: the value passes its destination and comes
 * back to it, peaking at 1 + 4·BACK³/(27·BACK_CUBIC²) of the change. */
export const overshoot: Curve = (along) => {
  const back = along - 1;
  return 1 + BACK_CUBIC * back * back * back + BACK * back * back;
};

/** Out and back: a smoothstep over each half, so the value reaches its
 * destination halfway through and is zero at one rather than one. */
export const thereAndBack: Curve = (along) =>
  along <= 0.5 ? smoothstep(along * 2) : smoothstep(2 - along * 2);

/** Every curve by the name a file carries. */
const CURVES = {
  linear,
  easeIn,
  easeOut,
  smoothstep,
  overshoot,
  thereAndBack,
} as const;

/** The name of any curve this package holds, which is the closed set a figure
 * as data may name. */
export type CurveName = keyof typeof CURVES;

/** Every curve by name, sorted, which is the closed set a figure as data may
 * name and what a validator holds a file to. */
export const CURVE_NAMES: readonly CurveName[] = Object.freeze(
  (Object.keys(CURVES) as CurveName[]).sort(),
);

/** The curve a name stands for. */
export function curveNamed(name: CurveName): Curve {
  return CURVES[name];
}

/** The name of a curve, or undefined for one a caller wrote itself, which is
 * what a writer checks before it claims a figure is expressible as data. */
export function nameOfCurve(curve: Curve): CurveName | undefined {
  for (const [name, held] of Object.entries(CURVES)) {
    if (held === curve) return name as CurveName;
  }
  return undefined;
}

/**
 * The curve for a span whose ends are flat or not.
 *
 * This is where the four monotone curves are chosen between, so a track and a
 * figure's timeline pace a change the same way rather than each deciding for
 * itself. The other two are named rather than deduced, since a flat flag cannot
 * say whether a value should pass its destination or return to its start.
 */
export function curveFor(fromFlat: boolean, toFlat: boolean): Curve {
  if (fromFlat && toFlat) return smoothstep;
  if (fromFlat) return easeIn;
  if (toFlat) return easeOut;
  return linear;
}
