/**
 * A figure recorded, one frame at a time, into whatever takes the frames.
 *
 * The recorder walks the figure and paints each frame and does nothing else.
 * What the frames are painted onto, how they are painted and what becomes of
 * them afterwards are all parameters, so a canvas on a page, a canvas with no
 * page behind it and a card each satisfy the same call and this file changes for
 * none of them.
 *
 * The walk is `frameTimesOf` and there is no second frame count anywhere here. A
 * recorder counting its own frames arrives at a different number from the walk the
 * strips are drawn from, since a floor and a round differ for every figure whose
 * duration times the rate lands above a half.
 */
import { paintFrame, type CanvasLike, type SurfaceOptions } from './canvas.js';
import { framesOf, frameTimesOf, type Frame } from '../figure/frames.js';
import { durationOf, type Figure } from '../figure/figure.js';
import type { Colour } from '../values/colour.js';

/**
 * How one frame reaches the surface the sink is reading.
 *
 * `paintFrame` is one answer and a card is another, since a card draws the frame
 * on its own canvas and the pixels it reads back are written onto this one. It
 * returns a promise because that readback is asynchronous where painting onto a
 * context is not.
 */
export type FramePainter = (
  context: CanvasLike,
  frame: Frame,
  options: SurfaceOptions
) => Promise<void> | void;

/**
 * Where a recording's frames go, which is an encoder or anything shaped like
 * one.
 *
 * The sink owns the surface rather than being passed one per frame, because an
 * encoder is built around a single surface and reads it whenever it likes. A
 * recorder that made a new one each frame would pass the encoder a picture it
 * had already stopped reading.
 */
export interface FrameSink<Output = void> {
  /** What each frame is painted onto, before the frame is taken. */
  readonly context: CanvasLike;
  /**
   * The frame just painted, taken at the time it is shown and for as long as it
   * is shown.
   *
   * It returns a promise so a recorder waits for an encoder that has fallen
   * behind. Frames arriving faster than they are encoded is how a recording of
   * four hundred of them runs a machine out of memory.
   */
  add(seconds: number, duration: number): Promise<void> | void;
  /** Whatever the sink was collecting, once no more frames are coming. */
  finish(): Promise<Output> | Output;
  /** Thrown away rather than finished, for a recording that failed part way. An
   * encoder keeps a file and a worker open until it is told one way or the
   * other. */
  cancel?(): Promise<void> | void;
}

export interface RecordOptions {
  /** How many frames a second the recording plays at. The walk steps by exactly
   * one over this, or the encoded video drifts from the figure's own clock. */
  fps: number;
  /** The surface the frames are painted on, in whatever units the sink counts
   * in. */
  width: number;
  height: number;
  /** How long the recording runs, where that is not the figure's own length. A
   * figure that declares itself a loop goes round again and one that does not
   * holds its last picture. */
  seconds?: number;
  /** What each frame opens on, before its marks are painted. A recording left
   * without one shows every frame through the one before it, since a canvas keeps
   * what was drawn on it. */
  background?: Colour;
  /** How each frame reaches the sink's surface. Left out, the marks are painted
   * onto it by the two-dimensional painter. */
  paint?: FramePainter;
  /** Called once per frame taken, which is what a progress reading is built
   * from. */
  onFrame?: (index: number, count: number) => void;
}

export interface Recording<Output> {
  /** How many frames were taken. */
  frames: number;
  /** How long the recording runs, in seconds, which is the figure's own length
   * where nothing else was asked for. */
  seconds: number;
  /** What the sink returned when it was finished. */
  output: Output;
}

/** A figure painted frame by frame into a sink, which returns whatever it was
 * collecting. */
export async function recordFigure<Output>(
  figure: Figure,
  sink: FrameSink<Output>,
  options: RecordOptions
): Promise<Recording<Output>> {
  const { fps, width, height } = options;
  const span = options.seconds ?? durationOf(figure);
  const count = frameTimesOf(figure, { fps, seconds: span }).length;
  const gap = 1 / fps;
  const paint = options.paint ?? paintFrame;
  let frames = 0;
  try {
    for (const frame of framesOf(figure, { fps, width, height, seconds: span })) {
      await paint(sink.context, frame, { width, height, background: options.background });
      await sink.add(frame.seconds, gap);
      frames += 1;
      options.onFrame?.(frame.index, count);
    }
  } catch (failure) {
    await sink.cancel?.();
    throw failure;
  }
  return { frames, seconds: span, output: await sink.finish() };
}
