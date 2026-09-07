/**
 * A run of numbers from one bound to the other, and the arithmetic that reads
 * one against another.
 *
 * This is what a graph's own units are given in, and what a figure's units are
 * given in, so mapping a value from a graph onto a picture is one interval read
 * against another rather than four loose numbers passed around together.
 *
 * A bound above its partner is allowed everywhere here. An axis that counts down
 * the screen and a scale that reverses a direction are both an interval given
 * the other way round, and neither is a mistake to be corrected.
 */
import { clamp, lerp, remap as remapNumber } from './scalar.js';

export interface Interval {
  readonly from: number;
  readonly to: number;
}

function makeInterval(from: number, to: number): Interval {
  return { from, to };
}

/** How far the interval reaches, without a sign, so an interval given either way
 * round reports the same width. */
function span(interval: Interval): number {
  return Math.abs(interval.to - interval.from);
}

/** Both bounds counting as inside, whichever way round they were given. */
function holds(interval: Interval, value: number): boolean {
  const low = Math.min(interval.from, interval.to);
  const high = Math.max(interval.from, interval.to);
  return value >= low && value <= high;
}

/** The same two bounds with the lower one first, for anything that has to walk
 * from one end to the other and would otherwise step backwards. */
function ordered(interval: Interval): Interval {
  return interval.from <= interval.to ? interval : { from: interval.to, to: interval.from };
}

/** A fraction of the way along, and past either bound when the fraction is
 * outside zero to one. */
function at(interval: Interval, along: number): number {
  return lerp(interval.from, interval.to, along);
}

/** Held inside the two bounds, whichever way round they were given. */
function clampTo(interval: Interval, value: number): number {
  return clamp(value, interval.from, interval.to);
}

/**
 * The place a value holds in one interval, read at the same place in another.
 *
 * A source of no width has no place to read, so this hands back the target's
 * first bound rather than an infinity that then spreads through every coordinate
 * built on it.
 */
function remap(value: number, source: Interval, target: Interval): number {
  return remapNumber(value, source.from, source.to, target.from, target.to);
}

/**
 * The interval calls under one name, so a call site says which kind of thing it
 * is reading and an import line says what these operate on.
 *
 * The width is not called `length`: a function's own `length` is how many
 * arguments it takes, it is not writable, and assigning one throws.
 */
export const interval = Object.assign(makeInterval, {
  span,
  holds,
  ordered,
  at,
  clampTo,
  remap,
});
