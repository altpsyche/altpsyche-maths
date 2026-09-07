import { describe, expect, it } from 'vitest';
import { at, byAspect, fractionOf, group, mat3, resolveExtent, vec2, viewAt, viewMatrix } from '@altpsyche/maths';
import type { Figure } from '@altpsyche/maths';

/**
 * One matrix takes a figure's own units onto a surface. What it has to get right
 * is the middle, the flip, and which way round `contain` and `cover` read.
 */

const wide = { width: 16, height: 9 };

describe('viewMatrix', () => {
  it('puts the middle of the extent at the middle of the surface', () => {
    const m = viewMatrix(wide, 'contain', 1600, 900);
    expect(mat3.transformPoint(m, vec2(0, 0))).toEqual({ x: 800, y: 450 });
  });

  it('flips the y axis, because a figure counts up and a surface counts down', () => {
    const m = viewMatrix(wide, 'contain', 1600, 900);
    expect(mat3.transformPoint(m, vec2(0, 4.5)).y).toBeCloseTo(0, 10);
    expect(mat3.transformPoint(m, vec2(0, -4.5)).y).toBeCloseTo(900, 10);
  });

  it('holds the whole extent inside the surface when it contains', () => {
    const m = viewMatrix(wide, 'contain', 1600, 1600);
    const right = mat3.transformPoint(m, vec2(8, 0)).x;
    const top = mat3.transformPoint(m, vec2(0, 4.5)).y;
    expect(right).toBeCloseTo(1600, 10);
    expect(top).toBeCloseTo(350, 10);
  });

  it('fills the surface and runs off two edges when it covers', () => {
    const m = viewMatrix(wide, 'cover', 1600, 1600);
    const right = mat3.transformPoint(m, vec2(8, 0)).x;
    const top = mat3.transformPoint(m, vec2(0, 4.5)).y;
    expect(right).toBeGreaterThan(1600);
    expect(top).toBeCloseTo(0, 10);
  });

  it('reads the same at every size, which is the whole point of figure units', () => {
    const small = viewMatrix(wide, 'contain', 640, 360);
    const large = viewMatrix(wide, 'contain', 2560, 1440);
    const at = (m: ReturnType<typeof viewMatrix>, width: number) => {
      const point = mat3.transformPoint(m, vec2(4, 2));
      return { x: point.x / width, y: point.y / (width * (9 / 16)) };
    };
    expect(at(small, 640).x).toBeCloseTo(at(large, 2560).x, 10);
    expect(at(small, 640).y).toBeCloseTo(at(large, 2560).y, 10);
  });
});

describe('extent choice', () => {
  it('takes a fixed extent as it is', () => {
    expect(resolveExtent(wide, 0.5625)).toEqual(wide);
  });

  it('picks by the shape of the surface where a figure asked to', () => {
    const choose = byAspect({ wide, square: { width: 10, height: 10 }, tall: { width: 9, height: 16 } });
    expect(resolveExtent(choose, 16 / 9)).toEqual(wide);
    expect(resolveExtent(choose, 1)).toEqual({ width: 10, height: 10 });
    expect(resolveExtent(choose, 9 / 16)).toEqual({ width: 9, height: 16 });
  });
});

describe('a view that moves', () => {
  const still = { width: 16, height: 9 };
  const moved = { ...still, centre: vec2(3, -2) };

  it('leaves an extent with no centre exactly where it was', () => {
    const before = mat3.multiply(mat3.translation(vec2(80, 45)), mat3.scaling(vec2(10, -10)));
    const now = viewMatrix(still, 'contain', 160, 90);
    for (let entry = 0; entry < 9; entry += 1) {
      expect(Math.abs(now[entry] - before[entry])).toBeLessThan(1e-12);
    }
  });

  it('puts the centre of a moved extent at the middle of the surface', () => {
    const middle = mat3.transformPoint(viewMatrix(moved, 'contain', 160, 90), vec2(3, -2));
    expect(Math.abs(middle.x - 80)).toBeLessThan(1e-12);
    expect(Math.abs(middle.y - 45)).toBeLessThan(1e-12);
  });

  it('reads a fraction of the frame against the centre it is given', () => {
    expect(fractionOf(still, 0.5, 0.5)).toEqual(vec2(0, 0));
    expect(fractionOf(moved, 0.5, 0.5)).toEqual(vec2(3, -2));
    expect(fractionOf(moved, 1, 1)).toEqual(vec2(11, 2.5));
  });

  it('carries a mark placed against the frame with the frame', () => {
    const anchor = fractionOf(moved, 0.02, 0.925);
    const onSurface = mat3.transformPoint(viewMatrix(moved, 'contain', 160, 90), anchor);
    const stillAnchor = fractionOf(still, 0.02, 0.925);
    const stillOnSurface = mat3.transformPoint(viewMatrix(still, 'contain', 160, 90), stillAnchor);
    expect(Math.abs(onSurface.x - stillOnSurface.x)).toBeLessThan(1e-12);
    expect(Math.abs(onSurface.y - stillOnSurface.y)).toBeLessThan(1e-12);
  });

  it('hands a painter its matrix at a time in one call', () => {
    const figure: Figure = {
      extent: (aspect, seconds) => ({ width: 16 * aspect, height: 16, centre: vec2(seconds, 0) }),
      scene: group('nothing', []),
      still: 0,
    };
    expect(at(figure, 2)).toHaveLength(0);
    const early = viewAt(figure, 0, 160, 160);
    const later = viewAt(figure, 2, 160, 160);
    const seen = (matrix: typeof early) => mat3.transformPoint(matrix, vec2(2, 0)).x;
    expect(Math.abs(seen(early) - 100)).toBeLessThan(1e-12);
    expect(Math.abs(seen(later) - 80)).toBeLessThan(1e-12);
  });
});
