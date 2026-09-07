/**
 * A function of one number drawn as a curve.
 *
 * The function is sampled at a fixed number of places and the samples are joined
 * by cubics that leave each one at the slope the function has there. Joining them
 * by straight lines instead is what makes a plotted sine look faceted, and the
 * slope costs nothing to work out because it comes from samples already taken.
 *
 * The count is fixed and the curve is never subdivided by how much it bends.
 * Subdivision hands back a different number of points as the curve changes, and
 * one path is walked into another by pairing their points, so a curve that
 * resamples itself between frames could not be morphed into anything.
 */
import { interval, type Interval } from '../values/interval.js';
import { pointOf, type Coords } from './scale.js';
import type { Cubic, Path } from './path.js';

export interface PlotOptions {
  /** How many pieces the curve is cut into. */
  samples?: number;
  /** The run of x the curve is drawn over, which is the whole width of the graph
   * where it is left out. */
  over?: Interval;
}

/**
 * How many pieces a curve is cut into when a figure does not say.
 *
 * A sine over two turns at this count leaves the drawn curve within 3.3e-4
 * figure units of the true one, which is under a tenth of a pixel on the largest
 * surface anything here is drawn at.
 */
const SAMPLES = 96;

/**
 * The slope at each sample, from the central difference of its neighbours, which
 * is the tangent a Catmull-Rom spline uses.
 *
 * The two ends have one neighbour each, so they take the three-point one-sided
 * difference. That is second order like the middle and exact for a quadratic,
 * where the two-point difference an end reaches for first is neither: measured
 * on a parabola at 64 samples, the two-point ends leave the curve 3.7e-4 figure
 * units out and the three-point ends leave it exact.
 */
function slopes(xs: readonly number[], ys: readonly number[]): number[] {
  const last = xs.length - 1;
  if (last < 1) return [0];
  const step = xs[1] - xs[0];
  const out: number[] = [];
  for (let at = 0; at <= last; at++) {
    if (last < 2) out.push((ys[last] - ys[0]) / (xs[last] - xs[0]));
    else if (at === 0) out.push((-3 * ys[0] + 4 * ys[1] - ys[2]) / (2 * step));
    else if (at === last) out.push((3 * ys[last] - 4 * ys[last - 1] + ys[last - 2]) / (2 * step));
    else out.push((ys[at + 1] - ys[at - 1]) / (xs[at + 1] - xs[at - 1]));
  }
  return out;
}

/**
 * The curve of a function over a run of x, in the figure's own units.
 *
 * Each piece is a Hermite cubic written as a Bézier: the controls sit a third of
 * the way along in x and carry the sample's own slope, which is the placement
 * that makes the cubic pass through both samples at both slopes.
 */
export function plot(coords: Coords, of: (x: number) => number, options: PlotOptions = {}): Path {
  const samples = Math.max(1, Math.round(options.samples ?? SAMPLES));
  const { from, to } = interval.ordered(options.over ?? coords.x.graph);
  if (!(to > from)) return [];

  const xs: number[] = [];
  const ys: number[] = [];
  for (let at = 0; at <= samples; at++) {
    const x = from + ((to - from) * at) / samples;
    xs.push(x);
    ys.push(of(x));
  }

  const slope = slopes(xs, ys);
  const curves: Cubic[] = [];
  for (let at = 0; at < samples; at++) {
    const reach = (xs[at + 1] - xs[at]) / 3;
    curves.push({
      control1: pointOf(coords, xs[at] + reach, ys[at] + reach * slope[at]),
      control2: pointOf(coords, xs[at + 1] - reach, ys[at + 1] - reach * slope[at + 1]),
      to: pointOf(coords, xs[at + 1], ys[at + 1]),
    });
  }
  return [{ start: pointOf(coords, xs[0], ys[0]), curves, closed: false }];
}
