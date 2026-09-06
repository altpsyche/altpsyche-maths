/**
 * Points and directions in space, for the values a figure carries that are not
 * positions on the page, such as a colour or a direction being explained.
 *
 * The names and the shape match the engine's own vectors exactly, so the two
 * can be merged later without either side converting.
 */
import { lerp as lerpNumber } from './scalar.js';

export type Vec3 = { x: number; y: number; z: number };

function makeVec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function length(v: Vec3): number {
  return Math.sqrt(dot(v, v));
}

/** A zero-length vector normalises to zero rather than to not-a-number. */
function normalize(v: Vec3): Vec3 {
  const len = length(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return scale(v, 1 / len);
}

function lerp(a: Vec3, b: Vec3, along: number): Vec3 {
  return {
    x: lerpNumber(a.x, b.x, along),
    y: lerpNumber(a.y, b.y, along),
    z: lerpNumber(a.z, b.z, along),
  };
}

export const vec3 = Object.assign(makeVec3, {
  ZERO: makeVec3(0, 0, 0),
  add,
  sub,
  scale,
  dot,
  cross,
  magnitude: length,
  normalize,
  lerp,
});
