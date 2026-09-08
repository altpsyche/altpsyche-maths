import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  areaOf,
  marksAt,
  boundsOf,
  boundsOfMarks,
  centreOf,
  colourOf,
  durationOf,
  flatten,
  frameTimesOf,
  interval,
  isLoop,
  plot,
  pointAlong,
  pointOf,
  resolveExtent,
  sameMarks,
  sampleTrack,
  streamlineOf,
  tangentAt,
  toGraph,
  vec2,
  type Mark,
} from '../index.js';
import { PAGE_FLOOR, SHOWN_AT, SHOWN_AT_STRIP, sheets, stillMarkup } from '../demos/render.js';
import {
  FRAMES as SOLID_FRAMES,
  HEIGHT,
  TIMES as SOLID_TIMES,
  alongAt,
  descents,
  eyeAt,
  saddle,
  section,
  solid,
  stripMarks as solidStripMarks,
} from '../demos/surface.js';
import { FIELD, FRAMES, TIMES, coords, curve, slopeField, stripMarks, tangent, walk } from '../demos/tangent.js';
import {
  AMBER,
  DEEP,
  EMBER,
  FROST,
  GROUND,
  HAZE,
  INK,
  MIST,
  MOSS,
  PEACH,
  SKY,
  SLATE,
  STEEL,
  THEME,
} from '../demos/palette.js';
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
  REACH,
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

  it('draw no glyph under the floor on the page, and leave every still where it was', () => {
    // A sheet scales from its view box, so the width the page shows it at is what
    // turns a written size into a size a reader sees.
    for (const sheet of sheets) {
      const markup = sheet.markup();
      const written = [...markup.matchAll(/font-size="([0-9.]+)"/g)].map((found) => Number(found[1]));
      const box = Number(/viewBox="0 0 ([0-9.]+)/.exec(markup)![1]);
      const shownAt = sheet.file.includes('-strip') ? SHOWN_AT_STRIP : SHOWN_AT;
      expect(Math.min(...written) * (shownAt / box)).toBeGreaterThanOrEqual(PAGE_FLOOR - 0.05);
    }
  });

  it('holds the four strips at the floor and the four stills above it untouched', () => {
    const onPage = (file: string) => {
      const markup = sheets.find((sheet) => sheet.file === file)!.markup();
      const written = [...markup.matchAll(/font-size="([0-9.]+)"/g)].map((found) => Number(found[1]));
      const box = Number(/viewBox="0 0 ([0-9.]+)/.exec(markup)![1]);
      const shownAt = file.includes('-strip') ? SHOWN_AT_STRIP : SHOWN_AT;
      return Math.min(...written) * (shownAt / box);
    };
    for (const strip of ['tangent-strip', 'boolean-strip', 'rotate-strip', 'surface-strip']) {
      expect(onPage(`docs/${strip}.svg`)).toBeCloseTo(14.0, 1);
    }
    expect(onPage('docs/tangent.svg')).toBeCloseTo(17.33, 2);
    expect(onPage('docs/boolean.svg')).toBeCloseTo(20.0, 2);
    expect(onPage('docs/rotate.svg')).toBeCloseTo(17.33, 2);
    expect(onPage('docs/surface.svg')).toBeCloseTo(14.67, 2);
  });

  it('each fill half their frame or better at the time their still is taken', () => {
    // The frame is sized for the widest moment of the motion, so the time a still
    // is taken at is what decides how much of it the bounds cover.
    for (const figure of [tangent, booleans, turns, solid]) {
      const box = boundsOfMarks(marksAt(figure, figure.still))!;
      const frame = resolveExtent(figure.extent, 16 / 9, figure.still);
      const cover = ((box.x.to - box.x.from) * (box.y.to - box.y.from)) / (frame.width * frame.height);
      expect(cover).toBeGreaterThan(0.5);
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
  it('draws the same 202 marks at every time', () => {
    // A hundred of the 202 are the field's fifty arrows and fifteen the two rules,
    // and nothing arrives or leaves part way through, so every time reads alike.
    for (const seconds of [0, ...FRAMES, durationOf(tangent)]) expect(marksAt(tangent, seconds)).toHaveLength(202);
  });

  it('braces the rise at the end and counts up to it', () => {
    const wordAt = (seconds: number) => {
      const mark = marksAt(tangent, seconds).find((each) => each.id === 'tangent/rise/word');
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
    const mark = marksAt(tangent, TIMES.braceTo).find((each) => each.id === 'tangent/rise/brace');
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
    const opacityOf = (seconds: number, id: string) => marksAt(tangent, seconds).find((mark) => mark.id === id)?.opacity ?? 1;
    // The 0 of the first rule, and the 2 and the x of the second.
    expect(opacityOf(TIMES.beat, 'tangent/equation/at-rest/6-30')).toBeGreaterThan(0.99);
    expect(opacityOf(TIMES.beat, 'tangent/equation/moving/6-32')).toBe(0);
    expect(opacityOf(TIMES.beat, 'tangent/equation/moving/7-1D465')).toBe(0);
    expect(opacityOf(TIMES.morphTo, 'tangent/equation/at-rest/6-30')).toBe(0);
    expect(opacityOf(TIMES.morphTo, 'tangent/equation/moving/6-32')).toBeGreaterThan(0.99);
    expect(opacityOf(TIMES.morphTo, 'tangent/equation/moving/7-1D465')).toBeGreaterThan(0.99);
  });

  it('holds the glyphs the two rules share still while the right-hand side walks', () => {
    // Hung from one left edge, since centred the six glyphs they share would slide
    // sideways as the wider rule arrived, and read against the frame the view moves.
    const startOf = (seconds: number, id: string) => {
      const mark = marksAt(tangent, seconds).find((each) => each.id === id);
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
    const opacityOf = (seconds: number, id: string) => marksAt(tangent, seconds).find((mark) => mark.id === id)?.opacity ?? 1;
    expect(opacityOf(0, 'tangent/grid/majors/x/0')).toBeCloseTo(0, 12);
    expect(opacityOf(0, 'tangent/reading')).toBeCloseTo(0, 12);
    expect(opacityOf(TIMES.entrance, 'tangent/grid/majors/x/0')).toBeCloseTo(1, 12);
    expect(opacityOf(TIMES.entrance, 'tangent/reading')).toBeCloseTo(1, 12);
  });

  it('brings its x labels in one after another', () => {
    const row = (seconds: number) =>
      ['-1', '0', '1', '2', '3', '4'].map(
        (label) =>
          marksAt(tangent, seconds).find((mark) => mark.id === `tangent/axes/x/labels/${label}`)?.opacity ?? 1
      );
    // A stagger promises only that somewhere the six are part way up and no two
    // equal, so the moment is scanned for rather than named.
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
      marksAt(tangent, seconds).find((mark) => mark.id === 'tangent/reading/circumscribed')!;
    expect(boxAt(TIMES.entrance + 0.7).opacity).toBeGreaterThan(0);
    expect(boxAt(TIMES.beat).opacity).toBe(0);
  });

  it('flashes at the top of the curve and nowhere else', () => {
    const raysAt = (seconds: number) =>
      marksAt(tangent, seconds).filter((mark) => mark.id.includes('/flash/'));
    expect(raysAt(TIMES.walkTo).every((ray) => ray.opacity === 0)).toBe(true);
    expect(raysAt(TIMES.walkTo + 0.4).some((ray) => (ray.opacity ?? 1) > 0.5)).toBe(true);
    expect(raysAt(durationOf(tangent)).every((ray) => ray.opacity === 0)).toBe(true);
  });

  it('reads a slope that changes as the dot walks', () => {
    expect(reading(marksAt(tangent, 0))).toBe('slope 0.00');
    expect(reading(marksAt(tangent, TIMES.beat))).toBe('slope 0.00');
    expect(reading(marksAt(tangent, FRAMES[2]))).toBe('slope 3.44');
    expect(reading(marksAt(tangent, TIMES.walkTo))).toBe('slope 6.00');
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

  it('draws the curve and the streamline of its own field as one answer', () => {
    // The whole reason this demo is the one to carry a field: the plotted curve
    // and the run integrated through the field are two answers to one question.
    const points = streamlineOf(slopeField, vec2(0, 0), {
      step: 0.02,
      steps: 2000,
      direction: 'both',
      within: { x: coords.x.graph, y: coords.y.graph },
    });
    expect(points.length).toBeGreaterThan(400);
    let worst = 0;
    for (const point of points) {
      const drawn = pointOf(coords, point.x, curve(point.x));
      const walked = pointOf(coords, point.x, point.y);
      worst = Math.max(worst, Math.hypot(walked.x - drawn.x, walked.y - drawn.y));
    }
    expect(worst).toBeLessThan(1e-6);
  });

  it('draws one arrow of its field along the tangent the dot carries', () => {
    const marks = marksAt(tangent, TIMES.walkTo);
    const shafts = marks.filter((mark) => mark.id.startsWith('tangent/field/') && mark.id.endsWith('/shaft'));
    expect(shafts).toHaveLength(50);
    for (const mark of shafts) {
      if (mark.kind !== 'path') throw new Error('a shaft is a path');
      const start = mark.path[0].start;
      const end = mark.path[0].curves[mark.path[0].curves.length - 1].to;
      const x = toGraph(coords.x, start.x);
      const wanted = tangentAt(coords, curve, x, { reach: 1.2 })[0];
      const along = vec2.sub(wanted.curves[0].to, wanted.start);
      const shaft = vec2.sub(end, start);
      expect(Math.abs(vec2.cross(vec2.normalize(along), vec2.normalize(shaft)))).toBeLessThan(1e-9);
    }
  });

  it('keeps the tangent on the dot at every place along the walk', () => {
    // The whole reason the graph x is recovered from the point rather than
    // driven beside it: one number, so these cannot drift apart.
    let worst = 0;
    for (let step = 0; step <= 40; step++) {
      const point = pointAlong(walkPath, step / 40)!;
      const x = toGraph(coords.x, point.x);
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
    // Text is never measured, so the graph's top edge from the coords is what every
    // anchor and every glyph of the two rules is checked against.
    const top = pointOf(coords, 4, 9).y;
    for (const seconds of [TIMES.entrance, TIMES.beat, TIMES.walkTo, durationOf(tangent)]) {
      for (const mark of marksAt(tangent, seconds)) {
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
    // The grid and the axes run off the edge once the view follows the dot, so what
    // may never leave is the dot and the two marks placed against the frame.
    const placed = ['tangent/point/disc', 'tangent/reading'];
    for (const seconds of FRAMES) {
      const centre = resolveExtent(tangent.extent, 1.8, seconds).centre ?? vec2(0, 0);
      for (const mark of marksAt(tangent, seconds)) {
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
    // The view follows across only, since dropping to the dot at the stationary
    // point would carry the frame-placed reading and rule down over the grid.
    let followed = 0;
    let still = 0;
    for (let step = 0; step <= 200; step += 1) {
      const seconds = (durationOf(tangent) * step) / 200;
      const centre = resolveExtent(tangent.extent, 1.8, seconds).centre ?? vec2(0, 0);
      const mark = marksAt(tangent, seconds).find((each) => each.id === 'tangent/point/disc');
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
    expect(marks).toHaveLength(202 * FRAMES.length);
    expect(new Set(marks.map((mark) => mark.id)).size).toBe(marks.length);
  });

  it('is as wide as its columns and as tall as its rows', () => {
    const oneRow = stripMarks(FRAMES);
    expect(oneRow.extent.width).toBeCloseTo(45.6, 12);
    expect(oneRow.extent.height).toBeCloseTo(6.4, 12);
    // Two columns of four frames is two rows, and the strip the README carries.
    const twoRows = stripMarks(FRAMES, 2);
    expect(twoRows.extent.width).toBeCloseTo(22.8, 12);
    expect(twoRows.extent.height).toBeCloseTo(12.8, 12);
  });

  it('shows every frame at one size, whichever strip it is in', () => {
    // A frame is a slot wide in every strip, so the four sheets draw their
    // frames at one scale rather than one sheet drawing them half the size.
    for (const strip of [stripMarks(FRAMES, 2), booleanStripMarks(BOOLEAN_FRAMES, 2), turnStripMarks(TURN_FRAMES, 2), solidStripMarks(SOLID_FRAMES, 2)]) {
      expect(strip.extent.width / strip.extent.height).toBeLessThan(2.6);
    }
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
    // Four to a panel, and a panel whose result is empty draws an empty path rather
    // than no mark, so the count holds at every time.
    const times = [
      0,
      BOOLEAN_TIMES.entrance,
      ...BOOLEAN_FRAMES,
      BOOLEAN_TIMES.slipping,
      BOOLEAN_TIMES.walkTo,
      durationOf(booleans),
    ];
    for (const seconds of times) expect(marksAt(booleans, seconds)).toHaveLength(12);
  });

  it('ends its walk with the two discs clear of each other', () => {
    // The walk exists to take the operations through no crossing, one crossing,
    // two crossings and containment, and the first of those needs a gap.
    expect(REACH - (BIG + SMALL)).toBeCloseTo(0.18, 12);
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
      const before = marksAt(booleans, seconds - 0.01);
      const during = marksAt(booleans, seconds);
      const after = marksAt(booleans, seconds + 0.01);
      expect(during).toHaveLength(before.length);
      expect(during).toHaveLength(after.length);
    }
  });

  it('leaves the overlap empty until the discs meet and empty again after they part', () => {
    const overlapAt = (seconds: number) => {
      const mark = marksAt(booleans, seconds).find((each) => each.id === 'booleans/overlap/result');
      if (mark?.kind !== 'path') throw new Error('the result is a path');
      return mark.path;
    };
    expect(overlapAt(BOOLEAN_TIMES.clear)).toHaveLength(0);
    expect(overlapAt(BOOLEAN_TIMES.crossing).length).toBeGreaterThan(0);
    expect(overlapAt(BOOLEAN_TIMES.walkTo)).toHaveLength(0);
  });

  it('takes a hole out of the middle when one disc sits wholly inside the other', () => {
    const mark = marksAt(booleans, BOOLEAN_TIMES.inside).find((each) => each.id === 'booleans/difference/result');
    if (mark?.kind !== 'path') throw new Error('the result is a path');
    expect(mark.path).toHaveLength(2);
    expect(areaOf(mark.path)).toBeGreaterThan(0);
  });

  it('arrives rather than appearing', () => {
    const opacityOf = (seconds: number, id: string) =>
      marksAt(booleans, seconds).find((mark) => mark.id === id)?.opacity ?? 1;
    expect(opacityOf(0, 'booleans/union/discs/first')).toBeCloseTo(0, 12);
    expect(opacityOf(0, 'booleans/overlap/result')).toBeCloseTo(0, 12);
    expect(opacityOf(BOOLEAN_TIMES.entrance, 'booleans/union/discs/first')).toBeCloseTo(1, 12);
    expect(opacityOf(BOOLEAN_TIMES.entrance, 'booleans/overlap/result')).toBeCloseTo(1, 12);
  });

  it('keeps every mark inside the extent it declares', () => {
    for (const seconds of BOOLEAN_FRAMES) {
      for (const mark of marksAt(booleans, seconds)) {
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
    const mark = marksAt(turns, seconds).find((each) => each.id === `turns/${panel}/rider/ell`);
    if (mark?.kind !== 'path') throw new Error('the shape is a path');
    const subpath = mark.path[0];
    return [subpath.start, ...subpath.curves.slice(0, -1).map((piece) => piece.to)];
  };
  const word = (seconds: number, panel: string) => {
    const mark = marksAt(turns, seconds).find((each) => each.id === `turns/${panel}/rider/word`);
    if (mark?.kind !== 'text') throw new Error('the rider is text');
    return mark;
  };

  it('draws the same eight marks at every time', () => {
    // Two panels of four, the pivot and the shape with the word riding it and the
    // words underneath, and nothing arrives or leaves at any time.
    for (const seconds of [0, ...TURN_FRAMES, TURN]) expect(marksAt(turns, seconds)).toHaveLength(8);
  });

  it('lands where it began after the whole turn, which is why it declares a loop', () => {
    expect(turns.loop).toBe(true);
    expect(isLoop(turns, 1e-9)).toBe(true);
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
    // A turn keeps every corner its distance from the pivot, so the left panel's
    // reach is the shape's own and the right one's is that plus the swing.
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
      const mark = marksAt(turns, seconds).find((each) => each.id === 'turns/own/rider/ell');
      return mark?.kind === 'path' ? mark.stroke?.width : undefined;
    };
    for (const seconds of [0, ...TURN_FRAMES, TURN]) expect(width(seconds)).toBe(0.04);
  });

  it('keeps every mark inside the frame it declares', () => {
    for (const seconds of [0, ...TURN_FRAMES, TURN]) {
      for (const mark of marksAt(turns, seconds)) {
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
  it('walks its four frames at a fixed step and leaves off the one that repeats', () => {
    expect(TURN_FRAMES).toEqual(frameTimesOf(turns, { frames: 4 }));
    expect(TURN_FRAMES).toEqual([TURN_TIMES.start, TURN_TIMES.quarter, TURN_TIMES.half, TURN_TIMES.threeQuarters]);
    expect(TURN_FRAMES).not.toContain(TURN);
    expect(sameMarks(marksAt(turns, TURN_FRAMES[0]), marksAt(turns, TURN))).toBe(true);
  });

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
  const solidAt = (seconds: number) => marksAt(solid, seconds);
  const named = [SOLID_TIMES.entrance, SOLID_TIMES.quarter, SOLID_TIMES.half, SOLID_TIMES.round];

  it('draws the same 265 marks at every time', () => {
    // A hundred and forty-four cells of saddle, sixteen panes of glass and the
    // field's thirty-six arrows at two marks each, with the rest the axes and rule.
    for (const seconds of [0, ...SOLID_FRAMES, SOLID_TIMES.round]) expect(solidAt(seconds)).toHaveLength(265);
  });

  it('runs its three descents down the saddle and never off it', () => {
    let worst = 0;
    for (const run of descents) {
      expect(run.length).toBeGreaterThan(20);
      for (const point of run) worst = Math.max(worst, Math.abs(point.z - saddle(point.x, point.y)));
      for (let step = 1; step < run.length; step += 1) expect(run[step].z).toBeLessThan(run[step - 1].z);
    }
    expect(worst).toBe(0);
  });

  it('names a surface, a plane, a curve, a field, three runs and three axes', () => {
    const ids = solidAt(SOLID_TIMES.quarter).map((mark) => mark.id);
    expect(ids.filter((id) => id.startsWith('solid/body/hill/')).length).toBe(144);
    expect(ids.filter((id) => id.startsWith('solid/body/pane/')).length).toBe(16);
    expect(ids.filter((id) => id.startsWith('solid/body/flow/')).length).toBe(72);
    expect(ids.filter((id) => id.startsWith('solid/descent/run')).length).toBe(3);
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
      const mark = solidAt(seconds).find((each) => each.id === 'solid/cut/run0/run');
      if (mark?.kind !== 'path') throw new Error('the first branch is a path');
      const placed = camera.project(section[0][0]).at;
      expect(Math.abs(mark.path[0].start.x - placed.x)).toBeLessThan(1e-12);
      expect(Math.abs(mark.path[0].start.y - placed.y)).toBeLessThan(1e-12);
    }
  });

  it('brings the eye back to where it started after one orbit', () => {
    // Compared by name rather than in order, since two cells at one depth keep the
    // order given and a turn of 1e-9 swaps them without moving the eye.
    const before = new Map(solidAt(SOLID_TIMES.entrance).map((mark) => [mark.id, mark]));
    const after = solidAt(SOLID_TIMES.round);
    expect(after).toHaveLength(before.size);
    for (const mark of after) {
      const was = before.get(mark.id);
      expect(was, mark.id).toBeDefined();
      expect(sameMarks([was!], [mark]), mark.id).toBe(true);
    }
  });

  it('arrives with the animations the flat demo already uses', () => {
    const opacityOf = (seconds: number, id: string) =>
      solidAt(seconds).find((mark) => mark.id === id)?.opacity ?? 1;
    expect(opacityOf(0, 'solid/body/pane/0-0/run')).toBeCloseTo(0, 12);
    expect(opacityOf(SOLID_TIMES.entrance, 'solid/body/pane/0-0/run')).toBeCloseTo(1, 12);
    const undrawn = solidAt(0).find((mark) => mark.id === 'solid/cut/run0/run');
    const drawn = solidAt(SOLID_TIMES.entrance).find((mark) => mark.id === 'solid/cut/run0/run');
    if (undrawn?.kind !== 'path' || drawn?.kind !== 'path') throw new Error('both are paths');
    expect(undrawn.path).toHaveLength(0);
    expect(drawn.path[0].curves.length).toBeGreaterThan(50);
  });

  it('keeps the whole picture inside the frame it declares', () => {
    for (const seconds of named) {
      const box = boundsOfMarks(solidAt(seconds));
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
    expect(marks).toHaveLength(265 * SOLID_FRAMES.length);
    expect(new Set(marks.map((mark) => mark.id)).size).toBe(marks.length);
  });
});

describe("the flat demo's field", () => {
  it('samples on cells that come out nearly square', () => {
    // Arrows on tall thin cells read as a comb rather than as a field.
    const across = interval.span(coords.x.units) / FIELD.x;
    const up = interval.span(coords.y.units) / FIELD.y;
    expect(across / up).toBeGreaterThan(1);
    expect(across / up).toBeLessThan(1.11);
  });
});

describe("the demos' palette", () => {
  // The contrast of a colour against a ground, by the sRGB relative luminance
  // the guidelines define.
  const contrast = (colour: string, ground: string) => {
    const channel = (value: number) => {
      const share = value / 255;
      return share <= 0.03928 ? share / 12.92 : ((share + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (text: string) => {
      const read = colourOf(text)!;
      return 0.2126 * channel(read.r) + 0.7152 * channel(read.g) + 0.0722 * channel(read.b);
    };
    const [high, low] = [luminance(colour), luminance(ground)].sort((a, b) => b - a);
    return (high + 0.05) / (low + 0.05);
  };

  const READING = ['ink', 'slate', 'ember', 'amber', 'deep', 'moss'] as const;
  const WASH = ['mist', 'peach', 'sky', 'haze', 'steel', 'frost'] as const;

  it('gives every colour a reader reads off the contrast text is asked for, on both grounds', () => {
    for (const name of READING) {
      expect(contrast(THEME[name].light, GROUND.light)).toBeGreaterThan(4.5);
      expect(contrast(THEME[name].dark, GROUND.dark)).toBeGreaterThan(4.5);
    }
    expect(contrast(THEME.ink.light, GROUND.light)).toBeCloseTo(17.22, 2);
    expect(contrast(THEME.ink.dark, GROUND.dark)).toBeCloseTo(15.87, 2);
  });

  it('keeps every wash below it on both grounds, so nothing carries a reading it cannot hold', () => {
    for (const name of WASH) {
      for (const ground of ['light', 'dark'] as const) {
        expect(contrast(THEME[name][ground], GROUND[ground])).toBeLessThan(4.5);
        expect(contrast(THEME[name][ground], GROUND[ground])).toBeGreaterThan(1.1);
      }
    }
  });

  // No luminance clears 4.5:1 against both grounds at once, which is why a colour
  // has a value per ground rather than one value chosen carefully.
  it('has no single value that could have served both grounds', () => {
    const capForLight = 1.05 / 4.5 - 0.05;
    const floorForDark = 4.5 * (0.005483 + 0.05) - 0.05;
    expect(capForLight).toBeLessThan(floorForDark);
  });

  it('paints every colour as a variable falling back to its light value', () => {
    for (const [name, colour] of [
      ['ink', INK],
      ['mist', MIST],
      ['slate', SLATE],
      ['ember', EMBER],
      ['amber', AMBER],
      ['peach', PEACH],
      ['deep', DEEP],
      ['sky', SKY],
      ['haze', HAZE],
      ['steel', STEEL],
      ['frost', FROST],
      ['moss', MOSS],
    ] as const) {
      expect(colour).toBe(`var(--${name}, ${THEME[name as keyof typeof THEME].light})`);
    }
  });
});
