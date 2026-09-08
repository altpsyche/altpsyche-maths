import { describe, expect, it } from 'vitest';
import {
  flatten,
  resolveNode,
  sameMarks,
  vec2,
  vectorField,
  type ColourChoice,
  type Expression,
  type Mark,
  type NodeRecord,
} from '../index.js';
import { HAZE, STEEL } from '../demos/palette.js';
import { FIELD, FIELD_HEAD, FIELD_WIDTH, coords, sceneAt } from '../demos/tangent.js';

const gentle = HAZE;
const steep = STEEL;

/** The flat demo's own field marks, from its tree, with the figure's prefix taken
 * off so a record built alone compares against them. */
const theirs = (): readonly Mark[] =>
  flatten(sceneAt(0))
    .filter((mark) => mark.id === 'tangent/field' || mark.id.startsWith('tangent/field/'))
    .map((mark) => ({ ...mark, id: mark.id.slice('tangent/'.length) }));

/** The flat demo's slope field, `(1, 2x)` at a place, as an expression of `at`. */
const slopeField: Expression = {
  kind: 'point',
  x: 1,
  y: { kind: 'arithmetic', operator: '*', left: 2, right: { kind: 'member', of: { kind: 'variable', name: 'at' }, name: 'x' } },
};

/** The saturating length the demo sizes its arrows by, `0.34·m / (0.6 + m)`. */
const arrowLength: Expression = {
  kind: 'arithmetic',
  operator: '/',
  left: { kind: 'arithmetic', operator: '*', left: 0.34, right: { kind: 'variable', name: 'magnitude' } },
  right: { kind: 'arithmetic', operator: '+', left: 0.6, right: { kind: 'variable', name: 'magnitude' } },
};

const record = (colourFor: ColourChoice): NodeRecord => ({
  kind: 'vectorField',
  name: 'field',
  coords,
  of: slopeField,
  options: {
    resolution: FIELD,
    lengthOf: arrowLength,
    colourFor,
    width: FIELD_WIDTH,
    head: FIELD_HEAD,
  },
});

const bands = { kind: 'bands' as const, first: gentle, then: [{ above: 3, colour: steep }] };

describe('the field node as a record', () => {
  it('draws the flat demo slope field arrow for arrow', () => {
    const drawn = theirs();
    expect(drawn).toHaveLength(FIELD.x * FIELD.y * 2);
    expect(sameMarks(flatten(resolveNode(record(bands))), drawn)).toBe(true);
  });

  it('gives every arrow the colour the demo gives it', () => {
    const drawn = theirs();
    const mine = flatten(resolveNode(record(bands)));
    const colours = (marks: readonly Mark[]) =>
      marks.map((mark) => (mark.kind === 'path' ? (mark.fill?.colour ?? mark.stroke?.colour) : undefined));
    expect(colours(mine)).toEqual(colours(drawn));
    expect(new Set(colours(drawn))).toEqual(new Set([gentle, steep]));
  });

  it('draws the saturating length where the TypeScript draws it, at ten magnitudes', () => {
    const written = (magnitude: number) => (0.34 * magnitude) / (0.6 + magnitude);
    for (let step = 1; step <= 10; step++) {
      const magnitude = step * 1.3;
      const of = { kind: 'point' as const, x: magnitude, y: 0 };
      const options = { resolution: { x: 1, y: 1 }, colourFor: gentle, width: 0.02 };
      const mine = flatten(
        resolveNode({ kind: 'vectorField', name: 'one', coords, of, options: { ...options, lengthOf: arrowLength } })
      );
      const called = flatten(
        vectorField('one', coords, () => vec2(magnitude, 0), { ...options, lengthOf: written, colourFor: () => gentle })
      );
      expect(mine).toHaveLength(2);
      expect(sameMarks(mine, called)).toBe(true);
    }
  });

  it('takes a bare colour as a constant', () => {
    const flat = flatten(resolveNode(record(gentle)));
    const colours = new Set(flat.map((mark) => (mark.kind === 'path' ? (mark.fill?.colour ?? mark.stroke?.colour) : undefined)));
    expect(colours).toEqual(new Set([gentle]));
  });

  it('lets the last threshold a magnitude clears decide', () => {
    const three = {
      kind: 'bands' as const,
      first: gentle,
      then: [
        { above: 1, colour: steep },
        { above: 6, colour: gentle },
      ],
    };
    const at = (magnitude: number) => {
      const single: NodeRecord = {
        kind: 'vectorField',
        name: 'one',
        coords,
        of: { kind: 'point', x: magnitude, y: 0 },
        options: { resolution: { x: 1, y: 1 }, lengthOf: 0.2, colourFor: three, width: 0.02 },
      };
      const head = flatten(resolveNode(single)).find((mark) => mark.id.endsWith('/head'));
      return head && head.kind === 'path' ? head.fill?.colour : undefined;
    };
    expect(at(0.5)).toBe(gentle);
    expect(at(3)).toBe(steep);
    expect(at(9)).toBe(gentle);
  });

  it('follows a track through the field itself', () => {
    const turning: Expression = {
      kind: 'point',
      x: { kind: 'track', name: 'a' },
      y: 1,
    };
    const single = (a: number): readonly Mark[] => {
      const one: NodeRecord = {
        kind: 'vectorField',
        name: 'one',
        coords,
        of: turning,
        options: { resolution: { x: 1, y: 1 }, lengthOf: 0.3, colourFor: gentle, width: 0.02 },
      };
      return flatten(resolveNode(one, { tracks: { a: a } }));
    };
    expect(sameMarks(single(1), single(-1))).toBe(false);
  });

  it('refuses a field that reads as a number', () => {
    const one: NodeRecord = {
      kind: 'vectorField',
      name: 'one',
      coords,
      of: 3,
      options: { resolution: { x: 1, y: 1 }, lengthOf: 0.3, colourFor: gentle, width: 0.02 },
    };
    expect(() => flatten(resolveNode(one))).toThrow('a field is a point and was given a number');
  });
});
