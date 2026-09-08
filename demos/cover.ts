/**
 * How much of a sheet's frame its marks reach, read on the ink rather than on
 * the box round it.
 *
 * The box round the marks is a number an empty frame passes: one label in a
 * corner and one in the opposite corner stretch it over the whole frame while
 * nothing at all is drawn between them. So the frame is divided into cells and
 * a cell counts once any mark's ink falls anywhere inside it, which makes an
 * empty band of frame a run of empty cells whatever stands at its ends.
 *
 * Nothing here needs a painter. The marks are geometry in the figure's own
 * units and the view matrix is what puts them in the frame, so a filled cell is
 * decided by the nonzero winding rule and a stroked one by walking the
 * flattened path through the grid.
 */
import {
  flattenPath,
  mat3,
  transformPath,
  vec2,
  widestWidth,
  windingAt,
  type Mark,
  type Mat3,
  type Vec2,
} from '../index.js';
import type { Drawn } from './render.js';

/**
 * How many cells the frame is divided into down its height.
 *
 * A cell is a twelfth of the height and about as wide as it is tall, which comes
 * to 33 pixels on the page at the width the README shows a still. A patch that
 * size with nothing in it is a patch a reader sees as empty, and a grid fine
 * enough to resolve one stroke would instead measure how much ink a line drawing
 * has, which is not the question.
 */
export const ROWS = 12;

/**
 * How wide a glyph is against its size, which no measurement without a font can
 * know exactly.
 *
 * A text mark contributes a box this wide per character, so a word covers cells
 * rather than a point. Eleven twentieths is the average advance of the sans
 * serif families these sheets name, and the error it leaves is under one cell on
 * the longest caption any sheet carries.
 */
export const ADVANCE = 0.55;

/** How much of a line of type stands above its baseline, against its size. A
 * text mark's anchor sits on the baseline unless it says otherwise, so this is
 * what puts an anchored line of text in a box. */
export const CAP = 0.8;

/** How far a straight run is walked between stamps, in cells, so no cell a run
 * passes through is stepped over. */
const STEP = 0.5;

interface Grid {
  hit: Uint8Array;
  across: number;
  down: number;
  cellWidth: number;
  cellHeight: number;
}

function gridFor(width: number, height: number): Grid {
  const across = Math.max(1, Math.round((ROWS * width) / height));
  return {
    hit: new Uint8Array(across * ROWS),
    across,
    down: ROWS,
    cellWidth: width / across,
    cellHeight: height / ROWS,
  };
}

/** Every cell a disc of this radius about a point falls in. */
function stamp(grid: Grid, at: Vec2, radius: number): void {
  const first = Math.max(0, Math.floor((at.x - radius) / grid.cellWidth));
  const last = Math.min(grid.across - 1, Math.floor((at.x + radius) / grid.cellWidth));
  const top = Math.max(0, Math.floor((at.y - radius) / grid.cellHeight));
  const bottom = Math.min(grid.down - 1, Math.floor((at.y + radius) / grid.cellHeight));
  for (let row = top; row <= bottom; row++) {
    for (let column = first; column <= last; column++) grid.hit[row * grid.across + column] = 1;
  }
}

/** A straight run stamped along its length, so a stroke marks every cell it
 * crosses rather than only the cells its ends land in. */
function along(grid: Grid, from: Vec2, to: Vec2, radius: number): void {
  const reach = Math.min(grid.cellWidth, grid.cellHeight) * STEP;
  const steps = Math.max(1, Math.ceil(vec2.distance(from, to) / reach));
  for (let step = 0; step <= steps; step++) stamp(grid, vec2.lerp(from, to, step / steps), radius);
}

/**
 * A path's subpaths flattened into the frame, each kept open unless it closes
 * itself.
 *
 * `flattenPath` joins every subpath's end back to its start, which is what a
 * fill needs and what a stroke must not have: an open run stroked with that
 * extra segment would draw a line the figure never asked for straight back
 * across the picture.
 */
function loopsOf(mark: Mark & { kind: 'path' }, matrix: Mat3, closing: boolean): Vec2[][] {
  const moved = transformPath(mark.path, matrix);
  const loops: Vec2[][] = [];
  for (let at = 0; at < moved.length; at++) {
    const subpath = moved[at];
    if (subpath.curves.length === 0) continue;
    const flat = flattenPath([subpath])[0];
    if (!flat) continue;
    loops.push(closing || subpath.closed ? flat : flat.slice(0, flat.length - 1));
  }
  return loops;
}

function stampText(grid: Grid, mark: Mark & { kind: 'text' }, matrix: Mat3): void {
  const at = mat3.transformPoint(matrix, mark.at);
  const size = mark.size * mat3.scaleFactor(matrix);
  const width = ADVANCE * size * mark.text.length;
  const left = mark.align === 'middle' ? at.x - width / 2 : mark.align === 'end' ? at.x - width : at.x;
  const top = mark.baseline === 'middle' ? at.y - size / 2 : mark.baseline === 'hanging' ? at.y : at.y - size * CAP;
  const reach = Math.min(grid.cellWidth, grid.cellHeight) * STEP;
  for (let down = 0; down <= size; down += reach) {
    along(grid, vec2(left, top + down), vec2(left + width, top + down), 0);
  }
}

function stampFill(grid: Grid, mark: Mark & { kind: 'path' }, matrix: Mat3): void {
  const loops = loopsOf(mark, matrix, true);
  const rule = mark.fill?.rule ?? 'nonzero';
  for (let row = 0; row < grid.down; row++) {
    for (let column = 0; column < grid.across; column++) {
      if (grid.hit[row * grid.across + column]) continue;
      const middle = vec2((column + 0.5) * grid.cellWidth, (row + 0.5) * grid.cellHeight);
      const winding = windingAt(loops, middle);
      const inside = rule === 'evenodd' ? winding % 2 !== 0 : winding !== 0;
      if (inside) grid.hit[row * grid.across + column] = 1;
    }
  }
  // The edge of a fill covers the cells it runs through even where the middle of
  // none of them is inside, which is every shape narrower than one cell.
  for (const loop of loops) for (let at = 1; at < loop.length; at++) along(grid, loop[at - 1], loop[at], 0);
}

function stampStroke(grid: Grid, mark: Mark & { kind: 'path' }, matrix: Mat3): void {
  const half = (widestWidth(mark.stroke!.width) * mat3.scaleFactor(matrix)) / 2;
  for (const loop of loopsOf(mark, matrix, false)) {
    for (let at = 1; at < loop.length; at++) along(grid, loop[at - 1], loop[at], half);
  }
}

/** Below this a mark is faded far enough to read as nothing, so a frame at the
 * start of an entrance is not counted as covered by what has yet to arrive. */
const FAINT = 0.02;

/** The share of the frame no mark covers, between nothing and one. */
export function bareShare(drawn: Drawn): number {
  const grid = gridFor(drawn.width, drawn.height);
  for (const mark of drawn.marks) {
    if ((mark.opacity ?? 1) < FAINT) continue;
    if (mark.kind === 'text') {
      stampText(grid, mark, drawn.matrix);
      continue;
    }
    if (mark.fill) stampFill(grid, mark, drawn.matrix);
    if (mark.stroke) stampStroke(grid, mark, drawn.matrix);
  }
  let covered = 0;
  for (const cell of grid.hit) covered += cell;
  return 1 - covered / grid.hit.length;
}
