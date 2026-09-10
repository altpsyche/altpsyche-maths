/**
 * A table of cells with rules between them, laid out on column widths the
 * figure gives.
 *
 * Nothing here measures a string, so the widths arrive from the caller and the
 * cells are placed inside them. A table sized to fit its own text would be a
 * different table on a machine with different fonts, which is the rule `brace`
 * already holds its label to.
 */
import { vec2, type Vec2 } from '../values/vec2.js';
import { group, shape, text, type GroupNode, type Node, type Style, type TextOptions } from './node.js';
import { line } from './path.js';
import { scaledWidth } from './width.js';
import type { Fill, Stroke } from './mark.js';

type Align = TextOptions['align'];

export interface TableOptions {
  /** The middle of the box the table fills, in the figure's own units. */
  readonly at: Vec2;
  /** How wide each column is, in figure units. The table is as wide as these
   * add up to, since nothing here can measure the text to work them out. */
  readonly columns: readonly number[];
  /** How tall every row is, in figure units. */
  readonly rowHeight: number;
  /** The size a cell is drawn at, in figure units. */
  readonly size: number;
  readonly fill: Fill;
  readonly stroke: Stroke;
  /** Which rules are drawn. Both of them unless the figure says otherwise. */
  readonly rules?: 'both' | 'rows' | 'columns' | 'none';
  /** Whether the first row is a header, which is drawn with a heavier rule
   * under it in place of the row rule that would sit there. */
  readonly header?: boolean;
  /** How wide the header's rule is against an ordinary one. */
  readonly headerWidth?: number;
  /** How far a cell sits inside its column, which is what keeps a word off the
   * rule beside it. A middled cell ignores it. */
  readonly padding?: number;
  /** How a cell sits in its column, one value for the whole table or one for
   * each column. */
  readonly align?: Align | readonly Align[];
  readonly family?: string;
  readonly weight?: number;
}

/** The left edge of every column and the right edge of the last, so a cell and
 * the rule beside it are placed off one list. */
function edgesOf(left: number, columns: readonly number[]): number[] {
  const edges = [left];
  for (const width of columns) edges.push(edges[edges.length - 1] + width);
  return edges;
}

/**
 * A table placed in a figure: one text node per cell, a rule between rows, a
 * rule between columns, and a heavier rule under a header row.
 *
 * The rules are drawn before the cells so a word crossing one is the thing a
 * reader sees. Rows of different lengths are refused, and so is a row longer
 * than the column widths the figure gave, since a cell with no column has
 * nowhere to sit.
 */
export function table(name: string, cells: readonly (readonly string[])[], options: TableOptions): GroupNode {
  const rows = cells.length;
  const columns = options.columns.length;
  if (rows === 0 || columns === 0) throw new Error('a table carries at least one column and one row');
  for (const [at, row] of cells.entries()) {
    if (row.length !== columns) throw new Error(`row ${at} carries ${row.length} cells and the table has ${columns} columns`);
  }

  const width = options.columns.reduce((all, one) => all + one, 0);
  const height = options.rowHeight * rows;
  const left = options.at.x - width / 2;
  const top = options.at.y + height / 2;
  const edges = edgesOf(left, options.columns);
  const padding = options.padding ?? options.size / 2;
  const drawn = options.rules ?? 'both';
  const header = options.header === true && rows > 1;
  const style: Style = { fill: options.fill, family: options.family, weight: options.weight };
  const alignOf = (at: number): Align =>
    Array.isArray(options.align) ? options.align[at] : (options.align as Align | undefined);

  const across: Node[] = [];
  if (drawn === 'both' || drawn === 'rows') {
    for (let under = 0; under < rows - 1; under += 1) {
      if (header && under === 0) continue;
      const y = top - options.rowHeight * (under + 1);
      across.push(shape(String(under), line(vec2(left, y), vec2(left + width, y))));
    }
  }

  const down: Node[] = [];
  if (drawn === 'both' || drawn === 'columns') {
    for (let after = 0; after < columns - 1; after += 1) {
      down.push(shape(String(after), line(vec2(edges[after + 1], top), vec2(edges[after + 1], top - height))));
    }
  }

  const parts: Node[] = [group('rules', [group('rows', across), group('columns', down)], { style: { stroke: options.stroke } })];

  if (header) {
    const y = top - options.rowHeight;
    parts.push(
      shape('header', line(vec2(left, y), vec2(left + width, y)), {
        stroke: { ...options.stroke, width: scaledWidth(options.stroke.width, options.headerWidth ?? 2) },
      })
    );
  }

  parts.push(
    group(
      'rows',
      cells.map((row, down) =>
        group(
          String(down),
          row.map((cell, at) => {
            const align = alignOf(at) ?? 'start';
            const x = align === 'middle' ? (edges[at] + edges[at + 1]) / 2 : align === 'end' ? edges[at + 1] - padding : edges[at] + padding;
            return text(String(at), vec2(x, top - options.rowHeight * (down + 0.5)), cell, options.size, {
              ...style,
              align,
              baseline: 'middle',
            });
          })
        )
      )
    )
  );

  return group(name, parts);
}
