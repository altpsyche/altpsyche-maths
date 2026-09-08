/**
 * A camera written as data, and the projection under it.
 *
 * A built `Camera3` carries `project` and its `Projection` carries `place`, so a
 * figure that carried a built camera would carry two functions. What a figure
 * stores is the pose and the choice of projection, and `resolveCamera` builds the
 * camera from them at the time being drawn.
 *
 * A place in space is three expressions rather than one, because the expression
 * form is over numbers and points on the page and has no value for a place in
 * space. Three expressions write the solid demo's orbit directly, since the eye
 * is a cosine and a sine of one track, and widening the field later to accept a
 * single expression as well costs a minor rather than a major: a reader that
 * accepts either still reads every figure written against this.
 *
 * A plain `Vec3` is a `Point3Record` already, since a bare number is a literal.
 */
import { vec3, type Vec3 } from '../values/vec3.js';
import { camera3, resolveProjection, type Camera3, type ProjectionChoice } from './camera.js';
import { evaluate, type Bindings, type Expression } from './expression.js';

/** A place in space whose three numbers may each follow a track. */
export interface Point3Record {
  readonly x: Expression;
  readonly y: Expression;
  readonly z: Expression;
}

export interface Camera3Record {
  readonly eye: Point3Record;
  readonly target: Point3Record;
  readonly up?: Point3Record;
  readonly projection?: ProjectionChoice;
}

function numberOf(expression: Expression, bindings: Bindings, what: string): number {
  const value = evaluate(expression, bindings);
  if (typeof value !== 'number') {
    throw new Error(`${what} is a number and was given ${typeof value === 'boolean' ? 'a true or false' : 'a point'}`);
  }
  return value;
}

/** A place in space read out of its three expressions. */
export function resolvePoint3(record: Point3Record, bindings: Bindings = {}, what = 'a place in space'): Vec3 {
  return vec3(
    numberOf(record.x, bindings, `the x of ${what}`),
    numberOf(record.y, bindings, `the y of ${what}`),
    numberOf(record.z, bindings, `the z of ${what}`)
  );
}

/** The camera a record describes, built at the time its expressions are read
 * for. */
export function resolveCamera(record: Camera3Record, bindings: Bindings = {}): Camera3 {
  return camera3({
    eye: resolvePoint3(record.eye, bindings, "a camera's eye"),
    target: resolvePoint3(record.target, bindings, "a camera's target"),
    up: record.up ? resolvePoint3(record.up, bindings, "a camera's up") : undefined,
    projection: record.projection ? resolveProjection(record.projection) : undefined,
  });
}
