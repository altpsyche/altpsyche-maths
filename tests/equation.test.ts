import { describe, expect, it } from 'vitest';
import { colourFrom, equationFromTex, equationNode, equationOf, flatten, hexOf, matchGlyphs, vec2 } from '@altpsyche/maths';
import type { EquationElement, PathMark } from '@altpsyche/maths';

/**
 * The walk from a typesetter's SVG into marks.
 *
 * The counts are MathJax 3.2.1's own, taken from these five expressions with
 * `fontCache: 'none'` and `AllPackages`. They hold the walk to a layout rather
 * than to a total: a version of the typesetter that lays an expression out
 * differently is a version that draws a different picture.
 */
const EXPRESSIONS = {
  'd = \\sqrt{x^2 + y^2} - r': { marks: 11, rules: 1 },
  '\\frac{a}{b} = \\sqrt{2}': { marks: 7, rules: 2 },
  '\\lVert v \\rVert = 1': { marks: 5, rules: 0 },
  'e^{i\\pi} + 1 = 0': { marks: 7, rules: 0 },
  '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}': { marks: 14, rules: 2 },
};

function bounds(mark: PathMark) {
  const points = mark.path.flatMap((subpath) => [
    subpath.start,
    ...subpath.curves.flatMap((curve) => [curve.control1, curve.control2, curve.to]),
  ]);
  return {
    top: Math.max(...points.map((point) => point.y)),
    bottom: Math.min(...points.map((point) => point.y)),
  };
}

const element = (
  tag: string,
  attributes: Record<string, string> = {},
  children: EquationElement[] = [],
  text?: string
): EquationElement => ({ tag, attributes, children, text });

const around = (child: EquationElement, attributes: Record<string, string> = {}) =>
  element('svg', { viewBox: '0 -10 20 20' }, [element('g', attributes, [child])]);

describe('the walk into marks', () => {
  it('reads each expression as its own count of marks', async () => {
    for (const [tex, expected] of Object.entries(EXPRESSIONS)) {
      const { marks } = await equationFromTex(tex);
      expect(marks, tex).toHaveLength(expected.marks);
      expect(
        marks.filter((mark) => mark.id.endsWith('-rule')),
        `${tex} rules`
      ).toHaveLength(expected.rules);

      // The colour arrives when the equation is placed, not here.
      expect(marks.every((mark) => mark.fill === undefined)).toBe(true);
      expect(new Set(marks.map((mark) => mark.id)).size, `${tex} ids`).toBe(marks.length);
    }
  });

  it('turns the typesetter over, so a numerator sits above the baseline', async () => {
    const { marks, box } = await equationFromTex('\\frac{a}{b} = \\sqrt{2}');
    const [numerator, denominator] = marks;
    expect(numerator && bounds(numerator).bottom).toBeGreaterThan(0);
    expect(denominator && bounds(denominator).bottom).toBeLessThan(0);
    // The baseline is inside the box the typesetter measured, which is what
    // says the box was turned over with the marks and not left as it was.
    expect(box.y).toBeLessThan(0);
    expect(box.y + box.height).toBeGreaterThan(0);
  });

  it('names a glyph by its place and the code point the typesetter wrote on it', async () => {
    const { marks } = await equationFromTex('x');
    expect(marks[0]?.id).toBe('0-1D465');
  });

  it('applies a nested transform into the geometry', () => {
    const tree = around(
      element('g', { transform: 'translate(3,4)' }, [element('rect', { x: '0', y: '0', width: '2', height: '2' })]),
      { transform: 'scale(2,2)' }
    );
    const { marks } = equationOf(tree);
    // Scaled by the outer group and moved by the inner one, then turned over,
    // so the top edge of the rectangle is the lower y.
    expect(marks[0]?.path[0]?.start).toEqual({ x: 6, y: -8 });
    expect(bounds(marks[0] as PathMark)).toEqual({ top: -8, bottom: -12 });
  });

  it('refuses a transform it does not apply and an element it does not draw', () => {
    expect(() => equationOf(around(element('path', { d: 'M0 0' }), { transform: 'rotate(10)' }))).toThrow(
      /asks for "rotate", which this does not apply/
    );
    expect(() => equationOf(around(element('use', { href: '#a' })))).toThrow(
      /holds a "use" element, which this does not draw/
    );
  });

  it('refuses an svg whose viewBox is not four numbers and a tree with no svg at all', () => {
    expect(() => equationOf(element('svg', { viewBox: '0 -10 20' }, []))).toThrow(
      /viewBox="0 -10 20", which is not four numbers/
    );
    expect(() => equationOf(element('div', {}, []))).toThrow(/returned no svg element/);
  });

  it('measures the expression into a box wider than one glyph and taller than none', async () => {
    const { box } = await equationFromTex('d = \\sqrt{x^2 + y^2} - r');
    expect(box.width).toBeGreaterThan(box.height);
    expect(box.height).toBeGreaterThan(0);
  });
});

describe('the three refusals', () => {
  it('refuses a TeX error with the message the typesetter gave', async () => {
    await expect(equationFromTex('\\frac{1}')).rejects.toThrow(
      /refused the expression: Missing argument for \\frac/
    );
    await expect(equationFromTex('x^')).rejects.toThrow(
      /refused the expression: Missing superscript or subscript argument/
    );
  });

  it('refuses a macro the typesetter drew in red rather than typeset', async () => {
    // Under `AllPackages` this is not an error at all: `noundefined` draws the
    // macro's own name, so the picture would otherwise ship with a red word in it.
    await expect(equationFromTex('\\nosuchmacro')).rejects.toThrow(
      /does not know "\\nosuchmacro" and drew it in red/
    );
  });

  it('refuses a character the font has no outline for', async () => {
    // It would draw in a browser with whatever font it found and draw nothing
    // at all in a recording.
    await expect(equationFromTex('\\mbox{ü}')).rejects.toThrow(/has no outline for "ü"/);
  });

  it('still draws every expression that typesets', async () => {
    for (const tex of Object.keys(EXPRESSIONS)) await expect(equationFromTex(tex)).resolves.toBeDefined();
  });
});

describe('an equation placed in a figure', () => {
  const placed = async (tex: string, width: number, height: number) => {
    const marks = flatten(
      equationNode('label', await equationFromTex(tex), {
        at: vec2(1, 2),
        width,
        height,
        fill: { colour: colourFrom('#1b1b1b') },
      })
    );
    const points = marks.flatMap((mark) =>
      mark.kind === 'path'
        ? mark.path.flatMap((subpath) => [
            subpath.start,
            ...subpath.curves.flatMap((curve) => [curve.control1, curve.control2, curve.to]),
          ])
        : [mark.at]
    );
    return {
      marks,
      left: Math.min(...points.map((point) => point.x)),
      right: Math.max(...points.map((point) => point.x)),
      bottom: Math.min(...points.map((point) => point.y)),
      top: Math.max(...points.map((point) => point.y)),
    };
  };

  it('fits inside the width as well as the height', async () => {
    // Sized by the height alone, an expression this much wider than it is tall
    // runs off both sides of the box it was asked into.
    const { left, right, bottom, top } = await placed('d = \\sqrt{x^2 + y^2} - r', 2, 2);
    expect(right - left).toBeLessThanOrEqual(2);
    expect(top - bottom).toBeLessThanOrEqual(2);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(2);
  });

  it('centres the box the typesetter measured on the point it was given', async () => {
    const { left, right, bottom, top } = await placed('\\frac{a}{b} = \\sqrt{2}', 4, 1);
    // The glyphs sit inside the measured box rather than filling it, so the
    // centre is checked against the box and the tolerance is the ink's own gap.
    expect((left + right) / 2).toBeCloseTo(1, 1);
    expect((bottom + top) / 2).toBeCloseTo(2, 1);
  });

  it('gives every glyph its own name and the colour it is drawn in', async () => {
    const { marks } = await placed('x + 1', 4, 1);
    expect(marks.length).toBeGreaterThan(0);
    expect(marks.every((mark) => mark.id.startsWith('label/'))).toBe(true);
    expect(new Set(marks.map((mark) => mark.id)).size).toBe(marks.length);
    expect(marks.every((mark) => mark.kind === 'path' && hexOf(mark.fill!.colour) === '#1b1b1b')).toBe(true);
  });

  it('moves as one matrix rather than as moved geometry', async () => {
    // The glyphs keep the typesetter's own numbers, so the same equation placed
    // twice differs by the group's transform and by nothing else.
    const equation = await equationFromTex('x');
    const here = equationNode('a', equation, { at: vec2(0, 0), width: 1, height: 1, fill: { colour: colourFrom('#ff0000') } });
    const there = equationNode('a', equation, { at: vec2(5, 5), width: 1, height: 1, fill: { colour: colourFrom('#ff0000') } });
    expect(here.children).toEqual(there.children);
    expect(here.transform).not.toEqual(there.transform);
  });
});

describe('an equation placed by an edge', () => {
  const edges = async (tex: string, align?: 'start' | 'middle' | 'end') => {
    const marks = flatten(
      equationNode('label', await equationFromTex(tex), {
        at: vec2(3, 2),
        width: 1.2,
        height: 0.6,
        align,
        fill: { colour: colourFrom('#1b1b1b') },
      })
    );
    const points = marks.flatMap((mark) =>
      mark.kind === 'path'
        ? mark.path.flatMap((subpath) => [subpath.start, ...subpath.curves.map((curve) => curve.to)])
        : [mark.at]
    );
    return { marks, left: Math.min(...points.map((point) => point.x)), right: Math.max(...points.map((point) => point.x)) };
  };

  it('puts the edge it was given on the point it was given', async () => {
    // The box the typesetter measured is what is placed and the ink sits inside it,
    // so the three are compared against each other at half the drawn width apart.
    const box = (await equationFromTex('\\frac{dy}{dx} = 2x')).box;
    const drawn = box.width * Math.min(1.2 / box.width, 0.6 / box.height);
    const start = await edges('\\frac{dy}{dx} = 2x', 'start');
    const middle = await edges('\\frac{dy}{dx} = 2x', 'middle');
    const end = await edges('\\frac{dy}{dx} = 2x', 'end');
    expect(start.left - middle.left).toBeCloseTo(drawn / 2, 12);
    expect(middle.left - end.left).toBeCloseTo(drawn / 2, 12);
    expect(start.right - start.left).toBeCloseTo(middle.right - middle.left, 12);
    // The ink of the left-hung one begins inside the point rather than on it,
    // which is the side bearing the typesetter measured into its box.
    expect(start.left - 3).toBeGreaterThan(0);
    expect(start.left - 3).toBeLessThan(drawn / 10);
  });

  it('is centred when no edge is named, which is what it always did', async () => {
    const named = await edges('\\frac{dy}{dx} = 2x', 'middle');
    const unnamed = await edges('\\frac{dy}{dx} = 2x');
    expect(unnamed.left).toBeCloseTo(named.left, 12);
    expect(unnamed.right).toBeCloseTo(named.right, 12);
  });

  it('keeps the shared glyphs of two expressions still when both are placed by their start', async () => {
    // Centred, the part the two share slides sideways as the difference
    // arrives, which is the one thing a morph promises not to do.
    const shifted = async (align?: 'start' | 'middle' | 'end') => {
      const from = flatten(
        equationNode('a', await equationFromTex('\\frac{dy}{dx} = 0'), {
          at: vec2(0, 0), width: 1.2, height: 0.6, align, fill: { colour: colourFrom('#ff0000') },
        })
      );
      const to = flatten(
        equationNode('b', await equationFromTex('\\frac{dy}{dx} = 2x'), {
          at: vec2(0, 0), width: 1.2, height: 0.6, align, fill: { colour: colourFrom('#ff0000') },
        })
      );
      const pairs = matchGlyphs(from, to).pairs;
      return Math.max(...pairs.map(([left, right]) => Math.abs(left.path[0].start.x - right.path[0].start.x)));
    };
    expect(await shifted('start')).toBeLessThan(1e-12);
    expect(await shifted('middle')).toBeCloseTo(0.083, 3);
  });
});
