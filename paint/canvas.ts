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
import type { Mark, PathMark, TextMark } from '../figure/mark.js';
import type { Path } from '../figure/path.js';

/**
 * Only what a painter uses from a canvas context, named here rather than taken
 * from the DOM types, so this package declares no browser library and a test can
 * hand in a stand-in. A real `CanvasRenderingContext2D` satisfies it.
 *
 * The two style properties are `unknown` because a real context also accepts a
 * gradient and a pattern there, and a narrower type here would refuse the very
 * thing this is meant to be handed.
 */
export interface CanvasLike {
  save(): void;
  restore(): void;
  beginPath(): void;
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

function paintPath(context: CanvasLike, mark: PathMark, view: Mat3, scale: number): void {
  tracePath(context, mark.path, view);
  if (mark.fill) {
    context.fillStyle = mark.fill.colour;
    context.fill(mark.fill.rule ?? 'nonzero');
  }
  if (mark.stroke) {
    context.strokeStyle = mark.stroke.colour;
    context.lineWidth = mark.stroke.width * scale;
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
  context.fillStyle = mark.fill.colour;
  context.fillText(mark.text, at.x, at.y);
}

/**
 * Every mark painted, in order.
 *
 * Each one is wrapped in a save and a restore, so a mark that sets an opacity or
 * a dash cannot leak it into the mark after it. A frame drawn on a context that
 * has been used before therefore looks the same as one drawn on a fresh context.
 */
export function paintCanvas(context: CanvasLike, marks: readonly Mark[], view: Mat3): void {
  const scale = mat3.scaleFactor(view);
  for (const mark of marks) {
    context.save();
    context.globalAlpha = mark.opacity ?? 1;
    if (mark.kind === 'path') paintPath(context, mark, view, scale);
    else paintText(context, mark, view, scale);
    context.restore();
  }
}
