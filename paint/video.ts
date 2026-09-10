/**
 * A recording's frames encoded into a video file's bytes.
 *
 * The encoder is `mediabunny`, loaded by the call that needs it, which is how
 * the typesetting call already loads MathJax: a consumer who never records never
 * loads it. Nothing else in this package names the library.
 *
 * Encoding needs a `VideoEncoder`, which is WebCodecs, and Node has no such
 * global: `getEncodableVideoCodecs()` answers an empty list there. So this runs
 * in a browser or on anything else that implements WebCodecs, and the claim that
 * the bytes play is a gate with a browser in it rather than part of the suite.
 */
import type { CanvasLike } from './canvas.js';
import type { FrameSink } from './record.js';

/**
 * A canvas, named by the parts an encoder reads rather than taken from the DOM
 * types, so this package declares no browser library. A real
 * `HTMLCanvasElement` and an `OffscreenCanvas` both satisfy it.
 */
export interface CanvasSurface {
  width: number;
  height: number;
  getContext(kind: '2d'): CanvasLike | null;
}

export interface VideoOptions {
  /** The container the bytes are written in. MP4 plays in more places; WebM is
   * what a browser without an MP4 encoder is left with. */
  format?: 'mp4' | 'webm';
  /** The video codec, named as `mediabunny` names it. What a machine can encode
   * is its own question, and a codec no encoder there supports fails at the
   * first frame rather than quietly. */
  codec?: 'avc' | 'hevc' | 'vp9' | 'av1' | 'vp8';
  /** Bits a second. Left out, the encoder is asked for its high quality, which
   * chooses a rate from the size and the frame rate. */
  bitrate?: number;
  /** How many frames a second the file plays at, which is the rate the recording
   * was walked at. */
  fps: number;
}

/**
 * A sink that encodes each frame it is handed and answers the finished file.
 *
 * The canvas is the sink's own, since an encoder reads the one surface it was
 * built around. Finishing the output finishes the source with it, so the source
 * is never closed on its own.
 */
export async function videoSink(
  canvas: CanvasSurface,
  options: VideoOptions
): Promise<FrameSink<Uint8Array>> {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('the canvas handed to videoSink has no 2d context');

  const { Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource, QUALITY_HIGH } =
    await import('mediabunny');

  const target = new BufferTarget();
  const output = new Output({
    format: options.format === 'webm' ? new WebMOutputFormat() : new Mp4OutputFormat(),
    target,
  });
  // The library names the DOM's own canvas types and this package declares no
  // browser library, so what satisfies the parts an encoder reads is handed over
  // as the canvas it is.
  const source = new CanvasSource(canvas as unknown as OffscreenCanvas, {
    codec: options.codec ?? (options.format === 'webm' ? 'vp9' : 'avc'),
    bitrate: options.bitrate ?? QUALITY_HIGH,
  });
  output.addVideoTrack(source, { frameRate: options.fps });
  await output.start();

  return {
    context,
    add: (seconds, duration) => source.add(seconds, duration),
    finish: async () => {
      await output.finalize();
      const buffer = target.buffer;
      if (!buffer) throw new Error('the encoder finished with no bytes');
      return new Uint8Array(buffer);
    },
    cancel: () => output.cancel(),
  };
}
