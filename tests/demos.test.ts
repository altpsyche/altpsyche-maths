import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  areaOf,
  at,
  boundsOf,
  boundsOfMarks,
  centreOf,
  durationOf,
  flatten,
  interval,
  loops,
  plot,
  pointAlong,
  pointOf,
  resolveExtent,
  sameMarks,
  sampleTrack,
  tangentAt,
  unscaled,
  vec2,
  type Mark,
} from '../index.js';
import { sheets, stillMarkup } from '../demos/render.js';
import {
  FRAMES as SOLID_FRAMES,
  HEIGHT,
  TIMES as SOLID_TIMES,
  alongAt,
  eyeAt,
  saddle,
  section,
  solid,
  stripMarks as solidStripMarks,
} from '../demos/surface.js';
import { FRAMES, TIMES, coords, curve, stripMarks, tangent, walk } from '../demos/tangent.js';
import {
  FRAMES as TURN_FRAMES,
  GIVEN,
  LOCAL,
  OWN,
  SWING,
  TIMES as TURN_TIMES,
  TURN,
  stripMarks as turnStripMarks,
  turns,
} from '../demos/rotate.js';
import {
  BIG,
  FRAMES as BOOLEAN_FRAMES,
  SMALL,
  TIMES as BOOLEAN_TIMES,
  booleans,
  sceneAt as booleanSceneAt,
  stripMarks as booleanStripMarks,
} from '../demos/boolean.js';

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

  it('are all eight there', () => {
    expect(sheets.map((sheet) => sheet.file)).toEqual([
      'docs/tangent.svg',
      'docs/tangent-strip.svg',
      'docs/boolean.svg',
      'docs/boolean-strip.svg',
      'docs/rotate.svg',
      'docs/rotate-strip.svg',
      'docs/surface.svg',
      'docs/surface-strip.svg',
    ]);
  });
});

describe('the flat demo', () => {
  it('draws the same 102 marks at every time', () => {
    // Ninety-one the scene writes, of which fifteen are the two rules and two
    // the brace and its number, plus the box round the reading and ten rays.
    // Nothing arrives or leaves part way through, which is what lets one frame
    // be compared against another at all.
    for (const seconds of [0, ...FRAMES, durationOf(tangent)]) expect(at(tangent, seconds)).toHaveLength(102);
  });

  it('braces the rise at the end and counts up to it', () => {
    const wordAt = (seconds: number) => {
      const mark = at(tangent, seconds).find((each) => each.id === 'tangent/rise/word');
      if (mark?.kind !== 'text') throw new Error('the word is text');
      return mark;
    };
    // Nothing of it shows until the dot has stopped, so the number counting is
    // not a second clock arguing with the walk.
    expect(wordAt(TIMES.walkTo).opacity).toBe(0);
    expect(wordAt(TIMES.braceFrom).text).toBe('0.00');
    expect(wordAt((TIMES.braceFrom + TIMES.braceTo) / 2).text).not.toBe('9.00');
    expect(wordAt(TIMES.braceTo).text).toBe('9.00');
    expect(wordAt(TIMES.braceTo).opacity).toBeGreaterThan(0.99);
  });

  it('stands its brace on the two points the graph gives', () => {
    const mark = at(tangent, TIMES.braceTo).find((each) => each.id === 'tangent/rise/brace');
    if (mark?.kind !== 'path') throw new Error('the brace is a path');
    const [subpath] = mark.path;
    const top = pointOf(coords, 3, 9);
    const foot = pointOf(coords, 3, 0);
    expect(subpath.start.x).toBeCloseTo(top.x, 12);
    expect(subpath.start.y).toBeCloseTo(top.y, 12);
    const end = subpath.curves[subpath.curves.length - 1].to;
    expect(end.x).toBeCloseTo(foot.x, 12);
    expect(end.y).toBeCloseTo(foot.y, 12);
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
    // share would slide sideways as the wider rule arrived. Read against the
    // middle of the frame rather than against the world, since the view follows
    // the dot and the rule is placed against the frame.
    const startOf = (seconds: number, id: string) => {
      const mark = at(tangent, seconds).find((each) => each.id === id);
      if (mark?.kind !== 'path') throw new Error(`${id} is a path`);
      const centre = resolveExtent(tangent.extent, 1.8, seconds).centre ?? vec2(0, 0);
      return vec2(mark.path[0].start.x - centre.x, mark.path[0].start.y - centre.y);
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
    expect(reading(at(tangent, FRAMES[2]))).toBe('slope 3.44');
    expect(reading(at(tangent, TIMES.walkTo))).toBe('slope 6.00');
  });

  it('walks at one speed along the curve rather than gathering pace as it steepens', () => {
    // Driven across x instead, the widest step is 1.65 times the narrowest,
    // because a step in x covers more of the curve where the curve is steep.
    const byLength = Array.from({ length: 21 }, (_, step) => pointAlong(walkPath, step / 20)!);
    const byX = Array.from({ length: 21 }, (_, step) => {
      const x = (3 * step) / 20;
      return pointOf(coords, x, curve(x));
    });
    const even = gaps(byLength);
    const uneven = gaps(byX);
    expect(Math.max(...even) / Math.min(...even)).toBeLessThan(1.001);
    expect(Math.max(...uneven) / Math.min(...uneven)).toBeGreaterThan(1.6);
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

  it('writes its reading and its rules above the graph rather than over it', () => {
    // Text is never measured, so nothing here reads a width. The graph's own
    // top edge is a number the coords give, and every anchor and every glyph of
    // the two rules is checked against it.
    const top = pointOf(coords, 4, 9).y;
    for (const seconds of [TIMES.entrance, TIMES.beat, TIMES.walkTo, durationOf(tangent)]) {
      for (const mark of at(tangent, seconds)) {
        if (mark.id === 'tangent/reading') expect(mark.kind === 'text' && mark.at.y).toBeGreaterThan(top);
        if (!mark.id.startsWith('tangent/equation/') || mark.kind !== 'path') continue;
        for (const subpath of mark.path) {
          for (const point of [subpath.start, ...subpath.curves.map((piece) => piece.to)]) {
            expect(point.y, mark.id).toBeGreaterThan(top);
          }
        }
      }
    }
  });

  it('keeps the dot and everything placed against the frame inside the frame', () => {
    // The grid and the axes run off the edge once the view follows the dot,
    // which is what following means. What may never leave is the dot the view is
    // following and the two things placed against the frame itself.
    const placed = ['tangent/point/disc', 'tangent/reading'];
    for (const seconds of FRAMES) {
      const centre = resolveExtent(tangent.extent, 1.8, seconds).centre ?? vec2(0, 0);
      for (const mark of at(tangent, seconds)) {
        if (!placed.includes(mark.id) && !mark.id.startsWith('tangent/equation/')) continue;
        const points =
          mark.kind === 'path'
            ? mark.path.flatMap((subpath) => [subpath.start, ...subpath.curves.map((piece) => piece.to)])
            : [mark.at];
        for (const point of points) {
          expect(Math.abs(point.x - centre.x), mark.id).toBeLessThanOrEqual(5.4);
          expect(Math.abs(point.y - centre.y), mark.id).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  it('follows the dot rather than letting it cross the frame', () => {
    // Across only: the reading and the rule are placed against the frame and the
    // graph is not, so a view that dropped to follow the dot at the stationary
    // point would carry that band down over the grid.
    let followed = 0;
    let still = 0;
    for (let step = 0; step <= 200; step += 1) {
      const seconds = (durationOf(tangent) * step) / 200;
      const centre = resolveExtent(tangent.extent, 1.8, seconds).centre ?? vec2(0, 0);
      const mark = at(tangent, seconds).find((each) => each.id === 'tangent/point/disc');
      if (mark?.kind !== 'path') continue;
      const middle = centreOf(boundsOf(mark.path)!);
      followed = Math.max(followed, Math.abs(middle.x - centre.x));
      still = Math.max(still, Math.abs(middle.x));
    }
    expect(followed).toBeLessThanOrEqual(1.2 + 1e-12);
    expect(still).toBeGreaterThan(2.7);
  });
});

describe('the strip of frames', () => {
  it('carries every frame with no two marks sharing an id', () => {
    const { marks } = stripMarks(FRAMES);
    expect(marks).toHaveLength(102 * FRAMES.length);
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
      'slope 3.44',
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

/**
 * The boolean demo is read against closed forms rather than against a picture.
 * Two discs of radii R and r whose centres are d apart share an area with a
 * formula, and the union and the difference follow from it, so every panel has
 * a number to be right or wrong about at every distance the walk passes
 * through.
 */
const shared = (apart: number): number => {
  const gap = Math.abs(apart);
  if (gap >= BIG + SMALL) return 0;
  if (gap <= BIG - SMALL) return Math.PI * SMALL * SMALL;
  return (
    SMALL * SMALL * Math.acos((gap * gap + SMALL * SMALL - BIG * BIG) / (2 * gap * SMALL)) +
    BIG * BIG * Math.acos((gap * gap + BIG * BIG - SMALL * SMALL) / (2 * gap * BIG)) -
    Math.sqrt(
      (-gap + SMALL + BIG) * (gap + SMALL - BIG) * (gap - SMALL + BIG) * (gap + SMALL + BIG)
    ) / 2
  );
};

/** What the edges of these two discs can move an area by: their lengths times
 * the 2.8e-4 of the radius four cubics cost a circle. */
const EDGE_ERROR = 2 * Math.PI * 2.8e-4 * (BIG * BIG + SMALL * SMALL);

const panelAreas = (apart: number): number[] =>
  flatten(booleanSceneAt(apart))
    .filter((mark) => mark.id.endsWith('/result'))
    .map((mark) => (mark.kind === 'path' ? areaOf(mark.path) : Number.NaN));

describe('the boolean demo', () => {
  it('draws the same 12 marks at every time', () => {
    // Four to a panel: the two outlines, the result and the word under it. A
    // panel whose result is empty draws an empty path rather than no mark, which
    // is what lets one frame be compared against another at all.
    const times = [
      0,
      BOOLEAN_TIMES.entrance,
      ...BOOLEAN_FRAMES,
      BOOLEAN_TIMES.slipping,
      BOOLEAN_TIMES.walkTo,
      durationOf(booleans),
    ];
    for (const seconds of times) expect(at(booleans, seconds)).toHaveLength(12);
  });

  it('encloses what the closed form says at every named distance', () => {
    const distances = [-1.44, -(BIG + SMALL), -0.9, -(BIG - SMALL), 0, 0.9, BIG + SMALL];
    for (const apart of distances) {
      const overlap = shared(apart);
      const wanted = [
        Math.PI * BIG * BIG + Math.PI * SMALL * SMALL - overlap,
        overlap,
        Math.PI * BIG * BIG - overlap,
      ];
      const drawn = panelAreas(apart);
      for (let panel = 0; panel < wanted.length; panel++) {
        expect(Math.abs(drawn[panel] - wanted[panel]), `${apart} panel ${panel}`).toBeLessThan(EDGE_ERROR);
      }
    }
  });

  it('passes through the moment the two touch without the picture changing size', () => {
    // Once from outside and once from within, which are the two distances where
    // the discs meet at one point rather than crossing at two.
    for (const seconds of [BOOLEAN_TIMES.touching, BOOLEAN_TIMES.slipping]) {
      const before = at(booleans, seconds - 0.01);
      const during = at(booleans, seconds);
      const after = at(booleans, seconds + 0.01);
      expect(during).toHaveLength(before.length);
      expect(during).toHaveLength(after.length);
    }
  });

  it('leaves the overlap empty until the discs meet and empty again after they part', () => {
    const overlapAt = (seconds: number) => {
      const mark = at(booleans, seconds).find((each) => each.id === 'booleans/overlap/result');
      if (mark?.kind !== 'path') throw new Error('the result is a path');
      return mark.path;
    };
    expect(overlapAt(BOOLEAN_TIMES.clear)).toHaveLength(0);
    expect(overlapAt(BOOLEAN_TIMES.crossing).length).toBeGreaterThan(0);
    expect(overlapAt(BOOLEAN_TIMES.walkTo)).toHaveLength(0);
  });

  it('takes a hole out of the middle when one disc sits wholly inside the other', () => {
    const mark = at(booleans, BOOLEAN_TIMES.inside).find((each) => each.id === 'booleans/difference/result');
    if (mark?.kind !== 'path') throw new Error('the result is a path');
    expect(mark.path).toHaveLength(2);
    expect(areaOf(mark.path)).toBeGreaterThan(0);
  });

  it('arrives rather than appearing', () => {
    const opacityOf = (seconds: number, id: string) =>
      at(booleans, seconds).find((mark) => mark.id === id)?.opacity ?? 1;
    expect(opacityOf(0, 'booleans/union/discs/first')).toBeCloseTo(0, 12);
    expect(opacityOf(0, 'booleans/overlap/result')).toBeCloseTo(0, 12);
    expect(opacityOf(BOOLEAN_TIMES.entrance, 'booleans/union/discs/first')).toBeCloseTo(1, 12);
    expect(opacityOf(BOOLEAN_TIMES.entrance, 'booleans/overlap/result')).toBeCloseTo(1, 12);
  });

  it('keeps every mark inside the extent it declares', () => {
    for (const seconds of BOOLEAN_FRAMES) {
      for (const mark of at(booleans, seconds)) {
        const points =
          mark.kind === 'path'
            ? mark.path.flatMap((subpath) => [subpath.start, ...subpath.curves.map((piece) => piece.to)])
            : [mark.at];
        for (const point of points) {
          expect(Math.abs(point.x)).toBeLessThanOrEqual(5.4);
          expect(Math.abs(point.y)).toBeLessThanOrEqual(2);
        }
      }
    }
  });
});

describe('the boolean strip', () => {
  it('carries every frame with no two marks sharing an id', () => {
    const { marks } = booleanStripMarks(BOOLEAN_FRAMES);
    expect(marks).toHaveLength(12 * BOOLEAN_FRAMES.length);
    expect(new Set(marks.map((mark) => mark.id)).size).toBe(marks.length);
  });

  it('shows the walk from clear of the disc to wholly inside it', () => {
    const loops = BOOLEAN_FRAMES.map((seconds) => {
      const mark = booleanStripMarks([seconds]).marks.find((each) => each.id.endsWith('/overlap/result'));
      return mark?.kind === 'path' ? mark.path.length : -1;
    });
    expect(loops).toEqual([0, 0, 1, 1]);
  });
});

describe('the rotation demo', () => {
  const corners = (seconds: number, panel: string) => {
    const mark = at(turns, seconds).find((each) => each.id === `turns/${panel}/rider/ell`);
    if (mark?.kind !== 'path') throw new Error('the shape is a path');
    const subpath = mark.path[0];
    return [subpath.start, ...subpath.curves.slice(0, -1).map((piece) => piece.to)];
  };
  const word = (seconds: number, panel: string) => {
    const mark = at(turns, seconds).find((each) => each.id === `turns/${panel}/rider/word`);
    if (mark?.kind !== 'text') throw new Error('the rider is text');
    return mark;
  };

  it('draws the same eight marks at every time', () => {
    // Two panels of four: the pivot, the shape, the word riding with it, and the
    // words underneath. Nothing arrives or leaves, which is what lets one frame
    // be compared against another.
    for (const seconds of [0, ...TURN_FRAMES, TURN]) expect(at(turns, seconds)).toHaveLength(8);
  });

  it('lands where it began after the whole turn, which is why it declares a loop', () => {
    expect(turns.loop).toBe(true);
    expect(loops(turns, 1e-9)).toBe(true);
  });

  it('turns the left panel about the middle of the box round it', () => {
    // The pivot is the shape's own centre because the shape is written about it,
    // so the closed form is stated here rather than read back off the marks.
    for (const [index, corner] of corners(TURN_TIMES.quarter, 'own').entries()) {
      const want = vec2.add(OWN, vec2.rotate(LOCAL[index], Math.PI / 2));
      expect(corner.x).toBeCloseTo(want.x, 12);
      expect(corner.y).toBeCloseTo(want.y, 12);
    }
  });

  it('turns the right panel about the point it is given', () => {
    for (const [index, corner] of corners(TURN_TIMES.half, 'given').entries()) {
      const want = vec2.sub(GIVEN, vec2.add(vec2(SWING, 0), LOCAL[index]));
      expect(corner.x).toBeCloseTo(want.x, 12);
      expect(corner.y).toBeCloseTo(want.y, 12);
    }
  });

  it('spins the left panel where it stands and swings the right one round', () => {
    // A turn keeps every corner the distance from the pivot it started at, so
    // the furthest corner is the reach of the panel. The left panel's reach is
    // the shape's own, and the right one's is that plus the swing.
    const reach = (swing: number) => Math.max(...LOCAL.map((point) => Math.hypot(swing + point.x, point.y)));
    for (const seconds of [0, ...TURN_FRAMES, TURN]) {
      const own = corners(seconds, 'own').map((point) => vec2.distance(point, OWN));
      const given = corners(seconds, 'given').map((point) => vec2.distance(point, GIVEN));
      expect(Math.max(...own)).toBeCloseTo(reach(0), 9);
      expect(Math.max(...given)).toBeCloseTo(reach(SWING), 9);
    }
    expect(reach(SWING)).toBeGreaterThan(2 * reach(0));
  });

  it('leaves the words upright and moves nothing about them but where they sit', () => {
    const start = word(0, 'given');
    for (const seconds of TURN_FRAMES) {
      const now = word(seconds, 'given');
      expect(now.text).toBe(start.text);
      expect(now.size).toBe(start.size);
      expect(now.align).toBe(start.align);
      expect(vec2.distance(now.at, GIVEN)).toBeCloseTo(vec2.distance(start.at, GIVEN), 9);
    }
  });

  it('does not thicken a line by turning it', () => {
    // A rotation's scale factor is one, where a growth's is the factor it grew
    // by, so a turned outline keeps the width the figure asked for.
    const width = (seconds: number) => {
      const mark = at(turns, seconds).find((each) => each.id === 'turns/own/rider/ell');
      return mark?.kind === 'path' ? mark.stroke?.width : undefined;
    };
    for (const seconds of [0, ...TURN_FRAMES, TURN]) expect(width(seconds)).toBe(0.04);
  });

  it('keeps every mark inside the frame it declares', () => {
    for (const seconds of [0, ...TURN_FRAMES, TURN]) {
      for (const mark of at(turns, seconds)) {
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

describe('the rotation strip', () => {
  it('carries every frame with no two marks sharing an id', () => {
    const { marks } = turnStripMarks(TURN_FRAMES, 2);
    expect(marks).toHaveLength(8 * TURN_FRAMES.length);
    expect(new Set(marks.map((mark) => mark.id)).size).toBe(marks.length);
  });

  it('leaves a wider gap between two frames than between the panels inside one', () => {
    // A row read by its gaps: the narrower gap has to be the one inside a frame,
    // or two frames of two panels read as one row of four.
    const { marks } = turnStripMarks(TURN_FRAMES, 2);
    const span = (id: string) => boundsOfMarks(marks.filter((mark) => mark.id.startsWith(id)))!;
    const insideFrame = span('at0/turns/given').x.from - span('at0/turns/own').x.to;
    const betweenFrames = span('at1/turns/own').x.from - span('at0/turns/given').x.to;
    expect(betweenFrames).toBeGreaterThan(insideFrame);
  });
});

describe('the solid demo', () => {
  const marksAt = (seconds: number) => at(solid, seconds);
  const named = [SOLID_TIMES.entrance, SOLID_TIMES.quarter, SOLID_TIMES.half, SOLID_TIMES.round];

  it('draws the same 190 marks at every time', () => {
    for (const seconds of [0, ...SOLID_FRAMES, SOLID_TIMES.round]) expect(marksAt(seconds)).toHaveLength(190);
  });

  it('names a surface, a plane, a curve, three axes and a typeset equation', () => {
    const ids = marksAt(SOLID_TIMES.quarter).map((mark) => mark.id);
    expect(ids.filter((id) => id.startsWith('solid/body/hill/')).length).toBe(144);
    expect(ids.filter((id) => id.startsWith('solid/body/pane/')).length).toBe(16);
    expect(ids.filter((id) => id.startsWith('solid/cut/run')).length).toBe(2);
    for (const axis of ['x', 'y', 'z']) {
      expect(ids.some((id) => id.startsWith(`solid/axes/${axis}/line`))).toBe(true);
      expect(ids.some((id) => id.startsWith(`solid/axes/${axis}/ticks`))).toBe(true);
    }
    expect(ids.some((id) => id.startsWith('solid/rule/'))).toBe(true);
  });

  it('puts every point of the curve on both the surface and the plane', () => {
    let offSurface = 0;
    let offPlane = 0;
    for (const run of section) {
      for (const point of run) {
        offSurface = Math.max(offSurface, Math.abs(saddle(point.x, point.y) - point.z));
        offPlane = Math.max(offPlane, Math.abs(point.z - HEIGHT));
      }
    }
    expect(offSurface).toBeLessThan(0.002);
    expect(offPlane).toBe(0);
  });

  it('draws the curve where the camera at that time puts it', () => {
    for (const seconds of named) {
      const camera = eyeAt(alongAt(seconds));
      const mark = marksAt(seconds).find((each) => each.id === 'solid/cut/run0/run');
      if (mark?.kind !== 'path') throw new Error('the first branch is a path');
      const placed = camera.project(section[0][0]).at;
      expect(Math.abs(mark.path[0].start.x - placed.x)).toBeLessThan(1e-12);
      expect(Math.abs(mark.path[0].start.y - placed.y)).toBeLessThan(1e-12);
    }
  });

  it('brings the eye back to where it started after one orbit', () => {
    // Mark for mark by name rather than in order. Two cells at the same depth
    // keep the order they were given, and a thousandth of a millionth of a turn
    // is enough to swap two of them, which says nothing about where the eye is.
    const before = new Map(marksAt(SOLID_TIMES.entrance).map((mark) => [mark.id, mark]));
    const after = marksAt(SOLID_TIMES.round);
    expect(after).toHaveLength(before.size);
    for (const mark of after) {
      const was = before.get(mark.id);
      expect(was, mark.id).toBeDefined();
      expect(sameMarks([was!], [mark]), mark.id).toBe(true);
    }
  });

  it('arrives with the animations the flat demo already uses', () => {
    const opacityOf = (seconds: number, id: string) =>
      marksAt(seconds).find((mark) => mark.id === id)?.opacity ?? 1;
    expect(opacityOf(0, 'solid/body/pane/0-0/run')).toBeCloseTo(0, 12);
    expect(opacityOf(SOLID_TIMES.entrance, 'solid/body/pane/0-0/run')).toBeCloseTo(1, 12);
    const undrawn = marksAt(0).find((mark) => mark.id === 'solid/cut/run0/run');
    const drawn = marksAt(SOLID_TIMES.entrance).find((mark) => mark.id === 'solid/cut/run0/run');
    if (undrawn?.kind !== 'path' || drawn?.kind !== 'path') throw new Error('both are paths');
    expect(undrawn.path).toHaveLength(0);
    expect(drawn.path[0].curves.length).toBeGreaterThan(50);
  });

  it('keeps the whole picture inside the frame it declares', () => {
    for (const seconds of named) {
      const box = boundsOfMarks(marksAt(seconds));
      expect(Math.abs(box!.x.from)).toBeLessThanOrEqual(5.4);
      expect(Math.abs(box!.x.to)).toBeLessThanOrEqual(5.4);
      expect(Math.abs(box!.y.from)).toBeLessThanOrEqual(3);
      expect(Math.abs(box!.y.to)).toBeLessThanOrEqual(3);
    }
  });
});

describe('the solid strip', () => {
  it('carries every frame with no two marks sharing an id', () => {
    const { marks } = solidStripMarks(SOLID_FRAMES, 2);
    expect(marks).toHaveLength(190 * SOLID_FRAMES.length);
    expect(new Set(marks.map((mark) => mark.id)).size).toBe(marks.length);
  });
});
