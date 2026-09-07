import { describe, expect, it } from 'vitest';
import { circle, curveCrossings, straight, vec2 } from '@altpsyche/maths';
import type { Crossing, Cubic, Path, Subpath, Vec2 } from '@altpsyche/maths';

/**
 * Two curves whose boxes miss cannot cross, and the halving that follows from
 * that is only as sharp as the tolerance, so Newton's method finishes every
 * crossing off. These check the sharpened answers against closed forms, and
 * check that a near tangency comes back as one crossing rather than as the run
 * of hits the halving actually found.
 */

/** Every piece of a subpath with the point it starts from, since a piece
 * carries where it ends and not where it began. */
const pieces = (subpath: Subpath): { from: Vec2; curve: Cubic }[] => {
  let from = subpath.start;
  return subpath.curves.map((curve) => {
    const piece = { from, curve };
    from = curve.to;
    return piece;
  });
};

const between = (first: Path, second: Path): Crossing[] => {
  const found: Crossing[] = [];
  for (const left of first.flatMap(pieces)) {
    for (const right of second.flatMap(pieces)) {
      found.push(...curveCrossings(left.from, left.curve, right.from, right.curve));
    }
  }
  return found;
};

const nearest = (point: Vec2, among: readonly Vec2[]): number =>
  Math.min(...among.map((other) => Math.hypot(other.x - point.x, other.y - point.y)));

/** What four cubics cost a circle, which the crossings of two circles inherit. */
const CIRCLE_ERROR = 2.8e-4;

describe('where two cubics cross', () => {
  it('puts the crossing of two straight pieces where the algebra puts it', () => {
    const rising = straight(vec2(0, 0), vec2(2, 2));
    const falling = straight(vec2(0, 2), vec2(2, 0));
    const [crossing] = curveCrossings(vec2(0, 0), rising, vec2(0, 2), falling);
    expect(crossing.alongFirst).toBeCloseTo(0.5, 12);
    expect(crossing.alongSecond).toBeCloseTo(0.5, 12);
    expect(crossing.point.x).toBeCloseTo(1, 12);
    expect(crossing.point.y).toBeCloseTo(1, 12);
  });

  it('reads the fraction along each piece, not only the point', () => {
    const flat = straight(vec2(0, 0), vec2(4, 0));
    const upright = straight(vec2(1, -1), vec2(1, 3));
    const [crossing] = curveCrossings(vec2(0, 0), flat, vec2(1, -1), upright);
    expect(crossing.alongFirst).toBeCloseTo(0.25, 12);
    expect(crossing.alongSecond).toBeCloseTo(0.25, 12);
    expect(crossing.point.x).toBeCloseTo(1, 12);
    expect(crossing.point.y).toBeCloseTo(0, 12);
  });

  it('finds every crossing when one piece cuts another three times', () => {
    const wave = { control1: vec2(1, 3), control2: vec2(2, -3), to: vec2(3, 0) };
    const flat = straight(vec2(-1, 0), vec2(4, 0));
    const crossings = curveCrossings(vec2(0, 0), wave, vec2(-1, 0), flat);
    expect(crossings.length).toBe(3);
    expect(crossings.map((crossing) => crossing.alongFirst)).toEqual([0, 0.5, 1]);
  });

  it('crosses two circles where the closed form crosses them', () => {
    const crossings = between(circle(vec2(0, 0), 1), circle(vec2(1, 0), 1));
    const truth = [vec2(0.5, Math.sqrt(3) / 2), vec2(0.5, -Math.sqrt(3) / 2)];
    expect(crossings.length).toBe(2);
    for (const crossing of crossings) {
      expect(nearest(crossing.point, truth)).toBeLessThan(CIRCLE_ERROR);
    }
  });

  it('finds nothing between circles that miss and nothing between one inside another', () => {
    expect(between(circle(vec2(0, 0), 1), circle(vec2(5, 0), 1)).length).toBe(0);
    expect(between(circle(vec2(0, 0), 1), circle(vec2(0, 0), 0.5)).length).toBe(0);
  });

  it('finds nothing between two curves whose boxes overlap and whose curves do not meet', () => {
    const inner = circle(vec2(0, 0), 1);
    const outer = circle(vec2(0, 0), 1.0001);
    expect(between(inner, outer).length).toBe(0);
  });

  it('answers a touch at one point with one crossing rather than a cloud', () => {
    const left = pieces(circle(vec2(0, 0), 1)[0])[3];
    const right = pieces(circle(vec2(2, 0), 1)[0])[1];
    const crossings = curveCrossings(left.from, left.curve, right.from, right.curve);
    expect(crossings.length).toBe(1);
    expect(Math.hypot(crossings[0].point.x - 1, crossings[0].point.y)).toBeLessThan(1e-6);
  });

  it('answers a tangency in the middle of a piece with one crossing', () => {
    const touch = vec2(Math.SQRT1_2, Math.SQRT1_2);
    const along = vec2(-Math.SQRT1_2, Math.SQRT1_2);
    const quarter = pieces(circle(vec2(0, 0), 1)[0])[0];
    const start = vec2(touch.x + along.x, touch.y + along.y);
    const tangent = straight(start, vec2(touch.x - along.x, touch.y - along.y));
    const crossings = curveCrossings(quarter.from, quarter.curve, start, tangent);
    expect(crossings.length).toBe(1);
    expect(Math.hypot(crossings[0].point.x - touch.x, crossings[0].point.y - touch.y)).toBeLessThan(1e-6);
  });

  it('answers two curves lying on top of each other with the ends of the stretch they share', () => {
    const piece = { control1: vec2(1, 3), control2: vec2(2, -3), to: vec2(3, 0) };
    const crossings = curveCrossings(vec2(0, 0), piece, vec2(0, 0), piece);
    expect(crossings.map((crossing) => [crossing.alongFirst, crossing.alongSecond])).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });

  it('answers a shared stretch walked the other way with the same two ends', () => {
    const there = straight(vec2(0, 0), vec2(2, 0));
    const back = straight(vec2(2, 0), vec2(0, 0));
    const crossings = curveCrossings(vec2(0, 0), there, vec2(2, 0), back);
    expect(crossings.map((crossing) => [crossing.alongFirst, crossing.alongSecond])).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });

  it('answers a stretch two pieces share only part of by where it starts and ends', () => {
    const left = straight(vec2(0, 0), vec2(2, 0));
    const right = straight(vec2(1, 0), vec2(3, 0));
    const crossings = curveCrossings(vec2(0, 0), left, vec2(1, 0), right);
    expect(crossings.length).toBe(2);
    expect(crossings[0].alongFirst).toBeCloseTo(0.5, 9);
    expect(crossings[0].alongSecond).toBeCloseTo(0, 9);
    expect(crossings[1].alongFirst).toBeCloseTo(1, 9);
    expect(crossings[1].alongSecond).toBeCloseTo(0.5, 9);
  });

  it('leaves a meeting at one point to the halving rather than reading it as a stretch', () => {
    // Two arcs that touch have both ends of one lying nowhere on the other, so
    // the stretch is refused and the answer is the single sharpened crossing.
    const left = pieces(circle(vec2(0, 0), 1)[0])[3];
    const right = pieces(circle(vec2(2, 0), 1)[0])[1];
    expect(curveCrossings(left.from, left.curve, right.from, right.curve).length).toBe(1);
  });
});
