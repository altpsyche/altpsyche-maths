/**
 * The transform a point in space carries: how a figure's camera turns a place in
 * the world into a place on the page.
 *
 * Sixteen numbers, column-major, matching the engine's layout the way `Transform2D`
 * does: the first four are the first column rather than the first row, and the
 * entry at flat index `col * 4 + row` is the one in that column and row. The
 * fourth row exists so that a translation is a multiplication like every other
 * move, and the fourth coordinate a point picks up is what a perspective divide
 * reads.
 *
 * There is no inverse here because nothing needs one: a camera builds its view
 * and its projection forwards and never undoes either. The day something has to
 * go from the page back into the world, that is when an inverse is written.
 *
 * The moves every renderer has are the engine's, imported from the door that
 * package declares for its arithmetic, so one implementation stands where two
 * agreed until one moved. What is written here is what that family has no call
 * for: a projection taking its parameters by name, the parallel one beside it,
 * and a direction carried without the translation or the divide.
 */
import { mat4 as spatial, type Mat4, type Vec3 } from '@altpsyche/engine/maths';

export type { Mat4 };

export type PerspectiveOptions = {
  /** The angle the frame covers up and down, in radians. */
  fov: number;
  /** Width over height, so a wide frame shows more sideways rather than less. */
  aspect: number;
  near: number;
  far: number;
};

/**
 * The projection of an eye that sees things smaller the further off they are.
 *
 * The third column puts the negated view-space z into the fourth coordinate, so
 * a point twice as far away comes back with twice the divisor and lands half as
 * far from the middle of the frame.
 */
/** The parameters arrive by name because a call site giving four bare numbers
 * cannot say which of them is the near plane. Depth comes back between nothing
 * and one, which is the range WebGPU reads. */
function perspective({ fov, aspect, near, far }: PerspectiveOptions): Mat4 {
  return spatial.perspective(fov, aspect, near, far);
}

export type OrthographicOptions = {
  left: number;
  right: number;
  bottom: number;
  top: number;
  near: number;
  far: number;
};

/** The projection of an eye that sees everything at the size it is, which maps
 * the named box onto the frame and leaves the fourth coordinate at one. */
function orthographic({ left, right, bottom, top, near, far }: OrthographicOptions): Mat4 {
  return [
    2 / (right - left), 0, 0, 0,
    0, 2 / (top - bottom), 0, 0,
    0, 0, -2 / (far - near), 0,
    -(right + left) / (right - left),
    -(top + bottom) / (top - bottom),
    -(far + near) / (far - near),
    1,
  ];
}

/** Applies the rotation and scale and neither the translation nor the divide,
 * which is what a direction wants: moving the world must not move where an arrow
 * points, and a direction has no distance for a perspective to shrink. */
function transformDirection(m: Mat4, v: Vec3): Vec3 {
  return {
    x: m[0] * v.x + m[4] * v.y + m[8] * v.z,
    y: m[1] * v.x + m[5] * v.y + m[9] * v.z,
    z: m[2] * v.x + m[6] * v.y + m[10] * v.z,
  };
}

export const mat4 = {
  IDENTITY: spatial.IDENTITY,
  multiply: spatial.multiply,
  translation: spatial.translation,
  scaling: spatial.scaling,
  rotationX: spatial.rotationX,
  rotationY: spatial.rotationY,
  rotationZ: spatial.rotationZ,
  lookAt: spatial.lookAt,
  transformPoint: spatial.transformPoint,
  perspective,
  orthographic,
  transformDirection,
};
