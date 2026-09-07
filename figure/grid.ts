/**
 * The sampling a surface and a section share: how many steps a resolution asks
 * for, and where the corners of that grid land.
 *
 * A cell reads its four corners out of the grid rather than working each of them
 * out again. Four cells meet at every inside corner, so computing them per cell
 * asks the surface for the same point four times, and the surface is the
 * caller's own function with no promise about what it costs.
 */
import { interval, type Interval } from '../values/interval.js';
import type { Vec3 } from '../values/vec3.js';

/** A resolution given as one number is that many steps along every named way. */
export function stepsOf<K extends string>(
  resolution: number | Record<K, number>,
  ...ways: readonly K[]
): Record<K, number> {
  if (typeof resolution !== 'number') return resolution;
  const steps = {} as Record<K, number>;
  for (const way of ways) steps[way] = resolution;
  return steps;
}

/** The corners of a grid over a surface, taking both edges of each run, so a
 * grid of n by m cells is n + 1 by m + 1 corners. */
export function cornersOf(
  of: (u: number, v: number) => Vec3,
  u: Interval,
  v: Interval,
  steps: { u: number; v: number }
): Vec3[][] {
  const grid: Vec3[][] = [];
  for (let i = 0; i <= steps.u; i += 1) {
    const column: Vec3[] = [];
    for (let j = 0; j <= steps.v; j += 1) {
      column.push(of(interval.at(u, i / steps.u), interval.at(v, j / steps.v)));
    }
    grid.push(column);
  }
  return grid;
}
