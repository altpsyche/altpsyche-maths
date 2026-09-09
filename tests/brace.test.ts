import { describe, expect, it } from 'vitest';
import { brace, bracePath, colourFrom, flatten, pointOn, vec2 } from '@altpsyche/maths';
import type { Path, Vec2 } from '@altpsyche/maths';

/**
 * A curly brace from one point to the other.
 *
 * What holds it together is symmetry: the two halves are mirror images about
 * the middle, so a brace cannot lean without this saying so.
 */

const from = vec2(-2, 1);
const to = vec2(2, 1);
const DEPTH = 0.8;

const points = (path: Path): Vec2[] => {
  const [subpath] = path;
  const out: Vec2[] = [subpath.start];
  let at = subpath.start;
  for (const curve of subpath.curves) {
    out.push(curve.control1, curve.control2, curve.to);
    at = curve.to;
  }
  return out;
};

/** Every point of the path, walked rather than read, which is what says the
 * curves stay inside the box and not only their ends. */
const walked = (path: Path): Vec2[] => {
  const [subpath] = path;
  const out: Vec2[] = [];
  let at = subpath.start;
  for (const curve of subpath.curves) {
    for (let step = 0; step <= 16; step++) out.push(pointOn(at, curve, step / 16));
    at = curve.to;
  }
  return out;
};

describe('bracePath', () => {
  it('starts on one point and ends on the other', () => {
    const [subpath] = bracePath(from, to, { depth: DEPTH });
    expect(subpath.start).toEqual(from);
    expect(subpath.curves[subpath.curves.length - 1].to).toEqual(to);
    expect(subpath.closed).toBe(false);
  });

  it('puts its tip the depth it was given off the line between them', () => {
    const path = bracePath(from, to, { depth: DEPTH });
    const highest = Math.max(...walked(path).map((point) => point.y));
    expect(highest).toBeCloseTo(1 + DEPTH, 12);
  });

  it('is a mirror image about its middle', () => {
    // Reflected across the middle and reversed, the path is itself. A brace
    // that leant would fail this and nothing else here would see it.
    const path = points(bracePath(from, to, { depth: DEPTH }));
    const middle = (from.x + to.x) / 2;
    for (let at = 0; at < path.length; at++) {
      const twin = path[path.length - 1 - at];
      expect(path[at].x - middle, `point ${at} across`).toBeCloseTo(middle - twin.x, 12);
      expect(path[at].y, `point ${at} up`).toBeCloseTo(twin.y, 12);
    }
  });

  it('stays inside the box its span and its depth describe', () => {
    for (const point of walked(bracePath(from, to, { depth: DEPTH }))) {
      expect(point.x).toBeGreaterThanOrEqual(from.x - 1e-12);
      expect(point.x).toBeLessThanOrEqual(to.x + 1e-12);
      expect(point.y).toBeGreaterThanOrEqual(from.y - 1e-12);
      expect(point.y).toBeLessThanOrEqual(from.y + DEPTH + 1e-12);
    }
  });

  it('turns the whole brace over when the depth is negative', () => {
    const lowest = Math.min(...walked(bracePath(from, to, { depth: -DEPTH })).map((point) => point.y));
    expect(lowest).toBeCloseTo(1 - DEPTH, 12);
  });

  it('keeps its tip at the depth asked for when the span is too short to curl', () => {
    // The curl narrows rather than the brace getting shallower, so two close
    // points still get a brace that reaches where it was told to.
    const close = bracePath(vec2(0, 0), vec2(0.2, 0), { depth: 1 });
    expect(Math.max(...walked(close).map((point) => point.y))).toBeCloseTo(1, 12);
    for (const point of walked(close)) {
      expect(point.x).toBeGreaterThanOrEqual(-1e-12);
      expect(point.x).toBeLessThanOrEqual(0.2 + 1e-12);
    }
  });

  it('draws nothing between one point and itself', () => {
    expect(bracePath(vec2(1, 1), vec2(1, 1), { depth: 0.5 })).toEqual([]);
  });

  it('braces a slanted pair the same way it braces a level one', () => {
    // The same six pieces and the same tip height, measured across the line
    // rather than up the page.
    const slanted = bracePath(vec2(0, 0), vec2(3, 4), { depth: 0.5 });
    expect(slanted[0].curves).toHaveLength(6);
    const along = vec2.normalize(vec2(3, 4));
    const out = vec2.perpendicular(along);
    const off = (point: Vec2) => point.x * out.x + point.y * out.y;
    expect(Math.max(...walked(slanted).map(off))).toBeCloseTo(0.5, 12);
  });
});

describe('a brace with a word on it', () => {
  const style = { stroke: { colour: colourFrom('#111'), width: 0.02 }, fill: { colour: colourFrom('#111') }, size: 0.3 };

  it('puts the word beyond the tip, on the far side from the two points', () => {
    const marks = flatten(brace('rise', from, to, '4', { depth: DEPTH, padding: 0.25, ...style }));
    const word = marks.find((mark) => mark.id === 'rise/word');
    if (word?.kind !== 'text') throw new Error('the word is text');
    expect(word.at.x).toBeCloseTo(0, 12);
    expect(word.at.y).toBeCloseTo(1 + DEPTH + 0.25, 12);
    expect(word.text).toBe('4');
  });

  it('stays beyond the tip at four turns of the same brace', () => {
    // Measured along the way the tip was pushed rather than up the page, so a
    // brace pointing sideways is held to the same rule as one pointing up.
    for (const turn of [0, 1, 2, 3]) {
      const angle = (turn * Math.PI) / 2;
      const end = vec2(Math.cos(angle) * 2, Math.sin(angle) * 2);
      const marks = flatten(brace('b', vec2(0, 0), end, 'n', { depth: 0.4, padding: 0.2, ...style }));
      const word = marks.find((mark) => mark.id === 'b/word');
      if (word?.kind !== 'text') throw new Error('the word is text');
      const out = vec2.perpendicular(vec2.normalize(end));
      const middle = vec2.scale(end, 0.5);
      const off = (word.at.x - middle.x) * out.x + (word.at.y - middle.y) * out.y;
      expect(off, `turn ${turn}`).toBeCloseTo(0.6, 12);
    }
  });

  it('anchors the word rather than measuring it, so its length changes nothing', () => {
    const place = (content: string) => {
      const word = flatten(brace('b', from, to, content, { depth: DEPTH, ...style })).find(
        (mark) => mark.id === 'b/word'
      );
      return word?.kind === 'text' ? word.at : undefined;
    };
    expect(place('9')).toEqual(place('a much longer label than that'));
  });

  it('is the brace and the word under the name it was given', () => {
    const marks = flatten(brace('rise', from, to, '4', { depth: DEPTH, ...style }));
    expect(marks.map((mark) => mark.id)).toEqual(['rise/brace', 'rise/word']);
  });
});
