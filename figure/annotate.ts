/**
 * The shapes an annotation is made of, composed from marks rather than being
 * marks of their own.
 *
 * A builder hands back a group, so an arrow is a shaft and a head with ids of
 * their own and an animation naming the arrow reaches both. Making an arrow a
 * single mark instead would mean one path that is stroked along its shaft and
 * filled at its head, and no mark can be both. `bracePath` is the one call here
 * that hands back a path, for a figure that wants the outline and not the group.
 */
import { vec2, type Vec2 } from '../values/vec2.js';
import { circle, line, polygon, straight, type Cubic, type Path } from './path.js';
import { group, shape, text, type GroupNode, type Style, type TextOptions } from './node.js';
import type { Fill, Stroke } from './mark.js';

export interface ArrowOptions {
  stroke: Stroke;
  /** Filled with the shaft's own colour unless a figure asks for another. */
  fill?: Fill;
  /**
   * How long the head is, in figure units. Four times the shaft's width by
   * default, which keeps a head in proportion to its line at any size, since
   * both are in figure units and scale together.
   */
  head?: number;
  /** How wide the head is across its base, against its length. */
  spread?: number;
}

/**
 * A line with a head at the far end.
 *
 * The shaft stops where the head begins rather than running under it, because a
 * shaft drawn to the point shows through a head that is not fully opaque.
 *
 * The head is never longer than the arrow. A head longer than that puts its own
 * base behind the tail, which draws the shaft pointing back the way it came.
 */
export function arrow(name: string, from: Vec2, to: Vec2, options: ArrowOptions): GroupNode {
  const head = Math.min(options.head ?? options.stroke.width * 4, vec2.distance(from, to));
  const spread = options.spread ?? 0.6;
  const along = vec2.normalize(vec2.sub(to, from));
  const base = vec2.sub(to, vec2.scale(along, head));
  const across = vec2.scale(vec2.perpendicular(along), (head * spread) / 2);
  const fill = options.fill ?? { colour: options.stroke.colour };
  return group(name, [
    shape('shaft', line(from, base), { stroke: options.stroke }),
    shape('head', polygon([to, vec2.add(base, across), vec2.sub(base, across)]), { fill }),
  ]);
}

/** A filled disc, which is what marks a place a line is pointing at. */
export function dot(name: string, at: Vec2, radius: number, fill: Fill): GroupNode {
  return group(name, [shape('disc', circle(at, radius), { fill })]);
}

export interface BraceOptions {
  /** How far the tip stands off the line between the two points, in figure
   * units. A negative depth puts the brace on the other side of that line. */
  depth: number;
  /**
   * How wide the curl at each end and at the tip is, in figure units. Half the
   * depth unless named, which is the curl a quarter circle gives, and never more
   * than a quarter of the span, since two curls wider than that would cross.
   */
  curl?: number;
}

/** The control distance a quarter circle wants, which is what makes each curl of
 * a brace an arc rather than a corner rounded by eye. */
const QUARTER = (4 / 3) * (Math.SQRT2 - 1);

/**
 * A curly brace from one point to the other, with its tip standing off the line
 * between them.
 *
 * It is one open subpath of six pieces: a curl out of each end, a run along at
 * the curl's own height, and two curls meeting at the tip. The tip is a corner
 * rather than a smooth turn, which is what a brace has and what says which point
 * of it is being pointed at.
 *
 * The tip stands at the depth asked for whatever the span, and only the curl
 * narrows when the span is short, so a brace between two close points is a
 * shallower shape rather than one whose halves cross.
 */
export function bracePath(from: Vec2, to: Vec2, options: BraceOptions): Path {
  const span = vec2.distance(from, to);
  if (span === 0) return [];
  const along = vec2.normalize(vec2.sub(to, from));
  const out = vec2.perpendicular(along);
  const depth = options.depth;
  const curl = Math.min(Math.abs(options.curl ?? depth / 2), span / 4);
  const rise = Math.sign(depth || 1) * curl;
  const at = (forward: number, off: number) => vec2.add(from, vec2.add(vec2.scale(along, forward), vec2.scale(out, off)));

  const shoulder = at(curl, rise);
  const beforeTip = at(span / 2 - curl, rise);
  const tip = at(span / 2, depth);
  const afterTip = at(span / 2 + curl, rise);
  const beyond = at(span - curl, rise);
  const reach = QUARTER * curl;
  const lift = QUARTER * (depth - rise);
  const piece = (control1: Vec2, control2: Vec2, end: Vec2): Cubic => ({ control1, control2, to: end });

  return [
    {
      start: from,
      curves: [
        piece(vec2.add(from, vec2.scale(out, rise * QUARTER)), vec2.sub(shoulder, vec2.scale(along, reach)), shoulder),
        straight(shoulder, beforeTip),
        piece(vec2.add(beforeTip, vec2.scale(along, reach)), vec2.sub(tip, vec2.scale(out, lift)), tip),
        piece(vec2.sub(tip, vec2.scale(out, lift)), vec2.sub(afterTip, vec2.scale(along, reach)), afterTip),
        straight(afterTip, beyond),
        piece(vec2.add(beyond, vec2.scale(along, reach)), vec2.add(to, vec2.scale(out, rise * QUARTER)), to),
      ],
      closed: false,
    },
  ];
}

export interface BracedOptions extends BraceOptions {
  stroke: Stroke;
  fill: Fill;
  size: number;
  /** How far beyond the tip the label's anchor sits, in figure units. */
  padding?: number;
  align?: TextOptions['align'];
  baseline?: TextOptions['baseline'];
  family?: string;
  weight?: number;
}

/**
 * A brace with a word on it, placed beyond the tip on the far side from the two
 * points.
 *
 * The label is anchored and never measured. Nothing about a figure's layout may
 * depend on how wide some text is, because the width depends on which fonts the
 * machine has and a box sized to fit a label would be a different box on two
 * machines.
 */
export function brace(name: string, from: Vec2, to: Vec2, content: string, options: BracedOptions): GroupNode {
  const path = bracePath(from, to, options);
  const padding = options.padding ?? Math.abs(options.depth) / 2;
  const out = vec2.perpendicular(vec2.normalize(vec2.sub(to, from)));
  const middle = vec2.lerp(from, to, 0.5);
  const at = vec2.add(middle, vec2.scale(out, options.depth + Math.sign(options.depth || 1) * padding));
  const style: Style = { fill: options.fill, family: options.family, weight: options.weight };
  return group(name, [
    shape('brace', path, { stroke: options.stroke }),
    text('word', at, content, options.size, {
      ...style,
      align: options.align ?? 'middle',
      baseline: options.baseline ?? 'middle',
    }),
  ]);
}

export interface CalloutOptions {
  stroke: Stroke;
  fill: Fill;
  size: number;
  /** The disc left on the thing being named. Nothing is drawn where this is zero,
   * which is what a callout pointing at a moving thing wants. */
  marker?: number;
  align?: TextOptions['align'];
  baseline?: TextOptions['baseline'];
  family?: string;
  weight?: number;
}

/**
 * A word attached to a place: a disc on the place, a line out to where there is
 * room, and the word at the end of it.
 *
 * This is the annotation a figure over a shader is made of. The words sit away
 * from what they name because a label on top of the picture hides the thing the
 * reader was told to look at.
 */
export function callout(name: string, at: Vec2, to: Vec2, content: string, options: CalloutOptions): GroupNode {
  const marker = options.marker ?? options.stroke.width * 2;
  const style: Style = { fill: options.fill, family: options.family, weight: options.weight };
  const parts = [
    shape('leader', line(at, to), { stroke: options.stroke }),
    text('word', to, content, options.size, { ...style, align: options.align, baseline: options.baseline }),
  ];
  if (marker > 0) parts.unshift(shape('marker', circle(at, marker), { fill: options.fill }));
  return group(name, parts);
}
