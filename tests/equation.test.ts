import { describe, expect, it } from 'vitest';
import { equationFromTex, equationMarks } from '@altpsyche/maths';
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
    const { marks } = equationMarks(tree);
    // Scaled by the outer group and moved by the inner one, then turned over,
    // so the top edge of the rectangle is the lower y.
    expect(marks[0]?.path[0]?.start).toEqual({ x: 6, y: -8 });
    expect(bounds(marks[0] as PathMark)).toEqual({ top: -8, bottom: -12 });
  });

  it('refuses a transform it does not apply and an element it does not draw', () => {
    expect(() => equationMarks(around(element('path', { d: 'M0 0' }), { transform: 'rotate(10)' }))).toThrow(
      /asks for "rotate", which this does not apply/
    );
    expect(() => equationMarks(around(element('use', { href: '#a' })))).toThrow(
      /holds a "use" element, which this does not draw/
    );
  });

  it('refuses an svg whose viewBox is not four numbers and a tree with no svg at all', () => {
    expect(() => equationMarks(element('svg', { viewBox: '0 -10 20' }, []))).toThrow(
      /viewBox="0 -10 20", which is not four numbers/
    );
    expect(() => equationMarks(element('div', {}, []))).toThrow(/returned no svg element/);
  });

  it('measures the expression into a box wider than one glyph and taller than none', async () => {
    const { box } = await equationFromTex('d = \\sqrt{x^2 + y^2} - r');
    expect(box.width).toBeGreaterThan(box.height);
    expect(box.height).toBeGreaterThan(0);
  });
});
