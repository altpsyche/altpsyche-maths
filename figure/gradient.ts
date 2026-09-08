/**
 * A gradient's axis carried through a transform.
 *
 * The two ends of the axis are points in the mark's own units, so a group that
 * moves, turns or scales its children has to move them the way it moves the
 * geometry. A gradient left where it was typed would stay put while the shape it
 * fills slid out from under it.
 */
import { mat3, type Mat3 } from '../values/mat3.js';
import type { Fill, Gradient } from './mark.js';

/** A gradient's two ends through a transform, its stops untouched, since a stop
 * is a share of the axis rather than a place. */
export function transformGradient(gradient: Gradient, m: Mat3): Gradient {
  return {
    ...gradient,
    from: mat3.transformPoint(m, gradient.from),
    to: mat3.transformPoint(m, gradient.to),
  };
}

/** A fill through a transform, which is its gradient's axis and nothing else. A
 * fill of one colour is handed back as it stands. */
export function transformFill(fill: Fill, m: Mat3): Fill {
  if (!fill.gradient) return fill;
  return { ...fill, gradient: transformGradient(fill.gradient, m) };
}
