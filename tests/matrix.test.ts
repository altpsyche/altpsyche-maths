import { describe, expect, it } from 'vitest';
import { boundsOfMarks, colourFrom, flatten, matrix, vec2 } from '@altpsyche/maths';
import type { Mark, PathMark, TextMark } from '@altpsyche/maths';

/**
 * A matrix as the flat list a painter and an animation both see, since what the
 * version is for is a name that reaches one entry.
 */

const pen = { colour: colourFrom('#fff'), width: 0.1 };
const ink = { colour: colourFrom('#fff') };
const ids = (marks: readonly Mark[]) => marks.map((mark) => mark.id);
const words = (marks: readonly Mark[]) => marks.filter((m): m is TextMark => m.kind === 'text');
const paths = (marks: readonly Mark[]) => marks.filter((m): m is PathMark => m.kind === 'path');
const options = { at: vec2(0, 0), width: 10, height: 8, size: 1, fill: ink, stroke: pen };

describe('matrix', () => {
  const built = flatten(matrix('m', [['a', 'b'], ['c', 'd']], options));

  it('is two brackets and one mark for every entry', () => {
    expect(built).toHaveLength(6);
    expect(paths(built)).toHaveLength(2);
    expect(words(built)).toHaveLength(4);
  });

  it('names every entry by its row and its place along it', () => {
    expect(ids(built)).toEqual(['m/left', 'm/right', 'm/rows/0/0', 'm/rows/0/1', 'm/rows/1/0', 'm/rows/1/1']);
  });

  it('fills the box it is given, which is the two brackets', () => {
    const box = boundsOfMarks(paths(built));
    expect(box).not.toBeNull();
    expect(box?.x).toEqual({ from: -5, to: 5 });
    expect(box?.y).toEqual({ from: -4, to: 4 });
  });

  it('reads the rows down the page and the entries across it', () => {
    const [first, second] = words(built);
    expect(first.text).toBe('a');
    expect(second.text).toBe('b');
    expect(second.at.x).toBeGreaterThan(first.at.x);
    expect(words(built)[2].at.y).toBeLessThan(first.at.y);
  });

  it('centres each entry in a cell that is a share of the box inside the padding', () => {
    const built = flatten(matrix('m', [['a', 'b', 'c'], ['d', 'e', 'f']], { ...options, padding: 1 }));
    const pitch = vec2((10 - 2) / 3, (8 - 2) / 2);
    for (const [down, row] of [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]].entries()) {
      const at = words(built)[down].at;
      expect(at.x).toBeCloseTo(-5 + 1 + (row[1] + 0.5) * pitch.x, 12);
      expect(at.y).toBeCloseTo(4 - 1 - (row[0] + 0.5) * pitch.y, 12);
    }
  });

  it('draws each bracket as three straight pieces with its arms pointing in', () => {
    const [left, right] = paths(built);
    expect(left.path[0].curves).toHaveLength(3);
    expect(left.path[0].start).toEqual({ x: -5 + 0.8, y: 4 });
    expect(right.path[0].start).toEqual({ x: 5 - 0.8, y: 4 });
  });

  it('takes a tenth of the shorter side as its padding and the same again as its arms', () => {
    const tall = flatten(matrix('m', [['a']], { ...options, width: 4, height: 20 }));
    expect(paths(tall)[0].path[0].start.x).toBeCloseTo(-2 + 0.4, 12);
  });

  it('refuses rows of different lengths, which have no grid to lay out', () => {
    expect(() => matrix('m', [['a', 'b'], ['c']], options)).toThrow('row 1 carries 1 entries and row 0 carries 2');
  });

  it('refuses a matrix with no entries in it', () => {
    expect(() => matrix('m', [], options)).toThrow('at least one entry');
    expect(() => matrix('m', [[]], options)).toThrow('at least one entry');
  });
});
