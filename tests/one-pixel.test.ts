/**
 * The consumer's `one-pixel` figure written as a file, which is the figure the
 * frame kind exists for.
 *
 * `altpsyche.dev` draws it over a shader embed and places all four of its marks
 * with `fractionOf`, so every one of them moves when the frame changes shape. It
 * is written here as a `FigureRecord` with those calls as expressions, and the
 * places it reads are the places their module gives.
 */
import { describe, expect, it } from 'vitest';
import { checkFigure, colourFrom, marksAt, resolveFigure, type Expression, type FigureRecord } from '../index.js';

const HEIGHT = 100;
const WORD = 'one pixel';
const SIZE = 5.5;
const CHARACTER = 0.55;
const PADDING = 2.2;
const NAMED = { across: 0.21, up: 0.38 };
const WORD_AT = { across: 0.44, up: 0.68 };

/** One member of `fractionOf(frame, across, up)` as an expression: the centre of
 * the declared extent, plus how far from the middle the fraction asks for. */
function fraction(name: 'width' | 'height', member: 'x' | 'y', of: number): Expression {
  return {
    kind: 'arithmetic',
    operator: '+',
    left: { kind: 'member', of: { kind: 'frame', name: 'centre' }, name: member },
    right: { kind: 'arithmetic', operator: '*', left: of - 0.5, right: { kind: 'frame', name } },
  };
}

const across = (of: number) => fraction('width', 'x', of);
const up = (of: number) => fraction('height', 'y', of);

const shifted = (by: Expression, amount: number): Expression => ({
  kind: 'arithmetic',
  operator: '-',
  left: by,
  right: amount,
});

const GROUND = colourFrom('#0b0b0c');
const ACCENT = colourFrom('#e8623c');

const onePixel: FigureRecord = {
  extent: { kind: 'matchingAspect', height: HEIGHT },
  fit: 'contain',
  scene: {
    kind: 'group',
    name: 'figure',
    children: [
      {
        kind: 'shape',
        name: 'plate',
        path: {
          kind: 'rect',
          // The word sits on its baseline, so the plate starts below it far
          // enough to hold a descender and runs up past the tallest letter.
          corner: {
            kind: 'point',
            x: shifted(across(WORD_AT.across), PADDING),
            y: shifted(up(WORD_AT.up), SIZE * 0.4),
          },
          width: WORD.length * SIZE * CHARACTER + PADDING * 2,
          height: SIZE * 1.35,
        },
        style: { fill: { colour: GROUND } },
      },
      {
        kind: 'callout',
        name: 'pixel',
        at: { kind: 'point', x: across(NAMED.across), y: up(NAMED.up) },
        to: { kind: 'point', x: across(WORD_AT.across), y: up(WORD_AT.up) },
        content: WORD,
        options: {
          stroke: { colour: ACCENT, width: 0.55, cap: 'round' },
          fill: { colour: ACCENT },
          size: SIZE,
          marker: 1.8,
          align: 'start',
          baseline: 'alphabetic',
          weight: 600,
        },
      },
    ],
  },
  timeline: {
    spans: [
      { entry: { kind: 'fadeIn', target: 'figure/pixel/marker' }, from: 0, to: 0.5 },
      { entry: { kind: 'draw', target: 'figure/pixel/leader' }, from: 0.5, to: 1.2 },
      { entry: { kind: 'fadeIn', target: 'figure/plate' }, from: 1.1, to: 1.5 },
      { entry: { kind: 'fadeIn', target: 'figure/pixel/word' }, from: 1.1, to: 1.6 },
    ],
    duration: 1.6,
  },
  still: 1.6,
};

/** The leftmost x the plate reaches, which is the corner `fractionOf` places. */
function plateAt(aspect: number): number {
  const built = resolveFigure(checkFigure(JSON.parse(JSON.stringify(onePixel))));
  const mark = marksAt(built, onePixel.still, aspect).find((each) => each.id === 'figure/plate');
  if (!mark || mark.kind !== 'path') throw new Error('the plate is a path');
  const xs = mark.path.flatMap((subpath) => [subpath.start.x, ...subpath.curves.map((curve) => curve.to.x)]);
  return Math.min(...xs);
}

describe('the consumer one-pixel figure as a file', () => {
  it('reads as a figure and draws its four marks', () => {
    const built = resolveFigure(checkFigure(JSON.parse(JSON.stringify(onePixel))));
    const ids = marksAt(built, onePixel.still, 1.7778).map((mark) => mark.id);
    expect(ids).toEqual(['figure/plate', 'figure/pixel/marker', 'figure/pixel/leader', 'figure/pixel/word']);
  });

  it('places the plate where their module places it, at every aspect it is drawn at', () => {
    expect(plateAt(3)).toBeCloseTo(-20.2, 3);
    expect(plateAt(1.7778)).toBeCloseTo(-12.867, 3);
    expect(plateAt(1)).toBeCloseTo(-8.2, 3);
  });

  it('moves every one of its four marks when the frame changes shape', () => {
    const placesAt = (aspect: number) => {
      const built = resolveFigure(checkFigure(JSON.parse(JSON.stringify(onePixel))));
      return marksAt(built, onePixel.still, aspect).map((mark) =>
        mark.kind === 'text' ? mark.at.x : mark.kind === 'path' ? mark.path[0].start.x : Number.NaN
      );
    };
    const wide = placesAt(3);
    const square = placesAt(1);
    expect(wide).toHaveLength(4);
    for (const [at, x] of wide.entries()) expect(Math.abs(x - square[at]), `mark ${at}`).toBeGreaterThan(1);
  });
});
