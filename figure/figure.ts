/**
 * A picture over time, and the one call that reads it.
 *
 * `at` is the whole public surface of a figure. Ask it for four seconds and it
 * gives the picture at four seconds, whatever it gave before, so a page playing
 * forward, a reader dragging a scrub bar backwards and a recorder walking a fixed
 * step are three consumers of one answer rather than three implementations of it.
 *
 * Nothing here touches a screen. What comes back is a list of marks in the
 * figure's own units, and a painter decides what to do with them.
 */
import { sampleTracks, type TrackValue, type Tracks } from '../timing/track.js';
import { flatten, type Node } from './node.js';
import { outlinedMarks } from './outline.js';
import { Timeline } from './timeline.js';
import { resolveExtent, viewMatrix, type ExtentChoice, type Fit } from './extent.js';
import type { Mat3 } from '../values/mat3.js';
import type { Mark } from './mark.js';

/** The values a scene is rebuilt from, sampled out of the figure's tracks. This
 * is what lets geometry follow a number rather than only be moved about: a
 * radius that is keyed makes a circle that is genuinely a different circle each
 * frame. */
export type TrackValues = Record<string, TrackValue>;

export interface Figure {
  /** How much of the world the figure shows, in its own units. */
  extent: ExtentChoice;
  fit?: Fit;
  /** The tree, either fixed or rebuilt from the clock and the sampled values. */
  scene: Node | ((seconds: number, values: TrackValues) => Node);
  tracks?: Tracks;
  timeline?: Timeline;
  /** Overrides the timeline's own length, for a figure that should hold after
   * its last animation finishes. */
  duration?: number;
  /**
   * The one time a reader who asked for reduced motion is shown.
   *
   * Every figure names it, because the last frame is not always the one that
   * explains the most and a figure stopped at zero often explains nothing.
   */
  still: number;
  /** A figure that ends where it began, which a recording can loop without a
   * jump. Held by a test rather than taken on trust. */
  loop?: boolean;
}

export function durationOf(figure: Figure): number {
  return figure.duration ?? figure.timeline?.duration ?? 0;
}

/** The marks a figure shows at a time. */
export function marksAt(figure: Figure, seconds: number): readonly Mark[] {
  const values = figure.tracks ? sampleTracks(figure.tracks, seconds) : {};
  const tree = typeof figure.scene === 'function' ? figure.scene(seconds, values) : figure.scene;
  const marks = flatten(tree);
  const played = figure.timeline ? figure.timeline.at(marks, seconds) : marks;
  // The outline is taken after the timeline has run, so an animation that trims a
  // path trims the centreline and the outline follows it rather than being opened
  // up along one side.
  return outlinedMarks(played);
}

/**
 * The matrix a painter needs at a time, in one call.
 *
 * A figure whose extent is a function of the clock has to be asked for its
 * extent at the same time its marks were asked for, and a consumer writing that
 * as two calls has two chances to pass different times. What the painter is
 * handed is the matrix, so the extent and the centring stay in here.
 *
 * The extent the figure declares is the base the timeline's view entries are
 * folded over rather than the answer, so a declared extent chosen from the shape
 * of the surface still chooses under a view that moves.
 */
export function viewAt(figure: Figure, seconds: number, width: number, height: number): Mat3 {
  const declared = resolveExtent(figure.extent, width / height, seconds);
  if (!figure.timeline) return viewMatrix(declared, figure.fit ?? 'contain', width, height);
  // The marks are built at most once and only if a view entry asks for them, so
  // a figure whose view follows nothing pays nothing for one that does.
  let built: readonly Mark[] | undefined;
  const extent = figure.timeline.extentAt(declared, seconds, () => (built ??= marksAt(figure, seconds)));
  return viewMatrix(extent, figure.fit ?? 'contain', width, height);
}

/** Whether a figure declaring itself a loop actually is one, which is the gate
 * behind that flag. The comparison is by tolerance rather than exactly, because
 * the sine and cosine a figure is built from are not specified to the last bit
 * and differ between engines. */
export function isLoop(figure: Figure, tolerance = 1e-6): boolean {
  const start = marksAt(figure, 0);
  const end = marksAt(figure, durationOf(figure));
  return sameMarks(start, end, tolerance);
}

/** Two lists holding the same marks in the same order, to a tolerance. */
export function sameMarks(one: readonly Mark[], two: readonly Mark[], tolerance = 1e-6): boolean {
  if (one.length !== two.length) return false;
  return one.every((mark, at) => sameMark(mark, two[at], tolerance));
}

function close(a: number | undefined, b: number | undefined, tolerance: number): boolean {
  return Math.abs((a ?? 1) - (b ?? 1)) <= tolerance;
}

function sameMark(one: Mark, two: Mark, tolerance: number): boolean {
  if (one.kind !== two.kind || one.id !== two.id) return false;
  if (!close(one.opacity, two.opacity, tolerance)) return false;
  if (one.kind === 'text' && two.kind === 'text') {
    return (
      one.text === two.text &&
      Math.abs(one.at.x - two.at.x) <= tolerance &&
      Math.abs(one.at.y - two.at.y) <= tolerance &&
      Math.abs(one.size - two.size) <= tolerance
    );
  }
  if (one.kind !== 'path' || two.kind !== 'path') return false;
  if (one.path.length !== two.path.length) return false;
  return one.path.every((subpath, index) => {
    const other = two.path[index];
    if (subpath.curves.length !== other.curves.length) return false;
    if (Math.abs(subpath.start.x - other.start.x) > tolerance) return false;
    if (Math.abs(subpath.start.y - other.start.y) > tolerance) return false;
    return subpath.curves.every((curve, piece) => {
      const twin = other.curves[piece];
      return (
        Math.abs(curve.control1.x - twin.control1.x) <= tolerance &&
        Math.abs(curve.control1.y - twin.control1.y) <= tolerance &&
        Math.abs(curve.control2.x - twin.control2.x) <= tolerance &&
        Math.abs(curve.control2.y - twin.control2.y) <= tolerance &&
        Math.abs(curve.to.x - twin.to.x) <= tolerance &&
        Math.abs(curve.to.y - twin.to.y) <= tolerance
      );
    });
  });
}
