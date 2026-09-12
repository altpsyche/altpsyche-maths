/**
 * A figure recorded with no page: the recorder, the encoder and a card, all
 * inside a worker.
 *
 * A worker has no document and no `HTMLCanvasElement`, so every surface here is
 * an `OffscreenCanvas`. `videoSink` and `gpuSurface` each name a canvas by the
 * parts they read rather than by the DOM's types, which is what lets the same
 * two calls run here and in a page.
 *
 * It is a module worker, so the package is imported by path and the bare names
 * inside it are resolved by the server that serves this file. A worker cannot
 * read the page's import map: a map belongs to the realm that declared it.
 */
import {
  colourFrom,
  frameTimesOf,
  gpuSurface,
  painterGpu,
  readFigure,
  recordFigure,
  videoSink,
} from '../dist/index.js';

/** The card every recording off a card is drawn on, opened once, since a
 * renderer compiles shaders and owns card memory. */
let surface = null;

async function open({ width, height }) {
  surface = await gpuSurface(new OffscreenCanvas(width, height), {
    clear: [1, 1, 1, 1],
    onRefused: (message) => {
      throw new Error(message);
    },
  });
  if (!surface) throw new Error('no backend drew the figure');
  return { backend: surface.backend, document: typeof document };
}

async function record({ origin, name, through, fps, width, height }) {
  const text = await (await fetch(`${origin}/demos/${name}.figure.json`)).text();
  const figure = readFigure(text);
  const canvas = new OffscreenCanvas(width, height);
  const sink = await videoSink(canvas, { fps, format: 'mp4', codec: 'avc' });

  const refused = new Set();
  let triangles = 0;
  const painting =
    through === 'card'
      ? {
          paint: painterGpu(surface, (drawn) => {
            for (const mark of drawn.refused) refused.add(mark);
            triangles = Math.max(triangles, drawn.triangles);
          }),
        }
      : { background: colourFrom('#ffffff') };

  const started = performance.now();
  const recording = await recordFigure(figure, sink, { fps, width, height, ...painting });
  const took = Math.round(performance.now() - started);

  const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
  let inked = 0;
  for (let at = 0; at < pixels.length; at += 4) {
    if (pixels[at] !== 255 || pixels[at + 1] !== 255 || pixels[at + 2] !== 255) inked += 1;
  }
  let binary = '';
  for (const byte of recording.output) binary += String.fromCharCode(byte);
  return {
    bytes: btoa(binary),
    frames: recording.frames,
    walked: frameTimesOf(figure, { fps }).length,
    seconds: recording.seconds,
    inked: inked / (width * height),
    took,
    refused: [...refused],
    triangles,
    document: typeof document,
  };
}

self.addEventListener('message', async (message) => {
  const { id, kind, ...rest } = message.data;
  try {
    const answer = kind === 'open' ? await open(rest) : await record(rest);
    self.postMessage({ id, answer });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
});
