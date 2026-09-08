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
 * What it refuses is a map this vocabulary cannot spell. A complex square, a
 * complex exponential and a Möbius map are all here, since each is arithmetic
 * over the two members of a point. Anything else is refused rather than drawn,
 * and that refusal is the price of the format being closed.
 */
import { clamp, inverseLerp, lerp, remap } from '../values/scalar.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import type { TrackValue } from '../timing/track.js';

/** What an expression evaluates to. A list-valued track has no place here, since
 * the vocabulary has no list. */
export type ExpressionValue = number | boolean | Vec2;

/** A number or a place the expression is evaluated for: the x of a curve, the
 * place a field is read at, the two numbers of a surface. */
export type Variables = Record<string, ExpressionValue>;

/** What the names in an expression stand for, which is what makes the same tree
 * answer at one time and at another. */
export interface Bindings {
  /** The tracks' own values at the time being drawn. */
  readonly tracks?: Record<string, TrackValue>;
  readonly variables?: Variables;
}

export type Arithmetic = '+' | '-' | '*' | '/';
export type Comparison = '<' | '<=' | '>' | '>=' | '=' | '!=';

/**
 * One node of the tree.
 *
 * A bare number or boolean is a literal, which keeps the common case one value
 * rather than a record wrapping one value.
 */
export type Expression =
  | number
  | boolean
  | { readonly kind: 'track'; readonly name: string }
  | { readonly kind: 'variable'; readonly name: string }
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
  | { readonly kind: 'call'; readonly name: string; readonly arguments: readonly Expression[] };

/** A place rather than a number, told apart by carrying both members. */
function isPoint(value: ExpressionValue): value is Vec2 {
  return typeof value === 'object';
}

function asNumber(value: ExpressionValue, what: string): number {
  if (typeof value !== 'number') throw new Error(`${what} is a number and was given ${nameOfKind(value)}`);
  return value;
}

function asPoint(value: ExpressionValue, what: string): Vec2 {
  if (!isPoint(value)) throw new Error(`${what} is a point and was given ${nameOfKind(value)}`);
  return value;
}

function nameOfKind(value: ExpressionValue): string {
  if (typeof value === 'number') return 'a number';
  if (typeof value === 'boolean') return 'a true or false';
  return 'a point';
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
