/**
 * The one-dimensional arithmetic everything else here is built out of.
 *
 * These take and return plain numbers so that a vector, a colour channel and a
 * uniform can all be walked by the same four lines rather than by three copies
 * of them.
 */

/** Held inside the two bounds, whichever way round they are given. */
export function clamp(value: number, low: number, high: number): number {
  return low < high ? Math.min(Math.max(value, low), high) : Math.min(Math.max(value, high), low);
}

/** Part way from one number to another, and past either end when `along` is
 * outside zero to one. */
export function lerp(from: number, to: number, along: number): number {
  return from + (to - from) * along;
}

/**
 * How far along the span a value sits, which is `lerp` read backwards.
 *
 * A span of no width has no answer, so it reports the start rather than
 * dividing by zero and handing back an infinity that spreads.
 */
export function inverseLerp(from: number, to: number, value: number): number {
  if (from === to) return 0;
  return (value - from) / (to - from);
}

/** The same position in a second span as it held in the first. */
export function remap(value: number, fromLow: number, fromHigh: number, toLow: number, toHigh: number): number {
  return lerp(toLow, toHigh, inverseLerp(fromLow, fromHigh, value));
}
