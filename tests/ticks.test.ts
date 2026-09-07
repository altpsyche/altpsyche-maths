import { describe, expect, it } from 'vitest';
import { interval, labelFor, tickStep, ticksOn } from '../index.js';

const labels = (bounds: { from: number; to: number }, about?: number) => ticksOn(bounds, about).map((tick) => tick.label);
const values = (bounds: { from: number; to: number }, about?: number) => ticksOn(bounds, about).map((tick) => tick.value);

describe('the step between ticks', () => {
  it('is one, two or five times a power of ten', () => {
    expect(tickStep(interval(-1, 4), 6)).toBe(1);
    expect(tickStep(interval(0, 1), 6)).toBe(0.2);
    expect(tickStep(interval(-1, 9), 6)).toBe(2);
    expect(tickStep(interval(0, 100), 6)).toBe(20);
    expect(tickStep(interval(-2, 2), 9)).toBe(0.5);
  });

  it('is the same either way round, because the span has no sign', () => {
    expect(tickStep(interval(4, -1), 6)).toBe(tickStep(interval(-1, 4), 6));
  });

  it('is nothing for an interval with no width or no number', () => {
    expect(tickStep(interval(3, 3), 6)).toBe(0);
    expect(tickStep(interval(0, Infinity), 6)).toBe(0);
    expect(tickStep(interval(0, NaN), 6)).toBe(0);
  });

  it('divides the span as it stands rather than rounding it first', () => {
    // Rounding the span to the next nice number first gives 0.2 here, and 0.2
    // over this interval is three ticks where seven were wanted.
    expect(tickStep(interval(-0.3, 0.3), 7)).toBe(0.1);
    expect(ticksOn(interval(-0.3, 0.3), 7)).toHaveLength(7);
  });
});

describe('the ticks on an interval', () => {
  it('lands on every multiple of the step inside it', () => {
    expect(values(interval(-1, 4), 6)).toEqual([-1, 0, 1, 2, 3, 4]);
    expect(values(interval(0, 100), 6)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('leaves out a bound the step does not reach', () => {
    expect(values(interval(-1, 9), 6)).toEqual([0, 2, 4, 6, 8]);
  });

  it('runs upward whichever way round the interval was given', () => {
    expect(values(interval(4, -1), 6)).toEqual([-1, 0, 1, 2, 3, 4]);
  });

  it('keeps a tick that sits on its own bound', () => {
    // Counted as multiples of the step; reached by repeated addition the last
    // one drifts past the bound and is dropped.
    expect(values(interval(0, 1), 6)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    expect(values(interval(0, 0.5), 6)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5]);
  });

  it('has nothing on an interval with no width', () => {
    expect(ticksOn(interval(3, 3), 6)).toEqual([]);
  });

  it('gives a value equal to the number its own label shows', () => {
    for (const tick of ticksOn(interval(0, 1), 6)) expect(tick.value).toBe(Number(tick.label));
    for (const tick of ticksOn(interval(0, 0.5), 6)) expect(tick.value).toBe(Number(tick.label));
  });
});

describe('a tick label', () => {
  it('carries as many decimals as its step needs and no more', () => {
    expect(labels(interval(-1, 4), 6)).toEqual(['-1', '0', '1', '2', '3', '4']);
    expect(labels(interval(-2, 2), 9)).toEqual(['-2.0', '-1.5', '-1.0', '-0.5', '0.0', '0.5', '1.0', '1.5', '2.0']);
  });

  it('carries no floating point noise', () => {
    // Printed as it stands, three fifths reads 0.6000000000000001 and three
    // tenths reads 0.30000000000000004.
    expect(labels(interval(0, 1), 6)).toEqual(['0.0', '0.2', '0.4', '0.6', '0.8', '1.0']);
    expect(labels(interval(0, 0.5), 6)).toEqual(['0.0', '0.1', '0.2', '0.3', '0.4', '0.5']);
    for (const label of labels(interval(0, 1), 6)) expect(label).not.toMatch(/\d{6,}/);
  });

  it('never prints a signed zero', () => {
    expect(labelFor(-0, 1)).toBe('0');
    expect(labelFor(-1e-18, 0.01)).toBe('0.00');
    expect(labelFor(-0.0004, 0.01)).toBe('0.00');
  });

  it('takes its decimals from the step rather than from the value', () => {
    expect(labelFor(1, 0.01)).toBe('1.00');
    expect(labelFor(1.005, 1)).toBe('1');
    expect(labelFor(40, 20)).toBe('40');
  });
});
