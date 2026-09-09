import { describe, expect, it } from 'vitest';
import { CURVE_NAMES, checkFigure, type FigureRecord } from '../index.js';
import { operations, turning } from './figures.js';

/** The record with one field somewhere inside it replaced, so a refusal is
 * measured against a figure that is otherwise whole. */
function withField(record: FigureRecord, path: readonly string[], value: unknown): unknown {
  const copy = JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
  let held = copy as Record<string, unknown>;
  for (const name of path.slice(0, -1)) held = held[name] as Record<string, unknown>;
  held[path[path.length - 1]] = value;
  return copy;
}

describe('a figure held to the vocabulary', () => {
  it('takes both demos as they stand', () => {
    expect(checkFigure(JSON.parse(JSON.stringify(turning)))).toBeTruthy();
    expect(checkFigure(JSON.parse(JSON.stringify(operations)))).toBeTruthy();
  });

  it('hands back the value it was given rather than a copy', () => {
    const held = JSON.parse(JSON.stringify(turning));
    expect(checkFigure(held)).toBe(held);
  });

  it('names every curve of the closed set, and refuses one outside it', () => {
    expect(CURVE_NAMES).toEqual(['easeIn', 'easeOut', 'linear', 'overshoot', 'smoothstep', 'thereAndBack']);
    expect(() => checkFigure(withField(turning, ['timeline', 'spans', '0', 'curve'], 'bounce'))).toThrow(
      'timeline.spans.0.curve is the name of a curve, one of easeIn, easeOut, linear, overshoot, smoothstep, thereAndBack, and is the text "bounce"',
    );
  });

  it('refuses a required field that is missing, with its path', () => {
    const { still, ...rest } = turning;
    expect(still).toBe(0.75);
    expect(() => checkFigure(rest)).toThrow('still is required and is missing');
    expect(() => checkFigure(withField(turning, ['extent', 'width'], undefined))).toThrow(
      'extent.width is required and is missing',
    );
  });

  it('refuses a field of the wrong type, with its path', () => {
    expect(() => checkFigure(withField(turning, ['still'], 'soon'))).toThrow(
      'still is a number and is the text "soon"',
    );
    expect(() => checkFigure(withField(turning, ['loop'], 1))).toThrow('loop is a true or false and is 1');
    expect(() => checkFigure(withField(turning, ['extent'], []))).toThrow('extent is an extent and is a list');
  });

  it('refuses a field the kind does not carry', () => {
    expect(() => checkFigure(withField(turning, ['wobble'], 1))).toThrow('wobble is not a field of a figure');
    expect(() => checkFigure(withField(turning, ['extent', 'depth'], 1))).toThrow(
      'extent.depth is not a field of an extent',
    );
  });

  it('refuses an extent choice with a kind the format has no form for', () => {
    expect(() => checkFigure(withField(turning, ['extent'], { kind: 'byMood', wide: {} }))).toThrow(
      'extent is an extent and has no kind called the text "byMood"',
    );
  });

  it('takes both extent choices and refuses one of them short of a field', () => {
    const extent = { width: 8, height: 4 };
    expect(checkFigure({ ...turning, extent: { kind: 'byAspect', wide: extent, square: extent, tall: extent } })).toBeTruthy();
    expect(checkFigure({ ...turning, extent: { kind: 'matchingAspect', height: 4 } })).toBeTruthy();
    expect(() => checkFigure({ ...turning, extent: { kind: 'byAspect', wide: extent, square: extent } })).toThrow(
      'extent.tall is required and is missing',
    );
  });

  it('holds a track to its keys and refuses a value a key cannot carry', () => {
    expect(() => checkFigure(withField(operations, ['tracks', 'apart', '0', 'time'], 'late'))).toThrow(
      'tracks.apart.0.time is a number and is the text "late"',
    );
    expect(() => checkFigure(withField(operations, ['tracks', 'apart', '0', 'value'], {}))).toThrow(
      "tracks.apart.0.value is a track's value and is an object",
    );
  });

  it('holds a span to its own fields, and its entry to being one', () => {
    expect(() => checkFigure(withField(turning, ['timeline', 'spans', '0', 'from'], 'soon'))).toThrow(
      'timeline.spans.0.from is a number and is the text "soon"',
    );
    expect(() => checkFigure(withField(turning, ['timeline', 'spans', '0', 'entry'], 4))).toThrow(
      'timeline.spans.0.entry is a timeline entry and is 4',
    );
    expect(() => checkFigure(withField(turning, ['timeline', 'spans'], {}))).toThrow(
      'timeline.spans is a list and is an object',
    );
  });

  it('holds an inset to its rectangle, its fit and what it hides', () => {
    const inset = {
      shows: { width: 2, height: 1 },
      into: { x: { from: 1, to: 3 }, y: { from: 1, to: 2 } },
      name: 'panel',
      hides: ['turns/own/pivot'],
    };
    expect(checkFigure({ ...turning, insets: [inset] })).toBeTruthy();
    expect(() => checkFigure({ ...turning, insets: [{ ...inset, into: { x: { from: 1 }, y: inset.into.y } }] })).toThrow(
      'insets.0.into.x.to is required and is missing',
    );
    expect(() => checkFigure({ ...turning, insets: [{ ...inset, fit: 'crop' }] })).toThrow(
      'insets.0.fit is a fit, one of contain, cover, and is the text "crop"',
    );
    expect(() => checkFigure({ ...turning, insets: [{ ...inset, hides: 'turns/own/pivot' }] })).toThrow(
      'insets.0.hides is a list and is the text "turns/own/pivot"',
    );
  });

  it('holds the scene to being a node, which is as deep as it reads today', () => {
    expect(() => checkFigure(withField(turning, ['scene'], 'a shape'))).toThrow(
      'scene is a node and is the text "a shape"',
    );
    // The kinds under a node are described at step 5.6, so a scene carrying a
    // kind the format has no form for is refused by the resolver rather than here.
    expect(checkFigure(withField(turning, ['scene'], { kind: 'wobble' }) as FigureRecord)).toBeTruthy();
  });

  it('refuses a value that is not a figure at all', () => {
    expect(() => checkFigure(null)).toThrow('the figure is a figure and is null');
    expect(() => checkFigure([])).toThrow('the figure is a figure and is a list');
    expect(() => checkFigure(4)).toThrow('the figure is a figure and is 4');
  });
});
