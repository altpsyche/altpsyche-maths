/**
 * Points and directions in space, for the values a figure carries that are not
 * positions on the page, such as a colour or a direction being explained.
 *
 * The arithmetic is the engine's, imported from the door that package declares
 * for it, so the two hold one implementation rather than two that agree until
 * one of them moves. Two copies is how a projection here came to write clip
 * depth into a range that one never wrote.
 *
 * That door carries the arithmetic alone, so a consumer that never draws on a
 * card loads one file of it and no renderer. The family is rebuilt here rather
 * than added to, since adding a name to the imported object would change it for
 * everything else holding it.
 */
import { vec3 as spatial, type Vec3 } from '@altpsyche/engine/maths';
import { lerp as lerpNumber } from './scalar.js';

export type { Vec3 };

/** Part way from one point to another, which the engine's family has no call
 * for and every animation here does. */
function lerp(a: Vec3, b: Vec3, along: number): Vec3 {
  return {
    x: lerpNumber(a.x, b.x, along),
    y: lerpNumber(a.y, b.y, along),
    z: lerpNumber(a.z, b.z, along),
  };
}

/**
 * The vector calls under one name, so a call site says which kind of thing it is
 * reading.
 *
 * The magnitude is not called `length`: a function's own `length` is how many
 * arguments it takes, it is not writable, and assigning one throws.
 */
export const vec3 = Object.assign((x: number, y: number, z: number): Vec3 => spatial(x, y, z), {
  add: spatial.add,
  sub: spatial.sub,
  scale: spatial.scale,
  dot: spatial.dot,
  cross: spatial.cross,
  magnitude: spatial.magnitude,
  normalize: spatial.normalize,
  ZERO: spatial(0, 0, 0),
  lerp,
});
