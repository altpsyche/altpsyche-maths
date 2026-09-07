/**
 * The curve where a plane cuts a surface, found on the grid the surface is
 * already drawn from.
 *
 * This is marching squares, with the plane's signed distance as the value at each
 * grid point. A crossing point is found by walking along a cell edge to where
 * that distance reaches nothing, and because signed distance to a plane changes
 * evenly along a straight line, every point this finds lies on the plane exactly.
 * It lies on the chord between two samples of the surface rather than on the
 * surface itself, which is the whole of the error and is why halving the cell
 * size quarters it.
 */
import { interval, type Interval } from '../values/interval.js';
import { vec3, type Vec3 } from '../values/vec3.js';
import { TOLERANCE } from './tolerance.js';

export interface Plane {
  /** A point the plane passes through. */
  point: Vec3;
  /** Which way the plane faces. Its length does not matter. */
  normal: Vec3;
}

export interface SectionOptions {
  u?: Interval;
  v?: Interval;
  resolution?: number | { u: number; v: number };
  /** How close two ends come before they are read as the same place. */
  tolerance?: number;
}

/** Which edge of a cell each pair of corners is, going round from the corner at
 * the low end of both parameters. */
const EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
] as const;

function keyFor(i: number, j: number, edge: number): string {
  if (edge === 0) return `h${i},${j}`;
  if (edge === 1) return `v${i + 1},${j}`;
  if (edge === 2) return `h${i},${j + 1}`;
  return `v${i},${j}`;
}

/**
 * The chains a set of segments makes, each walked from one loose end to the other
 * and then round whatever loops are left.
 */
function chainsOf(segments: readonly (readonly [number, number])[], count: number): number[][] {
  const next = new Map<number, number[]>();
  for (const [from, to] of segments) {
    if (!next.has(from)) next.set(from, []);
    if (!next.has(to)) next.set(to, []);
    next.get(from)!.push(to);
    next.get(to)!.push(from);
  }

  const used = segments.map(() => false);
  const at = new Map<number, number[]>();
  segments.forEach(([from, to], index) => {
    if (!at.has(from)) at.set(from, []);
    if (!at.has(to)) at.set(to, []);
    at.get(from)!.push(index);
    at.get(to)!.push(index);
  });

  const walkFrom = (start: number): number[] => {
    const chain = [start];
    let here = start;
    for (;;) {
      const step = (at.get(here) ?? []).find((index) => !used[index]);
      if (step === undefined) return chain;
      used[step] = true;
      const [from, to] = segments[step];
      here = from === here ? to : from;
      chain.push(here);
    }
  };

  const chains: number[][] = [];
  // Loose ends first, so a chain that runs off the edge of the grid is walked
  // from its end rather than being started in the middle and coming out as two.
  for (let point = 0; point < count; point += 1) {
    if ((next.get(point)?.length ?? 0) === 1) {
      const chain = walkFrom(point);
      if (chain.length > 1) chains.push(chain);
    }
  }
  for (let index = 0; index < segments.length; index += 1) {
    if (used[index]) continue;
    const chain = walkFrom(segments[index][0]);
    if (chain.length > 1) chains.push(chain);
  }
  return chains;
}

/** Chains whose ends meet joined into one, which is what closes a curve that the
 * grid split at the seam where a parameter wraps round. */
function joinEnds(runs: Vec3[][], tolerance: number): Vec3[][] {
  const meets = (a: Vec3, b: Vec3) => vec3.magnitude(vec3.sub(a, b)) <= tolerance;
  const open = runs.slice();
  const done: Vec3[][] = [];

  while (open.length > 0) {
    let run = open.shift()!;
    for (;;) {
      if (run.length > 2 && meets(run[0], run[run.length - 1])) break;
      const found = open.findIndex(
        (other) =>
          meets(run[run.length - 1], other[0]) ||
          meets(run[run.length - 1], other[other.length - 1]) ||
          meets(run[0], other[0]) ||
          meets(run[0], other[other.length - 1]),
      );
      if (found === -1) break;
      const other = open.splice(found, 1)[0];
      if (meets(run[run.length - 1], other[0])) run = [...run, ...other.slice(1)];
      else if (meets(run[run.length - 1], other[other.length - 1])) run = [...run, ...other.slice(0, -1).reverse()];
      else if (meets(run[0], other[other.length - 1])) run = [...other.slice(0, -1), ...run];
      else run = [...other.slice(1).reverse(), ...run];
    }
    // A run whose two ends meet is given its first point again, so a caller draws
    // a loop by drawing the points it is handed and needs no flag.
    if (run.length > 2 && meets(run[0], run[run.length - 1])) run = [...run.slice(0, -1), run[0]];
    done.push(run);
  }
  return done;
}

/**
 * The runs of points where a plane cuts a surface, in space.
 *
 * A run whose two ends meet comes back with its first point repeated at the end,
 * so drawing the points as they are given draws the loop closed.
 */
export function sectionOf(
  of: (u: number, v: number) => Vec3,
  plane: Plane,
  options: SectionOptions = {},
): Vec3[][] {
  const { u = interval(0, 1), v = interval(0, 1), resolution = 24, tolerance = TOLERANCE } = options;
  const steps = typeof resolution === 'number' ? { u: resolution, v: resolution } : resolution;
  const facing = vec3.normalize(plane.normal);

  const sample: Vec3[][] = [];
  const gap: number[][] = [];
  for (let i = 0; i <= steps.u; i += 1) {
    sample.push([]);
    gap.push([]);
    for (let j = 0; j <= steps.v; j += 1) {
      const point = of(interval.at(u, i / steps.u), interval.at(v, j / steps.v));
      sample[i].push(point);
      gap[i].push(vec3.dot(facing, vec3.sub(point, plane.point)));
    }
  }

  const points: Vec3[] = [];
  const found = new Map<string, number>();
  const segments: [number, number][] = [];

  for (let i = 0; i < steps.u; i += 1) {
    for (let j = 0; j < steps.v; j += 1) {
      const corners = [sample[i][j], sample[i + 1][j], sample[i + 1][j + 1], sample[i][j + 1]];
      const gaps = [gap[i][j], gap[i + 1][j], gap[i + 1][j + 1], gap[i][j + 1]];

      const crossed: number[] = [];
      for (let edge = 0; edge < 4; edge += 1) {
        const [from, to] = EDGES[edge];
        if (gaps[from] >= 0 === gaps[to] >= 0) continue;
        const key = keyFor(i, j, edge);
        let index = found.get(key);
        if (index === undefined) {
          const along = gaps[from] / (gaps[from] - gaps[to]);
          index = points.push(vec3.lerp(corners[from], corners[to], along)) - 1;
          found.set(key, index);
        }
        crossed.push(edge);
      }

      if (crossed.length === 2) {
        segments.push([found.get(keyFor(i, j, crossed[0]))!, found.get(keyFor(i, j, crossed[1]))!]);
        continue;
      }
      if (crossed.length !== 4) continue;
      // A cell whose corners alternate in sign has two ways to be joined and the
      // grid cannot tell them apart. The middle of the cell decides: the pair of
      // corners it agrees with is the pair the curve runs around.
      const middle = (gaps[0] + gaps[1] + gaps[2] + gaps[3]) / 4;
      const pairs = middle >= 0 === gaps[0] >= 0 ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]];
      for (const [first, second] of pairs) {
        segments.push([found.get(keyFor(i, j, first))!, found.get(keyFor(i, j, second))!]);
      }
    }
  }

  const runs = chainsOf(segments, points.length).map((chain) => chain.map((index) => points[index]));
  return joinEnds(runs, tolerance);
}
