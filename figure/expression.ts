/**
 * A parameter a figure computes rather than states, written as data.
 *
 * A figure carries no functions, so a value that follows a track is an
 * expression: a tree of named forms a renderer walks. The vocabulary is closed
 * and it is published, which is the whole difference between this and an
 * interpreter. A form outside it is refused with a sentence naming what was
 * asked for, so a figure that cannot be drawn says so rather than drawing
 * something else.
 *
 * The tree is over numbers and over points, and that is a requirement rather
 * than a convenience: one vocabulary then carries a curve of one number, a
 * parametric curve, a field of a place, a surface of two numbers and a pointwise
 * map of a shape. A form written for a scalar and widened afterwards costs a
 * major version to widen.
 *
 * The calls that read geometry take a path or a camera, and both carry
 * expressions of their own, so this module and those records name each other.
 * Neither reads the other while it is loading, which is what makes that safe.
 *
 * What it refuses is a map this vocabulary cannot spell. A complex square, a
 * complex exponential and a Möbius map are all here, since each is arithmetic
 * over the two members of a point. Anything else is refused rather than drawn,
 * and that refusal is the price of the format being closed.
 */
import { clamp, inverseLerp, lerp, remap } from '../values/scalar.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import { vec3 } from '../values/vec3.js';
import type { TrackValue } from '../timing/track.js';
import type { Extent } from './extent.js';
import type { Path } from './path.js';
import type { Coords } from './scale.js';
import { lengthOf, pointAlong } from './length.js';
import { slopeOf } from './plot.js';
import { resolvePath, type PathRecord } from './path-record.js';
import { resolveCamera, type Camera3Record } from './camera-record.js';
import type { Camera3 } from './camera.js';

/**
 * What an expression evaluates to. A list-valued track has no place here, since
 * the vocabulary has no list.
 *
 * A path and a pair of scales are values because the three calls that read
 * geometry take them. Neither is arithmetic and neither is compared, so what
 * they widen is the argument of a call rather than the vocabulary at large.
 */
export type ExpressionValue = number | boolean | Vec2 | Path | Coords | Camera3;

/** A number or a place the expression is evaluated for: the x of a curve, the
 * place a field is read at, the two numbers of a surface. */
export type Variables = Record<string, ExpressionValue>;

/** What the names in an expression stand for, which is what makes the same tree
 * answer at one time and at another. */
export interface Bindings {
  /** The tracks' own values at the time being drawn. */
  readonly tracks?: Record<string, TrackValue>;
  readonly variables?: Variables;
  /** Frame: the extent the figure declares, resolved at the aspect being drawn,
   * and never the extent a view move or a follow has left. A follow resolves its
   * extent from the marks, so a mark reading that extent would ask for what is
   * being built. */
  readonly frame?: Extent;
}

/** What a frame expression may read off the extent. The set is versioned the
 * way the function set is, so a reader holds a file's `name` to these four. */
export const FRAME_MEASURES = Object.freeze(['width', 'height', 'aspect', 'centre'] as const);

export type FrameMeasure = (typeof FRAME_MEASURES)[number];

export type Arithmetic = '+' | '-' | '*' | '/';
export type Comparison = '<' | '<=' | '>' | '>=' | '=' | '!=';

/**
 * One node of the tree.
 *
 * A bare number, boolean or point is a literal, which keeps the common case one
 * value rather than a record wrapping one value. A point is told from the record
 * forms by carrying no `kind`, so a fixed place in a figure is written the way
 * every other fixed place in this package is.
 */
export type Expression =
  | number
  | boolean
  | Vec2
  | { readonly kind: 'track'; readonly name: string }
  | { readonly kind: 'variable'; readonly name: string }
  | { readonly kind: 'frame'; readonly name: FrameMeasure }
  | { readonly kind: 'point'; readonly x: Expression; readonly y: Expression }
  | { readonly kind: 'member'; readonly of: Expression; readonly name: 'x' | 'y' }
  | {
      readonly kind: 'arithmetic';
      readonly operator: Arithmetic;
      readonly left: Expression;
      readonly right: Expression;
    }
  | {
      readonly kind: 'compare';
      readonly operator: Comparison;
      readonly left: Expression;
      readonly right: Expression;
    }
  | {
      readonly kind: 'choice';
      readonly when: Expression;
      readonly then: Expression;
      readonly otherwise: Expression;
    }
  | { readonly kind: 'call'; readonly name: string; readonly arguments: readonly Expression[] }
  | { readonly kind: 'path'; readonly of: PathRecord }
  | { readonly kind: 'coords'; readonly of: Coords }
  | { readonly kind: 'camera'; readonly of: Camera3Record };

/** A place rather than a number, a path or a pair of scales, told apart by
 * carrying a number in both members. */
function isPoint(value: ExpressionValue): value is Vec2 {
  return typeof value === 'object' && !Array.isArray(value) && typeof (value as Vec2).x === 'number';
}

/** A path is the one value that is a list, which is what tells it from a pair of
 * scales. */
const isPath = (value: ExpressionValue): value is Path => Array.isArray(value);

/** A camera carries the place its eye stands, which nothing else here does. */
const isCamera = (value: ExpressionValue): value is Camera3 => typeof value === 'object' && 'eye' in value;

export function asNumber(value: ExpressionValue, what: string): number {
  if (typeof value !== 'number') throw new Error(`${what} is a number and was given ${nameOfKind(value)}`);
  return value;
}

export function asPoint(value: ExpressionValue, what: string): Vec2 {
  if (!isPoint(value)) throw new Error(`${what} is a point and was given ${nameOfKind(value)}`);
  return value;
}

function asPath(value: ExpressionValue, what: string): Path {
  if (!isPath(value)) throw new Error(`${what} is a path and was given ${nameOfKind(value)}`);
  return value;
}

function asCoords(value: ExpressionValue, what: string): Coords {
  if (typeof value !== 'object' || isPath(value) || isPoint(value) || isCamera(value)) {
    throw new Error(`${what} is a pair of scales and was given ${nameOfKind(value)}`);
  }
  return value;
}

function asCamera(value: ExpressionValue, what: string): Camera3 {
  if (typeof value !== 'object' || isPath(value) || isPoint(value) || !isCamera(value)) {
    throw new Error(`${what} is a camera and was given ${nameOfKind(value)}`);
  }
  return value;
}

/** What a value is called in the sentence a refusal is written with. */
export function nameOfKind(value: ExpressionValue): string {
  if (typeof value === 'number') return 'a number';
  if (typeof value === 'boolean') return 'a true or false';
  if (isPath(value)) return 'a path';
  if (isPoint(value)) return 'a point';
  if (isCamera(value)) return 'a camera';
  return 'a pair of scales';
}

/** One callable form: how many arguments it takes and what it does with them.
 * The count is checked before the call, so a form short of an argument is
 * refused rather than reading an undefined one. */
interface Callable {
  readonly takes: number;
  readonly of: (values: readonly ExpressionValue[], name: string) => ExpressionValue;
}

/** The pure functions an expression may name. Each is one this package or the
 * standard library already publishes, so a renderer implements a fixed list
 * rather than a language. */
const FUNCTIONS: Record<string, Callable> = {
  abs: one(Math.abs),
  sign: one(Math.sign),
  floor: one(Math.floor),
  round: one(Math.round),
  sqrt: one(Math.sqrt),
  exp: one(Math.exp),
  log: one(Math.log),
  sin: one(Math.sin),
  cos: one(Math.cos),
  tan: one(Math.tan),
  asin: one(Math.asin),
  acos: one(Math.acos),
  atan: one(Math.atan),
  pow: two(Math.pow),
  atan2: two(Math.atan2),
  min: two(Math.min),
  max: two(Math.max),
  hypot: two(Math.hypot),
  clamp: three(clamp),
  inverseLerp: three(inverseLerp),
  remap: {
    takes: 5,
    of: (values, name) =>
      remap(
        asNumber(values[0], `the first argument of ${name}`),
        asNumber(values[1], `the second argument of ${name}`),
        asNumber(values[2], `the third argument of ${name}`),
        asNumber(values[3], `the fourth argument of ${name}`),
        asNumber(values[4], `the fifth argument of ${name}`)
      ),
  },
  // The two ends are both numbers or both points, since a fraction of the way
  // from a number to a place is nothing.
  lerp: {
    takes: 3,
    of: (values, name) => {
      const along = asNumber(values[2], `the third argument of ${name}`);
      if (isPoint(values[0])) return vec2.lerp(values[0], asPoint(values[1], `the second argument of ${name}`), along);
      return lerp(
        asNumber(values[0], `the first argument of ${name}`),
        asNumber(values[1], `the second argument of ${name}`),
        along
      );
    },
  },
  add: points((first, second) => vec2.add(first, second)),
  subtract: points((first, second) => vec2.sub(first, second)),
  dot: points((first, second) => vec2.dot(first, second)),
  cross: points((first, second) => vec2.cross(first, second)),
  distance: points((first, second) => vec2.distance(first, second)),
  magnitude: point((only) => vec2.magnitude(only)),
  normalize: point((only) => vec2.normalize(only)),
  perpendicular: point((only) => vec2.perpendicular(only)),
  angle: point((only) => vec2.angle(only)),
  scale: {
    takes: 2,
    of: (values, name) =>
      vec2.scale(asPoint(values[0], `the first argument of ${name}`), asNumber(values[1], `the second argument of ${name}`)),
  },
  rotate: {
    takes: 2,
    of: (values, name) =>
      vec2.rotate(asPoint(values[0], `the first argument of ${name}`), asNumber(values[1], `the second argument of ${name}`)),
  },
  lengthOf: { takes: 1, of: (values, name) => lengthOf(asPath(values[0], `the argument of ${name}`)) },
  pointAlong: {
    takes: 2,
    of: (values, name) => {
      const place = pointAlong(
        asPath(values[0], `the first argument of ${name}`),
        asNumber(values[1], `the second argument of ${name}`)
      );
      if (!place) throw new Error(`${name} is given a path with no points in it, which has no place to read`);
      return place;
    },
  },
  project: {
    takes: 4,
    of: (values, name) =>
      asCamera(values[0], `the first argument of ${name}`).project(
        vec3(
          asNumber(values[1], `the second argument of ${name}`),
          asNumber(values[2], `the third argument of ${name}`),
          asNumber(values[3], `the fourth argument of ${name}`)
        )
      ).at,
  },
  slopeOf: {
    takes: 3,
    of: (values, name) =>
      slopeOf(
        asCoords(values[0], `the first argument of ${name}`),
        asPath(values[1], `the second argument of ${name}`),
        asNumber(values[2], `the third argument of ${name}`)
      ),
  },
};

function one(of: (value: number) => number): Callable {
  return { takes: 1, of: (values, name) => of(asNumber(values[0], `the argument of ${name}`)) };
}

function two(of: (first: number, second: number) => number): Callable {
  return {
    takes: 2,
    of: (values, name) =>
      of(asNumber(values[0], `the first argument of ${name}`), asNumber(values[1], `the second argument of ${name}`)),
  };
}

function three(of: (first: number, second: number, third: number) => number): Callable {
  return {
    takes: 3,
    of: (values, name) =>
      of(
        asNumber(values[0], `the first argument of ${name}`),
        asNumber(values[1], `the second argument of ${name}`),
        asNumber(values[2], `the third argument of ${name}`)
      ),
  };
}

function point(of: (only: Vec2) => ExpressionValue): Callable {
  return { takes: 1, of: (values, name) => of(asPoint(values[0], `the argument of ${name}`)) };
}

function points(of: (first: Vec2, second: Vec2) => ExpressionValue): Callable {
  return {
    takes: 2,
    of: (values, name) =>
      of(asPoint(values[0], `the first argument of ${name}`), asPoint(values[1], `the second argument of ${name}`)),
  };
}

/** Every function an expression may name, in the order a reference lists them.
 * The set is versioned the way the node set is, so a figure written against one
 * version says which names it may use. */
export const EXPRESSION_FUNCTIONS: readonly string[] = Object.freeze(Object.keys(FUNCTIONS).sort());

/** A track's value as something the vocabulary carries. A list has no value
 * type here, so the track is named rather than silently read as its first
 * number. */
function valueOfTrack(value: TrackValue, name: string): ExpressionValue {
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  throw new Error(`an expression reads the track ${name}, whose value is a list, which an expression has no form for`);
}

function compared(operator: Comparison, left: ExpressionValue, right: ExpressionValue): boolean {
  if (operator === '=' || operator === '!=') {
    const same = isPoint(left) && isPoint(right) ? left.x === right.x && left.y === right.y : left === right;
    return operator === '=' ? same : !same;
  }
  const first = asNumber(left, `the left side of a ${operator}`);
  const second = asNumber(right, `the right side of a ${operator}`);
  if (operator === '<') return first < second;
  if (operator === '<=') return first <= second;
  if (operator === '>') return first > second;
  return first >= second;
}

/**
 * The value an expression has for a set of tracks and variables.
 *
 * Arithmetic is over numbers and the point calls are what combine places, since
 * dividing one place by another means nothing and a renderer implementing one
 * rule per operator has fewer rules to disagree about. Division by nothing is
 * left as the infinity the arithmetic gives rather than refused, so a field
 * sampled at a pole reads as a pole.
 */
export function evaluate(expression: Expression, bindings: Bindings = {}): ExpressionValue {
  if (typeof expression === 'number' || typeof expression === 'boolean') return expression;
  if (!('kind' in expression)) return expression;

  switch (expression.kind) {
    case 'track': {
      const value = bindings.tracks?.[expression.name];
      if (value === undefined) {
        throw new Error(`an expression reads the track ${expression.name}, which is not among the values it was given`);
      }
      return valueOfTrack(value, expression.name);
    }
    case 'variable': {
      const value = bindings.variables?.[expression.name];
      if (value === undefined) {
        throw new Error(`an expression reads ${expression.name}, which is not among the variables it was given`);
      }
      return value;
    }
    case 'frame': {
      const frame = bindings.frame;
      if (frame === undefined) {
        throw new Error(
          `an expression reads the frame's ${expression.name}, which is not among the values it was given`
        );
      }
      if (expression.name === 'aspect') return frame.width / frame.height;
      if (expression.name === 'centre') return frame.centre ?? vec2(0, 0);
      return frame[expression.name];
    }
    case 'point':
      return vec2(
        asNumber(evaluate(expression.x, bindings), 'the x of a point'),
        asNumber(evaluate(expression.y, bindings), 'the y of a point')
      );
    case 'member':
      return asPoint(evaluate(expression.of, bindings), `the ${expression.name} is read off something that`)[
        expression.name
      ];
    case 'arithmetic': {
      const left = asNumber(evaluate(expression.left, bindings), `the left side of a ${expression.operator}`);
      const right = asNumber(evaluate(expression.right, bindings), `the right side of a ${expression.operator}`);
      if (expression.operator === '+') return left + right;
      if (expression.operator === '-') return left - right;
      if (expression.operator === '*') return left * right;
      return left / right;
    }
    case 'compare':
      return compared(
        expression.operator,
        evaluate(expression.left, bindings),
        evaluate(expression.right, bindings)
      );
    case 'choice': {
      const when = evaluate(expression.when, bindings);
      if (typeof when !== 'boolean') throw new Error(`a choice is made on a true or false and was given ${nameOfKind(when)}`);
      return evaluate(when ? expression.then : expression.otherwise, bindings);
    }
    case 'path':
      return resolvePath(expression.of, bindings);
    case 'coords':
      return expression.of;
    case 'camera':
      return resolveCamera(expression.of, bindings);
    case 'call': {
      const callable = FUNCTIONS[expression.name];
      if (!callable) {
        throw new Error(`an expression names the function ${expression.name}, which the vocabulary does not carry`);
      }
      if (expression.arguments.length !== callable.takes) {
        throw new Error(
          `the function ${expression.name} takes ${callable.takes} arguments and was given ${expression.arguments.length}`
        );
      }
      return callable.of(
        expression.arguments.map((argument) => evaluate(argument, bindings)),
        expression.name
      );
    }
  }
}
