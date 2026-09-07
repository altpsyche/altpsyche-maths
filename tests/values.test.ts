import { describe, expect, it } from 'vitest';
import {
  SAME_TIME,
  TOLERANCE,
  circle,
  clamp,
  curveCrossings,
  curveFor,
  easeIn,
  easeOut,
  flattenPath,
  inverseLerp,
  linear,
  lerp,
  mat3,
  nearestEdge,
  pointOn,
  rect,
  remap,
  slopeOn,
  smoothstep,
  splitCurve,
  straight,
  vec2,
  vec3,
  windingAt,
  withKey,
} from '@altpsyche/maths';

/**
 * The values half, which has no clock and no screen in it. Every curve is
 * checked at its midpoint, which is where the four are furthest apart, and every
 * transform is checked against a point whose answer can be read by hand.
 */

describe('scalar', () => {
  it('holds a value inside its bounds either way round', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(5, 1, 0)).toBe(1);
  });

  it('walks past either end when asked to', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 2)).toBe(20);
    expect(lerp(0, 10, -1)).toBe(-10);
  });

  it('reports the start of a span with no width rather than dividing by zero', () => {
    expect(inverseLerp(3, 3, 3)).toBe(0);
    expect(Number.isFinite(inverseLerp(3, 3, 9))).toBe(true);
  });

  it('carries a position from one span into another', () => {
    expect(remap(5, 0, 10, 100, 200)).toBe(150);
    expect(remap(0, -1, 1, 0, 8)).toBe(4);
  });
});

describe('curves', () => {
  it('separates at the midpoint, which is the whole reason there are four', () => {
    expect(linear(0.5)).toBeCloseTo(0.5, 10);
    expect(easeIn(0.5)).toBeCloseTo(0.25, 10);
    expect(easeOut(0.5)).toBeCloseTo(0.75, 10);
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 10);
  });

  it('starts at zero and ends at one whichever curve it is', () => {
    for (const curve of [linear, easeIn, easeOut, smoothstep]) {
      expect(curve(0)).toBeCloseTo(0, 10);
      expect(curve(1)).toBeCloseTo(1, 10);
    }
  });

  it('picks the curve from which ends are flat', () => {
    expect(curveFor(false, false)(0.5)).toBeCloseTo(0.5, 10);
    expect(curveFor(true, false)(0.5)).toBeCloseTo(0.25, 10);
    expect(curveFor(false, true)(0.5)).toBeCloseTo(0.75, 10);
    expect(curveFor(true, true)(0.25)).toBeCloseTo(0.15625, 10);
  });
});

describe('vec2', () => {
  it('adds, subtracts and scales component by component', () => {
    expect(vec2.add(vec2(1, 2), vec2(3, 4))).toEqual({ x: 4, y: 6 });
    expect(vec2.sub(vec2(1, 2), vec2(3, 4))).toEqual({ x: -2, y: -2 });
    expect(vec2.scale(vec2(1, 2), 3)).toEqual({ x: 3, y: 6 });
  });

  it('reads the cross product as the side one vector falls on', () => {
    expect(vec2.cross(vec2(1, 0), vec2(0, 1))).toBe(1);
    expect(vec2.cross(vec2(1, 0), vec2(0, -1))).toBe(-1);
    expect(vec2.cross(vec2(1, 0), vec2(2, 0))).toBe(0);
  });

  it('normalises a zero-length vector to zero rather than to not-a-number', () => {
    expect(vec2.normalize(vec2(0, 0))).toEqual({ x: 0, y: 0 });
    expect(vec2.magnitude(vec2.normalize(vec2(3, 4)))).toBeCloseTo(1, 10);
  });

  it('turns a quarter turn anticlockwise', () => {
    const turned = vec2.perpendicular(vec2(1, 0));
    expect(turned.x).toBeCloseTo(0, 10);
    expect(turned.y).toBeCloseTo(1, 10);
  });

  it('rotates by an angle and reads that angle back', () => {
    const turned = vec2.rotate(vec2(1, 0), Math.PI / 2);
    expect(turned.x).toBeCloseTo(0, 10);
    expect(turned.y).toBeCloseTo(1, 10);
    expect(vec2.angle(turned)).toBeCloseTo(Math.PI / 2, 10);
  });

  it('measures distance and walks between two points', () => {
    expect(vec2.distance(vec2(0, 0), vec2(3, 4))).toBeCloseTo(5, 10);
    expect(vec2.lerp(vec2(0, 0), vec2(10, 20), 0.5)).toEqual({ x: 5, y: 10 });
  });
});

describe('vec3', () => {
  it('crosses two axes into the third', () => {
    expect(vec3.cross(vec3(1, 0, 0), vec3(0, 1, 0))).toEqual({ x: 0, y: 0, z: 1 });
  });

  it('normalises a zero-length vector to zero rather than to not-a-number', () => {
    expect(vec3.normalize(vec3(0, 0, 0))).toEqual({ x: 0, y: 0, z: 0 });
    expect(vec3.magnitude(vec3.normalize(vec3(0, 3, 4)))).toBeCloseTo(1, 10);
  });

  it('walks between two points component by component', () => {
    expect(vec3.lerp(vec3(0, 0, 0), vec3(2, 4, 6), 0.5)).toEqual({ x: 1, y: 2, z: 3 });
  });
});

describe('mat3', () => {
  it('leaves a point where it is under the identity', () => {
    expect(mat3.transformPoint(mat3.IDENTITY, vec2(3, 7))).toEqual({ x: 3, y: 7 });
  });

  it('moves a point and leaves a direction alone', () => {
    const move = mat3.translation(vec2(10, 20));
    expect(mat3.transformPoint(move, vec2(1, 1))).toEqual({ x: 11, y: 21 });
    expect(mat3.transformDirection(move, vec2(1, 1))).toEqual({ x: 1, y: 1 });
  });

  it('applies the right-hand matrix to a point first', () => {
    const move = mat3.translation(vec2(1, 0));
    const grow = mat3.scaling(vec2(2, 2));
    const movedThenGrown = mat3.transformPoint(mat3.multiply(grow, move), vec2(0, 0));
    const grownThenMoved = mat3.transformPoint(mat3.multiply(move, grow), vec2(0, 0));
    expect(movedThenGrown).toEqual({ x: 2, y: 0 });
    expect(grownThenMoved).toEqual({ x: 1, y: 0 });
  });

  it('rotates a point a quarter turn anticlockwise', () => {
    const turned = mat3.transformPoint(mat3.rotation(Math.PI / 2), vec2(1, 0));
    expect(turned.x).toBeCloseTo(0, 10);
    expect(turned.y).toBeCloseTo(1, 10);
  });

  it('reports how much longer a length becomes', () => {
    expect(mat3.scaleFactor(mat3.IDENTITY)).toBeCloseTo(1, 10);
    expect(mat3.scaleFactor(mat3.scaling(vec2(3, 3)))).toBeCloseTo(3, 10);
    expect(mat3.scaleFactor(mat3.rotation(0.7))).toBeCloseTo(1, 10);
    expect(mat3.scaleFactor(mat3.scaling(vec2(2, 4)))).toBeCloseTo(3, 10);
  });
});

describe('what the door hands out on its own', () => {
  it('states one tolerance that every call taking one falls back to', () => {
    // Four calls take a tolerance and each is a distance in the picture's own
    // units, so one number rather than four keeps them agreeing about what
    // counts as one place.
    expect(TOLERANCE).toBe(1e-6);
    const crossings = curveCrossings(
      vec2(0, 0),
      straight(vec2(0, 0), vec2(2, 2)),
      vec2(0, 2),
      straight(vec2(0, 2), vec2(2, 0)),
      { tolerance: TOLERANCE }
    );
    expect(crossings).toHaveLength(1);
  });

  it('counts two keys within half a frame as one key', () => {
    expect(SAME_TIME).toBe(1 / 120);
    const track = withKey([{ time: 0, value: 1 }], { time: SAME_TIME / 2, value: 5 });
    expect(track).toHaveLength(1);
    expect(track[0].value).toBe(5);
  });
});

describe('the geometry the door hands out beside the paths', () => {
  it('cuts one piece into two that draw what the whole drew', () => {
    const whole = straight(vec2(0, 0), vec2(4, 0));
    const [head, tail] = splitCurve(vec2(0, 0), whole, 0.25);
    expect(head.to.x).toBeCloseTo(1, 12);
    expect(pointOn(vec2(0, 0), head, 0.5).x).toBeCloseTo(0.5, 12);
    expect(pointOn(head.to, tail, 0.5).x).toBeCloseTo(2.5, 12);
  });

  it('reads which way a piece is heading', () => {
    const up = straight(vec2(0, 0), vec2(0, 3));
    const heading = slopeOn(vec2(0, 0), up, 0.5);
    expect(heading.x).toBeCloseTo(0, 12);
    expect(heading.y).toBeGreaterThan(0);
    const quarter = circle(vec2(0, 0), 1)[0];
    const start = slopeOn(quarter.start, quarter.curves[0], 0);
    // Anticlockwise from the positive x axis, so the first quarter leaves
    // straight up.
    expect(start.x).toBeCloseTo(0, 12);
    expect(start.y).toBeGreaterThan(0);
  });

  it('counts the windings round a point over a flattening made once', () => {
    const loops = flattenPath(circle(vec2(0, 0), 1));
    expect(windingAt(loops, vec2(0, 0))).toBe(1);
    expect(windingAt(loops, vec2(2, 0))).toBe(0);
  });

  it('says which edge a point sits nearest and which way it runs', () => {
    const loops = flattenPath(rect(vec2(0, 0), 2, 2));
    const edge = nearestEdge(loops, vec2(1, 0));
    expect(edge).not.toBeNull();
    expect(edge!.gap).toBeLessThan(1e-9);
    expect(Math.abs(edge!.heading.y)).toBeLessThan(1e-9);
    expect(nearestEdge([], vec2(0, 0))).toBeNull();
  });
});
