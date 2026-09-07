import { describe, expect, it } from 'vitest';
import { areaOf, arc, circle, polygon, rect, vec2 } from '@altpsyche/maths';
import type { Path } from '@altpsyche/maths';

/**
 * The area is Green's theorem in closed form rather than a sampling, so what
 * these check it against is closed forms: pi for a disc, the side squared for a
 * square, and the difference of two discs for a ring.
 */

const ring = (outer: number, inner: number): Path => [
  ...circle(vec2(0, 0), outer),
  ...arc(vec2(0, 0), inner, 0, -2 * Math.PI),
];

describe('how much a path encloses', () => {
  it('encloses pi for a disc of radius 1, up to what four cubics cost a circle', () => {
    const enclosed = areaOf(circle(vec2(0, 0), 1));
    expect(Math.abs(enclosed - Math.PI) / Math.PI).toBeLessThan(6e-4);
  });

  it('encloses the side squared for a square', () => {
    expect(areaOf(rect(vec2(-1, -1), 2, 2))).toBeCloseTo(4, 12);
    expect(areaOf(rect(vec2(3, 7), 2, 5))).toBeCloseTo(10, 12);
  });

  it('encloses the same amount with the opposite sign when the loop is wound the other way', () => {
    const forwards = polygon([vec2(0, 0), vec2(2, 0), vec2(2, 2), vec2(0, 2)]);
    const backwards = polygon([vec2(0, 0), vec2(0, 2), vec2(2, 2), vec2(2, 0)]);
    expect(areaOf(forwards)).toBeCloseTo(4, 12);
    expect(areaOf(backwards)).toBeCloseTo(-4, 12);
  });

  it('encloses the difference of its two discs for a ring', () => {
    const outer = areaOf(circle(vec2(0, 0), 1));
    const inner = areaOf(circle(vec2(0, 0), 0.5));
    expect(areaOf(ring(1, 0.5))).toBeCloseTo(outer - inner, 12);
  });

  it('closes a subpath that was left open before it measures anything', () => {
    const half = arc(vec2(0, 0), 1, 0, Math.PI);
    expect(half[0].closed).toBe(false);
    expect(Math.abs(areaOf(half) - Math.PI / 2) / (Math.PI / 2)).toBeLessThan(6e-4);
  });

  it('encloses nothing where the path is a point or has no pieces', () => {
    expect(areaOf([])).toBe(0);
    expect(areaOf([{ start: vec2(1, 2), curves: [], closed: true }])).toBe(0);
  });
});
