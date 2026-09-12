import { describe, expect, it } from 'vitest';
import { flattenPath, glyphPath, pointOn, shippedFont, vec2 } from '@altpsyche/maths';
import type { Font, Vec2 } from '@altpsyche/maths';

/**
 * A glyph's outline read out of the shipped typeface.
 *
 * The reading every claim here rests on is the glyph's own bounding box, which a
 * `glyf` entry writes in its first four numbers. A reader that placed a point
 * wrongly, dropped a contour or mistook a control point for a point on the curve
 * would move one of those four edges, so comparing a flattened outline with the
 * box the font itself declares checks the whole walk against the font rather than
 * against this reader's own arithmetic.
 */

/** Where a quadratic through one control sits at a parameter, which is the curve
 * the cubic has to be. */
function quadraticAt(from: Vec2, control: Vec2, to: Vec2, at: number): Vec2 {
  const rest = 1 - at;
  return vec2(
    rest * rest * from.x + 2 * rest * at * control.x + at * at * to.x,
    rest * rest * from.y + 2 * rest * at * control.y + at * at * to.y
  );
}

/** The four edges a flattened outline reaches, in font units. */
function boundsOfGlyph(font: Font, glyph: number): [number, number, number, number] | null {
  const path = glyphPath(font, glyph);
  if (path.length === 0) return null;
  let left = Infinity;
  let bottom = Infinity;
  let right = -Infinity;
  let top = -Infinity;
  for (const loop of flattenPath(path, { tolerance: 0.02 })) {
    for (const point of loop) {
      left = Math.min(left, point.x);
      bottom = Math.min(bottom, point.y);
      right = Math.max(right, point.x);
      top = Math.max(top, point.y);
    }
  }
  return [left, bottom, right, top];
}

/** The bounding box the font writes for a glyph, which is the first four numbers
 * of its own entry. */
function declaredBounds(font: Font, glyph: number): [number, number, number, number] | null {
  const at = font.outlines[glyph];
  if (font.outlines[glyph + 1] <= at) return null;
  const view = new DataView(font.bytes.buffer, font.bytes.byteOffset, font.bytes.byteLength);
  return [view.getInt16(at + 2), view.getInt16(at + 4), view.getInt16(at + 6), view.getInt16(at + 8)];
}

const glyphOf = (font: Font, character: string) => font.glyphFor(character.codePointAt(0) ?? 0);

describe('a quadratic as a cubic', () => {
  it('is the same curve at every parameter it is sampled at', async () => {
    const font = await shippedFont();
    // The letter is read for real segments rather than made up, so the check is
    // over the control placements a font actually writes.
    const path = glyphPath(font, glyphOf(font, 'o'));
    const subpath = path[0];
    let from = subpath.start;
    let checked = 0;
    for (const curve of subpath.curves) {
      // A cubic converted from a quadratic has both its controls on the segments
      // from each end to the quadratic's own control, two thirds of the way
      // along, so the quadratic's control is recoverable from either.
      const control = vec2(
        from.x + (curve.control1.x - from.x) * 1.5,
        from.y + (curve.control1.y - from.y) * 1.5
      );
      for (let step = 0; step <= 10; step += 1) {
        const at = step / 10;
        const cubic = pointOn(from, curve, at);
        const quadratic = quadraticAt(from, control, curve.to, at);
        expect(cubic.x).toBeCloseTo(quadratic.x, 12);
        expect(cubic.y).toBeCloseTo(quadratic.y, 12);
      }
      from = curve.to;
      checked += 1;
    }
    expect(checked).toBeGreaterThan(4);
  });
});

describe('glyphPath', () => {
  it('reads every glyph in the subset', async () => {
    const font = await shippedFont();
    let read = 0;
    let empty = 0;
    for (let glyph = 0; glyph < font.glyphCount; glyph += 1) {
      const path = glyphPath(font, glyph);
      read += 1;
      if (path.length === 0) empty += 1;
    }
    expect(read).toBe(205);
    // The space and one other glyph the subset keeps with no outline. The
    // missing-glyph box keeps its own, so a character the subset does not cover
    // draws something a reader can see.
    expect(empty).toBe(2);
  });

  it('reaches the four edges every glyph declares for itself', async () => {
    const font = await shippedFont();
    let checked = 0;
    let worst = 0;
    for (let glyph = 0; glyph < font.glyphCount; glyph += 1) {
      const declared = declaredBounds(font, glyph);
      const drawn = boundsOfGlyph(font, glyph);
      if (!declared || !drawn) continue;
      for (let edge = 0; edge < 4; edge += 1) worst = Math.max(worst, Math.abs(drawn[edge] - declared[edge]));
      checked += 1;
    }
    expect(checked).toBe(203);
    // A flattening at a fiftieth of a font unit can only fall short of a curve's
    // far edge, and every edge here is a point the outline passes through, so the
    // two boxes are the same box.
    expect(worst).toBe(0);
  });

  it('gives a letter with a hole its own second contour', async () => {
    const font = await shippedFont();
    expect(glyphPath(font, glyphOf(font, 'o'))).toHaveLength(2);
    expect(glyphPath(font, glyphOf(font, 'a'))).toHaveLength(2);
    expect(glyphPath(font, glyphOf(font, '.'))).toHaveLength(1);
  });

  it('draws a composite glyph as its parts under their own transforms', async () => {
    const font = await shippedFont();
    const accented = glyphOf(font, 'é');
    const plain = glyphOf(font, 'e');
    // The accented letter is built from the letter and the accent, so it carries
    // the letter's own contours and one more.
    expect(glyphPath(font, accented)).toHaveLength(glyphPath(font, plain).length + 1);
    const drawn = boundsOfGlyph(font, accented);
    const declared = declaredBounds(font, accented);
    expect(drawn).toEqual(declared);
    // The accent sits above the letter, which is what the component's offset
    // does and what a reader ignoring it would lose.
    expect(drawn?.[3]).toBeGreaterThan(boundsOfGlyph(font, plain)?.[3] ?? 0);
  });

  it('gives no outline for a space and for a glyph the font does not hold', async () => {
    const font = await shippedFont();
    expect(glyphPath(font, glyphOf(font, ' '))).toEqual([]);
    expect(glyphPath(font, font.glyphCount)).toEqual([]);
    expect(glyphPath(font, -1)).toEqual([]);
  });

  it('closes every contour, since a letter is a filled shape', async () => {
    const font = await shippedFont();
    for (const character of 'aeimo.') {
      for (const subpath of glyphPath(font, glyphOf(font, character))) {
        expect(subpath.closed).toBe(true);
        expect(subpath.curves.length).toBeGreaterThan(1);
      }
    }
  });
});
