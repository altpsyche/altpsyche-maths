import { describe, expect, it } from 'vitest';
import { colourFrom, lengthOf, line, vec2, write, type Mark, type TextMark } from '../index.js';

const stroke = { colour: colourFrom('#ffffff'), width: 0.04 };

/** Three strokes of one length, which is what says each is drawn over its own
 * share of the span rather than all three at once. */
const strokes: readonly Mark[] = [0, 1, 2].map((at) => ({
  kind: 'path',
  id: `rule/glyph-${at}`,
  path: line(vec2(at, 0), vec2(at + 1, 0)),
  stroke,
}));

const label: TextMark = {
  kind: 'text',
  id: 'note/word',
  at: vec2(2, 1),
  text: 'slope 0.00',
  size: 0.4,
  family: 'sans-serif',
  fill: { colour: colourFrom('#ffffff') },
};

/** How much of each stroke is drawn at a fraction of the span. */
function drawn(along: number, options = {}): number[] {
  return write('rule', options)(strokes, along).map((mark) =>
    mark.kind === 'path' ? Number(lengthOf(mark.path).toFixed(6)) : NaN
  );
}

/** The window the sweep leaves uncut at a fraction of the span. */
function swept(along: number, mark: TextMark = label, across = 3) {
  const changed = write('note', { across })([mark], along)[0];
  if (changed.clip === undefined) throw new Error('the sweep left no clip');
  return changed.clip;
}

describe('written on', () => {
  it('draws one mark after another over an even share of the span each', () => {
    expect(drawn(0)).toEqual([0, 0, 0]);
    expect(drawn(1 / 3)).toEqual([1, 0, 0]);
    expect(drawn(2 / 3)).toEqual([1, 1, 0]);
    expect(drawn(1)).toEqual([1, 1, 1]);
  });

  it('has the second mark part way through while the first is done and the third is not started', () => {
    expect(drawn(0.5)).toEqual([1, 0.5, 0]);
  });

  it('overlaps the shares where a figure asks for a wider one', () => {
    // Every mark taking two thirds of the span puts all three under way at once.
    const at = drawn(0.5, { covers: 2 / 3 });
    expect(at[0]).toBeGreaterThan(at[1]);
    expect(at[1]).toBeGreaterThan(at[2]);
    expect(at[2]).toBeGreaterThan(0);
  });

  it('sweeps a text mark from its anchor across the run it was given', () => {
    expect(swept(0).x).toEqual({ from: 2, to: 2 });
    expect(swept(0.5).x).toEqual({ from: 2, to: 3.5 });
    expect(swept(1).x).toEqual({ from: 2, to: 5 });
  });

  it('sweeps from the edge the alignment puts the words at', () => {
    expect(swept(1, { ...label, align: 'middle' }).x).toEqual({ from: 0.5, to: 3.5 });
    expect(swept(1, { ...label, align: 'end' }).x).toEqual({ from: -1, to: 2 });
  });

  it('leaves the box a line of type stands in, a fifth of it under the baseline', () => {
    expect(swept(0.5).y.from).toBeCloseTo(1 - 0.08, 12);
    expect(swept(0.5).y.to).toBeCloseTo(1 + 0.32, 12);
  });

  it('puts the box where the baseline the mark names puts it', () => {
    expect(swept(0.5, { ...label, baseline: 'middle' }).y.from).toBeCloseTo(0.8, 12);
    expect(swept(0.5, { ...label, baseline: 'hanging' }).y.from).toBeCloseTo(0.6, 12);
  });

  it('keeps a clip the figure already put on the mark', () => {
    const clipped: TextMark = { ...label, clip: { x: { from: 0, to: 3 }, y: { from: 0, to: 2 } } };
    expect(swept(1, clipped).x).toEqual({ from: 2, to: 3 });
    expect(swept(1, clipped).y.from).toBeCloseTo(0.92, 12);
    expect(swept(1, clipped).y.to).toBeCloseTo(1.32, 12);
  });

  it('fades a text mark where no run is named, which is what draw already does', () => {
    const faded = write('note')([label], 0.5)[0];
    expect(faded.opacity).toBeCloseTo(0.5, 12);
    expect(faded.clip).toBeUndefined();
  });

  it('changes nothing where the name reaches nothing', () => {
    expect(write('nowhere')(strokes, 0.5)).toBe(strokes);
  });
});
