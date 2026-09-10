import { describe, expect, it } from 'vitest';
import { colourFrom, marksAt, matchGlyphs, matchMarks, vec2, type Mark } from '@altpsyche/maths';
import { TIMES, booleans } from '../demos/boolean.js';
import { tangent } from '../demos/tangent.js';

/**
 * Two groups of marks paired one to one.
 *
 * The pairing a group morph reads is by name, so what these hold it to is that
 * two panels of one figure pair mark for mark on the names they share, that what
 * no name answers pairs by order, and that a path and a string never pair with
 * each other.
 */

/** The part of a mark's id under a target, which is the key a group morph pairs
 * on. */
const under =
  (target: string) =>
  (mark: Mark): string | undefined =>
    mark.id.startsWith(`${target}/`) ? mark.id.slice(target.length + 1) : undefined;

const panelOf = (name: string): Mark[] =>
  marksAt(booleans, TIMES.crossing).filter((mark) => mark.id.startsWith(`booleans/${name}/`));

const fill = { colour: colourFrom('#ffffff') };
const shape = (id: string): Mark => ({ kind: 'path', id, path: [] });
const word = (id: string): Mark => ({ kind: 'text', id, at: vec2(0, 0), text: id, size: 1, family: 'sans-serif', fill });

describe('marks matched by name', () => {
  it('pairs two panels of one figure mark for mark', () => {
    const left = panelOf('union');
    const right = panelOf('intersection');
    expect(left).toHaveLength(4);
    const match = matchMarks(left, right, under('booleans/union'));

    expect(match.pairs).toHaveLength(4);
    expect(match.leaving).toHaveLength(0);
    expect(match.arriving).toHaveLength(0);
    // Every pair is one mark of two panels built by one function, so the two ids
    // differ in the panel's name and in nothing else.
    for (const [one, other] of match.pairs) {
      expect(other.id).toBe(one.id.replace('/union/', '/intersection/'));
      expect(other.kind).toBe(one.kind);
    }
  });

  it('pairs what no name answers, in the order it stands in', () => {
    const left = [shape('one/a'), shape('one/b'), shape('one/c')];
    const right = [shape('two/x'), shape('two/y')];
    const match = matchMarks(left, right, under('one'));

    expect(match.pairs.map(([one, other]) => [one.id, other.id])).toEqual([
      ['one/a', 'two/x'],
      ['one/b', 'two/y'],
    ]);
    expect(match.leaving.map((mark) => mark.id)).toEqual(['one/c']);
    expect(match.arriving).toHaveLength(0);
  });

  it('holds the named pairs and pairs the rest by order after them', () => {
    const left = [shape('one/keep'), shape('one/spare')];
    const right = [shape('two/other'), shape('two/keep')];
    const match = matchMarks(left, right, (mark) => mark.id.slice(mark.id.indexOf('/') + 1));

    expect(match.pairs.map(([one, other]) => [one.id, other.id])).toEqual([
      ['one/keep', 'two/keep'],
      ['one/spare', 'two/other'],
    ]);
  });

  it('never pairs a path with a string, by name or by order', () => {
    const byName = matchMarks([shape('one/a')], [word('two/a')], under('one'));
    expect(byName.pairs).toHaveLength(0);
    expect(byName.leaving.map((mark) => mark.id)).toEqual(['one/a']);
    expect(byName.arriving.map((mark) => mark.id)).toEqual(['two/a']);

    const byOrder = matchMarks([shape('one/a'), word('one/b')], [word('two/x'), shape('two/y')], under('one'));
    expect(byOrder.pairs.map(([one, other]) => [one.id, other.id])).toEqual([
      ['one/a', 'two/y'],
      ['one/b', 'two/x'],
    ]);
  });
});

describe('the glyph pairing under the parameter', () => {
  it('pairs the tangent demo two equations as it did before', () => {
    const marks = marksAt(tangent, tangent.still);
    const glyphs = (target: string) => marks.filter((mark) => mark.id.startsWith(`${target}/`));
    const match = matchGlyphs(glyphs('tangent/equation/at-rest'), glyphs('tangent/equation/moving'));

    // Seven glyphs walk into eight, and the six they share are what the morph
    // moves rather than fades.
    expect(match.pairs).toHaveLength(6);
    expect(match.leaving).toHaveLength(1);
    expect(match.arriving).toHaveLength(2);
  });
});
