import { describe, expect, it } from 'vitest';
import { circle, colourFrom, morphGroup, pointAlong, vec2, type Mark, type PathMark, type TextMark } from '../index.js';

/**
 * One group of marks walked into another.
 *
 * The pairing is `matchMarks` and is held to its own gate elsewhere, so what
 * these hold is the walk: the marks untouched at nothing, the walking group gone
 * and the group arrived at standing at one, and the shape halfway between the two
 * at half.
 */

const fill = { colour: colourFrom('#ffffff') };

const shape = (id: string, at: number): PathMark => ({ kind: 'path', id, path: circle(vec2(at, 0), 1) });
const word = (id: string, at: number, text: string): TextMark => ({
  kind: 'text',
  id,
  at: vec2(at, 0),
  text,
  size: 1,
  family: 'sans-serif',
  fill,
});

const marks: readonly Mark[] = [
  shape('fig/one/disc', 0),
  word('fig/one/label', 0, 'one'),
  shape('fig/two/disc', 4),
  word('fig/two/label', 4, 'two'),
];

const morph = morphGroup('fig/one', 'fig/two');
const at = (along: number, id: string): Mark => {
  const found = morph(marks, along).find((mark) => mark.id === id);
  if (found === undefined) throw new Error(`${id} is not in the list`);
  return found;
};
/** A point of a path at a fraction of its length, which a path that draws
 * nothing has none of. */
const pointOf = (path: PathMark['path'], share: number) => {
  const found = pointAlong(path, share);
  if (found === null) throw new Error('the path draws nothing');
  return found;
};

const pathAt = (along: number, id: string): PathMark => {
  const found = at(along, id);
  if (found.kind !== 'path') throw new Error(`${id} is not a path`);
  return found;
};

describe('a group morphing into a group', () => {
  it('touches nothing at the start of its span', () => {
    // A group waiting to be walked onto is the picture it already is, so a figure
    // whose morph is the last thing on its timeline reads the same before it as
    // it did with no morph written at all.
    expect(morph(marks, 0)).toBe(marks);
  });

  it('walks the shape halfway at half', () => {
    const half = pathAt(0.5, 'fig/one/disc');
    const middle = circle(vec2(2, 0), 1);
    for (const share of [0, 0.25, 0.5, 0.75, 1]) {
      expect(pointOf(half.path, share).x).toBeCloseTo(pointOf(middle, share).x, 9);
      expect(pointOf(half.path, share).y).toBeCloseTo(pointOf(middle, share).y, 9);
    }
  });

  it('dims the mark being walked onto as the walk lands', () => {
    expect(at(0.25, 'fig/two/disc').opacity).toBeCloseTo(0.75, 12);
    expect(at(0.5, 'fig/two/disc').opacity).toBeCloseTo(0.5, 12);
    expect(at(0.75, 'fig/two/disc').opacity).toBeCloseTo(0.25, 12);
  });

  it('leaves the walking group at nothing and the group arrived at whole', () => {
    const landed = morph(marks, 1);
    expect(landed.filter((mark) => mark.id.startsWith('fig/one/')).map((mark) => mark.opacity)).toEqual([0, 0]);
    expect(landed.filter((mark) => mark.id.startsWith('fig/two/'))).toEqual(marks.slice(2));
  });

  it('lands each walked mark on the mark it walked onto', () => {
    // Which is what makes the swap at the end of the span show nothing.
    const landed = pathAt(1, 'fig/one/disc');
    const target = shape('fig/two/disc', 4);
    for (const share of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
      expect(pointOf(landed.path, share).x).toBeCloseTo(pointOf(target.path, share).x, 9);
      expect(pointOf(landed.path, share).y).toBeCloseTo(pointOf(target.path, share).y, 9);
    }
    const label = at(1, 'fig/one/label');
    if (label.kind !== 'text') throw new Error('the label is not a text mark');
    expect(label.at).toEqual(vec2(4, 0));
    expect(label.text).toBe('two');
  });

  it('changes a paired string once, at half of its span', () => {
    const textAt = (along: number) => {
      const found = at(along, 'fig/one/label');
      if (found.kind !== 'text') throw new Error('the label is not a text mark');
      return found;
    };
    expect(textAt(0.25).text).toBe('one');
    expect(textAt(0.49).text).toBe('one');
    expect(textAt(0.5).text).toBe('two');
    expect(textAt(0.75).text).toBe('two');
    // The anchor walks whether the string has changed or not.
    expect(textAt(0.25).at.x).toBeCloseTo(1, 12);
    expect(textAt(0.75).at.x).toBeCloseTo(3, 12);
  });

  it('fades a mark no name and no order answers', () => {
    const spare = [...marks, shape('fig/one/spare', 0)];
    const changed = morphGroup('fig/one', 'fig/two')(spare, 0.25);
    const found = changed.find((mark) => mark.id === 'fig/one/spare');
    expect(found?.opacity).toBeCloseTo(0.75, 12);
  });

  it('changes nothing for a name matching nothing', () => {
    expect(morphGroup('fig/one', 'fig/nowhere')(marks, 0.5)).toEqual(marks);
    expect(morphGroup('fig/nowhere', 'fig/two')(marks, 0.5)).toEqual(marks);
  });
});
