/**
 * The depth of a mark, fitted through the points in space it was drawn from.
 *
 * A depth is an affine function of the page: the depth at (x, y) is
 * a·x + b·y + c, and the mark with the smaller number at a point is the nearer
 * one there. Three numbers carry it exactly because a mark in space is a flat
 * piece of the world, and the depth of a plane is affine on the page under a
 * parallel projection. Under a perspective projection the affine quantity is the
 * reciprocal of the depth, which is what perspective-correct interpolation on a
 * card rests on, so the value fitted there is the negative of that reciprocal and
 * the smaller number stays the nearer mark under both.
 */
import { mat3, type Transform2D } from '../values/mat3.js';
import type { Vec2 } from '../values/vec2.js';
import type { Vec3 } from '../values/vec3.js';
import type { Camera3 } from './camera.js';
import type { Depth } from './mark.js';

/** How small the smaller spread of a set of page points is against the larger
 * before the set counts as lying on a line, so the fit takes its gradient along
 * that line rather than inverting a matrix that is barely invertible. */
const FLAT = 1e-12;

/** The value fitted at a point, which is the depth itself under a parallel
 * projection and the negative of its reciprocal under a perspective one. */
function valueOf(depth: number, camera: Camera3): number {
  return camera.projection.kind === 'perspective' ? -1 / depth : depth;
}

export type DepthOptions = {
  /** How far toward the eye the points are moved before the fit, in the units
   * the figure is drawn in. Where a run is drawn is not moved with it, so this
   * changes the depth alone. */
  lift?: number;
};

/** The depth this function gives at a place on the page. */
export function depthAt(depth: Depth, at: Vec2): number {
  return depth.a * at.x + depth.b * at.y + depth.c;
}

/**
 * The affine function of the page that is least wrong about the depths of these
 * points, or nothing where the eye can see none of them.
 *
 * Three points off a line settle it exactly and more are fitted by least
 * squares, which is what a curved cell gets: the cell is flat and the surface it
 * stands for is not, so the fit is as wrong as the cell already was. Points that
 * lie on one line on the page leave a family of answers rather than one, and the
 * one taken is the member whose gradient lies along that line, since a gradient
 * across a line nothing was measured along is a number no point asked for.
 */
export function depthOf(points: readonly Vec3[], camera: Camera3, options: DepthOptions = {}): Depth | undefined {
  const lift = options.lift ?? 0;
  const seen: { at: Vec2; value: number }[] = [];
  for (const point of points) {
    const projected = camera.project(point);
    if (!projected.inFront) continue;
    seen.push({ at: projected.at, value: valueOf(projected.depth - lift, camera) });
  }
  if (seen.length === 0) return undefined;

  let meanX = 0;
  let meanY = 0;
  let meanValue = 0;
  for (const one of seen) {
    meanX += one.at.x;
    meanY += one.at.y;
    meanValue += one.value;
  }
  meanX /= seen.length;
  meanY /= seen.length;
  meanValue /= seen.length;

  // The scatter of the places about their middle against the scatter of the
  // values about theirs, which is the pair of normal equations with the constant
  // already taken out.
  let xx = 0;
  let xy = 0;
  let yy = 0;
  let xv = 0;
  let yv = 0;
  for (const one of seen) {
    const dx = one.at.x - meanX;
    const dy = one.at.y - meanY;
    const dv = one.value - meanValue;
    xx += dx * dx;
    xy += dx * dy;
    yy += dy * dy;
    xv += dx * dv;
    yv += dy * dv;
  }

  const trace = xx + yy;
  if (trace <= 0) return { a: 0, b: 0, c: meanValue };

  const determinant = xx * yy - xy * xy;
  if (determinant > FLAT * trace * trace) {
    const a = (yy * xv - xy * yv) / determinant;
    const b = (xx * yv - xy * xv) / determinant;
    return { a, b, c: meanValue - a * meanX - b * meanY };
  }

  // The places lie on a line, so the scatter is the one direction along it times
  // the whole of the trace, and the column of it that is longer is that
  // direction. The gradient is the rate along that direction and nothing across
  // it.
  const [ux, uy] = xx >= yy ? [xx, xy] : [xy, yy];
  const length = Math.hypot(ux, uy);
  if (length === 0) return { a: 0, b: 0, c: meanValue };
  const along = (ux * xv + uy * yv) / (length * trace * length);
  const a = along * ux;
  const b = along * uy;
  return { a, b, c: meanValue - a * meanX - b * meanY };
}

/**
 * The same depth read against a page the transform has already moved.
 *
 * A group above a mark moves the geometry and the depth has to follow it, the
 * way a gradient's axis does. The depth at a moved place is what the function
 * gave at the place it came from, so the coefficients go through the inverse of
 * the transform rather than through the transform.
 */
export function transformDepth(depth: Depth, transform: Transform2D): Depth | undefined {
  const back = mat3.invert(transform);
  if (!back) return undefined;
  const [n0, n1, , n3, n4, , n6, n7] = back;
  return {
    a: depth.a * n0 + depth.b * n1,
    b: depth.a * n3 + depth.b * n4,
    c: depth.a * n6 + depth.b * n7 + depth.c,
  };
}
