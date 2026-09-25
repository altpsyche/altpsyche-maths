/**
 * An input is a track a reader may hold, taken by a press on one named mark.
 * Every function here is pure, and what is held between frames is the consumer's.
 */
import { mat3 } from '../values/mat3.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import { touches } from './animation.js';
import { viewAt, type Figure, type TrackValues } from './figure.js';
import { flattenPath, flattenRuns, nearestEdge, windingAt } from './inside.js';
import { fractionNearest } from './length.js';
import type { Mark, PathMark } from './mark.js';
import type { Path } from './path.js';

export interface Input {
  /** The track a reader holds while this input is taken. */
  track: string;
  /** The mark a press takes this input on, by id or the front of one. */
  mark: string;
  /** How a pointer moves the value while the input is taken. */
  motion: Motion;
  /** How far outside the mark a press may land and still take the input, in
   * figure units. Left out, it is 0. */
  reach?: number;
}

/**
 * How a pointer moves the value of a held track.
 *
 * `along` holds the fraction of a path's length at its point nearest the
 * pointer. `drag` holds the value at the press plus `rate` for each figure unit
 * the pointer has travelled in the direction `across`, which is x when left
 * out. `around` holds the value at the press plus `rate` for each turn the
 * pointer has swept anticlockwise about `centre`.
 */
export type Motion =
  | { kind: 'along'; path: Path }
  | { kind: 'drag'; rate: number; across?: Vec2 }
  | { kind: 'around'; rate: number; centre: Vec2 };

/** Where a press landed and the value the track read there. */
export interface Press {
  place: Vec2;
  value: number;
}

/** The value a pointer at a place holds its track at, for a press that was
 * taken at another. */
export function heldFrom(motion: Motion, press: Press, pointer: Vec2): number {
  if (motion.kind === 'along') return fractionNearest(motion.path, pointer);
  if (motion.kind === 'drag') {
    const travel = vec2.dot(vec2.sub(pointer, press.place), vec2.normalize(motion.across ?? { x: 1, y: 0 }));
    return press.value + motion.rate * travel;
  }
  const from = vec2.sub(press.place, motion.centre);
  const to = vec2.sub(pointer, motion.centre);
  // Sweep: atan2 of the cross and dot products is the signed angle between the two in (-π, π], so crossing the negative x axis adds no whole turn.
  const swept = Math.atan2(vec2.cross(from, to), vec2.dot(from, to));
  return press.value + (motion.rate * swept) / (2 * Math.PI);
}

/** The place in figure units that a pixel shows, through the inverse of the
 * matrix `viewAt` returns for the same time, surface and held values. */
export function placeAt(
  figure: Figure,
  seconds: number,
  width: number,
  height: number,
  pixel: Vec2,
  held?: TrackValues,
): Vec2 | undefined {
  const undo = mat3.invert(viewAt(figure, seconds, width, height, held));
  return undo && mat3.transformPoint(undo, pixel);
}

/** The input a press at a place takes. Marks are searched last drawn first, the
 * painter's algorithm read backwards, so the mark on top takes the press. */
export function inputAt(inputs: readonly Input[], marks: readonly Mark[], place: Vec2): Input | undefined {
  for (let at = marks.length - 1; at >= 0; at--) {
    const mark = marks[at];
    // A text mark has no path to measure a press against.
    if (mark.kind !== 'path') continue;
    const input = inputs.find((entry) => touches(mark.id, entry.mark));
    if (input && gapTo(mark, place) <= (input.reach ?? 0)) return input;
  }
  return undefined;
}

/** How far a place sits outside what a path mark paints, 0 where the mark paints
 * it. */
function gapTo(mark: PathMark, place: Vec2): number {
  let gap = Infinity;
  if (mark.fill) {
    const loops = flattenPath(mark.path);
    // Fill: the nonzero rule, the rule the mark is drawn under.
    if (windingAt(loops, place) !== 0) return 0;
    gap = nearestEdge(loops, place)?.gap ?? Infinity;
  }
  if (mark.stroke) {
    // Stroke: measured along the open runs, since closing an open curve adds an edge no stroke draws.
    const edge = nearestEdge(
      flattenRuns(mark.path).map(({ points }) => points),
      place,
    );
    const { width } = mark.stroke;
    const half = (typeof width === 'number' ? width : Math.max(width.from, width.to)) / 2;
    if (edge) gap = Math.min(gap, Math.max(0, edge.gap - half));
  }
  return gap;
}
