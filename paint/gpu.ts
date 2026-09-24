/**
 * A figure's marks drawn on a graphics card, which is the third painter.
 *
 * The renderer is `@altpsyche/engine`, loaded by the call that needs it, which is
 * how the typesetting call already loads MathJax and the recording call loads its
 * encoder: a consumer who never draws on a card never loads a renderer. Nothing
 * else in this package names the engine's door, and the engine never names this
 * package, which is what keeps the two from forming a cycle.
 *
 * The engine's door returns a renderer for a backend the caller has already
 * chosen, and asking a browser for a card is a separate question from whether it
 * reports one. So the choosing is done here: a device is asked for, the two
 * backends' capabilities are read off the result, and the engine's own
 * `resolve` returns which one draws the frame this painter builds.
 *
 * Making a renderer is asked for once and drawing is asked for per frame, since a
 * renderer compiles shaders and owns card memory. That is why the surface and the
 * painting are two calls where the other two painters are one: a canvas context
 * and an SVG string cost nothing to make.
 */
import { paintPixels } from './canvas.js';
import type { FramePainter } from './record.js';
import { gpuFrame, type GpuFrameOptions } from '../figure/gpu-frame.js';
import { shippedFont } from '../figure/font.js';
import { textOutlines } from '../figure/text-outline.js';
import type { Font } from '../figure/font.js';
import { mat3, type Transform2D } from '../values/mat3.js';
import { vec2 } from '../values/vec2.js';
import type { Frame } from '../figure/frames.js';
import type { Mark } from '../figure/mark.js';
import type { FrameGraph, FrameRenderer, WgslFrameGraph } from '@altpsyche/engine';

/**
 * A canvas, named by the parts a renderer reads rather than taken from the DOM
 * types, so this package declares no browser library. A real
 * `HTMLCanvasElement` and an `OffscreenCanvas` both satisfy it.
 *
 * The context is named because the WebGL 2 backend asks the canvas for one, and
 * the size is named because every frame is worked out against it.
 */
export interface GpuCanvas {
  width: number;
  height: number;
  getContext(kind: string, attributes?: unknown): unknown;
}

/**
 * A WebGPU device, named by the parts this module reads rather than taken from
 * the WebGPU types, so this package declares no WebGPU library. The `GPUDevice`
 * a browser returns satisfies it.
 */
export interface GpuDevice {
  destroy(): void;
}

export interface GpuSurfaceOptions {
  /** What each frame opens on, four channels from nothing to one. Left out, a
   * frame opens on nothing at all and whatever is behind the canvas shows
   * through. */
  readonly clear?: readonly [number, number, number, number];
  /** How far a straight run may sit from the curve it stands for, in the
   * figure's own units. */
  readonly tolerance?: number;
  /** Which backend to use, where the caller has already answered that question.
   * Left out, the answer is the engine's own `resolve` over what the browser
   * offers. */
  readonly backend?: 'webgl2' | 'webgpu';
  /** What to call with the engine's own words when it turns a frame down. */
  readonly onRefused?: (message: string) => void;
  /** The card to draw with, where the caller already holds one. Left out, and
   * where the backend is not WebGL 2, the surface asks for one itself and
   * destroys it on `dispose`. */
  readonly device?: GpuDevice;
}

/** A card with a renderer on it, ready to draw a figure's marks. */
export interface GpuSurface {
  /** Which of the two backends the frames are drawn through. */
  readonly backend: 'webgl2' | 'webgpu';
  /** The canvas the frames land on, whose size each frame is worked out
   * against. */
  readonly canvas: GpuCanvas;
  /** The device the frames are drawn with on WebGPU, and absent on WebGL 2. */
  readonly device?: GpuDevice;
  /** Gives up the card resources the renderer owns. */
  dispose(): void;
}

/** What one drawn frame reports: the marks it had no vocabulary for, and how much
 * geometry it drew. */
export interface GpuPainting {
  /** The id of every mark left out or drawn differently from the other two
   * painters. */
  readonly refused: readonly string[];
  readonly triangles: number;
}

interface Held extends GpuSurface {
  readonly renderer: FrameRenderer;
  readonly options: GpuSurfaceOptions;
  /** The typeface a label's shapes come from, read once when the surface is
   * opened, since a card has no font of its own. */
  readonly font: Font;
  /** The frame as the chosen backend takes it, which is the WGSL as written for
   * WebGPU and the baked GLSL for WebGL 2. */
  readonly asDrawn: (frame: FrameGraph) => FrameGraph;
}

/** Frame options for a canvas at the size it is now, since a canvas resized
 * between two frames draws the second at the new size. */
function sizedFor(canvas: GpuCanvas, options: GpuSurfaceOptions): GpuFrameOptions {
  return { width: canvas.width, height: canvas.height, clear: options.clear, tolerance: options.tolerance };
}

/**
 * A card ready to draw a figure, or nothing where no backend can draw one.
 *
 * The frame the backend is chosen against is this painter's own description of an
 * empty picture, since what a backend is asked for is the language the shaders
 * are written in and the smooth edge they need, and neither depends on the marks.
 *
 * `openRenderer` gathers what the machine offers, chooses the backend, asks for a
 * card only where that choice needs one, and translates the frame it is opened
 * with. It reads a frame for the language it is written in rather than for what
 * it requires, so the smooth edge this frame asks for is not checked against the
 * chosen backend; both backends have four samples a pixel wherever they run at
 * all.
 */
export async function gpuSurface(
  canvas: GpuCanvas,
  options: GpuSurfaceOptions = {}
): Promise<GpuSurface | null> {
  const engine = await import('@altpsyche/engine');
  const font = await shippedFont();
  const empty = gpuFrame([], mat3.scaling(vec2(1, 1)), sizedFor(canvas, options)).frame;

  // The engine's door names the DOM's own canvas types and this package declares
  // no browser library, so what satisfies the parts a renderer reads is passed
  // on as the canvas it is, under the type that door already states.
  type EngineCanvas = Parameters<typeof engine.openRenderer>[0];
  type EngineDevice = NonNullable<Parameters<typeof engine.openRenderer>[2]>['device'];

  // Asked for here so the surface holds the renderer's device; with none returned the door
  // is narrowed to WebGL 2, which it would choose anyway, rather than asking a second time.
  const asked = options.device || options.backend === 'webgl2' ? null : await engine.requestWebGPUDevice();
  const device: GpuDevice | null = options.device ?? asked;
  const backend = options.backend ?? (device ? undefined : 'webgl2');
  const opened = await engine.openRenderer(canvas as unknown as EngineCanvas, empty, {
    ...(backend ? { backend } : {}),
    ...(device ? { device: device as EngineDevice } : {}),
    onRefused: options.onRefused,
  });
  if ('refusal' in opened) {
    asked?.destroy();
    options.onRefused?.(opened.refusal);
    return null;
  }
  const drawnWith = opened.renderer.backend === 'webgpu' ? (device ?? undefined) : undefined;
  if (!drawnWith) asked?.destroy();

  // A renderer opened for one frame draws every later frame the caller passes it,
  // and the WebGL 2 backend throws on a WGSL frame however the renderer was
  // opened, so the translation the door did once is done here for each of them.
  const asDrawn =
    opened.renderer.backend === 'webgl2'
      ? (frame: FrameGraph) => {
          const glsl = engine.glslFrameOf(frame as WgslFrameGraph);
          if (!glsl) throw new Error('the frame carries no GLSL translation for WebGL 2 to draw');
          return glsl;
        }
      : (frame: FrameGraph) => frame;

  const held: Held = {
    backend: opened.renderer.backend,
    canvas,
    ...(drawnWith ? { device: drawnWith } : {}),
    renderer: opened.renderer,
    options,
    font,
    asDrawn,
    // The engine's WebGPU backend leaves its device alive on dispose, so a device
    // the surface asked for is destroyed here and a caller's is left to the caller.
    dispose: () => {
      opened.renderer.dispose();
      if (drawnWith === asked) asked?.destroy();
    },
  };
  return held;
}

/** Whether a surface is one this module made, which is what stores the renderer
 * the drawing calls submit through. */
function heldBy(surface: GpuSurface): Held {
  const held = surface as Held;
  if (!held.renderer) throw new Error('the surface handed to a GPU painter was not made by gpuSurface');
  return held;
}

/**
 * One list of marks drawn on a card, at the size the surface's canvas is now.
 *
 * What is returned is what the frame left out rather than the picture, since the
 * picture is on the canvas. A label is drawn as the shapes the shipped typeface
 * gives it, so nothing is left out for being text.
 */
export function paintGpu(surface: GpuSurface, marks: readonly Mark[], view: Transform2D): GpuPainting {
  const held = heldBy(surface);
  const built = gpuFrame(textOutlines(marks, held.font), view, sizedFor(held.canvas, held.options));
  held.renderer.resize(held.canvas.width, held.canvas.height);
  held.renderer.draw(held.asDrawn(built.frame), {});
  return { refused: built.refused, triangles: built.triangles };
}

/**
 * One list of marks drawn on a card and read back as pixels, four bytes to a
 * pixel.
 *
 * Reading a card back is what lets a claim about what a device draws be checked
 * against what the SVG painter draws, which is a gate with a browser in it rather
 * than part of the suite.
 */
export async function pixelsGpu(
  surface: GpuSurface,
  marks: readonly Mark[],
  view: Transform2D
): Promise<{ pixels: Uint8Array; painting: GpuPainting }> {
  const held = heldBy(surface);
  const built = gpuFrame(textOutlines(marks, held.font), view, sizedFor(held.canvas, held.options));
  held.renderer.resize(held.canvas.width, held.canvas.height);
  const pixels = await held.renderer.frame(held.asDrawn(built.frame), {});
  return {
    pixels,
    painting: { refused: built.refused, triangles: built.triangles },
  };
}

/**
 * A card as a recording's painter, which draws each frame and writes the pixels
 * it reads back onto the surface the sink is reading.
 *
 * The frame crosses as pixels because it cannot cross as a canvas: a WebGPU
 * canvas cannot be drawn into a two-dimensional context and a WebGL 2 one is not
 * asked to preserve its drawing buffer. The readback is the stall, which a
 * recorder can afford where a player could not.
 *
 * A frame's ground here is the clear colour the surface was opened with, since
 * the pixels replace what the context held and a background painted underneath
 * them is covered.
 */
export function painterGpu(
  surface: GpuSurface,
  onPainting?: (painting: GpuPainting, frame: Frame) => void
): FramePainter {
  return async (context, frame, options) => {
    const drawn = await pixelsGpu(surface, frame.marks, frame.view);
    paintPixels(context, drawn.pixels, options.width, options.height);
    onPainting?.(drawn.painting, frame);
  };
}
