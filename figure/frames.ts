/**
 * A figure walked at a fixed step, a frame at a time.
 *
 * A frame is the marks and the view read at one time, returned together. A
 * consumer that asked for them separately makes two calls it can pass different
 * times, and a figure whose view moves then paints its marks through the matrix
 * of some other moment.
 *
 * Frames are returned one at a time rather than as a list. A ten second figure at
 * sixty frames a second is six hundred frames of every mark it draws, and a
 * recorder encodes a frame and throws it away.
 */
import { marksAt, durationOf, figureTime, viewAt, type Figure } from './figure.js';
import type { Mark } from './mark.js';
import type { Transform2D } from '../values/mat3.js';

export interface Frame {
  /** Its place in the walk, counting from nothing. */
  index: number;
  /** The time it was read at, in seconds. */
  seconds: number;
  marks: readonly Mark[];
  /** The matrix a painter needs for these marks, built at this frame's own
   * time. */
  view: Transform2D;
}

/**
 * How the walk is stepped, as a rate or as a count.
 *
 * The two are different questions. A recorder is given the frame rate and needs a
 * step of exactly one over that rate, or the encoded video drifts from
 * the figure's own clock. A strip is given the count of pictures that fit
 * across a page and needs them spread over the whole figure.
 */
export type FrameStep = ({ fps: number; frames?: never } | { frames: number; fps?: never }) & {
  /** How long the walk runs for, where that is not the figure's own length. A
   * walk past the end of a figure that declares itself a loop goes round again,
   * and one past the end of a figure that does not holds its last picture. */
  seconds?: number;
};

export type FramesOptions = FrameStep & {
  /** The surface the view is built for, in whatever units a painter counts in. */
  width: number;
  height: number;
};

/**
 * The times a walk over a span of seconds reads, with no figure behind it.
 *
 * A walk stops strictly before the end of its span. The frame at the end of a
 * span that loops is its own first frame, and a recording would show it twice.
 * A span of nothing is one frame, since a picture that never moves still has a
 * picture.
 */
export function walkTimesOf(step: FrameStep & { seconds: number }): number[] {
  const count =
    step.fps === undefined
      ? Math.max(1, Math.round(step.frames))
      : Math.max(1, Math.round(step.seconds * step.fps));
  const gap = step.fps === undefined ? step.seconds / count : 1 / step.fps;
  return Array.from({ length: count }, (_, index) => index * gap);
}

/**
 * The times a walk over a figure reads, which a recorder needs before it has
 * drawn anything to say how far along it is.
 */
export function frameTimesOf(figure: Figure, step: FrameStep): number[] {
  return walkTimesOf({ ...step, seconds: step.seconds ?? durationOf(figure) });
}

/** A figure walked at a fixed step, a frame at a time. */
export function* framesOf(figure: Figure, options: FramesOptions): Generator<Frame> {
  const times = frameTimesOf(figure, options as FrameStep);
  for (let index = 0; index < times.length; index += 1) {
    const seconds = times[index];
    // A walk no longer than the figure reads the time it is at, since the figure's
    // own time and the walk's are the same number before the end.
    const inside = figureTime(figure, seconds);
    yield {
      index,
      seconds,
      marks: marksAt(figure, inside, options.width / options.height),
      view: viewAt(figure, inside, options.width, options.height),
    };
  }
}
