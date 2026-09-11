/**
 * A figure's marks drawn on a graphics card, which is the third painter.
 *
 * The renderer is `@altpsyche/engine`, loaded by the call that needs it, which is
 * how the typesetting call already loads MathJax and the recording call loads its
 * encoder: a consumer who never draws on a card never loads a renderer. Nothing
 * else in this package names the engine's door, and the engine never names this
 * package, which is what keeps the two from forming a cycle.
 *
 * The engine's door hands out a renderer for a backend the caller has already
 * chosen, and asking a browser for a card is a separate question from whether it
 * reports one. So the choosing is done here: a device is asked for, the two
 * backends' capabilities are read off what came back, and the engine's own
 * `resolve` answers which one draws the frame this painter builds.
 *
 * Making a renderer is asked for once and drawing is asked for per frame, since a
 * renderer compiles shaders and owns card memory. That is why the surface and the
 * painting are two calls where the other two painters are one: a canvas context
 * and an SVG string cost nothing to make.
 */
import { gpuFrame, type GpuFrameOptions } from '../figure/gpu-frame.js';
import { mat3, type Transform2D } from '../values/mat3.js';
import { vec2 } from '../values/vec2.js';
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
}

/** A card with a renderer on it, ready to draw a figure's marks. */
export interface GpuSurface {
  /** Which of the two backends the frames are drawn through. */
  readonly backend: 'webgl2' | 'webgpu';
  /** The canvas the frames land on, whose size each frame is worked out
   * against. */
  readonly canvas: GpuCanvas;
  /** Gives up the card resources the renderer holds. */
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
 * A device is asked for before the choosing rather than after, because a browser
 * was measured reporting WebGPU and then handing back nothing when asked for a
 * card, and the engine's own comment says so.
 */
export async function gpuSurface(
  canvas: GpuCanvas,
  options: GpuSurfaceOptions = {}
): Promise<GpuSurface | null> {
  const engine = await import('@altpsyche/engine');
  const empty = gpuFrame([], mat3.scaling(vec2(1, 1)), sizedFor(canvas, options)).frame;

  const device = options.backend === 'webgl2' ? null : await engine.requestWebGPUDevice();
  const chosen =
    options.backend ??
    (() => {
      const selection = engine.resolve(empty, {
        webgpu: device ? engine.webgpuCapabilities(device.features) : null,
        // A canvas with no WebGL 2 context refuses the renderer below rather than
        // here, since asking for a context is what answers that and the engine's
        // own door takes the answer rather than the question.
        webgl2: engine.webgl2Capabilities([]),
      });
      return 'backend' in selection ? selection.backend : null;
    })();

  if (!chosen) {
    options.onRefused?.('no backend can draw a figure on this device');
    return null;
  }

  // The engine's door names the DOM's own canvas types and this package declares
  // no browser library, so what satisfies the parts a renderer reads is handed
  // over as the canvas it is, under the type that door already states.
  type EngineCanvas = Parameters<typeof engine.createFrameRenderer>[0];
  // A canvas that cannot give the backend its context makes the engine throw
  // where its own signature answers nothing, so the throw is turned back into the
  // nothing this call promises.
  const renderer = await engine
    .createFrameRenderer(canvas as unknown as EngineCanvas, {
      backend: chosen,
      device: device ?? undefined,
      onRefused: options.onRefused,
    })
    .catch(() => null);
  if (!renderer) {
    options.onRefused?.(`the ${chosen} backend gave no renderer for this canvas`);
    return null;
  }

  // The engine's `resolve` says WebGL 2 draws a WGSL frame that carries a baked
  // translation, and its WebGL 2 backend refuses one by name: the translating is
  // the caller's, through the engine's own `glslFrameOf`.
  const asDrawn =
    renderer.backend === 'webgl2'
      ? (frame: FrameGraph) => {
          const glsl = engine.glslFrameOf(frame as WgslFrameGraph);
          if (!glsl) throw new Error('the frame carries no GLSL translation for WebGL 2 to draw');
          return glsl;
        }
      : (frame: FrameGraph) => frame;

  const held: Held = {
    backend: renderer.backend,
    canvas,
    renderer,
    options,
    asDrawn,
    dispose: () => renderer.dispose(),
  };
  return held;
}

/** Whether a surface is one this module made, which is what carries the renderer
 * the drawing calls submit through. */
function heldBy(surface: GpuSurface): Held {
  const held = surface as Held;
  if (!held.renderer) throw new Error('the surface handed to a GPU painter was not made by gpuSurface');
  return held;
}

/**
 * What one backend cannot draw of a list of marks, beyond what the description
 * itself leaves out.
 *
 * The WebGL 2 backend applies no blend: its whole module names `blend` nowhere,
 * where the WebGPU one carries a pipeline's `targets[].blend` through. So a mark
 * under partial opacity is written straight through there rather than mixed with
 * what is behind it, and naming it is what keeps the difference from being
 * silent.
 */
function unblended(surface: Held, marks: readonly Mark[]): string[] {
  if (surface.backend !== 'webgl2') return [];
  return marks.filter((mark) => mark.opacity !== undefined && mark.opacity < 1).map((mark) => mark.id);
}

/**
 * One list of marks drawn on a card, at the size the surface's canvas is now.
 *
 * What comes back is what the frame left out rather than the picture, since the
 * picture is on the canvas. A text mark is left out because a card has no text
 * vocabulary, and on WebGL 2 a mark under partial opacity is drawn without its
 * blend.
 */
export function paintGpu(surface: GpuSurface, marks: readonly Mark[], view: Transform2D): GpuPainting {
  const held = heldBy(surface);
  const built = gpuFrame(marks, view, sizedFor(held.canvas, held.options));
  held.renderer.resize(held.canvas.width, held.canvas.height);
  held.renderer.draw(held.asDrawn(built.frame), {});
  return { refused: [...built.refused, ...unblended(held, marks)], triangles: built.triangles };
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
  const built = gpuFrame(marks, view, sizedFor(held.canvas, held.options));
  held.renderer.resize(held.canvas.width, held.canvas.height);
  const pixels = await held.renderer.frame(held.asDrawn(built.frame), {});
  return {
    pixels,
    painting: { refused: [...built.refused, ...unblended(held, marks)], triangles: built.triangles },
  };
}
