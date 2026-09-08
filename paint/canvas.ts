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
import { mat3, type Mat3 } from '../values/mat3.js';
import { vec2 } from '../values/vec2.js';
import type { Fill, Mark, PathMark, TextMark } from '../figure/mark.js';
import type { Path } from '../figure/path.js';
import { outlinedMarks } from '../figure/outline.js';
import { widestWidth } from '../figure/width.js';

/**
 * Only what a painter uses from a canvas context, named here rather than taken
 * from the DOM types, so this package declares no browser library and a test can
 * hand in a stand-in. A real `CanvasRenderingContext2D` satisfies it.
 *
 * The two style properties are `unknown` because a real context also accepts a
 * gradient and a pattern there, and a narrower type here would refuse the very
 * thing this is meant to be handed.
 */
/** What a canvas hands back for a gradient, which is an object built from the
 * context and filled with stops rather than a value written out. */
export interface CanvasGradientLike {
  addColorStop(offset: number, colour: string): void;
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
  clip(): void;
  moveTo(x: number, y: number): void;
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  closePath(): void;
  fill(rule?: 'nonzero' | 'evenodd'): void;
  stroke(): void;
  fillText(text: string, x: number, y: number): void;
  setLineDash(segments: number[]): void;
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

/** SVG says middle where a canvas says center, and the two mean the same place. */
const ALIGNMENT = { start: 'start', middle: 'center', end: 'end' } as const;

function tracePath(context: CanvasLike, path: Path, view: Mat3): void {
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
 * The axis is transformed by the view before the gradient is built, since the
 * geometry it belongs to is painted through the same view, and a canvas gradient
 * is placed in the units it is painted in.
 */
function fillPaint(context: CanvasLike, fill: Fill, view: Mat3): unknown {
  if (!fill.gradient || !context.createLinearGradient) return fill.colour;
  const from = mat3.transformPoint(view, fill.gradient.from);
  const to = mat3.transformPoint(view, fill.gradient.to);
  const made = context.createLinearGradient(from.x, from.y, to.x, to.y);
  for (const stop of fill.gradient.stops) made.addColorStop(stop.offset, stop.colour);
  return made;
}

/**
 * The mark's clip set on the context, in the units painted into.
 *
 * The rectangle goes through the same view the geometry does, and the corners
 * are taken lowest first afterwards: the view turns the y axis over, so a width
 * worked out before the flip would come out negative.
 */
function clipTo(context: CanvasLike, mark: Mark, view: Mat3): void {
  if (!mark.clip) return;
  const one = mat3.transformPoint(view, vec2(mark.clip.x.from, mark.clip.y.from));
  const other = mat3.transformPoint(view, vec2(mark.clip.x.to, mark.clip.y.to));
  context.beginPath();
  context.rect(
    Math.min(one.x, other.x),
    Math.min(one.y, other.y),
    Math.abs(other.x - one.x),
    Math.abs(other.y - one.y)
  );
  context.clip();
}

function paintPath(context: CanvasLike, mark: PathMark, view: Mat3, scale: number): void {
  tracePath(context, mark.path, view);
  if (mark.fill) {
    context.fillStyle = fillPaint(context, mark.fill, view);
    context.fill(mark.fill.rule ?? 'nonzero');
  }
  if (mark.stroke) {
    context.strokeStyle = mark.stroke.colour;
    context.lineWidth = widestWidth(mark.stroke.width) * scale;
    context.lineCap = mark.stroke.cap ?? 'butt';
    context.lineJoin = mark.stroke.join ?? 'miter';
    // Set every time rather than only when a mark asks for it, because a context
    // holds the last dash it was given and the next mark would inherit it.
    context.setLineDash(mark.stroke.dash ? mark.stroke.dash.map((run) => run * scale) : []);
    context.lineDashOffset = (mark.stroke.dashOffset ?? 0) * scale;
    context.stroke();
  }
}

function paintText(context: CanvasLike, mark: TextMark, view: Mat3, scale: number): void {
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
export function paintCanvas(context: CanvasLike, marks: readonly Mark[], view: Mat3): void {
  const scale = mat3.scaleFactor(view);
  // A stroke of two widths is no setting a context holds, so it arrives here as
  // the filled outline it is drawn as before any of it is traced.
  for (const mark of outlinedMarks(marks)) {
    context.save();
    context.globalAlpha = mark.opacity ?? 1;
    clipTo(context, mark, view);
    if (mark.kind === 'path') paintPath(context, mark, view, scale);
    else paintText(context, mark, view, scale);
    context.restore();
  }
}
