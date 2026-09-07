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
 */
import {
  areaUnder,
  axes,
  circumscribe,
  coordsOf,
  dot,
  draw,
  fadeIn,
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
  unscaled,
  vec2,
  Timeline,
  at as marksAt,
  type Extent,
  type Figure,
  type Mark,
  type Node,
  type Track,
} from '../index.js';

const ink = { colour: '#1b1b1b' };
const pen = { colour: '#1b1b1b', width: 0.02 };
const faint = { colour: '#1b1b1b', width: 0.012 };
const drawn = { colour: '#c2410c', width: 0.05 };
const accent = { colour: '#0369a1', width: 0.035 };
const wash = { colour: '#fdba74' };
const lit = '#b45309';

const extent: Extent = { width: 10.8, height: 6 };

/** Nine graph units up against five across, so the parabola is cut where it
 * meets the top of its own axis rather than running off the picture. */
export const coords = coordsOf(
  scaleOf(interval(-1, 4), interval(-4.6, 4.6)),
  scaleOf(interval(-1, 9), interval(-2.4, 2.4))
);

export const curve = (x: number) => x * x;

/** The stretch the dot walks, from the stationary point to where the curve meets
 * the top of its axis. The walk is measured along this rather than across x, so
 * the dot keeps one speed instead of gathering pace as the curve steepens. */
const walkPath = plot(coords, curve, { over: interval(0, 3) });

const START = pointAlong(walkPath, 0) ?? vec2(0, 0);

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
  const x = unscaled(coords.x, point.x);
  return group('tangent', [
    numberPlane('grid', coords, { stroke: faint, minors: 4, minorOpacity: 0.25 }),
    axes('axes', coords, { stroke: pen, fill: ink, size: 0.26, tip: 0.18 }),
    shape('area', areaUnder(coords, curve, interval(0, x)), { fill: wash }),
    shape('curve', plot(coords, curve), { stroke: drawn }),
    shape('tangent', tangentAt(coords, curve, x, { reach: 1.2 }), { stroke: accent }),
    dot('point', point, 0.08, ink),
    text('reading', fractionOf(extent, 0.05, 0.9), `slope ${labelFor(slopeOf(curve, x), 0.01)}`, 0.34, {
      fill: ink,
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
  .together([fadeIn('tangent/area'), fadeIn('tangent/tangent'), fadeIn('tangent/reading')], 0.5, { after: -0.1 });

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

const line = beat.wait(WALK).play(flash('tangent/point', { stroke: accent, rays: 10 }), 0.8);

/** The walk holds at the stationary point until the picture has arrived and been
 * pointed at, then runs to the top of the curve. */
export const walk: Track = [
  { time: 0, value: 0, smooth: true },
  { time: WALK_FROM, value: 0, smooth: true },
  { time: WALK_TO, value: 1, smooth: true },
];

export const tangent: Figure = {
  extent,
  duration: line.duration,
  still: WALK_FROM + WALK * 0.6,
  tracks: { s: walk },
  timeline: line,
  scene: (_seconds, values) => sceneAt(values.s as number),
};

/** How much wider each frame's slot is than the figure, so a strip of them has
 * white between the frames rather than one grid running into the next. */
export const SLOT = 11.4;

/**
 * Several times of one figure side by side, as one list of marks.
 *
 * It is marks rather than a tree because each frame is the figure with its own
 * timeline applied, and a timeline answers a time rather than a place in a tree.
 * Each frame's marks are carried sideways and renamed, so no two frames share an
 * id.
 */
export function stripMarks(times: readonly number[]): { marks: readonly Mark[]; extent: Extent } {
  const marks = times.flatMap((seconds, frame) => {
    const across = (frame - (times.length - 1) / 2) * SLOT;
    return moveBy('tangent', vec2(across, 0))(marksAt(tangent, seconds), 1).map((mark) => ({
      ...mark,
      id: `at${frame}/${mark.id}`,
    }));
  });
  return { marks, extent: { width: SLOT * times.length, height: extent.height } };
}

/** The times the strip shows, which are also the times the gate reads the demo
 * at: the picture arrived, the beat, half way up, and the top. */
export const FRAMES = [entrance.duration, beat.duration, WALK_FROM + WALK * 0.5, WALK_TO];

/** What the timeline is made of, for a gate that would otherwise have to guess
 * where one part of the story ends and the next begins. */
export const TIMES = { entrance: entrance.duration, beat: beat.duration, walkFrom: WALK_FROM, walkTo: WALK_TO };
