/**
 * The frame demo: one mark placed against the frame beside one placed in the
 * figure's own units.
 *
 * A mark whose place is a fraction of the frame has no picture in a graph of a
 * function, where every place is a place in the graph, and none on a surface
 * either. So the frame is given a figure whose whole subject is the frame, the
 * way the turn and the boolean operations were each given one.
 *
 * The plate is a rectangle inset a twentieth of the frame on every side, so it
 * is a different rectangle at every shape the frame comes in. The disc is a
 * circle of radius 1.05 about the origin, so it is the same circle at all three.
 * The strip draws the two together at sixteen by nine, at square and at nine by
 * sixteen, which is the reading that says which of them answers to the frame.
 */
import {
  marksAt,
  moveBy,
  resolveFigure,
  textScale,
  vec2,
  type Extent,
  type Figure,
  type FigureRecord,
  type Mark,
  type NodeRecord,
} from '../index.js';
import { DEEP, EMBER, INK, PEACH } from './palette.js';
import { atFraction, shareOf } from './place.js';
import { TYPE } from './typeface.js';

const ink = { colour: INK };
const edge = { colour: DEEP, width: 0.04 };
const wash = { colour: PEACH };
const marker = { colour: EMBER };

/** The height the figure is measured against. The width follows the shape of
 * whatever it is drawn on, which is what gives the frame three shapes to be
 * read at. */
export const HEIGHT = 6;

/** The three shapes the strip draws: sixteen by nine, square, and nine by
 * sixteen, which are the shapes anything here is drawn at. */
export const SHAPES = [16 / 9, 1, 9 / 16] as const;

/** How far the plate is held off each edge, as a fraction of the frame. */
const INSET = 0.05;

/** The sizes this figure's text takes. The smallest is the size that holds a
 * glyph at 14.60 pixels on the page in the strip, which is the tightest of the
 * two sheets this figure writes. */
export const TEXT = textScale(0.27);

/** The circle the plate is read against, in the figure's own units. */
export const DISC = 1.05;
export const DISC_WORD_Y = -1.8;

export const scene: NodeRecord = {
  kind: 'group',
  name: 'frame',
  children: [
    {
      kind: 'shape',
      name: 'plate',
      path: {
        kind: 'rect',
        corner: atFraction(INSET, INSET),
        width: shareOf('width', 1 - INSET * 2),
        height: shareOf('height', 1 - INSET * 2),
      },
      style: { fill: wash, stroke: edge },
    },
    {
      kind: 'shape',
      name: 'disc',
      path: { kind: 'circle', centre: vec2(0, 0), radius: DISC },
      style: { fill: marker, stroke: edge },
    },
    {
      kind: 'text',
      name: 'discWord',
      at: vec2(0, DISC_WORD_Y),
      content: 'figure units',
      size: TEXT.label,
      options: { fill: ink, align: 'middle' },
    },
    {
      kind: 'text',
      name: 'plateWord',
      at: atFraction(0.5, 0.88),
      content: 'the frame',
      size: TEXT.label,
      options: { fill: ink, align: 'middle' },
    },
  ],
  style: TYPE,
};

export const HOLD = 1.8;

export const written: FigureRecord = {
  extent: { kind: 'matchingAspect', height: HEIGHT },
  fit: 'contain',
  scene,
  timeline: {
    spans: [
      { entry: { kind: 'fadeIn', target: 'frame/plate' }, from: 0, to: 0.6 },
      { entry: { kind: 'growFrom', target: 'frame/disc' }, from: 0.5, to: 1.2 },
      { entry: { kind: 'fadeIn', target: 'frame/discWord' }, from: 1, to: 1.5 },
      { entry: { kind: 'fadeIn', target: 'frame/plateWord' }, from: 1.3, to: HOLD },
    ],
    duration: HOLD,
  },
  still: HOLD,
};

export const framed: Figure = resolveFigure(written);

/** The gap between two columns of the strip, in the figure's own units. */
export const GAP = 0.7;

/**
 * The same figure at each of three shapes, laid out in one row.
 *
 * The strip walks shapes rather than times, which every other strip here does,
 * because what this figure has to show is what changes when the frame changes
 * and not what changes as the clock runs. Each column is carried into its own
 * place and renamed, so no two columns share an id.
 */
export function stripMarks(
  seconds: number = HOLD,
  aspects: readonly number[] = SHAPES,
  figure: Figure = framed
): { marks: readonly Mark[]; extent: Extent } {
  const widths = aspects.map((aspect) => HEIGHT * aspect);
  const total = widths.reduce((sum, width) => sum + width, 0) + GAP * (aspects.length - 1);
  let left = -total / 2;
  const marks = aspects.flatMap((aspect, column) => {
    const by = vec2(left + widths[column] / 2, 0);
    left += widths[column] + GAP;
    return moveBy('frame', by)(marksAt(figure, seconds, aspect), 1).map((mark) => ({
      ...mark,
      id: `at${column}/${mark.id}`,
    }));
  });
  return { marks, extent: { width: total, height: HEIGHT } };
}
