import { describe, expect, it } from 'vitest';
import {
  boundsOfMarks,
  colourFrom,
  group,
  mat3,
  matchingAspect,
  outlineText,
  shippedFont,
  svgElements,
  text,
  textAdvance,
  textOutlines,
  textWidth,
  vec2,
  viewAt,
} from '@altpsyche/maths';
import type { Font, Mark, TextMark } from '@altpsyche/maths';

/**
 * A label as the shapes that draw it.
 *
 * A label's width is the advances of its glyphs summed and nothing else, which
 * is what lets a browser setting the same font with its kerning off put the same
 * label in the same place. Every reading here is against that sum or against a
 * metric the font declares.
 */

const black = { colour: colourFrom('#000') };

function label(text: string, over: Partial<TextMark> = {}): TextMark {
  return { kind: 'text', id: 'label', at: vec2(0, 0), text, size: 1, family: 'sans-serif', fill: black, ...over };
}

const pathOf = (mark: TextMark, font: Font) => {
  const outlined = outlineText(mark, font);
  if (!outlined) throw new Error('the label drew no shape');
  return outlined;
};

describe('textWidth', () => {
  it('is the advances summed, scaled by the size the label is written at', async () => {
    const font = await shippedFont();
    const advance = textAdvance(font, 'slope');
    expect(textWidth(font, 'slope', 1)).toBeCloseTo(advance / font.unitsPerEm, 12);
    // A label at twice the size is twice as wide, since a size is the em.
    expect(textWidth(font, 'slope', 2)).toBeCloseTo(2 * textWidth(font, 'slope', 1), 12);
  });

  it('adds up letter by letter, so a label is its parts', async () => {
    const font = await shippedFont();
    expect(textAdvance(font, 'ab')).toBe(textAdvance(font, 'a') + textAdvance(font, 'b'));
    expect(textAdvance(font, '')).toBe(0);
  });
});

describe('outlineText', () => {
  it('starts the pen at the anchor, and moves it by the width for the other two alignments', async () => {
    const font = await shippedFont();
    const width = textWidth(font, 'slope 1.59', 1);
    const startsAt = (align: TextMark['align']) => pathOf(label('slope 1.59', { align }), font).path[0].start.x;
    const start = startsAt('start');
    expect(startsAt(undefined)).toBe(start);
    expect(startsAt('middle')).toBeCloseTo(start - width / 2, 12);
    expect(startsAt('end')).toBeCloseTo(start - width, 12);
  });

  it('drops the baseline by a metric the font declares, for each of the three', async () => {
    const font = await shippedFont();
    const bottomOf = (baseline: TextMark['baseline']) =>
      boundsOfMarks([pathOf(label('x', { baseline }), font)])?.y.from ?? 0;
    const alphabetic = bottomOf('alphabetic');
    expect(bottomOf(undefined)).toBe(alphabetic);
    // A figure counts y up, so a baseline dropped below the anchor is a smaller
    // y: half a lower-case letter for the middle, a whole capital for the
    // hanging one.
    expect(bottomOf('middle')).toBeCloseTo(alphabetic - font.xHeight / 2 / font.unitsPerEm, 12);
    expect(bottomOf('hanging')).toBeCloseTo(alphabetic - font.capHeight / font.unitsPerEm, 12);
  });

  it('keeps the direction the font gave it, since a font and a figure both count y up', async () => {
    const font = await shippedFont();
    const box = boundsOfMarks([pathOf(label('x'), font)]);
    // An x sits on the baseline at the anchor and stands up from it, which is a
    // larger y in the figure's own units. An outline turned over here is drawn
    // mirrored once the view turns the y axis over again.
    expect(box?.y.from).toBeCloseTo(0, 6);
    expect(box?.y.to).toBeGreaterThan(0);
    expect(box?.y.to).toBeCloseTo(font.xHeight / font.unitsPerEm, 3);
  });

  it('draws a label at the size it names, with its width the sum the advances give', async () => {
    const font = await shippedFont();
    const box = boundsOfMarks([pathOf(label('mmm', { size: 0.4 }), font)]);
    const width = textWidth(font, 'mmm', 0.4);
    // The drawn shapes sit inside the advances by the side bearings, so the ink
    // is narrower than the pen's walk and never wider.
    expect((box?.x.to ?? 0) - (box?.x.from ?? 0)).toBeLessThan(width);
    expect((box?.x.to ?? 0) - (box?.x.from ?? 0)).toBeGreaterThan(width * 0.9);
  });

  it('carries the fill, the opacity and the clip across and keeps the id', async () => {
    const font = await shippedFont();
    const clip = { x: { from: -1, to: 1 }, y: { from: -1, to: 1 } };
    const outlined = pathOf(label('a', { id: 'reading', opacity: 0.5, clip }), font);
    expect(outlined.id).toBe('reading');
    expect(outlined.fill).toBe(black);
    expect(outlined.opacity).toBe(0.5);
    expect(outlined.clip).toBe(clip);
    expect(outlined.stroke).toBeUndefined();
  });

  it('draws a label whose character the font has no glyph for, rather than leaving it out', async () => {
    const font = await shippedFont();
    // The missing-glyph box is a shape, so a label outside the subset draws
    // something a reader can see rather than nothing at all.
    const outlined = outlineText(label('一'), font);
    expect(outlined?.path.length).toBeGreaterThan(0);
  });

  it('answers nothing for a label that draws no shape', async () => {
    const font = await shippedFont();
    expect(outlineText(label('   '), font)).toBeNull();
    expect(outlineText(label(''), font)).toBeNull();
  });
});

describe('textOutlines', () => {
  it('leaves a path mark alone and turns a label into one', async () => {
    const font = await shippedFont();
    const drawn: Mark = { kind: 'path', id: 'drawn', path: [], fill: black };
    const outlined = textOutlines([drawn, label('a')], font);
    expect(outlined).toHaveLength(2);
    expect(outlined[0]).toBe(drawn);
    expect(outlined[1].kind).toBe('path');
  });

  it('keeps the order the marks were painted in', async () => {
    const font = await shippedFont();
    const marks: Mark[] = [label('a', { id: 'first' }), { kind: 'path', id: 'second', path: [], fill: black }, label('b', { id: 'third' })];
    expect(textOutlines(marks, font).map((mark) => mark.id)).toEqual(['first', 'second', 'third']);
  });

  it('carries the depth the label stood at onto the shapes that draw it', async () => {
    const font = await shippedFont();
    const depth = { a: 0.5, b: 0.125, c: -3 };
    expect(textOutlines([label('a', { depth })], font)[0].depth).toEqual(depth);
    expect(textOutlines([label('a')], font)[0].depth).toBeUndefined();
  });

  it('drops a label that draws no shape rather than keeping an empty path', async () => {
    const font = await shippedFont();
    expect(textOutlines([label(' ')], font)).toHaveLength(0);
  });
});

describe('a label written both ways', () => {
  /**
   * The same label through one view, once as an element and once as the shapes
   * its glyphs draw.
   *
   * The view turns the y axis over for a surface, so an outline built the other
   * way up is drawn mirrored about its own baseline while the element beside it
   * stands upright. The two agreeing is what says the outline is in the figure's
   * own units rather than the surface's.
   */
  const WIDTH = 400;
  const HEIGHT = 200;
  const SIZE = 10;

  const figure = {
    extent: matchingAspect(100),
    fit: 'contain' as const,
    scene: group('figure', [text('word', vec2(0, 0), 'x', SIZE, { fill: black, baseline: 'alphabetic' })]),
    still: 0,
  };

  it('puts the ink on the same side of the baseline as the element does', async () => {
    const font = await shippedFont();
    const mark = label('x', { size: SIZE });
    const view = viewAt(figure, 0, WIDTH, HEIGHT);
    const [element] = svgElements([mark], view, { font });
    const baseline = Number(element.attributes.y);

    const box = boundsOfMarks([pathOf(mark, font)]);
    const top = mat3.transformPoint(view, vec2(0, box?.y.to ?? 0)).y;
    const bottom = mat3.transformPoint(view, vec2(0, box?.y.from ?? 0)).y;
    // Both are read on the surface, where y counts down, so ink standing on the
    // baseline is a smaller number than the baseline itself.
    expect(bottom).toBeCloseTo(baseline, 6);
    expect(top).toBeLessThan(baseline);
  });
});
