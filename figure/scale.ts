/**
 * The mapping from the numbers on an axis to places in a figure.
 *
 * A scale is two intervals: the run of numbers a graph counts through, and where
 * that run lands in the figure's own units. Two of them together turn a pair of
 * graph numbers into a point.
 *
 * The mapping is a value a caller holds rather than something read back out of a
 * drawn group. Axes draw two lines and a plotted curve needs the mapping, so a
 * curve drawn over axes that were never drawn has to work.
 */
import { interval, type Interval } from '../values/interval.js';
import { vec2, type Vec2 } from '../values/vec2.js';

export interface Scale {
  /** The numbers the axis counts through. */
  readonly graph: Interval;
  /** Where those numbers land, in the figure's own units. */
  readonly units: Interval;
}

export function scaleOf(graph: Interval, units: Interval): Scale {
  return { graph, units };
}

/** A number on the axis, as a place in the figure's own units. */
export function toUnits(scale: Scale, value: number): number {
  return interval.remap(value, scale.graph, scale.units);
}

/** A place in the figure's own units, as a number on the axis, which is what a
 * reader pointing at the picture is asking for. */
export function toGraph(scale: Scale, place: number): number {
  return interval.remap(place, scale.units, scale.graph);
}

export interface Coords {
  readonly x: Scale;
  readonly y: Scale;
}

export function coordsOf(x: Scale, y: Scale): Coords {
  return { x, y };
}

/** A pair of graph numbers as a point in the figure's own units. */
export function pointOf(coords: Coords, x: number, y: number): Vec2 {
  return vec2(toUnits(coords.x, x), toUnits(coords.y, y));
}
