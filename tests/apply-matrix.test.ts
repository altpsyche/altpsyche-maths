import { describe, expect, it } from 'vitest';
import { applyMatrix, colourFrom, flatten, line, mat3, polygon, rotate, shape, vec2 } from '@altpsyche/maths';
import type { Mark, Transform2D, PathMark } from '@altpsyche/maths';

/**
 * The linear map over a list of marks, and the price of reaching it entry by
 * entry rather than by an angle.
 */

const pen = { colour: colourFrom('#fff'), width: 0.1 };
const square = flatten(shape('s', polygon([vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1)]), { stroke: pen }));
const paths = (marks: readonly Mark[]) => marks.filter((m): m is PathMark => m.kind === 'path');

/** The signed area a closed run of straight pieces encloses, by the shoelace
 * sum over its corners. */
function areaOf(mark: PathMark): number {
  const points = [mark.path[0].start, ...mark.path[0].curves.map((curve) => curve.to)];
  let twice = 0;
  for (let at = 0; at < points.length - 1; at += 1) {
    twice += points[at].x * points[at + 1].y - points[at + 1].x * points[at].y;
  }
  return Math.abs(twice) / 2;
}

const determinant = (m: Transform2D) => m[0] * m[4] - m[3] * m[1];
const reached = (turn: number, along: number) => {
  const marks = applyMatrix('s', mat3.rotation(turn))(square, along);
  return areaOf(paths(marks)[0]);
};

describe('applyMatrix', () => {
  const shear: Transform2D = [1, 0, 0, 1, 1, 0, 0, 0, 1];

  it('leaves the marks where they were at the start of its span', () => {
    expect(paths(applyMatrix('s', shear)(square, 0))[0].path[0].start).toEqual({ x: 0, y: 0 });
  });

  it('reaches the whole map at the end of its span', () => {
    const mapped = paths(applyMatrix('s', shear)(square, 1))[0];
    expect(mapped.path[0].curves[1].to).toEqual(mat3.transformPoint(shear, vec2(1, 1)));
  });

  it('takes a straight line to a straight line, so its two ends are the whole of it', () => {
    const through: Transform2D = [1, 0, 0, 0.37, 1, 0, 0, 0, 1];
    const corners = [vec2(1, 0), vec2(1, 1), vec2(0, 1), vec2(0, 0)];
    const mapped = paths(applyMatrix('s', shear)(square, 0.37))[0];
    for (const [at, curve] of mapped.path[0].curves.entries()) {
      expect(curve.to).toEqual(mat3.transformPoint(through, corners[at]));
    }
  });

  it('halves the area halfway to a quarter turn, where the angle holds it at one', () => {
    expect(reached(Math.PI / 2, 0.5)).toBeCloseTo(0.5, 12);
    expect(areaOf(paths(rotate('s', Math.PI / 2)(square, 0.5))[0])).toBeCloseTo(1, 12);
  });

  it('flattens every point onto one line halfway to a half turn', () => {
    expect(reached(Math.PI, 0.5)).toBeCloseTo(0, 12);
  });

  it('holds the area to the determinant it has reached, all the way along', () => {
    for (const along of [0, 0.25, 0.5, 0.75, 1]) {
      const through: Transform2D = mat3.IDENTITY.map((entry, at) => entry + (shear[at] - entry) * along) as unknown as Transform2D;
      expect(areaOf(paths(applyMatrix('s', shear)(square, along))[0])).toBeCloseTo(Math.abs(determinant(through)), 12);
    }
  });

  it('maps about the origin rather than the middle of the box round the marks', () => {
    const away = flatten(shape('s', line(vec2(4, 0), vec2(5, 0)), { stroke: pen }));
    const mapped = paths(applyMatrix('s', mat3.scaling(vec2(2, 2)))(away, 1))[0];
    expect(mapped.path[0].start).toEqual({ x: 8, y: 0 });
  });

  it('maps about a point the figure names when it names one', () => {
    const away = flatten(shape('s', line(vec2(4, 0), vec2(5, 0)), { stroke: pen }));
    const mapped = paths(applyMatrix('s', mat3.scaling(vec2(2, 2)), { pivot: vec2(4, 0) })(away, 1))[0];
    expect(mapped.path[0].start).toEqual({ x: 4, y: 0 });
  });

  it('changes nothing when the name matches no mark', () => {
    expect(applyMatrix('other', shear)(square, 1)).toEqual(square);
  });
});
