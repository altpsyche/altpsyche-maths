import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { at, durationOf, interval, sampleTrack, type Mark } from '../index.js';
import { sheets, stillMarkup } from '../demos/render.js';
import { FRAMES, coords, curve, strip, tangent, walk } from '../demos/tangent.js';

const root = path.resolve(import.meta.dirname, '..');
const reading = (marks: readonly Mark[]) => {
  const mark = marks.find((each) => each.id === 'tangent/reading');
  if (mark?.kind !== 'text') throw new Error('the reading is text');
  return mark.text;
};

describe('the committed pictures', () => {
  it('are what the code draws now', () => {
    // A picture in a README that nothing regenerates goes stale in silence.
    // Run `npm run demos` when this fails on purpose.
    for (const sheet of sheets) {
      const committed = readFileSync(path.join(root, sheet.file), 'utf8');
      expect(committed).toBe(`${sheet.markup()}\n`);
    }
  });

  it('are both there', () => {
    expect(sheets.map((sheet) => sheet.file)).toEqual(['docs/tangent.svg', 'docs/tangent-strip.svg']);
  });
});

describe('the flat demo', () => {
  it('draws the same 74 marks at every time', () => {
    for (const seconds of FRAMES) expect(at(tangent, seconds)).toHaveLength(74);
  });

  it('draws the grid, both axes, the region, the curve, the tangent, the point and the reading', () => {
    const marks = at(tangent, tangent.still);
    const under = (prefix: string) => marks.filter((mark) => mark.id.startsWith(prefix)).length;
    expect(under('tangent/grid/')).toBe(42);
    expect(under('tangent/axes/x/')).toBe(15);
    expect(under('tangent/axes/y/')).toBe(12);
    expect(under('tangent/area')).toBe(1);
    expect(under('tangent/curve')).toBe(1);
    expect(under('tangent/tangent')).toBe(1);
    expect(under('tangent/point/')).toBe(1);
    expect(under('tangent/reading')).toBe(1);
  });

  it('walks its point from the origin to where the curve meets the top of its axis', () => {
    expect(sampleTrack(walk, 0)).toBeCloseTo(0, 12);
    expect(sampleTrack(walk, 2)).toBeCloseTo(1.5, 12);
    expect(sampleTrack(walk, durationOf(tangent))).toBeCloseTo(3, 12);
  });

  it('reads a slope that changes as the point walks', () => {
    expect(reading(at(tangent, 0))).toBe('slope 0.00');
    expect(reading(at(tangent, 1))).toBe('slope 0.94');
    expect(reading(at(tangent, 2))).toBe('slope 3.00');
    expect(reading(at(tangent, 4))).toBe('slope 6.00');
  });

  it('reads twice the x it stands at, which is what the derivative of the curve is', () => {
    for (const seconds of FRAMES) {
      const x = sampleTrack(walk, seconds) as number;
      expect(reading(at(tangent, seconds))).toBe(`slope ${(2 * x).toFixed(2)}`);
    }
  });

  it('shades a region that grows with the walk', () => {
    const widthOf = (seconds: number) => {
      const mark = at(tangent, seconds).find((each) => each.id === 'tangent/area');
      if (mark?.kind !== 'path' || mark.path.length === 0) return 0;
      const xs = mark.path[0].curves.map((piece) => piece.to.x);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(widthOf(0)).toBe(0);
    expect(widthOf(1)).toBeGreaterThan(0);
    expect(widthOf(2)).toBeGreaterThan(widthOf(1));
    expect(widthOf(4)).toBeGreaterThan(widthOf(2));
  });

  it('keeps every mark inside the extent it declares', () => {
    for (const seconds of FRAMES) {
      for (const mark of at(tangent, seconds)) {
        const points =
          mark.kind === 'path'
            ? mark.path.flatMap((subpath) => [subpath.start, ...subpath.curves.map((piece) => piece.to)])
            : [mark.at];
        for (const point of points) {
          expect(Math.abs(point.x)).toBeLessThanOrEqual(5.4 + 1e-12);
          expect(Math.abs(point.y)).toBeLessThanOrEqual(3 + 1e-12);
        }
      }
    }
  });

  it('holds its own coords and curve so a later version can read them', () => {
    expect(interval.span(coords.x.graph)).toBe(5);
    expect(curve(3)).toBe(9);
  });
});

describe('the strip of frames', () => {
  it('is one figure carrying every frame', () => {
    expect(at(strip(FRAMES), 0)).toHaveLength(74 * FRAMES.length);
  });

  it('is as wide as its frames and as tall as one of them', () => {
    const sheet = strip(FRAMES);
    if (typeof sheet.extent === 'function') throw new Error('the strip has one extent');
    expect(sheet.extent.width).toBeCloseTo(45.6, 12);
    expect(sheet.extent.height).toBe(6);
  });

  it('shows a picture that moves in a still, since nothing here encodes a GIF', () => {
    const marks = at(strip(FRAMES), 0);
    const readings = marks.filter((mark) => mark.id.endsWith('/reading'));
    expect(readings.map((mark) => (mark.kind === 'text' ? mark.text : ''))).toEqual([
      'slope 0.00',
      'slope 0.94',
      'slope 3.00',
      'slope 6.00',
    ]);
  });
});

describe('the still picture', () => {
  it('carries a view box and no size of its own', () => {
    const markup = stillMarkup(tangent, tangent.still);
    expect(markup).toContain('viewBox="0 0 1080 600"');
    expect(markup).not.toContain('width="1080"');
  });
});
