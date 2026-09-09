import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FIGURE_FORMAT_VERSION,
  durationOf,
  isLoop,
  marksAt,
  readFigure,
  sameMarks,
  writeFigure,
  type FigureRecord,
} from '../index.js';
import { FRAMES, turns } from '../demos/rotate.js';
import { TIMES as BOOLEAN_TIMES, booleans } from '../demos/boolean.js';
import { operations, turning } from './figures.js';

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
