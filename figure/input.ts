/**
 * An input is a track a reader may hold, taken by a press on one named mark.
 * Every function here is pure, and what is held between frames is the consumer's.
 */
import { mat3 } from '../values/mat3.js';
import type { Vec2 } from '../values/vec2.js';
import { touches } from './animation.js';
import { viewAt, type Figure, type TrackValues } from './figure.js';
import { flattenPath, flattenRuns, nearestEdge, windingAt } from './inside.js';
import type { Mark, PathMark } from './mark.js';

export interface Input {
  /** The track a reader holds while this input is taken. */
  track: string;
  /** The mark a press takes this input on, by id or the front of one. */
  mark: string;
  /** How far outside the mark a press may land and still take the input, in
   * figure units. Left out, it is 0. */
  reach?: number;
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
