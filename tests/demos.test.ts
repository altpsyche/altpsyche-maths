import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { at, flatten, sameMarks } from '../index.js';
import { sheets, stillMarkup } from '../demos/render.js';
import { coords, curve, tangent } from '../demos/tangent.js';
import { plot } from '../index.js';

const root = path.resolve(import.meta.dirname, '..');

describe('the committed pictures', () => {
  it('are what the code draws now', () => {
    // A picture in a README that nothing regenerates goes stale in silence.
    // Run `npm run demos` when this fails on purpose.
    for (const sheet of sheets) {
      const committed = readFileSync(path.join(root, sheet.file), 'utf8');
      expect(committed).toBe(`${sheet.markup()}\n`);
    }
  });
});

describe('the flat demo', () => {
  it('draws the grid, both axes and the curve', () => {
    const marks = at(tangent, tangent.still);
    expect(marks).toHaveLength(70);
    const under = (prefix: string) => marks.filter((mark) => mark.id.startsWith(prefix)).length;
    expect(under('tangent/grid/')).toBe(42);
    expect(under('tangent/axes/x/')).toBe(15);
    expect(under('tangent/axes/y/')).toBe(12);
    expect(under('tangent/curve')).toBe(1);
  });

  it('draws the same picture at every time, since nothing moves yet', () => {
    expect(sameMarks(at(tangent, 0), at(tangent, tangent.still))).toBe(true);
    expect(sameMarks(at(tangent, 0), at(tangent, 4))).toBe(true);
  });

  it('cuts its curve where the parabola meets the top of its own axis', () => {
    const drawn = at(tangent, tangent.still).find((mark) => mark.id === 'tangent/curve');
    if (drawn?.kind !== 'path') throw new Error('the curve is a path');
    expect(drawn.path).toHaveLength(1);
    const last = drawn.path[0].curves[drawn.path[0].curves.length - 1].to;
    expect(last.y).toBeCloseTo(2.4, 6);
  });

  it('keeps every mark inside the extent it declares', () => {
    for (const mark of at(tangent, tangent.still)) {
      const points =
        mark.kind === 'path'
          ? mark.path.flatMap((subpath) => [subpath.start, ...subpath.curves.map((piece) => piece.to)])
          : [mark.at];
      for (const point of points) {
        expect(Math.abs(point.x)).toBeLessThanOrEqual(5.4);
        expect(Math.abs(point.y)).toBeLessThanOrEqual(3);
      }
    }
  });

  it('holds its own coords and curve so a later version can read them', () => {
    expect(plot(coords, curve)).toHaveLength(1);
    expect(flatten(tangent.scene as never)).toHaveLength(70);
  });
});

describe('the still picture', () => {
  it('carries a view box and no size of its own', () => {
    const markup = stillMarkup(tangent, tangent.still);
    expect(markup).toContain('viewBox="0 0 1080 600"');
    expect(markup).not.toContain('width="1080"');
  });
});
