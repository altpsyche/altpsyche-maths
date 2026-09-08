/**
 * A figure walked at a fixed step, a frame at a time.
 *
 * A frame is the marks and the view read at one time, handed over together. A
 * consumer that asked for them separately holds two calls it can pass different
 * times, and a figure whose view moves then paints its marks through the matrix
 * of some other moment.
 *
 * Frames come back one at a time rather than as a list. A ten second figure at
 * sixty frames a second is six hundred frames of every mark it draws, and a
 * recorder encodes a frame and throws it away.
 */
import { marksAt, durationOf, viewAt, type Figure } from './figure.js';
import type { Mark } from './mark.js';
import type { Mat3 } from '../values/mat3.js';

export interface Frame {
  /** Its place in the walk, counting from nothing. */
  index: number;
  /** The time it was read at, in seconds. */
  seconds: number;
  marks: readonly Mark[];
  /** The matrix a painter needs for these marks, built at this frame's own
   * time. */
  view: Mat3;
}

/**
 * How the walk is stepped, as a rate or as a count.
 *
 * The two are different questions. A recorder knows how fast the frames play and
 * needs a step of exactly one over that, or the encoded video drifts from the
 * figure's own clock. A strip knows how many pictures fit across a page and wants
 * them spread over the whole figure.
 */
export type FrameStep = { fps: number; frames?: never } | { frames: number; fps?: never };

export type FramesOptions = FrameStep & {
  /** The surface the view is built for, in whatever units a painter counts in. */
  width: number;
  height: number;
};

/**
 * The times a walk reads, which a recorder needs before it has drawn anything to
 * say how far along it is.
 *
 * A walk stops strictly before the duration. The frame at the duration of a
 * figure that loops is its own first frame, and a recording would show it twice.
 * A figure with no duration is one frame, since a picture that never moves still
 * has a picture.
 */
export function frameTimesOf(figure: Figure, step: FrameStep): number[] {
  const duration = durationOf(figure);
  const count =
    step.fps === undefined
      ? Math.max(1, Math.round(step.frames))
      : Math.max(1, Math.round(duration * step.fps));
  const gap = step.fps === undefined ? duration / count : 1 / step.fps;
  return Array.from({ length: count }, (_, index) => index * gap);
}

/** A figure walked at a fixed step, a frame at a time. */
export function* framesOf(figure: Figure, options: FramesOptions): Generator<Frame> {
  const times = frameTimesOf(figure, options as FrameStep);
  for (let index = 0; index < times.length; index += 1) {
    const seconds = times[index];
    yield {
      index,
      seconds,
      marks: marksAt(figure, seconds),
      view: viewAt(figure, seconds, options.width, options.height),
    };
  }
}
