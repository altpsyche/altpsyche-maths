import { describe, expect, it } from 'vitest';
import {
  coordsOf,
  interval,
  parametric,
  polar,
  pointCount,
  pointOf,
  pointOn,
  scaleOf,
  tangentOn,
  vec2,
  type Coords,
  type Path,
} from '../index.js';

// A square graph counting from -2 to 2 both ways, so a unit circle sits well
// inside it and the two axes count at the same rate.
const square = coordsOf(scaleOf(interval(-2, 2), interval(-2, 2)), scaleOf(interval(-2, 2), interval(-2, 2)));
// The same rates over a graph the unit circle leaves across the width, which is
// the cut a plotted curve has no form for.
const narrow = coordsOf(scaleOf(interval(-0.5, 0.5), interval(-1, 1)), scaleOf(interval(-2, 2), interval(-2, 2)));
// A graph the Lissajous figure leaves across the height four times.
const short = coordsOf(scaleOf(interval(-2, 2), interval(-2, 2)), scaleOf(interval(-1, 1), interval(-1, 1)));

const TURN = interval(0, 2 * Math.PI);
const circleAt = (t: number) => vec2(Math.cos(t), Math.sin(t));
const lissajousAt = (t: number) => vec2(1.8 * Math.sin(3 * t), 1.4 * Math.sin(2 * t));

/** The furthest the drawn curve strays from the unit circle, as a fraction of
 * the radius, sampled inside every piece rather than at its ends alone. */
function worstRadius(path: Path, coords: Coords, steps = 128): number {
  let worst = 0;
  for (const subpath of path) {
    let from = subpath.start;
    for (const piece of subpath.curves) {
      for (let at = 0; at <= steps; at++) {
        const drawn = pointOn(from, piece, at / steps);
        const x = interval.remap(drawn.x, coords.x.units, coords.x.graph);
        const y = interval.remap(drawn.y, coords.y.units, coords.y.graph);
        worst = Math.max(worst, Math.abs(Math.hypot(x, y) - 1));
      }
      from = piece.to;
    }
  }
  return worst;
}

/** Where a subpath ends, which is where its last piece goes. */
const endOf = (path: Path, at: number) => path[at].curves[path[at].curves.length - 1].to;

describe('a parametric curve', () => {
  it('is one closed subpath of one cubic per sample', () => {
    const path = parametric(square, circleAt, { over: TURN, resolution: 16, closed: true });
    expect(path).toHaveLength(1);
    expect(path[0].closed).toBe(true);
    expect(path[0].curves).toHaveLength(16);
    expect(pointCount(path)).toBe(49);
  });

  it('is one open subpath where the curve does not close', () => {
    const path = parametric(square, circleAt, { over: TURN, resolution: 16 });
    expect(path).toHaveLength(1);
    expect(path[0].closed).toBe(false);
    expect(path[0].curves).toHaveLength(16);
  });

  it('returns a closed curve to the place it started', () => {
    const path = parametric(square, circleAt, { over: TURN, resolution: 96, closed: true });
    const end = endOf(path, 0);
    expect(end.x).toBeCloseTo(path[0].start.x, 15);
    expect(end.y).toBeCloseTo(path[0].start.y, 15);
  });

  it('draws a circle closer than the four cubic quarters a circle is written as', () => {
    // The four quarters leave the drawn edge 2.7e-4 of the radius out, which the
    // suite holds `circle` to between 2.6 and 2.8 parts in ten thousand.
    expect(worstRadius(parametric(square, circleAt, { over: TURN, resolution: 96, closed: true }), square)).toBeLessThan(
      5e-7
    );
  });

  it('halves the error by sixteen each time the samples double', () => {
    const readings = [24, 48, 96].map((resolution) =>
      worstRadius(parametric(square, circleAt, { over: TURN, resolution, closed: true }), square)
    );
    expect(readings[0]).toBeGreaterThan(1e-4);
    expect(readings[0]).toBeLessThan(1.2e-4);
    // A Hermite cubic through samples of a circle is fourth order in the step, so
    // twice the samples is a sixteenth of the error.
    expect(readings[0] / readings[1]).toBeGreaterThan(15);
    expect(readings[0] / readings[1]).toBeLessThan(17);
    expect(readings[1] / readings[2]).toBeGreaterThan(15);
    expect(readings[1] / readings[2]).toBeLessThan(17);
  });

  it('leaves a closed curve with no corner at the seam', () => {
    const path = parametric(square, circleAt, { over: TURN, resolution: 96, closed: true });
    const curves = path[0].curves;
    const leaving = tangentOn(curves[curves.length - 2].to, curves[curves.length - 1], 1);
    const entering = tangentOn(path[0].start, curves[0], 0);
    expect(Math.atan2(leaving.y, leaving.x)).toBeCloseTo(Math.atan2(entering.y, entering.x), 12);
  });
});

describe('a parametric curve leaving the graph', () => {
  it('is cut across the width, which a plotted curve has no form for', () => {
    const path = parametric(narrow, circleAt, { over: TURN, resolution: 96, closed: true });
    expect(path).toHaveLength(2);
    for (const subpath of path) expect(subpath.closed).toBe(false);
    for (const place of [path[0].start, endOf(path, 0), path[1].start, endOf(path, 1)]) {
      const x = interval.remap(place.x, narrow.x.units, narrow.x.graph);
      expect(Math.abs(x)).toBeGreaterThan(0.5 - 1e-7);
      expect(Math.abs(x)).toBeLessThanOrEqual(0.5);
    }
  });

  it('joins the stretch that spans the seam rather than ending it there', () => {
    // The figure crosses the height eight times, so it is on the graph over four
    // stretches, one of which the run of the parameter cuts at its own end.
    const path = parametric(short, lissajousAt, { over: TURN, resolution: 96, closed: true });
    expect(path).toHaveLength(4);
    const seam = pointOf(short, 0, 0);
    for (const subpath of path) {
      expect(subpath.start.x).not.toBeCloseTo(seam.x, 6);
      expect(endOf(path, path.indexOf(subpath)).x).not.toBeCloseTo(seam.x, 6);
    }
  });

  it('is one closed subpath again where the graph holds the whole curve', () => {
    const path = parametric(square, lissajousAt, { over: TURN, resolution: 96, closed: true });
    expect(path).toHaveLength(1);
    expect(path[0].closed).toBe(true);
  });

  it('is nothing where the whole curve is off the graph', () => {
    expect(parametric(square, () => vec2(9, 9), { resolution: 8 })).toEqual([]);
  });

  it('is nothing where the run of the parameter has no width', () => {
    expect(parametric(square, circleAt, { over: interval(1, 1) })).toEqual([]);
  });

  it('is held to the graph where the run reaches past it', () => {
    const path = parametric(square, (t) => vec2(t, 0), { over: interval(-6, 6), resolution: 12 });
    expect(path).toHaveLength(1);
    expect(interval.remap(path[0].start.x, square.x.units, square.x.graph)).toBeCloseTo(-2, 7);
    expect(interval.remap(endOf(path, 0).x, square.x.units, square.x.graph)).toBeCloseTo(2, 7);
  });

  it('draws a curve of too few samples to close as an open one', () => {
    const path = parametric(square, circleAt, { over: TURN, resolution: 2, closed: true });
    expect(path).toHaveLength(1);
    expect(path[0].closed).toBe(false);
    expect(path[0].curves).toHaveLength(2);
  });
});

describe('a polar curve', () => {
  it('is the same geometry as the parametrisation it stands for', () => {
    const ring = polar(square, () => 1, { resolution: 96, closed: true });
    const same = parametric(square, circleAt, { over: TURN, resolution: 96, closed: true });
    expect(ring[0].curves).toHaveLength(same[0].curves.length);
    expect(ring[0].start).toEqual(same[0].start);
    for (let at = 0; at < ring[0].curves.length; at++) expect(ring[0].curves[at]).toEqual(same[0].curves[at]);
  });

  it('draws a whole turn where the run of the angle is left out', () => {
    const ring = polar(square, () => 1, { resolution: 96, closed: true });
    expect(ring).toHaveLength(1);
    expect(ring[0].closed).toBe(true);
    expect(worstRadius(ring, square)).toBeLessThan(5e-7);
  });

  it('puts the cusp of a cardioid on the place both axes read as nothing', () => {
    const heart = polar(square, (angle) => 1 - Math.cos(angle), { resolution: 96, closed: true });
    const origin = pointOf(square, 0, 0);
    expect(heart).toHaveLength(1);
    expect(heart[0].start.x).toBeCloseTo(origin.x, 15);
    expect(heart[0].start.y).toBeCloseTo(origin.y, 15);
  });

  it('draws the five petals of a rose as one closed run', () => {
    // An odd count of petals is drawn over half a turn, since the radius is
    // negative over the other half and the petals it draws there lie over these.
    const rose = polar(square, (angle) => Math.cos(5 * angle), {
      over: interval(0, Math.PI),
      resolution: 200,
      closed: true,
    });
    expect(rose).toHaveLength(1);
    expect(rose[0].closed).toBe(true);
    expect(rose[0].curves).toHaveLength(200);
  });

  it('cuts a rose whose petals reach past the graph into one run per petal', () => {
    const inside = coordsOf(scaleOf(interval(-0.8, 0.8), interval(-2, 2)), scaleOf(interval(-0.8, 0.8), interval(-2, 2)));
    const rose = polar(inside, (angle) => Math.cos(5 * angle), {
      over: interval(0, Math.PI),
      resolution: 200,
      closed: true,
    });
    expect(rose).toHaveLength(5);
    for (const petal of rose) expect(petal.closed).toBe(false);
  });
});
