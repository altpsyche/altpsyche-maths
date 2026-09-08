/**
 * The tree an author builds, and the flat list a painter is given.
 *
 * The two are different on purpose. A tree is how a picture is written, with a
 * group carrying a transform and a style its children inherit. A flat list is
 * how a picture is drawn, compared and hit tested, with nothing left to inherit
 * and nothing left to walk.
 */
import { mat3, type Mat3 } from '../values/mat3.js';
import { transformPath } from './path.js';
import type { Path } from './path.js';
import { vec2, type Vec2 } from '../values/vec2.js';
import type { Fill, Mark, Stroke } from './mark.js';

/** What a group hands down and a child may override. */
export interface Style {
  fill?: Fill;
  stroke?: Stroke;
  opacity?: number;
  family?: string;
  weight?: number;
}

interface Named {
  /** Its own name among its siblings. The id a mark carries is the names on the
   * way down joined together. */
  name: string;
}

export interface ShapeNode extends Named, Style {
  kind: 'shape';
  path: Path;
}

export interface TextNode extends Named, Style {
  kind: 'text';
  at: Vec2;
  /** One line, or several separated by a newline. A mark never carries a
   * newline: the tree is flattened into one text mark per line. */
  text: string;
  size: number;
  /** How far apart two baselines sit, in the same units as the size. Left out,
   * it is `LEADING` times the size. */
  leading?: number;
  align?: 'start' | 'middle' | 'end';
  baseline?: 'alphabetic' | 'middle' | 'hanging';
}

export interface GroupNode extends Named {
  kind: 'group';
  transform?: Mat3;
  style?: Style;
  children: readonly Node[];
}

export type Node = ShapeNode | TextNode | GroupNode;

export function shape(name: string, path: Path, style: Style = {}): ShapeNode {
  return { kind: 'shape', name, path, ...style };
}

/** What a text node takes beyond a shared style, which is where it sits against
 * its own anchor point rather than anything a group can hand down. */
export type TextOptions = Style & Pick<TextNode, 'align' | 'baseline' | 'leading'>;

export function text(name: string, at: Vec2, content: string, size: number, options: TextOptions = {}): TextNode {
  return { kind: 'text', name, at, text: content, size, ...options };
}

export function group(name: string, children: readonly Node[], options: { transform?: Mat3; style?: Style } = {}): GroupNode {
  return { kind: 'group', name, children, transform: options.transform, style: options.style };
}

/** The font a text mark falls back to when no group above it named one. Both
 * painters need a family by name, and neither has a sensible default. */
const DEFAULT_FAMILY = 'sans-serif';

/** How far apart two baselines sit against the size, when a text node names no
 * leading of its own. Six fifths is the distance a line of type is set at when
 * nothing asks for more air. */
export const LEADING = 1.2;

function inherited(parent: Style, own: Style): Style {
  return {
    fill: own.fill ?? parent.fill,
    stroke: own.stroke ?? parent.stroke,
    family: own.family ?? parent.family,
    weight: own.weight ?? parent.weight,
    opacity: (parent.opacity ?? 1) * (own.opacity ?? 1),
  };
}

/**
 * Sibling names made unique, so two shapes called the same thing do not become
 * one id.
 *
 * A repeated name gets a number rather than an error, because a figure built in
 * a loop names its parts the same way on purpose and the author still needs the
 * ids to be stable frame to frame. Counting per parent keeps them stable: the
 * same tree gives the same ids every time.
 */
function uniqueNames(children: readonly Node[]): string[] {
  const seen = new Map<string, number>();
  return children.map((child) => {
    const count = seen.get(child.name) ?? 0;
    seen.set(child.name, count + 1);
    return count === 0 ? child.name : `${child.name}#${count + 1}`;
  });
}

function walk(node: Node, prefix: string, transform: Mat3, style: Style, into: Mark[]): void {
  const id = prefix === '' ? node.name : `${prefix}/${node.name}`;

  if (node.kind === 'group') {
    const next = node.transform ? mat3.multiply(transform, node.transform) : transform;
    const handed = inherited(style, node.style ?? {});
    const names = uniqueNames(node.children);
    node.children.forEach((child, at) => walk({ ...child, name: names[at] }, id, next, handed, into));
    return;
  }

  const settled = inherited(style, node);
  const opacity = settled.opacity ?? 1;
  // A group that scales makes the lines inside it thicker, the way it makes everything else bigger,
  // so the width goes through the transform the geometry did rather than staying as it was typed.
  const scale = mat3.scaleFactor(transform);

  if (node.kind === 'shape') {
    if (!settled.fill && !settled.stroke) return;
    into.push({
      kind: 'path',
      id,
      path: transformPath(node.path, transform),
      fill: settled.fill,
      stroke: settled.stroke ? { ...settled.stroke, width: settled.stroke.width * scale } : undefined,
      opacity,
    });
    return;
  }

  const fill = settled.fill;
  if (!fill) return;
  // The drop between baselines is taken in the node's own space and then
  // transformed, so a rotated or scaled group carries its lines with it.
  const lines = node.text.split('\n');
  const leading = node.leading ?? LEADING * node.size;
  lines.forEach((line, at) => {
    into.push({
      kind: 'text',
      id: lines.length === 1 ? id : `${id}/${at}`,
      at: mat3.transformPoint(transform, vec2(node.at.x, node.at.y - at * leading)),
      text: line,
      size: node.size * scale,
      family: settled.family ?? DEFAULT_FAMILY,
      weight: settled.weight,
      align: node.align,
      baseline: node.baseline,
      fill,
      opacity,
    });
  });
}

/**
 * The tree resolved into the list a painter draws.
 *
 * A shape with neither a fill nor a stroke is left out rather than emitted
 * invisible, and so is a text with no fill. An invisible mark still costs a
 * painter an element and still turns up in a comparison between two frames as
 * something that changed, so a picture that draws nothing should be a list with
 * nothing in it.
 */
export function flatten(root: Node, transform: Mat3 = mat3.IDENTITY, style: Style = {}): readonly Mark[] {
  const marks: Mark[] = [];
  walk(root, '', transform, style, marks);
  return marks;
}
