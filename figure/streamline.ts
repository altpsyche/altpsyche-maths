/**
 * The path a point follows through a field of vectors, walked by Runge-Kutta 4.
 *
 * The points come back in graph units and nothing here draws them, the way the
 * curve where a plane cuts a surface comes back as points in space. What a
 * figure does with them is its own.
 *
 * The step is a distance rather than a time, so the field is read as a
 * direction and its magnitude decides nothing about how far the run moves. A
 * step in the field's own time crowds the points where the field is weak and
 * spreads them where it is strong, and a curve drawn from those is faceted
 * exactly where it turns hardest.
 *
 * The step is fixed and never adaptive. An adaptive step hands back a different
 * number of points as the field changes, which is a count no gate can hold and
 * a path no morph can pair up against another.
 */
import { interval, type Interval } from '../values/interval.js';
import { vec2, type Vec2 } from '../values/vec2.js';

export interface StreamlineOptions {
  /** How far each step moves, in graph units. */
  step: number;
  /** How many steps the run takes at most, in each direction it is run. */
  steps?: number;
  /** The region the run is held inside. It has no edges where this is left out,
   * and only the step cap and a vanishing field stop it. */
  within?: { x: Interval; y: Interval };
  /** Which way the run goes from its seed. Both puts the backward half first,
   * so the points read from one end of the curve to the other. */
  direction?: 'forward' | 'backward' | 'both';
  /** The magnitude below which the field is taken to have vanished, in graph
   * units. */
  least?: number;
}

const STEPS = 200;
const LEAST = 1e-9;

function holds(within: { x: Interval; y: Interval } | undefined, at: Vec2): boolean {
  if (!Number.isFinite(at.x) || !Number.isFinite(at.y)) return false;
  if (!within) return true;
  return interval.holds(interval.ordered(within.x), at.x) && interval.holds(interval.ordered(within.y), at.y);
}

/**
 * One run from the seed, as the points after it, with the seed left out so the
 * two directions can be joined without repeating it.
 *
 * A stage whose field has vanished stops the run there rather than being taken
 * as a direction, since dividing by a magnitude near nothing turns rounding
 * error into a direction of its own.
 */
function run(
  of: (at: Vec2) => Vec2,
  from: Vec2,
  step: number,
  steps: number,
  within: { x: Interval; y: Interval } | undefined,
  least: number
): Vec2[] {
  const direction = (at: Vec2): Vec2 | undefined => {
    const vector = of(at);
    const magnitude = Math.hypot(vector.x, vector.y);
    if (!Number.isFinite(magnitude) || magnitude <= least) return undefined;
    return vec2(vector.x / magnitude, vector.y / magnitude);
  };

  const points: Vec2[] = [];
  let at = from;
  for (let taken = 0; taken < steps; taken += 1) {
    const first = direction(at);
    if (!first) break;
    const second = direction(vec2.add(at, vec2.scale(first, step / 2)));
    if (!second) break;
    const third = direction(vec2.add(at, vec2.scale(second, step / 2)));
    if (!third) break;
    const fourth = direction(vec2.add(at, vec2.scale(third, step)));
    if (!fourth) break;

    const along = vec2(
      (first.x + 2 * second.x + 2 * third.x + fourth.x) / 6,
      (first.y + 2 * second.y + 2 * third.y + fourth.y) / 6
    );
    const next = vec2.add(at, vec2.scale(along, step));
    if (!holds(within, next)) break;
    points.push(next);
    at = next;
  }
  return points;
}

/**
 * The streamline of a field through a seed point, in graph units.
 *
 * The run stops on one of three rules: it leaves the region, it reaches its step
 * cap, or the field where it stands is too small to point anywhere. A seed
 * outside the region comes back as that seed alone, which is a curve with
 * nothing to draw rather than a run that starts by escaping.
 *
 * A run that leaves the region stops at the last point inside it and is not cut
 * at the edge, so it ends within one step of the boundary.
 */
export function streamlineOf(of: (at: Vec2) => Vec2, from: Vec2, options: StreamlineOptions): Vec2[] {
  const steps = Math.max(0, Math.round(options.steps ?? STEPS));
  const least = options.least ?? LEAST;
  const direction = options.direction ?? 'forward';
  if (!holds(options.within, from)) return [from];

  const forward =
    direction === 'backward' ? [] : run(of, from, options.step, steps, options.within, least);
  if (direction === 'forward') return [from, ...forward];

  const back = (at: Vec2) => {
    const vector = of(at);
    return vec2(-vector.x, -vector.y);
  };
  const backward = run(back, from, options.step, steps, options.within, least);
  return [...backward.reverse(), from, ...forward];
}
