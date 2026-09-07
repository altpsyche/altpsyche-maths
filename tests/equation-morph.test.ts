import { describe, expect, it } from 'vitest';
import { equationFromTex, equationNode, flatten, group, matchGlyphs, morphEquation, vec2 } from '@altpsyche/maths';
import type { Mark, PathMark } from '@altpsyche/maths';

/**
 * One typeset expression walked into another.
 *
 * The two expressions are the demo's own pair, so what these hold is the same
 * picture the flat demo draws: six glyphs stay put, one leaves and two arrive.
 */

const ink = { colour: '#1b1b1b' };
const box = { at: vec2(0, 0), width: 4, height: 1, fill: ink };

async function scene(): Promise<readonly Mark[]> {
  const from = await equationFromTex('\\frac{dy}{dx} = 0');
  const to = await equationFromTex('\\frac{dy}{dx} = 2x');
  return flatten(
    group('fig', [equationNode('from', from, box), equationNode('to', to, { ...box, at: vec2(2, 1) })])
  );
}

const morph = morphEquation('fig/from', 'fig/to');
const opacityOf = (marks: readonly Mark[], id: string) => marks.find((mark) => mark.id === id)?.opacity ?? 1;
const startOf = (marks: readonly Mark[], id: string) => (marks.find((mark) => mark.id === id) as PathMark).path[0].start;

describe('morphEquation', () => {
  it('holds the mark count still across the whole span', async () => {
    const marks = await scene();
    for (const along of [0, 0.25, 0.5, 0.75, 1]) expect(morph(marks, along)).toHaveLength(marks.length);
  });

  it('draws the expression it is leaving at the beginning', async () => {
    const marks = await scene();
    const at = morph(marks, 0);
    for (const mark of at.filter((each) => each.id.startsWith('fig/from/')))
      expect(mark.opacity ?? 1, mark.id).toBe(1);
    for (const mark of at.filter((each) => each.id.startsWith('fig/to/')))
      expect(mark.opacity ?? 1, mark.id).toBe(0);
  });

  it('draws the expression it is arriving at by the end', async () => {
    const marks = await scene();
    const { pairs, leaving, arriving } = matchGlyphs(
      marks.filter((mark) => mark.id.startsWith('fig/from/')),
      marks.filter((mark) => mark.id.startsWith('fig/to/'))
    );
    const at = morph(marks, 1);
    // The glyphs of the expression being left are the ones still drawn, and each
    // is standing exactly on the partner it walked to.
    for (const [left, right] of pairs) {
      expect(opacityOf(at, left.id), left.id).toBe(1);
      expect(opacityOf(at, right.id), right.id).toBe(0);
      expect(startOf(at, left.id).x).toBeCloseTo(right.path[0].start.x, 12);
      expect(startOf(at, left.id).y).toBeCloseTo(right.path[0].start.y, 12);
    }
    for (const mark of leaving) expect(opacityOf(at, mark.id), mark.id).toBe(0);
    for (const mark of arriving) expect(opacityOf(at, mark.id), mark.id).toBe(1);
  });

  it('walks a paired glyph half way over at half way through', async () => {
    const marks = await scene();
    const [[left, right]] = matchGlyphs(
      marks.filter((mark) => mark.id.startsWith('fig/from/')),
      marks.filter((mark) => mark.id.startsWith('fig/to/'))
    ).pairs;
    const half = startOf(morph(marks, 0.5), left.id);
    expect(half.x).toBeCloseTo((left.path[0].start.x + right.path[0].start.x) / 2, 12);
    expect(half.y).toBeCloseTo((left.path[0].start.y + right.path[0].start.y) / 2, 12);
  });

  it('draws a paired glyph once rather than as two copies at half opacity', async () => {
    // Cross-fading a pair would leave both of them drawn through the middle of
    // the span, which is a ghost of a letter rather than a letter.
    const marks = await scene();
    const at = morph(marks, 0.5);
    const shown = at.filter((mark) => (mark.opacity ?? 1) > 0 && (mark.opacity ?? 1) < 1);
    expect(shown.every((mark) => mark.id.startsWith('fig/from/6') || mark.id.startsWith('fig/to/'))).toBe(true);
    expect(at.filter((mark) => mark.id.startsWith('fig/to/') && (mark.opacity ?? 1) === 1)).toEqual([]);
  });

  it('multiplies the opacity a mark already has rather than setting one', async () => {
    // An expression still fading in when a morph starts must not jump to solid.
    const marks = (await scene()).map((mark) => ({ ...mark, opacity: 0.4 }));
    const at = morph(marks, 1);
    const arrived = at.find((mark) => mark.id === 'fig/to/7-1D465');
    expect(arrived?.opacity).toBeCloseTo(0.4, 12);
  });

  it('changes nothing when either name matches no mark', async () => {
    const marks = await scene();
    expect(morphEquation('fig/from', 'fig/nowhere')(marks, 0.5)).toEqual(marks);
    expect(morphEquation('fig/nowhere', 'fig/to')(marks, 0.5)).toEqual(marks);
  });
});
