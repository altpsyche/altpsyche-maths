/**
 * A function of one number drawn as a curve.
 *
 * The function is sampled at a fixed number of places and the samples are joined
 * by cubics that leave each one at the slope the function has there. Joining them
 * by straight lines instead is what makes a plotted sine look faceted, and the
 * slope costs nothing to work out because it comes from samples already taken.
 *
 * A curve is cut where it leaves the graph. A pole otherwise draws as a line
 * straight up the picture, and the coordinates on either side of it run to
 * numbers a painter has nowhere to put.
 *
 * The count is fixed and the curve is never subdivided by how much it bends.
 * Subdivision hands back a different number of points as the curve changes, and
 * one path is walked into another by pairing their points, so a curve that
 * resamples itself between frames could not be morphed into anything.
 */
import { interval, type Interval } from '../values/interval.js';
import { vec2 } from '../values/vec2.js';
import { pointOf, toGraph, toUnits, type Coords, type Scale } from './scale.js';
import { group, shape, type GroupNode } from './node.js';
import type { Fill, Stroke } from './mark.js';
import { line, pointOn, polygon, straight, tangentOn, type Cubic, type Path, type Subpath } from './path.js';

export interface PlotOptions {
  /** How many pieces the curve is cut into. */
  resolution?: number;
  /** The run of x the curve is drawn over, which is the whole width of the graph
   * where it is left out. */
  over?: Interval;
}

/**
 * How many pieces a curve is cut into when a figure does not say.
 *
 * The count is what draws a sine over two turns under a tenth of a pixel from
 * the true one on the largest surface anything here is drawn at.
 */
const SAMPLES = 96;

/**
 * The rate of change at each sample of one run, from the central difference of
 * its neighbours, which is the tangent a Catmull-Rom spline uses.
 *
 * The run is a plotted curve's x and the values its height, and a parametric
 * curve's parameter and one of its two coordinates, since a direction is the two
 * rates read against the same run.
 *
 * An end with evenly spaced neighbours takes the three-point one-sided
 * difference, which is second order like the middle and exact for a quadratic.
 * An end that was cut at the edge of the graph is not evenly spaced, so the
 * three-point form does not hold there and it takes the two-point difference.
 */
export function slopes(along: readonly number[], values: readonly number[]): number[] {
  const last = along.length - 1;
  if (last < 1) return [0];
  const even = (a: number, b: number, c: number) => Math.abs((b - a) - (c - b)) < Math.abs(c - a) * 1e-9;
  const out: number[] = [];
  for (let at = 0; at <= last; at++) {
    if (last < 2) out.push((values[last] - values[0]) / (along[last] - along[0]));
    else if (at === 0) {
      out.push(
        even(along[0], along[1], along[2])
          ? (-3 * values[0] + 4 * values[1] - values[2]) / (along[2] - along[0])
          : (values[1] - values[0]) / (along[1] - along[0])
      );
    } else if (at === last) {
      out.push(
        even(along[last - 2], along[last - 1], along[last])
          ? (3 * values[last] - 4 * values[last - 1] + values[last - 2]) / (along[last] - along[last - 2])
          : (values[last] - values[last - 1]) / (along[last] - along[last - 1])
      );
    } else out.push((values[at + 1] - values[at - 1]) / (along[at + 1] - along[at - 1]));
  }
  return out;
}

/** How many times the gap either side of the edge is halved when looking for the
 * place the curve crosses it. Twenty-four leaves it within a millionth of one
 * sample's width. */
const HALVINGS = 24;

/**
 * The place between a sample on the graph and a sample off it where the curve
 * crosses the edge, by halving the gap between them.
 *
 * The y it hands back is held on the edge rather than taken from the function,
 * so the cut end sits exactly on the boundary instead of a millionth past it.
 */
function crossing(
  of: (x: number) => number,
  drawable: (y: number) => boolean,
  bounds: Interval,
  inside: number,
  outside: number
): { x: number; y: number } {
  let near = inside;
  let far = outside;
  for (let halving = 0; halving < HALVINGS; halving++) {
    const middle = (near + far) / 2;
    if (drawable(of(middle))) near = middle;
    else far = middle;
  }
  return { x: near, y: interval.clampTo(bounds, of(near)) };
}

/**
 * The curve of a function over a run of x, in the figure's own units, as one
 * subpath per stretch of it that is on the graph.
 *
 * Each piece is a Hermite cubic written as a Bézier: the controls sit a third of
 * the way along in x and carry the sample's own slope, which is the placement
 * that makes the cubic pass through both samples at both slopes.
 */
export function plot(coords: Coords, of: (x: number) => number, options: PlotOptions = {}): Path {
  const samples = Math.max(1, Math.round(options.resolution ?? SAMPLES));
  const { from, to } = interval.ordered(options.over ?? coords.x.graph);
  if (!(to > from)) return [];

  const grain = ((to - from) / samples) * 1e-9;
  const drawable = (y: number) => Number.isFinite(y) && interval.holds(coords.y.graph, y);
  const xs: number[] = [];
  const ys: number[] = [];
  const on: boolean[] = [];
  for (let at = 0; at <= samples; at++) {
    const x = from + ((to - from) * at) / samples;
    const y = of(x);
    xs.push(x);
    ys.push(y);
    on.push(drawable(y));
  }

  const path: Subpath[] = [];
  let at = 0;
  while (at <= samples) {
    if (!on[at]) {
      at++;
      continue;
    }
    let end = at;
    while (end + 1 <= samples && on[end + 1]) end++;

    const runX = xs.slice(at, end + 1);
    const runY = ys.slice(at, end + 1);
    if (at > 0) {
      const cut = crossing(of, drawable, coords.y.graph, xs[at], xs[at - 1]);
      // A sample sitting exactly on the edge leaves nothing between it and the
      // crossing, and a piece of no width has no slope to leave at.
      if (xs[at] - cut.x > grain) {
        runX.unshift(cut.x);
        runY.unshift(cut.y);
      }
    }
    if (end < samples) {
      const cut = crossing(of, drawable, coords.y.graph, xs[end], xs[end + 1]);
      if (cut.x - xs[end] > grain) {
        runX.push(cut.x);
        runY.push(cut.y);
      }
    }

    if (runX.length > 1) {
      const slope = slopes(runX, runY);
      const curves: Cubic[] = [];
      for (let piece = 0; piece + 1 < runX.length; piece++) {
        const reach = (runX[piece + 1] - runX[piece]) / 3;
        curves.push({
          control1: pointOf(coords, runX[piece] + reach, runY[piece] + reach * slope[piece]),
          control2: pointOf(coords, runX[piece + 1] - reach, runY[piece + 1] - reach * slope[piece + 1]),
          to: pointOf(coords, runX[piece + 1], runY[piece + 1]),
        });
      }
      path.push({ start: pointOf(coords, runX[0], runY[0]), curves, closed: false });
    }
    at = end + 1;
  }
  return path;
}

export interface AreaOptions {
  /** The height the region is measured down to, which is the axis itself where
   * it is left out. A height off the graph sits at the near edge instead. */
  baseline?: number;
}

/**
 * The region between a plotted curve and a level line, closed, as one subpath
 * per subpath of the curve.
 *
 * The top is the path a caller already drew rather than a second plot of the
 * function behind it, so the region and the curve laid over it are one piece of
 * geometry and cannot come to disagree.
 */
export function areaUnder(coords: Coords, curve: Path, options: AreaOptions = {}): Path {
  const foot = toUnits(coords.y, interval.clampTo(coords.y.graph, options.baseline ?? 0));
  return curve.map((top) => {
    const last = top.curves.length > 0 ? top.curves[top.curves.length - 1].to : top.start;
    const under = vec2(last.x, foot);
    const back = vec2(top.start.x, foot);
    return {
      start: top.start,
      curves: [...top.curves, straight(last, under), straight(under, back), straight(back, top.start)],
      closed: true,
    } satisfies Subpath;
  });
}

export interface BarsOptions {
  fill?: Fill;
  stroke?: Stroke;
  /** How many bars the run is cut into. */
  bars?: number;
  /** The run of x the bars cover, which is the whole width of the graph where it
   * is left out. */
  over?: Interval;
  /** Where in each bar its height is read: at the left edge, the right edge or
   * the middle. The three are what a reader is shown to see that the first is
   * always short and the second always over. */
  height?: 'left' | 'right' | 'middle';
  /** The level the bars stand on. */
  baseline?: number;
}

/**
 * The bars under a curve, each one named by its place in the run so a stagger
 * can reach them one at a time.
 *
 * A bar whose top is off the graph is cut at the edge, and a bar whose height is
 * not a number is left out. The style sits on the group rather than on each bar,
 * which is what lets the whole run fade as one thing.
 */
export function riemannBars(
  name: string,
  coords: Coords,
  of: (x: number) => number,
  options: BarsOptions = {}
): GroupNode {
  const bars = Math.max(1, Math.round(options.bars ?? 8));
  const { from, to } = interval.ordered(options.over ?? coords.x.graph);
  const foot = interval.clampTo(coords.y.graph, options.baseline ?? 0);
  const read = options.height ?? 'left';
  const children = [];

  for (let bar = 0; bar < bars; bar++) {
    const left = from + ((to - from) * bar) / bars;
    const right = from + ((to - from) * (bar + 1)) / bars;
    const x = read === 'left' ? left : read === 'right' ? right : (left + right) / 2;
    const y = of(x);
    if (!Number.isFinite(y)) continue;
    const top = interval.clampTo(coords.y.graph, y);
    // Built from four corners rather than a corner and a size: a bar whose top is held on the
    // graph's own edge has that edge exactly, and adding a height back on overshoots it.
    const corner = pointOf(coords, left, foot);
    const far = pointOf(coords, right, top);
    children.push(
      shape(String(bar), polygon([corner, vec2(far.x, corner.y), far, vec2(corner.x, far.y)]), {})
    );
  }

  return group(name, children, { style: { fill: options.fill, stroke: options.stroke } });
}

/** How many figure units one graph unit covers on an axis, with its sign, so a
 * scale given the other way round turns a slope over rather than losing it. */
function perGraph(scale: Scale): number {
  return (scale.units.to - scale.units.from) / (scale.graph.to - scale.graph.from);
}

/** Where a plotted curve stands at one graph x: the height it reaches and the
 * slope it leaves at, both as numbers on the graph. */
interface Reading {
  readonly height: number;
  readonly slope: number;
}

/**
 * How many times a reading corrects its first guess at the fraction along a
 * piece.
 *
 * A curve `plot` writes carries its controls a third of the way along in x, so x
 * is a straight line in the fraction and the first guess is already the answer.
 * The correction is what makes a reading right on a piece written some other way,
 * and Newton's method doubles the digits it holds each time.
 */
const CORRECTIONS = 2;

/**
 * The height and the slope a plotted curve has at a graph x, and nothing where
 * the curve does not reach that x.
 *
 * A place at the join between two pieces is read on the earlier one, and the two
 * agree because a plotted curve leaves each sample at one slope.
 */
function readingAt(coords: Coords, curve: Path, x: number): Reading | null {
  const across = perGraph(coords.x);
  const up = perGraph(coords.y);
  if (!Number.isFinite(across) || !Number.isFinite(up) || across === 0 || up === 0) return null;
  const place = toUnits(coords.x, x);
  for (const subpath of curve) {
    let from = subpath.start;
    for (const piece of subpath.curves) {
      const low = Math.min(from.x, piece.to.x);
      const high = Math.max(from.x, piece.to.x);
      if (place >= low && place <= high && high > low) {
        let along = (place - from.x) / (piece.to.x - from.x);
        for (let correction = 0; correction < CORRECTIONS; correction++) {
          const rate = tangentOn(from, piece, along).x;
          if (rate === 0) break;
          along = Math.min(1, Math.max(0, along - (pointOn(from, piece, along).x - place) / rate));
        }
        const heading = tangentOn(from, piece, along);
        return {
          height: toGraph(coords.y, pointOn(from, piece, along).y),
          slope: heading.y / up / (heading.x / across),
        };
      }
      from = piece.to;
    }
  }
  return null;
}

/**
 * The slope a plotted curve has at a graph x, read off the cubic covering that
 * x, and `NaN` where the curve does not reach it.
 *
 * The cubics are the curve a figure already drew, so the slope is the drawn
 * curve's own rather than a second sampling of the function behind it. A cubic
 * written through samples of a quadratic carries that quadratic with nothing left
 * over, which is why the reading of a parabola is exact rather than close.
 */
export function slopeOf(coords: Coords, curve: Path, x: number): number {
  return readingAt(coords, curve, x)?.slope ?? Number.NaN;
}

export interface TangentOptions {
  /** How far the line reaches either side of the point, in graph units. */
  reach?: number;
}

/**
 * The tangent to a plotted curve at a graph x, as a straight line held inside
 * the graph.
 *
 * The line is cut where it leaves the graph rather than sampled and broken like
 * a curve, because a straight line crosses each edge once and the crossing is
 * arithmetic rather than a search. A tangent at a steep place otherwise runs the
 * width of the picture and out of it.
 */
export function tangentAt(coords: Coords, curve: Path, x: number, options: TangentOptions = {}): Path {
  const reach = options.reach ?? interval.span(coords.x.graph) / 8;
  const reading = readingAt(coords, curve, x);
  if (!reading) return [];
  const { height, slope } = reading;
  if (!Number.isFinite(height) || !Number.isFinite(slope)) return [];

  const graphX = interval.ordered(coords.x.graph);
  const graphY = interval.ordered(coords.y.graph);
  let low = Math.max(x - reach, graphX.from);
  let high = Math.min(x + reach, graphX.to);

  if (slope === 0) {
    if (!interval.holds(graphY, height)) return [];
  } else {
    const atY = (y: number) => x + (y - height) / slope;
    const first = atY(graphY.from);
    const second = atY(graphY.to);
    low = Math.max(low, Math.min(first, second));
    high = Math.min(high, Math.max(first, second));
  }
  if (!(high > low)) return [];

  // Held on the graph so an end cut at an edge sits on it rather than a rounding
  // error past it.
  const at = (t: number) => pointOf(coords, t, interval.clampTo(graphY, height + slope * (t - x)));
  return line(at(low), at(high));
}
