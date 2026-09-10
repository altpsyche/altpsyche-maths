import { describe, expect, it } from 'vitest';
import { boundsOfMarks, colourFrom, flatten, table, vec2 } from '@altpsyche/maths';
import type { Mark, PathMark, TextMark } from '@altpsyche/maths';

/**
 * A table as the flat list a painter sees, which is where the rules and the
 * cells are one list and their order is the order they are drawn in.
 */

const pen = { colour: colourFrom('#fff'), width: 0.1 };
const ink = { colour: colourFrom('#fff') };
const ids = (marks: readonly Mark[]) => marks.map((mark) => mark.id);
const words = (marks: readonly Mark[]) => marks.filter((m): m is TextMark => m.kind === 'text');
const paths = (marks: readonly Mark[]) => marks.filter((m): m is PathMark => m.kind === 'path');
const cells = [
  ['a', 'b', 'c'],
  ['d', 'e', 'f'],
  ['g', 'h', 'i'],
];
const options = {
  at: vec2(0, 0),
  columns: [2, 3, 5],
  rowHeight: 2,
  size: 1,
  fill: ink,
  stroke: pen,
};

describe('table', () => {
  const built = flatten(table('t', cells, { ...options, header: true }));

  it('is a cell for every entry, a rule at every boundary, and the header in place of one', () => {
    expect(built).toHaveLength(13);
    expect(paths(built)).toHaveLength(4);
    expect(words(built)).toHaveLength(9);
  });

  it('draws the rules before the cells, so a word crossing one is what a reader sees', () => {
    expect(ids(built).slice(0, 4)).toEqual(['t/rules/rows/1', 't/rules/columns/0', 't/rules/columns/1', 't/header']);
    expect(ids(built)[4]).toBe('t/rows/0/0');
  });

  it('falls to the cells alone when neither rule is drawn', () => {
    expect(flatten(table('t', cells, { ...options, rules: 'none' }))).toHaveLength(9);
    expect(flatten(table('t', cells, { ...options, rules: 'rows' }))).toHaveLength(11);
    expect(flatten(table('t', cells, { ...options, rules: 'columns' }))).toHaveLength(11);
  });

  it('stands each row rule on the boundary between two rows', () => {
    const plain = paths(flatten(table('t', cells, { ...options, rules: 'rows' })));
    expect(plain[0].path[0].start.y).toBeCloseTo(3 - 2, 12);
    expect(plain[1].path[0].start.y).toBeCloseTo(3 - 4, 12);
  });

  it('stands each column rule where two columns meet, which the widths give', () => {
    const [first, second] = paths(flatten(table('t', cells, { ...options, rules: 'columns' })));
    expect(first.path[0].start.x).toBeCloseTo(-5 + 2, 12);
    expect(second.path[0].start.x).toBeCloseTo(-5 + 5, 12);
  });

  it('draws the header rule heavier than the rule it stands in place of', () => {
    const header = paths(built)[3];
    expect(header.stroke?.width).toBe(0.2);
    expect(paths(built)[0].stroke?.width).toBe(0.1);
  });

  it('places a cell against its own column edge, one alignment at a time', () => {
    const mixed = words(flatten(table('t', cells, { ...options, align: ['start', 'middle', 'end'], padding: 0.25 })));
    expect(mixed[0].at.x).toBeCloseTo(-5 + 0.25, 12);
    expect(mixed[1].at.x).toBeCloseTo(-5 + 2 + 3 / 2, 12);
    expect(mixed[2].at.x).toBeCloseTo(5 - 0.25, 12);
  });

  it('sits every cell on the middle of its row', () => {
    expect(words(built)[0].at.y).toBeCloseTo(3 - 1, 12);
    expect(words(built)[3].at.y).toBeCloseTo(3 - 3, 12);
  });

  it('fills the box its widths and its row height add up to', () => {
    const box = boundsOfMarks(paths(built));
    expect(box?.x).toEqual({ from: -5, to: 5 });
    expect(box?.y).toEqual({ from: -3, to: 3 });
  });

  it('leaves a table of one row without a header, since there is nothing under the rule', () => {
    expect(flatten(table('t', [['a', 'b', 'c']], { ...options, header: true, rules: 'none' }))).toHaveLength(3);
  });

  it('refuses a row that does not match the columns it was given', () => {
    expect(() => table('t', [['a', 'b']], options)).toThrow('row 0 carries 2 cells and the table has 3 columns');
  });

  it('refuses a table with no columns and one with no rows', () => {
    expect(() => table('t', [], options)).toThrow('at least one column and one row');
    expect(() => table('t', cells, { ...options, columns: [] })).toThrow('at least one column and one row');
  });
});
