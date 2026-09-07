/**
 * The flat demo: a tangent sliding along a curve.
 *
 * It is written before the code it needs, as the target the work is built to
 * compile against. A demo written afterwards checks that the code runs, where a
 * demo written first says what the code has to be able to say.
 *
 * At 0.4.0 it is the grid, the axes and the curve. Every version after adds to
 * this same figure.
 */
import {
  axes,
  coordsOf,
  group,
  interval,
  numberPlane,
  plot,
  scaleOf,
  shape,
  type Figure,
} from '../index.js';

const ink = { colour: '#1b1b1b' };
const pen = { colour: '#1b1b1b', width: 0.02 };
const faint = { colour: '#1b1b1b', width: 0.012 };
const drawn = { colour: '#c2410c', width: 0.05 };

/** Nine graph units up against five across, so the parabola is cut where it
 * meets the top of its own axis rather than running off the picture. */
export const coords = coordsOf(
  scaleOf(interval(-1, 4), interval(-4.6, 4.6)),
  scaleOf(interval(-1, 9), interval(-2.4, 2.4))
);

export const curve = (x: number) => x * x;

export const tangent: Figure = {
  extent: { width: 10.8, height: 6 },
  still: 0,
  scene: group('tangent', [
    numberPlane('grid', coords, { stroke: faint, minors: 4, minorOpacity: 0.25 }),
    axes('axes', coords, { stroke: pen, fill: ink, size: 0.26, tip: 0.18 }),
    shape('curve', plot(coords, curve), { stroke: drawn }),
  ]),
};
