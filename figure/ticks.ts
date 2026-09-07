/**
 * Where the marks along an axis go, and what is written under each one.
 *
 * A reader adds up an axis in their head, so the steps between its ticks have to
 * be numbers a head adds: one, two or five times a power of ten. That is the
 * whole of the choice here, and the rest of this file is walking the interval in
 * those steps and writing each one down without floating point noise in it.
 */
import { interval as intervalOf, type Interval } from '../values/interval.js';

export interface Tick {
  /** In the graph's own units, rounded to the decimals its own label shows, so
   * the number drawn and the number placed are the same number. */
  readonly value: number;
  readonly label: string;
}

/**
 * The nearest one, two, five or ten times a power of ten, which is Heckbert's
 * nice numbers from Graphics Gems.
 *
 * Rounding up gives a step that never asks for more ticks than were wanted;
 * rounding to nearest gives the count closest to it, which is what an axis
 * wants because a step slightly too small crowds the labels.
 */
function niceNumber(value: number, toNearest: boolean): number {
  const power = Math.floor(Math.log10(value));
  const decade = 10 ** power;
  const leading = value / decade;
  const nice = toNearest
    ? leading < 1.5
      ? 1
      : leading < 3
        ? 2
        : leading < 7
          ? 5
          : 10
    : leading <= 1
      ? 1
      : leading <= 2
        ? 2
        : leading <= 5
          ? 5
          : 10;
  return nice * decade;
}

/**
 * The gap between one tick and the next for an interval that wants about this
 * many of them.
 *
 * The published version rounds the whole span before dividing it, which suits a
 * graph free to move its own bounds outward to the next nice number. An axis
 * here is given its bounds and keeps them, so the span is divided as it stands:
 * over eight ranges that turned a worst count error of four ticks into one.
 */
export function tickStep(bounds: Interval, about = 6): number {
  const span = intervalOf.span(bounds);
  if (!Number.isFinite(span) || span === 0) return 0;
  return niceNumber(span / Math.max(1, Math.round(about) - 1), true);
}

/**
 * A tick's value written out, with as many decimals as its step needs and no
 * more.
 *
 * A step of a fifth reaches three fifths as 0.6000000000000001, and printing the
 * number as it stands puts that in the picture. The decimal count comes from the
 * step rather than from the value, so every label along one axis is written to
 * the same width.
 */
export function labelFor(value: number, step: number): string {
  const decimals = step > 0 ? Math.max(0, -Math.floor(Math.log10(step))) : 0;
  const written = value.toFixed(decimals);
  // A value a hair below zero rounds to a signed zero, which prints its minus.
  return Number(written) === 0 ? (0).toFixed(decimals) : written;
}

/** How far past a bound a value may sit and still count as on it, against the
 * step, so a tick landing on its own end is not lost to a rounding error. */
const ON_THE_BOUND = 1e-9;

/**
 * Every multiple of the step inside the interval, from its lower bound upward,
 * whichever way round the interval was given.
 *
 * The values are counted as multiples rather than reached by adding the step
 * over and over, because the additions drift and the last one then misses the
 * bound it sits on.
 */
export function multiplesOn(bounds: Interval, step: number): readonly number[] {
  if (!(step > 0)) return [];
  const { from, to } = intervalOf.ordered(bounds);
  const slack = step * ON_THE_BOUND;
  const values: number[] = [];
  for (let count = Math.ceil(from / step - ON_THE_BOUND); count * step <= to + slack; count++) {
    // Twelve digits drops the noise the multiplication leaves in the last few
    // and shifts no value a step of any size could land on.
    values.push(Number((count * step).toPrecision(12)));
  }
  return values;
}

/** Every tick inside the interval, with the number each one shows. */
export function ticksOn(bounds: Interval, about = 6): readonly Tick[] {
  const step = tickStep(bounds, about);
  return multiplesOn(bounds, step).map((value) => ({ value, label: labelFor(value, step) }));
}
