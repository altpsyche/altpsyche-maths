/**
 * One drawn item, resolved: its geometry is in the figure's own units with every
 * transform already applied, and its style is settled rather than inherited.
 *
 * What a mark may ask for is the intersection of what an SVG element and a
 * two-dimensional canvas can both do, rather than the union. A figure reaching
 * for something only one of them has would look right on the page and lose it
 * without a word in a recording, which is the worst way to find out. So there
 * are no filters and no blend modes here, and adding one means adding it to
 * both painters in the same change.
 *
 * A clip is a rectangle and no other shape. An arbitrary path clip is a stencil
 * on a card and needs a winding number counted, where a box is the scissor test
 * every device already has, so a rectangle is the shape all three painters draw
 * and the type is what keeps a figure from asking for the other one.
 *
 * A gradient is refused for a different reason, since both painters draw one.
 * SVG names a gradient with an element carrying an id and a canvas names it with
 * an object built from the context, and a colour here is text that both take as
 * it stands.
 */
import type { CurveName } from '../values/ease.js';
import type { Vec2 } from '../values/vec2.js';
import type { Bounds } from './bounds.js';
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

/** One colour of a gradient and where along its axis that colour sits, from
 * nothing at the start of the axis to one at its end. */
export interface Stop {
  offset: number;
  colour: Colour;
}

/**
 * A run of colours along a straight axis, given as two points in the mark's own
 * units.
 *
 * The axis is a pair of points rather than an angle and a length, because both
 * painters take it that way: an SVG element carries the two ends and a canvas
 * context is handed them as four numbers. Being in the mark's own units is what
 * lets a group's transform carry the axis with the shape it fills.
 */
export interface Gradient {
  from: Vec2;
  to: Vec2;
  /** In the order they are painted, from the start of the axis to its end. */
  stops: readonly Stop[];
}

export interface Fill {
  /** The one colour this fill has, which is what anything needing a single
   * colour reads, a contrast reading included. */
  colour: Colour;
  /** The stops this fill is painted with, where it is painted with more than one
   * colour. A fill carrying one is drawn as the gradient rather than as the
   * colour beside it. */
  gradient?: Gradient;
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
  /**
   * The rectangle this mark is drawn inside, in the figure's own units, with
   * everything of it outside that rectangle cut away.
   *
   * It is in the figure's units rather than the mark's own, which is the one
   * place a mark departs from carrying its geometry through every transform
   * above it. A transform that turns takes a rectangle to a shape with corners
   * off the axes, and that shape is the path clip no device draws, so a clip
   * that rode the transform down would be a rectangle only until a group turned.
   */
  clip?: Bounds;
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
