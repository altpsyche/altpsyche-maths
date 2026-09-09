import { describe, expect, it } from 'vitest';
import { areaUnder, colourFrom, coordsOf, flatten, interval, plot, pointCount, pointOf, riemannBars, scaleOf, slopeOf, tangentAt, type Path } from '../index.js';

// The demo's own coords, whose y axis stops at 9 while the parabola reaches 16.
const square = coordsOf(scaleOf(interval(-1, 4), interval(-4.6, 4.6)), scaleOf(interval(-1, 9), interval(-2.4, 2.4)));
// The same graph with room for the whole parabola, so nothing is cut.
const tall = coordsOf(scaleOf(interval(-1, 4), interval(-4.6, 4.6)), scaleOf(interval(-1, 17), interval(-2.4, 2.4)));
const wave = coordsOf(
  scaleOf(interval(0, 4 * Math.PI), interval(-4.6, 4.6)),
  scaleOf(interval(-1, 1), interval(-2.4, 2.4))
);

/** The largest gap between the drawn curve and the true one, in figure units,
 * taken at the middle of every piece where a cubic is furthest from its ends. */
function worstGap(path: Path, coords: typeof square, of: (x: number) => number): number {
  const middle = (a: number, b: number, c: number, d: number) => 0.125 * a + 0.375 * b + 0.375 * c + 0.125 * d;
  let worst = 0;
  let from = path[0].start;
  for (const curve of path[0].curves) {
    const x = middle(from.x, curve.control1.x, curve.control2.x, curve.to.x);
    const y = middle(from.y, curve.control1.y, curve.control2.y, curve.to.y);
    const graphX = interval.remap(x, coords.x.units, coords.x.graph);
    worst = Math.max(worst, Math.abs(y - pointOf(coords, graphX, of(graphX)).y));
    from = curve.to;
  }
  return worst;
}

describe('a plotted function', () => {
  it('is one open subpath of one cubic per sample', () => {
    const path = plot(tall, (x) => x * x, { resolution: 16 });
    expect(path).toHaveLength(1);
    expect(path[0].closed).toBe(false);
    expect(path[0].curves).toHaveLength(16);
    expect(pointCount(path)).toBe(49);
  });

  it('starts and ends on the curve itself', () => {
    const path = plot(tall, (x) => x * x, { resolution: 16 });
    const start = pointOf(tall, -1, 1);
    const end = pointOf(tall, 4, 16);
    expect(path[0].start.x).toBeCloseTo(start.x, 12);
    expect(path[0].start.y).toBeCloseTo(start.y, 12);
    expect(path[0].curves[15].to.x).toBeCloseTo(end.x, 12);
    expect(path[0].curves[15].to.y).toBeCloseTo(end.y, 12);
  });

  it('draws a quadratic exactly, at every count', () => {
    // A cubic holds a parabola with nothing left over, so the only error is in the
    // slopes, and at the ends those take the three-point difference.
    for (const samples of [16, 32, 64, 96]) {
      expect(worstGap(plot(tall, (x) => x * x, { resolution: samples }), tall, (x) => x * x)).toBeLessThan(1e-12);
    }
  });

  it('halves its gap from a sine four times over for each doubling of the count', () => {
    const gaps = [16, 32, 64, 96, 256].map((samples) => worstGap(plot(wave, Math.sin, { resolution: samples }), wave, Math.sin));
    expect(gaps[0]).toBeLessThan(6e-2);
    expect(gaps[2]).toBeLessThan(2e-3);
    expect(gaps[4]).toBeLessThan(3e-5);
    for (let at = 1; at < gaps.length; at++) expect(gaps[at]).toBeLessThan(gaps[at - 1]);
  });

  it('leaves a sine under a tenth of a pixel out at the count it uses by default', () => {
    // The largest surface anything here is drawn at is 2160 across, and the
    // demo's extent is 10.8 wide, so one figure unit is 200 pixels there.
    expect(worstGap(plot(wave, Math.sin), wave, Math.sin) * 200).toBeLessThan(0.1);
  });

  it('is closer to a sine than straight pieces between the same samples would be', () => {
    const path = plot(wave, Math.sin, { resolution: 64 });
    const straight = worstStraightGap(64);
    expect(worstGap(path, wave, Math.sin)).toBeLessThan(straight / 8);
  });

  it('draws over the run it is given rather than the whole graph', () => {
    const path = plot(tall, (x) => x * x, { resolution: 8, over: interval(0, 2) });
    expect(path[0].start.x).toBeCloseTo(pointOf(tall, 0, 0).x, 12);
    expect(path[0].curves[7].to.x).toBeCloseTo(pointOf(tall, 2, 4).x, 12);
  });

  it('draws nothing over a run with no width', () => {
    expect(plot(tall, (x) => x * x, { over: interval(2, 2) })).toEqual([]);
  });

  it('draws one piece where one piece is all that was asked for', () => {
    const path = plot(tall, (x) => x * x, { resolution: 1 });
    expect(path[0].curves).toHaveLength(1);
  });
});

/** The same gap for a curve joined by straight pieces, which is what the cubics
 * are being measured against. */
function worstStraightGap(samples: number): number {
  const { from, to } = interval.ordered(wave.x.graph);
  let worst = 0;
  for (let at = 0; at < samples; at++) {
    const x0 = from + ((to - from) * at) / samples;
    const x1 = from + ((to - from) * (at + 1)) / samples;
    const middle = (x0 + x1) / 2;
    const held = (Math.sin(x0) + Math.sin(x1)) / 2;
    worst = Math.max(worst, Math.abs(pointOf(wave, middle, held).y - pointOf(wave, middle, Math.sin(middle)).y));
  }
  return worst;
}

describe('a curve that leaves its graph', () => {
  const overY = (graph: { from: number; to: number }) =>
    coordsOf(scaleOf(interval(-2, 2), interval(-4.6, 4.6)), scaleOf(graph, interval(-2.4, 2.4)));
  const pole = overY(interval(-4, 4));
  const turns = coordsOf(
    scaleOf(interval(0, 4 * Math.PI), interval(-4.6, 4.6)),
    scaleOf(interval(-4, 4), interval(-2.4, 2.4))
  );
  const root = coordsOf(scaleOf(interval(-1, 4), interval(-4.6, 4.6)), scaleOf(interval(-1, 3), interval(-2.4, 2.4)));

  const points = (path: Path) =>
    path.flatMap((subpath) => [
      subpath.start,
      ...subpath.curves.flatMap((curve) => [curve.control1, curve.control2, curve.to]),
    ]);

  it('breaks either side of a pole rather than drawing a line across it', () => {
    expect(plot(pole, (x) => 1 / x)).toHaveLength(2);
  });

  it('breaks at each pole of a tangent over two turns', () => {
    expect(plot(turns, Math.tan)).toHaveLength(5);
  });

  it('starts where a function first has a value', () => {
    const path = plot(root, Math.sqrt);
    expect(path).toHaveLength(1);
    expect(interval.remap(path[0].start.x, root.x.units, root.x.graph)).toBeCloseTo(0, 6);
  });

  it('leaves no point without a number and none outside the graph', () => {
    for (const [coords, of] of [
      [pole, (x: number) => 1 / x],
      [turns, Math.tan],
      [root, Math.sqrt],
    ] as const) {
      for (const point of points(plot(coords, of))) {
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
        expect(interval.holds(coords.y.units, point.y)).toBe(true);
      }
    }
  });

  it('reaches the edge rather than stopping at the last sample inside it', () => {
    // The demo's own curve: its y axis stops at 9 where the parabola reaches 16,
    // so it is cut at three, which is the x where the curve meets the top.
    const path = plot(square, (x) => x * x);
    const last = path[0].curves[path[0].curves.length - 1].to;
    expect(interval.remap(last.x, square.x.units, square.x.graph)).toBeCloseTo(3, 6);
    expect(interval.remap(last.y, square.y.units, square.y.graph)).toBeCloseTo(9, 6);
  });

  it('adds no piece where a sample already sits on the edge', () => {
    // Halving the gap from a sample already on the boundary lands back on it,
    // and a piece of no width has no slope to leave at.
    const path = plot(pole, (x) => 1 / x, { resolution: 96 });
    for (const subpath of path) {
      let from = subpath.start;
      for (const curve of subpath.curves) {
        expect(Math.abs(curve.to.x - from.x)).toBeGreaterThan(0);
        from = curve.to;
      }
    }
  });

  it('draws nothing where the function is nowhere on the graph', () => {
    expect(plot(pole, () => 50)).toEqual([]);
  });
});

/**
 * The area a closed path encloses, by Green's theorem over each cubic.
 *
 * The integrand is x times the derivative of y minus y times the derivative of
 * x, which for two cubics is a polynomial of degree five, and three-point
 * Gauss-Legendre is exact for degree five. So this reads the path's own area
 * rather than an approximation of it.
 */
function enclosedArea(path: Path): number {
  const nodes = [-Math.sqrt(3 / 5), 0, Math.sqrt(3 / 5)];
  const weights = [5 / 9, 8 / 9, 5 / 9];
  let total = 0;
  for (const subpath of path) {
    let from = subpath.start;
    for (const curve of subpath.curves) {
      const p = [from, curve.control1, curve.control2, curve.to];
      for (let node = 0; node < 3; node++) {
        const t = (nodes[node] + 1) / 2;
        const u = 1 - t;
        const value = (axis: 'x' | 'y') =>
          u * u * u * p[0][axis] + 3 * u * u * t * p[1][axis] + 3 * u * t * t * p[2][axis] + t * t * t * p[3][axis];
        const slope = (axis: 'x' | 'y') =>
          3 * (u * u * (p[1][axis] - p[0][axis]) + 2 * u * t * (p[2][axis] - p[1][axis]) + t * t * (p[3][axis] - p[2][axis]));
        total += (weights[node] / 2) * ((value('x') * slope('y') - value('y') * slope('x')) / 2);
      }
      from = curve.to;
    }
  }
  return Math.abs(total);
}

describe('the area under a curve', () => {
  /** A graph area of one, in figure units squared, which is what the two scales
   * turn one square graph unit into. */
  const perGraphUnit =
    (interval.span(tall.x.units) / interval.span(tall.x.graph)) *
    (interval.span(tall.y.units) / interval.span(tall.y.graph));

  it('is the exact integral of a parabola, at every count', () => {
    // A cubic holds a parabola with nothing left over, so the region's top is
    // the parabola itself and its area has no sampling error in it.
    for (const samples of [4, 16, 64, 96]) {
      const top = plot(tall, (x: number) => x * x, { resolution: samples, over: interval(0, 2) });
      const area = enclosedArea(areaUnder(tall, top));
      expect(area / perGraphUnit).toBeCloseTo(8 / 3, 12);
    }
  });

  it('closes down to the axis and back', () => {
    const path = areaUnder(tall, plot(tall, (x: number) => x * x, { resolution: 4, over: interval(0, 2) }));
    expect(path).toHaveLength(1);
    expect(path[0].closed).toBe(true);
    expect(path[0].curves).toHaveLength(7);
    const foot = pointOf(tall, 0, 0);
    expect(path[0].curves[5].to.y).toBeCloseTo(foot.y, 12);
  });

  it('shares its top with the curve drawn over it', () => {
    const curve = plot(tall, (x: number) => x * x, { resolution: 8, over: interval(0, 2) });
    const region = areaUnder(tall, curve);
    expect(region[0].start).toEqual(curve[0].start);
    for (let piece = 0; piece < 8; piece++) expect(region[0].curves[piece]).toEqual(curve[0].curves[piece]);
  });

  it('measures down to the level it is given', () => {
    const top = plot(tall, (x: number) => x * x, { resolution: 16, over: interval(0, 2) });
    const area = enclosedArea(areaUnder(tall, top, { baseline: -1 }));
    // The parabola over a floor one below the axis: eight thirds and two more.
    expect(area / perGraphUnit).toBeCloseTo(8 / 3 + 2, 12);
  });

  it('holds a level off the graph at the near edge', () => {
    const top = plot(tall, (x: number) => x * x, { resolution: 16, over: interval(0, 2) });
    const low = enclosedArea(areaUnder(tall, top, { baseline: -9 }));
    const edge = enclosedArea(areaUnder(tall, top, { baseline: -1 }));
    expect(low).toBeCloseTo(edge, 12);
  });

  it('is one region per stretch of curve that is on the graph', () => {
    const pole = coordsOf(
      scaleOf(interval(-2, 2), interval(-4.6, 4.6)),
      scaleOf(interval(-4, 4), interval(-2.4, 2.4))
    );
    const path = areaUnder(pole, plot(pole, (x: number) => 1 / x, { over: interval(-2, 2) }));
    expect(path).toHaveLength(2);
    for (const subpath of path) expect(subpath.closed).toBe(true);
  });

  it('is nothing over a run with no width', () => {
    expect(areaUnder(tall, plot(tall, (x: number) => x * x, { over: interval(2, 2) }))).toEqual([]);
  });
});

describe('the bars under a curve', () => {
  const perGraphUnit =
    (interval.span(tall.x.units) / interval.span(tall.x.graph)) *
    (interval.span(tall.y.units) / interval.span(tall.y.graph));
  const wash = { colour: colourFrom('#c2410c') };
  const summed = (bars: number, height: 'left' | 'right' | 'middle') =>
    enclosedArea(
      flatten(riemannBars('bars', tall, (x) => x * x, { fill: wash, bars, height, over: interval(0, 2) })).flatMap(
        (mark) => (mark.kind === 'path' ? mark.path : [])
      )
    ) / perGraphUnit;

  it('is one bar per piece, each named by its place in the run', () => {
    const marks = flatten(riemannBars('bars', tall, (x) => x * x, { fill: wash, bars: 4, over: interval(0, 2) }));
    // The first bar reads a height of zero and is still a mark, since dropping it
    // would make it appear between frames as soon as the curve moves.
    expect(marks.map((mark) => mark.id)).toEqual(['bars/0', 'bars/1', 'bars/2', 'bars/3']);
  });

  it('reads the left sum below the true area and the right sum above it', () => {
    for (const bars of [4, 16, 64]) {
      expect(summed(bars, 'left')).toBeLessThan(8 / 3);
      expect(summed(bars, 'right')).toBeGreaterThan(8 / 3);
    }
  });

  it('reads the sums a hand calculation gives for four bars', () => {
    expect(summed(4, 'left')).toBeCloseTo(1.75, 12);
    expect(summed(4, 'right')).toBeCloseTo(3.75, 12);
    expect(summed(4, 'middle')).toBeCloseTo(2.625, 12);
  });

  it('closes on the true area as the count rises', () => {
    const gaps = [4, 16, 64, 256].map((bars) => Math.abs(summed(bars, 'middle') - 8 / 3));
    for (let at = 1; at < gaps.length; at++) expect(gaps[at]).toBeLessThan(gaps[at - 1]);
    expect(gaps[3]).toBeLessThan(1e-4);
  });

  it('reads the middle closer than either edge, at every count', () => {
    for (const bars of [4, 16, 64]) {
      const middle = Math.abs(summed(bars, 'middle') - 8 / 3);
      expect(middle).toBeLessThan(Math.abs(summed(bars, 'left') - 8 / 3));
      expect(middle).toBeLessThan(Math.abs(summed(bars, 'right') - 8 / 3));
    }
  });

  it('cuts a bar whose top is off the graph', () => {
    const marks = flatten(riemannBars('bars', square, (x) => x * x, { fill: wash, bars: 4, height: 'right' }));
    for (const mark of marks) {
      if (mark.kind !== 'path') throw new Error('a bar is a path');
      for (const point of mark.path.flatMap((subpath) => [subpath.start, ...subpath.curves.map((c) => c.to)])) {
        // Exactly on the edge rather than near it, since the bar is built from its
        // own corners and the top one is the number the scale gave.
        expect(interval.holds(square.y.units, point.y)).toBe(true);
      }
    }
  });

  it('leaves out a bar whose height is not a number', () => {
    const root = coordsOf(scaleOf(interval(-1, 4), interval(-4.6, 4.6)), scaleOf(interval(-1, 3), interval(-2.4, 2.4)));
    const marks = flatten(riemannBars('bars', root, Math.sqrt, { fill: wash, bars: 5 }));
    expect(marks).toHaveLength(4);
  });

  it('carries its style on the group so the run fades as one thing', () => {
    const marks = flatten(riemannBars('bars', tall, (x) => x * x, { fill: wash, bars: 4, over: interval(0, 2) }));
    for (const mark of marks) {
      if (mark.kind !== 'path') throw new Error('a bar is a path');
      expect(mark.fill).toEqual(wash);
    }
  });
});

describe('the slope of a plotted curve', () => {
  it('reads the closed-form derivative of a parabola at five places', () => {
    // A cubic written through samples of a quadratic carries that quadratic with
    // nothing left over, so the reading is the derivative itself rather than an
    // approximation of it.
    const path = plot(tall, (x: number) => x * x, { resolution: 16 });
    for (const x of [-0.5, 0, 0.75, 1.6, 3.25]) expect(slopeOf(tall, path, x)).toBeCloseTo(2 * x, 12);
  });

  it('reads a sine within the error the drawn curve already carries', () => {
    // The drawn curve leaves each sample at a central difference of its
    // neighbours, so the reading carries an error of the sample step squared. The
    // step is 4pi over 96 and its square is 1.71e-2, of which the worst of these
    // five places keeps a tenth: 1.57e-3.
    const path = plot(wave, Math.sin, { resolution: 96 });
    for (const x of [0.5, 1, Math.PI / 3, 3, 6]) {
      expect(Math.abs(slopeOf(wave, path, x) - Math.cos(x))).toBeLessThan(1.6e-3);
    }
  });

  it('is the slope of the drawn cubic and not of the function behind it', () => {
    // Four pieces over a sine leave a visible gap between the drawn curve and
    // the true one, and the reading follows what is drawn.
    const coarse = plot(wave, Math.sin, { resolution: 4 });
    const fine = plot(wave, Math.sin, { resolution: 96 });
    const x = 1;
    expect(Math.abs(slopeOf(wave, coarse, x) - Math.cos(x))).toBeGreaterThan(
      Math.abs(slopeOf(wave, fine, x) - Math.cos(x)) * 100
    );
  });

  it('reads the same slope at a join from either piece', () => {
    const path = plot(tall, (x: number) => x * x, { resolution: 5 });
    const join = -1 + 5 / 5;
    expect(slopeOf(tall, path, join)).toBeCloseTo(2 * join, 12);
  });

  it('is nothing where the curve does not reach', () => {
    const path = plot(square, (x: number) => x * x);
    // The parabola is cut where it leaves the top of this graph, which is x of 3.
    expect(Number.isNaN(slopeOf(square, path, 3.5))).toBe(true);
    expect(Number.isNaN(slopeOf(square, [], 1))).toBe(true);
  });

  it('turns a slope over on an axis given the other way round', () => {
    const flipped = coordsOf(scaleOf(interval(-1, 4), interval(4.6, -4.6)), scaleOf(interval(-1, 17), interval(-2.4, 2.4)));
    const path = plot(flipped, (x: number) => x * x, { resolution: 16 });
    expect(slopeOf(flipped, path, 1.5)).toBeCloseTo(3, 12);
  });
});

describe('the tangent to a plotted curve', () => {
  /** The demo's parabola drawn over the graph it is read on, which is what every
   * tangent below is taken off. */
  const parabola = (coords: typeof square) => plot(coords, (x: number) => x * x, { resolution: 96 });

  it('is one open straight piece', () => {
    const path = tangentAt(tall, parabola(tall), 1, { reach: 0.5 });
    expect(path).toHaveLength(1);
    expect(path[0].curves).toHaveLength(1);
    expect(path[0].closed).toBe(false);
  });

  it('leaves each end at the slope the curve has there', () => {
    const path = tangentAt(tall, parabola(tall), 1, { reach: 0.5 });
    const from = path[0].start;
    const to = path[0].curves[0].to;
    const graph = (point: typeof from) => ({
      x: interval.remap(point.x, tall.x.units, tall.x.graph),
      y: interval.remap(point.y, tall.y.units, tall.y.graph),
    });
    const a = graph(from);
    const b = graph(to);
    expect((b.y - a.y) / (b.x - a.x)).toBeCloseTo(2, 9);
    expect(a.x).toBeCloseTo(0.5, 12);
    expect(b.x).toBeCloseTo(1.5, 12);
  });

  it('touches the curve at the point it is taken at', () => {
    const path = tangentAt(tall, parabola(tall), 2, { reach: 1 });
    const from = path[0].start;
    const to = path[0].curves[0].to;
    const along = (pointOf(tall, 2, 0).x - from.x) / (to.x - from.x);
    const height = from.y + (to.y - from.y) * along;
    expect(height).toBeCloseTo(pointOf(tall, 2, 4).y, 9);
  });

  it('is cut where it leaves the graph rather than running out of the picture', () => {
    // At x = 3 the demo's parabola has a slope of 6, so a reach of 1.2 either
    // side asks for 7.2 graph units of height on an axis that holds 10.
    // The curve drawn over the whole graph is cut a few billionths short of x of
    // 3, where it leaves the top, so the tangent there is taken off the run that
    // ends at 3, which is the demo's own walk.
    const walk = plot(square, (x: number) => x * x, { over: interval(0, 3) });
    const path = tangentAt(square, walk, 3, { reach: 1.2 });
    for (const point of [path[0].start, path[0].curves[0].to]) {
      expect(interval.holds(square.y.units, point.y)).toBe(true);
      expect(interval.holds(square.x.units, point.x)).toBe(true);
    }
  });

  it('reaches the whole way where nothing cuts it', () => {
    const path = tangentAt(tall, parabola(tall), 1, { reach: 0.5 });
    const width = path[0].curves[0].to.x - path[0].start.x;
    expect(width).toBeCloseTo((interval.span(tall.x.units) / interval.span(tall.x.graph)) * 1, 12);
  });

  it('draws nothing where the curve does not reach the x it is asked for', () => {
    // A curve wholly off the graph is plotted as nothing, and a pole leaves a gap
    // in the middle of one that is drawn.
    expect(tangentAt(square, plot(square, () => 50), 1, { reach: 1 })).toEqual([]);
    expect(tangentAt(square, parabola(square), 3.5, { reach: 1 })).toEqual([]);
    const pole = coordsOf(scaleOf(interval(-2, 2), interval(-4.6, 4.6)), scaleOf(interval(-4, 4), interval(-2.4, 2.4)));
    expect(tangentAt(pole, plot(pole, (x: number) => 1 / x), 0, { reach: 1 })).toEqual([]);
  });

  it('draws a level line where the slope is nothing', () => {
    const path = tangentAt(tall, parabola(tall), 0, { reach: 1 });
    expect(path[0].start.y).toBeCloseTo(path[0].curves[0].to.y, 12);
  });
});
