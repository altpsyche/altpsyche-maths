/**
 * A figure recorded, one frame at a time, into whatever takes the frames.
 *
 * The recorder walks the figure and paints each frame and does nothing else.
 * What the frames are painted onto, how they are painted and what becomes of
 * them afterwards are all parameters, so a canvas on a page, a canvas with no
 * page behind it and a card each satisfy the same call and this file changes for
 * none of them.
 *
 * The walk is `walkTimesOf` and there is no second frame count anywhere here. A
 * recorder counting its own frames arrives at a different number from the walk the
 * strips are drawn from, since a floor and a round differ for every figure whose
 * duration times the rate lands above a half.
 */
import { paintFrame, type CanvasLike, type SurfaceOptions } from './canvas.js';
import { frameAt, walkTimesOf, type Frame } from '../figure/frames.js';
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

/** Where one filled frame falls, counted two ways. */
export interface WalkTime {
  /** Its place among the frames kept, counting from nothing. */
  index: number;
  /** Its time in the recording, in seconds. */
  seconds: number;
  /** Its place among every frame filled, counting from nothing. */
  frame: number;
  /** Its time on the fill's own clock, which is `frame` over the rate. */
  clock: number;
}

/**
 * How one frame of a walk is drawn onto the sink's surface.
 *
 * A fill is given the time and nothing else, so a shader that holds no figure
 * records through the same loop a figure does.
 */
export type FrameFill = (context: CanvasLike, time: WalkTime) => Promise<void> | void;

export interface WalkOptions {
  /** How many frames a second the recording plays at. The walk steps by exactly
   * one over this, or the encoded video drifts from the fill's own clock. */
  fps: number;
  /** How long the recording runs, in seconds. */
  seconds: number;
  /** Called once per frame taken, which is what a progress reading is built
   * from. */
  onFrame?: (index: number, count: number) => void;
  /** Frames filled before the first one kept and never passed to the sink. A fill
   * that sums its own last frame opens on an empty picture until these have run. */
  settle?: number;
  /** Called once per settling frame, which is what a progress reading of the
   * settling is built from. */
  onSettle?: (frame: number, count: number) => void;
}

export interface RecordOptions extends Omit<WalkOptions, 'seconds'> {
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

/** A walk filled frame by frame into a sink, which returns whatever it was
 * collecting. */
export async function recordFrames<Output>(
  sink: FrameSink<Output>,
  fill: FrameFill,
  options: WalkOptions
): Promise<Recording<Output>> {
  const { fps, seconds: span, settle = 0 } = options;
  const times = walkTimesOf({ fps, seconds: span });
  const gap = 1 / fps;
  let frames = 0;
  try {
    // Settling: frames at clip time 0 on a clock that the kept frames carry on from rather than restart.
    for (let frame = 0; frame < settle; frame += 1) {
      await fill(sink.context, { index: 0, seconds: 0, frame, clock: frame / fps });
      options.onSettle?.(frame, settle);
    }
    for (let index = 0; index < times.length; index += 1) {
      const seconds = times[index];
      const frame = settle + index;
      await fill(sink.context, { index, seconds, frame, clock: frame / fps });
      await sink.add(seconds, gap);
      frames += 1;
      options.onFrame?.(index, times.length);
    }
  } catch (failure) {
    await sink.cancel?.();
    throw failure;
  }
  return { frames, seconds: span, output: await sink.finish() };
}

/** A figure painted frame by frame into a sink, which returns whatever it was
 * collecting. */
export async function recordFigure<Output>(
  figure: Figure,
  sink: FrameSink<Output>,
  options: RecordOptions
): Promise<Recording<Output>> {
  const { width, height, background } = options;
  const paint = options.paint ?? paintFrame;
  const fill: FrameFill = (context, time) =>
    paint(context, frameAt(figure, time.index, time.seconds, width, height), { width, height, background });
  const { fps, onFrame, settle, onSettle } = options;
  return recordFrames(sink, fill, { fps, seconds: options.seconds ?? durationOf(figure), onFrame, settle, onSettle });
}
