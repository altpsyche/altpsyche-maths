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
 * `straight` has no form here. It hands back one `Cubic` rather than a path, and
 * a path written out as cubics already carries its controls, so a figure that
 * would reach for it uses `line` or writes the cubic out.
 */
import type { Vec2 } from '../values/vec2.js';
import { arc, circle, line, polygon, polyline, rect, type Path } from './path.js';
import { pathFromData } from './path-data.js';
import { differenceOf, intersectionOf, unionOf } from './boolean.js';
import { evaluate, type Bindings, type Expression } from './expression.js';

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
  | { readonly kind: 'data'; readonly d: string }
  | { readonly kind: 'cubics'; readonly subpaths: Path }
  | {
      readonly kind: 'union' | 'intersection' | 'difference';
      readonly first: PathRecord;
      readonly second: PathRecord;
      readonly tolerance?: number;
    };

function numberOf(expression: Expression, bindings: Bindings, what: string): number {
  const value = evaluate(expression, bindings);
  if (typeof value !== 'number') throw new Error(`${what} is a number and was given ${nameOf(value)}`);
  return value;
}

function pointOf(expression: Expression, bindings: Bindings, what: string): Vec2 {
  const value = evaluate(expression, bindings);
  if (typeof value !== 'object') throw new Error(`${what} is a point and was given ${nameOf(value)}`);
  return value;
}

function nameOf(value: number | boolean | Vec2): string {
  if (typeof value === 'number') return 'a number';
  if (typeof value === 'boolean') return 'a true or false';
  return 'a point';
}

const points = (list: readonly Expression[], bindings: Bindings, what: string): Vec2[] =>
  list.map((point, at) => pointOf(point, bindings, `point ${at} of ${what}`));

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
