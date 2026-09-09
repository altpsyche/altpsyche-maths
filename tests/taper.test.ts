import { describe, expect, it } from 'vitest';
import { areaOf, colourFrom, draw, flatten, flattenPath, group, hexOf, interval, line, linear, marksAt, mat3, nearestEdge, outlinedMarks, outlinePath, plot, pointAlong, shape, svgMarkup, tangentAt, Timeline, trimPath, vec2, widestWidth, widthAt } from '@altpsyche/maths';
import type { Colour, Figure, Mark, Taper } from '@altpsyche/maths';
import { coords, curve } from '../demos/tangent.js';

/**
 * A stroke whose width changes along its length.
 *
 * A taper is two numbers and the name of the curve the width leaves the first
 * along, so a figure written as a file can carry one. What it draws as is the
 * filled outline of its own path, and the reading is the width the outline has
 * where the taper says it should have it.
 */

describe('the width a stroke has along its length', () => {
  it('is the same number everywhere for a stroke of one width', () => {
    expect(widthAt(0.4, 0)).toBe(0.4);
    expect(widthAt(0.4, 0.37)).toBe(0.4);
    expect(widthAt(0.4, 1)).toBe(0.4);
  });

  it('leaves the first number for the second along the length', () => {
    const taper: Taper = { from: 0.4, to: 0 };
    expect(widthAt(taper, 0)).toBeCloseTo(0.4, 12);
    expect(widthAt(taper, 0.25)).toBeCloseTo(0.3, 12);
    expect(widthAt(taper, 1)).toBeCloseTo(0, 12);
  });

  it('is paced by the curve the taper names', () => {
    const eased: Taper = { from: 0, to: 1, curve: 'smoothstep' };
    expect(widthAt(eased, 0.5)).toBeCloseTo(0.5, 12);
    expect(widthAt(eased, 0.25)).toBeCloseTo(0.15625, 12);
    const swell: Taper = { from: 0, to: 1, curve: 'thereAndBack' };
    expect(widthAt(swell, 0.5)).toBeCloseTo(1, 12);
    expect(widthAt(swell, 0)).toBeCloseTo(0, 12);
    expect(widthAt(swell, 1)).toBeCloseTo(0, 12);
  });

  it('is held at the ends for a fraction outside the length', () => {
    const taper: Taper = { from: 0.4, to: 0 };
    expect(widthAt(taper, -1)).toBeCloseTo(0.4, 12);
    expect(widthAt(taper, 2)).toBeCloseTo(0, 12);
  });

  it('has a widest reading for a caller that has to pick one number', () => {
    expect(widestWidth(0.4)).toBe(0.4);
    expect(widestWidth({ from: 0.4, to: 0 })).toBe(0.4);
    expect(widestWidth({ from: 0, to: 0.25 })).toBe(0.25);
  });

  it('goes through a group’s scale at both ends', () => {
    const tapered = shape('line', line(vec2(0, 0), vec2(1, 0)), {
      stroke: { colour: colourFrom('#000'), width: { from: 0.4, to: 0.1 } },
    });
    const marks = flatten(group('all', [tapered], { transform: mat3.scaling(vec2(3, 3)) }));
    const stroke = marks[0].kind === 'path' ? marks[0].stroke : undefined;
    expect(stroke?.width).toEqual({ from: 1.2000000000000002, to: 0.30000000000000004 });
  });
});

describe('the outline of a tapered stroke', () => {
  it('is the triangle a straight segment tapering to nothing must be', () => {
    const outline = outlinePath(line(vec2(0, 0), vec2(2, 0)), { from: 0.4, to: 0 });
    expect(outline).toHaveLength(1);
    expect(outline[0].curves).toHaveLength(3);
    expect(Math.abs(areaOf(outline))).toBeCloseTo((2 * 0.4) / 2, 12);
  });

  it('has the width the taper asks for at eleven places along the flat demo’s tangent', () => {
    const width: Taper = { from: 0.035, to: 0 };
    const tangent = tangentAt(coords, plot(coords, curve, { over: interval(0, 3) }), 1.5, { reach: 1.2 });
    const loops = flattenPath(outlinePath(tangent, width));
    for (let place = 0; place <= 10; place++) {
      // Inside the length rather than at its ends, since the nearest edge to a
      // point on the cap is the cap and its distance is nothing.
      const along = (place + 1) / 12;
      const gap = nearestEdge(loops, pointAlong(tangent, along)!)!.gap;
      // The edge slants as the width falls, so the perpendicular from the
      // centreline is the half width less the cosine of that slant.
      expect(gap / (widthAt(width, along) / 2)).toBeCloseTo(0.999994049, 8);
    }
  });

  it('swells in the middle where the taper names a curve that comes back', () => {
    const swell: Taper = { from: 0, to: 0.4, curve: 'thereAndBack' };
    const path = line(vec2(0, 0), vec2(2, 0));
    const outline = outlinePath(path, swell);
    // A straight run is two points however the width moves along it, so the
    // width is what splits this one.
    expect(outline[0].curves.length).toBeGreaterThan(40);
    expect(Math.abs(areaOf(outline))).toBeCloseTo(0.4, 9);
    const loops = flattenPath(outline);
    expect(nearestEdge(loops, pointAlong(path, 0.5)!)!.gap).toBeCloseTo(0.2, 3);
  });

  it('has no outline where the taper is nothing at both ends', () => {
    expect(outlinePath(line(vec2(0, 0), vec2(2, 0)), { from: 0, to: 0 })).toEqual([]);
  });
});

describe('a tapered stroke on its way to a painter', () => {
  const tapered = (fill?: Colour): Mark => ({
    kind: 'path',
    id: 'fig/line',
    path: line(vec2(0, 0), vec2(2, 0)),
    stroke: { colour: colourFrom('#e00'), width: { from: 0.4, to: 0 } },
    fill: fill ? { colour: fill } : undefined,
  });

  it('leaves one filled outline under the id the stroke had', () => {
    const drawn = outlinedMarks([tapered()]);
    expect(drawn).toHaveLength(1);
    const mark = drawn[0];
    if (mark.kind !== 'path') throw new Error('an outline is a path');
    expect(mark.id).toBe('fig/line');
    expect(mark.stroke).toBeUndefined();
    expect(hexOf(mark.fill!.colour)).toBe('#ee0000');
    expect(Math.abs(areaOf(mark.path))).toBeCloseTo(0.4, 12);
  });

  it('leaves the fill and the outline as two marks where a shape carries both', () => {
    const drawn = outlinedMarks([tapered(colourFrom('#012'))]);
    expect(drawn.map((mark) => mark.id)).toEqual(['fig/line', 'fig/line/stroke']);
    expect(drawn[0].kind === 'path' && drawn[0].stroke).toBeUndefined();
    expect(drawn[1].kind === 'path' && hexOf(drawn[1].fill!.colour)).toBe('#ee0000');
  });

  it('hands back a stroke of one width as it stands, and changes nothing on a second pass', () => {
    const plain: Mark = { kind: 'path', id: 'fig/line', path: line(vec2(0, 0), vec2(2, 0)), stroke: { colour: colourFrom('#000'), width: 0.1 } };
    expect(outlinedMarks([plain])[0]).toBe(plain);
    const once = outlinedMarks([tapered()]);
    expect(outlinedMarks(once)).toEqual(once);
  });

  it('reaches the SVG painter as a filled path rather than a stroked one', () => {
    const markup = svgMarkup([tapered()], mat3.IDENTITY, 10, 10);
    expect(markup).not.toContain('stroke-width');
    expect(markup).toContain('fill="#ee0000"');
  });
});

describe('a tapered stroke drawn on', () => {
  const width: Taper = { from: 0.4, to: 0 };
  const path = line(vec2(0, 0), vec2(2, 0));
  const figure: Figure = {
    extent: { width: 4, height: 2 },
    still: 1,
    scene: shape('line', path, { stroke: { colour: colourFrom('#e00'), width } }),
    timeline: Timeline.empty().play(draw('line'), 1, { curve: linear }),
  };

  it('trims the centreline and outlines what is left, at eleven fractions', () => {
    for (let place = 0; place <= 10; place++) {
      const along = place / 10;
      const mark = marksAt(figure, along)[0];
      if (mark?.kind !== 'path') throw new Error('a drawn outline is a path');
      const want = outlinePath(trimPath(path, along), width);
      expect(mark.path).toHaveLength(want.length);
      expect(Math.abs(areaOf(mark.path))).toBeCloseTo(Math.abs(areaOf(want)), 12);
    }
  });

  it('keeps the drawn end closed, which trimming the outline would open', () => {
    // The taper runs over the length that has been drawn, so half a line of
    // length 2 tapering from 0.4 to nothing covers the 0.2 of Lw/2 over the 1
    // that exists. Trimming the outline instead walks half way round the loop
    // and leaves the shape open along one side.
    const half = marksAt(figure, 0.5)[0];
    if (half?.kind !== 'path') throw new Error('a drawn outline is a path');
    expect(half.path[0].closed).toBe(true);
    expect(Math.abs(areaOf(half.path))).toBeCloseTo(0.2, 12);
    const opened = trimPath(outlinePath(path, width), 0.5);
    expect(opened[0].closed).toBe(false);
    expect(Math.abs(areaOf(opened))).not.toBeCloseTo(0.2, 3);
  });
});
