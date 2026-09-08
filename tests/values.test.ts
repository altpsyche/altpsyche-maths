import { describe, expect, it } from 'vitest';
import {
  SAME_TIME,
  TOLERANCE,
  circle,
  clamp,
  curveCrossings,
  curveFor,
  curveNamed,
  easeIn,
  easeOut,
  flattenPath,
  inverseLerp,
  linear,
  lerp,
  mat3,
  mat4,
  nameOfCurve,
  nearestEdge,
  overshoot,
  pointOn,
  rect,
  remap,
  tangentOn,
  smoothstep,
  splitCurve,
  straight,
  thereAndBack,
  vec2,
  vec3,
  windingAt,
  withKey,
} from '@altpsyche/maths';
import type { Curve, CurveName, Mat4, Vec3 } from '@altpsyche/maths';

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

const ELEVEN = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

/** The back ease's own constants, written out here rather than imported, so the
 * test is a second statement of the closed form and not a copy of the first. */
const BACK = 1.70158;

const CLOSED_FORMS: Record<CurveName, (along: number) => number> = {
  linear: (along) => along,
  easeIn: (along) => Math.pow(along, 2),
  easeOut: (along) => 1 - Math.pow(1 - along, 2),
  smoothstep: (along) => 3 * Math.pow(along, 2) - 2 * Math.pow(along, 3),
  overshoot: (along) => 1 + (BACK + 1) * Math.pow(along - 1, 3) + BACK * Math.pow(along - 1, 2),
  thereAndBack: (along) => {
    const half = along <= 0.5 ? along * 2 : 2 - along * 2;
    return 3 * Math.pow(half, 2) - 2 * Math.pow(half, 3);
  },
};

describe('curves', () => {
  it('separates at the midpoint, which is the whole reason there are six', () => {
    expect(linear(0.5)).toBeCloseTo(0.5, 10);
    expect(easeIn(0.5)).toBeCloseTo(0.25, 10);
    expect(easeOut(0.5)).toBeCloseTo(0.75, 10);
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 10);
    expect(overshoot(0.5)).toBeCloseTo(1.0876975, 7);
    expect(thereAndBack(0.5)).toBeCloseTo(1, 10);
  });

  it('agrees with its closed form at eleven inputs', () => {
    for (const [name, closed] of Object.entries(CLOSED_FORMS)) {
      for (const along of ELEVEN) {
        expect(curveNamed(name as CurveName)(along)).toBeCloseTo(closed(along), 10);
      }
    }
  });

  it('starts at zero and ends where its own shape says', () => {
    for (const name of Object.keys(CLOSED_FORMS) as CurveName[]) {
      expect(curveNamed(name)(0)).toBeCloseTo(0, 10);
      expect(curveNamed(name)(1)).toBeCloseTo(name === 'thereAndBack' ? 0 : 1, 10);
    }
  });

  it('passes its destination only where a curve is meant to', () => {
    for (const name of Object.keys(CLOSED_FORMS) as CurveName[]) {
      const highest = Math.max(...ELEVEN.map((along) => curveNamed(name)(along)));
      if (name === 'overshoot') expect(highest).toBeGreaterThan(1);
      else expect(highest).toBeLessThanOrEqual(1 + TOLERANCE);
    }
  });

  it('peaks past the end by a hundredth part and a bit, where the back constant puts it', () => {
    const at = 1 - (2 * BACK) / (3 * (BACK + 1));
    expect(at).toBeCloseTo(0.580103, 6);
    expect(overshoot(at)).toBeCloseTo(1.100004, 6);
    expect(overshoot(at)).toBeCloseTo(1 + (4 * Math.pow(BACK, 3)) / (27 * Math.pow(BACK + 1, 2)), 10);
  });

  it('turns at the top and comes back to where it started', () => {
    expect(thereAndBack(0.25)).toBeCloseTo(0.5, 10);
    expect(thereAndBack(0.75)).toBeCloseTo(0.5, 10);
    expect(thereAndBack(1)).toBeCloseTo(0, 10);
  });

  it('picks the curve from which ends are flat', () => {
    expect(curveFor(false, false)(0.5)).toBeCloseTo(0.5, 10);
    expect(curveFor(true, false)(0.5)).toBeCloseTo(0.25, 10);
    expect(curveFor(false, true)(0.5)).toBeCloseTo(0.75, 10);
    expect(curveFor(true, true)(0.25)).toBeCloseTo(0.15625, 10);
  });

  it('answers the four flat pairings with the four monotone curves', () => {
    expect(nameOfCurve(curveFor(false, false))).toBe('linear');
    expect(nameOfCurve(curveFor(true, false))).toBe('easeIn');
    expect(nameOfCurve(curveFor(false, true))).toBe('easeOut');
    expect(nameOfCurve(curveFor(true, true))).toBe('smoothstep');
  });

  it('names every curve it holds and nothing a caller wrote itself', () => {
    for (const name of Object.keys(CLOSED_FORMS) as CurveName[]) {
      expect(nameOfCurve(curveNamed(name))).toBe(name);
    }
    const written: Curve = (along) => Math.sqrt(along);
    expect(nameOfCurve(written)).toBeUndefined();
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

/** A generator with a written-down seed, so a failure is the same failure on the
 * next run rather than a different one. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('mat4', () => {
  const random = seeded(20260908);
  const randomMatrix = (): Mat4 =>
    Array.from({ length: 16 }, () => random() * 2 - 1) as unknown as Mat4;
  const randomPoint = (): Vec3 => vec3(random() * 4 - 2, random() * 4 - 2, random() * 4 - 2);

  it('leaves a point where it is under the identity', () => {
    expect(mat4.transformPoint(mat4.IDENTITY, vec3(3, 7, 11))).toEqual({ x: 3, y: 7, z: 11 });
  });

  it('moves a point and leaves a direction alone', () => {
    const move = mat4.translation(vec3(10, 20, 30));
    expect(mat4.transformPoint(move, vec3(1, 1, 1))).toEqual({ x: 11, y: 21, z: 31 });
    expect(mat4.transformDirection(move, vec3(1, 1, 1))).toEqual({ x: 1, y: 1, z: 1 });
  });

  it('multiplies the same way whichever pair is done first', () => {
    let worst = 0;
    for (let trial = 0; trial < 100; trial += 1) {
      const a = randomMatrix();
      const b = randomMatrix();
      const c = randomMatrix();
      const left = mat4.multiply(mat4.multiply(a, b), c);
      const right = mat4.multiply(a, mat4.multiply(b, c));
      for (let i = 0; i < 16; i += 1) worst = Math.max(worst, Math.abs(left[i] - right[i]));
    }
    expect(worst).toBeLessThan(1e-12);
  });

  it('brings a point back to itself through a move and its opposite', () => {
    const there = mat4.translation(vec3(3.5, -2.25, 7.125));
    const back = mat4.translation(vec3(-3.5, 2.25, -7.125));
    const round = mat4.multiply(back, there);
    for (let trial = 0; trial < 100; trial += 1) {
      const point = randomPoint();
      const moved = mat4.transformPoint(round, point);
      expect(Math.abs(moved.x - point.x)).toBeLessThan(1e-12);
      expect(Math.abs(moved.y - point.y)).toBeLessThan(1e-12);
      expect(Math.abs(moved.z - point.z)).toBeLessThan(1e-12);
    }
  });

  it('applies the right-hand matrix to a point first', () => {
    const move = mat4.translation(vec3(1, 2, 3));
    const grow = mat4.scaling(vec3(2, 2, 2));
    const turn = mat4.rotationZ(0.7);
    const combined = mat4.multiply(mat4.multiply(grow, turn), move);
    for (let trial = 0; trial < 100; trial += 1) {
      const point = randomPoint();
      const once = mat4.transformPoint(combined, point);
      const step = mat4.transformPoint(grow, mat4.transformPoint(turn, mat4.transformPoint(move, point)));
      expect(Math.abs(once.x - step.x)).toBeLessThan(1e-12);
      expect(Math.abs(once.y - step.y)).toBeLessThan(1e-12);
      expect(Math.abs(once.z - step.z)).toBeLessThan(1e-12);
    }
  });

  it('turns each pair of axes towards the next one round', () => {
    const aboutX = mat4.transformPoint(mat4.rotationX(Math.PI / 2), vec3(0, 1, 0));
    expect(aboutX.y).toBeCloseTo(0, 12);
    expect(aboutX.z).toBeCloseTo(1, 12);

    const aboutY = mat4.transformPoint(mat4.rotationY(Math.PI / 2), vec3(0, 0, 1));
    expect(aboutY.z).toBeCloseTo(0, 12);
    expect(aboutY.x).toBeCloseTo(1, 12);

    const aboutZ = mat4.transformPoint(mat4.rotationZ(Math.PI / 2), vec3(1, 0, 0));
    expect(aboutZ.x).toBeCloseTo(0, 12);
    expect(aboutZ.y).toBeCloseTo(1, 12);
  });

  it('puts what the eye looks at straight down its own negative z', () => {
    const eye = vec3(3, 4, 5);
    const target = vec3(0, 1, -1);
    const view = mat4.lookAt(eye, target, vec3(0, 1, 0));
    const seen = mat4.transformPoint(view, target);
    const distance = vec3.magnitude(vec3.sub(target, eye));
    expect(Math.abs(seen.x)).toBeLessThan(1e-12);
    expect(Math.abs(seen.y)).toBeLessThan(1e-12);
    expect(Math.abs(seen.z + distance)).toBeLessThan(1e-12);
    expect(Math.abs(mat4.transformPoint(view, eye).z)).toBeLessThan(1e-12);
  });

  it('shrinks a point by how far off it is under a perspective', () => {
    const projection = mat4.perspective({ fov: Math.PI / 3, aspect: 1, near: 0.1, far: 100 });
    const near = mat4.transformPoint(projection, vec3(1, 1, -2));
    const far = mat4.transformPoint(projection, vec3(1, 1, -4));
    expect(Math.abs(far.x - near.x / 2)).toBeLessThan(1e-12);
    expect(Math.abs(far.y - near.y / 2)).toBeLessThan(1e-12);
  });

  it('maps the named box onto the frame under an orthographic', () => {
    const projection = mat4.orthographic({ left: -2, right: 2, bottom: -1, top: 1, near: 1, far: 5 });
    const corner = mat4.transformPoint(projection, vec3(2, 1, -1));
    expect(Math.abs(corner.x - 1)).toBeLessThan(1e-12);
    expect(Math.abs(corner.y - 1)).toBeLessThan(1e-12);
    expect(Math.abs(corner.z + 1)).toBeLessThan(1e-12);

    const opposite = mat4.transformPoint(projection, vec3(-2, -1, -5));
    expect(Math.abs(opposite.x + 1)).toBeLessThan(1e-12);
    expect(Math.abs(opposite.y + 1)).toBeLessThan(1e-12);
    expect(Math.abs(opposite.z - 1)).toBeLessThan(1e-12);
  });
});

describe('what the door hands out on its own', () => {
  it('states one tolerance that every call taking one falls back to', () => {
    // Four calls take a tolerance and each is a distance in the picture's own units,
    // so one number rather than four keeps them agreeing on what one place is.
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
    const heading = tangentOn(vec2(0, 0), up, 0.5);
    expect(heading.x).toBeCloseTo(0, 12);
    expect(heading.y).toBeGreaterThan(0);
    const quarter = circle(vec2(0, 0), 1)[0];
    const start = tangentOn(quarter.start, quarter.curves[0], 0);
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
