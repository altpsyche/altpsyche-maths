/**
 * A figure recorded, one frame at a time, into whatever takes the frames.
 *
 * The recorder walks the figure and paints each frame and does nothing else.
 * What the frames are painted onto and what becomes of them afterwards are one
 * parameter, so a canvas on a page, a canvas with no page behind it and a card
 * each satisfy the same call and this file changes for none of them.
 *
 * The walk is `frameTimesOf` and there is no second frame count anywhere here. A
 * recorder counting its own frames answers a different number from the walk the
 * strips are drawn from, since a floor and a round differ for every figure whose
 * duration times the rate lands above a half.
 */
import { paintCanvas, type CanvasLike } from './canvas.js';
import { framesOf, frameTimesOf } from '../figure/frames.js';
import { durationOf, type Figure } from '../figure/figure.js';

/**
 * Where a recording's frames go, which is an encoder or anything shaped like
 * one.
 *
 * The sink owns the surface rather than being handed one per frame, because an
 * encoder is built around a single surface and reads it whenever it likes. A
 * recorder that made a new one each frame would hand the encoder a picture it
 * had already stopped reading.
 */
export interface FrameSink<Output = void> {
  /** What each frame is painted onto, before the frame is taken. */
  readonly context: CanvasLike;
  /**
   * The frame just painted, taken at the time it is shown and for as long as it
   * is shown.
   *
   * It answers a promise so a recorder waits for an encoder that has fallen
   * behind. Frames arriving faster than they are encoded is how a recording of
   * four hundred of them runs a machine out of memory.
   */
  add(seconds: number, duration: number): Promise<void> | void;
  /** Whatever the sink was collecting, once no more frames are coming. */
  finish(): Promise<Output> | Output;
  /** Thrown away rather than finished, for a recording that failed part way. An
   * encoder holds an open file and a worker until it is told one way or the
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
  /** Called once per frame taken, which is what a progress reading is built
   * from. */
  onFrame?: (index: number, count: number) => void;
}

export interface Recording<Output> {
  /** How many frames were taken. */
  frames: number;
  /** How long the recording runs, in seconds. */
  seconds: number;
  /** What the sink handed back when it was finished. */
  output: Output;
}

/** A figure painted frame by frame into a sink, which hands back whatever it was
 * collecting. */
export async function recordFigure<Output>(
  figure: Figure,
  sink: FrameSink<Output>,
  options: RecordOptions
): Promise<Recording<Output>> {
  const { fps, width, height } = options;
  const count = frameTimesOf(figure, { fps }).length;
  const gap = 1 / fps;
  let frames = 0;
  try {
    for (const frame of framesOf(figure, { fps, width, height })) {
      paintCanvas(sink.context, frame.marks, frame.view);
      await sink.add(frame.seconds, gap);
      frames += 1;
      options.onFrame?.(frame.index, count);
    }
  } catch (failure) {
    await sink.cancel?.();
    throw failure;
  }
  return { frames, seconds: durationOf(figure), output: await sink.finish() };
}
