/**
 * The one door. Nothing outside this package reaches a file inside it by path,
 * which is the same rule the engine is held to, so a caller can never come to
 * depend on where a file sits.
 *
 * There is a line through this package. Values and timing are below it and
 * change almost never; figures and painters will sit above it and change often.
 * Nothing below the line may import anything above it.
 */

export { clamp, inverseLerp, lerp, remap } from './values/scalar.js';
export { curveFor, easeIn, easeOut, linear, smoothstep } from './values/ease.js';
export type { Curve } from './values/ease.js';
export { vec2 } from './values/vec2.js';
export type { Vec2 } from './values/vec2.js';
export { vec3 } from './values/vec3.js';
export type { Vec3 } from './values/vec3.js';
export { mat3 } from './values/mat3.js';
export type { Mat3 } from './values/mat3.js';
