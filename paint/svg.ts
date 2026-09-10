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
import { mat3, type Transform2D } from '../values/mat3.js';
import { vec2 } from '../values/vec2.js';
import type { Bounds } from '../figure/bounds.js';
import { hexOf, type Colour } from '../values/colour.js';
import type { Fill, Mark, PathMark, TextMark } from '../figure/mark.js';
import type { Path } from '../figure/path.js';
import { outlinedMarks } from '../figure/outline.js';
import { widestWidth } from '../figure/width.js';
import { short } from './number.js';

/** One element, described rather than built, so the same description can be
 * written as text or made in a document and the two cannot drift. */
export interface SvgElement {
  tag: 'path' | 'text' | 'defs' | 'linearGradient' | 'stop' | 'clipPath' | 'rect';
  attributes: Record<string, string>;
  text?: string;
  /** The elements inside this one, which is how a gradient carries its stops and
   * a clip carries its rectangle. */
  children?: readonly SvgElement[];
}

/** One colour for each of the two grounds a sheet is read on. */
export interface SvgColour {
  light: string;
  dark: string;
}

/** A colour per ground for one CSS custom property. A mark painted with
 * `var(--name, colour)` takes the value of the ground it is read on, and the
 * colour written inside the `var()` is what it falls back to. */
export interface SvgTheme {
  [property: string]: SvgColour;
}

export interface SvgMarkupOptions {
  /** Written into the markup as a `<style>` element, so one file is read on a
   * light page and a dark one with no script and no page CSS. */
  theme?: SvgTheme;
  /**
   * What the sheet paints behind its own marks, one colour per ground.
   *
   * Inside an `<img>` the colour scheme query answers for the browser and not
   * for the page around it, so a dark half chosen on a light page lands on a
   * ground it was never measured against. A sheet that paints the ground it was
   * measured on holds its readings wherever it is shown.
   */
  ground?: SvgColour;
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
  /**
   * What every id written here begins with.
   *
   * A gradient and a clip are each named by an element carrying an id, and an id
   * is unique across a whole document rather than inside one figure. A mark's own id is already
   * unique inside its figure and stable frame to frame, so what is left is
   * telling two figures on one page apart, which is this. Two figures in one
   * document want different prefixes.
   */
  prefix?: string;
}

/** The `d` attribute: a move to the start, a cubic per segment, and a close
 * where the subpath joins back. */
export function pathToData(path: Path, view: Transform2D): string {
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

/**
 * The id of the element naming one mark's gradient.
 *
 * Every character an id may not carry is written as its own code point between
 * dashes, a literal dash included. Nothing is dropped and nothing is folded
 * together, so two mark ids that differ cannot arrive at one id here.
 */
function elementId(prefix: string, mark: string): string {
  return prefix + mark.replace(/[^A-Za-z0-9_]/g, (letter) => `-${letter.codePointAt(0)!.toString(16)}-`);
}

/**
 * One colour as this painter writes it: `var(--name, #rrggbb)` where the figure
 * gave it a name, and the hex alone where it did not.
 *
 * The channels are written into the `var()` as its fallback rather than left to
 * the page, so a sheet whose style element was stripped still draws the value
 * the figure shipped, and a page carrying the property overrides it.
 */
function colourPaint(colour: Colour): string {
  const hex = hexOf(colour);
  return colour.name === undefined ? hex : `var(--${colour.name}, ${hex})`;
}

/** What a fill is painted with: the element naming its stops where it has them,
 * and its one colour otherwise. */
function fillPaint(fill: Fill, mark: string, prefix: string): string {
  return fill.gradient ? `url(#${elementId(prefix, mark)})` : colourPaint(fill.colour);
}

/**
 * One mark's clip as the rectangle it is written out as, in the units painted
 * into.
 *
 * The rectangle is put through the same view the geometry is, and the corners
 * are taken lowest first afterwards: the view turns the y axis over, so the top
 * of the box in figure units is the smaller number on the surface and a width
 * worked out before the flip would come out negative.
 */
function clipRect(clip: Bounds, view: Transform2D): Record<string, string> {
  const one = mat3.transformPoint(view, vec2(clip.x.from, clip.y.from));
  const other = mat3.transformPoint(view, vec2(clip.x.to, clip.y.to));
  return {
    x: short(Math.min(one.x, other.x)),
    y: short(Math.min(one.y, other.y)),
    width: short(Math.abs(other.x - one.x)),
    height: short(Math.abs(other.y - one.y)),
  };
}

/**
 * The id of the element naming one clip, which is the rectangle's own four
 * numbers rather than the id of a mark that carries it.
 *
 * A gradient is named per mark because two marks rarely share an axis. A clip is
 * shared: every mark of an inset is cut to the one rectangle, so naming it per
 * mark writes that rectangle once for each of them. The numbers are what make
 * two marks with the same rectangle arrive at one id, and they are stable frame
 * to frame in the way a counter over the marks would not be.
 *
 * The dots and minus signs a number carries are both allowed inside an id, and
 * the prefix is what keeps it from starting with a digit.
 */
function clipId(prefix: string, rect: Record<string, string>): string {
  return `${prefix}clip-${rect.x}-${rect.y}-${rect.width}-${rect.height}`;
}

/**
 * Every gradient and every clip named once, inside the one `<defs>` the sheet
 * carries.
 *
 * Both are written in the units painted into rather than the figure's own, which
 * is what `userSpaceOnUse` means, so the same view that moved the geometry moves
 * them with it.
 */
function defsElement(marks: readonly Mark[], view: Transform2D, prefix: string): SvgElement | null {
  const named: SvgElement[] = [];
  const clips = new Set<string>();
  for (const mark of marks) {
    if (mark.clip) {
      const rect = clipRect(mark.clip, view);
      const id = clipId(prefix, rect);
      if (!clips.has(id)) {
        clips.add(id);
        named.push({
          tag: 'clipPath',
          attributes: { id, clipPathUnits: 'userSpaceOnUse' },
          children: [{ tag: 'rect', attributes: rect }],
        });
      }
    }
    const gradient = mark.kind === 'path' || mark.kind === 'text' ? mark.fill?.gradient : undefined;
    if (!gradient) continue;
    const from = mat3.transformPoint(view, gradient.from);
    const to = mat3.transformPoint(view, gradient.to);
    named.push({
      tag: 'linearGradient',
      attributes: {
        id: elementId(prefix, mark.id),
        gradientUnits: 'userSpaceOnUse',
        x1: short(from.x),
        y1: short(from.y),
        x2: short(to.x),
        y2: short(to.y),
      },
      children: gradient.stops.map((stop) => ({
        tag: 'stop' as const,
        attributes: { offset: short(stop.offset), 'stop-color': colourPaint(stop.colour) },
      })),
    });
  }
  return named.length > 0 ? { tag: 'defs', attributes: {}, children: named } : null;
}

function pathElement(mark: PathMark, view: Transform2D, scale: number, prefix: string): SvgElement {
  const attributes: Record<string, string> = {
    'data-mark': mark.id,
    d: pathToData(mark.path, view),
    fill: mark.fill ? fillPaint(mark.fill, mark.id, prefix) : 'none',
  };
  if (mark.fill?.rule === 'evenodd') attributes['fill-rule'] = 'evenodd';
  if (mark.stroke) {
    attributes.stroke = colourPaint(mark.stroke.colour);
    attributes['stroke-width'] = short(widestWidth(mark.stroke.width) * scale);
    if (mark.stroke.cap) attributes['stroke-linecap'] = mark.stroke.cap;
    if (mark.stroke.join) attributes['stroke-linejoin'] = mark.stroke.join;
    if (mark.stroke.dash) attributes['stroke-dasharray'] = mark.stroke.dash.map((run) => short(run * scale)).join(' ');
    if (mark.stroke.dashOffset !== undefined) attributes['stroke-dashoffset'] = short(mark.stroke.dashOffset * scale);
  }
  if (mark.opacity !== undefined && mark.opacity !== 1) attributes.opacity = short(mark.opacity);
  if (mark.clip) attributes['clip-path'] = `url(#${clipId(prefix, clipRect(mark.clip, view))})`;
  return { tag: 'path', attributes };
}

function textElement(mark: TextMark, view: Transform2D, scale: number, lift: number, prefix: string): SvgElement {
  const at = mat3.transformPoint(view, mark.at);
  const attributes: Record<string, string> = {
    'data-mark': mark.id,
    x: short(at.x),
    y: short(at.y),
    'font-family': mark.family,
    'font-size': short(mark.size * scale * lift),
    fill: fillPaint(mark.fill, mark.id, prefix),
  };
  if (mark.weight !== undefined) attributes['font-weight'] = String(mark.weight);
  if (mark.align) attributes['text-anchor'] = mark.align;
  if (mark.baseline) attributes['dominant-baseline'] = mark.baseline;
  if (mark.opacity !== undefined && mark.opacity !== 1) attributes.opacity = short(mark.opacity);
  if (mark.clip) attributes['clip-path'] = `url(#${clipId(prefix, clipRect(mark.clip, view))})`;
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

/** Every mark described as an element, in the order they are drawn, behind the
 * one `<defs>` holding whatever gradients and clips they name. */
export function svgElements(marks: readonly Mark[], view: Transform2D, options: SvgMarkupOptions = {}): SvgElement[] {
  const scale = mat3.scaleFactor(view);
  // A stroke of two widths is no attribute an element carries, so it arrives here
  // as the filled outline it is drawn as before any of it is written out.
  const drawn = outlinedMarks(marks);
  const lift = textLift(drawn, scale, options.minTextSize ?? 0);
  const prefix = options.prefix ?? '';
  const defs = defsElement(drawn, view, prefix);
  const elements = drawn.map((mark) =>
    mark.kind === 'path' ? pathElement(mark, view, scale, prefix) : textElement(mark, view, scale, lift, prefix)
  );
  return defs ? [defs, ...elements] : elements;
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
 * The theme and the ground as a `<style>` element, the light half on `:root` and
 * the dark one behind `prefers-color-scheme`.
 *
 * An entry whose name or either colour would need escaping is left out, which
 * leaves the mark on the colour written inside its own `var()` rather than on a
 * value that could close the element. A ground either colour of which would need
 * escaping is dropped whole, since half a ground is a sheet painted on white by
 * accident.
 */
function themeStyle(theme: SvgTheme | undefined, ground: SvgColour | undefined): string {
  const names = theme
    ? Object.keys(theme).filter(
        (name) => PROPERTY.test(name) && plainValue(theme[name].light) && plainValue(theme[name].dark)
      )
    : [];
  const painted = ground && plainValue(ground.light) && plainValue(ground.dark) ? ground : undefined;
  if (names.length === 0 && painted === undefined) return '';
  const block = (side: 'light' | 'dark') => {
    const properties = theme ? names.map((name) => `--${name}:${theme[name][side]}`) : [];
    return [...properties, ...(painted ? [`background:${painted[side]}`] : [])].join(';');
  };
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
  view: Transform2D,
  width: number,
  height: number,
  options: SvgMarkupOptions = {}
): string {
  const style = themeStyle(options.theme, options.ground);
  const written = (element: SvgElement): string => {
    const attributes = Object.entries(element.attributes)
      .map(([name, value]) => `${name}="${escaped(value)}"`)
      .join(' ');
    const open = attributes === '' ? element.tag : `${element.tag} ${attributes}`;
    if (element.children) return `<${open}>${element.children.map(written).join('')}</${element.tag}>`;
    if (element.text === undefined) return `<${open}/>`;
    return `<${open}>${escaped(element.text)}</${element.tag}>`;
  };
  const body = svgElements(marks, view, options).map(written).join('');
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
  /**
   * What a gradient's stops and a clip's rectangle are put inside.
   *
   * It is required rather than optional: a `<clipPath>` holding no `<rect>`
   * clips away everything that references it, so a target that could not hold a
   * child would lose every clipped mark rather than lose an effect on one.
   */
  append(...nodes: unknown[]): void;
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
  view: Transform2D,
  maker: ElementMaker<Made>,
  options: SvgMarkupOptions = {}
): void {
  const made = (element: SvgElement): Made => {
    const node = maker.createElementNS(SVG_NAMESPACE, element.tag);
    for (const [name, value] of Object.entries(element.attributes)) node.setAttribute(name, value);
    if (element.children) for (const child of element.children) node.append(made(child));
    else if (element.text !== undefined) node.textContent = element.text;
    return node;
  };
  into.replaceChildren(...svgElements(marks, view, options).map(made));
}
