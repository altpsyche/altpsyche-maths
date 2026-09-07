import { describe, expect, it } from 'vitest';
import { countTo, labelFor, vec2 } from '@altpsyche/maths';
import type { Mark } from '@altpsyche/maths';

/**
 * A number ticking from one value to another.
 *
 * What it is held to is that the value it writes is the value it has reached,
 * and that the rounding is the caller's rather than this function's.
 */

const write = (value: number) => labelFor(value, 0.01);
const reading = (id: string, content: string): Mark => ({
  kind: 'text',
  id,
  at: vec2(0, 0),
  text: content,
  size: 0.3,
  family: 'sans-serif',
  fill: { colour: '#111' },
});
const marks: Mark[] = [
  reading('fig/reading', '9.00'),
  { kind: 'path', id: 'fig/curve', path: [] },
];
const textAt = (along: number, id = 'fig/reading') => {
  const mark = countTo('fig/reading', 0, 9, write)(marks, along).find((each) => each.id === id);
  return mark?.kind === 'text' ? mark.text : undefined;
};

describe('countTo', () => {
  it('writes the value it has reached', () => {
    expect(textAt(0)).toBe('0.00');
    expect(textAt(0.5)).toBe('4.50');
    expect(textAt(1)).toBe('9.00');
  });

  it('ends on what the scene already wrote, so the two never disagree', () => {
    expect(textAt(1)).toBe('9.00');
  });

  it('rounds the way it was told to and holds no opinion of its own', () => {
    const coarse = countTo('fig/reading', 0, 9, (value) => labelFor(value, 1))(marks, 0.5);
    const fine = countTo('fig/reading', 0, 9, (value) => labelFor(value, 0.001))(marks, 0.5);
    expect(coarse.find((mark) => mark.id === 'fig/reading')).toMatchObject({ text: '5' });
    expect(fine.find((mark) => mark.id === 'fig/reading')).toMatchObject({ text: '4.500' });
  });

  it('counts down as readily as up', () => {
    const down = countTo('fig/reading', 9, 0, write)(marks, 0.25);
    expect(down.find((mark) => mark.id === 'fig/reading')).toMatchObject({ text: '6.75' });
  });

  it('leaves the mark count and everything that is not text alone', () => {
    const at = countTo('fig/reading', 0, 9, write)(marks, 0.5);
    expect(at).toHaveLength(marks.length);
    expect(at.find((mark) => mark.id === 'fig/curve')).toBe(marks[1]);
  });

  it('changes nothing when the name matches no mark', () => {
    expect(countTo('fig/nowhere', 0, 9, write)(marks, 0.5)).toEqual(marks);
  });

  it('reaches every text mark under a group it names', () => {
    const pair: Mark[] = [reading('fig/box/a', ''), reading('fig/box/b', '')];
    const at = countTo('fig/box', 0, 10, write)(pair, 0.3);
    expect(at.map((mark) => (mark.kind === 'text' ? mark.text : ''))).toEqual(['3.00', '3.00']);
  });
});
