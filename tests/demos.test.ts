import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  at,
  durationOf,
  interval,
  plot,
  pointAlong,
  pointOf,
  sampleTrack,
  tangentAt,
  unscaled,
  type Mark,
} from '../index.js';
import { sheets, stillMarkup } from '../demos/render.js';
import { FRAMES, TIMES, coords, curve, stripMarks, tangent, walk } from '../demos/tangent.js';

const root = path.resolve(import.meta.dirname, '..');
const reading = (marks: readonly Mark[]) => {
  const mark = marks.find((each) => each.id === 'tangent/reading');
  if (mark?.kind !== 'text') throw new Error('the reading is text');
  return mark.text;
};
const walkPath = plot(coords, curve, { over: interval(0, 3) });
const gaps = (points: readonly { x: number; y: number }[]) =>
  points.slice(1).map((point, at) => Math.hypot(point.x - points[at].x, point.y - points[at].y));

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
  it('draws the same 100 marks at every time', () => {
    // Eighty-nine the scene writes, of which fifteen are the two rules, plus the
    // box round the reading and ten rays. Nothing arrives or leaves part way
    // through, which is what lets one frame be compared against another at all.
    for (const seconds of [0, ...FRAMES, durationOf(tangent)]) expect(at(tangent, seconds)).toHaveLength(100);
  });

  it('reads no slope at the stationary point and the rule for one after it', () => {
    const opacityOf = (seconds: number, id: string) => at(tangent, seconds).find((mark) => mark.id === id)?.opacity ?? 1;
    // The 0 of the first rule, and the 2 and the x of the second.
    expect(opacityOf(TIMES.beat, 'tangent/equation/at-rest/6-30')).toBeGreaterThan(0.99);
    expect(opacityOf(TIMES.beat, 'tangent/equation/moving/6-32')).toBe(0);
    expect(opacityOf(TIMES.beat, 'tangent/equation/moving/7-1D465')).toBe(0);
    expect(opacityOf(TIMES.morphTo, 'tangent/equation/at-rest/6-30')).toBe(0);
    expect(opacityOf(TIMES.morphTo, 'tangent/equation/moving/6-32')).toBeGreaterThan(0.99);
    expect(opacityOf(TIMES.morphTo, 'tangent/equation/moving/7-1D465')).toBeGreaterThan(0.99);
  });

  it('holds the glyphs the two rules share still while the right-hand side walks', () => {
    // Hung from the same left edge rather than centred. Centred, the six they
    // share would slide sideways as the wider rule arrived.
    const startOf = (seconds: number, id: string) => {
      const mark = at(tangent, seconds).find((each) => each.id === id);
      if (mark?.kind !== 'path') throw new Error(`${id} is a path`);
      return mark.path[0].start;
    };
    for (const glyph of ['0-1D451', '1-1D466', '2-1D451', '3-1D465', '4-rule', '5-3D']) {
      const id = `tangent/equation/at-rest/${glyph}`;
      expect(startOf(TIMES.morphTo, id).x, id).toBeCloseTo(startOf(TIMES.beat, id).x, 12);
      expect(startOf(TIMES.morphTo, id).y, id).toBeCloseTo(startOf(TIMES.beat, id).y, 12);
    }
  });

  it('arrives rather than appearing', () => {
    const opacityOf = (seconds: number, id: string) => at(tangent, seconds).find((mark) => mark.id === id)?.opacity ?? 1;
    expect(opacityOf(0, 'tangent/grid/majors/x/0')).toBeCloseTo(0, 12);
    expect(opacityOf(0, 'tangent/reading')).toBeCloseTo(0, 12);
    expect(opacityOf(TIMES.entrance, 'tangent/grid/majors/x/0')).toBeCloseTo(1, 12);
    expect(opacityOf(TIMES.entrance, 'tangent/reading')).toBeCloseTo(1, 12);
  });

  it('brings its x labels in one after another', () => {
    const row = (seconds: number) =>
      ['-1', '0', '1', '2', '3', '4'].map(
        (label) =>
          at(tangent, seconds).find((mark) => mark.id === `tangent/axes/x/labels/${label}`)?.opacity ?? 1
      );
    // Somewhere in the row the six are part way up and no two are equal, which
    // is the whole of what a stagger promises. Scanned for rather than named, so
    // retiming the entrance does not need this line rewritten.
    const moment = Array.from({ length: 400 }, (_, step) => step / 100).find((seconds) => {
      const shown = row(seconds);
      return shown[0] > shown[5] && shown[0] < 1;
    });
    expect(moment).toBeDefined();
    const shown = row(moment!);
    for (let label = 1; label < shown.length; label++) expect(shown[label]).toBeLessThanOrEqual(shown[label - 1]);
    expect(row(TIMES.entrance).every((opacity) => opacity > 0.999)).toBe(true);
  });

  it('holds at the stationary point until the picture has arrived and been pointed at', () => {
    expect(sampleTrack(walk, 0)).toBe(0);
    expect(sampleTrack(walk, TIMES.entrance)).toBeCloseTo(0, 12);
    expect(sampleTrack(walk, TIMES.walkFrom)).toBeCloseTo(0, 12);
    expect(sampleTrack(walk, TIMES.walkTo)).toBeCloseTo(1, 12);
  });

  it('boxes its reading at the beat and lets the box go', () => {
    const boxAt = (seconds: number) =>
      at(tangent, seconds).find((mark) => mark.id === 'tangent/reading/circumscribed')!;
    expect(boxAt(TIMES.entrance + 0.7).opacity).toBeGreaterThan(0);
    expect(boxAt(TIMES.beat).opacity).toBe(0);
  });

  it('flashes at the top of the curve and nowhere else', () => {
    const raysAt = (seconds: number) =>
      at(tangent, seconds).filter((mark) => mark.id.includes('/flash/'));
    expect(raysAt(TIMES.walkTo).every((ray) => ray.opacity === 0)).toBe(true);
    expect(raysAt(TIMES.walkTo + 0.4).some((ray) => (ray.opacity ?? 1) > 0.5)).toBe(true);
    expect(raysAt(durationOf(tangent)).every((ray) => ray.opacity === 0)).toBe(true);
  });

  it('reads a slope that changes as the dot walks', () => {
    expect(reading(at(tangent, 0))).toBe('slope 0.00');
    expect(reading(at(tangent, TIMES.beat))).toBe('slope 0.00');
    expect(reading(at(tangent, FRAMES[2]))).toBe('slope 3.52');
    expect(reading(at(tangent, TIMES.walkTo))).toBe('slope 6.00');
  });

  it('walks at one speed along the curve rather than gathering pace as it steepens', () => {
    // Driven across x instead, the last step is 1.8 times the first, because a
    // step in x covers more of the curve where the curve is steep.
    const byLength = Array.from({ length: 21 }, (_, step) => pointAlong(walkPath, step / 20)!);
    const byX = Array.from({ length: 21 }, (_, step) => {
      const x = (3 * step) / 20;
      return pointOf(coords, x, curve(x));
    });
    const even = gaps(byLength);
    const uneven = gaps(byX);
    expect(Math.max(...even) / Math.min(...even)).toBeLessThan(1.001);
    expect(Math.max(...uneven) / Math.min(...uneven)).toBeGreaterThan(1.8);
  });

  it('keeps the tangent on the dot at every place along the walk', () => {
    // The whole reason the graph x is recovered from the point rather than
    // driven beside it: one number, so these cannot drift apart.
    let worst = 0;
    for (let step = 0; step <= 40; step++) {
      const point = pointAlong(walkPath, step / 40)!;
      const x = unscaled(coords.x, point.x);
      const path = tangentAt(coords, curve, x, { reach: 1.2 });
      if (path.length === 0) continue;
      const from = path[0].start;
      const to = path[0].curves[0].to;
      const run = to.x - from.x;
      const rise = to.y - from.y;
      worst = Math.max(
        worst,
        Math.abs(rise * (point.x - from.x) - run * (point.y - from.y)) / Math.hypot(run, rise)
      );
    }
    expect(worst).toBeLessThan(1e-12);
  });

  it('keeps every mark inside the extent it declares', () => {
    for (const seconds of FRAMES) {
      for (const mark of at(tangent, seconds)) {
        const points =
          mark.kind === 'path'
            ? mark.path.flatMap((subpath) => [subpath.start, ...subpath.curves.map((piece) => piece.to)])
            : [mark.at];
        for (const point of points) {
          expect(Math.abs(point.x)).toBeLessThanOrEqual(5.4);
          expect(Math.abs(point.y)).toBeLessThanOrEqual(3);
        }
      }
    }
  });
});

describe('the strip of frames', () => {
  it('carries every frame with no two marks sharing an id', () => {
    const { marks } = stripMarks(FRAMES);
    expect(marks).toHaveLength(100 * FRAMES.length);
    expect(new Set(marks.map((mark) => mark.id)).size).toBe(marks.length);
  });

  it('is as wide as its frames and as tall as one of them', () => {
    const { extent } = stripMarks(FRAMES);
    expect(extent.width).toBeCloseTo(45.6, 12);
    expect(extent.height).toBe(6);
  });

  it('shows a picture that moves in a still, since nothing here encodes a GIF', () => {
    const { marks } = stripMarks(FRAMES);
    const readings = marks.filter((mark) => mark.id.endsWith('/tangent/reading'));
    expect(readings.map((mark) => (mark.kind === 'text' ? mark.text : ''))).toEqual([
      'slope 0.00',
      'slope 0.00',
      'slope 3.52',
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
