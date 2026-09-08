/**
 * The tree an author builds, written as data rather than as calls.
 *
 * A record is a kind, a name and its parameters, and a group's children are
 * records. `shape`, `text` and `group` are the three kinds the tree itself has,
 * and every other kind resolves into a tree of those three, so `resolveNode`
 * hands back the `Node` that `flatten` already walks and nothing below that line
 * moves.
 *
 * A record carries no functions, which is the whole point of it: the same tree
 * survives being written to a file and read back. What a record does not yet
 * carry is a path as data, since a path has a written form of its own that
 * arrives with the named forms, so a shape record holds resolved geometry.
 *
 * Text is the one kind whose parameter is not a value the format already has. A
 * drawn string is a word beside a formatted number and the expression form is
 * over numbers and points alone, so a text record's content is a template with
 * numbered holes and one expression per hole, each hole carrying the precision
 * it is written to.
 */
import type { Mat3 } from '../values/mat3.js';
import type { Vec2 } from '../values/vec2.js';
import type { Path } from './path.js';
import { group, shape, text, type Node, type Style, type TextOptions } from './node.js';
import { evaluate, type Bindings, type Expression } from './expression.js';
import { labelFor } from './ticks.js';

/** One number written into a template, and how it is written. */
export interface TextHole {
  readonly value: Expression;
  /** The step the number is rounded and padded to, the way a tick's label takes
   * one, so a hole following a track keeps its width as the number moves. */
  readonly precision: number;
}

/** Text with numbered holes, `{0}` for the first hole and `{1}` for the second.
 * `{{` writes one brace, which is what leaves a set in braces writable. */
export interface TextTemplate {
  readonly template: string;
  readonly holes: readonly TextHole[];
}

/** What a text record draws. A string with no holes is written as itself, which
 * keeps the common case one value rather than a record wrapping one value. */
export type TextContent = string | TextTemplate;

export interface ShapeRecord {
  readonly kind: 'shape';
  readonly name: string;
  readonly path: Path;
  readonly style?: Style;
}

export interface TextRecord {
  readonly kind: 'text';
  readonly name: string;
  readonly at: Vec2;
  readonly content: TextContent;
  readonly size: number;
  readonly options?: TextOptions;
}

export interface GroupRecord {
  readonly kind: 'group';
  readonly name: string;
  readonly children: readonly NodeRecord[];
  readonly transform?: Mat3;
  readonly style?: Style;
}

export type NodeRecord = ShapeRecord | TextRecord | GroupRecord;

/** A hole and everything up to it, or a doubled brace. The alternation is
 * ordered so `{{0}` reads as a brace before a hole rather than as a hole. */
const HOLE = /\{\{|\{(\d+)\}/g;

/**
 * A template with its holes filled, each hole written to its own precision.
 *
 * A hole naming an index the list has no entry for is refused rather than left
 * standing, since a template short of a hole would otherwise draw its own
 * notation into the picture.
 */
export function writeTemplate(content: TextContent, bindings: Bindings = {}): string {
  if (typeof content === 'string') return content;
  return content.template.replace(HOLE, (whole, digits: string | undefined) => {
    if (digits === undefined) return '{';
    const at = Number(digits);
    const hole = content.holes[at];
    if (!hole) throw new Error(`the template asks for hole ${at} and carries ${content.holes.length}`);
    const value = evaluate(hole.value, bindings);
    if (typeof value !== 'number') {
      throw new Error(`hole ${at} is a number and was given ${typeof value === 'boolean' ? 'a true or false' : 'a point'}`);
    }
    return labelFor(value, hole.precision);
  });
}

/**
 * A record walked into the node it describes.
 *
 * The bindings reach the text holes and nothing else, because the holes are the
 * only expressions a node record carries. Everything else in a record is already
 * a value, so resolving a fixed tree needs no bindings at all.
 */
export function resolveNode(record: NodeRecord, bindings: Bindings = {}): Node {
  if (record.kind === 'shape') return shape(record.name, record.path, record.style);
  if (record.kind === 'text') {
    return text(record.name, record.at, writeTemplate(record.content, bindings), record.size, record.options);
  }
  return group(
    record.name,
    record.children.map((child) => resolveNode(child, bindings)),
    { transform: record.transform, style: record.style }
  );
}
