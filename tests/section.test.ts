import { describe, expect, it } from 'vitest';
import { interval, sectionOf, vec3 } from '@altpsyche/maths';

/**
 * The curve where a plane cuts a surface, checked against the circle a sphere
 * cut by a level plane gives, whose radius is known in closed form.
 */

const sphere = (u: number, v: number) => vec3(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u));
const OVER = { u: interval(0, 2 * Math.PI), v: interval(0, Math.PI) };
const LEVEL = { point: vec3(0, 0, 0.5), normal: vec3(0, 0, 1) };
const TRUE_RADIUS = Math.sqrt(0.75);

const errorAt = (resolution: number) => {
  const runs = sectionOf(sphere, LEVEL, { over: OVER, resolution });
  expect(runs).toHaveLength(1);
  let worst = 0;
  for (const point of runs[0]) worst = Math.max(worst, Math.abs(Math.hypot(point.x, point.y) - TRUE_RADIUS));
  return worst / TRUE_RADIUS;
};

describe('sectionOf', () => {
  it('finds the circle a level plane cuts from a sphere', () => {
    expect(errorAt(24)).toBeLessThan(0.009);
  });

  it('quarters its error when the cells are halved', () => {
    const coarse = errorAt(24);
    const fine = errorAt(48);
    const finer = errorAt(96);
    expect(coarse / fine).toBeGreaterThan(3);
    expect(coarse / fine).toBeLessThan(5);
    expect(fine / finer).toBeGreaterThan(3);
    expect(fine / finer).toBeLessThan(5);
  });

  it('puts every point of the curve on the plane exactly', () => {
    const runs = sectionOf(sphere, LEVEL, { over: OVER, resolution: 24 });
    for (const point of runs[0]) expect(Math.abs(point.z - 0.5)).toBeLessThan(1e-15);
  });

  it('closes the curve, so its two ends are the same point', () => {
    const runs = sectionOf(sphere, LEVEL, { over: OVER, resolution: 24 });
    const run = runs[0];
    const gap = vec3.magnitude(vec3.sub(run[0], run[run.length - 1]));
    expect(gap).toBeLessThan(1e-12);
    expect(run.length).toBeGreaterThan(24);
  });

  it('leaves a curve that runs off the grid open', () => {
    const runs = sectionOf((u, v) => vec3(u, v, u * u), { point: vec3(0, 0, 0.25), normal: vec3(0, 0, 1) }, {
      over: { u: interval(-1, 1), v: interval(-1, 1) },
      resolution: 20,
    });
    expect(runs).toHaveLength(2);
    for (const run of runs) {
      expect(run).toHaveLength(21);
      expect(vec3.magnitude(vec3.sub(run[0], run[run.length - 1]))).toBeGreaterThan(1);
      expect(Math.abs(Math.abs(run[0].x) - 0.5)).toBeLessThan(1e-12);
    }
  });

  it('finds nothing where a plane misses the surface', () => {
    expect(sectionOf(sphere, { point: vec3(0, 0, 4), normal: vec3(0, 0, 1) }, { over: OVER, resolution: 12 })).toHaveLength(0);
  });
});
