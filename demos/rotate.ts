/**
 * The span demo: one shape carried six ways over one span, two of them turns.
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
 * The rows under the two turns are what else a span does to a flat list of
 * marks: a swell out and back, a walk into another shape and back, a wave
 * crossing the shape, a rock in place, and a straight move out and back. None of
 * the five carries the riding word, since that word is there to show a label
 * staying upright through a turn.
 *
 * This is the first figure here to declare itself a loop. Nothing fades in and
 * nothing is driven by a track, so the picture at the end of the turn is the
 * picture at the start of it and a recording runs it round without a jump. Every
 * gesture here has to end where it began for that to hold, which a wave and a
 * rock do by construction and a swell, a walk and a move do by being given a span
 * back.
 */
import {
  TEXT_RATIO,
  frameTimesOf,
  resolveFigure,
  textScale,
  vec2,
  type Extent,
  type Figure,
  type FigureRecord,
  type Mark,
  type NodeRecord,
  type PathRecord,
  type Vec2,
} from '../index.js';
import { DEEP, EMBER, INK, PEACH } from './palette.js';
import { stripOf } from './strip.js';
import { TYPE } from './typeface.js';

const ink = { colour: INK };
const edge = { colour: DEEP, width: 0.04 };
const wash = { colour: PEACH };
const marker = { colour: EMBER };

/**
 * Two turns across the top and the four other gestures across the row under
 * them, tall enough for the swing of the right turn with the word that rides
 * round outside it.
 *
 * The frame is shaped and placed from what the picture reaches over the whole
 * turn, which is x -4.44 to 5.46 and y -15.12 to 2.75 once every caption and the
 * riding word are counted at their own sizes. It is off the origin because only
 * the right turn swings and only the rows below reach down, so a frame centred
 * on the origin would leave the whole of both differences bare down two edges.
 *
 * It is the width it was before the four gestures were added, since the rows are
 * two across rather than four. That width is what sets how big a glyph reads on
 * the page, and this figure's type is pinned to a reading rather than to a
 * number.
 */
export const CENTRE = vec2(0.51, -6.18);
export const EXTENT: Extent = { width: 10.15, height: 18, centre: CENTRE };

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

/**
 * Where the four panels below the turns stand, and what each one is called.
 *
 * Two to a row rather than four, because a caption is what sets how much room a
 * panel needs and every one of these is wider than the shape it names. Four
 * across left each caption lying over its neighbours, and two across gives every
 * one of them the whole 5.2 between the columns. None of the four carries the
 * riding word: that word is there to show a label staying upright through a turn,
 * and under a swell or a ripple it says nothing.
 */
const ROW = { swell: -5.4, ripple: -9.4, nudge: -13.4 };
const CAPTION = { swell: -7, ripple: -11, nudge: -15 };

function panel(name: string, pivot: Vec2, swing: number, label: string, captionY: number, word?: string): NodeRecord {
  const centre = vec2(pivot.x + swing, pivot.y);
  const shape: NodeRecord = {
    kind: 'shape',
    name: 'ell',
    path: { kind: 'polygon', points: LOCAL.map((point) => vec2.add(point, centre)) },
    style: { fill: wash, stroke: edge },
  };
  const rides: readonly NodeRecord[] = word
    ? [
        shape,
        {
          kind: 'text',
          name: 'word',
          at: vec2.add(centre, RIDER),
          content: word,
          size: TEXT.label,
          options: { fill: ink, align: 'middle' },
        },
      ]
    : [shape];
  return {
    kind: 'group',
    name,
    children: [
      { kind: 'dot', name: 'pivot', at: pivot, radius: 0.07, fill: marker },
      { kind: 'group', name: 'rider', children: rides },
      {
        kind: 'text',
        name: 'label',
        at: vec2(pivot.x, captionY),
        content: label,
        size: TEXT.note,
        options: { fill: ink, align: 'middle' },
      },
    ],
  };
}

/** The four gestures under the turns, each in the column the turn above it
 * stands in. */
const GESTURES = [
  { name: 'bigger', label: 'grown and back', at: vec2(-PANEL, ROW.swell), caption: CAPTION.swell },
  { name: 'walked', label: 'walked into its box', at: vec2(PANEL, ROW.swell), caption: CAPTION.swell },
  { name: 'rippled', label: 'a wave across it', at: vec2(-PANEL, ROW.ripple), caption: CAPTION.ripple },
  { name: 'rocked', label: 'rocked in place', at: vec2(PANEL, ROW.ripple), caption: CAPTION.ripple },
  // The fifth gesture stands alone between the two columns, where its caption has
  // the whole width of the figure rather than half of it.
  { name: 'nudged', label: 'moved and moved back', at: vec2(0, ROW.nudge), caption: CAPTION.nudge },
] as const;

export const GESTURE_AT = Object.fromEntries(GESTURES.map((one) => [one.name, one.at])) as Record<
  (typeof GESTURES)[number]['name'],
  Vec2
>;

/**
 * The shape the walked panel is walked into: the box round the L, written with
 * the six points the L has and in the same order.
 *
 * A walk pairs the points of one path with the points of another by their place
 * in the list, so two paths of one count walk corner to corner and nothing is
 * resampled on the way. A target whose corners run in a different order round
 * the middle crosses those pairings, and the shape halfway along collapses: the
 * L walked into a hexagon of its own size stood 0.56 tall at the half against
 * the 1.60 it starts at. The box keeps three of the L's corners where they are
 * and opens the other three out to the edge, so nothing crosses.
 */
const BOX: readonly Vec2[] = [
  vec2(-0.6, -0.8),
  vec2(0.6, -0.8),
  vec2(0.6, 0),
  vec2(0.6, 0.8),
  vec2(0, 0.8),
  vec2(-0.6, 0.8),
];

export const scene: NodeRecord = {
  kind: 'group',
  name: 'turns',
  children: [
    panel('own', OWN, 0, 'about its centre', LABEL_Y, 'upright'),
    panel('given', GIVEN, SWING, 'about a given point', LABEL_Y, 'upright'),
    ...GESTURES.map((one) => panel(one.name, one.at, 0, one.label, one.caption)),
  ],
  style: TYPE,
};

/** How long the whole circle takes. */
export const TURN = 6;

/** How big the swelling panel gets at the half, and the two paths the walked
 * panel steps between, each written as the record a shape is drawn from. */
export const SWELL = 1.34;

/** How far the nudged panel is moved before it is moved back. */
export const NUDGE = vec2(0.9, 0);
const ell: PathRecord = { kind: 'polygon', points: LOCAL.map((point) => vec2.add(point, GESTURE_AT.walked)) };
const box: PathRecord = { kind: 'polygon', points: BOX.map((point) => vec2.add(point, GESTURE_AT.walked)) };

/**
 * Both panels turn together, at one pace.
 *
 * The pace is flat rather than eased at both ends, which every other span here
 * is, because this one loops: a turn that slows to a stop and starts again would
 * read as a stutter once a second time round.
 */
export const written: FigureRecord = {
  extent: EXTENT,
  scene,
  timeline: {
    spans: [
      { entry: { kind: 'rotate', target: 'turns/own/rider', angle: 2 * Math.PI }, from: 0, to: TURN, curve: 'linear' },
      {
        entry: { kind: 'rotate', target: 'turns/given/rider', angle: 2 * Math.PI, options: { pivot: GIVEN } },
        from: 0,
        to: TURN,
        curve: 'linear',
      },
      // A swell and a walk each need a span out and a span back, since both end
      // their own span where they were sent rather than where they started, and
      // this figure draws the same picture at the end of the turn as at the
      // start of it. A wave and a rock are at rest at both ends already.
      { entry: { kind: 'scale', target: 'turns/bigger/rider/ell', to: SWELL }, from: 0, to: TURN / 2 },
      // The span back counts to the reciprocal, since a scale multiplies the
      // marks it is handed and the span before it left them at the swell.
      { entry: { kind: 'scale', target: 'turns/bigger/rider/ell', to: 1 / SWELL }, from: TURN / 2, to: TURN },
      {
        entry: { kind: 'morph', target: 'turns/walked/rider/ell', into: box },
        from: 0,
        to: TURN / 2,
      },
      {
        entry: { kind: 'morph', target: 'turns/walked/rider/ell', into: ell },
        from: TURN / 2,
        to: TURN,
      },
      {
        entry: { kind: 'wave', target: 'turns/rippled/rider/ell', options: { amplitude: 0.34, covers: 0.45 } },
        from: 0,
        to: TURN,
        curve: 'linear',
      },
      {
        entry: { kind: 'wiggle', target: 'turns/rocked/rider/ell', options: { factor: 1.22, angle: 0.16, rocks: 3 } },
        from: 0,
        to: TURN,
        curve: 'linear',
      },
      // The span back takes the offset negated rather than the place it started
      // from, since a straight move carries the marks it is handed by the offset
      // times how far along the span has gone.
      { entry: { kind: 'moveBy', target: 'turns/nudged/rider/ell', offset: NUDGE }, from: 0, to: TURN / 2 },
      {
        entry: { kind: 'moveBy', target: 'turns/nudged/rider/ell', offset: vec2(-NUDGE.x, -NUDGE.y) },
        from: TURN / 2,
        to: TURN,
      },
    ],
    duration: TURN,
  },
  duration: TURN,
  still: TURN * 0.125,
  loop: true,
};

export const turns: Figure = resolveFigure(written);

/**
 * How much wider and taller each frame's slot is than the figure.
 *
 * The slot is a good deal wider than the figure needs, because a frame holds two
 * panels and a reader reads a row by its gaps. A gap between two frames narrower
 * than the gap between the two panels inside one makes a row of two frames read
 * as a row of four panels.
 */
export const SLOT = 14;
export const DOWN = 18.6;

/**
 * Several times of one figure laid out together, as one list of marks, each
 * frame's marks carried into its own slot and renamed so no two frames share an
 * id.
 */
export function stripMarks(
  times: readonly number[],
  columns = times.length,
  figure: Figure = turns
): { marks: readonly Mark[]; extent: Extent } {
  // Both panels are drawn about a middle of their own, so each frame is carried
  // off that middle before it is carried into its slot.
  return stripOf(figure, 'turns', times, columns, { across: SLOT, down: DOWN }, () => CENTRE);
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
