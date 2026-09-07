import { describe, expect, it } from 'vitest';
import { equationFromTex, glyphToken, matchGlyphs } from '@altpsyche/maths';
import type { Mark, PathMark } from '@altpsyche/maths';

/**
 * Which glyph of one expression is which glyph of the other.
 *
 * The pairing is the longest common subsequence of the two token sequences, so
 * what these hold it to is that the shared run is found in order and that a
 * repeated glyph pairs each of its occurrences once.
 */

const glyph = (id: string): PathMark => ({ kind: 'path', id, path: [] });
const row = (...ids: string[]): Mark[] => ids.map(glyph);
const tokens = (marks: readonly PathMark[]) => marks.map((mark) => glyphToken(mark.id));

describe('glyphToken', () => {
  it('is the leaf name after its first dash', () => {
    expect(glyphToken('3-1D465')).toBe('1D465');
    expect(glyphToken('tangent/equation/4-rule')).toBe('rule');
  });

  it('is nothing for a mark a typesetter did not name', () => {
    // Otherwise every mark with no dash would pair with every other one.
    expect(glyphToken('tangent/curve')).toBeUndefined();
    expect(glyphToken('point')).toBeUndefined();
  });
});

describe('matchGlyphs', () => {
  it('pairs the shared run of two expressions and keeps the difference apart', async () => {
    const from = await equationFromTex('\\frac{dy}{dx} = 0');
    const to = await equationFromTex('\\frac{dy}{dx} = 2x');
    const { pairs, leaving, arriving } = matchGlyphs(from.marks, to.marks);
    expect(pairs).toHaveLength(6);
    expect(pairs.map(([left]) => glyphToken(left.id))).toEqual(['1D451', '1D466', '1D451', '1D465', 'rule', '3D']);
    expect(pairs.every(([left, right]) => glyphToken(left.id) === glyphToken(right.id))).toBe(true);
    expect(tokens(leaving)).toEqual(['30']);
    expect(tokens(arriving)).toEqual(['32', '1D465']);
  });

  it('pairs an expression with itself and leaves nothing over', async () => {
    const { marks } = await equationFromTex('e^{i\\pi} + 1 = 0');
    const { pairs, leaving, arriving } = matchGlyphs(marks, marks);
    expect(pairs).toHaveLength(marks.length);
    expect(leaving).toEqual([]);
    expect(arriving).toEqual([]);
  });

  it('pairs nothing when the two share no token', () => {
    const { pairs, leaving, arriving } = matchGlyphs(row('0-41', '1-42'), row('0-63', '1-64'));
    expect(pairs).toEqual([]);
    expect(leaving).toHaveLength(2);
    expect(arriving).toHaveLength(2);
  });

  it('pairs each occurrence of a repeated glyph once', () => {
    // Pairing both x of the left to the one x of the right would leave a glyph
    // walking to a place another glyph is already walking to.
    const { pairs, leaving, arriving } = matchGlyphs(row('0-1D465', '1-2B', '2-1D465'), row('0-1D465'));
    expect(pairs).toHaveLength(1);
    expect(pairs[0][0].id).toBe('0-1D465');
    expect(tokens(leaving)).toEqual(['2B', '1D465']);
    expect(arriving).toEqual([]);
  });

  it('matches in order, so the run a move breaks is not a run', () => {
    // The two hold the same three tokens and share the two that kept their
    // order. Pairing the third as well would cross another pair on the way over.
    const { pairs, leaving, arriving } = matchGlyphs(row('0-61', '1-62', '2-63'), row('0-63', '1-61', '2-62'));
    expect(tokens(pairs.map(([left]) => left))).toEqual(['61', '62']);
    expect(tokens(leaving)).toEqual(['63']);
    expect(tokens(arriving)).toEqual(['63']);
  });

  it('leaves out a mark that is not a path, since a glyph is an outline', () => {
    const marks: Mark[] = [
      glyph('0-1D465'),
      { kind: 'text', id: '1-label', at: { x: 0, y: 0 }, text: 'x', size: 1, family: 'sans-serif', fill: { colour: 'red' } },
    ];
    const { pairs, leaving } = matchGlyphs(marks, row('0-1D465'));
    expect(pairs).toHaveLength(1);
    expect(leaving).toEqual([]);
  });
});
