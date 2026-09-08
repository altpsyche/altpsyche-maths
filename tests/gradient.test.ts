import { describe, expect, it } from 'vitest';
import { flatten, group, mat3, rotate, scale, shape, text, transformFill, vec2, circle, marksAt, Timeline, linear } from '@altpsyche/maths';
import type { Figure, Fill, Gradient, Mark } from '@altpsyche/maths';

/**
 * A fill painted with more than one colour.
 *
 * A gradient is stops along a straight axis, and the axis is two points in the
 * mark's own units. What that buys is the transform: a group that moves, turns
 * or scales its children carries the axis with the geometry, so the gradient
 * stays where it was drawn against the shape rather than against the page.
 */

const wash: Gradient = {
  from: vec2(0, 0),
  to: vec2(2, 0),
  stops: [
    { offset: 0, colour: '#012' },
    { offset: 0.5, colour: '#345' },
    { offset: 1, colour: '#678' },
  ],
};

const washed: Fill = { colour: '#345', gradient: wash };

const gradientOf = (mark: Mark | undefined): Gradient => {
  const fill = mark?.kind === 'path' || mark?.kind === 'text' ? mark.fill : undefined;
  if (!fill?.gradient) throw new Error('the mark carries no gradient');
  return fill.gradient;
};

describe('a fill that is a gradient', () => {
  it('reads its stops back off a mark in the order they were given', () => {
    const marks = flatten(shape('disc', circle(vec2(0, 0), 1), { fill: washed }));
    const read = gradientOf(marks[0]);
    expect(read.stops.map((stop) => stop.offset)).toEqual([0, 0.5, 1]);
    expect(read.stops.map((stop) => stop.colour)).toEqual(['#012', '#345', '#678']);
  });

  it('keeps the one colour beside the stops, which is what a contrast reading takes', () => {
    const marks = flatten(shape('disc', circle(vec2(0, 0), 1), { fill: washed }));
    expect(marks[0].kind === 'path' && marks[0].fill?.colour).toBe('#345');
  });

  it('hands back a fill of one colour untouched', () => {
    const flat: Fill = { colour: '#111' };
    expect(transformFill(flat, mat3.scaling(vec2(3, 3)))).toBe(flat);
  });
});

describe('the axis of a gradient under a transform', () => {
  it('is carried by a group the way the geometry is', () => {
    const inside = shape('disc', circle(vec2(0, 0), 1), { fill: washed });
    const moved = mat3.multiply(mat3.translation(vec2(5, 1)), mat3.scaling(vec2(3, 3)));
    const read = gradientOf(flatten(group('all', [inside], { transform: moved }))[0]);
    expect(read.from).toEqual(vec2(5, 1));
    expect(read.to).toEqual(vec2(11, 1));
  });

  it('is carried under a text mark as well, since text takes a fill too', () => {
    const written = text('word', vec2(0, 0), 'x', 0.3, { fill: washed });
    const read = gradientOf(flatten(group('all', [written], { transform: mat3.scaling(vec2(2, 2)) }))[0]);
    expect(read.to).toEqual(vec2(4, 0));
  });

  it('leaves the stops alone, since a stop is a share of the axis rather than a place', () => {
    const inside = shape('disc', circle(vec2(0, 0), 1), { fill: washed });
    const read = gradientOf(flatten(group('all', [inside], { transform: mat3.scaling(vec2(3, 3)) }))[0]);
    expect(read.stops).toEqual(wash.stops);
  });

  it('turns with a mark an animation turns', () => {
    const figure: Figure = {
      extent: { width: 8, height: 8 },
      still: 1,
      scene: shape('disc', circle(vec2(0, 0), 1), { fill: washed }),
      timeline: Timeline.empty().play(rotate('disc', Math.PI / 2), 1, { curve: linear }),
    };
    const read = gradientOf(marksAt(figure, 1)[0]);
    // A quarter turn about the shape's own middle takes the axis from lying
    // along x to lying along y.
    expect(read.to.x).toBeCloseTo(0, 12);
    expect(read.to.y).toBeCloseTo(2, 12);
  });

  it('grows with a mark an animation scales', () => {
    const figure: Figure = {
      extent: { width: 8, height: 8 },
      still: 1,
      scene: shape('disc', circle(vec2(0, 0), 1), { fill: washed }),
      timeline: Timeline.empty().play(scale('disc', 2), 1, { curve: linear }),
    };
    const read = gradientOf(marksAt(figure, 1)[0]);
    // The disc is scaled about its own middle, which is where the axis begins,
    // so that end holds still and the far end goes twice as far out.
    expect(read.from.x).toBeCloseTo(0, 12);
    expect(read.to.x).toBeCloseTo(4, 12);
  });
});
