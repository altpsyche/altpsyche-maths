import { describe, expect, it } from 'vitest';
import { areaOf, circle, lengthOf, line, outlinePath, plot, polyline, rect, vec2 } from '@altpsyche/maths';
import type { Path, Vec2 } from '@altpsyche/maths';
import { coords, curve } from '../demos/tangent.js';

/**
 * A stroke drawn as geometry rather than as a painter's setting.
 *
 * The reading throughout is area, because the outline of a stroke of width w
 * over a length L covers Lw wherever the two sides do not run into each other:
 * what one side loses to a bend the other gains. So a shape whose length and
 * corners are known has an area that is known, and the outline is held to it.
 */

const corners = (path: Path): Vec2[] => [path[0].start, ...path[0].curves.slice(0, -1).map((piece) => piece.to)];

describe('the outline of a stroked path', () => {
  it('gives a straight segment the rectangle it must be', () => {
    const outline = outlinePath(line(vec2(0, 0), vec2(2, 0)), 0.4);
    expect(outline).toHaveLength(1);
    const points = corners(outline);
    expect(points).toHaveLength(4);
    const want = [vec2(0, 0.2), vec2(2, 0.2), vec2(2, -0.2), vec2(0, -0.2)];
    points.forEach((point, at) => {
      expect(point.x).toBeCloseTo(want[at].x, 12);
      expect(point.y).toBeCloseTo(want[at].y, 12);
    });
    expect(Math.abs(areaOf(outline))).toBeCloseTo(0.8, 12);
  });

  it('covers the ring a stroked circle covers', () => {
    const radius = 1;
    const width = 0.1;
    const ring = Math.PI * ((radius + width / 2) ** 2 - (radius - width / 2) ** 2);
    const outline = outlinePath(circle(vec2(0, 0), radius), width);
    expect(Math.abs(Math.abs(areaOf(outline)) - ring) / ring).toBeLessThan(1e-4);
  });

  it('winds the two loops of a closed path against each other, so the middle is empty', () => {
    const outline = outlinePath(circle(vec2(0, 0), 1), 0.1);
    expect(outline).toHaveLength(2);
    expect(Math.sign(areaOf([outline[0]]))).toBe(-Math.sign(areaOf([outline[1]])));
  });

  it('covers what the parabola of the flat demo covers at the width it is drawn', () => {
    const width = 0.05;
    const parabola = plot(coords, curve);
    const strip = lengthOf(parabola) * width;
    const outline = outlinePath(parabola, width);
    expect(Math.abs(Math.abs(areaOf(outline)) - strip) / strip).toBeLessThan(1e-4);
  });
});

describe('the ends of an open stroke', () => {
  const length = 2;
  const width = 0.4;
  const straightOutline = (cap: 'butt' | 'round' | 'square') =>
    Math.abs(areaOf(outlinePath(line(vec2(0, 0), vec2(length, 0)), width, { cap })));

  it('stops at the ends under a butt cap', () => {
    expect(straightOutline('butt')).toBeCloseTo(length * width, 12);
  });

  it('reaches half the width past each end under a square cap', () => {
    expect(straightOutline('square')).toBeCloseTo((length + width) * width, 12);
  });

  it('adds a half disc at each end under a round cap', () => {
    const want = length * width + Math.PI * (width / 2) ** 2;
    expect(Math.abs(straightOutline('round') - want) / want).toBeLessThan(1e-3);
  });

  it('draws a stroked point as its cap alone', () => {
    const point: Path = [{ start: vec2(0, 0), curves: [{ control1: vec2(0, 0), control2: vec2(0, 0), to: vec2(0, 0) }], closed: false }];
    expect(Math.abs(areaOf(outlinePath(point, 0.4, { cap: 'round' })))).toBeGreaterThan(0.12);
    expect(Math.abs(areaOf(outlinePath(point, 0.4, { cap: 'square' })))).toBeCloseTo(0.16, 12);
    expect(outlinePath(point, 0.4)).toEqual([]);
  });
});

describe('the corners of a stroked path', () => {
  const side = 2;
  const width = 0.1;
  const square = rect(vec2(-1, -1), side, side);
  const cornered = (join: 'miter' | 'round' | 'bevel') => Math.abs(areaOf(outlinePath(square, width, { join })));
  const filled = 4 * side * width;

  it('fills the whole corner under a miter join', () => {
    expect(cornered('miter')).toBeCloseTo(filled, 12);
  });

  it('cuts each corner to a triangle under a bevel join', () => {
    expect(cornered('bevel')).toBeCloseTo(filled - width ** 2 / 2, 12);
  });

  it('rounds each corner to a quarter disc under a round join', () => {
    const want = filled - width ** 2 * (1 - Math.PI / 4);
    expect(Math.abs(cornered('round') - want) / want).toBeLessThan(1e-3);
  });

  it('cuts a miter back to a bevel where the corner reaches past the limit', () => {
    // A spike doubling back on itself: the miter runs away as the angle closes,
    // and the limit is what stops the outline reaching further than the corner.
    const spike = polyline([vec2(0, 0), vec2(1, 0), vec2(0, 0.02)]);
    const limit = 4;
    const half = 0.05;
    const past = (outline: Path) => Math.max(...corners(outline).map((point) => point.x - 1));
    expect(past(outlinePath(spike, half * 2, { join: 'miter', miterLimit: limit }))).toBeLessThanOrEqual(limit * half);
    expect(past(outlinePath(spike, half * 2, { join: 'miter', miterLimit: 1000 }))).toBeGreaterThan(4);
  });
});

describe('the flattening the outline is built on', () => {
  it('spends points on a curve in step with the tolerance asked for', () => {
    const parabola = plot(coords, curve);
    const fine = outlinePath(parabola, 0.05, { tolerance: 1e-4 });
    const coarse = outlinePath(parabola, 0.05, { tolerance: 1e-2 });
    expect(fine[0].curves.length).toBeGreaterThan(coarse[0].curves.length);
  });

  it('has no outline for a width of nothing or less', () => {
    expect(outlinePath(circle(vec2(0, 0), 1), 0)).toEqual([]);
    expect(outlinePath(circle(vec2(0, 0), 1), -1)).toEqual([]);
  });
});
