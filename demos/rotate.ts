/**
 * The rotation demo: one shape turned a whole circle, about two different points.
 *
 * A turn has no picture in a graph of a function, where nothing turns, and none
 * on a surface either, where an orbit turns the camera and a surface spinning in
 * place turns its own transform in space. Neither of those is `rotate`, which
 * multiplies a flat list of marks by a flat matrix over a span of the timeline.
 * So the turn is given a picture whose whole purpose is the turn, the way the
 * boolean operations were given one.
 *
 * The left panel turns the shape about the point the marks themselves decide,
 * which is the middle of the box round them, so it spins where it stands. The
 * right panel turns the same shape about a point the figure names, a way off to
 * one side, so it swings round instead. A word rides with the shape in both
 * panels and stays upright the whole way. A mark carries no rotation of its own,
 * and a label that stays readable while the thing it names turns is what a
 * figure wants anyway.
 *
 * This is the first figure here to declare itself a loop. Nothing fades in and
 * nothing is driven by a track, so the picture at the end of the turn is the
 * picture at the start of it and a recording runs it round without a jump.
 */
import {
  dot,
  frameTimesOf,
  group,
  linear,
  polygon,
  rotate,
  shape,
  text,
  TEXT_RATIO,
  textScale,
  vec2,
  Timeline,
  marksAt,
  moveBy,
  type Extent,
  type Figure,
  type Mark,
  type Node,
  type Path,
  type Vec2,
} from '../index.js';
import { DEEP, EMBER, INK, PEACH } from './palette.js';
import { TYPE } from './typeface.js';

const ink = { colour: INK };
const edge = { colour: DEEP, width: 0.04 };
const wash = { colour: PEACH };
const marker = { colour: EMBER };

/**
 * Two panels across, and tall enough for the swing of the right one with the
 * word that rides round outside it.
 *
 * The frame is shaped and placed from what the picture reaches over the whole
 * turn, which is x -4.44 to 5.51 and y -2.83 to 2.77 once the captions and the
 * riding word are counted at their own sizes. It is off the origin because only
 * the right panel swings, so the marks stand further right than left, and a
 * frame centred on the origin would leave the whole of that difference bare down
 * the left edge.
 */
export const CENTRE = vec2(0.53, -0.08);
const extent: Extent = { width: 10.15, height: 5.8, centre: CENTRE };

/**
 * The shape, written about its own box centre.
 *
 * An L is worth turning because the middle of the box round it is out in the
 * empty corner rather than anywhere the shape is, so a spin about that middle
 * looks like a spin rather than like a wobble. Writing the points about that
 * middle puts the pivot a turn falls back on at a number this file states.
 */
export const LOCAL: readonly Vec2[] = [
  vec2(-0.6, -0.8),
  vec2(0.6, -0.8),
  vec2(0.6, -0.4),
  vec2(-0.2, -0.4),
  vec2(-0.2, 0.8),
  vec2(-0.6, 0.8),
];

/**
 * Where the word rides, from the shape's own centre: the corner of its box that
 * the L leaves empty.
 *
 * It is a corner of that box rather than a point outside it, so the anchor a
 * text mark contributes to the box does not widen it and the default pivot stays
 * the shape's own centre. The empty corner is the one place on that box where
 * the word does not land on top of the shape.
 */
export const RIDER = vec2(0.6, 0.8);

const ell = (centre: Vec2): Path => polygon(LOCAL.map((point) => vec2.add(point, centre)));

/** How far each panel's middle stands from the middle of the figure. */
const PANEL = 2.6;
const SHAPE_Y = 0.2;
export const LABEL_Y = -2.75;
/** The sizes this figure's text takes, pinned by the word riding the shape since
 * this figure draws no axis to pin them by. The word is the size that holds the
 * smallest glyph at 21.02 pixels on the page in a frame ten units wide. */
export const TEXT = textScale(0.296 / TEXT_RATIO);


/** The left panel's pivot, which is also its shape's centre, because a turn
 * about the middle of the box round the marks is a turn about that point. */
export const OWN = vec2(-PANEL, SHAPE_Y);

/** The right panel's pivot, which the figure names, and how far its shape stands
 * from it. */
export const GIVEN = vec2(PANEL, SHAPE_Y);
export const SWING = 1.6;

function panel(name: string, pivot: Vec2, swing: number, label: string): Node {
  const centre = vec2(pivot.x + swing, pivot.y);
  return group(name, [
    dot('pivot', pivot, 0.07, marker),
    group('rider', [
      shape('ell', ell(centre), { fill: wash, stroke: edge }),
      text('word', vec2.add(centre, RIDER), 'upright', TEXT.label, { fill: ink, align: 'middle' }),
    ]),
    text('label', vec2(pivot.x, LABEL_Y), label, TEXT.note, { fill: ink, align: 'middle' }),
  ]);
}

export const scene: Node = group(
  'turns',
  [panel('own', OWN, 0, 'about its centre'), panel('given', GIVEN, SWING, 'about a given point')],
  { style: TYPE }
);

/** How long the whole circle takes. */
export const TURN = 6;

/**
 * Both panels turn together, at one pace.
 *
 * The pace is flat rather than eased at both ends, which every other span here
 * is, because this one loops: a turn that slows to a stop and starts again would
 * read as a stutter once a second time round.
 */
const line = Timeline.empty().together(
  [rotate('turns/own/rider', 2 * Math.PI), rotate('turns/given/rider', 2 * Math.PI, { pivot: GIVEN })],
  TURN,
  { curve: linear }
);

export const turns: Figure = {
  extent,
  scene,
  timeline: line,
  duration: line.duration,
  still: TURN * 0.125,
  loop: true,
};

/**
 * How much wider and taller each frame's slot is than the figure.
 *
 * The slot is a good deal wider than the figure needs, because a frame holds two
 * panels and a reader reads a row by its gaps. A gap between two frames narrower
 * than the gap between the two panels inside one makes a row of two frames read
 * as a row of four panels.
 */
export const SLOT = 14;
export const DOWN = 6.6;

/**
 * Several times of one figure laid out together, as one list of marks, each
 * frame's marks carried into its own slot and renamed so no two frames share an
 * id.
 */
export function stripMarks(
  times: readonly number[],
  columns = times.length
): { marks: readonly Mark[]; extent: Extent } {
  const rows = Math.ceil(times.length / columns);
  const marks = times.flatMap((seconds, frame) => {
    const across = ((frame % columns) - (columns - 1) / 2) * SLOT;
    const up = ((rows - 1) / 2 - Math.floor(frame / columns)) * DOWN;
    return moveBy('turns', vec2(across - CENTRE.x, up - CENTRE.y))(marksAt(turns, seconds), 1).map((mark) => ({
      ...mark,
      id: `at${frame}/${mark.id}`,
    }));
  });
  return { marks, extent: { width: SLOT * columns, height: DOWN * rows } };
}

/** The quarters of the turn, which is what the gate reads. */
export const TIMES = {
  start: 0,
  quarter: TURN * 0.25,
  half: TURN * 0.5,
  threeQuarters: TURN * 0.75,
  whole: TURN,
};

/**
 * The four frames the strip shows, walked at a fixed step rather than written
 * out.
 *
 * A walk stops strictly before the duration, which is what leaves the whole turn
 * off the strip: this figure is a loop, so the frame at six seconds draws the
 * same picture as the frame at nothing.
 */
export const FRAMES = frameTimesOf(turns, { frames: 4 });
