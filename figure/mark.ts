/**
 * A mark is what one node becomes at one time. Its geometry is measured in the
 * figure's own units with every transform applied, and its style is settled
 * rather than inherited.
 *
 * What a mark may ask for was once the intersection of what an SVG element and a
 * two-dimensional canvas can both do, so that a figure could not reach for
 * something one painter has and lose it without a word in another. A figure now
 * names the painters that may draw it instead, which keeps that purpose and lets
 * a mark ask for what one painter has: a painter not named refuses the figure
 * rather than drawing it wrongly. There are still no filters and no blend modes
 * here, since no figure has asked for one.
 *
 * A clip is a rectangle and no other shape. An arbitrary path clip is a stencil
 * on a card and needs a winding number counted, where a box is the scissor test
 * every device already has, so a rectangle is the shape all three painters draw
 * and the type is what keeps a figure from asking for the other one.
 *
 * A gradient is refused for a different reason, since both painters draw one.
 * SVG names a gradient with an element with an id and a canvas names it with
 * an object built from the context, and a colour here is four channels each
 * painter writes in its own text.
 */
import type { Colour } from '../values/colour.js';
import type { CurveName } from '../values/ease.js';
import type { Vec2 } from '../values/vec2.js';
import type { Bounds } from './bounds.js';
import type { Path } from './path.js';

export type { Colour };

/**
 * A width that changes along the length of a stroke.
 *
 * The width leaves the first number for the second along the named curve, read
 * at the fraction of the whole path's length rather than of the piece it falls
 * in, which is the measure a path is trimmed by as well. A curve is named
 * rather than passed, because a figure written as a file stores a name and
 * cannot store a function.
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
 * painters take it that way: an SVG element stores the two ends and a canvas
 * context is handed them as four numbers. Being in the mark's own units is what
 * lets a group's transform move the axis with the shape it fills.
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
   * colour. A fill with one is drawn as the gradient rather than as the
   * colour beside it. */
  gradient?: Gradient;
  /** How the inside of a shape that crosses itself is found. Both painters
   * support both rules under different names. */
  rule?: 'nonzero' | 'evenodd';
}

/**
 * How far a mark is from the eye, as a function of where on the page it is being
 * drawn.
 *
 * The depth at the page point (x, y) is a·x + b·y + c, and the mark with the
 * smaller depth there is the nearer one. Three numbers state it exactly because a
 * mark in space is a flat piece of the world: the depth of a plane is an affine
 * function of the page under a parallel projection, and under a perspective
 * projection the reciprocal of that depth is, which is the quantity a card
 * interpolates across a triangle. Under a perspective projection the value is the
 * negative of that reciprocal, which is what keeps the smaller number the nearer
 * mark under both projections.
 */
export interface Depth {
  a: number;
  b: number;
  c: number;
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
   * How far this mark is from the eye across the page, absent on every mark a
   * flat figure draws.
   *
   * Where two marks with one overlap, the nearer of the two at a point is
   * drawn over the further one there, whatever order the list gives. Where one
   * of the two has none, and where both are at the same depth, the order of
   * the list places them instead.
   */
  depth?: Depth;
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
