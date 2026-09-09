/**
 * The portrait demo: a phase portrait of a system with a limit cycle.
 *
 * The system is x' = x - y - x(x² + y²) and y' = x + y - y(x² + y²). Written in
 * polar coordinates it is r' = r(1 - r²) and θ' = 1, so every run turns once per
 * unit of time and every run settles on the circle of radius one. That circle is
 * the limit cycle, and it is a closed orbit: no function of x describes it, since
 * it stands over one x in two places.
 *
 * Three curves here are the three forms a plotted curve cannot write. The limit
 * cycle is `parametric`. The two spirals are `polar`, at the closed form
 * r(θ) = 1 / √(1 + (1/r₀² - 1)e^(-2θ)), which is what the polar system integrates
 * to. The two nullclines are `implicit`: the places where x' is nothing are
 * x - y - x(x² + y²) = 0, which is a cubic that is a function of neither
 * coordinate.
 *
 * A phase portrait has no picture in a graph of a function and none on a surface,
 * so it is a figure of its own, the way the turn and the boolean operations were
 * each given one.
 */
import {
  coordsOf,
  interval,
  scaleOf,
  vec2,
  type Expression,
  type Extent,
  type Figure,
  type FigureRecord,
  type Mark,
  type NodeRecord,
  resolveFigure,
  textScale,
} from '../index.js';
import { AMBER, DEEP, EMBER, INK, MIST, MOSS, SKY } from './palette.js';
import { stripOf } from './strip.js';
import { TYPE } from './typeface.js';

const ink = { colour: INK };
const pen = { colour: INK, width: 0.02 };
const faint = { colour: MIST, width: 0.012 };
const cycle = { colour: EMBER, width: 0.055 };
const spiral = { colour: DEEP, width: 0.032 };
const nullcline = { colour: MOSS, width: 0.026 };

/** How far the graph counts each way, which is far enough to hold the limit cycle
 * with the field around it and near enough that the arrows are not scratches. */
const REACH = 2.2;

/** Where that run lands in the figure's own units. Both axes count at one rate,
 * since a phase portrait read at two rates draws a circular orbit as an ellipse. */
const SPAN = 2.6;

export const coords = coordsOf(
  scaleOf(interval(-REACH, REACH), interval(-SPAN, SPAN)),
  scaleOf(interval(-REACH, REACH), interval(-SPAN, SPAN))
);

const extent: Extent = { width: 6.4, height: 6.4 };

/** How long each axis reaches past its last tick. */
const TIP = 0.16;

export const TEXT = textScale(0.3);

const reads = (name: string): Expression => ({ kind: 'variable', name });
const over = (operator: '+' | '-' | '*' | '/', left: Expression, right: Expression): Expression => ({
  kind: 'arithmetic',
  operator,
  left,
  right,
});
const calls = (name: string, ...args: readonly Expression[]): Expression => ({ kind: 'call', name, arguments: args });
/** One coordinate of the place a field arrow is sampled at. */
const sample = (name: 'x' | 'y'): Expression => ({ kind: 'member', of: reads('at'), name });

/** How far a place is from the origin, squared, from whichever pair of names the
 * caller reads its coordinates by. */
const squared = (x: Expression, y: Expression): Expression => over('+', over('*', x, x), over('*', y, y));

/** The system, as the vector at a place: the turn about the origin, the push out
 * from it, and the pull back in that grows with the cube of the distance. */
const systemAt = (x: Expression, y: Expression) => ({
  x: over('-', over('-', x, y), over('*', x, squared(x, y))),
  y: over('-', over('+', x, y), over('*', y, squared(x, y))),
});

const flowing: Expression = { kind: 'point', ...systemAt(sample('x'), sample('y')) };

/** How many arrows across and up. The graph is square in figure units, so one
 * count is both, and eleven each way is 121 arrows a reader can still see the
 * curves through. */
const FIELD = 11;
const FIELD_WIDTH = 0.024;
const FIELD_HEAD = 0.1;

/** How long an arrow is, against the magnitude of the vector there. It settles
 * towards a fifth of a figure unit rather than growing with the magnitude, which
 * reaches 6.2 at the corners of this graph and would cover the whole picture. */
const arrowLength: Expression = over(
  '/',
  over('*', 0.2, reads('magnitude')),
  over('+', 0.55, reads('magnitude'))
);

/** How far the limit cycle stands from the origin, which is where r(1 - r²) is
 * nothing and the flow neither grows nor shrinks. */
export const CYCLE = 1;

/** The closed orbit, as a place read from the parameter. It is the one curve here
 * a figure could also have written as a circle, and it is written as a
 * parametrisation because that is what the other closed orbits of this system
 * are. */
const orbit: Expression = {
  kind: 'point',
  x: calls('cos', reads('t')),
  y: calls('sin', reads('t')),
};

/** How many turns each spiral is drawn over. Two brings a run from 0.15 to within
 * 3.7e-6 of the limit cycle and a run from 1.9 to within 1.3e-6 of it. */
const TURNS = 2;

/**
 * A run of the system as a radius at each angle, from where it starts.
 *
 * Dividing r' = r(1 - r²) by θ' = 1 leaves dr/dθ = r(1 - r²), whose solution
 * through r₀ at angle nothing is this. Every run of the system is a spiral of
 * this shape, so a figure drawing one draws it exactly rather than walking it.
 */
const spiralFrom = (from: number): Expression =>
  over(
    '/',
    1,
    calls('sqrt', over('+', 1, over('*', 1 / (from * from) - 1, calls('exp', over('*', -2, reads('angle'))))))
  );

/** Where the two runs start: one well inside the limit cycle and one outside it,
 * so the picture shows the cycle drawing both in. */
export const SEEDS = { inward: 0.15, outward: 1.9 } as const;

/** How many cells each way the nullclines are found on. Forty-eight holds the
 * drawn curve inside a thousandth of a figure unit of the true one. */
const CELLS = 48;

/**
 * How many pieces each turn of a spiral is cut into.
 *
 * A polar curve is sampled evenly in the angle, and the run starting outside the
 * cycle falls from 1.9 to near 1 inside its first half turn, which is where the
 * samples are coarsest against the curve. At 96 a turn the drawn spiral stands
 * 1.2572e-3 figure units off the run walked through the field, and at 192 it
 * stands 2.2323e-4 off, which is a thirtieth of a pixel at the width the README
 * shows the sheet.
 */
const PER_TURN = 192;

const spiralAt = (name: string, from: number): NodeRecord => ({
  kind: 'shape',
  name,
  path: {
    kind: 'polar',
    coords,
    of: spiralFrom(from),
    over: { from: 0, to: TURNS * 2 * Math.PI },
    resolution: PER_TURN * TURNS,
  },
  style: { stroke: spiral },
});

/** One nullcline, which is where one coordinate of the system is nothing. The
 * two of them cross at the places the flow stands still. */
const nullclineAt = (name: string, which: 'x' | 'y'): NodeRecord => ({
  kind: 'shape',
  name,
  path: {
    kind: 'implicit',
    coords,
    of: systemAt(reads('x'), reads('y'))[which],
    resolution: CELLS,
  },
  style: { stroke: nullcline },
});

export const scene: NodeRecord = {
  kind: 'group',
  name: 'portrait',
  children: [
    { kind: 'numberPlane', name: 'grid', coords, options: { stroke: faint, minors: 4, minorOpacity: 0.45 } },
    { kind: 'axes', name: 'axes', coords, options: { stroke: pen, fill: ink, size: TEXT.tick, tip: TIP } },
    {
      kind: 'vectorField',
      name: 'field',
      coords,
      of: flowing,
      options: {
        resolution: FIELD,
        lengthOf: arrowLength,
        colourFor: { kind: 'bands', first: SKY, then: [{ above: 1.6, colour: AMBER }] },
        width: FIELD_WIDTH,
        head: FIELD_HEAD,
      },
    },
    nullclineAt('nullX', 'x'),
    nullclineAt('nullY', 'y'),
    spiralAt('inward', SEEDS.inward),
    spiralAt('outward', SEEDS.outward),
    {
      kind: 'shape',
      name: 'cycle',
      path: { kind: 'parametric', coords, of: orbit, over: { from: 0, to: 2 * Math.PI }, resolution: 96, closed: true },
      style: { stroke: cycle },
    },
    {
      kind: 'text',
      name: 'title',
      at: vec2(0, -SPAN + 0.28),
      content: 'a limit cycle',
      size: TEXT.label,
      options: { fill: ink, align: 'middle' },
    },
  ],
  style: TYPE,
};

export const DURATION = 5.4;
export const STILL = 4.8;

export const written: FigureRecord = {
  extent,
  fit: 'contain',
  scene,
  timeline: {
    spans: [
      { entry: { kind: 'fadeIn', target: 'portrait/grid' }, from: 0, to: 0.6 },
      { entry: { kind: 'fadeIn', target: 'portrait/axes' }, from: 0.2, to: 0.9 },
      { entry: { kind: 'fadeIn', target: 'portrait/field' }, from: 0.7, to: 1.6 },
      // A curve that is only drawn stands whole before its span rather than
      // absent, so each of the five is faded in over the same run it is drawn
      // over and the figure opens on the grid alone.
      { entry: { kind: 'draw', target: 'portrait/nullX' }, from: 1.4, to: 2.4 },
      { entry: { kind: 'fadeIn', target: 'portrait/nullX' }, from: 1.4, to: 1.5 },
      { entry: { kind: 'draw', target: 'portrait/nullY' }, from: 1.7, to: 2.7 },
      { entry: { kind: 'fadeIn', target: 'portrait/nullY' }, from: 1.7, to: 1.8 },
      { entry: { kind: 'draw', target: 'portrait/inward' }, from: 2.5, to: 3.9 },
      { entry: { kind: 'fadeIn', target: 'portrait/inward' }, from: 2.5, to: 2.6 },
      { entry: { kind: 'draw', target: 'portrait/outward' }, from: 2.8, to: 4.2 },
      { entry: { kind: 'fadeIn', target: 'portrait/outward' }, from: 2.8, to: 2.9 },
      { entry: { kind: 'draw', target: 'portrait/cycle' }, from: 3.9, to: 4.8 },
      { entry: { kind: 'fadeIn', target: 'portrait/cycle' }, from: 3.9, to: 4.0 },
      { entry: { kind: 'fadeIn', target: 'portrait/title' }, from: 4.6, to: DURATION },
    ],
    duration: DURATION,
  },
  still: STILL,
};

export const portrait: Figure = resolveFigure(written);

/** How wide and how tall one column of the strip is, which is the figure's own
 * extent with a gap around it. */
const SLOT = { across: 6.9, down: 6.9 };

/** The times the strip shows: the field alone, the nullclines drawn, the two
 * spirals walking in, and the cycle they settle on. */
export const FRAMES = [1.6, 2.7, 3.9, STILL] as const;

export function stripMarks(
  times: readonly number[] = FRAMES,
  columns = times.length,
  figure: Figure = portrait
): { marks: readonly Mark[]; extent: Extent } {
  return stripOf(figure, 'portrait', times, columns, SLOT);
}
