/**
 * The curve where a function of two numbers reaches a level, by marching squares.
 *
 * The function is read at the corners of a fixed grid, and each cell contributes
 * the piece of the curve that crosses it, from which of its four corners are at
 * or above the level. The pieces are chained by the cell edge they share, which
 * is an edge of the grid rather than a place, so two pieces meet by name and
 * never by comparing two coordinates for equality.
 *
 * The place a piece meets an edge is found by halving the edge rather than by
 * reading the level off a straight line between the two corner values. Halving
 * holds the crossing to a millionth of a millionth of the cell, where the
 * straight line holds it to the square of the cell's own width.
 *
 * The direction the curve leaves each of those places is read off the gradient of
 * the function rather than off where the neighbouring places sit. A curve at or
 * above the level has that region on its left, so its direction is the gradient
 * turned a quarter turn clockwise. Marching squares leaves places whose spacing
 * swings by a factor of ten where the curve runs near a grid line, and a
 * direction taken from neighbours that far apart is the direction of the chord
 * between them rather than of the curve.
 *
 * A cell whose corners are inside at two opposite corners and outside at the
 * other two has two pieces and two ways to pair the edges up. The value at the
 * middle of the cell decides which, which is the standard disambiguation and the
 * only one that keeps the two branches of a hyperbola apart where both pass
 * through one cell.
 *
 * The count of places is not fixed and cannot be. A parametric curve is sampled
 * at a count a figure names, and an implicit curve's places are the crossings its
 * own zero set makes, which the function decides. So a morph over an implicit
 * curve pairs places that need not correspond, and this is the one curve here
 * that cannot be a morph's source.
 */
import { interval, type Interval } from '../values/interval.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import { stepsOf } from './grid.js';
import { hermiteCubic } from './parametric.js';
import { pointOf, type Coords } from './scale.js';
import type { Cubic, Path, Subpath } from './path.js';

export interface ImplicitOptions {
  /** The value the curve is drawn at, nothing where it is left out. */
  level?: number;
  /** How many cells across and up. One number is both. */
  resolution?: number | { x: number; y: number };
  /** The runs sampled, each the whole of the graph that way where it is left
   * out. */
  over?: { x?: Interval; y?: Interval };
}

/**
 * How many cells each way the grid has when a figure does not say.
 *
 * The count draws a unit circle within 2.3e-7 of the true radius over a graph
 * four radii wide. The error falls with the fourth power of the count, since
 * every crossing is a place on the true curve and every piece leaves both of its
 * own along the true direction there.
 */
const CELLS = 64;

/** How many times a cell edge is halved when looking for the place the curve
 * crosses it. Twenty-four leaves the crossing within 3e-8 of the edge's own
 * width. */
const HALVINGS = 24;

/** Which of a cell's four edges a piece of the curve runs between. */
const BOTTOM = 0;
const RIGHT = 1;
const TOP = 2;
const LEFT = 3;

/**
 * The pairs of edges one cell's pieces run between, by which of its corners are
 * at or above the level, counted from the low corner anticlockwise.
 *
 * A pair reads from the first edge to the second with the region at or above the
 * level on the left, so a piece leaves one cell by the edge the next enters it
 * by, and a chain of them runs one way from end to end.
 *
 * The two entries with the corners at or above the level diagonally opposite are
 * empty here, since the value at the middle of the cell chooses their pairs.
 */
const PIECES: readonly (readonly (readonly [number, number])[])[] = [
  [],
  [[BOTTOM, LEFT]],
  [[RIGHT, BOTTOM]],
  [[RIGHT, LEFT]],
  [[TOP, RIGHT]],
  [],
  [[TOP, BOTTOM]],
  [[TOP, LEFT]],
  [[LEFT, TOP]],
  [[BOTTOM, TOP]],
  [],
  [[RIGHT, TOP]],
  [[LEFT, RIGHT]],
  [[BOTTOM, RIGHT]],
  [[LEFT, BOTTOM]],
  [],
];

/** The pairs the two ambiguous cells take, by whether the middle of the cell is
 * at or above the level: the corners cut off are the ones the middle is not
 * joined to. */
const AMBIGUOUS: Record<number, { middleInside: readonly (readonly [number, number])[]; middleOutside: readonly (readonly [number, number])[] }> = {
  5: { middleInside: [[BOTTOM, RIGHT], [TOP, LEFT]], middleOutside: [[BOTTOM, LEFT], [TOP, RIGHT]] },
  10: { middleInside: [[LEFT, BOTTOM], [RIGHT, TOP]], middleOutside: [[RIGHT, BOTTOM], [LEFT, TOP]] },
};

/**
 * The place on a straight edge where the function reaches the level, by halving
 * the edge and taking the middle of what is left.
 *
 * Which end is at or above the level is read once and the halving keeps the two
 * ends on opposite sides of it, so a function that is not monotonic along the
 * edge hands back one of its crossings rather than nothing.
 */
function crossingOn(of: (x: number, y: number) => number, level: number, from: Vec2, to: Vec2): Vec2 {
  const reached = (at: Vec2) => of(at.x, at.y) >= level;
  const start = reached(from);
  let near = from;
  let far = to;
  for (let halving = 0; halving < HALVINGS; halving++) {
    const middle = vec2.lerp(near, far, 0.5);
    if (reached(middle) === start) near = middle;
    else far = middle;
  }
  return vec2.lerp(near, far, 0.5);
}

/**
 * How far apart the two places a gradient is read at sit, as a fraction of a
 * cell.
 *
 * A central difference loses accuracy as the gap grows, since the difference
 * carries the curvature of the function with it, and loses it again as the gap
 * closes, since two nearly equal values cancel down to their last bits. A ten
 * thousandth of a cell is near the least of the two.
 */
const GRADIENT = 1e-4;

/**
 * The direction the curve runs at a place, as a unit vector, and nothing where
 * the gradient vanishes.
 *
 * The gradient points the way the function climbs, which is towards the region at
 * or above the level, and turning it a quarter turn clockwise puts that region on
 * the left of the direction handed back.
 */
function directionAt(of: (x: number, y: number) => number, at: Vec2, step: Vec2): Vec2 | undefined {
  const across = (of(at.x + step.x, at.y) - of(at.x - step.x, at.y)) / (2 * step.x);
  const up = (of(at.x, at.y + step.y) - of(at.x, at.y - step.y)) / (2 * step.y);
  const size = Math.hypot(across, up);
  if (!Number.isFinite(size) || size === 0) return undefined;
  return vec2(up / size, -across / size);
}

/**
 * A run of places joined by cubics, each leaving its ends along the curve's own
 * direction there and reaching a third of the straight distance between them.
 *
 * A third of the chord is what the control distance of an arc comes to as the arc
 * shortens, so a run of short pieces along a circle is the circle to the fifth
 * power of the angle each piece covers. A place where the gradient vanishes has
 * no direction of its own and takes the chord's instead, which is a corner drawn
 * where the curve has one.
 */
function runThrough(coords: Coords, places: readonly Vec2[], directions: readonly (Vec2 | undefined)[], closes: boolean): Subpath {
  const count = places.length;
  const pieces = closes ? count : count - 1;
  const curves: Cubic[] = [];
  for (let at = 0; at < pieces; at++) {
    const next = (at + 1) % count;
    const chord = vec2.sub(places[next], places[at]);
    const straight = vec2.magnitude(chord);
    const along = straight === 0 ? vec2(0, 0) : vec2.scale(chord, 1 / straight);
    curves.push(
      hermiteCubic(coords, straight, places[at], directions[at] ?? along, places[next], directions[next] ?? along)
    );
  }
  return { start: pointOf(coords, places[0].x, places[0].y), curves, closed: closes };
}

/** One run of the curve, as the grid edges it crosses in order and whether it
 * comes back round to the edge it began on. */
interface Run {
  readonly edges: number[];
  readonly closes: boolean;
}

/**
 * The curve where a function of two numbers reaches a level, in the figure's own
 * units, as one subpath per run of it.
 *
 * A run that closes is one closed subpath and a run that leaves the sampled
 * region is open, ending on the edge of that region. A corner whose value is not
 * a number counts as below the level, so a hole in the function is a boundary
 * rather than a crossing at an infinity.
 */
export function implicit(coords: Coords, of: (x: number, y: number) => number, options: ImplicitOptions = {}): Path {
  const cells = stepsOf(options.resolution ?? CELLS, 'x', 'y');
  const across = Math.max(1, Math.round(cells.x));
  const up = Math.max(1, Math.round(cells.y));
  const runX = interval.ordered(options.over?.x ?? coords.x.graph);
  const runY = interval.ordered(options.over?.y ?? coords.y.graph);
  const level = options.level ?? 0;
  if (!(interval.span(runX) > 0) || !(interval.span(runY) > 0)) return [];

  const xAt = (i: number) => interval.at(runX, i / across);
  const yAt = (j: number) => interval.at(runY, j / up);
  const reached: boolean[][] = [];
  for (let i = 0; i <= across; i++) {
    const column: boolean[] = [];
    for (let j = 0; j <= up; j++) column.push(of(xAt(i), yAt(j)) >= level);
    reached.push(column);
  }

  // An edge of the grid is named by which way it runs and which corner it leaves,
  // so the two cells that share one name the same edge and their pieces chain.
  const verticals = across * (up + 1);
  const horizontal = (i: number, j: number) => i * (up + 1) + j;
  const vertical = (i: number, j: number) => verticals + i * up + j;

  const places = new Map<number, Vec2>();
  const next = new Map<number, number>();
  const crossing = (edge: number, from: Vec2, to: Vec2) => {
    if (!places.has(edge)) places.set(edge, crossingOn(of, level, from, to));
    return edge;
  };

  for (let i = 0; i < across; i++) {
    for (let j = 0; j < up; j++) {
      const corners = [reached[i][j], reached[i + 1][j], reached[i + 1][j + 1], reached[i][j + 1]];
      const which = corners.reduce((sum, inside, at) => sum + (inside ? 1 << at : 0), 0);
      const ambiguous = AMBIGUOUS[which];
      const pairs = ambiguous
        ? of((xAt(i) + xAt(i + 1)) / 2, (yAt(j) + yAt(j + 1)) / 2) >= level
          ? ambiguous.middleInside
          : ambiguous.middleOutside
        : PIECES[which];
      if (pairs.length === 0) continue;

      const low = vec2(xAt(i), yAt(j));
      const high = vec2(xAt(i + 1), yAt(j + 1));
      const edges = [
        () => crossing(horizontal(i, j), low, vec2(high.x, low.y)),
        () => crossing(vertical(i + 1, j), vec2(high.x, low.y), high),
        () => crossing(horizontal(i, j + 1), vec2(low.x, high.y), high),
        () => crossing(vertical(i, j), low, vec2(low.x, high.y)),
      ];
      for (const [from, to] of pairs) next.set(edges[from](), edges[to]());
    }
  }

  const runs: Run[] = [];
  const walk = (start: number, closes: boolean): Run => {
    const edges = [start];
    let at = start;
    while (next.has(at)) {
      const step = next.get(at) as number;
      next.delete(at);
      if (closes && step === start) break;
      edges.push(step);
      at = step;
    }
    return { edges, closes };
  };

  // A run that leaves the sampled region starts on an edge no piece enters, so
  // those are walked first and every edge still spoken for afterwards is on a run
  // that comes back round to where it began.
  const entered = new Set(next.values());
  for (const start of [...next.keys()].filter((edge) => !entered.has(edge))) {
    if (next.has(start)) runs.push(walk(start, false));
  }
  while (next.size > 0) runs.push(walk(next.keys().next().value as number, true));

  const step = vec2(interval.span(runX) * (GRADIENT / across), interval.span(runY) * (GRADIENT / up));
  const path: Subpath[] = [];
  for (const run of runs) {
    const drawn = run.edges.map((edge) => places.get(edge) as Vec2);
    if (drawn.length < (run.closes ? 3 : 2)) continue;
    path.push(runThrough(coords, drawn, drawn.map((place) => directionAt(of, place, step)), run.closes));
  }
  return path;
}
