import { describe, expect, it } from 'vitest';
import { areaOf, circle, differenceOf, intersectionOf, polygon, rect, unionOf, vec2 } from '@altpsyche/maths';
import type { Path } from '@altpsyche/maths';

/**
 * Every answer here is checked against a closed form. Two discs of the same
 * radius whose centres are a known distance apart overlap in a lens whose area
 * is written out below, and the union and the difference follow from it.
 *
 * The union and the difference are held to 6e-4 of the amount, which is what
 * four cubics already cost a circle rather than anything the operations add.
 * The overlap is held to an amount rather than to a share: an edge that is
 * 2.7e-4 out in radius moves the area by that times the length of the edge, and
 * as two discs draw apart the overlap shrinks towards nothing while its edge
 * does not, so a share of it grows without anything having gone wrong.
 */

/** The area two discs of one radius share when their centres are this far
 * apart. */
const lens = (radius: number, apart: number): number =>
  2 * radius * radius * Math.acos(apart / (2 * radius)) -
  (apart / 2) * Math.sqrt(4 * radius * radius - apart * apart);

const CIRCLE_ERROR = 6e-4;

/** What the edge of an overlap of two unit discs can move its area by: the
 * longest that edge gets, which is the whole circle, times the 2.8e-4 in radius
 * four cubics cost a circle. */
const EDGE_ERROR = 2 * Math.PI * 2.8e-4;

const encloses = (path: Path, wanted: number) => {
  expect(Math.abs(areaOf(path) - wanted) / Math.abs(wanted)).toBeLessThan(CIRCLE_ERROR);
};

const enclosesWithin = (path: Path, wanted: number, allowance: number) => {
  expect(Math.abs(areaOf(path) - wanted)).toBeLessThan(allowance);
};

const disc = (x: number, radius = 1) => circle(vec2(x, 0), radius);

describe('union, intersection and difference', () => {
  it('encloses what the lens formula says for two discs that overlap', () => {
    const first = disc(0);
    const second = disc(1);
    const shared = lens(1, 1);
    enclosesWithin(intersectionOf(first, second), shared, EDGE_ERROR);
    encloses(unionOf(first, second), 2 * Math.PI - shared);
    encloses(differenceOf(first, second), Math.PI - shared);
  });

  it('encloses what the lens formula says at three distances apart', () => {
    for (const apart of [0.5, 1, 1.5]) {
      const shared = lens(1, apart);
      enclosesWithin(intersectionOf(disc(0), disc(apart)), shared, EDGE_ERROR);
      encloses(unionOf(disc(0), disc(apart)), 2 * Math.PI - shared);
      encloses(differenceOf(disc(0), disc(apart)), Math.PI - shared);
    }
  });

  it('answers two discs that miss with both, with nothing, and with the first', () => {
    const first = disc(0);
    const second = disc(5);
    const union = unionOf(first, second);
    expect(union.length).toBe(2);
    encloses(union, 2 * Math.PI);
    expect(intersectionOf(first, second).length).toBe(0);
    encloses(differenceOf(first, second), Math.PI);
  });

  it('answers one disc inside another with the outer, the inner, and a ring', () => {
    const outer = circle(vec2(0, 0), 1);
    const inner = circle(vec2(0, 0), 0.5);
    encloses(unionOf(outer, inner), Math.PI);
    expect(unionOf(outer, inner).length).toBe(1);
    encloses(intersectionOf(outer, inner), Math.PI / 4);
    const ring = differenceOf(outer, inner);
    expect(ring.length).toBe(2);
    expect(areaOf(ring)).toBeCloseTo(areaOf(outer) - areaOf(inner), 12);
  });

  it('keeps the picture whole through the moment two discs touch at one point', () => {
    const union = unionOf(disc(0), disc(2));
    expect(union.length).toBe(2);
    encloses(union, 2 * Math.PI);
    expect(intersectionOf(disc(0), disc(2)).length).toBe(0);
    encloses(differenceOf(disc(0), disc(2)), Math.PI);
  });

  it('works on squares as well as on discs', () => {
    const left = rect(vec2(0, 0), 2, 2);
    const right = rect(vec2(1, 1), 2, 2);
    expect(areaOf(intersectionOf(left, right))).toBeCloseTo(1, 9);
    expect(areaOf(unionOf(left, right))).toBeCloseTo(7, 9);
    expect(areaOf(differenceOf(left, right))).toBeCloseTo(3, 9);
  });

  it('takes a bite out of a square with a disc', () => {
    const square = rect(vec2(-1, -1), 2, 2);
    const bite = circle(vec2(1, 1), 1);
    const quarter = areaOf(circle(vec2(0, 0), 1)) / 4;
    encloses(differenceOf(square, bite), 4 - quarter);
    encloses(intersectionOf(square, bite), quarter);
  });

  it('unites two rectangles that share an edge into one', () => {
    const left = rect(vec2(0, 0), 2, 2);
    const right = rect(vec2(2, 0), 2, 2);
    const union = unionOf(left, right);
    expect(union).toHaveLength(1);
    expect(areaOf(union)).toBeCloseTo(8, 9);
    expect(areaOf(differenceOf(left, right))).toBeCloseTo(4, 9);
    expect(intersectionOf(left, right)).toHaveLength(0);
  });

  it('unites two triangles that share their diagonal into one', () => {
    const lower = polygon([vec2(0, 0), vec2(2, 0), vec2(0, 2)]);
    const upper = polygon([vec2(2, 0), vec2(2, 2), vec2(0, 2)]);
    const union = unionOf(lower, upper);
    expect(union).toHaveLength(1);
    expect(areaOf(union)).toBeCloseTo(4, 9);
  });

  it('unites two rectangles that share part of an edge', () => {
    const lower = rect(vec2(0, 0), 2, 2);
    const upper = rect(vec2(1, 2), 2, 2);
    expect(areaOf(unionOf(lower, upper))).toBeCloseTo(8, 9);
  });

  it('answers a path against itself', () => {
    // A shared stretch the two walk the same way is on the edge of a union and
    // of an overlap and is kept once, and a difference has nothing there.
    const square = rect(vec2(0, 0), 2, 2);
    expect(areaOf(unionOf(square, square))).toBeCloseTo(4, 9);
    expect(areaOf(intersectionOf(square, square))).toBeCloseTo(4, 9);
    expect(differenceOf(square, square)).toHaveLength(0);
  });

  it('answers an empty path with the other path', () => {
    const disc = circle(vec2(0, 0), 1);
    expect(unionOf([], disc)).toEqual(disc);
    expect(unionOf(disc, [])).toEqual(disc);
    expect(intersectionOf([], disc).length).toBe(0);
    expect(differenceOf(disc, []).length).toBe(1);
  });
});
