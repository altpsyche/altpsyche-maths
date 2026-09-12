/**
 * A label as the shapes that draw it, which is what a card needs and a page does
 * not.
 *
 * A `TextMark` names the words, where they sit and how big they are, and leaves
 * the letter shapes to whatever draws it. A page has a font behind every family
 * name; a card has none. So a label drawn on a card is turned into a `PathMark`
 * of the glyphs the shipped typeface holds, the way `outlinedMarks` already turns
 * a tapered stroke into the fill it is drawn as.
 *
 * The pen walks the label on the advances `hmtx` names and nothing else. There is
 * no kerning here and none in the shipped subset, which is what lets a browser
 * setting the same font put the same label in the same place.
 */
import { vec2, type Vec2 } from '../values/vec2.js';
import { glyphPath } from './glyph.js';
import type { Font } from './font.js';
import type { Mark, PathMark, TextMark } from './mark.js';
import type { Path, Subpath } from './path.js';

/**
 * How far the baseline sits below a label's anchor point, in font units.
 *
 * Each of the three is measured from a metric the font declares rather than from
 * a share of an em chosen by eye. `alphabetic` puts the baseline at the anchor,
 * `middle` puts the anchor halfway up a lower-case letter, and `hanging` hangs
 * the label from the top of a capital.
 */
function baselineDrop(font: Font, baseline: TextMark['baseline']): number {
  if (baseline === 'middle') return font.xHeight / 2;
  if (baseline === 'hanging') return font.capHeight;
  return 0;
}

/** How far the pen's start sits left of the anchor, as a share of the label's own
 * width. */
function alignShare(align: TextMark['align']): number {
  if (align === 'middle') return 0.5;
  if (align === 'end') return 1;
  return 0;
}

/** How wide a label is in font units, which is the advances of its glyphs summed.
 */
export function textAdvance(font: Font, text: string): number {
  let advance = 0;
  for (const character of text) advance += font.advanceOf(font.glyphFor(character.codePointAt(0) ?? 0));
  return advance;
}

/** How wide a label is in the figure's own units, at the size the mark names. */
export function textWidth(font: Font, text: string, size: number): number {
  return (textAdvance(font, text) * size) / font.unitsPerEm;
}

/** A glyph's outline moved to where the pen is and scaled to the size the label
 * is written at, with its y turned over: a font counts y up from the baseline and
 * a figure counts it down. */
function placed(path: Path, at: Vec2, scale: number): Subpath[] {
  const point = (corner: Vec2) => vec2(at.x + corner.x * scale, at.y - corner.y * scale);
  return path.map((subpath) => ({
    start: point(subpath.start),
    curves: subpath.curves.map((curve) => ({
      control1: point(curve.control1),
      control2: point(curve.control2),
      to: point(curve.to),
    })),
    closed: subpath.closed,
  }));
}

/**
 * One label as the path its glyphs draw, or nothing where the label draws no
 * shape at all.
 *
 * The mark's `family` and `weight` are what a page's own painter reads, and
 * neither reaches this: the shipped typeface is the one face there is on a card,
 * so a label naming another family is drawn in it rather than left out.
 */
export function outlineText(mark: TextMark, font: Font): PathMark | null {
  const scale = mark.size / font.unitsPerEm;
  const width = textAdvance(font, mark.text) * scale;
  const pen = vec2(mark.at.x - width * alignShare(mark.align), mark.at.y + baselineDrop(font, mark.baseline) * scale);

  const path: Subpath[] = [];
  let along = 0;
  for (const character of mark.text) {
    const glyph = font.glyphFor(character.codePointAt(0) ?? 0);
    path.push(...placed(glyphPath(font, glyph), vec2(pen.x + along, pen.y), scale));
    along += font.advanceOf(glyph) * scale;
  }
  if (path.length === 0) return null;

  return {
    kind: 'path',
    id: mark.id,
    path,
    fill: mark.fill,
    ...(mark.opacity !== undefined ? { opacity: mark.opacity } : {}),
    ...(mark.clip ? { clip: mark.clip } : {}),
  };
}

/**
 * Every mark with its labels turned into the shapes that draw them.
 *
 * A label of nothing but spaces draws no shape and is left out rather than kept
 * as an empty path, which is what the other painters draw for it too.
 */
export function textOutlines(marks: readonly Mark[], font: Font): readonly Mark[] {
  const drawn: Mark[] = [];
  for (const mark of marks) {
    if (mark.kind !== 'text') {
      drawn.push(mark);
      continue;
    }
    const outlined = outlineText(mark, font);
    if (outlined) drawn.push(outlined);
  }
  return drawn;
}
