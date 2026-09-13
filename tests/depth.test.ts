import { describe, expect, it } from 'vitest';
import { camera3, orthographic, perspective } from '../figure/camera.js';
import { depthAt, depthOf, transformDepth } from '../figure/depth.js';
import { mat3 } from '../values/mat3.js';
import { vec2 } from '../values/vec2.js';
import { vec3, type Vec3 } from '../values/vec3.js';

/**
 * The depth a mark carries, which is an affine function of the page.
 *
 * A plane is what the three numbers are exact for, so every claim here is
 * measured against a plane in the world and against the projection's own answer
 * at the points that plane was fitted through.
 */

const flat = camera3({ eye: vec3(0, 0, 6), target: vec3(0, 0, 0), up: vec3(0, 1, 0), projection: orthographic() });
const eye = camera3({
  eye: vec3(3, 2, 5),
  target: vec3(0, 0, 0),
  up: vec3(0, 0, 1),
  projection: perspective({ fov: Math.PI / 5, height: 4, near: 0.2 }),
});

/** The value the projection itself gives at a point, which is the depth under a
 * parallel projection and the negative of its reciprocal under a perspective
 * one. */
function trueValue(camera: typeof eye, point: Vec3): number {
  const seen = camera.project(point);
  return camera.projection.kind === 'perspective' ? -1 / seen.depth : seen.depth;
}

function worstOver(camera: typeof eye, points: readonly Vec3[], fitted: readonly Vec3[] = points): number {
  const depth = depthOf(fitted, camera);
  expect(depth).toBeDefined();
  let worst = 0;
  for (const point of points) {
    const seen = camera.project(point);
    worst = Math.max(worst, Math.abs(depthAt(depth!, seen.at) - trueValue(camera, point)));
  }
  return worst;
}

describe('a depth fitted through points in space', () => {
  it('is exact for a plane under either projection', () => {
    // A slanted plane, so the fit has a gradient in both directions to get right.
    const plane = (x: number, y: number): Vec3 => vec3(x, y, 0.3 * x - 0.2 * y + 0.5);
    const corners = [plane(-1, -1), plane(1, -1), plane(1, 1), plane(-1, 1)];
    const inside = [plane(-0.4, 0.7), plane(0.25, -0.6), plane(0.9, 0.1)];
    expect(worstOver(eye, [...corners, ...inside], corners)).toBeLessThan(1e-12);
    expect(worstOver(flat, [...corners, ...inside], corners)).toBeLessThan(1e-12);
  });

  it('takes its gradient along the line where every point lies on one', () => {
    const along = [vec3(-1, -1, 0), vec3(0, 0, 1), vec3(1, 1, 2)];
    const depth = depthOf(along, eye);
    expect(depth).toBeDefined();
    for (const point of along) {
      expect(depthAt(depth!, eye.project(point).at)).toBeCloseTo(trueValue(eye, point), 12);
    }
    // Nothing was measured across the line, so the fit claims no rate across it:
    // the gradient lies along the direction the points run in.
    const from = eye.project(along[0]).at;
    const to = eye.project(along[2]).at;
    const across = vec2(-(to.y - from.y), to.x - from.x);
    expect(Math.abs(depth!.a * across.x + depth!.b * across.y)).toBeLessThan(1e-12);
  });

  it('is a constant where every point lands in one place', () => {
    const depth = depthOf([vec3(1, 2, 3)], eye);
    expect(depth).toEqual({ a: 0, b: 0, c: trueValue(eye, vec3(1, 2, 3)) });
  });

  it('is nothing where the eye can see none of the points', () => {
    expect(depthOf([vec3(3, 2, 5.1), vec3(3.1, 2, 5.2)], eye)).toBeUndefined();
    expect(depthOf([], eye)).toBeUndefined();
  });

  it('moves the depth and not the page when it is lifted', () => {
    const points = [vec3(-1, -1, 0), vec3(1, -1, 0), vec3(1, 1, 0)];
    const lift = 0.05;
    const lifted = depthOf(points, eye, { lift })!;
    for (const point of points) {
      const seen = eye.project(point);
      expect(depthAt(lifted, seen.at)).toBeCloseTo(-1 / (seen.depth - lift), 12);
      // Nearer means smaller, so a lifted run wins against what it lies on.
      expect(depthAt(lifted, seen.at)).toBeLessThan(trueValue(eye, point));
    }
  });
});

describe('a depth under a transform', () => {
  it('gives at the moved place what it gave at the place it came from', () => {
    const depth = { a: 0.4, b: -0.25, c: 1.5 };
    const transform = mat3.multiply(
      mat3.translation(vec2(2, -1)),
      mat3.multiply(mat3.rotation(0.7), mat3.scaling(vec2(1.5, 0.6))),
    );
    const moved = transformDepth(depth, transform)!;
    for (const at of [vec2(0, 0), vec2(1, 2), vec2(-3, 0.5)]) {
      expect(depthAt(moved, mat3.transformPoint(transform, at))).toBeCloseTo(depthAt(depth, at), 12);
    }
  });

  it('is nothing under a transform that collapses the page', () => {
    expect(transformDepth({ a: 1, b: 1, c: 1 }, mat3.scaling(vec2(1, 0)))).toBeUndefined();
  });
});
