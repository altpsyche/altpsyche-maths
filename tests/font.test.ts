import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readFont, shippedFont } from '@altpsyche/maths';

/**
 * The shipped typeface, read out of its own bytes.
 *
 * Every reading here is a reading of a value, so the whole of it runs with no
 * browser and no card. What a card draws with these shapes is the GPU gate's.
 */

/** Every character the eight committed figures write, read off their labels and
 * written out here so a subset that stopped covering one fails rather than draws
 * a box. */
const WRITTEN = ' ,-.0123456789abcdefghilmnopqrstuvwxyz';

describe('readFont', () => {
  it('reads the shipped subset', async () => {
    const font = await shippedFont();
    expect(font.unitsPerEm).toBe(1000);
    expect(font.glyphCount).toBe(205);
    // A line's height is what the horizontal header names, and both numbers are
    // positive as this reads them: the descent is turned over so a baseline plus
    // a descent is the bottom of the line.
    expect(font.ascent).toBeGreaterThan(0);
    expect(font.descent).toBeGreaterThan(0);
  });

  it('answers a glyph for every character the demos write', async () => {
    const font = await shippedFont();
    for (const character of WRITTEN) {
      const glyph = font.glyphFor(character.codePointAt(0) ?? 0);
      expect(glyph, `no glyph for ${JSON.stringify(character)}`).toBeGreaterThan(0);
      expect(glyph).toBeLessThan(font.glyphCount);
    }
  });

  it('answers the missing-glyph box for a code point the subset left out', async () => {
    const font = await shippedFont();
    // A Han character is outside Latin-1 and outside every range the subset was
    // cut to, so the font has no glyph for it and says so with glyph 0.
    expect(font.glyphFor(0x4e00)).toBe(0);
  });

  it('advances a wide letter further than a narrow one', async () => {
    const font = await shippedFont();
    const advanceOf = (character: string) => font.advanceOf(font.glyphFor(character.codePointAt(0) ?? 0));
    expect(advanceOf('m')).toBeGreaterThan(advanceOf('i'));
    expect(advanceOf(' ')).toBeGreaterThan(0);
    // Every digit advances the same amount, which is what lets a number change
    // without the label around it moving.
    const digits = [...'0123456789'].map(advanceOf);
    for (const digit of digits) expect(digit).toBe(digits[0]);
  });

  it('holds one reading of the font however often it is asked for', async () => {
    expect(await shippedFont()).toBe(await shippedFont());
  });

  it('refuses bytes that are not a TrueType file', () => {
    const nonsense = new Uint8Array(64);
    nonsense[0] = 0x4f;
    nonsense[1] = 0x54;
    nonsense[2] = 0x54;
    nonsense[3] = 0x4f;
    expect(() => readFont(nonsense)).toThrow('not TrueType');
  });

  it('names the table it is missing rather than reading past the end', () => {
    // A file with a valid version word and no tables at all, which is what a
    // truncated download looks like.
    const empty = new Uint8Array(12);
    new DataView(empty.buffer).setUint32(0, 0x00010000);
    expect(() => readFont(empty)).toThrow('no head table');
  });
});

describe('the one install', () => {
  it('reaches the font bytes by a call, so a consumer who writes no label never fetches them', () => {
    const root = path.resolve(import.meta.dirname, '..');
    const walk = (at: string): string[] =>
      readdirSync(at, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(at, entry.name);
        if (entry.isDirectory()) return walk(full);
        return entry.isFile() && full.endsWith('.js') && !full.endsWith('font-bytes.js') ? [full] : [];
      });
    const naming = walk(path.join(root, 'dist')).filter((file) => readFileSync(file, 'utf8').includes('font-bytes'));
    expect(naming).toHaveLength(1);
    // The one file that names them reaches them through a call rather than a line
    // at the top, which is what keeps 15 KB of font out of every graph.
    const reached = readFileSync(naming[0], 'utf8');
    expect(reached).toContain("import('./font-bytes.js')");
    expect(reached).not.toMatch(/^import .* from '\.\/font-bytes\.js'/m);
  });
});

describe('the glyph offsets', () => {
  it('holds one more offset than there are glyphs, and none runs backwards', async () => {
    const font = await shippedFont();
    expect(font.outlines).toHaveLength(font.glyphCount + 1);
    for (let glyph = 0; glyph < font.glyphCount; glyph += 1) {
      expect(font.outlines[glyph + 1]).toBeGreaterThanOrEqual(font.outlines[glyph]);
    }
    expect(font.outlines[font.glyphCount]).toBeLessThanOrEqual(font.bytes.byteLength);
  });

  it('gives a space no outline and a letter one', async () => {
    const font = await shippedFont();
    const span = (character: string) => {
      const glyph = font.glyphFor(character.codePointAt(0) ?? 0);
      return font.outlines[glyph + 1] - font.outlines[glyph];
    };
    expect(span(' ')).toBe(0);
    expect(span('a')).toBeGreaterThan(0);
  });
});
