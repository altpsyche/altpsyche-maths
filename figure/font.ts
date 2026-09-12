/**
 * A TrueType font read out of its own bytes, which is where a label's letter
 * shapes come from.
 *
 * A card has no text vocabulary, so a label drawn on one is shapes or it is
 * nothing, and a renderer written in another language can be handed the same
 * shapes only if they come from a file rather than from a browser. So this
 * package ships a typeface and reads it here.
 *
 * The tables read are the ones a label needs and no others. `head` says how many
 * units an em is divided into, `maxp` says how many glyphs there are, `cmap`
 * says which glyph draws a code point, `hhea` and `hmtx` say how far the pen
 * moves after each one, and `loca` and `glyf` hold the outlines. Hinting and
 * layout are dropped from the shipped subset: hinting is a rasteriser's business
 * and nothing here rasterises, and a kerning pair no painter reads would put the
 * same label in two places.
 */

/** One table's bytes inside the file, which is what every reading below is taken
 * from. */
interface Table {
  readonly at: number;
  readonly length: number;
}

/** A typeface, read far enough to lay a label out and draw it. */
export interface Font {
  /** How many units an em is divided into, which is what a glyph's coordinates
   * are measured in. A label at a size of s figure units draws its glyphs scaled
   * by s over this. */
  readonly unitsPerEm: number;
  /** How many glyphs the font holds, the missing-glyph one included. */
  readonly glyphCount: number;
  /** How far the top of a line sits above the baseline, in font units. */
  readonly ascent: number;
  /** How far the bottom sits below it, as a positive number of font units. */
  readonly descent: number;
  /** Which glyph draws a code point, and 0 where the font has none, which is the
   * missing-glyph box every TrueType font keeps at that index. */
  glyphFor(codePoint: number): number;
  /** How far the pen moves along the line after a glyph, in font units. */
  advanceOf(glyph: number): number;
  /** The bytes the outlines are read from, which is what the glyph reader takes.
   */
  readonly bytes: Uint8Array;
  /** Where each glyph's outline begins and ends inside `glyf`, as offsets from
   * the start of the file. A glyph whose two offsets are equal has no outline,
   * which is how a space is written. */
  readonly outlines: readonly number[];
}

/** A tag is four ASCII characters written into a 32-bit word, which is how a
 * table names itself. */
function tagAt(view: DataView, at: number): string {
  return String.fromCharCode(view.getUint8(at), view.getUint8(at + 1), view.getUint8(at + 2), view.getUint8(at + 3));
}

/** Every table the file declares, by the tag it declares itself under. */
function tablesOf(view: DataView): Map<string, Table> {
  const version = view.getUint32(0);
  // A TrueType file opens with 0x00010000 or with 'true'; an OpenType file with
  // CFF outlines opens with 'OTTO' and holds no glyf table to read.
  if (version !== 0x00010000 && version !== 0x74727565) {
    throw new Error(`the font is not TrueType: its version word is 0x${version.toString(16)}`);
  }
  const count = view.getUint16(4);
  const tables = new Map<string, Table>();
  for (let index = 0; index < count; index += 1) {
    const record = 12 + index * 16;
    tables.set(tagAt(view, record), { at: view.getUint32(record + 8), length: view.getUint32(record + 12) });
  }
  return tables;
}

/** The table under a tag, or a refusal naming the tag rather than an offset into
 * nothing. */
function tableOf(tables: Map<string, Table>, tag: string): Table {
  const table = tables.get(tag);
  if (!table) throw new Error(`the font carries no ${tag} table`);
  return table;
}

/**
 * The code-point-to-glyph map of a format 4 subtable, read into a lookup.
 *
 * Format 4 is the one every font carries for the Basic Multilingual Plane: the
 * code points are cut into segments, and a segment either adds a fixed delta to
 * the code point or points at a slice of a glyph array. The whole map is walked
 * once here rather than searched per character, since a subset holds a few
 * hundred code points and a map is a faster answer than a binary search.
 */
function cmap4(view: DataView, at: number): Map<number, number> {
  const segments = view.getUint16(at + 6) / 2;
  const ends = at + 14;
  const starts = ends + segments * 2 + 2;
  const deltas = starts + segments * 2;
  const ranges = deltas + segments * 2;
  const found = new Map<number, number>();
  for (let segment = 0; segment < segments; segment += 1) {
    const end = view.getUint16(ends + segment * 2);
    const start = view.getUint16(starts + segment * 2);
    const delta = view.getInt16(deltas + segment * 2);
    const rangeOffset = view.getUint16(ranges + segment * 2);
    // The last segment ends at 0xffff and maps nothing, which the specification
    // requires every font to carry.
    if (start > end) continue;
    for (let code = start; code <= end && code !== 0x10000; code += 1) {
      let glyph: number;
      if (rangeOffset === 0) {
        glyph = (code + delta) & 0xffff;
      } else {
        // The offset is counted in bytes from the offset's own place in the
        // table, which is what lets a segment point into the array after it.
        const place = ranges + segment * 2 + rangeOffset + (code - start) * 2;
        glyph = view.getUint16(place);
        if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
      }
      if (glyph !== 0) found.set(code, glyph);
    }
  }
  return found;
}

/** The Unicode subtable a font offers, preferred over the Macintosh one where
 * both are there, since the Macintosh one maps a byte rather than a code point.
 */
function unicodeCmap(view: DataView, table: Table): Map<number, number> {
  const count = view.getUint16(table.at + 2);
  let chosen = -1;
  for (let index = 0; index < count; index += 1) {
    const record = table.at + 4 + index * 8;
    const platform = view.getUint16(record);
    const encoding = view.getUint16(record + 2);
    const at = table.at + view.getUint32(record + 4);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (unicode && view.getUint16(at) === 4) chosen = at;
  }
  if (chosen < 0) throw new Error('the font carries no format 4 Unicode character map');
  return cmap4(view, chosen);
}

/** Where each glyph's outline begins, as offsets from the start of the file. The
 * table holds one more entry than there are glyphs, so a glyph's end is the next
 * entry. */
function locations(view: DataView, loca: Table, glyf: Table, glyphCount: number, longFormat: boolean): number[] {
  const found: number[] = [];
  for (let index = 0; index <= glyphCount; index += 1) {
    // A short loca divides every offset by two, which is why it can only address
    // a glyf table of 128 KB.
    const offset = longFormat ? view.getUint32(loca.at + index * 4) : view.getUint16(loca.at + index * 2) * 2;
    found.push(glyf.at + offset);
  }
  return found;
}

/**
 * A typeface read out of the bytes of a TrueType file.
 *
 * Nothing is decoded lazily: a subset is a few hundred glyphs and reading its
 * tables once is cheaper than deciding each time whether it has been read.
 */
export function readFont(bytes: Uint8Array): Font {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tables = tablesOf(view);

  const head = tableOf(tables, 'head');
  const unitsPerEm = view.getUint16(head.at + 18);
  const longLoca = view.getInt16(head.at + 50) === 1;

  const maxp = tableOf(tables, 'maxp');
  const glyphCount = view.getUint16(maxp.at + 4);

  const hhea = tableOf(tables, 'hhea');
  const ascent = view.getInt16(hhea.at + 4);
  const descent = -view.getInt16(hhea.at + 6);
  const metrics = view.getUint16(hhea.at + 34);

  const hmtx = tableOf(tables, 'hmtx');
  const advances: number[] = [];
  for (let index = 0; index < metrics; index += 1) advances.push(view.getUint16(hmtx.at + index * 4));

  const characters = unicodeCmap(view, tableOf(tables, 'cmap'));
  const outlines = locations(view, tableOf(tables, 'loca'), tableOf(tables, 'glyf'), glyphCount, longLoca);

  return {
    unitsPerEm,
    glyphCount,
    ascent,
    descent,
    bytes,
    outlines,
    glyphFor: (codePoint) => characters.get(codePoint) ?? 0,
    // A font whose last glyphs all advance the same amount writes that advance
    // once, and every glyph past the table's end carries it.
    advanceOf: (glyph) => advances[Math.min(glyph, advances.length - 1)] ?? 0,
  };
}

/** The shipped typeface, read once and held, since every label after the first
 * reads the same font. */
let shipped: Promise<Font> | undefined;

/**
 * The typeface this package ships, which is Noto Sans subset to Latin-1 and the
 * punctuation a figure writes.
 *
 * The bytes are behind a call rather than an import at the top of the file, which
 * is how the typesetting call already loads MathJax: a consumer who never draws a
 * label on a card never fetches 15 KB of font.
 */
export async function shippedFont(): Promise<Font> {
  shipped ??= import('./font-bytes.js').then((module) => readFont(module.fontBytes()));
  return shipped;
}
