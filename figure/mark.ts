/**
 * One drawn item, resolved: its geometry is in the figure's own units with every
 * transform already applied, and its style is settled rather than inherited.
 *
 * What a mark may ask for is the intersection of what an SVG element and a
 * two-dimensional canvas can both do, rather than the union. A figure reaching
 * for something only one of them has would look right on the page and lose it
 * without a word in a recording, which is the worst way to find out. So there
 * are no filters, no blend modes and no clipping here, and adding one means
 * adding it to both painters in the same change.
 *
 * A gradient is refused for a different reason, since both painters draw one.
 * SVG names a gradient with an element carrying an id and a canvas names it with
 * an object built from the context, and a colour here is text that both take as
 * it stands.
 */
import type { CurveName } from '../values/ease.js';
import type { Vec2 } from '../values/vec2.js';
import type { Path } from './path.js';

/** A colour either painter accepts, which is any CSS colour written as text. A
 * figure is handed these in a palette rather than reading them from a page. */
export type Colour = string;

/**
 * A width that changes along the length of a stroke.
 *
 * The width leaves the first number for the second along the named curve, read
 * at the fraction of the whole path's length rather than of the piece it falls
 * in, which is the measure a path is trimmed by as well. A curve is named
 * rather than passed, because a figure written as a file carries a name and
 * cannot carry a function.
 */
export interface Taper {
  /** The width where the path starts, in figure units. */
  from: number;
  /** The width where the path ends. */
  to: number;
  /** The curve the width leaves the first number along. Left out, it is
   * `linear`. */
  curve?: CurveName;
}

/** What a stroke's width may be: one number the whole way, or a taper. A
 * tapered stroke is drawn as the filled outline of its own path, since neither
 * painter strokes at two widths. */
export type Width = number | Taper;

export interface Stroke {
  colour: Colour;
  /** In figure units, scaled with everything else, so a line reads the same
   * weight at every size the figure is drawn at. */
  width: Width;
  cap?: 'butt' | 'round' | 'square';
  join?: 'miter' | 'round' | 'bevel';
  /** Lengths of the drawn and undrawn runs, in figure units. */
  dash?: readonly number[];
  dashOffset?: number;
}

export interface Fill {
  colour: Colour;
  /** How a shape that crosses itself decides what is inside. Both painters
   * carry both answers under different names. */
  rule?: 'nonzero' | 'evenodd';
}

interface Common {
  /**
   * Stable across frames, and built from the names on the way down the tree.
   *
   * Hit testing reads the flat list rather than walking the tree again, and
   * comparing one frame against another needs to know which mark is which, so
   * an id that changed between frames would make both impossible.
   */
  id: string;
  opacity?: number;
}

export interface PathMark extends Common {
  kind: 'path';
  path: Path;
  fill?: Fill;
  stroke?: Stroke;
}

export interface TextMark extends Common {
  kind: 'text';
  at: Vec2;
  text: string;
  /** In figure units, like a stroke width. */
  size: number;
  family: string;
  weight?: number;
  /** Which end of the text sits at the anchor point. */
  align?: 'start' | 'middle' | 'end';
  /** Where the anchor point sits against the line of text. */
  baseline?: 'alphabetic' | 'middle' | 'hanging';
  fill: Fill;
}

export type Mark = PathMark | TextMark;
