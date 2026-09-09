/**
 * The boolean demo: two discs combined three ways at once.
 *
 * A union of two paths has no picture in a graph of a function and none on a
 * surface either, so it is given a picture whose whole purpose is the
 * operation. The same two discs are drawn three times side by side, as
 * everything either covers, as only what both cover, and as the first with the
 * second taken out of it.
 *
 * One disc stands still and the other walks across it: from clear of it,
 * through touching it at one point, through overlapping it, to sitting wholly
 * inside it, and out the far side. That walk is what makes this a gate rather
 * than an illustration, because it takes the three operations through no
 * crossing, one crossing, two crossings and containment, which are the four
 * cases this kind of code gets silently wrong.
 *
 * Every panel draws its result even when the result is empty, so the list of
 * marks is the same length at every time and one frame can be compared against
 * another.
 */
import {
  resolveFigure,
  TEXT_RATIO,
  textScale,
  vec2,
  type Expression,
  type Extent,
  type Figure,
  type FigureRecord,
  type Mark,
  type NodeRecord,
  type PathRecord,
  type SpanRecord,
  type Track,
  marksAt,
  moveBy,
} from '../index.js';
import { DEEP, INK, PEACH, SLATE } from './palette.js';
import { TYPE } from './typeface.js';

const ink = { colour: INK };
const still = { colour: SLATE, width: 0.018 };
const walker = { colour: DEEP, width: 0.018 };
const wash = { colour: PEACH };

/** Three panels across, and only as tall as they need to be. A frame twice the
 * height of its own picture is a picture floating in white, and over the whole
 * of this timeline the marks reach 2.75 up and down. */
const extent: Extent = { width: 10.8, height: 3 };

/** How far apart the three panels stand, which is also how wide each of them
 * is, so the walk reaching the edge of one reaches the edge of its neighbour. */
export const PANEL = 3.6;

export const DISC_Y = 0.5;
export const LABEL_Y = -1.35;

/** The sizes this figure's text takes, pinned by the panel names, since each one
 * names a drawn shape and this figure draws no tick to pin the scale by. */
export const TEXT = textScale(0.3 / TEXT_RATIO);

/** The still disc and the walking one. The walker is the smaller of the two
 * because a disc the same size can never sit wholly inside another, and
 * containment is one of the four cases this demo exists to take the operations
 * through. */
export const BIG = 0.9;
export const SMALL = 0.36;

/** How far the walker's centre travels either side of the still disc's. At the
 * ends of that the two discs are clear of each other, and on the way it passes
 * the two distances where they touch at exactly one point. */
export const REACH = 1.44;

/** The two distances where the discs meet at one point rather than crossing:
 * the outside touch on the way in, and the inside touch as the walker slips
 * wholly within. */
export const TOUCH_OUTSIDE = BIG + SMALL;
export const TOUCH_INSIDE = BIG - SMALL;

interface Panel {
  /** The standard name of the operation, which is the caption under the panel,
   * the name its marks are grouped under, and the kind of path record the
   * answer is. */
  readonly name: 'union' | 'intersection' | 'difference';
}

export const PANELS: readonly Panel[] = [{ name: 'union' }, { name: 'intersection' }, { name: 'difference' }];

/**
 * One panel: the answer shaded, the two discs outlined over it, and the caption.
 *
 * The walking disc's centre is the track this figure drives its picture from, so
 * it is an expression rather than a place, and the answer is a form over the two
 * discs rather than geometry written down. That is the whole reason a boolean
 * operation is a form: the answer's cubics are none of the operands' and this
 * disc changes the answer every frame.
 */
function panel({ name }: Panel, at: number): NodeRecord {
  const middle = (at - 1) * PANEL;
  const first: PathRecord = { kind: 'circle', centre: vec2(middle, DISC_Y), radius: BIG };
  const walking: Expression = {
    kind: 'point',
    x: { kind: 'arithmetic', operator: '+', left: middle, right: { kind: 'track', name: 'apart' } },
    y: DISC_Y,
  };
  const second: PathRecord = { kind: 'circle', centre: walking, radius: SMALL };
  return {
    kind: 'group',
    name,
    children: [
      // The answer is shaded and the two discs are outlined over it. Stroking the
      // answer as well hid both outlines, leaving a shape with no discs behind it.
      { kind: 'shape', name: 'result', path: { kind: name, first, second }, style: { fill: wash } },
      {
        kind: 'group',
        name: 'discs',
        children: [
          { kind: 'shape', name: 'first', path: first, style: { stroke: still } },
          { kind: 'shape', name: 'second', path: second, style: { stroke: walker } },
        ],
      },
      {
        kind: 'text',
        name: 'label',
        at: vec2(middle, LABEL_Y),
        content: name,
        size: TEXT.label,
        options: { fill: ink, align: 'middle' },
      },
    ],
  };
}

export const scene: NodeRecord = {
  kind: 'group',
  name: 'booleans',
  children: PANELS.map(panel),
  style: TYPE,
};

/** How long one fade of the entrance takes, and how long the results take,
 * which is slower because a filled shape covers more of the picture than an
 * outline and arriving at the same rate reads as a flash. */
const FADE = 0.4;
const RESULT_FADE = 0.5;

/** Seconds between one panel's outlines starting and the next panel's. The gap
 * is what paces a row, so each panel's own fade leaves at speed rather than from
 * rest and the three arrive this far apart. */
const GAP = 0.12;

/** How far each wave of the entrance overlaps the wave before it, so the
 * picture arrives as one movement rather than as three that each stop. */
const OVERLAP = 0.1;

const DISCS_TO = GAP * (PANELS.length - 1) + FADE;
const LABELS_FROM = DISCS_TO - OVERLAP;
const LABELS_TO = LABELS_FROM + FADE;
const RESULTS_FROM = LABELS_TO - OVERLAP;
const RESULTS_TO = RESULTS_FROM + RESULT_FADE;

/** How long the whole entrance takes, which is where its last fade ends. */
const ENTRANCE = RESULTS_TO;

/**
 * The picture arriving: the outlines one panel after another, then the words,
 * then the results.
 *
 * The outlines ease out alone. A wave that eases at both ends and overlaps the
 * next one has two changes slowing into each other at the seam, which reads as a
 * hesitation rather than as one arrival.
 */
const entrance: readonly SpanRecord[] = [
  ...PANELS.map((one, at): SpanRecord => ({
    entry: { kind: 'fadeIn', target: `booleans/${one.name}/discs` },
    from: GAP * at,
    to: GAP * at + FADE,
    curve: 'easeOut',
  })),
  ...PANELS.map((one): SpanRecord => ({
    entry: { kind: 'fadeIn', target: `booleans/${one.name}/label` },
    from: LABELS_FROM,
    to: LABELS_TO,
  })),
  ...PANELS.map((one): SpanRecord => ({
    entry: { kind: 'fadeIn', target: `booleans/${one.name}/result` },
    from: RESULTS_FROM,
    to: RESULTS_TO,
  })),
];

const WALK = 6;
const WALK_FROM = ENTRANCE + 0.4;
const WALK_TO = WALK_FROM + WALK;

/** How long the figure runs, which is past its last span: the walk is a track
 * rather than a span, so nothing on the timeline says when it ends. */
const DURATION = WALK_TO;

/**
 * The walker's centre against the still one's, straight across at one pace.
 *
 * It is a straight ramp rather than an eased one so that a distance can be
 * turned back into the time it happens at. Every named time below is that sum
 * rather than a number typed in, which is what lets the gate ask for the moment
 * the discs touch instead of guessing at it.
 */
export const walk: Track = [
  { time: 0, value: -REACH },
  { time: WALK_FROM, value: -REACH },
  { time: WALK_TO, value: REACH },
];

/** The time the walker's centre is this far from the still one's. */
export function timeApart(apart: number): number {
  return WALK_FROM + ((apart + REACH) / (2 * REACH)) * WALK;
}

export const written: FigureRecord = {
  extent,
  scene,
  tracks: { apart: walk },
  timeline: { spans: entrance, duration: DURATION },
  duration: DURATION,
  still: timeApart(-0.95),
};

export const booleans: Figure = resolveFigure(written);

/** How much wider and taller each frame's slot is than the figure, so a sheet of
 * them has white between the frames rather than one panel running into the
 * next. */
export const SLOT = 11.4;
export const DOWN = 4.4;

/**
 * Several times of one figure laid out together, as one list of marks, each
 * frame's marks carried into its own slot and renamed so no two frames share an
 * id.
 *
 * The frames go in rows rather than in one line, because a figure three panels
 * wide repeated four times across is eleven times wider than it is tall, and at
 * the width a page gives it each panel comes out too small to read.
 */
export function stripMarks(
  times: readonly number[],
  columns = times.length
): { marks: readonly Mark[]; extent: Extent } {
  const rows = Math.ceil(times.length / columns);
  const marks = times.flatMap((seconds, frame) => {
    const across = ((frame % columns) - (columns - 1) / 2) * SLOT;
    const up = ((rows - 1) / 2 - Math.floor(frame / columns)) * DOWN;
    return moveBy('booleans', vec2(across, up))(marksAt(booleans, seconds), 1).map((mark) => ({
      ...mark,
      id: `at${frame}/${mark.id}`,
    }));
  });
  return { marks, extent: { width: SLOT * columns, height: DOWN * rows } };
}

/** What the timeline is made of, and the four distances the gate reads the
 * three panels at: clear of each other, touching at one point, crossing at two,
 * and one wholly inside the other. */
export const TIMES = {
  entrance: ENTRANCE,
  clear: timeApart(-REACH),
  touching: timeApart(-TOUCH_OUTSIDE),
  crossing: timeApart(-0.9),
  slipping: timeApart(-TOUCH_INSIDE),
  inside: timeApart(0),
  walkTo: WALK_TO,
};

/** The times the strip shows: clear, the outside touch, crossing, and wholly
 * inside. */
export const FRAMES = [TIMES.clear, TIMES.touching, TIMES.crossing, TIMES.inside];
