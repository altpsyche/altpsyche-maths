/**
 * A figure as the text of a file, and the version the text declares.
 *
 * A file is a JSON document carrying two fields: the version of the format the
 * figure is written in, and the figure. Nothing else is in the envelope, because
 * a field a renderer is not required to read is a field two renderers disagree
 * about.
 *
 * The keys of every object are written in sorted order, so the bytes of a file
 * are a function of the figure rather than of the order its fields happened to
 * be built in. Without that a byte gate over a committed figure would fail on a
 * record whose fields were written the other way round and draw the same
 * picture.
 */
import { checkFigure } from './figure-check.js';
import { resolveFigure, type FigureRecord } from './figure-record.js';
import type { Figure } from './figure.js';

/** The version of the format this package writes and reads. A figure declares
 * its own and a reader refuses one it does not know. */
export const FIGURE_FORMAT_VERSION = 0;

/** What a file holds: the version of the format, and one figure. */
export interface FigureFile {
  readonly format: number;
  readonly figure: FigureRecord;
}

const INDENT = '  ';

/** The name of what a value is, for the sentence that refuses it. */
function nameOf(value: unknown): string {
  if (value === undefined) return 'missing';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'a list';
  if (typeof value === 'number') return String(value);
  return `a ${typeof value}`;
}

/**
 * One value as the text of a file, or a refusal naming the path of the field.
 *
 * A field whose value is `undefined` is left out rather than written, since that
 * is how an optional field of a record is absent. An `undefined` inside a list is
 * refused instead: a list with a hole in it has no written form, and a reader
 * given one would draw a figure short of a mark.
 */
function write(value: unknown, path: string, depth: number): string {
  if (typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${path} is ${nameOf(value)}, which a file has no way to write`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const inside = INDENT.repeat(depth + 1);
    const written = value.map((item, at) => {
      const where = `${path}.${at}`;
      if (item === undefined) throw new Error(`${where} is a list with nothing in it, which a file has no way to write`);
      return inside + write(item, where, depth + 1);
    });
    return `[\n${written.join(',\n')}\n${INDENT.repeat(depth)}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const held = value as Record<string, unknown>;
    const names = Object.keys(held)
      .sort()
      .filter((name) => held[name] !== undefined);
    if (names.length === 0) return '{}';
    const inside = INDENT.repeat(depth + 1);
    const written = names.map(
      (name) => `${inside}${JSON.stringify(name)}: ${write(held[name], path ? `${path}.${name}` : name, depth + 1)}`,
    );
    return `{\n${written.join(',\n')}\n${INDENT.repeat(depth)}}`;
  }
  throw new Error(`${path} is ${nameOf(value)}, which a file has no way to write`);
}

/**
 * A figure as the text of a file, ending in a newline the way a text file does.
 *
 * What is written is a `FigureRecord` and never a `Figure`, since a figure's
 * scene may be a closure and no reading recovers one.
 */
export function writeFigure(record: FigureRecord): string {
  const figure = write(record, '', 1);
  return `{\n${INDENT}"format": ${FIGURE_FORMAT_VERSION},\n${INDENT}"figure": ${figure}\n}\n`;
}

/**
 * The figure a file's text describes.
 *
 * The version is read before anything else, because a file written in a version
 * this package does not know may use a field for something else entirely, and a
 * figure drawn from a guess is a wrong picture with nothing to say it went
 * wrong.
 */
export function readFigure(text: string): Figure {
  let held: unknown;
  try {
    held = JSON.parse(text);
  } catch (cause) {
    throw new Error(`a file is a JSON document and this text is not one: ${(cause as Error).message}`);
  }
  if (typeof held !== 'object' || held === null || Array.isArray(held)) {
    throw new Error(`a file is an object carrying a format and a figure, and this is ${nameOf(held)}`);
  }
  const file = held as { format?: unknown; figure?: unknown };
  if (typeof file.format !== 'number') {
    throw new Error('a file names the version of the format it is written in, and format is missing');
  }
  if (file.format !== FIGURE_FORMAT_VERSION) {
    throw new Error(
      `this reads version ${FIGURE_FORMAT_VERSION} of the format and the file is written in version ${file.format}`,
    );
  }
  if (typeof file.figure !== 'object' || file.figure === null || Array.isArray(file.figure)) {
    throw new Error(`a file carries a figure, and figure is ${nameOf(file.figure)}`);
  }
  return resolveFigure(checkFigure(file.figure));
}
