/**
 * The three readings a stroke's width has, now that it may be a taper rather
 * than one number.
 *
 * A caller that needs a number has to say which number it needs, because a
 * taper has a different one at every point along the length. The width at a
 * place is what the outline is built from, the widest is what a part measured
 * against the line reads, and a scaled width is what a group's transform leaves
 * behind.
 */
import { curveNamed } from '../values/ease.js';
import { clamp, lerp } from '../values/scalar.js';
import type { Width } from './mark.js';

/** The width a stroke has a fraction of the way along its length, which for one
 * number is that number wherever it is read. */
export function widthAt(width: Width, along: number): number {
  if (typeof width === 'number') return width;
  return lerp(width.from, width.to, curveNamed(width.curve ?? 'linear')(clamp(along, 0, 1)));
}

/**
 * The widest a stroke gets, which is the number a caller that has to pick one
 * reads.
 *
 * A tick standing on an axis is measured against the line it stands on, and a
 * line that thins to nothing at one end still reads as the weight it has where
 * it is drawn at all.
 */
export function widestWidth(width: Width): number {
  return typeof width === 'number' ? width : Math.max(width.from, width.to);
}

/** A width through a scale, which is how a group that makes everything bigger
 * makes the lines inside it thicker. Both ends of a taper take the factor. */
export function scaledWidth(width: Width, factor: number): Width {
  if (typeof width === 'number') return width * factor;
  return { ...width, from: width.from * factor, to: width.to * factor };
}
