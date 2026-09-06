import { describe, expect, it } from 'vitest';
import { arc, circle, line, mat3, pointCount, pointOn, polygon, polyline, rect, straight, transformPath, vec2 } from '@altpsyche/maths';
import type { Path } from '@altpsyche/maths';

/**
 * Every shape is cubics, a straight line included, which is what makes two paths
 * walkable into one another. These check that each builder produces the segments
 * it claims and that a curve passes where it should.
 */

const radius = (path: Path, centre = vec2(0, 0), steps = 400): number[] => {
  const readings: number[] = [];
  for (const subpath of path) {
    let from = subpath.start;
    for (const curve of subpath.curves) {
      for (let at = 0; at <= steps; at++) {
        const point = pointOn(from, curve, at / steps);
        readings.push(Math.hypot(point.x - centre.x, point.y - centre.y));
      }
      from = curve.to;
    }
  }
  return readings;
};

describe('straight', () => {
  it('places both controls on the line, a third and two thirds along', () => {
    const curve = straight(vec2(0, 0), vec2(3, 3));
    expect(curve.control1).toEqual({ x: 1, y: 1 });
    expect(curve.control2).toEqual({ x: 2, y: 2 });
    expect(curve.to).toEqual({ x: 3, y: 3 });
  });

  it('travels at an even pace, which is what that placement buys', () => {
    const curve = straight(vec2(0, 0), vec2(10, 0));
    expect(pointOn(vec2(0, 0), curve, 0.25).x).toBeCloseTo(2.5, 10);
    expect(pointOn(vec2(0, 0), curve, 0.5).x).toBeCloseTo(5, 10);
    expect(pointOn(vec2(0, 0), curve, 0.75).x).toBeCloseTo(7.5, 10);
  });
});

describe('builders', () => {
  it('makes a line one open segment', () => {
    const path = line(vec2(0, 0), vec2(1, 1));
    expect(path).toHaveLength(1);
    expect(path[0].curves).toHaveLength(1);
    expect(path[0].closed).toBe(false);
  });

  it('leaves a polyline open and closes a polygon back to its start', () => {
    const points = [vec2(0, 0), vec2(1, 0), vec2(1, 1)];
    expect(polyline(points)[0].curves).toHaveLength(2);
    expect(polyline(points)[0].closed).toBe(false);
    expect(polygon(points)[0].curves).toHaveLength(3);
    expect(polygon(points)[0].closed).toBe(true);
  });

  it('has nothing to draw for fewer than two points', () => {
    expect(polyline([])).toEqual([]);
    expect(polyline([vec2(0, 0)])).toEqual([]);
  });

  it('draws a rectangle as four closed sides from its corner', () => {
    const path = rect(vec2(0, 0), 4, 2);
    expect(path[0].curves).toHaveLength(4);
    expect(path[0].closed).toBe(true);
    expect(path[0].curves[1].to).toEqual({ x: 4, y: 2 });
  });
});

describe('circle', () => {
  it('is four quarters, closed', () => {
    const path = circle(vec2(0, 0), 1);
    expect(path[0].curves).toHaveLength(4);
    expect(path[0].closed).toBe(true);
  });

  it('never leaves the true radius by more than 2.7 parts in ten thousand', () => {
    const worst = Math.max(...radius(circle(vec2(0, 0), 1)).map((r) => Math.abs(r - 1)));
    expect(worst).toBeLessThan(2.8e-4);
    expect(worst).toBeGreaterThan(2.6e-4);
  });

  it('holds that accuracy away from the origin and at another size', () => {
    const centre = vec2(-3, 7);
    const worst = Math.max(...radius(circle(centre, 5), centre).map((r) => Math.abs(r - 5)));
    expect(worst / 5).toBeLessThan(2.8e-4);
  });
});

describe('arc', () => {
  it('has nothing to draw for no sweep and no radius', () => {
    expect(arc(vec2(0, 0), 1, 0, 0)).toEqual([]);
    expect(arc(vec2(0, 0), 0, 0, 1)).toEqual([]);
  });

  it('cuts a sweep into pieces of a quarter turn or less', () => {
    expect(arc(vec2(0, 0), 1, 0, Math.PI / 2)[0].curves).toHaveLength(1);
    expect(arc(vec2(0, 0), 1, 0, Math.PI)[0].curves).toHaveLength(2);
    expect(arc(vec2(0, 0), 1, 0, Math.PI * 2)[0].curves).toHaveLength(4);
  });

  it('stays on its radius, which is why the pieces are cut at all', () => {
    const worst = Math.max(...radius(arc(vec2(0, 0), 1, 0, Math.PI * 1.5)).map((r) => Math.abs(r - 1)));
    expect(worst).toBeLessThan(3e-4);
  });

  it('starts and ends where it was asked to', () => {
    const path = arc(vec2(0, 0), 2, 0, Math.PI / 2);
    expect(path[0].start.x).toBeCloseTo(2, 10);
    expect(path[0].start.y).toBeCloseTo(0, 10);
    const last = path[0].curves[path[0].curves.length - 1].to;
    expect(last.x).toBeCloseTo(0, 10);
    expect(last.y).toBeCloseTo(2, 10);
  });

  it('runs the other way round for a sweep that goes backwards', () => {
    const path = arc(vec2(0, 0), 1, 0, -Math.PI / 2);
    const last = path[0].curves[path[0].curves.length - 1].to;
    expect(last.y).toBeCloseTo(-1, 10);
  });
});

describe('transformPath and pointCount', () => {
  it('moves every point, controls included', () => {
    const moved = transformPath(line(vec2(0, 0), vec2(3, 3)), mat3.translation(vec2(10, 0)));
    expect(moved[0].start).toEqual({ x: 10, y: 0 });
    expect(moved[0].curves[0].control1).toEqual({ x: 11, y: 1 });
    expect(moved[0].curves[0].to).toEqual({ x: 13, y: 3 });
  });

  it('counts a start plus three points a segment, which is what two paths must agree on', () => {
    expect(pointCount(line(vec2(0, 0), vec2(1, 1)))).toBe(4);
    expect(pointCount(circle(vec2(0, 0), 1))).toBe(13);
    expect(pointCount([])).toBe(0);
  });
});
