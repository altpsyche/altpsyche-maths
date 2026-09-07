import { describe, expect, it } from 'vitest';
import { interval } from '../index.js';

describe('an interval', () => {
  it('reports its width without a sign, either way round', () => {
    expect(interval.span(interval(-1, 4))).toBe(5);
    expect(interval.span(interval(4, -1))).toBe(5);
    expect(interval.span(interval(2, 2))).toBe(0);
  });

  it('holds both of its bounds and nothing outside them', () => {
    const graph = interval(-1, 4);
    expect(interval.holds(graph, -1)).toBe(true);
    expect(interval.holds(graph, 4)).toBe(true);
    expect(interval.holds(graph, 0)).toBe(true);
    expect(interval.holds(graph, -1.0001)).toBe(false);
    expect(interval.holds(graph, 4.0001)).toBe(false);
  });

  it('holds the same values when it is given the other way round', () => {
    const down = interval(4, -1);
    expect(interval.holds(down, -1)).toBe(true);
    expect(interval.holds(down, 4)).toBe(true);
    expect(interval.holds(down, 5)).toBe(false);
  });

  it('puts the lower bound first when asked in order, and leaves it alone otherwise', () => {
    expect(interval.ordered(interval(4, -1))).toEqual({ from: -1, to: 4 });
    expect(interval.ordered(interval(-1, 4))).toEqual({ from: -1, to: 4 });
  });

  it('reads a fraction along, and past either bound outside zero to one', () => {
    const graph = interval(-1, 4);
    expect(interval.at(graph, 0)).toBe(-1);
    expect(interval.at(graph, 1)).toBe(4);
    expect(interval.at(graph, 0.5)).toBe(1.5);
    expect(interval.at(graph, -0.2)).toBe(-2);
    expect(interval.at(graph, 1.2)).toBe(5);
  });

  it('holds a value inside its bounds, whichever way round they are', () => {
    expect(interval.clampTo(interval(-1, 4), 9)).toBe(4);
    expect(interval.clampTo(interval(4, -1), 9)).toBe(4);
    expect(interval.clampTo(interval(4, -1), -9)).toBe(-1);
    expect(interval.clampTo(interval(-1, 4), 2)).toBe(2);
  });

  it('reads a place in one interval at the same place in another', () => {
    const graph = interval(-1, 4);
    const units = interval(-4.6, 4.6);
    expect(interval.remap(-1, graph, units)).toBeCloseTo(-4.6, 12);
    expect(interval.remap(4, graph, units)).toBeCloseTo(4.6, 12);
    expect(interval.remap(1.5, graph, units)).toBeCloseTo(0, 12);
  });

  it('maps in reverse where either interval is given the other way round', () => {
    expect(interval.remap(4, interval(4, -1), interval(0, 1))).toBeCloseTo(0, 12);
    expect(interval.remap(-1, interval(4, -1), interval(0, 1))).toBeCloseTo(1, 12);
    expect(interval.remap(0, interval(0, 1), interval(1, 0))).toBeCloseTo(1, 12);
  });

  it('round trips a thousand samples back to where they started', () => {
    const graph = interval(-1, 4);
    const units = interval(-4.6, 4.6);
    let worst = 0;
    for (let step = 0; step <= 1000; step++) {
      const value = interval.at(graph, step / 1000);
      const back = interval.remap(interval.remap(value, graph, units), units, graph);
      worst = Math.max(worst, Math.abs(back - value));
    }
    expect(worst).toBeLessThan(1e-12);
  });

  it('round trips through a reversed target as well', () => {
    const graph = interval(0, 9);
    const units = interval(2.4, -2.4);
    let worst = 0;
    for (let step = 0; step <= 1000; step++) {
      const value = interval.at(graph, step / 1000);
      const back = interval.remap(interval.remap(value, graph, units), units, graph);
      worst = Math.max(worst, Math.abs(back - value));
    }
    expect(worst).toBeLessThan(1e-12);
  });

  it('reports the target start rather than an infinity where the source has no width', () => {
    const flat = interval(3, 3);
    const units = interval(-1, 1);
    expect(interval.remap(3, flat, units)).toBe(-1);
    expect(Number.isFinite(interval.remap(9, flat, units))).toBe(true);
  });
});
