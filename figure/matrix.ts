/**
 * A matrix of entries drawn between two brackets, with every entry reachable on
 * its own.
 *
 * A static matrix is already drawable through the typesetter, and what that
 * cannot give is a name for one entry. Here each row is a group and each entry
 * is a text node inside it, so an animation naming `m/rows/1/0` reaches one
 * number and one naming `m/rows/1` reaches the row it sits in.
 */
import { vec2, type Vec2 } from '../values/vec2.js';
import { group, shape, text, type GroupNode, type Node, type Style, type TextOptions } from './node.js';
import { polyline } from './path.js';
import type { Fill, Stroke } from './mark.js';

export interface MatrixOptions {
  /** The middle of the box the brackets stand on, in the figure's own units. */
  readonly at: Vec2;
  /** The box the whole matrix fills, brackets included, in figure units. */
  readonly width: number;
  readonly height: number;
  /** The size of an entry, in figure units, like a stroke width. */
  readonly size: number;
  readonly fill: Fill;
  readonly stroke: Stroke;
  /** How far the entries sit inside the box on every side. The entries are laid
   * out inside what is left, so this is what keeps a number off its bracket. */
  readonly padding?: number;
  /** How far each bracket's arms reach in across the top and the bottom. */
  readonly serif?: number;
  readonly family?: string;
  readonly weight?: number;
  readonly align?: TextOptions['align'];
  readonly baseline?: TextOptions['baseline'];
}

/** A bracket as three straight pieces: in along the top, down the side, and in
 * along the bottom. The sign is which way the arms point, so one call draws
 * either side. */
function bracket(at: number, top: number, bottom: number, reach: number) {
  return polyline([vec2(at + reach, top), vec2(at, top), vec2(at, bottom), vec2(at + reach, bottom)]);
}

/**
 * A matrix placed in a figure: two brackets round a grid of entries, each entry
 * centred in a cell of its own.
 *
 * An entry is a string laid out by the painter and never measured, which is why
 * the cell it sits in is a share of the box rather than a width read off the
 * text. A figure whose columns were sized to fit their entries would be a
 * different figure on a machine with different fonts.
 *
 * Rows of different lengths are refused, since a matrix that is not rectangular
 * has no grid to lay out and drawing the longest row would put an entry outside
 * the brackets.
 */
export function matrix(name: string, entries: readonly (readonly string[])[], options: MatrixOptions): GroupNode {
  const rows = entries.length;
  const columns = entries[0]?.length ?? 0;
  if (rows === 0 || columns === 0) throw new Error('a matrix carries at least one entry');
  for (const [at, row] of entries.entries()) {
    if (row.length !== columns) throw new Error(`row ${at} carries ${row.length} entries and row 0 carries ${columns}`);
  }

  const padding = options.padding ?? Math.min(options.width, options.height) * 0.1;
  const serif = options.serif ?? padding;
  const left = options.at.x - options.width / 2;
  const right = options.at.x + options.width / 2;
  const top = options.at.y + options.height / 2;
  const bottom = options.at.y - options.height / 2;
  const pitch = vec2((options.width - padding * 2) / columns, (options.height - padding * 2) / rows);
  const style: Style = { fill: options.fill, family: options.family, weight: options.weight };

  const laid: Node[] = entries.map((row, down) =>
    group(
      String(down),
      row.map((entry, across) =>
        text(
          String(across),
          vec2(left + padding + (across + 0.5) * pitch.x, top - padding - (down + 0.5) * pitch.y),
          entry,
          options.size,
          { ...style, align: options.align ?? 'middle', baseline: options.baseline ?? 'middle' }
        )
      )
    )
  );

  return group(name, [
    shape('left', bracket(left, top, bottom, serif), { stroke: options.stroke }),
    shape('right', bracket(right, top, bottom, -serif), { stroke: options.stroke }),
    group('rows', laid),
  ]);
}
