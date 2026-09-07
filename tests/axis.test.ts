import { describe, expect, it } from 'vitest';
import { axes, coordsOf, flatten, interval, numberLine, scaleOf, type Mark } from '../index.js';

const pen = { colour: '#222', width: 0.02 };
const ink = { colour: '#222' };
const across = scaleOf(interval(-1, 4), interval(-4.6, 4.6));
const up = scaleOf(interval(-1, 9), interval(-2.4, 2.4));

const ids = (marks: readonly Mark[]) => marks.map((mark) => mark.id);
const find = (marks: readonly Mark[], id: string) => marks.find((mark) => mark.id === id)!;

describe('a number line', () => {
  it('draws its line, a tick at each number and a label under each tick', () => {
    const marks = flatten(numberLine('x', across, { stroke: pen, fill: ink, size: 0.3 }));
    expect(marks).toHaveLength(13);
    expect(ids(marks)).toEqual([
      'x/line',
      'x/ticks/-1',
      'x/ticks/0',
      'x/ticks/1',
      'x/ticks/2',
      'x/ticks/3',
      'x/ticks/4',
      'x/labels/-1',
      'x/labels/0',
      'x/labels/1',
      'x/labels/2',
      'x/labels/3',
      'x/labels/4',
    ]);
  });

  it('names each tick after the number it shows rather than its place in the list', () => {
    const wide = flatten(numberLine('x', scaleOf(interval(-1, 9), interval(-4.6, 4.6)), { stroke: pen }));
    expect(ids(wide)).toEqual(['x/line', 'x/ticks/0', 'x/ticks/2', 'x/ticks/4', 'x/ticks/6', 'x/ticks/8']);
  });

  it('writes nothing without a fill and a size', () => {
    expect(flatten(numberLine('x', across, { stroke: pen }))).toHaveLength(7);
    expect(flatten(numberLine('x', across, { stroke: pen, fill: ink }))).toHaveLength(7);
    expect(flatten(numberLine('x', across, { stroke: pen, size: 0.3 }))).toHaveLength(7);
  });

  it('puts each tick where its own number falls on the scale', () => {
    const marks = flatten(numberLine('x', across, { stroke: pen }));
    const zero = find(marks, 'x/ticks/0');
    if (zero.kind !== 'path') throw new Error('a tick is a path');
    expect(zero.path[0].start.x).toBeCloseTo(-2.76, 12);
    const four = find(marks, 'x/ticks/4');
    if (four.kind !== 'path') throw new Error('a tick is a path');
    expect(four.path[0].start.x).toBeCloseTo(4.6, 12);
  });

  it('runs upward with its labels to the left when asked to', () => {
    const marks = flatten(numberLine('y', up, { stroke: pen, fill: ink, size: 0.3, direction: 'up' }));
    const label = find(marks, 'y/labels/0');
    if (label.kind !== 'text') throw new Error('a label is text');
    expect(label.align).toBe('end');
    expect(label.baseline).toBe('middle');
    expect(label.at.y).toBeCloseTo(-1.92, 12);
    expect(label.at.x).toBeLessThan(0);
  });

  it('writes an across label under the line, centred on its tick', () => {
    const marks = flatten(numberLine('x', across, { stroke: pen, fill: ink, size: 0.3 }));
    const label = find(marks, 'x/labels/0');
    if (label.kind !== 'text') throw new Error('a label is text');
    expect(label.align).toBe('middle');
    expect(label.baseline).toBe('hanging');
    expect(label.at.x).toBeCloseTo(-2.76, 12);
    expect(label.at.y).toBeLessThan(0);
  });

  it('sits where it is seated on the other axis', () => {
    const marks = flatten(numberLine('x', across, { stroke: pen, at: 1.5 }));
    const drawn = find(marks, 'x/line');
    if (drawn.kind !== 'path') throw new Error('the line is a path');
    expect(drawn.path[0].start.y).toBeCloseTo(1.5, 12);
  });

  it('leaves the zero label out when a crossing axis will write it', () => {
    const marks = flatten(numberLine('y', up, { stroke: pen, fill: ink, size: 0.3, direction: 'up', skipZero: true }));
    expect(ids(marks)).not.toContain('y/labels/0');
    expect(ids(marks)).toContain('y/ticks/0');
  });

  it('stops the line where a head begins, and draws a head at each end', () => {
    const marks = flatten(numberLine('x', across, { stroke: pen, fill: ink, tip: 0.2 }));
    expect(ids(marks)).toContain('x/tips/low');
    expect(ids(marks)).toContain('x/tips/high');
    const drawn = find(marks, 'x/line');
    if (drawn.kind !== 'path') throw new Error('the line is a path');
    expect(drawn.path[0].start.x).toBeCloseTo(-4.4, 12);
    expect(drawn.path[0].curves[0].to.x).toBeCloseTo(4.4, 12);
  });

  it('draws no head without a fill to put in it', () => {
    expect(ids(flatten(numberLine('x', across, { stroke: pen, tip: 0.2 })))).not.toContain('x/tips/low');
  });

  it('leaves the line and every tick exactly where they were when labels are added', () => {
    // DESIGN.md's rule: nothing about a figure's layout may depend on how wide
    // some text is, because measuring text gives a different answer per machine.
    const bare = flatten(numberLine('x', across, { stroke: pen }));
    const labelled = flatten(numberLine('x', across, { stroke: pen, fill: ink, size: 0.3 }));
    for (const mark of bare) {
      const twin = find(labelled, mark.id);
      if (mark.kind !== 'path' || twin.kind !== 'path') throw new Error('a tick is a path');
      expect(twin.path[0].start.x).toBeCloseTo(mark.path[0].start.x, 12);
      expect(twin.path[0].start.y).toBeCloseTo(mark.path[0].start.y, 12);
    }
  });

  it('sits every label the same distance off the line, whatever each one says', () => {
    // A layout that measured its text would push the wider labels further out.
    const marks = flatten(numberLine('x', scaleOf(interval(-2, 2), interval(-4.6, 4.6)), { stroke: pen, fill: ink, size: 0.3, ticks: 9 }));
    const labels = marks.filter((mark) => mark.kind === 'text');
    expect(labels.map((label) => label.text)).toContain('-1.5');
    expect(labels.map((label) => label.text)).toContain('0.0');
    const offsets = new Set(labels.map((label) => (label.kind === 'text' ? label.at.y : 0)));
    expect(offsets.size).toBe(1);
  });

  it('anchors each label on its own tick', () => {
    const marks = flatten(numberLine('x', across, { stroke: pen, fill: ink, size: 0.3 }));
    for (const tick of ['-1', '0', '1', '2', '3', '4']) {
      const mark = find(marks, `x/ticks/${tick}`);
      const label = find(marks, `x/labels/${tick}`);
      if (mark.kind !== 'path' || label.kind !== 'text') throw new Error('a tick is a path and a label is text');
      expect(label.at.x).toBeCloseTo(mark.path[0].start.x, 12);
    }
  });
});

describe('a pair of axes', () => {
  const coords = coordsOf(across, up);

  it('draws both lines under one group, named x and y', () => {
    const marks = flatten(axes('axes', coords, { stroke: pen, fill: ink, size: 0.3 }));
    expect(marks).toHaveLength(23);
    expect(ids(marks).slice(0, 2)).toEqual(['axes/x/line', 'axes/x/ticks/-1']);
    expect(ids(marks)).toContain('axes/y/line');
    expect(ids(marks)).toContain('axes/y/ticks/8');
  });

  it('crosses each line at the other axis zero', () => {
    const marks = flatten(axes('axes', coords, { stroke: pen }));
    const horizontal = find(marks, 'axes/x/line');
    const vertical = find(marks, 'axes/y/line');
    if (horizontal.kind !== 'path' || vertical.kind !== 'path') throw new Error('a line is a path');
    expect(horizontal.path[0].start.y).toBeCloseTo(-1.92, 12);
    expect(vertical.path[0].start.x).toBeCloseTo(-2.76, 12);
  });

  it('sits at the near edge where the other axis never reaches zero', () => {
    // A line drawn at a zero the graph never reaches is a line off the picture,
    // leaving a reader labels along an edge with nothing on it.
    const high = coordsOf(across, scaleOf(interval(2, 9), interval(-2.4, 2.4)));
    const marks = flatten(axes('axes', high, { stroke: pen }));
    const horizontal = find(marks, 'axes/x/line');
    if (horizontal.kind !== 'path') throw new Error('a line is a path');
    expect(horizontal.path[0].start.y).toBeCloseTo(-2.4, 12);
  });

  it('writes the zero label once where both axes reach it', () => {
    const marks = flatten(axes('axes', coords, { stroke: pen, fill: ink, size: 0.3 }));
    expect(ids(marks)).toContain('axes/x/labels/0');
    expect(ids(marks)).not.toContain('axes/y/labels/0');
  });

  it('keeps the y zero label where the axes do not cross at the origin', () => {
    const shifted = coordsOf(scaleOf(interval(2, 6), interval(-4.6, 4.6)), up);
    const marks = flatten(axes('axes', shifted, { stroke: pen, fill: ink, size: 0.3 }));
    expect(ids(marks)).toContain('axes/y/labels/0');
  });
});
