import { describe, expect, it } from 'vitest';
import { interval, streamlineOf, vec2 } from '@altpsyche/maths';
import type { Vec2 } from '@altpsyche/maths';

/**
 * The integrator is checked against the field that turns a point about the
 * origin, whose streamline is a circle of the seed's own radius.
 */

const turning = (at: Vec2) => vec2(-at.y, at.x);

/** One whole turn walked in a named number of steps, from a seed at radius one. */
const turn = (steps: number) => streamlineOf(turning, vec2(1, 0), { step: (2 * Math.PI) / steps, steps });

/** The worst the radius wanders over that turn, which is the error across the
 * curve. */
const radiusError = (steps: number) => {
  let worst = 0;
  for (const point of turn(steps)) worst = Math.max(worst, Math.abs(Math.hypot(point.x, point.y) - 1));
  return worst;
};

/** How far the far end lands from the seed it should have returned to, which is
 * the error along the curve. */
const endError = (steps: number) => {
  const points = turn(steps);
  const last = points[points.length - 1];
  return Math.hypot(last.x - 1, last.y);
};

describe('streamlineOf', () => {
  it('walks a circle through the field that turns a point about the origin', () => {
    expect(radiusError(64)).toBeLessThan(3e-7);
    expect(endError(64)).toBeLessThan(2e-6);
  });

  it('divides the error along the curve by about sixteen when the step is halved', () => {
    const coarse = endError(256);
    const fine = endError(512);
    const finer = endError(1024);
    expect(coarse / fine).toBeGreaterThan(13);
    expect(coarse / fine).toBeLessThan(18);
    expect(fine / finer).toBeGreaterThan(13);
    expect(fine / finer).toBeLessThan(18);
  });

  it('holds the radius better than that, since the step is an arc length', () => {
    const coarse = radiusError(32);
    const fine = radiusError(64);
    expect(coarse / fine).toBeGreaterThan(26);
    expect(coarse / fine).toBeLessThan(38);
    expect(radiusError(64) / radiusError(128)).toBeGreaterThan(26);
  });

  it('steps one step of graph units at a time, whatever the field is worth', () => {
    const fast = (at: Vec2) => vec2(-at.y * 1000, at.x * 1000);
    const points = streamlineOf(fast, vec2(1, 0), { step: 0.01, steps: 20 });
    for (let at = 1; at < points.length; at += 1) {
      expect(Math.hypot(points[at].x - points[at - 1].x, points[at].y - points[at - 1].y)).toBeCloseTo(0.01, 6);
    }
  });

  it('stops where the run leaves the region', () => {
    const rightwards = () => vec2(1, 0);
    const points = streamlineOf(rightwards, vec2(0, 0), {
      step: 0.1,
      steps: 500,
      within: { x: interval(-1, 1), y: interval(-1, 1) },
    });
    expect(points).toHaveLength(11);
    expect(points[points.length - 1].x).toBeCloseTo(1, 12);
  });

  it('stops on its step cap where the region has no edge to reach', () => {
    const rightwards = () => vec2(1, 0);
    expect(streamlineOf(rightwards, vec2(0, 0), { step: 0.1, steps: 40 })).toHaveLength(41);
  });

  it('hands back one point for a seed outside the region', () => {
    const points = streamlineOf(turning, vec2(9, 9), {
      step: 0.1,
      steps: 500,
      within: { x: interval(-1, 1), y: interval(-1, 1) },
    });
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual(vec2(9, 9));
  });

  it('stops on the vanished field rather than running to its cap', () => {
    const nothing = () => vec2(0, 0);
    expect(streamlineOf(nothing, vec2(0, 0), { step: 0.1, steps: 500 })).toHaveLength(1);
  });

  it('stops where the field vanishes partway along a run', () => {
    const dying = (at: Vec2) => (at.x < 0.5 ? vec2(1, 0) : vec2(0, 0));
    const points = streamlineOf(dying, vec2(0, 0), { step: 0.1, steps: 500 });
    expect(points.length).toBeLessThan(10);
    expect(points[points.length - 1].x).toBeLessThan(0.6);
  });

  it('runs both ways from its seed, reading from one end to the other', () => {
    const rightwards = () => vec2(1, 0);
    const points = streamlineOf(rightwards, vec2(0, 0), { step: 0.1, steps: 10, direction: 'both' });
    expect(points).toHaveLength(21);
    expect(points[0].x).toBeCloseTo(-1, 12);
    expect(points[10].x).toBeCloseTo(0, 12);
    expect(points[20].x).toBeCloseTo(1, 12);
  });

  it('runs the other way on its own', () => {
    const rightwards = () => vec2(1, 0);
    const points = streamlineOf(rightwards, vec2(0, 0), { step: 0.1, steps: 5, direction: 'backward' });
    expect(points).toHaveLength(6);
    expect(points[0].x).toBeCloseTo(-0.5, 12);
    expect(points[points.length - 1].x).toBeCloseTo(0, 12);
  });
});
