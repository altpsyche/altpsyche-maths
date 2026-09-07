/**
 * A figure's own camera: where an eye is, what it looks at, and how a point in
 * space becomes a point in the figure's units.
 *
 * A camera is a value the caller holds, the way a `Scale` is, and nothing inside
 * a figure owns one. That is what keeps the seam: `at(figure, seconds)` gives
 * back marks measured in the figure's own units, so a point in space has to
 * become a point in those units before it is a mark at all. A camera inside the
 * flattening would make every animation say whether it acts on the shape in
 * space or on the picture of it, which is a question `fadeIn` should never be
 * asked.
 *
 * So a camera moves by being rebuilt from values a track samples, and never by an
 * animation. A span's eased fraction and a track's value are unrelated numbers,
 * and a camera on one with a surface on the other is two clocks free to disagree.
 */
import { mat4, type Mat4 } from '../values/mat4.js';
import { vec3, type Vec3 } from '../values/vec3.js';
import type { Vec2 } from '../values/vec2.js';

/**
 * How a point that the eye has already lined up becomes a point on the page.
 *
 * `place` takes a point in view space, where the eye is at the origin looking
 * down the negative z axis, and gives its place in figure units measured from the
 * middle of the frame. `near` is how close to the eye a point may come before it
 * has no place on the page at all.
 */
export type Projection = {
  near: number;
  place: (view: Vec3) => Vec2;
};

export type OrthographicChoice = {
  /** How many figure units across the frame one world unit becomes. */
  scale?: number;
};

/**
 * An eye that sees everything at the size it is, however far off it is.
 *
 * A parallel projection is a multiplication rather than a divide, so there is no
 * matrix here and no clip box: near and far planes are what a divide needs, and
 * this has none. Nothing shrinks with distance, so a point behind the eye lands
 * where the point in front of it that it lines up with lands, and the near plane
 * is at negative infinity to say that nothing is ever cut away.
 */
export function orthographic({ scale = 1 }: OrthographicChoice = {}): Projection {
  return {
    near: -Infinity,
    place: (view) => ({ x: view.x * scale, y: view.y * scale }),
  };
}

export type PerspectiveChoice = {
  /** The angle the frame covers up and down, in radians. */
  fov?: number;
  /** How tall the frame is in figure units, so handing this the extent's own
   * height makes the picture fill the frame. */
  height?: number;
  near?: number;
  far?: number;
};

/**
 * An eye that sees things smaller the further off they are.
 *
 * The matrix is built at an aspect of one and only its x and y are read, so the
 * same shrinking factor is used across and up and a circle facing the eye stays a
 * circle at every shape of surface. How wide the frame is comes from the extent,
 * and how deep a point is comes from view space, where it is a distance rather
 * than the squeezed value a projection writes into z.
 */
export function perspective({
  fov = Math.PI / 4,
  height = 2,
  near = 0.01,
  far = 1000,
}: PerspectiveChoice = {}): Projection {
  const matrix = mat4.perspective({ fov, aspect: 1, near, far });
  return {
    near,
    place: (view) => {
      const clip = mat4.transformPoint(matrix, view);
      return { x: (clip.x * height) / 2, y: (clip.y * height) / 2 };
    },
  };
}

export type Camera3Choice = {
  eye: Vec3;
  target: Vec3;
  up?: Vec3;
  projection?: Projection;
};

/** Where a point in space landed, how far off it is, and whether the eye can see
 * it at all. */
export type Projected = {
  /** The place in the figure's own units, measured from the middle of the frame. */
  at: Vec2;
  /** How far the point is from the eye along the way the camera looks, which is
   * what a depth sort orders by and not the straight-line distance to the eye. */
  depth: number;
  /** Whether the point is further off than the near plane. A point that is not is
   * still given a place, and that place is meaningless. */
  inFront: boolean;
};

export type Camera3 = {
  eye: Vec3;
  target: Vec3;
  up: Vec3;
  projection: Projection;
  /** The matrix that lines the world up with the eye, kept so a caller that has
   * many points to place does not rebuild it per point. */
  view: Mat4;
  project: (point: Vec3) => Projected;
};

/**
 * An eye at `eye` looking at `target`, with `up` saying which way is up.
 *
 * An `up` lying along the line of sight has no sideways direction in it and gives
 * a camera that places every point at the middle of the frame, which is a pose
 * the caller has to avoid rather than one this can fix.
 */
export function camera3({
  eye,
  target,
  up = vec3(0, 1, 0),
  projection = perspective(),
}: Camera3Choice): Camera3 {
  const view = mat4.lookAt(eye, target, up);
  return {
    eye,
    target,
    up,
    projection,
    view,
    project: (point) => {
      const seen = mat4.transformPoint(view, point);
      const depth = -seen.z;
      return { at: projection.place(seen), depth, inFront: depth > projection.near };
    },
  };
}
