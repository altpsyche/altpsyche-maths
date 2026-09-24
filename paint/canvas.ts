/**
 * Marks painted onto a two-dimensional canvas, which is what a recording is.
 *
 * An encoder takes one surface, so a recorded frame cannot be the page's SVG. It
 * is painted again from the same marks rather than rasterised from the page,
 * which is why a test holds the two painters to emitting the same geometry and
 * the same style for every mark.
 *
 * The view is baked into the coordinates here exactly as it is in the SVG
 * painter, rather than set on the context. Setting it would flip the text, since
 * the view turns the y axis over.
 */
import { mat3, type Transform2D } from '../values/mat3.js';
import { vec2 } from '../values/vec2.js';
import { hexOf } from '../values/colour.js';
import type { Colour } from '../values/colour.js';
import type { Frame } from '../figure/frames.js';
import type { Fill, Mark, PathMark, TextMark } from '../figure/mark.js';
import type { Path } from '../figure/path.js';
import type { Bounds } from '../figure/bounds.js';
import { outlinedMarks } from '../figure/outline.js';
import { depthOrder } from '../figure/depth-order.js';
import { widestWidth } from '../figure/width.js';

/**
 * Only what a painter uses from a canvas context, named here rather than taken
 * from the DOM types, so this package declares no browser library and a test can
 * pass in a stand-in. A real `CanvasRenderingContext2D` satisfies it.
 *
 * The two style properties are `unknown` because a real context also accepts a
 * gradient and a pattern there, and a narrower type here would refuse the very
 * objects this is meant to be passed.
 */
/** What a canvas returns for a gradient, which is an object built from the
 * context and filled with stops rather than a value written out. */
export interface CanvasGradientLike {
  addColorStop(offset: number, colour: string): void;
}

/** A rectangle of pixels, four bytes to one and the top row first, named by the
 * parts a painter reads. A real `ImageData` satisfies it. */
export interface ImageDataLike {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface CanvasLike {
  /** It is optional because a stand-in written before gradients existed is still
   * a stand-in, and a context without it paints every mark in its one colour. */
  createLinearGradient?(x0: number, y0: number, x1: number, y1: number): CanvasGradientLike;
  save(): void;
  restore(): void;
  beginPath(): void;
  rect(x: number, y: number, width: number, height: number): void;
  /** Required rather than optional, unlike the gradient above: a context that
   * quietly skipped a clip would paint the marks a figure asked to have cut
   * away, where one that skips a gradient paints the same shape in one colour. */
  clip(rule?: 'nonzero' | 'evenodd'): void;
  moveTo(x: number, y: number): void;
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  closePath(): void;
  fill(rule?: 'nonzero' | 'evenodd'): void;
  stroke(): void;
  fillText(text: string, x: number, y: number): void;
  setLineDash(segments: number[]): void;
  /** The two image calls are optional for the same reason the gradient above is:
   * a stand-in that paints marks and nothing else is still a painter's context.
   * A frame drawn on a card is what needs them. */
  createImageData?(width: number, height: number): ImageDataLike;
  putImageData?(image: ImageDataLike, x: number, y: number): void;
  globalAlpha: number;
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'miter' | 'round' | 'bevel';
  lineDashOffset: number;
  font: string;
  textAlign: 'start' | 'end' | 'left' | 'right' | 'center';
  textBaseline: 'alphabetic' | 'top' | 'hanging' | 'middle' | 'ideographic' | 'bottom';
}

/** SVG names middle where a canvas names center, and the two mean the same place. */
const ALIGNMENT = { start: 'start', middle: 'center', end: 'end' } as const;

function tracePath(context: CanvasLike, path: Path, view: Transform2D): void {
  context.beginPath();
  for (const subpath of path) {
    const start = mat3.transformPoint(view, subpath.start);
    context.moveTo(start.x, start.y);
    for (const curve of subpath.curves) {
      const c1 = mat3.transformPoint(view, curve.control1);
      const c2 = mat3.transformPoint(view, curve.control2);
      const to = mat3.transformPoint(view, curve.to);
      context.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, to.x, to.y);
    }
    if (subpath.closed) context.closePath();
  }
}

/**
 * What a fill is painted with: a gradient built from the context where it has
 * stops, and its one colour otherwise.
 *
 * A colour reaches the context as hex and never as the `var()` the SVG painter
 * writes, since a canvas resolves no custom property and paints one it is passed
 * as nothing at all.
 *
 * The axis is transformed by the view before the gradient is built, since the
 * geometry it belongs to is painted through the same view, and a canvas gradient
 * is placed in the units it is painted in.
 */
function fillPaint(context: CanvasLike, fill: Fill, view: Transform2D): unknown {
  if (!fill.gradient || !context.createLinearGradient) return hexOf(fill.colour);
  const from = mat3.transformPoint(view, fill.gradient.from);
  const to = mat3.transformPoint(view, fill.gradient.to);
  const made = context.createLinearGradient(from.x, from.y, to.x, to.y);
  for (const stop of fill.gradient.stops) made.addColorStop(stop.offset, hexOf(stop.colour));
  return made;
}

/**
 * The mark's clips set on the context, in the units painted into.
 *
 * The rectangle goes through the same view the geometry does, and the corners
 * are taken lowest first afterwards: the view turns the y axis over, so a width
 * worked out before the flip would come out negative. A second `clip` call
 * intersects with the first, so a mark with both is drawn inside both.
 */
function clipTo(context: CanvasLike, mark: Mark, view: Transform2D): void {
  if (mark.clip) clipToRect(context, mark.clip, view);
  if (!mark.clipPath) return;
  tracePath(context, mark.clipPath, view);
  context.clip('nonzero');
}

function clipToRect(context: CanvasLike, clip: Bounds, view: Transform2D): void {
  const one = mat3.transformPoint(view, vec2(clip.x.from, clip.y.from));
  const other = mat3.transformPoint(view, vec2(clip.x.to, clip.y.to));
  context.beginPath();
  context.rect(
    Math.min(one.x, other.x),
    Math.min(one.y, other.y),
    Math.abs(other.x - one.x),
    Math.abs(other.y - one.y)
  );
  context.clip();
}

function paintPath(context: CanvasLike, mark: PathMark, view: Transform2D, scale: number): void {
  tracePath(context, mark.path, view);
  if (mark.fill) {
    context.fillStyle = fillPaint(context, mark.fill, view);
    context.fill(mark.fill.rule ?? 'nonzero');
  }
  if (mark.stroke) {
    context.strokeStyle = hexOf(mark.stroke.colour);
    context.lineWidth = widestWidth(mark.stroke.width) * scale;
    context.lineCap = mark.stroke.cap ?? 'butt';
    context.lineJoin = mark.stroke.join ?? 'miter';
    // Set every time rather than only when a mark asks for it, because a context
    // stores the last dash it was given and the next mark would inherit it.
    context.setLineDash(mark.stroke.dash ? mark.stroke.dash.map((run) => run * scale) : []);
    context.lineDashOffset = (mark.stroke.dashOffset ?? 0) * scale;
    context.stroke();
  }
}

function paintText(context: CanvasLike, mark: TextMark, view: Transform2D, scale: number): void {
  const at = mat3.transformPoint(view, mark.at);
  const weight = mark.weight === undefined ? '' : `${mark.weight} `;
  context.font = `${weight}${mark.size * scale}px ${mark.family}`;
  context.textAlign = ALIGNMENT[mark.align ?? 'start'];
  context.textBaseline = mark.baseline ?? 'alphabetic';
  context.fillStyle = fillPaint(context, mark.fill, view);
  context.fillText(mark.text, at.x, at.y);
}

/**
 * Every mark painted, in order.
 *
 * Each one is wrapped in a save and a restore, so a mark that sets an opacity, a
 * dash or a clip cannot leak it into the mark after it. A frame drawn on a
 * context that has been used before therefore looks the same as one drawn on a
 * fresh context.
 */
export function paintCanvas(context: CanvasLike, marks: readonly Mark[], view: Transform2D): void {
  const scale = mat3.scaleFactor(view);
  // A stroke of two widths is no setting a context has, so it arrives here as
  // the filled outline it is drawn as before any of it is traced, and the outline
  // is the shape the depth order cuts.
  for (const mark of depthOrder(outlinedMarks(marks))) {
    context.save();
    context.globalAlpha = mark.opacity ?? 1;
    clipTo(context, mark, view);
    if (mark.kind === 'path') paintPath(context, mark, view, scale);
    else paintText(context, mark, view, scale);
    context.restore();
  }
}

/**
 * The surface a frame is painted onto: how big it is, and what colour it opens
 * on.
 *
 * The ground is a colour rather than a fill, since a frame opens on one colour
 * and only a mark's fill is a gradient. Leaving it out is what a figure drawn
 * over something else needs: a figure lying over a shader has the shader's
 * pixels underneath it, and a ground painted over them erases the picture.
 */
export interface SurfaceOptions {
  width: number;
  height: number;
  background?: Colour;
}

/**
 * One frame painted whole, ground and marks together.
 *
 * A canvas keeps what was drawn on it until something covers it, so a frame
 * painted onto the canvas the frame before it used opens on that frame's
 * picture. An SVG still has no such history, which is why this is the recorder's
 * question rather than the SVG painter's.
 */
export function paintFrame(context: CanvasLike, frame: Frame, options: SurfaceOptions): void {
  if (options.background) {
    context.save();
    context.globalAlpha = 1;
    context.fillStyle = hexOf(options.background);
    context.beginPath();
    context.rect(0, 0, options.width, options.height);
    context.fill();
    context.restore();
  }
  paintCanvas(context, frame.marks, frame.view);
}

/**
 * Pixels written onto a canvas as they are, four bytes to a pixel and the top
 * row first.
 *
 * They replace what the canvas held rather than being composited over it, so a
 * frame drawn somewhere else shows nothing of the frame before through its
 * transparent parts. That is what `putImageData` does and what makes it the call
 * a frame read back off a card arrives by.
 */
export function paintPixels(
  context: CanvasLike,
  pixels: Uint8Array,
  width: number,
  height: number
): void {
  if (!context.createImageData || !context.putImageData)
    throw new Error('the canvas handed pixels has no createImageData and putImageData');
  if (pixels.length !== width * height * 4)
    throw new Error(
      `${pixels.length} bytes of pixels is not the ${width * height * 4} a ${width}x${height} frame holds`
    );
  const image = context.createImageData(width, height);
  image.data.set(pixels);
  context.putImageData(image, 0, 0);
}
