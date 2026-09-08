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
  circle,
  differenceOf,
  easeOut,
  fadeIn,
  group,
  intersectionOf,
  shape,
  text,
  TEXT_RATIO,
  textScale,
  unionOf,
  vec2,
  Timeline,
  type Extent,
  type Figure,
  type Mark,
  type Node,
  type Path,
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
const PANEL = 3.6;

const DISC_Y = 0.5;
const LABEL_Y = -1.35;

/** The sizes this figure's text takes, pinned by the panel names, since each one
 * names a drawn shape and this figure draws no tick to pin the scale by. */
const TEXT = textScale(0.3 / TEXT_RATIO);

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
  /** The standard name of the operation, which is both the caption under the
   * panel and the name its marks are grouped under. */
  readonly name: string;
  readonly combine: (first: Path, second: Path) => Path;
}

export const PANELS: readonly Panel[] = [
  { name: 'union', combine: unionOf },
  { name: 'intersection', combine: intersectionOf },
  { name: 'difference', combine: differenceOf },
];

/** The whole picture with the walking disc's centre this far from the still
 * one's, which is the one number the three panels are all drawn from. */
export function sceneAt(apart: number): Node {
  return group(
    'booleans',
    PANELS.map((panel, at) => {
      const middle = (at - 1) * PANEL;
      const first = circle(vec2(middle, DISC_Y), BIG);
      const second = circle(vec2(middle + apart, DISC_Y), SMALL);
      // The answer is shaded and the two discs are outlined over it. Stroking the
      // answer as well hid both outlines, leaving a shape with no discs behind it.
      return group(panel.name, [
        shape('result', panel.combine(first, second), { fill: wash }),
        group('discs', [shape('first', first, { stroke: still }), shape('second', second, { stroke: walker })]),
        text('label', vec2(middle, LABEL_Y), panel.name, TEXT.label, { fill: ink, align: 'middle' }),
      ]);
    }),
    { style: TYPE }
  );
}

/** The picture arriving: the outlines one panel after another, then the words,
 * then the results. */
const entrance = Timeline.empty()
  // The gap is what paces a row, so each panel's own fade leaves at speed rather
  // than from rest and the three arrive 0.12 apart as the gap says.
  .stagger(
    PANELS.map((panel) => fadeIn(`booleans/${panel.name}/discs`)),
    0.4,
    { gap: 0.12, curve: easeOut }
  )
  .together(
    PANELS.map((panel) => fadeIn(`booleans/${panel.name}/label`)),
    0.4,
    { after: -0.1 }
  )
  .together(
    PANELS.map((panel) => fadeIn(`booleans/${panel.name}/result`)),
    0.5,
    { after: -0.1 }
  );

const WALK = 6;
const WALK_FROM = entrance.duration + 0.4;
const WALK_TO = WALK_FROM + WALK;

const line = entrance.wait(WALK + 0.4);

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

export const booleans: Figure = {
  extent,
  duration: line.duration,
  still: timeApart(-0.95),
  tracks: { apart: walk },
  timeline: line,
  scene: (_seconds, values) => sceneAt(values.apart as number),
};

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
  entrance: entrance.duration,
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
