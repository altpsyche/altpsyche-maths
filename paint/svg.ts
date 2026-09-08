/**
 * Marks written as SVG, which is what a figure on a page is.
 *
 * SVG is the painter for the page and not for a recording, and the reasons are
 * things this project has already paid for. A screenshot sweep paints its mask
 * over a whole canvas and is blind inside it, where SVG is in the document and
 * the sweep reads the real thing. Text is text, so a screen reader gets it. CSS
 * custom properties reach it, so a figure follows a theme with nothing watching.
 * And the markup can be written without a browser, so a still frame ships inside
 * a page before any script runs.
 *
 * The view is baked into the coordinates rather than put on a wrapping group. A
 * group transform would be shorter markup and it flips text: the view turns the
 * y axis over, and a mirrored transform mirrors the letters with it.
 */
import { mat3, type Mat3 } from '../values/mat3.js';
import type { Mark, PathMark, TextMark } from '../figure/mark.js';
import type { Path } from '../figure/path.js';
import { short } from './number.js';

/** One element, described rather than built, so the same description can be
 * written as text or made in a document and the two cannot drift. */
export interface SvgElement {
  tag: 'path' | 'text';
  attributes: Record<string, string>;
  text?: string;
}

/** A colour per ground for one CSS custom property. A mark painted with
 * `var(--name, colour)` takes the value of the ground it is read on, and the
 * colour written inside the `var()` is what it falls back to. */
export interface SvgTheme {
  [property: string]: { light: string; dark: string };
}

export interface SvgMarkupOptions {
  /** Written into the markup as a `<style>` element, so one file is read on a
   * light page and a dark one with no script and no page CSS. */
  theme?: SvgTheme;
  /**
   * The smallest font size written, in the units painted into rather than in
   * figure units. A view that fits a wide extent scales every figure unit down,
   * so a glyph readable in one frame is not readable in a row of them.
   *
   * Every text size is multiplied by the one factor that brings the smallest of
   * them to this, which holds the sizes in the ratios the figure gave them.
   * Raising each size on its own to the floor would flatten two sizes that both
   * fall under it into one.
   */
  minTextSize?: number;
}

/** The `d` attribute: a move to the start, a cubic per segment, and a close
 * where the subpath joins back. */
export function pathToData(path: Path, view: Mat3): string {
  const parts: string[] = [];
  for (const subpath of path) {
    const start = mat3.transformPoint(view, subpath.start);
    parts.push(`M${short(start.x)} ${short(start.y)}`);
    for (const curve of subpath.curves) {
      const c1 = mat3.transformPoint(view, curve.control1);
      const c2 = mat3.transformPoint(view, curve.control2);
      const to = mat3.transformPoint(view, curve.to);
      parts.push(`C${short(c1.x)} ${short(c1.y)} ${short(c2.x)} ${short(c2.y)} ${short(to.x)} ${short(to.y)}`);
    }
    if (subpath.closed) parts.push('Z');
  }
  return parts.join('');
}

function pathElement(mark: PathMark, view: Mat3, scale: number): SvgElement {
  const attributes: Record<string, string> = {
    'data-mark': mark.id,
    d: pathToData(mark.path, view),
    fill: mark.fill ? mark.fill.colour : 'none',
  };
  if (mark.fill?.rule === 'evenodd') attributes['fill-rule'] = 'evenodd';
  if (mark.stroke) {
    attributes.stroke = mark.stroke.colour;
    attributes['stroke-width'] = short(mark.stroke.width * scale);
    if (mark.stroke.cap) attributes['stroke-linecap'] = mark.stroke.cap;
    if (mark.stroke.join) attributes['stroke-linejoin'] = mark.stroke.join;
    if (mark.stroke.dash) attributes['stroke-dasharray'] = mark.stroke.dash.map((run) => short(run * scale)).join(' ');
    if (mark.stroke.dashOffset !== undefined) attributes['stroke-dashoffset'] = short(mark.stroke.dashOffset * scale);
  }
  if (mark.opacity !== undefined && mark.opacity !== 1) attributes.opacity = short(mark.opacity);
  return { tag: 'path', attributes };
}

function textElement(mark: TextMark, view: Mat3, scale: number, lift: number): SvgElement {
  const at = mat3.transformPoint(view, mark.at);
  const attributes: Record<string, string> = {
    'data-mark': mark.id,
    x: short(at.x),
    y: short(at.y),
    'font-family': mark.family,
    'font-size': short(mark.size * scale * lift),
    fill: mark.fill.colour,
  };
  if (mark.weight !== undefined) attributes['font-weight'] = String(mark.weight);
  if (mark.align) attributes['text-anchor'] = mark.align;
  if (mark.baseline) attributes['dominant-baseline'] = mark.baseline;
  if (mark.opacity !== undefined && mark.opacity !== 1) attributes.opacity = short(mark.opacity);
  return { tag: 'text', attributes, text: mark.text };
}

/**
 * What every text size is multiplied by so the smallest of them reaches the
 * floor, or one where they already do and where no text is drawn at all.
 */
function textLift(marks: readonly Mark[], scale: number, floor: number): number {
  if (floor <= 0) return 1;
  const written = marks.filter((mark) => mark.kind === 'text').map((mark) => mark.size * scale);
  const smallest = Math.min(...written.filter((size) => size > 0));
  if (!Number.isFinite(smallest)) return 1;
  return Math.max(1, floor / smallest);
}

/** Every mark described as an element, in the order they are drawn. */
export function svgElements(marks: readonly Mark[], view: Mat3, options: SvgMarkupOptions = {}): SvgElement[] {
  const scale = mat3.scaleFactor(view);
  const lift = textLift(marks, scale, options.minTextSize ?? 0);
  return marks.map((mark) =>
    mark.kind === 'path' ? pathElement(mark, view, scale) : textElement(mark, view, scale, lift)
  );
}

/** The five characters that would otherwise close a tag or open an entity. */
function escaped(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const PROPERTY = /^[A-Za-z0-9_-]+$/;

/** A value safe to write between `<style>` tags: no delimiter that would end the
 * declaration or the element. */
function plainValue(value: string): boolean {
  return !/[<>&{};"]/.test(value);
}

/**
 * The theme as a `<style>` element, the light ground on `:root` and the dark one
 * behind `prefers-color-scheme`.
 *
 * An entry whose name or either colour would need escaping is left out, which
 * leaves the mark on the colour written inside its own `var()` rather than on a
 * value that could close the element.
 */
function themeStyle(theme: SvgTheme): string {
  const names = Object.keys(theme).filter(
    (name) => PROPERTY.test(name) && plainValue(theme[name].light) && plainValue(theme[name].dark)
  );
  if (names.length === 0) return '';
  const block = (ground: 'light' | 'dark') => names.map((name) => `--${name}:${theme[name][ground]}`).join(';');
  return `<style>:root{${block('light')}}@media(prefers-color-scheme:dark){:root{${block('dark')}}}</style>`;
}

/**
 * A whole `<svg>` as text, for a page that has not run any script yet.
 *
 * It carries no width or height of its own and only a view box, so the element
 * around it decides how big it is and the picture stays where it was put.
 */
export function svgMarkup(
  marks: readonly Mark[],
  view: Mat3,
  width: number,
  height: number,
  options: SvgMarkupOptions = {}
): string {
  const style = options.theme ? themeStyle(options.theme) : '';
  const body = svgElements(marks, view, options)
    .map((element) => {
      const attributes = Object.entries(element.attributes)
        .map(([name, value]) => `${name}="${escaped(value)}"`)
        .join(' ');
      if (element.text === undefined) return `<${element.tag} ${attributes}/>`;
      return `<${element.tag} ${attributes}>${escaped(element.text)}</${element.tag}>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${short(width)} ${short(height)}">${style}${body}</svg>`;
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * Only what a painter needs from a document, named here rather than taken from
 * the DOM types, so this package declares no browser library at all: it can be
 * checked and tested without one, and a caller can hand in a stand-in.
 *
 * The element a maker makes is the element the target is handed, and that type
 * travels through rather than being flattened to the two members named below. An
 * element in a real document takes whole nodes and text where the painter's own
 * type takes neither, so a target written in terms of the painter's type is a
 * target no real element can be: what a document offers and what the painter
 * would ask for are each missing something the other has, and neither signature
 * is assignable to the other in either direction.
 */
export interface PaintNode {
  setAttribute(name: string, value: string): void;
  textContent: string | null;
}

export interface PaintTarget<Made extends PaintNode = PaintNode> {
  replaceChildren(...nodes: Made[]): void;
}

export interface ElementMaker<Made extends PaintNode = PaintNode> {
  createElementNS(namespace: string, tag: string): Made;
}

/**
 * The marks put into an element that is already on the page.
 *
 * Every child is replaced rather than matched up and patched. A figure rebuilds
 * its geometry every frame, so almost every attribute would be rewritten anyway,
 * and matching them up first would cost more than it saved while adding a way for
 * two frames to disagree.
 */
export function paintSvg<Made extends PaintNode>(
  // The maker alone says what kind of element this is: read from the target as well, a real element
  // would offer the whole union its own call accepts, which is not one this painter can write to.
  into: PaintTarget<NoInfer<Made>>,
  marks: readonly Mark[],
  view: Mat3,
  maker: ElementMaker<Made>,
  options: SvgMarkupOptions = {}
): void {
  const elements = svgElements(marks, view, options);
  into.replaceChildren(
    ...elements.map((element) => {
      const node = maker.createElementNS(SVG_NAMESPACE, element.tag);
      for (const [name, value] of Object.entries(element.attributes)) node.setAttribute(name, value);
      if (element.text !== undefined) node.textContent = element.text;
      return node;
    })
  );
}
