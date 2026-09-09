/**
 * The places a curve in space passes through, from a function of one number.
 *
 * Nothing here draws them. The places come back in the world's own coordinates,
 * the way the curve where a plane cuts a surface does, and what a figure does
 * with them is its own: `polyline3` draws one run, and a scene sorts a run
 * against the solid it lies on.
 *
 * The count is fixed by the resolution and never by the curve. A count that
 * followed the curve would hand back a different number of places at every time,
 * which is a count no gate can hold and a run no morph can pair up against
 * another.
 */
import { interval, type Interval } from '../values/interval.js';
import type { Vec3 } from '../values/vec3.js';

export interface Curve3Options {
  /** How many steps the run is cut into, which is one fewer than the count of
   * places it hands back. */
  resolution?: number;
  /** The run of the parameter the curve is read over, which is nothing to one
   * where it is left out. */
  over?: Interval;
}

/**
 * How many steps a curve in space is cut into when a figure does not say.
 *
 * The count is what a flat parametric curve takes, so a helix and the circle
 * under it are drawn from the same number of places.
 */
const STEPS = 96;

/**
 * The places a curve in space passes through, in order, both ends of the run
 * included.
 *
 * A curve that closes hands back its first place again at the end, since the
 * function itself is what says so, and a run that a painter closes would say it
 * twice.
 */
export function curveOf3(of: (t: number) => Vec3, options: Curve3Options = {}): Vec3[] {
  const steps = Math.max(1, Math.round(options.resolution ?? STEPS));
  const run = interval.ordered(options.over ?? interval(0, 1));
  const places: Vec3[] = [];
  for (let at = 0; at <= steps; at += 1) places.push(of(interval.at(run, at / steps)));
  return places;
}
