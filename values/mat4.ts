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
 */
import { vec3, type Vec3 } from './vec3.js';

export type Mat4 = readonly [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

const IDENTITY: Mat4 = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

/** Column-major product, so `multiply(a, b)` applies `b` to a point first and
 * then `a`, which is the order a projection sits outside a view. */
function multiply(a: Mat4, b: Mat4): Mat4 {
  const [a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15] = a;
  const [b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15] = b;
  return [
    a0 * b0 + a4 * b1 + a8 * b2 + a12 * b3,
    a1 * b0 + a5 * b1 + a9 * b2 + a13 * b3,
    a2 * b0 + a6 * b1 + a10 * b2 + a14 * b3,
    a3 * b0 + a7 * b1 + a11 * b2 + a15 * b3,

    a0 * b4 + a4 * b5 + a8 * b6 + a12 * b7,
    a1 * b4 + a5 * b5 + a9 * b6 + a13 * b7,
    a2 * b4 + a6 * b5 + a10 * b6 + a14 * b7,
    a3 * b4 + a7 * b5 + a11 * b6 + a15 * b7,

    a0 * b8 + a4 * b9 + a8 * b10 + a12 * b11,
    a1 * b8 + a5 * b9 + a9 * b10 + a13 * b11,
    a2 * b8 + a6 * b9 + a10 * b10 + a14 * b11,
    a3 * b8 + a7 * b9 + a11 * b10 + a15 * b11,

    a0 * b12 + a4 * b13 + a8 * b14 + a12 * b15,
    a1 * b12 + a5 * b13 + a9 * b14 + a13 * b15,
    a2 * b12 + a6 * b13 + a10 * b14 + a14 * b15,
    a3 * b12 + a7 * b13 + a11 * b14 + a15 * b15,
  ];
}

/** The last column carries the offset, so this moves a point and leaves a
 * direction where it was. */
function translation(v: Vec3): Mat4 {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    v.x, v.y, v.z, 1,
  ];
}

function scaling(v: Vec3): Mat4 {
  return [
    v.x, 0, 0, 0,
    0, v.y, 0, 0,
    0, 0, v.z, 0,
    0, 0, 0, 1,
  ];
}

/** Turns y towards z, so a positive angle is anticlockwise seen from the far
 * end of the x axis looking back at the origin. */
function rotationX(radians: number): Mat4 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1,
  ];
}

/** Turns z towards x, which is the odd one out: the pair of axes runs z then x
 * rather than x then z, and writing it the other way flips every y rotation. */
function rotationY(radians: number): Mat4 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1,
  ];
}

/** Turns x towards y, which is the flat rotation `Transform2D` gives with a z left
 * alone. */
function rotationZ(radians: number): Mat4 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

/**
 * The view matrix of an eye at `eye` looking at `target`, with `up` saying which
 * way is up.
 *
 * View space looks down its own negative z, so the target comes out on the
 * negative z axis at the distance between the eye and the target. An `up` lying
 * along the line of sight has no sideways direction in it and gives a matrix of
 * zeroes, which is the pose a caller has to avoid rather than one this can fix.
 */
function lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
  const forward = vec3.normalize(vec3.sub(target, eye));
  const right = vec3.normalize(vec3.cross(forward, up));
  const above = vec3.cross(right, forward);
  return [
    right.x, above.x, -forward.x, 0,
    right.y, above.y, -forward.y, 0,
    right.z, above.z, -forward.z, 0,
    -vec3.dot(right, eye), -vec3.dot(above, eye), vec3.dot(forward, eye), 1,
  ];
}

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
/** Depth comes back between nothing and one, which is the range WebGPU reads and
 * the range the engine's own projection writes. A figure reads the x and y of a
 * projected point and takes its depth from view space, so the two entries this
 * range lives in touch nothing a flat picture draws. */
function perspective({ fov, aspect, near, far }: PerspectiveOptions): Mat4 {
  const focal = 1 / Math.tan(fov / 2);
  const range = near - far;
  return [
    focal / aspect, 0, 0, 0,
    0, focal, 0, 0,
    0, 0, far / range, -1,
    0, 0, (near * far) / range, 0,
  ];
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

/**
 * Applies the matrix to a point, taking the translation with it and dividing by
 * the fourth coordinate the matrix gives it.
 *
 * That divide is why a point through `multiply(a, b)` matches the same point
 * through `b` and then through `a` for matrices that do not touch the fourth
 * coordinate and not for a perspective matrix: dividing halfway throws away the
 * fourth coordinate the outer matrix still needed. A fourth coordinate of zero is
 * a point on the plane through the eye, which has no place on the page at all, so
 * the divide is skipped and the caller is left to notice.
 */
function transformPoint(m: Mat4, v: Vec3): Vec3 {
  const w = m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15];
  const divisor = w === 0 ? 1 : w;
  return {
    x: (m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12]) / divisor,
    y: (m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13]) / divisor,
    z: (m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14]) / divisor,
  };
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
  IDENTITY,
  multiply,
  translation,
  scaling,
  rotationX,
  rotationY,
  rotationZ,
  lookAt,
  perspective,
  orthographic,
  transformPoint,
  transformDirection,
};
