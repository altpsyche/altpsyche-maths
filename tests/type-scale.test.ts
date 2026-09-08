import { describe, expect, it } from 'vitest';
import { TEXT_RATIO, textScale, type TextRole } from '../index.js';

const scale = textScale(0.32);

describe('a text scale', () => {
  it('leaves the role it is built from at the size it was given', () => {
    expect(scale.tick).toBe(0.32);
  });

  it('steps by one ratio from each role to the one above it', () => {
    expect(scale.label / scale.tick).toBeCloseTo(TEXT_RATIO, 12);
    expect(scale.note / scale.label).toBeCloseTo(TEXT_RATIO, 12);
    expect(scale.title / scale.note).toBeCloseTo(TEXT_RATIO, 12);
  });

  it('doubles over two steps, which is what the square root of two buys', () => {
    expect(TEXT_RATIO).toBeCloseTo(Math.SQRT2, 15);
    expect(scale.note / scale.tick).toBeGreaterThanOrEqual(2);
    expect(scale.note / scale.tick).toBeCloseTo(2, 12);
    expect(scale.title / scale.label).toBeCloseTo(2, 12);
  });

  it('orders the four roles largest to smallest', () => {
    const roles: readonly TextRole[] = ['title', 'note', 'label', 'tick'];
    const sizes = roles.map((role) => scale[role]);
    for (let at = 1; at < sizes.length; at += 1) expect(sizes[at]).toBeLessThan(sizes[at - 1]);
  });

  it('takes a ratio of its own, so a figure that wants a shallower step says so', () => {
    const shallow = textScale(0.2, 1.25);
    expect(shallow.label).toBeCloseTo(0.25, 12);
    expect(shallow.note).toBeCloseTo(0.3125, 12);
    expect(shallow.title).toBeCloseTo(0.390625, 12);
  });

  it('scales every role together, so two figures in different units share one hierarchy', () => {
    const smaller = textScale(0.16);
    for (const role of ['title', 'note', 'label', 'tick'] as const)
      expect(smaller[role] * 2).toBeCloseTo(scale[role], 12);
  });
});
