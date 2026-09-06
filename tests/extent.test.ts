import { describe, expect, it } from 'vitest';
import { byAspect, mat3, resolveExtent, vec2, viewMatrix } from '@altpsyche/maths';

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
