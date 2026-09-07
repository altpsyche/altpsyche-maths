import { describe, expect, it } from 'vitest';
import { coordsOf, interval, plot, pointCount, pointOf, scaleOf, type Path } from '../index.js';

const square = coordsOf(scaleOf(interval(-1, 4), interval(-4.6, 4.6)), scaleOf(interval(-1, 9), interval(-2.4, 2.4)));
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
    const path = plot(square, (x) => x * x, { samples: 16 });
    expect(path).toHaveLength(1);
    expect(path[0].closed).toBe(false);
    expect(path[0].curves).toHaveLength(16);
    expect(pointCount(path)).toBe(49);
  });

  it('starts and ends on the curve itself', () => {
    const path = plot(square, (x) => x * x, { samples: 16 });
    const start = pointOf(square, -1, 1);
    const end = pointOf(square, 4, 16);
    expect(path[0].start.x).toBeCloseTo(start.x, 12);
    expect(path[0].start.y).toBeCloseTo(start.y, 12);
    expect(path[0].curves[15].to.x).toBeCloseTo(end.x, 12);
    expect(path[0].curves[15].to.y).toBeCloseTo(end.y, 12);
  });

  it('draws a quadratic exactly, at every count', () => {
    // A cubic can hold a parabola with nothing left over, so the only error
    // available is in the slopes, and at the ends those are the three-point
    // difference rather than the two-point one.
    for (const samples of [16, 32, 64, 96]) {
      expect(worstGap(plot(square, (x) => x * x, { samples }), square, (x) => x * x)).toBeLessThan(1e-12);
    }
  });

  it('halves its gap from a sine four times over for each doubling of the count', () => {
    const gaps = [16, 32, 64, 96, 256].map((samples) => worstGap(plot(wave, Math.sin, { samples }), wave, Math.sin));
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
    const path = plot(wave, Math.sin, { samples: 64 });
    const straight = worstStraightGap(64);
    expect(worstGap(path, wave, Math.sin)).toBeLessThan(straight / 8);
  });

  it('draws over the run it is given rather than the whole graph', () => {
    const path = plot(square, (x) => x * x, { samples: 8, over: interval(0, 2) });
    expect(path[0].start.x).toBeCloseTo(pointOf(square, 0, 0).x, 12);
    expect(path[0].curves[7].to.x).toBeCloseTo(pointOf(square, 2, 4).x, 12);
  });

  it('draws nothing over a run with no width', () => {
    expect(plot(square, (x) => x * x, { over: interval(2, 2) })).toEqual([]);
  });

  it('draws one piece where one piece is all that was asked for', () => {
    const path = plot(square, (x) => x * x, { samples: 1 });
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
