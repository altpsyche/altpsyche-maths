/**
 * The transform a group of marks carries, and the one that maps a figure's own
 * units onto whatever it is being drawn at.
 *
 * Nine numbers, column-major, matching the engine's layout: the first three are
 * the first column rather than the first row, and the entry at flat index
 * `col * 3 + row` is the one in that column and row. A flat picture needs only
 * the top two rows, and the third exists so that a translation is a
 * multiplication like every other move rather than an addition bolted on after.
 */
import type { Vec2 } from './vec2.js';

export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];

const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Column-major product, so `multiply(a, b)` applies `b` to a point first and
 * then `a`, which is the order a group's transform sits outside its child's. */
function multiply(a: Mat3, b: Mat3): Mat3 {
  const [a0, a1, a2, a3, a4, a5, a6, a7, a8] = a;
  const [b0, b1, b2, b3, b4, b5, b6, b7, b8] = b;
  return [
    a0 * b0 + a3 * b1 + a6 * b2,
    a1 * b0 + a4 * b1 + a7 * b2,
    a2 * b0 + a5 * b1 + a8 * b2,

    a0 * b3 + a3 * b4 + a6 * b5,
    a1 * b3 + a4 * b4 + a7 * b5,
    a2 * b3 + a5 * b4 + a8 * b5,

    a0 * b6 + a3 * b7 + a6 * b8,
    a1 * b6 + a4 * b7 + a7 * b8,
    a2 * b6 + a5 * b7 + a8 * b8,
  ];
}

/** The last column carries the offset, so this moves a point and leaves a
 * direction where it was. */
function translation(v: Vec2): Mat3 {
  return [1, 0, 0, 0, 1, 0, v.x, v.y, 1];
}

function scaling(v: Vec2): Mat3 {
  return [v.x, 0, 0, 0, v.y, 0, 0, 0, 1];
}

function rotation(radians: number): Mat3 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [c, s, 0, -s, c, 0, 0, 0, 1];
}

/** Applies the matrix to a point, which takes the translation with it. */
function transformPoint(m: Mat3, v: Vec2): Vec2 {
  const [m0, m1, , m3, m4, , m6, m7] = m;
  return { x: m0 * v.x + m3 * v.y + m6, y: m1 * v.x + m4 * v.y + m7 };
}

/** Applies the rotation and scale and not the translation, which is what a
 * direction wants: moving the picture must not move where an arrow points. */
function transformDirection(m: Mat3, v: Vec2): Vec2 {
  const [m0, m1, , m3, m4] = m;
  return { x: m0 * v.x + m3 * v.y, y: m1 * v.x + m4 * v.y };
}

/**
 * How much longer a length becomes under this transform.
 *
 * A stroke is given in figure units and drawn in pixels, and a transform that
 * scales differently along each axis has no single answer, so this takes the
 * mean of the two axes rather than pretending there is one.
 */
function scaleFactor(m: Mat3): number {
  const [m0, m1, , m3, m4] = m;
  return (Math.hypot(m0, m1) + Math.hypot(m3, m4)) / 2;
}

export const mat3 = {
  IDENTITY,
  multiply,
  translation,
  scaling,
  rotation,
  transformPoint,
  transformDirection,
  scaleFactor,
};
