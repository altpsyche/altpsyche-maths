import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FIGURE_FORMAT_VERSION,
  colourFrom,
  durationOf,
  isLoop,
  marksAt,
  readFigure,
  resolveFigure,
  sameMarks,
  writeFigure,
  type FigureRecord,
} from '../index.js';
import { FRAMES, turns } from '../demos/rotate.js';
import { TIMES as BOOLEAN_TIMES, booleans } from '../demos/boolean.js';
import { TIMES as FLAT_TIMES, tangent, written as flat } from '../demos/tangent.js';
import { FRAMES as SOLID_FRAMES, TIMES as SOLID_TIMES, solid, written as solidWritten } from '../demos/surface.js';
import { operations, turning } from './figures.js';

/**
 * The flat demo with a span of each of the four kinds this version added, so a
 * round trip is asked about them the way it is already asked about the rest.
 */
const indicated: FigureRecord = {
  ...flat,
  timeline: {
    ...flat.timeline,
    spans: [
      ...(flat.timeline?.spans ?? []),
      {
        entry: { kind: 'showPassingFlash', target: 'tangent/curve', options: { stroke: { colour: colourFrom('#f9fafb'), width: 0.04 }, covers: 0.25 } },
        from: 0,
        to: 1,
      },
      { entry: { kind: 'wave', target: 'tangent/curve', options: { amplitude: 0.2, covers: 0.3 } }, from: 0, to: 1 },
      { entry: { kind: 'wiggle', target: 'tangent/point', options: { factor: 1.2, angle: 0.2, rocks: 2 } }, from: 0, to: 1 },
      { entry: { kind: 'write', target: 'tangent/reading', options: { across: 2.4 } }, from: 0, to: 1 },
    ],
  },
};

/** The names of every object of a written file, in the order they are written,
 * which is what says the keys are sorted throughout rather than at the top. */
function keysInOrder(text: string): readonly string[] {
  return [...text.matchAll(/^\s*"([^"]+)":/gm)].map((match) => match[1]);
}

/** One object's keys, taken from the file's own indentation, so a nested object's
 * keys are not read as its parent's. */
function keysAtDepth(text: string, spaces: number): readonly string[] {
  const pattern = new RegExp(`^ {${spaces}}"([^"]+)":`, 'gm');
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

describe('a figure written as a file', () => {
  it('carries the version and the figure and nothing else', () => {
    const text = writeFigure(turning);
    expect(keysAtDepth(text, 2)).toEqual(['format', 'figure']);
    expect(JSON.parse(text).format).toBe(FIGURE_FORMAT_VERSION);
    expect(FIGURE_FORMAT_VERSION).toBe(0);
  });

  it('ends in a newline and parses as the record it was given', () => {
    const text = writeFigure(turning);
    expect(text.endsWith('}\n')).toBe(true);
    expect(JSON.parse(text).figure).toEqual(JSON.parse(JSON.stringify(turning)));
  });

  it('writes the same bytes for a record whose fields were built in another order', () => {
    // The same nine fields, named the other way round. A writer keeping the order
    // it was handed would write two files for one figure.
    const other: FigureRecord = {
      loop: turning.loop,
      still: turning.still,
      duration: turning.duration,
      timeline: turning.timeline,
      scene: turning.scene,
      extent: turning.extent,
    };
    expect(writeFigure(other)).toBe(writeFigure(turning));
  });

  it('sorts the keys of every object rather than only the outermost', () => {
    const names = keysInOrder(writeFigure(turning));
    expect(names.length).toBeGreaterThan(50);
    expect(keysAtDepth(writeFigure(turning), 4)).toEqual(['duration', 'extent', 'loop', 'scene', 'still', 'timeline']);
  });

  it('leaves out a field that is absent rather than writing it as null', () => {
    const text = writeFigure({ ...turning, fit: undefined, tracks: undefined });
    expect(text).toBe(writeFigure(turning));
    expect(text).not.toContain('null');
  });

  it('writes the boolean demo, whose scene carries expressions over a track', () => {
    const text = writeFigure(operations);
    expect(JSON.parse(text).figure).toEqual(JSON.parse(JSON.stringify(operations)));
    expect(text).toContain('"kind": "track"');
    expect(text).toContain('"name": "apart"');
  });

  it('refuses a number a file has no way to write, naming the path of the field', () => {
    const wrong = { ...turning, still: Number.NaN };
    expect(() => writeFigure(wrong)).toThrow('still is NaN, which a file has no way to write');
    expect(() => writeFigure({ ...turning, duration: Number.POSITIVE_INFINITY })).toThrow(
      'duration is Infinity, which a file has no way to write',
    );
  });

  it('refuses a function and names where it sits', () => {
    const wrong = { ...turning, extent: { width: 1, height: 1, centre: () => 0 } } as unknown as FigureRecord;
    expect(() => writeFigure(wrong)).toThrow('extent.centre is a function, which a file has no way to write');
  });

  it('refuses a hole in a list and a null, both by path', () => {
    const holed = {
      ...turning,
      timeline: { spans: [turning.timeline!.spans[0], undefined], duration: 6 },
    } as unknown as FigureRecord;
    expect(() => writeFigure(holed)).toThrow('timeline.spans.1 is a list with nothing in it');
    const nulled = { ...turning, still: null } as unknown as FigureRecord;
    expect(() => writeFigure(nulled)).toThrow('still is null, which a file has no way to write');
  });
});

describe('the boolean demo as a committed file', () => {
  const committed = readFileSync('demos/boolean.figure.json', 'utf8');

  it('is what the demo writes now', () => {
    expect(committed).toBe(writeFigure(operations));
  });

  it('draws the demo mark for mark at each of its named times and at its still time', () => {
    const read = readFigure(committed);
    const times = Object.values(BOOLEAN_TIMES);
    expect(times).toHaveLength(11);
    for (const seconds of [...times, booleans.still]) {
      const drawn = marksAt(booleans, seconds);
      expect(drawn).toHaveLength(12);
      expect(sameMarks(marksAt(read, seconds), drawn)).toBe(true);
    }
  });

  it('carries the nine fades of its entrance and the two panels walking onto the next', () => {
    expect(JSON.parse(committed).figure.timeline.spans).toHaveLength(11);
  });

  it('is read as the version this package writes', () => {
    expect(JSON.parse(committed).format).toBe(FIGURE_FORMAT_VERSION);
  });
});

describe('the flat demo as a committed file', () => {
  const committed = readFileSync('demos/tangent.figure.json', 'utf8');
  const times = Object.values(FLAT_TIMES);

  it('is what the demo writes now', () => {
    expect(committed).toBe(writeFigure(flat));
  });

  it('draws the demo mark for mark at each of its named times and at its still time', () => {
    const read = readFigure(committed);
    expect(times).toHaveLength(7);
    for (const seconds of [...times, tangent.still]) {
      expect(sameMarks(marksAt(read, seconds), marksAt(tangent, seconds))).toBe(true);
    }
  });

  it('draws the counts its still time and its named times each have', () => {
    expect(marksAt(readFigure(committed), tangent.still)).toHaveLength(186);
    expect(times.map((seconds) => marksAt(readFigure(committed), seconds).length)).toEqual([
      191, 190, 190, 187, 183, 183, 183,
    ]);
  });

  it('cuts every mark of its panel to the rectangle the inset draws into', () => {
    const read = readFigure(committed);
    for (const seconds of times) {
      const inside = marksAt(read, seconds).filter((mark) => mark.id.startsWith('tangent/lens/'));
      expect(inside.length).toBeGreaterThan(0);
      expect(inside.every((mark) => mark.clip !== undefined)).toBe(true);
    }
  });

  it('reads the seven slopes its walk passes through', () => {
    const read = readFigure(committed);
    const reading = (seconds: number) => {
      const mark = marksAt(read, seconds).find((one) => one.id === 'tangent/reading');
      return mark && mark.kind === 'text' ? mark.text : '';
    };
    expect(times.map(reading)).toEqual([
      'slope 0.00',
      'slope 0.00',
      'slope 0.00',
      'slope 1.16',
      'slope 6.00',
      'slope 6.00',
      'slope 6.00',
    ]);
  });

  it('is read as the version this package writes', () => {
    expect(JSON.parse(committed).format).toBe(FIGURE_FORMAT_VERSION);
  });
});

describe('the rotation demo as a committed file', () => {
  const committed = readFileSync('demos/rotate.figure.json', 'utf8');

  it('is what the demo writes now', () => {
    expect(committed).toBe(writeFigure(turning));
  });

  it('draws the demo mark for mark at each frame of its strip and at its still time', () => {
    const read = readFigure(committed);
    for (const seconds of [...FRAMES, turns.still]) {
      const drawn = marksAt(turns, seconds);
      expect(drawn).toHaveLength(8);
      expect(sameMarks(marksAt(read, seconds), drawn)).toBe(true);
    }
  });

  it('is read as the version this package writes', () => {
    expect(JSON.parse(committed).format).toBe(FIGURE_FORMAT_VERSION);
  });
});

describe('the solid demo as a committed file', () => {
  const committed = readFileSync('demos/surface.figure.json', 'utf8');
  const times = Object.values(SOLID_TIMES);

  it('is what the demo writes now', () => {
    expect(committed).toBe(writeFigure(solidWritten));
  });

  it('draws the demo mark for mark at each of the four times its strip draws and at its still time', () => {
    const read = readFigure(committed);
    expect(SOLID_FRAMES).toHaveLength(4);
    for (const seconds of [...SOLID_FRAMES, solid.still]) {
      expect(sameMarks(marksAt(read, seconds), marksAt(solid, seconds))).toBe(true);
    }
  });

  it('draws the counts its still time and its four named times each have', () => {
    const read = readFigure(committed);
    expect(marksAt(read, solid.still)).toHaveLength(328);
    expect(times.map((seconds) => marksAt(read, seconds).length)).toEqual([326, 326, 326, 326]);
  });

  it('washes the pane differently at two bearings, which is the camera reaching the fill', () => {
    const read = readFigure(committed);
    const paneAt = (seconds: number) => {
      const mark = marksAt(read, seconds).find((one) => one.id.startsWith('solid/body/pane/'));
      return mark?.kind === 'path' ? mark.fill?.gradient?.from : undefined;
    };
    // The pane is a square, so an eye a quarter turn on sees the same shape and
    // its wash starts at the same place. The strip's own bearings are off those
    // corners, which is where the axis of the wash has turned.
    expect(paneAt(SOLID_FRAMES[0])).toBeDefined();
    expect(paneAt(SOLID_FRAMES[0])).not.toEqual(paneAt(SOLID_FRAMES[2]));
  });

  it('is read as the version this package writes', () => {
    expect(JSON.parse(committed).format).toBe(FIGURE_FORMAT_VERSION);
  });
});

describe('a figure read back from a file', () => {
  it('draws the rotation demo mark for mark at each frame of its strip', () => {
    const read = readFigure(writeFigure(turning));
    expect(FRAMES).toHaveLength(4);
    for (const seconds of [...FRAMES, turns.still]) {
      const drawn = marksAt(turns, seconds);
      expect(drawn).toHaveLength(8);
      expect(sameMarks(marksAt(read, seconds), drawn)).toBe(true);
    }
  });

  it('draws the boolean demo mark for mark at each of its named times', () => {
    const read = readFigure(writeFigure(operations));
    for (const seconds of Object.values(BOOLEAN_TIMES)) {
      const drawn = marksAt(booleans, seconds);
      expect(drawn).toHaveLength(12);
      expect(sameMarks(marksAt(read, seconds), drawn)).toBe(true);
    }
  });

  it('carries the duration, the still time and the loop flag through the file', () => {
    const read = readFigure(writeFigure(turning));
    expect(durationOf(read)).toBe(durationOf(turns));
    expect(read.still).toBe(turns.still);
    expect(isLoop(read)).toBe(true);
  });

  it('writes what it read back to the same bytes', () => {
    const once = writeFigure(turning);
    expect(writeFigure(JSON.parse(once).figure)).toBe(once);
  });

  it('refuses a version it does not read, naming both numbers', () => {
    const text = writeFigure(turning).replace('"format": 0', '"format": 1');
    expect(() => readFigure(text)).toThrow(
      'this reads version 0 of the format and the file is written in version 1',
    );
  });

  it('refuses a file with no version and a file with no figure', () => {
    expect(() => readFigure('{"figure": {}}')).toThrow(
      'a file names the version of the format it is written in, and format is missing',
    );
    expect(() => readFigure('{"format": 0}')).toThrow('a file carries a figure, and figure is missing');
  });

  it('refuses a field the vocabulary does not carry, by path, before it draws', () => {
    const text = writeFigure(turning).replace('"still": 0.75', '"still": "soon"');
    expect(() => readFigure(text)).toThrow('still is a number and is the text "soon"');
    const wrong = writeFigure(turning).replace('"kind": "polygon"', '"kind": "squiggle"');
    expect(() => readFigure(wrong)).toThrow('is a path and has no kind called the text "squiggle"');
  });

  it('refuses text that is not a JSON document, and one that is not an object', () => {
    expect(() => readFigure('{ figure: }')).toThrow('a file is a JSON document and this text is not one');
    expect(() => readFigure('[]')).toThrow('a file is an object carrying a format and a figure, and this is a list');
  });
});

describe('the four kinds this version added, through a file', () => {
  it('reads back to the marks it was written from at every named time', () => {
    const read = readFigure(writeFigure(indicated));
    for (const seconds of Object.values(FLAT_TIMES)) {
      expect(sameMarks(marksAt(read, seconds), marksAt(resolveFigure(indicated), seconds)), `at ${seconds}`).toBe(true);
    }
  });

  it('refuses a wave whose amplitude is not a number, naming the field', () => {
    const wrong = {
      ...indicated,
      timeline: {
        ...indicated.timeline,
        spans: [{ entry: { kind: 'wave', target: 'tangent/curve', options: { amplitude: 'far' } }, from: 0, to: 1 }],
      },
    };
    expect(() => readFigure(writeFigure(wrong as unknown as FigureRecord))).toThrow(
      'timeline.spans.0.entry.options.amplitude is a number and is the text "far"'
    );
  });

  it('refuses a passing flash with no stroke, which it needs to be drawn at all', () => {
    const wrong = {
      ...indicated,
      timeline: {
        ...indicated.timeline,
        spans: [{ entry: { kind: 'showPassingFlash', target: 'tangent/curve', options: {} }, from: 0, to: 1 }],
      },
    };
    expect(() => readFigure(writeFigure(wrong as unknown as FigureRecord))).toThrow('stroke');
  });
});
