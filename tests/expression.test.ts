import { describe, expect, it } from 'vitest';
import { EXPRESSION_FUNCTIONS, clamp, evaluate, inverseLerp, lerp, remap, vec2, type Expression, type Vec2 } from '../index.js';

/** Ten inputs every numeric form is read at, spread over both signs and past
 * one, so a form that is right at nothing and at one is not called right. */
const TEN = [-2.5, -1, -0.4, 0, 0.25, 0.5, 0.75, 1, 1.6, 3.2];

/** Ten places every form over a point is read at, none of them on an axis but
 * two, since a map that is wrong about a sign is right at the origin. */
const PLACES: readonly Vec2[] = [
  vec2(1, 0),
  vec2(0, 1),
  vec2(1, 1),
  vec2(-1, 0.5),
  vec2(0.5, -1),
  vec2(-0.75, -0.75),
  vec2(2, 0.25),
  vec2(0.25, 2),
  vec2(-2, 1.5),
  vec2(3, -0.5),
];

const literal = (value: number): Expression => value;
const of = (name: string, ...args: Expression[]): Expression => ({ kind: 'call', name, arguments: args });
const at = (name: string): Expression => ({ kind: 'variable', name });

describe('an expression over numbers', () => {
  it('is its own value where it is a literal', () => {
    for (const value of TEN) expect(evaluate(value)).toBe(value);
    expect(evaluate(true)).toBe(true);
  });

  it('reads a bare point as a literal place, told from the record forms by carrying no kind', () => {
    expect(evaluate(vec2(2, -1))).toEqual({ x: 2, y: -1 });
    expect(evaluate({ kind: 'member', of: vec2(2, -1), name: 'y' })).toBe(-1);
  });

  it('reads a track at the time it was sampled for', () => {
    expect(evaluate({ kind: 'track', name: 's' }, { tracks: { s: 0.4 } })).toBe(0.4);
  });

  it('names the track it cannot find', () => {
    expect(() => evaluate({ kind: 'track', name: 'turn' }, { tracks: { s: 1 } })).toThrow(/the track turn/);
  });

  it('names a track whose value is a list, which it has no form for', () => {
    expect(() => evaluate({ kind: 'track', name: 'corners' }, { tracks: { corners: [1, 2] } })).toThrow(
      /the track corners/
    );
  });

  it('names the variable it cannot find', () => {
    expect(() => evaluate(at('u'), { variables: { x: 1 } })).toThrow(/reads u/);
  });

  it('does the four operations the TypeScript does', () => {
    for (const left of TEN) {
      for (const right of TEN) {
        const both = { left: literal(left), right: literal(right) } as const;
        expect(evaluate({ kind: 'arithmetic', operator: '+', ...both })).toBe(left + right);
        expect(evaluate({ kind: 'arithmetic', operator: '-', ...both })).toBe(left - right);
        expect(evaluate({ kind: 'arithmetic', operator: '*', ...both })).toBe(left * right);
        expect(evaluate({ kind: 'arithmetic', operator: '/', ...both })).toBe(left / right);
      }
    }
  });

  it('leaves a division by nothing as the infinity the arithmetic gives', () => {
    expect(evaluate({ kind: 'arithmetic', operator: '/', left: 1, right: 0 })).toBe(Infinity);
  });

  it('compares the way the TypeScript compares', () => {
    for (const left of TEN) {
      for (const right of TEN) {
        const both = { left: literal(left), right: literal(right) } as const;
        expect(evaluate({ kind: 'compare', operator: '<', ...both })).toBe(left < right);
        expect(evaluate({ kind: 'compare', operator: '<=', ...both })).toBe(left <= right);
        expect(evaluate({ kind: 'compare', operator: '>', ...both })).toBe(left > right);
        expect(evaluate({ kind: 'compare', operator: '>=', ...both })).toBe(left >= right);
        expect(evaluate({ kind: 'compare', operator: '=', ...both })).toBe(left === right);
        expect(evaluate({ kind: 'compare', operator: '!=', ...both })).toBe(left !== right);
      }
    }
  });

  it('tells one place from another', () => {
    const point = (value: Vec2): Expression => ({ kind: 'point', x: value.x, y: value.y });
    expect(evaluate({ kind: 'compare', operator: '=', left: point(vec2(1, 2)), right: point(vec2(1, 2)) })).toBe(true);
    expect(evaluate({ kind: 'compare', operator: '!=', left: point(vec2(1, 2)), right: point(vec2(1, 3)) })).toBe(true);
  });

  it('takes one side of a choice and leaves the other', () => {
    const choice = (value: number): Expression => ({
      kind: 'choice',
      when: { kind: 'compare', operator: '>', left: value, right: 3 },
      then: 10,
      otherwise: 20,
    });
    for (const value of TEN) expect(evaluate(choice(value))).toBe(value > 3 ? 10 : 20);
  });

  it('refuses a choice made on a number', () => {
    expect(() => evaluate({ kind: 'choice', when: 1, then: 2, otherwise: 3 })).toThrow(/a number/);
  });
});

describe('the functions an expression may name', () => {
  /** What each name does in TypeScript, which is what the evaluator is read
   * against. A name here and not in the vocabulary, or the other way round, is
   * what the last test in this block catches. */
  const wanted: Record<string, { args: (input: number, place: Vec2) => Expression[]; of: (input: number, place: Vec2) => unknown }> =
    {
      abs: { args: (input) => [input], of: (input) => Math.abs(input) },
      sign: { args: (input) => [input], of: (input) => Math.sign(input) },
      floor: { args: (input) => [input], of: (input) => Math.floor(input) },
      round: { args: (input) => [input], of: (input) => Math.round(input) },
      sqrt: { args: (input) => [Math.abs(input)], of: (input) => Math.sqrt(Math.abs(input)) },
      exp: { args: (input) => [input], of: (input) => Math.exp(input) },
      log: { args: (input) => [Math.abs(input) + 1], of: (input) => Math.log(Math.abs(input) + 1) },
      sin: { args: (input) => [input], of: (input) => Math.sin(input) },
      cos: { args: (input) => [input], of: (input) => Math.cos(input) },
      tan: { args: (input) => [input], of: (input) => Math.tan(input) },
      asin: { args: (input) => [input / 4], of: (input) => Math.asin(input / 4) },
      acos: { args: (input) => [input / 4], of: (input) => Math.acos(input / 4) },
      atan: { args: (input) => [input], of: (input) => Math.atan(input) },
      pow: { args: (input) => [Math.abs(input) + 1, 2], of: (input) => Math.pow(Math.abs(input) + 1, 2) },
      atan2: { args: (input) => [input, 2], of: (input) => Math.atan2(input, 2) },
      min: { args: (input) => [input, 0.5], of: (input) => Math.min(input, 0.5) },
      max: { args: (input) => [input, 0.5], of: (input) => Math.max(input, 0.5) },
      hypot: { args: (input) => [input, 2], of: (input) => Math.hypot(input, 2) },
      clamp: { args: (input) => [input, 0, 1], of: (input) => clamp(input, 0, 1) },
      inverseLerp: { args: (input) => [0, 2, input], of: (input) => inverseLerp(0, 2, input) },
      remap: { args: (input) => [input, 0, 1, -4, 4], of: (input) => remap(input, 0, 1, -4, 4) },
      lerp: { args: (input) => [-1, 3, input], of: (input) => lerp(-1, 3, input) },
      add: { args: (input, place) => [point(place), point(vec2(input, 1))], of: (input, place) => vec2.add(place, vec2(input, 1)) },
      subtract: {
        args: (input, place) => [point(place), point(vec2(input, 1))],
        of: (input, place) => vec2.sub(place, vec2(input, 1)),
      },
      dot: { args: (input, place) => [point(place), point(vec2(input, 1))], of: (input, place) => vec2.dot(place, vec2(input, 1)) },
      cross: {
        args: (input, place) => [point(place), point(vec2(input, 1))],
        of: (input, place) => vec2.cross(place, vec2(input, 1)),
      },
      distance: {
        args: (input, place) => [point(place), point(vec2(input, 1))],
        of: (input, place) => vec2.distance(place, vec2(input, 1)),
      },
      magnitude: { args: (_input, place) => [point(place)], of: (_input, place) => vec2.magnitude(place) },
      normalize: { args: (_input, place) => [point(place)], of: (_input, place) => vec2.normalize(place) },
      perpendicular: { args: (_input, place) => [point(place)], of: (_input, place) => vec2.perpendicular(place) },
      angle: { args: (_input, place) => [point(place)], of: (_input, place) => vec2.angle(place) },
      scale: { args: (input, place) => [point(place), input], of: (input, place) => vec2.scale(place, input) },
      rotate: { args: (input, place) => [point(place), input], of: (input, place) => vec2.rotate(place, input) },
    };

  function point(value: Vec2): Expression {
    return { kind: 'point', x: value.x, y: value.y };
  }

  it('each answer what the TypeScript answers, at ten inputs', () => {
    for (const [name, form] of Object.entries(wanted)) {
      for (let step = 0; step < TEN.length; step += 1) {
        const input = TEN[step];
        const place = PLACES[step];
        expect(evaluate(of(name, ...form.args(input, place))), `${name} at ${input}`).toEqual(form.of(input, place));
      }
    }
  });

  it('are the published set and nothing besides', () => {
    expect(EXPRESSION_FUNCTIONS).toEqual(Object.keys(wanted).sort());
  });

  it('names a function it does not carry', () => {
    expect(() => evaluate(of('bezier', 1))).toThrow(
      'an expression names the function bezier, which the vocabulary does not carry'
    );
  });

  it('names the count a function was given the wrong number of', () => {
    expect(() => evaluate(of('clamp', 1, 2))).toThrow('the function clamp takes 3 arguments and was given 2');
  });

  it('names an argument given a place where a number belongs', () => {
    expect(() => evaluate(of('sqrt', point(vec2(1, 1))))).toThrow(/the argument of sqrt is a number/);
  });
});

describe('an expression over a point', () => {
  const place = at('p');
  const x: Expression = { kind: 'member', of: place, name: 'x' };
  const y: Expression = { kind: 'member', of: place, name: 'y' };
  const times = (left: Expression, right: Expression): Expression => ({ kind: 'arithmetic', operator: '*', left, right });
  const plus = (left: Expression, right: Expression): Expression => ({ kind: 'arithmetic', operator: '+', left, right });
  const minus = (left: Expression, right: Expression): Expression => ({ kind: 'arithmetic', operator: '-', left, right });
  const over = (left: Expression, right: Expression): Expression => ({ kind: 'arithmetic', operator: '/', left, right });

  it('squares a complex number at ten places', () => {
    const squared: Expression = {
      kind: 'point',
      x: minus(times(x, x), times(y, y)),
      y: times(2, times(x, y)),
    };
    for (const p of PLACES) {
      expect(evaluate(squared, { variables: { p } })).toEqual(vec2(p.x * p.x - p.y * p.y, 2 * p.x * p.y));
    }
  });

  it('raises e to a complex number at ten places', () => {
    const exponential: Expression = {
      kind: 'point',
      x: times(of('exp', x), of('cos', y)),
      y: times(of('exp', x), of('sin', y)),
    };
    for (const p of PLACES) {
      const scale = Math.exp(p.x);
      const wanted = vec2(scale * Math.cos(p.y), scale * Math.sin(p.y));
      const read = evaluate(exponential, { variables: { p } }) as Vec2;
      expect(read.x).toBeCloseTo(wanted.x, 12);
      expect(read.y).toBeCloseTo(wanted.y, 12);
    }
  });

  it('carries a Möbius map at ten places', () => {
    // (z + 1) / (z - 1), written out as the real and imaginary parts of the
    // quotient, since the vocabulary has arithmetic and not complex division.
    const topX = plus(x, 1);
    const topY = y;
    const footX = minus(x, 1);
    const footY = y;
    const square = plus(times(footX, footX), times(footY, footY));
    const mobius: Expression = {
      kind: 'point',
      x: over(plus(times(topX, footX), times(topY, footY)), square),
      y: over(minus(times(topY, footX), times(topX, footY)), square),
    };
    for (const p of PLACES) {
      if (p.x === 1 && p.y === 0) continue;
      const denominator = (p.x - 1) * (p.x - 1) + p.y * p.y;
      const wanted = vec2(
        ((p.x + 1) * (p.x - 1) + p.y * p.y) / denominator,
        (p.y * (p.x - 1) - (p.x + 1) * p.y) / denominator
      );
      const read = evaluate(mobius, { variables: { p } }) as Vec2;
      expect(read.x).toBeCloseTo(wanted.x, 12);
      expect(read.y).toBeCloseTo(wanted.y, 12);
    }
  });
});

describe('the option forms the demos pass', () => {
  it('is the saturating length the two demos give their field arrows', () => {
    // 0.34 m / (0.6 + m), which both demos use with a softness of their own.
    const magnitude = at('m');
    const form: Expression = {
      kind: 'arithmetic',
      operator: '/',
      left: { kind: 'arithmetic', operator: '*', left: 0.34, right: magnitude },
      right: { kind: 'arithmetic', operator: '+', left: 0.6, right: magnitude },
    };
    for (const m of [0, 0.25, 0.5, 1, 1.5, 2, 3, 4.5, 6, 9]) {
      expect(evaluate(form, { variables: { m } })).toBeCloseTo((0.34 * m) / (0.6 + m), 12);
    }
  });

  it('is the threshold the flat demo colours its field by', () => {
    const magnitude = at('m');
    const form: Expression = {
      kind: 'choice',
      when: { kind: 'compare', operator: '>', left: magnitude, right: 3 },
      then: 1,
      otherwise: 0,
    };
    for (const m of [0, 0.25, 0.5, 1, 1.5, 2, 3, 4.5, 6, 9]) {
      expect(evaluate(form, { variables: { m } })).toBe(m > 3 ? 1 : 0);
    }
  });
});
