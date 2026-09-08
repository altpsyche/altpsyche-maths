import { describe, expect, it } from 'vitest';
import { axes, coordsOf, flatten, interval, numberLine, numberPlane, scaleOf, widestWidth, type Mark } from '../index.js';

const pen = { colour: '#222', width: 0.02 };
const ink = { colour: '#222' };
const across = scaleOf(interval(-1, 4), interval(-4.6, 4.6));
const up = scaleOf(interval(-1, 9), interval(-2.4, 2.4));

const ids = (marks: readonly Mark[]) => marks.map((mark) => mark.id);
const find = (marks: readonly Mark[], id: string) => marks.find((mark) => mark.id === id)!;

describe('a grid', () => {
  it('draws its minor lines thinner than its major ones, not only fainter', () => {
    // A minor line that differs only in how strong its ink is reads as the same
    // line, so the grid comes out flat and busy.
    const marks = flatten(numberPlane('grid', coordsOf(across, up), { stroke: pen, minors: 4 }));
    const major = marks.find((mark) => mark.id.startsWith('grid/majors'));
    const minor = marks.find((mark) => mark.id.startsWith('grid/minors'));
    if (major?.kind !== 'path' || minor?.kind !== 'path') throw new Error('a grid line is a path');
    expect(widestWidth(minor.stroke!.width)).toBeLessThan(widestWidth(major.stroke!.width));
    expect(minor.opacity).toBeLessThan(major.opacity ?? 1);
  });
});

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

  it('runs the line the whole way and stands a head beyond each end', () => {
    const marks = flatten(numberLine('x', across, { stroke: pen, fill: ink, tip: 0.2 }));
    expect(ids(marks)).toContain('x/tips/low');
    expect(ids(marks)).toContain('x/tips/high');
    const drawn = find(marks, 'x/line');
    if (drawn.kind !== 'path') throw new Error('the line is a path');
    expect(drawn.path[0].start.x).toBeCloseTo(-4.6, 12);
    expect(drawn.path[0].curves[0].to.x).toBeCloseTo(4.6, 12);
  });

  it('leaves no tick standing under a head', () => {
    // The heads used to eat 0.2 off each end of the line, which left the
    // outermost tick under a head rather than on the line.
    const marks = flatten(numberLine('x', across, { stroke: pen, fill: ink, size: 0.3, tip: 0.2, ticks: 6 }));
    const drawn = find(marks, 'x/line');
    if (drawn.kind !== 'path') throw new Error('the line is a path');
    const ends = { from: drawn.path[0].start.x, to: drawn.path[0].curves[0].to.x };
    for (const mark of marks) {
      if (!mark.id.startsWith('x/ticks/') || mark.kind !== 'path') continue;
      expect(mark.path[0].start.x).toBeGreaterThanOrEqual(ends.from - 1e-12);
      expect(mark.path[0].start.x).toBeLessThanOrEqual(ends.to + 1e-12);
    }
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

  it('writes the number at the crossing below and to the left of it', () => {
    // Text is never measured here, so the label under the crossing takes the
    // offsets the labels already use rather than the width of the number.
    const marks = flatten(axes('axes', coords, { stroke: pen, fill: ink, size: 0.3, tip: 0.18 }));
    const label = find(marks, 'axes/x/labels/0');
    const line = find(marks, 'axes/y/line');
    if (label.kind !== 'text' || line.kind !== 'path') throw new Error('a label is text and a line is a path');
    expect(label.align).toBe('end');
    expect(label.baseline).toBe('hanging');
    expect(label.at.x).toBeLessThan(line.path[0].start.x);
    const across = find(marks, 'axes/x/line');
    if (across.kind !== 'path') throw new Error('a line is a path');
    expect(label.at.y).toBeLessThan(across.path[0].start.y);
  });

  it('leaves every label clear of the head at the end of the line it crosses', () => {
    const marks = flatten(axes('axes', coords, { stroke: pen, fill: ink, size: 0.3, tip: 0.18 }));
    const head = find(marks, 'axes/y/tips/low');
    if (head.kind !== 'path') throw new Error('a head is a path');
    const reach = head.path[0].curves.map((piece) => piece.to.x).concat(head.path[0].start.x);
    const widest = { from: Math.min(...reach), to: Math.max(...reach) };
    for (const mark of marks) {
      if (mark.kind !== 'text') continue;
      const clear = mark.at.x < widest.from || mark.at.x > widest.to;
      expect(clear, mark.id).toBe(true);
    }
  });

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

describe('the grid behind a graph', () => {
  const coords = coordsOf(across, up);
  const faint = { colour: '#ddd', width: 0.01 };

  it('stands a line on every tick of both axes', () => {
    const marks = flatten(numberPlane('grid', coords, { stroke: faint }));
    expect(marks).toHaveLength(11);
    expect(ids(marks)).toEqual([
      'grid/majors/x/-1',
      'grid/majors/x/0',
      'grid/majors/x/1',
      'grid/majors/x/2',
      'grid/majors/x/3',
      'grid/majors/x/4',
      'grid/majors/y/0',
      'grid/majors/y/2',
      'grid/majors/y/4',
      'grid/majors/y/6',
      'grid/majors/y/8',
    ]);
  });

  it('divides each gap and leaves out the lines a major already stands on', () => {
    const marks = flatten(numberPlane('grid', coords, { stroke: faint, minors: 4 }));
    expect(marks).toHaveLength(42);
    expect(marks.filter((mark) => mark.id.startsWith('grid/minors'))).toHaveLength(31);
    expect(ids(marks)).not.toContain('grid/minors/x/0');
    expect(ids(marks)).not.toContain('grid/minors/y/2');
  });

  it('places a minor line at a value the step is not a round number of', () => {
    // A quarter step rounded by its own magnitude reaches three quarters as
    // 0.8, which is a grid line drawn where nothing is.
    const marks = flatten(numberPlane('grid', coords, { stroke: faint, minors: 4 }));
    expect(ids(marks)).toContain('grid/minors/x/-0.75');
    expect(ids(marks)).toContain('grid/minors/x/0.25');
    expect(ids(marks)).not.toContain('grid/minors/x/-0.8');
  });

  it('draws the minor lines before the major ones so a major wins where they meet', () => {
    const marks = flatten(numberPlane('grid', coords, { stroke: faint, minors: 4 }));
    const places = ids(marks);
    const lastMinor = places.reduce((last, id, index) => (id.startsWith('grid/minors') ? index : last), -1);
    const firstMajor = places.findIndex((id) => id.startsWith('grid/majors'));
    expect(lastMinor).toBeLessThan(firstMajor);
  });

  it('draws a minor line fainter than a major one', () => {
    const marks = flatten(numberPlane('grid', coords, { stroke: faint, minors: 4, minorOpacity: 0.25 }));
    expect(find(marks, 'grid/minors/x/0.25').opacity).toBeCloseTo(0.25, 12);
    expect(find(marks, 'grid/majors/x/0').opacity).toBeCloseTo(1, 12);
  });

  it('adds nothing extra below two divisions', () => {
    expect(flatten(numberPlane('grid', coords, { stroke: faint, minors: 1 }))).toHaveLength(11);
    expect(flatten(numberPlane('grid', coords, { stroke: faint, minors: 0 }))).toHaveLength(11);
  });

  it('keeps every line inside the figure units the coords cover', () => {
    const marks = flatten(numberPlane('grid', coords, { stroke: faint, minors: 4 }));
    for (const mark of marks) {
      if (mark.kind !== 'path') throw new Error('a grid line is a path');
      const points = mark.path.flatMap((subpath) => [subpath.start, ...subpath.curves.map((curve) => curve.to)]);
      for (const point of points) {
        expect(interval.holds(across.units, point.x)).toBe(true);
        expect(interval.holds(up.units, point.y)).toBe(true);
      }
    }
  });

  it('reaches the full height across and the full width up', () => {
    const marks = flatten(numberPlane('grid', coords, { stroke: faint }));
    const vertical = find(marks, 'grid/majors/x/0');
    const horizontal = find(marks, 'grid/majors/y/4');
    if (vertical.kind !== 'path' || horizontal.kind !== 'path') throw new Error('a grid line is a path');
    expect(vertical.path[0].start.y).toBeCloseTo(-2.4, 12);
    expect(vertical.path[0].curves[0].to.y).toBeCloseTo(2.4, 12);
    expect(horizontal.path[0].start.x).toBeCloseTo(-4.6, 12);
    expect(horizontal.path[0].curves[0].to.x).toBeCloseTo(4.6, 12);
  });
});
