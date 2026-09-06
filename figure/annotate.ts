/**
 * The shapes an annotation is made of, composed from marks rather than being
 * marks of their own.
 *
 * Each one hands back a group, so an arrow is a shaft and a head with ids of
 * their own and an animation naming the arrow reaches both. Making an arrow a
 * single mark instead would mean one path that is stroked along its shaft and
 * filled at its head, and no mark can be both.
 */
import { vec2, type Vec2 } from '../values/vec2.js';
import { circle, line, polygon } from './path.js';
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
 */
export function arrow(name: string, from: Vec2, to: Vec2, options: ArrowOptions): GroupNode {
  const head = options.head ?? options.stroke.width * 4;
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
