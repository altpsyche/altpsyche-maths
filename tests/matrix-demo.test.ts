import { describe, expect, it } from 'vitest';
import { marksAt, type Mark, type Mat3, type PathMark } from '../index.js';
import { ENTRIES, MAP, TIMES, mapped } from '../demos/matrix.js';

/**
 * The matrix demo read off its own marks: what the square encloses, and whether
 * the numbers written beside it are the numbers the grid is at.
 */

const paths = (marks: readonly Mark[]) => marks.filter((m): m is PathMark => m.kind === 'path');
const square = (seconds: number) => paths(marksAt(mapped, seconds)).find((mark) => mark.id === 'map/plane/square');
const written = (seconds: number) =>
  marksAt(mapped, seconds)
    .filter((mark) => mark.kind === 'text' && mark.id.startsWith('map/map/rows/'))
    .map((mark) => (mark.kind === 'text' ? mark.text : ''));

/** The area a closed run of straight pieces encloses, by the shoelace sum over
 * its corners. */
function areaOf(mark: PathMark): number {
  const points = [mark.path[0].start, ...mark.path[0].curves.map((curve) => curve.to)];
  let twice = 0;
  for (let at = 0; at < points.length - 1; at += 1) {
    twice += points[at].x * points[at + 1].y - points[at + 1].x * points[at].y;
  }
  return Math.abs(twice) / 2;
}

/** How far along its own map the picture is at a time, which the span reads off
 * `thereAndBack` over the whole duration. */
const along = (seconds: number) => {
  const fraction = seconds / 6;
  return fraction <= 0.5 ? fraction * 2 : 2 - fraction * 2;
};

const reached = (at: number): Mat3 =>
  [1, 0, 0, 0, 1, 0, 0, 0, 1].map((entry, index) => entry + (MAP[index] - entry) * at) as unknown as Mat3;

describe('the matrix demo', () => {
  it('draws twelve marks besides its grid at every named time', () => {
    for (const seconds of Object.values(TIMES)) {
      const marks = marksAt(mapped, seconds);
      const grid = marks.filter((mark) => mark.id.startsWith('map/plane/grid'));
      expect(marks, String(seconds)).toHaveLength(38);
      expect(grid, String(seconds)).toHaveLength(26);
    }
  });

  it('holds the square at the area the map it has reached gives it', () => {
    for (const seconds of Object.values(TIMES)) {
      const at = along(seconds);
      const map = reached(at);
      const area = map[0] * map[4] - map[3] * map[1];
      expect(areaOf(square(seconds)!), String(seconds)).toBeCloseTo(Math.abs(area), 12);
    }
  });

  it('ends the map at twice the area it began with', () => {
    expect(areaOf(square(TIMES.start)!)).toBeCloseTo(1, 12);
    expect(areaOf(square(TIMES.half)!)).toBeCloseTo(2, 12);
  });

  it('writes the entries the grid is at, since both read one eased fraction', () => {
    for (const seconds of Object.values(TIMES)) {
      const at = along(seconds);
      const wanted = ENTRIES.map((entry) => (entry.from + (entry.to - entry.from) * at).toFixed(1));
      expect(written(seconds), String(seconds)).toEqual(wanted);
    }
  });

  it('comes back to the identity, which is what makes it a loop', () => {
    expect(written(TIMES.start)).toEqual(['1.0', '0.0', '0.0', '1.0']);
    expect(written(TIMES.half)).toEqual(['2.0', '1.0', '1.0', '1.5']);
    expect(marksAt(mapped, 6).map((mark) => mark.id)).toEqual(marksAt(mapped, 0).map((mark) => mark.id));
  });

  it('cuts the grid at the panel rather than letting it run across the figure', () => {
    const lines = paths(marksAt(mapped, TIMES.quarter)).filter((mark) => mark.id.startsWith('map/plane/grid'));
    expect(lines.length).toBeGreaterThan(10);
    for (const line of lines) {
      expect(line.clip?.x).toEqual({ from: -3, to: 3 });
      expect(line.clip?.y).toEqual({ from: -3, to: 3 });
    }
  });
});
