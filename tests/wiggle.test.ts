import { describe, expect, it } from 'vitest';
import { boundsOfMarks, colourFrom, interval, polygon, sameMarks, vec2, wiggle, type Mark } from '../index.js';

const box: Mark = {
  kind: 'path',
  id: 'demo/box',
  path: polygon([vec2(-1, -0.5), vec2(1, -0.5), vec2(1, 0.5), vec2(-1, 0.5)]),
  fill: { colour: colourFrom('#ffffff') },
};
const marks: readonly Mark[] = [box];

/** How much wider the box round the marks is than the one it started as, which
 * is what a swell shows and a rock about the middle also adds to. */
function widthAt(along: number, options = {}): number {
  const before = boundsOfMarks(marks)!;
  const after = boundsOfMarks(wiggle('demo', options)(marks, along))!;
  return interval.span(after.x) / interval.span(before.x);
}

/** Where one named corner has been carried to, which is what says the shape is
 * turned rather than only bigger. */
function corner(along: number, options = {}): { x: number; y: number } {
  const changed = wiggle('demo', options)(marks, along)[0];
  if (changed.kind !== 'path') throw new Error('the wiggle lost the path');
  return changed.path[0].start;
}

describe('a swell and a rock', () => {
  it('leaves the marks exactly as it found them at both ends of the span', () => {
    expect(sameMarks(wiggle('demo')(marks, 0), marks)).toBe(true);
    expect(sameMarks(wiggle('demo')(marks, 1), marks)).toBe(true);
  });

  it('is at the factor it was given at the middle of the span, where the rock is at nothing', () => {
    // Three rocks put a whole number of half turns of the sine at the middle, so
    // the width there is the swell alone.
    expect(widthAt(0.5, { factor: 1.4, angle: 0, rocks: 3 })).toBeCloseTo(1.4, 12);
  });

  it('rocks the shape as far either way as the angle it was given', () => {
    const angle = 0.3;
    const was = Math.atan2(-0.5, -1);
    // A quarter and three quarters of the first of three rocks are where the sine
    // is at one and at minus one, which are the two turns furthest either way.
    const turnedBy = (along: number) => {
      const point = corner(along, { factor: 1, angle, rocks: 3 });
      return Math.atan2(point.y, point.x) - was;
    };
    expect(turnedBy(1 / 12)).toBeCloseTo(angle, 12);
    expect(turnedBy(3 / 12)).toBeCloseTo(-angle, 12);
  });

  it('lands on the geometry it started from after a whole number of rocks', () => {
    for (const rocks of [1, 2, 5]) {
      const changed = wiggle('demo', { factor: 1.3, angle: 0.4, rocks })(marks, 1);
      expect(sameMarks(changed, marks)).toBe(true);
    }
  });

  it('rounds a rock count to a whole number, so a fractional one still returns', () => {
    expect(sameMarks(wiggle('demo', { angle: 0.4, rocks: 2.6 })(marks, 1), marks)).toBe(true);
  });

  it('turns about a point the figure names rather than the middle of the box', () => {
    const named = corner(1 / 12, { factor: 1, angle: 0.3, rocks: 3, pivot: vec2(-1, -0.5) });
    expect(named.x).toBeCloseTo(-1, 12);
    expect(named.y).toBeCloseTo(-0.5, 12);
  });

  it('changes nothing where the name reaches nothing', () => {
    expect(wiggle('nowhere')(marks, 0.5)).toBe(marks);
  });
});
