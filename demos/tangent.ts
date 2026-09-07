/**
 * The flat demo: a tangent sliding along a curve.
 *
 * It was written before the code it needed, as the target the work was built to
 * compile against. A demo written afterwards checks that the code runs, where a
 * demo written first says what the code has to be able to say.
 *
 * At 0.4.0 it is the grid, the axes, the curve, the region under it, the tangent
 * and the slope as a number. Every version after adds to this same figure.
 */
import {
  areaUnder,
  axes,
  coordsOf,
  dot,
  fractionOf,
  group,
  interval,
  labelFor,
  mat3,
  numberPlane,
  plot,
  pointOf,
  sampleTrack,
  scaleOf,
  shape,
  slopeOf,
  tangentAt,
  text,
  vec2,
  type Extent,
  type Figure,
  type Node,
  type Track,
} from '../index.js';

const ink = { colour: '#1b1b1b' };
const pen = { colour: '#1b1b1b', width: 0.02 };
const faint = { colour: '#1b1b1b', width: 0.012 };
const drawn = { colour: '#c2410c', width: 0.05 };
const accent = { colour: '#0369a1', width: 0.035 };
const wash = { colour: '#fdba74' };

const extent: Extent = { width: 10.8, height: 6 };

/** Nine graph units up against five across, so the parabola is cut where it
 * meets the top of its own axis rather than running off the picture. */
export const coords = coordsOf(
  scaleOf(interval(-1, 4), interval(-4.6, 4.6)),
  scaleOf(interval(-1, 9), interval(-2.4, 2.4))
);

export const curve = (x: number) => x * x;

/** The point walks from the origin to where the curve meets the top of its axis,
 * flat at both ends so the still in the middle is the fastest part. */
export const walk: Track = [
  { time: 0, value: 0, smooth: true },
  { time: 4, value: 3, smooth: true },
];

/** The whole picture at one place along the curve, which both the figure and the
 * strip of frames are built from. */
export function sceneAt(x: number): Node {
  return group('tangent', [
    numberPlane('grid', coords, { stroke: faint, minors: 4, minorOpacity: 0.25 }),
    axes('axes', coords, { stroke: pen, fill: ink, size: 0.26, tip: 0.18 }),
    shape('area', areaUnder(coords, curve, interval(0, x)), { fill: wash }),
    shape('curve', plot(coords, curve), { stroke: drawn }),
    shape('tangent', tangentAt(coords, curve, x, { reach: 1.2 }), { stroke: accent }),
    dot('point', pointOf(coords, x, curve(x)), 0.08, ink),
    text('reading', fractionOf(extent, 0.05, 0.9), `slope ${labelFor(slopeOf(curve, x), 0.01)}`, 0.34, {
      fill: ink,
    }),
  ]);
}

export const tangent: Figure = {
  extent,
  duration: 4,
  still: 2,
  tracks: { x: walk },
  scene: (_seconds, values) => sceneAt(values.x as number),
};

/** How much wider each frame's slot is than the figure, so a strip of them has
 * white between the frames rather than one grid running into the next. */
export const SLOT = 11.4;

/**
 * Several times of one figure side by side, as a figure of its own.
 *
 * A moving picture in a README needs a GIF and this package has no encoder, so
 * what the README carries is a strip that shows the motion in a still.
 */
export function strip(times: readonly number[]): Figure {
  const frames = times.map((seconds, at) =>
    group(`at${at}`, [sceneAt(sampleTrack(walk, seconds) as number)], {
      transform: mat3.translation(vec2((at - (times.length - 1) / 2) * SLOT, 0)),
    })
  );
  return {
    extent: { width: SLOT * times.length, height: extent.height },
    still: 0,
    scene: group('strip', frames),
  };
}

/** The times the strip shows, which are also the times the gate reads the demo
 * at. */
export const FRAMES = [0, 1, 2, 4];
