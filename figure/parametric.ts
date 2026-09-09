/**
 * A curve from a function of one number to a place on the graph.
 *
 * The parameter is what lets a curve stand over one x in several places. A
 * circle on axes, a Lissajous figure and a closed orbit are each of that kind,
 * and none of them is a function of x, so none of them can be written as a plot.
 *
 * The samples are joined by cubics that leave each one along the direction the
 * function moves there, which is the construction a plot uses with x as the
 * parameter. The direction comes from the central difference of the neighbouring
 * samples, so it costs nothing beyond samples already taken.
 *
 * A curve is cut where it leaves the graph, on the width as well as the height,
 * since a parameter carries the curve across both. A plot is cut on the height
 * alone because its samples are taken across the width to begin with.
 *
 * The count is fixed and the curve is never subdivided by how much it bends. One
 * path is walked into another by pairing their points, so a curve that resamples
 * itself between frames could not be morphed into anything.
 *
 * A curve given as a radius at each angle is the same curve under the map from
 * polar coordinates to a place, so it is written here as one call over the other
 * rather than as a second sampling with its own cuts and its own seam.
 */
import { interval, type Interval } from '../values/interval.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import { pointOf, type Coords } from './scale.js';
import { slopes } from './plot.js';
import type { Cubic, Path, Subpath } from './path.js';

export interface ParametricOptions {
  /** How many pieces the curve is cut into. */
  resolution?: number;
  /** The run of the parameter the curve is drawn over, which is nothing to one
   * where it is left out. */
  over?: Interval;
  /** Whether the last place joins back to the first. A closed curve reads its
   * direction at each end across the join rather than one-sidedly, which is what
   * keeps the seam from showing as a corner. */
  closed?: boolean;
}

/**
 * How many pieces a curve is cut into when a figure does not say.
 *
 * The count draws a unit circle within 4.3e-7 of the true radius, where the four
 * cubic quarters a circle is written as leave it 2.7e-4 out, so a shape given as
 * a parametrisation is not the coarser of the two.
 */
const SAMPLES = 96;

/** How many times the gap either side of the edge is halved when looking for the
 * place the curve crosses it. Twenty-four leaves it within a millionth of one
 * sample's width. */
const HALVINGS = 24;

/** The fewest samples a closed curve is drawn from. A central difference across
 * the join reads the sample before and the sample after, and under three
 * samples those are the same place. */
const CLOSING = 3;

/** Whether a place is on the graph, which is both coordinates finite and inside
 * the run their axis counts through. */
function drawable(coords: Coords, at: Vec2): boolean {
  return (
    Number.isFinite(at.x) &&
    Number.isFinite(at.y) &&
    interval.holds(coords.x.graph, at.x) &&
    interval.holds(coords.y.graph, at.y)
  );
}

/**
 * The parameter between a sample on the graph and a sample off it where the
 * curve crosses the edge, by halving the gap between them.
 *
 * The parameter it settles on is the last one still on the graph, so a cut end
 * sits inside the boundary by at most the width the halvings leave rather than
 * past it, and nothing has to hold it there afterwards.
 */
function crossing(of: (t: number) => Vec2, coords: Coords, inside: number, outside: number): { t: number; point: Vec2 } {
  let near = inside;
  let far = outside;
  for (let halving = 0; halving < HALVINGS; halving++) {
    const middle = (near + far) / 2;
    if (drawable(coords, of(middle))) near = middle;
    else far = middle;
  }
  return { t: near, point: of(near) };
}

/**
 * One Hermite piece written as a Bézier: the controls sit a third of the gap away
 * along each end's own direction, which is the placement that makes the cubic
 * pass through both places at both directions.
 *
 * The gap is the run of the parameter between the two places where a curve has a
 * parameter, and the straight distance between them where the direction is a unit
 * vector and the curve has no parameter of its own.
 */
export function hermiteCubic(coords: Coords, gap: number, at: Vec2, moving: Vec2, next: Vec2, moves: Vec2): Cubic {
  const reach = gap / 3;
  return {
    control1: pointOf(coords, at.x + reach * moving.x, at.y + reach * moving.y),
    control2: pointOf(coords, next.x - reach * moves.x, next.y - reach * moves.y),
    to: pointOf(coords, next.x, next.y),
  };
}

/** A run of places joined into one open subpath, with the direction at each
 * place taken from the same central difference a plot takes its slope from.
 *
 * The knots need not be evenly spaced, which is what lets a run of places with no
 * parameter of its own be joined by the same call under knots of its own. */
export function openSubpath(coords: Coords, ts: readonly number[], places: readonly Vec2[]): Subpath {
  const across = slopes(ts, places.map((place) => place.x));
  const up = slopes(ts, places.map((place) => place.y));
  const curves: Cubic[] = [];
  for (let at = 0; at + 1 < places.length; at++) {
    curves.push(
      hermiteCubic(
        coords,
        ts[at + 1] - ts[at],
        places[at],
        vec2(across[at], up[at]),
        places[at + 1],
        vec2(across[at + 1], up[at + 1])
      )
    );
  }
  return { start: pointOf(coords, places[0].x, places[0].y), curves, closed: false };
}

/**
 * A whole closed curve as one subpath, with the direction at every place read
 * from the one before it and the one after it, the seam included.
 *
 * The places are the run without the repeat of the first at the end, and the last
 * piece returns to the first place, which is the shape a circle written as four
 * cubic quarters already has.
 *
 * The knot before the first place and the knot after the last are carried round
 * by the period, so the difference across the seam is read over the gap the two
 * places are actually apart rather than over a gap that runs backwards.
 */
export function closedSubpath(
  coords: Coords,
  ts: readonly number[],
  places: readonly Vec2[],
  period: number
): Subpath {
  const count = places.length;
  const knot = (at: number) => ts[(at + count) % count] + Math.floor(at / count) * period;
  const moving = places.map((_, at) => {
    const before = places[(at - 1 + count) % count];
    const after = places[(at + 1) % count];
    const gap = knot(at + 1) - knot(at - 1);
    return vec2((after.x - before.x) / gap, (after.y - before.y) / gap);
  });
  const curves: Cubic[] = [];
  for (let at = 0; at < count; at++) {
    const next = (at + 1) % count;
    curves.push(hermiteCubic(coords, knot(at + 1) - knot(at), places[at], moving[at], places[next], moving[next]));
  }
  return { start: pointOf(coords, places[0].x, places[0].y), curves, closed: true };
}

/** One stretch of the curve that is on the graph, as the parameters it covers
 * and the places it passes through. */
interface Run {
  ts: number[];
  places: Vec2[];
}

/**
 * The curve of a function of one number over a run of that number, in the
 * figure's own units, as one subpath per stretch of it that is on the graph.
 *
 * A closed curve wholly on the graph is one closed subpath. A closed curve that
 * leaves the graph is open stretches, and the stretch that spans the seam is
 * joined into one rather than drawn as two with ends at the seam.
 */
export function parametric(coords: Coords, of: (t: number) => Vec2, options: ParametricOptions = {}): Path {
  const samples = Math.max(1, Math.round(options.resolution ?? SAMPLES));
  const { from, to } = interval.ordered(options.over ?? interval(0, 1));
  if (!(to > from)) return [];

  const step = (to - from) / samples;
  const grain = step * 1e-9;
  const closed = (options.closed ?? false) && samples >= CLOSING;

  const ts: number[] = [];
  const places: Vec2[] = [];
  const on: boolean[] = [];
  for (let at = 0; at <= samples; at++) {
    const t = from + step * at;
    const place = of(t);
    ts.push(t);
    places.push(place);
    on.push(drawable(coords, place));
  }

  // The sample at the end of the run is the first place again, so a closed curve
  // drawn whole takes its places from the samples before it.
  if (closed && on.every(Boolean)) {
    return [closedSubpath(coords, ts.slice(0, samples), places.slice(0, samples), to - from)];
  }

  const runs: Run[] = [];
  let at = 0;
  while (at <= samples) {
    if (!on[at]) {
      at++;
      continue;
    }
    let end = at;
    while (end + 1 <= samples && on[end + 1]) end++;

    const run: Run = { ts: ts.slice(at, end + 1), places: places.slice(at, end + 1) };
    if (at > 0) {
      const cut = crossing(of, coords, ts[at], ts[at - 1]);
      // A sample sitting on the edge leaves nothing between it and the crossing,
      // and a piece of no width has no direction to leave along.
      if (ts[at] - cut.t > grain) {
        run.ts.unshift(cut.t);
        run.places.unshift(cut.point);
      }
    }
    if (end < samples) {
      const cut = crossing(of, coords, ts[end], ts[end + 1]);
      if (cut.t - ts[end] > grain) {
        run.ts.push(cut.t);
        run.places.push(cut.point);
      }
    }
    runs.push(run);
    at = end + 1;
  }

  // A closed curve whose first and last samples are both on the graph has one
  // stretch written as two, since the run of the parameter is cut at the seam and
  // not the curve. The second is carried past the end of the run so the
  // parameters of the joined stretch still climb.
  if (closed && runs.length > 1 && on[0] && on[samples]) {
    const first = runs.shift() as Run;
    const last = runs.pop() as Run;
    runs.push({
      ts: [...last.ts, ...first.ts.slice(1).map((t) => t + (to - from))],
      places: [...last.places, ...first.places.slice(1)],
    });
  }

  return runs.filter((run) => run.places.length > 1).map((run) => openSubpath(coords, run.ts, run.places));
}

/** The run of the angle a polar curve is drawn over when a figure does not say,
 * which is one whole turn. */
const WHOLE_TURN = interval(0, 2 * Math.PI);

/** What a polar curve takes, which is what a parametric curve takes under
 * another name. The one difference is the default of `over`, since the natural
 * run of an angle is a whole turn where the natural run of a parameter is
 * nothing to one. */
export type PolarOptions = ParametricOptions;

/**
 * The curve of a radius at each angle, about the place both axes read as
 * nothing, in the figure's own units.
 *
 * A negative radius places the point opposite the angle rather than being
 * refused, which is what draws the second half of a rose with an odd number of
 * petals: `cos(5*angle)` is negative over five of the ten runs of the angle it
 * passes through and the petals it draws there lie over the five it draws where
 * the radius is positive.
 */
export function polar(coords: Coords, of: (angle: number) => number, options: PolarOptions = {}): Path {
  const at = (angle: number) => {
    const radius = of(angle);
    return vec2(radius * Math.cos(angle), radius * Math.sin(angle));
  };
  return parametric(coords, at, { ...options, over: options.over ?? WHOLE_TURN });
}
