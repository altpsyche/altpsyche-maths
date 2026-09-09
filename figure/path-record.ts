/**
 * A path written as data: a named form with its parameters, or its cubics.
 *
 * The rule is that every path a figure carries is one of the two, and which of
 * them is a choice per figure rather than a rule. A named form is shorter and
 * says what the shape is, so a circle stays a centre and a radius rather than
 * four cubics a reader has to recognise. Cubics written out are what carries a
 * shape no named form describes.
 *
 * A path is already plain data, since a subpath is a point, a list of cubics and
 * whether it closes, so the written-out form names the path rather than
 * re-spelling it. `data` is the same shape as an SVG `d` attribute, which is
 * what lets a figure carry geometry another tool produced.
 *
 * Every parameter is an expression rather than a value, so a shape a track
 * drives is the same form as a shape that stands still. A bare number and a bare
 * point are both literals, which is what keeps a fixed parameter written as
 * itself.
 *
 * A boolean operation is a form here rather than geometry a figure carries,
 * because the answer's cubics are none of the operands' and a disc walking
 * through another changes the answer every frame.
 *
 * The graph forms are the same argument over a curve. `plot` carries the curve as
 * an expression of the bound variable `x`, and `areaUnder` and `tangentAt` take
 * the plotted path rather than the function behind it, so the region and the
 * curve laid over it are one piece of geometry and cannot come to disagree.
 *
 * The three curves no function of x describes carry their own bound variables by
 * the same rule: `parametric` reads `t`, `polar` reads `angle`, and `implicit`
 * reads `x` and `y` together. A figure naming its own variable would be a
 * renderer looking a name up rather than binding one.
 *
 * `straight` has no form here. It hands back one `Cubic` rather than a path, and
 * a path written out as cubics already carries its controls, so a figure that
 * would reach for it uses `line` or writes the cubic out.
 */
import type { Vec2 } from '../values/vec2.js';
import { arc, circle, line, polygon, polyline, rect, type Path } from './path.js';
import { pathFromData } from './path-data.js';
import { differenceOf, intersectionOf, unionOf } from './boolean.js';
import { areaUnder, plot, tangentAt } from './plot.js';
import { parametric, polar } from './parametric.js';
import { implicit } from './implicit.js';
import { bracePath } from './annotate.js';
import { interval, type Interval } from '../values/interval.js';
import type { Coords } from './scale.js';
import { asNumber, asPoint, evaluate, type Bindings, type Expression } from './expression.js';

/** A run of numbers whose ends may follow a track. A plain `Interval` is one
 * already, since a bare number is a literal. */
export interface IntervalRecord {
  readonly from: Expression;
  readonly to: Expression;
}

/**
 * One path, named or written out, or two paths combined.
 *
 * The angles an arc takes are `from` and `to` in radians, anticlockwise, the way
 * the call takes them. A boolean operation's `tolerance` is a plain number
 * rather than an expression, since it says how close two things come before they
 * count as one place and nothing a figure animates changes that.
 */
export type PathRecord =
  | { readonly kind: 'line'; readonly from: Expression; readonly to: Expression }
  | { readonly kind: 'polyline'; readonly points: readonly Expression[] }
  | { readonly kind: 'polygon'; readonly points: readonly Expression[] }
  | {
      readonly kind: 'rect';
      readonly corner: Expression;
      readonly width: Expression;
      readonly height: Expression;
    }
  | { readonly kind: 'circle'; readonly centre: Expression; readonly radius: Expression }
  | {
      readonly kind: 'arc';
      readonly centre: Expression;
      readonly radius: Expression;
      readonly from: Expression;
      readonly to: Expression;
    }
  | {
      readonly kind: 'plot';
      readonly coords: Coords;
      /** The curve, as an expression of the bound variable `x`. */
      readonly of: Expression;
      readonly resolution?: number;
      readonly over?: IntervalRecord;
    }
  | {
      readonly kind: 'parametric';
      readonly coords: Coords;
      /** The curve, as an expression of the bound variable `t` giving a place on
       * the graph. */
      readonly of: Expression;
      readonly resolution?: number;
      readonly over?: IntervalRecord;
      readonly closed?: boolean;
    }
  | {
      readonly kind: 'polar';
      readonly coords: Coords;
      /** The curve, as an expression of the bound variable `angle` giving the
       * radius at that angle. */
      readonly of: Expression;
      readonly resolution?: number;
      readonly over?: IntervalRecord;
      readonly closed?: boolean;
    }
  | {
      readonly kind: 'implicit';
      readonly coords: Coords;
      /** The function, as an expression of the bound variables `x` and `y`, whose
       * level set the curve is. */
      readonly of: Expression;
      readonly level?: Expression;
      readonly resolution?: number | { readonly x: number; readonly y: number };
      /** The region sampled, in plain intervals rather than expressions: a region
       * a track drove would hand back a different count of places at every time. */
      readonly over?: { readonly x?: Interval; readonly y?: Interval };
    }
  | {
      readonly kind: 'areaUnder';
      readonly coords: Coords;
      readonly curve: PathRecord;
      readonly baseline?: Expression;
    }
  | {
      readonly kind: 'tangentAt';
      readonly coords: Coords;
      readonly curve: PathRecord;
      readonly x: Expression;
      readonly reach?: Expression;
    }
  | {
      readonly kind: 'bracePath';
      readonly from: Expression;
      readonly to: Expression;
      readonly depth: Expression;
      readonly curl?: Expression;
    }
  | { readonly kind: 'data'; readonly d: string }
  | { readonly kind: 'cubics'; readonly subpaths: Path }
  | {
      readonly kind: 'union' | 'intersection' | 'difference';
      readonly first: PathRecord;
      readonly second: PathRecord;
      readonly tolerance?: number;
    };

const numberOf = (expression: Expression, bindings: Bindings, what: string): number =>
  asNumber(evaluate(expression, bindings), what);

const pointOf = (expression: Expression, bindings: Bindings, what: string): Vec2 =>
  asPoint(evaluate(expression, bindings), what);

const points = (list: readonly Expression[], bindings: Bindings, what: string): Vec2[] =>
  list.map((point, at) => pointOf(point, bindings, `point ${at} of ${what}`));

export const spanOf = (record: IntervalRecord, bindings: Bindings, what: string): Interval =>
  interval(numberOf(record.from, bindings, `the start of ${what}`), numberOf(record.to, bindings, `the end of ${what}`));

/**
 * A curve as the function `plot` samples, from an expression of one bound
 * variable.
 *
 * The variable is `x` by a rule rather than by a field, which keeps the form
 * closed: a figure naming its own variable would be a renderer looking a name up
 * rather than binding one.
 */
export function curveOf(expression: Expression, bindings: Bindings): (x: number) => number {
  return (x) =>
    numberOf(expression, { ...bindings, variables: { ...bindings.variables, x } }, 'a plotted curve');
}

/**
 * A curve as the function `parametric` samples, from an expression of one bound
 * variable giving a place.
 */
export function placeOf(expression: Expression, bindings: Bindings): (t: number) => Vec2 {
  return (t) => pointOf(expression, { ...bindings, variables: { ...bindings.variables, t } }, 'a parametric curve');
}

/**
 * A curve as the function `polar` samples, from an expression of one bound
 * variable giving the radius at that angle.
 */
export function radiusOf(expression: Expression, bindings: Bindings): (angle: number) => number {
  return (angle) =>
    numberOf(expression, { ...bindings, variables: { ...bindings.variables, angle } }, 'a polar curve');
}

/**
 * The function `implicit` reads the level set of, from an expression of two bound
 * variables giving the height over that place.
 */
export function heightOf(expression: Expression, bindings: Bindings): (x: number, y: number) => number {
  return (x, y) =>
    numberOf(expression, { ...bindings, variables: { ...bindings.variables, x, y } }, 'an implicit curve');
}

/**
 * The record resolved into the geometry it names.
 *
 * A form outside the set is refused with a sentence naming what was asked for,
 * the way an expression refuses a function it has no entry for. A figure read
 * from a file carries whatever the file says, so the check is at run time rather
 * than in the types alone.
 */
export function resolvePath(record: PathRecord, bindings: Bindings = {}): Path {
  switch (record.kind) {
    case 'line':
      return line(pointOf(record.from, bindings, "a line's start"), pointOf(record.to, bindings, "a line's end"));
    case 'polyline':
      return polyline(points(record.points, bindings, 'a polyline'));
    case 'polygon':
      return polygon(points(record.points, bindings, 'a polygon'));
    case 'rect':
      return rect(
        pointOf(record.corner, bindings, "a rectangle's corner"),
        numberOf(record.width, bindings, "a rectangle's width"),
        numberOf(record.height, bindings, "a rectangle's height")
      );
    case 'circle':
      return circle(
        pointOf(record.centre, bindings, "a circle's centre"),
        numberOf(record.radius, bindings, "a circle's radius")
      );
    case 'arc':
      return arc(
        pointOf(record.centre, bindings, "an arc's centre"),
        numberOf(record.radius, bindings, "an arc's radius"),
        numberOf(record.from, bindings, "an arc's first angle"),
        numberOf(record.to, bindings, "an arc's last angle")
      );
    case 'plot':
      return plot(record.coords, curveOf(record.of, bindings), {
        resolution: record.resolution,
        over: record.over ? spanOf(record.over, bindings, 'a plot') : undefined,
      });
    case 'parametric':
      return parametric(record.coords, placeOf(record.of, bindings), {
        resolution: record.resolution,
        over: record.over ? spanOf(record.over, bindings, 'a parametric curve') : undefined,
        closed: record.closed,
      });
    case 'polar':
      return polar(record.coords, radiusOf(record.of, bindings), {
        resolution: record.resolution,
        over: record.over ? spanOf(record.over, bindings, 'a polar curve') : undefined,
        closed: record.closed,
      });
    case 'implicit':
      return implicit(record.coords, heightOf(record.of, bindings), {
        level: record.level === undefined ? undefined : numberOf(record.level, bindings, "an implicit curve's level"),
        resolution: record.resolution,
        over: record.over,
      });
    case 'areaUnder':
      return areaUnder(record.coords, resolvePath(record.curve, bindings), {
        baseline: record.baseline === undefined ? undefined : numberOf(record.baseline, bindings, "a region's baseline"),
      });
    case 'tangentAt':
      return tangentAt(
        record.coords,
        resolvePath(record.curve, bindings),
        numberOf(record.x, bindings, "a tangent's x"),
        { reach: record.reach === undefined ? undefined : numberOf(record.reach, bindings, "a tangent's reach") }
      );
    case 'bracePath':
      return bracePath(
        pointOf(record.from, bindings, "a brace's first point"),
        pointOf(record.to, bindings, "a brace's last point"),
        {
          depth: numberOf(record.depth, bindings, "a brace's depth"),
          curl: record.curl === undefined ? undefined : numberOf(record.curl, bindings, "a brace's curl"),
        }
      );
    case 'data':
      return pathFromData(record.d);
    case 'cubics':
      return record.subpaths;
    case 'union':
    case 'intersection':
    case 'difference': {
      const first = resolvePath(record.first, bindings);
      const second = resolvePath(record.second, bindings);
      const options = { tolerance: record.tolerance };
      if (record.kind === 'union') return unionOf(first, second, options);
      if (record.kind === 'intersection') return intersectionOf(first, second, options);
      return differenceOf(first, second, options);
    }
  }
  throw new Error(`a path has no form called ${String((record as { kind?: unknown }).kind)}`);
}
