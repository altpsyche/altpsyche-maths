/**
 * The flat demo: a tangent sliding along a curve.
 *
 * It was written before the code it needed, as the target the work was built to
 * compile against. A demo written afterwards checks that the code runs, where a
 * demo written first says what the code has to be able to say.
 *
 * At 0.5.0 the picture arrives rather than appearing: the grid fades, the axes
 * draw on, their labels come in one after another, the curve draws, the dot
 * grows out of the origin, and the dot is indicated at the stationary point with
 * its reading boxed. Then the dot walks the curve and flashes at the top.
 *
 * At 0.6.0 the reading gains the rule it comes from, typeset once when this
 * module loads. The number beside it is the same rule with a value put in.
 *
 * At 0.7.0 that rule is two rules. It reads nothing for a slope while the dot is
 * held at the stationary point, and as the dot leaves it the right-hand side
 * walks into the one that depends on x. Both are in the picture at every time
 * and the morph moves one onto the other.
 *
 * At 0.8.0 the walk ends with a brace measuring how far the curve climbed, and
 * its number counts up to that rise. The dot has stopped by then, which is what
 * lets a number here be driven by the clock: every other one is a value of the
 * track and two clocks would be free to disagree.
 *
 * At 0.11.0 the slope field of the curve is drawn behind it. Every arrow lies
 * along the tangent the curve has at that x, so the tangent the dot carries is
 * the one arrow of the field that is being pointed at, and the curve itself is
 * the streamline of the field through the origin.
 */
import {
  areaUnder,
  axes,
  circumscribe,
  clamp,
  coordsOf,
  dot,
  brace,
  countTo,
  draw,
  equationFromTex,
  equationNode,
  fadeIn,
  morphEquation,
  flash,
  fractionOf,
  growFrom,
  group,
  indicate,
  interval,
  labelFor,
  moveBy,
  numberPlane,
  plot,
  pointAlong,
  pointOf,
  sampleTrack,
  scaleOf,
  shape,
  slopeOf,
  tangentAt,
  text,
  toGraph,
  vec2,
  vectorField,
  Timeline,
  marksAt,
  type Equation,
  type Extent,
  type Figure,
  type Mark,
  type Node,
  type Vec2,
  type Track,
} from '../index.js';
import { AMBER, DEEP, EMBER, HAZE, INK, MIST, PEACH, STEEL } from './palette.js';

const ink = { colour: INK };
const pen = { colour: INK, width: 0.02 };
const faint = { colour: MIST, width: 0.012 };
const drawn = { colour: EMBER, width: 0.05 };
const accent = { colour: DEEP, width: 0.035 };
const wash = { colour: PEACH };
const lit = AMBER;

/** The two colours a field arrow takes, the second where the curve has begun to
 * climb, so the field darkens across the picture the way the curve steepens. */
const gentle = HAZE;
const steep = STEEL;

const size = { width: 10.8, height: 6 };

/**
 * How far the dot may sit from the middle of the frame, across, before the view
 * starts to follow it, in figure units.
 *
 * The view holds still while the dot is inside that reach and then pushes exactly
 * as far as it must to hold it there, so the grid slides under a dot that stays
 * where a reader is already looking. Following the dot exactly would leave the
 * picture with nothing that stands still.
 */
const REACH = 1.2;

/**
 * Where the middle of the frame sits when the dot is at this point.
 *
 * The view follows across and not up and down, because the reading and the rule
 * are placed against the frame and the graph is not: a view that dropped to
 * follow the dot at the stationary point would carry that band down over the top
 * of the grid.
 */
function frameAt(point: Vec2): Extent {
  return { ...size, centre: vec2(point.x - clamp(point.x, -REACH, REACH), 0) };
}

/**
 * Nine graph units up against five across, so the parabola is cut where it meets
 * the top of its own axis rather than running off the picture.
 *
 * The graph stops at 1.6 up rather than filling the figure, which leaves a band
 * across the top for the reading and the rule it is a value of. Written over the
 * graph instead, both of them sit on live grid lines.
 */
export const coords = coordsOf(
  scaleOf(interval(-1, 4), interval(-4.6, 4.6)),
  scaleOf(interval(-1, 9), interval(-2.55, 1.6))
);

export const curve = (x: number) => x * x;

/**
 * The direction the curve has at a place, which is one across and the curve's
 * own slope up.
 *
 * The slope is read from the curve rather than written out a second time, so
 * the field and the tangent the dot carries cannot come to disagree.
 */
export const slopeField = (at: Vec2) => vec2(1, slopeOf(curve, at.x));

/** How many arrows across and up. Ten by five leaves the cells nearly square on
 * the figure, since the graph is 9.2 figure units wide and 4.15 tall. */
const FIELD = { x: 10, y: 5 };

/** How long an arrow is, in figure units, against the magnitude of the vector
 * there. It settles towards a third of a figure unit as the curve steepens
 * rather than growing with the slope, since a slope of eight drawn at eight
 * times the length of a slope of one would cover the curve it belongs to. */
const arrowLength = (magnitude: number) => (0.34 * magnitude) / (0.6 + magnitude);

/** The stretch the dot walks, from the stationary point to where the curve meets
 * the top of its axis. The walk is measured along this rather than across x, so
 * the dot keeps one speed instead of gathering pace as the curve steepens. */
const walkPath = plot(coords, curve, { over: interval(0, 3) });

const START = pointAlong(walkPath, 0) ?? vec2(0, 0);

/** The rule at the stationary point and the rule everywhere else, typeset when
 * this module loads rather than at every frame, since the geometry of each is
 * the same at every time. */
const atRest = await equationFromTex('\\frac{dy}{dx} = 0');
const moving = await equationFromTex('\\frac{dy}{dx} = 2x');

/** Where the rules start and the box each is fitted inside. Both are hung from
 * the same left edge, under the reading's own, so the six glyphs they share
 * stand still while the right-hand side walks. Centred instead they would slide
 * sideways by 0.083 as the wider one arrives. Both sit in the band above the
 * graph rather than over it. */
const RULE_WIDTH = 1.2;
const RULE_HEIGHT = 0.6;
const rule = (name: string, equation: Equation, frame: Extent) =>
  equationNode(name, equation, {
    at: fractionOf(frame, 0.02, 0.825),
    align: 'start',
    width: RULE_WIDTH,
    height: RULE_HEIGHT,
    fill: ink,
  });

/** How far the curve climbs over the stretch the dot walks, which is what the
 * brace at the end measures and what its number counts to. */
const RISE = curve(3);

/** The brace stands on the right of the shaded region, so it is pushed the way
 * the perpendicular of a downward span points, which is away from the curve. */
const RISE_DEPTH = 0.3;

/** Every label along the x axis, named after the number it shows, which is what
 * lets them arrive one after another. */
const acrossLabels = ['-1', '0', '1', '2', '3', '4'].map((label) => `tangent/axes/x/labels/${label}`);

/**
 * The whole picture at one place along the walk, given as a fraction of the
 * walk's own length.
 *
 * The graph x is recovered from that place rather than driven beside it, so the
 * dot, the tangent and the reading are one number. Driving the dot with a span
 * and the tangent with a track would be two clocks free to disagree.
 */
export function sceneAt(along: number): Node {
  const point = pointAlong(walkPath, along) ?? START;
  const frame = frameAt(point);
  const x = toGraph(coords.x, point.x);
  return group('tangent', [
    numberPlane('grid', coords, { stroke: faint, minors: 4, minorOpacity: 0.45 }),
    axes('axes', coords, { stroke: pen, fill: ink, size: 0.26, tip: 0.18 }),
    shape('area', areaUnder(coords, curve, interval(0, x)), { fill: wash }),
    vectorField('field', coords, slopeField, {
      resolution: FIELD,
      lengthOf: arrowLength,
      colourFor: (magnitude) => (magnitude > 3 ? steep : gentle),
      width: 0.018,
    }),
    shape('curve', plot(coords, curve), { stroke: drawn }),
    shape('tangent', tangentAt(coords, curve, x, { reach: 1.2 }), { stroke: accent }),
    dot('point', point, 0.08, ink),
    text('reading', fractionOf(frame, 0.02, 0.925), `slope ${labelFor(slopeOf(curve, x), 0.01)}`, 0.34, {
      fill: ink,
    }),
    group('equation', [rule('at-rest', atRest, frame), rule('moving', moving, frame)]),
    brace('rise', pointOf(coords, 3, RISE), pointOf(coords, 3, 0), labelFor(RISE, 0.01), {
      depth: RISE_DEPTH,
      padding: 0.28,
      stroke: pen,
      fill: ink,
      size: 0.3,
    }),
  ]);
}

/** The picture arriving, one part at a time. */
const entrance = Timeline.empty()
  .play(fadeIn('tangent/grid'), 0.6)
  .together([draw('tangent/axes/x/line'), draw('tangent/axes/y/line')], 0.7, { after: -0.2 })
  .together(
    [
      fadeIn('tangent/axes/x/ticks'),
      fadeIn('tangent/axes/y/ticks'),
      fadeIn('tangent/axes/x/tips'),
      fadeIn('tangent/axes/y/tips'),
    ],
    0.4,
    { after: -0.1 }
  )
  .stagger(
    acrossLabels.map((label) => fadeIn(label)),
    0.4,
    { gap: 0.08 }
  )
  .play(fadeIn('tangent/axes/y/labels'), 0.4, { after: -0.4 })
  .play(draw('tangent/curve'), 0.9, { after: -0.1 })
  .play(growFrom('tangent/point', pointOf(coords, 0, 0)), 0.4, { after: -0.2 })
  .together(
    [
      fadeIn('tangent/area'),
      fadeIn('tangent/field'),
      fadeIn('tangent/tangent'),
      fadeIn('tangent/reading'),
      fadeIn('tangent/equation'),
    ],
    0.5,
    { after: -0.1 }
  );

/** The beat at the stationary point, where the slope is nothing and the reading
 * says so. */
const beat = entrance.together(
  [
    indicate('tangent/point', { factor: 2, colour: lit }),
    circumscribe('tangent/reading', { stroke: accent, padding: 0.14 }),
  ],
  1,
  { after: 0.2 }
);

const WALK = 3.6;
const WALK_FROM = beat.duration;
const WALK_TO = WALK_FROM + WALK;

/** How long the right-hand side takes to walk, which starts as the walk does so
 * the reading and the rule stop disagreeing about the slope. */
const MORPH = 0.9;

const morphed = beat.play(morphEquation('tangent/equation/at-rest', 'tangent/equation/moving'), MORPH);

const flashed = morphed.wait(WALK - MORPH).play(flash('tangent/point', { stroke: accent, rays: 10 }), 0.8);

/** The brace draws on while its number counts to the rise, which is one span so
 * the two cannot end at different moments. */
const line = flashed.together(
  [
    draw('tangent/rise/brace'),
    fadeIn('tangent/rise/word'),
    countTo('tangent/rise/word', 0, RISE, (value) => labelFor(value, 0.01)),
  ],
  0.9,
  { after: 0.15 }
);

/** The walk holds at the stationary point until the picture has arrived and been
 * pointed at, then runs to the top of the curve. */
export const walk: Track = [
  { time: 0, value: 0, smooth: true },
  { time: WALK_FROM, value: 0, smooth: true },
  { time: WALK_TO, value: 1, smooth: true },
];

/** Where the dot is at a time, which is what the view follows and what the strip
 * lays each frame out against. */
export function pointAt(seconds: number): Vec2 {
  return pointAlong(walkPath, sampleTrack(walk, seconds) as number) ?? START;
}

export const tangent: Figure = {
  extent: (_aspect, seconds) => frameAt(pointAt(seconds)),
  duration: line.duration,
  still: WALK_FROM + WALK * 0.85,
  tracks: { s: walk },
  timeline: line,
  scene: (_seconds, values) => sceneAt(values.s as number),
};

/** How much wider each frame's slot is than the figure, so a strip of them has
 * white between the frames rather than one grid running into the next. */
export const SLOT = 11.4;

/** How far apart two rows of the strip sit, in figure units, the way `SLOT`
 * spaces two columns. */
export const DOWN = 6.4;

/**
 * Several times of one figure side by side, as one list of marks.
 *
 * It is marks rather than a tree because each frame is the figure with its own
 * timeline applied, and a timeline answers a time rather than a place in a tree.
 * Each frame's marks are carried sideways and renamed, so no two frames share an
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
    // Each frame is carried by its own view as well as into its slot, or a frame
    // whose view had followed the dot would sit off its own slot by that much.
    const seen = frameAt(pointAt(seconds)).centre ?? vec2(0, 0);
    return moveBy('tangent', vec2(across - seen.x, up - seen.y))(marksAt(tangent, seconds), 1).map((mark) => ({
      ...mark,
      id: `at${frame}/${mark.id}`,
    }));
  });
  return { marks, extent: { width: SLOT * columns, height: DOWN * rows } };
}

/** The times the strip shows, which are also the times the gate reads the demo
 * at: the picture arrived, the beat, half way up, and the end with the rise
 * braced. The last is the end rather than the top of the curve, because a strip
 * that stops at the top shows none of what the last beat adds. */
export const FRAMES = [entrance.duration, beat.duration, WALK_FROM + WALK * 0.5, line.duration];

/** What the timeline is made of, for a gate that would otherwise have to guess
 * where one part of the story ends and the next begins. */
export const TIMES = {
  entrance: entrance.duration,
  beat: beat.duration,
  walkFrom: WALK_FROM,
  morphTo: WALK_FROM + MORPH,
  walkTo: WALK_TO,
  braceFrom: flashed.duration + 0.15,
  braceTo: line.duration,
};
