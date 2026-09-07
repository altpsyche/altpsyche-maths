/**
 * Which glyph of one typeset expression is which glyph of the other.
 *
 * A glyph is named for its place in the expression and the code point the
 * typesetter wrote on it, so `3-1D465` is the fourth mark and the letter x, and
 * a fraction bar is `4-rule`. The token two marks match on is the part of that
 * name after the first dash, which needs no parsing and makes a rule a token of
 * its own.
 *
 * The pairing is the longest common subsequence of the two token sequences,
 * which is the longest run of tokens appearing in both lists in the same order.
 * Matching in order is what stops the x of a numerator pairing with the x of a
 * right-hand side, and it pairs each occurrence of a repeated glyph once rather
 * than pairing several to one partner.
 *
 * The token is read off the id rather than carried beside the mark because a
 * consumer stores a typeset equation rather than typesetting it again, and what
 * it stores is a path and the id it belongs to. A code point kept elsewhere
 * would have to be stored elsewhere too, and the matching would fail on
 * everything read back from a cache that did not.
 */
import type { Mark, PathMark } from './mark.js';

export interface GlyphMatch {
  /** Each glyph of the expression being left beside the one it becomes. */
  readonly pairs: readonly (readonly [PathMark, PathMark])[];
  /** Glyphs of the expression being left that nothing in the other answers. */
  readonly leaving: readonly PathMark[];
  /** Glyphs of the expression being arrived at that nothing in the first
   * answers. */
  readonly arriving: readonly PathMark[];
}

/**
 * What a mark matches on: its leaf name after the first dash.
 *
 * A mark whose leaf carries no dash is not a glyph a typesetter wrote, and it
 * pairs with nothing rather than pairing with every other mark that is also
 * unnamed.
 */
export function glyphToken(id: string): string | undefined {
  const leaf = id.slice(id.lastIndexOf('/') + 1);
  const dash = leaf.indexOf('-');
  return dash < 0 ? undefined : leaf.slice(dash + 1);
}

/** The table of longest common subsequence lengths, read back from the end to
 * give the pairs themselves. */
function pairedPlaces(from: readonly (string | undefined)[], to: readonly (string | undefined)[]): [number, number][] {
  const rows = from.length;
  const columns = to.length;
  const longest: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(columns + 1).fill(0));
  for (let row = rows - 1; row >= 0; row--) {
    for (let column = columns - 1; column >= 0; column--) {
      const same = from[row] !== undefined && from[row] === to[column];
      longest[row][column] = same
        ? longest[row + 1][column + 1] + 1
        : Math.max(longest[row + 1][column], longest[row][column + 1]);
    }
  }
  const places: [number, number][] = [];
  let row = 0;
  let column = 0;
  while (row < rows && column < columns) {
    if (from[row] !== undefined && from[row] === to[column]) {
      places.push([row, column]);
      row++;
      column++;
    } else if (longest[row + 1][column] >= longest[row][column + 1]) row++;
    else column++;
  }
  return places;
}

const glyphsOf = (marks: readonly Mark[]): PathMark[] =>
  marks.filter((mark): mark is PathMark => mark.kind === 'path');

/** Two typeset expressions paired glyph by glyph, with what neither answers kept
 * apart. Marks that are not paths are left out, since a glyph is an outline. */
export function matchGlyphs(from: readonly Mark[], to: readonly Mark[]): GlyphMatch {
  const left = glyphsOf(from);
  const right = glyphsOf(to);
  const places = pairedPlaces(
    left.map((mark) => glyphToken(mark.id)),
    right.map((mark) => glyphToken(mark.id))
  );
  const takenLeft = new Set(places.map(([row]) => row));
  const takenRight = new Set(places.map(([, column]) => column));
  return {
    pairs: places.map(([row, column]) => [left[row], right[column]] as const),
    leaving: left.filter((_, at) => !takenLeft.has(at)),
    arriving: right.filter((_, at) => !takenRight.has(at)),
  };
}
