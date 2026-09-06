/**
 * Points and directions on a flat picture.
 *
 * The shape is the one the engine already uses for its own vectors, named
 * fields rather than a tuple, so that if the two libraries ever meet neither
 * has to convert.
 */
import { lerp as lerpNumber } from './scalar.js';

export type Vec2 = { x: number; y: number };

function makeVec2(x: number, y: number): Vec2 {
  return { x, y };
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

/** The z of the three-dimensional cross product, which is the signed area of
 * the parallelogram and tells which side of `a` the vector `b` falls. */
function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

function length(v: Vec2): number {
  return Math.sqrt(dot(v, v));
}

function distance(a: Vec2, b: Vec2): number {
  return length(sub(a, b));
}

/** A zero-length vector normalises to zero rather than to not-a-number, so a
 * degenerate direction leaves a mark where it was instead of removing it. */
function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len === 0) return { x: 0, y: 0 };
  return scale(v, 1 / len);
}

/** Turned a quarter turn anticlockwise, which is the direction an arrow head
 * and a line's thickness are both measured along. */
function perpendicular(v: Vec2): Vec2 {
  return { x: -v.y, y: v.x };
}

function rotate(v: Vec2, radians: number): Vec2 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/** The direction the vector points, anticlockwise from the positive x axis, in
 * radians between minus pi and pi. */
function angle(v: Vec2): number {
  return Math.atan2(v.y, v.x);
}

function lerp(a: Vec2, b: Vec2, along: number): Vec2 {
  return { x: lerpNumber(a.x, b.x, along), y: lerpNumber(a.y, b.y, along) };
}

/**
 * The constructor and the family under one name, so building a vector stays
 * short and an import line says what these operate on.
 *
 * The magnitude is not called `length`: a function's own `length` is how many
 * arguments it takes, it is not writable, and assigning one throws.
 */
export const vec2 = Object.assign(makeVec2, {
  ZERO: makeVec2(0, 0),
  add,
  sub,
  scale,
  dot,
  cross,
  magnitude: length,
  distance,
  normalize,
  perpendicular,
  rotate,
  angle,
  lerp,
});
