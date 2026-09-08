import { describe, expect, it } from 'vitest';
import { coordsOf, interval, pointOf, scaleOf, toUnits, toGraph } from '../index.js';

// The demo's own coords: five graph units across onto 9.2 figure units, and ten
// graph units up onto 4.8.
const across = scaleOf(interval(-1, 4), interval(-4.6, 4.6));
const up = scaleOf(interval(-1, 9), interval(-2.4, 2.4));
const coords = coordsOf(across, up);

describe('a scale', () => {
  it('puts each end of the graph at each end of the units', () => {
    expect(toUnits(across, -1)).toBeCloseTo(-4.6, 12);
    expect(toUnits(across, 4)).toBeCloseTo(4.6, 12);
  });

  it('reads a place back as a number on the axis', () => {
    expect(toGraph(across, -4.6)).toBeCloseTo(-1, 12);
    expect(toGraph(across, 4.6)).toBeCloseTo(4, 12);
    expect(toGraph(across, 0)).toBeCloseTo(1.5, 12);
  });

  it('carries a number past the end of the graph past the end of the units', () => {
    expect(toUnits(across, 9)).toBeCloseTo(13.8, 12);
    expect(toUnits(across, -6)).toBeCloseTo(-13.8, 12);
  });

  it('runs backwards where the units are given the other way round', () => {
    const down = scaleOf(interval(0, 9), interval(2.4, -2.4));
    expect(toUnits(down, 0)).toBeCloseTo(2.4, 12);
    expect(toUnits(down, 9)).toBeCloseTo(-2.4, 12);
  });

  it('round trips a thousand samples back to where they started', () => {
    let worst = 0;
    for (const scale of [across, up]) {
      for (let step = 0; step <= 1000; step++) {
        const value = interval.at(scale.graph, step / 1000);
        worst = Math.max(worst, Math.abs(toGraph(scale, toUnits(scale, value)) - value));
      }
    }
    expect(worst).toBeLessThan(1e-12);
  });
});

describe('a pair of scales', () => {
  it('turns a pair of graph numbers into a point', () => {
    const origin = pointOf(coords, 0, 0);
    expect(origin.x).toBeCloseTo(-2.76, 12);
    expect(origin.y).toBeCloseTo(-1.92, 12);
  });

  it('puts the far corner of the graph at the far corner of the units', () => {
    const corner = pointOf(coords, 4, 9);
    expect(corner.x).toBeCloseTo(4.6, 12);
    expect(corner.y).toBeCloseTo(2.4, 12);
  });

  it('places a point outside both intervals outside the units', () => {
    const beyond = pointOf(coords, 6, -4);
    expect(beyond.x).toBeCloseTo(8.28, 12);
    expect(beyond.y).toBeCloseTo(-3.84, 12);
    expect(interval.holds(across.units, beyond.x)).toBe(false);
    expect(interval.holds(up.units, beyond.y)).toBe(false);
  });

  it('scales each axis on its own, since the two spans differ', () => {
    // One graph unit across is 1.84 figure units and one up is 0.48, so a
    // shared factor would put the curve in the wrong place on one of them.
    expect(toUnits(across, 1) - toUnits(across, 0)).toBeCloseTo(1.84, 12);
    expect(toUnits(up, 1) - toUnits(up, 0)).toBeCloseTo(0.48, 12);
  });
});
