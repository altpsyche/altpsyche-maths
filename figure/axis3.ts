/**
 * Three number lines in space, with a tick at each of their numbers and the
 * numbers written beside them.
 *
 * A tick reaches along the next axis round, x along y, y along z and z along x,
 * so every tick lies in a plane the axis is part of and no tick needs the camera
 * to decide which way to point. A label is flat text at the projected tick,
 * standing off it in the direction that leads away from the projected origin, so
 * labels fall outside the picture at every pose rather than over it.
 */
import { interval, type Interval } from '../values/interval.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import { vec3, type Vec3 } from '../values/vec3.js';
import { group, type GroupNode, type Node } from './node.js';
import { ticksOn } from './ticks.js';
import { polyline3, text3 } from './space.js';
import type { Camera3 } from './camera.js';
import { widestWidth } from './width.js';
import type { Fill, Stroke } from './mark.js';

export interface Axes3Options {
  /** The run of each axis in world units, minus one to one unless named. */
  x?: Interval;
  y?: Interval;
  z?: Interval;
  /** The lines and their ticks. */
  stroke: Stroke;
  /** The labels. Nothing is written where this is missing. */
  fill?: Fill;
  /** How big the labels are, in figure units. Nothing is written where this is
   * missing. */
  size?: number;
  /** About how many ticks are wanted on each axis. The step is a round number,
   * so the count that comes back is near this rather than equal to it. */
  ticks?: number;
  /** How far a tick reaches across its axis in world units, half either side. */
  tickLength?: number;
  /** From the projected tick to the label's own anchor, in figure units. */
  gap?: number;
  /** What each axis is called, written past its far end. An axis this does not
   * name carries no name, and nothing is written at all without a `fill` and a
   * `size`. */
  names?: { x?: string; y?: string; z?: string };
  family?: string;
  weight?: number;
}

const ALONG: Record<'x' | 'y' | 'z', Vec3> = {
  x: vec3(1, 0, 0),
  y: vec3(0, 1, 0),
  z: vec3(0, 0, 1),
};

const ACROSS: Record<'x' | 'y' | 'z', Vec3> = { x: ALONG.y, y: ALONG.z, z: ALONG.x };

/** Which way a label leans away from where the three lines cross, or straight
 * down where the tick lands on that crossing and there is no direction to lean
 * in. */
function leaning(from: Vec2, to: Vec2, gap: number): Vec2 {
  const away = vec2.sub(to, from);
  if (vec2.magnitude(away) < 1e-12) return vec2(0, -gap);
  return vec2.scale(vec2.normalize(away), gap);
}

function oneAxis(which: 'x' | 'y' | 'z', bounds: Interval, camera: Camera3, options: Axes3Options): GroupNode {
  const along = ALONG[which];
  const across = ACROSS[which];
  const size = options.size ?? 0;
  const tickLength = options.tickLength ?? widestWidth(options.stroke.width) * 8;
  const gap = options.gap ?? size * 0.35;
  const { from: low, to: high } = interval.ordered(bounds);
  const at = (value: number) => vec3.scale(along, value);
  const marked = ticksOn(bounds, options.ticks);
  const half = tickLength / 2;
  const origin = camera.project(vec3.ZERO).at;

  const parts: Node[] = [polyline3('line', [at(low), at(high)], camera, { stroke: options.stroke })];

  parts.push(
    group(
      'ticks',
      marked.map((tick) =>
        polyline3(
          tick.label,
          [vec3.sub(at(tick.value), vec3.scale(across, half)), vec3.add(at(tick.value), vec3.scale(across, half))],
          camera,
          { stroke: options.stroke },
        ),
      ),
    ),
  );

  const name = options.names?.[which];
  if (options.fill && size > 0 && name !== undefined) {
    // Set beyond the label of the last tick, which stands at the same point and
    // leans the same way, so the two would be written over each other.
    parts.push(
      text3('name', at(high), name, size, camera, {
        fill: options.fill,
        family: options.family,
        weight: options.weight,
        align: 'middle',
        baseline: 'middle',
        offset: leaning(origin, camera.project(at(high)).at, gap + size),
      }),
    );
  }

  if (options.fill && size > 0) {
    // The three lines cross at the origin, so only one of them writes the number
    // there and the other two would write it again in the same place.
    const written = marked.filter((tick) => which === 'x' || tick.value !== 0);
    parts.push(
      group(
        'labels',
        written.map((tick) =>
          text3(tick.label, at(tick.value), tick.label, size, camera, {
            fill: options.fill,
            family: options.family,
            weight: options.weight,
            align: 'middle',
            baseline: 'middle',
            offset: leaning(origin, camera.project(at(tick.value)).at, gap),
          }),
        ),
      ),
    );
  }

  return group(which, parts);
}

/**
 * The three axes as a group, one child per axis, each holding its line under
 * `line`, its ticks under `ticks` and its labels under `labels`.
 *
 * Each tick and each label is named after the number it shows rather than by its
 * place in the list, so an animation naming a tick follows that number when the
 * axes are rebuilt over a different range.
 */
export function axes3(name: string, camera: Camera3, options: Axes3Options): GroupNode {
  const span = interval(-1, 1);
  return group(name, [
    oneAxis('x', options.x ?? span, camera, options),
    oneAxis('y', options.y ?? span, camera, options),
    oneAxis('z', options.z ?? span, camera, options),
  ]);
}
