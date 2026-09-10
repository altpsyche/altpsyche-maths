import { describe, expect, it } from 'vitest';
import {
  circle,
  colourFrom,
  interval,
  lerpColour,
  morphGroup,
  pointAlong,
  vec2,
  type Mark,
  type PathMark,
  type TextMark,
} from '../index.js';

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

const INK = colourFrom('#101820');
const PEACH = colourFrom('#f4b183');

/**
 * The style of a paired mark walked with its geometry.
 *
 * What earns this is the swap at the end of the span: a mark that landed on its
 * partner while still wearing its own colour would change colour in one frame.
 */

const painted = (id: string, at: number, colour: ReturnType<typeof colourFrom>, width: number): PathMark => ({
  kind: 'path',
  id,
  path: circle(vec2(at, 0), 1),
  fill: { colour },
  stroke: { colour, width },
});

const styled: readonly Mark[] = [painted('fig/one/disc', 0, INK, 0.02), painted('fig/two/disc', 4, PEACH, 0.06)];

const discAt = (along: number, marks: readonly Mark[] = styled): PathMark => {
  const found = morphGroup('fig/one', 'fig/two')(marks, along).find((mark) => mark.id === 'fig/one/disc');
  if (found === undefined || found.kind !== 'path') throw new Error('the disc is not a path in the list');
  return found;
};

describe('a paired mark style walking', () => {
  it('walks the fill and the stroke colour channel by channel', () => {
    const half = discAt(0.5);
    const middle = lerpColour(INK, PEACH, 0.5);
    for (const channel of ['r', 'g', 'b', 'a'] as const) {
      expect(half.fill?.colour[channel]).toBeCloseTo(middle[channel], 12);
      expect(half.stroke?.colour[channel]).toBeCloseTo(middle[channel], 12);
    }
  });

  it('walks the stroke width', () => {
    expect(discAt(0.5).stroke?.width).toBeCloseTo(0.04, 12);
    expect(discAt(0.25).stroke?.width).toBeCloseTo(0.03, 12);
  });

  it('wears its partner style at the end of the span, which is what the swap needs', () => {
    const landed = discAt(1);
    for (const channel of ['r', 'g', 'b', 'a'] as const) {
      expect(landed.fill?.colour[channel]).toBeCloseTo(PEACH[channel], 12);
      expect(landed.stroke?.colour[channel]).toBeCloseTo(PEACH[channel], 12);
    }
    expect(landed.stroke?.width).toBeCloseTo(0.06, 12);
  });

  it('walks a width given as a number against a taper entry by entry', () => {
    const tapered: readonly Mark[] = [
      { kind: 'path', id: 'fig/one/disc', path: circle(vec2(0, 0), 1), stroke: { colour: INK, width: 0.1 } },
      {
        kind: 'path',
        id: 'fig/two/disc',
        path: circle(vec2(4, 0), 1),
        stroke: { colour: INK, width: { from: 0.2, to: 0.4, curve: 'easeIn' } },
      },
    ];
    const width = discAt(0.5, tapered).stroke?.width;
    if (typeof width !== 'object') throw new Error('the walked width is not a taper');
    expect(width.from).toBeCloseTo(0.15, 12);
    expect(width.to).toBeCloseTo(0.25, 12);
    expect(width.curve).toBe('easeIn');
  });

  it('fades a fill only one of the pair carries', () => {
    const alone: readonly Mark[] = [
      painted('fig/one/disc', 0, INK, 0.02),
      { kind: 'path', id: 'fig/two/disc', path: circle(vec2(4, 0), 1), stroke: { colour: INK, width: 0.02 } },
    ];
    expect(discAt(0.25, alone).fill?.colour.a).toBeCloseTo(0.75, 12);
    expect(discAt(0.75, alone).fill?.colour.a).toBeCloseTo(0.25, 12);
    expect(discAt(1, alone).fill?.colour.a).toBe(0);
  });

  it('walks its own opacity to the one its partner carries', () => {
    const dimmer: readonly Mark[] = [
      { ...painted('fig/one/disc', 0, INK, 0.02) },
      { ...painted('fig/two/disc', 4, INK, 0.02), opacity: 0.4 },
    ];
    expect(discAt(0.5, dimmer).opacity).toBeCloseTo(0.7, 12);
    expect(discAt(1, dimmer).opacity).toBe(0);
  });

  it('takes the winding rule and the clip of the mark it is walking onto after half', () => {
    const cut: readonly Mark[] = [
      { ...painted('fig/one/disc', 0, INK, 0.02), clip: { x: interval(-1, 1), y: interval(-1, 1) } },
      {
        ...painted('fig/two/disc', 4, INK, 0.02),
        fill: { colour: PEACH, rule: 'evenodd' },
        clip: { x: interval(3, 5), y: interval(-1, 1) },
      },
    ];
    expect(discAt(0.4, cut).fill?.rule).toBeUndefined();
    expect(discAt(0.6, cut).fill?.rule).toBe('evenodd');
    expect(discAt(0.5, cut).clip?.x.from).toBeCloseTo(1, 12);
    expect(discAt(0.5, cut).clip?.x.to).toBeCloseTo(3, 12);
    expect(discAt(1, cut).clip?.x.from).toBeCloseTo(3, 12);
    expect(discAt(1, cut).clip?.x.to).toBeCloseTo(5, 12);
  });
});
