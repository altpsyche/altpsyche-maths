import { describe, expect, it } from 'vitest';
import { colourFrom, coordsOf, flatten, interval, marksAt, pointOf, scaleOf, vec2, vectorField } from '@altpsyche/maths';
import type { Mark, PathMark, Vec2 } from '@altpsyche/maths';

/**
 * The field's arrows are counted, their tips are checked against the mapping of
 * their own scaled vector, and their lengths against the function the author
 * handed in.
 */

const COORDS = coordsOf(scaleOf(interval(-4, 4), interval(0, 8)), scaleOf(interval(-2, 2), interval(3, 0)));

/** Never nothing anywhere, since its first part is at least one. */
const flow = (at: Vec2) => vec2(1 + at.y * at.y, at.x);

const options = {
  lengthOf: (magnitude: number) => 0.1 + magnitude / 10,
  colourFor: (magnitude: number) => colourFrom(magnitude > 2 ? '#f00' : '#00f'),
  width: 0.02,
  resolution: { x: 9, y: 5 },
};

const marksOf = (node: Parameters<typeof flatten>[0]) => flatten(node);

const shaftEnds = (marks: readonly Mark[]) => {
  const ends: { id: string; from: Vec2; to: Vec2 }[] = [];
  for (const mark of marks) {
    if (mark.kind !== 'path' || !mark.id.endsWith('/shaft')) continue;
    const subpath = (mark as PathMark).path[0];
    ends.push({ id: mark.id, from: subpath.start, to: subpath.curves[subpath.curves.length - 1].to });
  }
  return ends;
};

/** The far tip of one arrow, which is the head's own first corner. */
const tipOf = (marks: readonly Mark[], id: string): Vec2 => {
  const head = marks.find((mark) => mark.id === id) as PathMark;
  return head.path[0].start;
};

describe('vectorField', () => {
  it('draws one arrow per sample and two marks per arrow', () => {
    const marks = marksOf(vectorField('field', COORDS, flow, options));
    expect(marks).toHaveLength(90);
    expect(marks.filter((mark) => mark.id.endsWith('/shaft'))).toHaveLength(45);
    expect(marks.filter((mark) => mark.id.endsWith('/head'))).toHaveLength(45);
  });

  it('holds its count at every time a turning field is drawn at', () => {
    const turning = {
      extent: { width: 8, height: 4 },
      still: 0,
      scene: (seconds: number) =>
        vectorField('field', COORDS, (place) => vec2(2 + Math.cos(seconds) + place.y * place.y, Math.sin(seconds) + place.x), options),
    };
    for (const seconds of [0, 0.37, 1.2, 2.5, 4]) expect(marksAt(turning, seconds)).toHaveLength(90);
  });

  it('samples the middle of each cell, so the grid is inside the graph', () => {
    const marks = marksOf(vectorField('field', COORDS, flow, options));
    const tails = shaftEnds(marks).map((end) => end.from);
    for (const tail of tails) {
      expect(tail.x).toBeGreaterThanOrEqual(0);
      expect(tail.x).toBeLessThanOrEqual(8);
    }
    // Nine columns across eight figure units puts the first sample half a cell in.
    expect(Math.min(...tails.map((tail) => tail.x))).toBeCloseTo(8 / 18, 12);
    expect(Math.max(...tails.map((tail) => tail.x))).toBeCloseTo(8 - 8 / 18, 12);
  });

  it('points each arrow where the mapping of its own vector points', () => {
    const marks = marksOf(vectorField('field', COORDS, flow, options));
    for (let column = 0; column < 9; column += 1) {
      for (let row = 0; row < 5; row += 1) {
        const x = -4 + (8 * (column + 0.5)) / 9;
        const y = -2 + (4 * (row + 0.5)) / 5;
        const vector = flow(vec2(x, y));
        const tail = pointOf(COORDS, x, y);
        const far = pointOf(COORDS, x + vector.x, y + vector.y);
        const tip = tipOf(marks, `field/${column}-${row}/head`);
        const turned = Math.atan2(tip.y - tail.y, tip.x - tail.x) - Math.atan2(far.y - tail.y, far.x - tail.x);
        expect(Math.abs(turned)).toBeLessThan(1e-12);
      }
    }
  });

  it('measures every arrow in figure units, whatever the two axes count at', () => {
    const marks = marksOf(vectorField('field', COORDS, flow, options));
    for (let column = 0; column < 9; column += 1) {
      for (let row = 0; row < 5; row += 1) {
        const x = -4 + (8 * (column + 0.5)) / 9;
        const y = -2 + (4 * (row + 0.5)) / 5;
        const magnitude = Math.hypot(1 + y * y, x);
        const tail = pointOf(COORDS, x, y);
        const tip = tipOf(marks, `field/${column}-${row}/head`);
        expect(Math.hypot(tip.x - tail.x, tip.y - tail.y)).toBeCloseTo(options.lengthOf(magnitude), 12);
      }
    }
  });

  it('gives the longest and shortest arrow the lengths the author asked for', () => {
    const square = coordsOf(scaleOf(interval(-4, 4), interval(0, 8)), scaleOf(interval(-2, 2), interval(0, 4)));
    const marks = marksOf(vectorField('field', square, flow, options));
    const lengths: number[] = [];
    const magnitudes: number[] = [];
    for (let column = 0; column < 9; column += 1) {
      for (let row = 0; row < 5; row += 1) {
        const x = -4 + (8 * (column + 0.5)) / 9;
        const y = -2 + (4 * (row + 0.5)) / 5;
        magnitudes.push(Math.hypot(1 + y * y, x));
        const tail = pointOf(square, x, y);
        const tip = tipOf(marks, `field/${column}-${row}/head`);
        lengths.push(Math.hypot(tip.x - tail.x, tip.y - tail.y));
      }
    }
    expect(Math.max(...lengths)).toBeCloseTo(options.lengthOf(Math.max(...magnitudes)), 12);
    expect(Math.min(...lengths)).toBeCloseTo(options.lengthOf(Math.min(...magnitudes)), 12);
  });

  it('colours each arrow by the magnitude at its own sample', () => {
    const marks = marksOf(vectorField('field', COORDS, flow, options));
    for (const mark of marks) {
      if (mark.kind !== 'path' || !mark.id.endsWith('/shaft')) continue;
      const [, cell] = mark.id.split('/');
      const [column, row] = cell.split('-').map(Number);
      const x = -4 + (8 * (column + 0.5)) / 9;
      const y = -2 + (4 * (row + 0.5)) / 5;
      const wanted = options.colourFor(Math.hypot(1 + y * y, x));
      expect((mark as PathMark).stroke?.colour).toEqual(wanted);
    }
  });

  it('draws no arrow where the vector is nothing, rather than one of no length', () => {
    const hole = (at: Vec2) => (at.x < 0 ? vec2(0, 0) : vec2(1, 0));
    const marks = marksOf(vectorField('field', COORDS, hole, options));
    // Nine columns split either side of zero leaves four sampled below it.
    expect(marks).toHaveLength(2 * 5 * 5);
    expect(marks.some((mark) => mark.id.startsWith('field/0-'))).toBe(false);
    expect(marks.some((mark) => mark.id.startsWith('field/4-'))).toBe(true);
  });

  it('holds its count where the author asks for no length at all', () => {
    const none = { ...options, lengthOf: () => 0 };
    expect(marksOf(vectorField('field', COORDS, flow, none))).toHaveLength(0);
  });

  it('keeps the head inside an arrow shorter than one', () => {
    const tiny = { ...options, lengthOf: () => 0.01, head: 1 };
    const marks = marksOf(vectorField('field', COORDS, flow, tiny));
    for (const end of shaftEnds(marks)) {
      const shaft = Math.hypot(end.to.x - end.from.x, end.to.y - end.from.y);
      expect(shaft).toBeLessThan(0.011);
    }
  });
});
