/**
 * The shipped typeface, subset and written out as the module the reader imports.
 *
 * Run it when the font changes and never at install time: what ships is the
 * generated module, so a consumer needs no font tooling and no network. It wants
 * `pyftsubset` from fonttools and a full Noto Sans to read.
 *
 * The subset is Latin-1 and the punctuation a figure writes. The layout tables go
 * because the reader lays a label out on `hmtx` advances alone, and shipping
 * kerning pairs no painter reads would put the two painters' labels in different
 * places. The hinting tables go because hinting is a rasteriser's business and
 * nothing here rasterises.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const here = import.meta.dirname;
const source = process.argv[2] ?? '/usr/share/fonts/noto/NotoSans-Regular.ttf';
const subset = path.join(here, 'noto-sans-latin.ttf');

const RANGES = 'U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018-201D,U+2212,U+00D7,U+00F7,U+00B0';
const DROPPED = 'GSUB,GPOS,GDEF,gasp,cvt,fpgm,prep';

execFileSync('pyftsubset', [
  source,
  `--unicodes=${RANGES}`,
  '--layout-features=',
  '--no-hinting',
  // The missing-glyph box keeps its outline, so a character the subset does not
  // cover draws something a reader can see rather than nothing at all.
  '--notdef-outline',
  '--desubroutinize',
  `--drop-tables+=${DROPPED}`,
  `--output-file=${subset}`,
]);

const bytes = readFileSync(subset);
const base64 = bytes.toString('base64');
const wrapped = (base64.match(/.{1,96}/g) ?? []).join("' +\n  '");

writeFileSync(
  path.join(here, '..', 'figure', 'font-bytes.ts'),
  `/**
 * The shipped typeface as the bytes a font reader parses, written by
 * \`font/build.mjs\` and not by hand.
 *
 * A font arrives as a module rather than as a file beside the code because a file
 * is reached by a path, and a path is a different thing in Node, behind a bundler
 * and in a browser with neither. An import is the same thing everywhere. The
 * module is loaded by the call that needs it, so a consumer who never draws a
 * label never fetches these bytes.
 *
 * Noto Sans, subset to Latin-1 and the punctuation a figure writes, under the SIL
 * Open Font License 1.1. The licence text ships beside the generator.
 */

/** The subset as base64, which is what a module can carry and a byte array
 * cannot. */
const ENCODED =
  '${wrapped}';

/** The typeface's bytes, decoded once and held, since every label read after the
 * first reads the same font. */
let decoded: Uint8Array | undefined;

/** The shipped typeface's bytes. */
export function fontBytes(): Uint8Array {
  if (decoded) return decoded;
  const binary = atob(ENCODED);
  const bytes = new Uint8Array(binary.length);
  for (let at = 0; at < binary.length; at += 1) bytes[at] = binary.charCodeAt(at);
  decoded = bytes;
  return decoded;
}
`
);

console.log(`${source} -> ${bytes.length} bytes, ${base64.length} characters of base64`);
