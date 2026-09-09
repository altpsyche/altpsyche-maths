import { describe, expect, it } from 'vitest';
import {
  checkFigure,
  colourFrom,
  durationOf,
  extentAt,
  interval,
  isLoop,
  marksAt,
  resolveFigure,
  sameMarks,
  vec2,
  type Extent,
  type FigureRecord,
} from '../index.js';
import { FRAMES, OWN, turns } from '../demos/rotate.js';
import { TIMES as BOOLEAN_TIMES, booleans } from '../demos/boolean.js';
import { operations, turning } from './figures.js';

describe('a figure built from one record', () => {
  it('draws the rotation demo mark for mark at each frame of its strip and at its still time', () => {
    const built = resolveFigure(turning);
    expect(FRAMES).toHaveLength(4);
    for (const seconds of [...FRAMES, turns.still]) {
      const drawn = marksAt(turns, seconds);
      expect(drawn).toHaveLength(8);
      expect(sameMarks(marksAt(built, seconds), drawn)).toBe(true);
    }
  });

  it('draws the boolean demo mark for mark at each of its named times', () => {
    const built = resolveFigure(operations);
    const times = Object.values(BOOLEAN_TIMES);
    expect(times).toHaveLength(7);
    for (const seconds of times) {
      const drawn = marksAt(booleans, seconds);
      expect(drawn).toHaveLength(12);
      expect(sameMarks(marksAt(built, seconds), drawn)).toBe(true);
    }
  });

  it('rebuilds the scene from the track rather than reading it once', () => {
    const built = resolveFigure(operations);
    // The walking disc is at a different place at each of these, so a scene read
    // once and kept would draw the first of them three times over.
    const walked = [BOOLEAN_TIMES.clear, BOOLEAN_TIMES.crossing, BOOLEAN_TIMES.inside].map((seconds) =>
      marksAt(built, seconds).filter((mark) => mark.id.endsWith('/discs/second')),
    );
    for (const marks of walked) expect(marks).toHaveLength(3);
    expect(sameMarks(walked[0], walked[1])).toBe(false);
    expect(sameMarks(walked[1], walked[2])).toBe(false);
  });

  it('carries the duration, the still time and the loop flag the record names', () => {
    const built = resolveFigure(turning);
    expect(durationOf(built)).toBe(durationOf(turns));
    expect(built.still).toBe(turns.still);
    expect(built.loop).toBe(true);
    expect(isLoop(built)).toBe(true);
  });

  it('reads an extent chosen from the shape of the surface', () => {
    const wide: Extent = { width: 8, height: 4 };
    const tall: Extent = { width: 4, height: 8 };
    const built = resolveFigure({
      ...turning,
      extent: { kind: 'byAspect', wide, square: { width: 6, height: 6 }, tall },
    });
    expect(extentAt(built, 0, 2).width).toBe(8);
    expect(extentAt(built, 0, 0.5).height).toBe(8);
  });

  it('carries an inset, whose marks are the figure own marks inside a clip', () => {
    const rectangle = { x: interval(1, 3), y: interval(1, 2) };
    const built = resolveFigure({
      ...turning,
      insets: [{ shows: { width: 2, height: 1, centre: OWN }, into: rectangle, name: 'panel' }],
    });
    const own = marksAt(resolveFigure(turning), 0);
    const withPanel = marksAt(built, 0);
    // Six of the figure's eight marks reach the panel, since it shows a window
    // two units by one and a mark clear of that window is not copied into it.
    expect(own).toHaveLength(8);
    expect(withPanel).toHaveLength(14);
    for (const mark of withPanel.slice(own.length)) {
      expect(mark.id.startsWith('panel/')).toBe(true);
      expect(mark.clip).toEqual(rectangle);
    }
  });
});

describe('a record whose mark is placed against the frame', () => {
  /** `fractionOf(frame, 0.02, 0.5)` written as an expression, which is the call
   * the consumer places every mark of a figure over a shader with. */
  const across = (fraction: number) => ({
    kind: 'arithmetic' as const,
    operator: '+' as const,
    left: { kind: 'member' as const, of: { kind: 'frame' as const, name: 'centre' as const }, name: 'x' as const },
    right: {
      kind: 'arithmetic' as const,
      operator: '*' as const,
      left: fraction - 0.5,
      right: { kind: 'frame' as const, name: 'width' as const },
    },
  });

  const pinned: FigureRecord = {
    extent: { kind: 'matchingAspect', height: 100 },
    scene: {
      kind: 'group',
      name: 'all',
      children: [
        {
          kind: 'dot',
          name: 'plate',
          at: { kind: 'point', x: across(0.02), y: 0 },
          radius: 1,
          fill: { colour: colourFrom('#101010') },
        },
      ],
    },
    still: 0,
  };

  it('moves the mark with the frame and stays where it is put in figure units', () => {
    const built = resolveFigure(checkFigure(JSON.parse(JSON.stringify(pinned))));
    const placeAt = (aspect: number) => {
      const mark = marksAt(built, 0, aspect).find((each) => each.id === 'all/plate/disc');
      if (!mark || mark.kind !== 'path') throw new Error('the plate is a path');
      return mark.path[0].start.x;
    };
    // -0.48 of the width, and the width is a hundred times the aspect.
    expect(placeAt(3)).toBeCloseTo(-144 + 1, 6);
    expect(placeAt(1.7778)).toBeCloseTo(-85.3344 + 1, 4);
    expect(placeAt(0.5625)).toBeCloseTo(-27 + 1, 6);
  });

  it('refuses the figure drawn with no aspect, since a matchingAspect extent has no frame without one', () => {
    const built = resolveFigure(checkFigure(JSON.parse(JSON.stringify(pinned))));
    expect(() => marksAt(built, 0)).toThrow(
      "an expression reads the frame's centre, which is not among the values it was given"
    );
  });
});
