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
 * survives being written to a file and read back. A shape's path is a record of
 * its own, either a named form with parameters or its cubics written out.
 *
 * Text is the one kind whose parameter is not a value the format already has. A
 * drawn string is a word beside a formatted number and the expression form is
 * over numbers and points alone, so a text record's content is a template with
 * numbered holes and one expression per hole, each hole carrying the precision
 * it is written to.
 *
 * A text size is a plain number rather than an expression. A figure that grows a
 * label does it with `scale` over the marks, which is what the animation
 * vocabulary already carries, so a size that follows a track would be a second
 * way to say the same thing.
 */
import type { Mat3 } from '../values/mat3.js';
import type { Vec2 } from '../values/vec2.js';
import { resolvePath, type PathRecord } from './path-record.js';
import { group, shape, text, type Node, type Style, type TextOptions } from './node.js';
import { arrow, brace, callout, dot } from './annotate.js';
import type { Fill, Stroke } from './mark.js';
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
  readonly path: PathRecord;
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

/** What an arrow takes beyond its two ends. */
export interface ArrowRecordOptions {
  readonly stroke: Stroke;
  readonly fill?: Fill;
  readonly head?: Expression;
  readonly spread?: Expression;
}

/** What a brace with a word on it takes beyond its two points and its content. */
export interface BraceRecordOptions {
  readonly stroke: Stroke;
  readonly fill: Fill;
  readonly size: number;
  readonly depth: Expression;
  readonly curl?: Expression;
  readonly padding?: Expression;
  readonly align?: TextOptions['align'];
  readonly baseline?: TextOptions['baseline'];
  readonly family?: string;
  readonly weight?: number;
}

/** What a callout takes beyond the place it names, where its word sits and its
 * content. */
export interface CalloutRecordOptions {
  readonly stroke: Stroke;
  readonly fill: Fill;
  readonly size: number;
  readonly marker?: Expression;
  readonly align?: TextOptions['align'];
  readonly baseline?: TextOptions['baseline'];
  readonly family?: string;
  readonly weight?: number;
}

export interface DotRecord {
  readonly kind: 'dot';
  readonly name: string;
  readonly at: Expression;
  readonly radius: Expression;
  readonly fill: Fill;
}

export interface ArrowRecord {
  readonly kind: 'arrow';
  readonly name: string;
  readonly from: Expression;
  readonly to: Expression;
  readonly options: ArrowRecordOptions;
}

export interface BraceRecord {
  readonly kind: 'brace';
  readonly name: string;
  readonly from: Expression;
  readonly to: Expression;
  readonly content: TextContent;
  readonly options: BraceRecordOptions;
}

export interface CalloutRecord {
  readonly kind: 'callout';
  readonly name: string;
  readonly at: Expression;
  readonly to: Expression;
  readonly content: TextContent;
  readonly options: CalloutRecordOptions;
}

export type NodeRecord =
  | ShapeRecord
  | TextRecord
  | GroupRecord
  | DotRecord
  | ArrowRecord
  | BraceRecord
  | CalloutRecord;

function nameOfValue(value: number | boolean | Vec2): string {
  if (typeof value === 'number') return 'a number';
  if (typeof value === 'boolean') return 'a true or false';
  return 'a point';
}

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
    if (typeof value !== 'number') throw new Error(`hole ${at} is a number and was given ${nameOfValue(value)}`);
    return labelFor(value, hole.precision);
  });
}

function numberOf(expression: Expression, bindings: Bindings, what: string): number {
  const value = evaluate(expression, bindings);
  if (typeof value !== 'number') throw new Error(`${what} is a number and was given ${nameOfValue(value)}`);
  return value;
}

function pointOf(expression: Expression, bindings: Bindings, what: string): Vec2 {
  const value = evaluate(expression, bindings);
  if (typeof value !== 'object') throw new Error(`${what} is a point and was given ${nameOfValue(value)}`);
  return value;
}

/** An optional parameter read where it is given and left out where it is not, so
 * the call falls back on its own default rather than on a number repeated here. */
const maybe = (expression: Expression | undefined, bindings: Bindings, what: string): number | undefined =>
  expression === undefined ? undefined : numberOf(expression, bindings, what);

/**
 * A record walked into the node it describes.
 *
 * The bindings reach every expression a record carries: the text holes, the
 * parameters of every path, and the places and distances an annotation is built
 * from. A tree of literals needs no bindings at all.
 *
 * The four annotations resolve through their own calls rather than by rebuilding
 * what those calls build, so a brace's curls and an arrow's head are one piece of
 * arithmetic with one set of gates over it.
 */
export function resolveNode(record: NodeRecord, bindings: Bindings = {}): Node {
  switch (record.kind) {
    case 'shape':
      return shape(record.name, resolvePath(record.path, bindings), record.style);
    case 'text':
      return text(record.name, record.at, writeTemplate(record.content, bindings), record.size, record.options);
    case 'group':
      return group(
        record.name,
        record.children.map((child) => resolveNode(child, bindings)),
        { transform: record.transform, style: record.style }
      );
    case 'dot':
      return dot(
        record.name,
        pointOf(record.at, bindings, "a dot's place"),
        numberOf(record.radius, bindings, "a dot's radius"),
        record.fill
      );
    case 'arrow':
      return arrow(
        record.name,
        pointOf(record.from, bindings, "an arrow's start"),
        pointOf(record.to, bindings, "an arrow's end"),
        {
          stroke: record.options.stroke,
          fill: record.options.fill,
          head: maybe(record.options.head, bindings, "an arrow's head"),
          spread: maybe(record.options.spread, bindings, "an arrow's spread"),
        }
      );
    case 'brace':
      return brace(
        record.name,
        pointOf(record.from, bindings, "a brace's first point"),
        pointOf(record.to, bindings, "a brace's last point"),
        writeTemplate(record.content, bindings),
        {
          ...record.options,
          depth: numberOf(record.options.depth, bindings, "a brace's depth"),
          curl: maybe(record.options.curl, bindings, "a brace's curl"),
          padding: maybe(record.options.padding, bindings, "a brace's padding"),
        }
      );
    case 'callout':
      return callout(
        record.name,
        pointOf(record.at, bindings, "a callout's place"),
        pointOf(record.to, bindings, "where a callout's word sits"),
        writeTemplate(record.content, bindings),
        { ...record.options, marker: maybe(record.options.marker, bindings, "a callout's marker") }
      );
  }
  throw new Error(`a node has no kind called ${String((record as { kind?: unknown }).kind)}`);
}
