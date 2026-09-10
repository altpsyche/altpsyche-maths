import { describe, expect, it } from 'vitest';
import {
  circle,
  flattenPath,
  marksAt,
  outlinedMarks,
  polygon,
  rect,
  trianglesOf,
  triangleArea,
  vec2,
  windingAt,
} from '@altpsyche/maths';
import type { Mark, Path, Vec2 } from '@altpsyche/maths';
import { tangent } from '../demos/tangent.js';
import { solid } from '../demos/surface.js';

/**
 * A filled path cut into triangles.
 *
 * What a triangulation is held to is area: the triangles cover what the fill
 * rule says is inside, and nothing else. A count of triangles says a shape was
 * cut and says nothing about where, so every claim here is an area or a point
 * tested against the rule.
 */

const TOLERANCE = 0.002;

/**
 * The area the nonzero rule says is inside, taken off the same flattening the
 * triangles are cut from, so the two answer the same question.
 *
 * The signed areas of the rings summed is that area exactly: a hole is wound the
 * other way and subtracts itself. The even-odd rule has no such sum, so what the
 * tests below hold it to is the area of the shape they name.
 */
function ruledArea(path: Path): number {
  const loops = flattenPath(path, { tolerance: TOLERANCE });
  let sum = 0;
  for (const loop of loops) {
    let ring = 0;
    for (let at = 1; at < loop.length; at += 1) {
      ring += loop[at - 1].x * loop[at].y - loop[at].x * loop[at - 1].y;
    }
    sum += ring / 2;
  }
  return Math.abs(sum);
}

/** Whether a point falls inside any of the triangles, which is how a hole is
 * shown to be empty. */
function covered(corners: readonly Vec2[], point: Vec2): boolean {
  const side = (a: Vec2, b: Vec2) => (b.x - a.x) * (point.y - a.y) - (point.x - a.x) * (b.y - a.y);
  for (let at = 0; at + 2 < corners.length; at += 3) {
    const one = side(corners[at], corners[at + 1]);
    const two = side(corners[at + 1], corners[at + 2]);
    const three = side(corners[at + 2], corners[at]);
    if ((one >= 0 && two >= 0 && three >= 0) || (one <= 0 && two <= 0 && three <= 0)) return true;
  }
  return false;
}

/** A subpath walked the other way, which is how a ring becomes a hole under the
 * nonzero rule. Each cubic is taken backwards with its controls swapped. */
function reversed(path: Path): Path {
  return path.map((subpath) => {
    const points = [subpath.start, ...subpath.curves.map((curve) => curve.to)];
    const curves = subpath.curves
      .map((curve, at) => ({
        control1: curve.control2,
        control2: curve.control1,
        to: points[at],
      }))
      .reverse();
    return { start: points[points.length - 1], curves, closed: subpath.closed };
  });
}

const annulus: Path = [...circle(vec2(0, 0), 1), ...reversed(circle(vec2(0, 0), 0.5))];

describe('trianglesOf', () => {
  it('cuts a square into two triangles covering it exactly', () => {
    const corners = trianglesOf(rect(vec2(-1, -1), 2, 2));
    expect(corners).toHaveLength(6);
    expect(triangleArea(corners)).toBeCloseTo(4, 12);
  });

  it('cuts a shape with a corner turned inward without covering the notch', () => {
    const arrow = polygon([vec2(0, 0), vec2(4, 0), vec2(4, 4), vec2(2, 1), vec2(0, 4)]);
    const corners = trianglesOf(arrow);
    // The five-sided shape is three triangles, and the notch above the inward
    // corner belongs to none of them.
    expect(corners).toHaveLength(9);
    expect(triangleArea(corners)).toBeCloseTo(ruledArea(arrow), 12);
    expect(covered(corners, vec2(2, 3))).toBe(false);
    expect(covered(corners, vec2(2, 0.5))).toBe(true);
  });

  it('covers a circle to the area its own flattening encloses', () => {
    const corners = trianglesOf(circle(vec2(0, 0), 1));
    expect(triangleArea(corners)).toBeCloseTo(ruledArea(circle(vec2(0, 0), 1)), 12);
    // The flattening is a polygon inside the circle, so it falls short of πr².
    // At a tolerance of 0.002 the shortfall is 0.00417 of a unit squared, which
    // is 0.13 per cent of the area.
    expect(Math.PI - triangleArea(corners)).toBeGreaterThan(0.004);
    expect(Math.PI - triangleArea(corners)).toBeLessThan(0.0042);
  });

  it('leaves the hole of an annulus empty under the nonzero rule', () => {
    const corners = trianglesOf(annulus);
    expect(triangleArea(corners)).toBeCloseTo(ruledArea(annulus), 10);
    // π(1 - ¼) is 2.35619 and the two flattened rings enclose 0.00313 less.
    expect(Math.PI * 0.75 - triangleArea(corners)).toBeGreaterThan(0.003);
    expect(Math.PI * 0.75 - triangleArea(corners)).toBeLessThan(0.0032);
    expect(covered(corners, vec2(0, 0))).toBe(false);
    expect(covered(corners, vec2(0.75, 0))).toBe(true);
    expect(covered(corners, vec2(1.25, 0))).toBe(false);
  });

  it('leaves the hole empty under the even-odd rule as well, with both rings wound alike', () => {
    const rings: Path = [...circle(vec2(0, 0), 1), ...circle(vec2(0, 0), 0.5)];
    const odd = trianglesOf(rings, { rule: 'evenodd' });
    expect(Math.PI * 0.75 - triangleArea(odd)).toBeGreaterThan(0.003);
    expect(Math.PI * 0.75 - triangleArea(odd)).toBeLessThan(0.0032);
    expect(covered(odd, vec2(0, 0))).toBe(false);
    // The nonzero rule fills the same two rings solid, since both wind the same
    // way and neither cancels the other. The inner ring is covered by the outer
    // ring's own triangles and is not cut a second time, so the area is the
    // outer disc's rather than the two discs added up.
    const whole = trianglesOf(rings);
    expect(triangleArea(whole)).toBeCloseTo(triangleArea(trianglesOf(circle(vec2(0, 0), 1))), 12);
    expect(Math.PI - triangleArea(whole)).toBeLessThan(0.0042);
    expect(covered(whole, vec2(0, 0))).toBe(true);
  });

  it('cuts two rings side by side as two shapes rather than one', () => {
    const pair: Path = [...circle(vec2(-2, 0), 1), ...circle(vec2(2, 0), 1)];
    const corners = trianglesOf(pair);
    expect(triangleArea(corners)).toBeCloseTo(ruledArea(pair), 10);
    expect(2 * Math.PI - triangleArea(corners)).toBeLessThan(0.0084);
    expect(covered(corners, vec2(0, 0))).toBe(false);
    expect(covered(corners, vec2(-2, 0))).toBe(true);
    expect(covered(corners, vec2(2, 0))).toBe(true);
  });

  it('hands back nothing for a path that encloses nothing', () => {
    expect(trianglesOf([])).toEqual([]);
    expect(trianglesOf([{ start: vec2(0, 0), curves: [], closed: false }])).toEqual([]);
    const flat = polygon([vec2(0, 0), vec2(1, 0), vec2(2, 0)]);
    expect(trianglesOf(flat)).toEqual([]);
  });

  it('takes a finer tolerance as more triangles over the same shape', () => {
    const coarse = trianglesOf(circle(vec2(0, 0), 1), { tolerance: 0.05 });
    const fine = trianglesOf(circle(vec2(0, 0), 1), { tolerance: 0.0005 });
    expect(fine.length).toBeGreaterThan(coarse.length);
    expect(triangleArea(fine)).toBeGreaterThan(triangleArea(coarse));
    expect(Math.PI - triangleArea(fine)).toBeLessThan(Math.PI - triangleArea(coarse));
  });
});

/** Every filled mark of a figure at a time, cut and measured against the rule it
 * carries. */
function cutting(marks: readonly Mark[]) {
  let fills = 0;
  let triangles = 0;
  let worst = 0;
  let area = 0;
  const rules = new Set<string>();
  for (const mark of outlinedMarks(marks)) {
    if (mark.kind !== 'path' || !mark.fill) continue;
    fills += 1;
    rules.add(mark.fill.rule ?? 'nonzero');
    const corners = trianglesOf(mark.path, { tolerance: TOLERANCE, rule: mark.fill.rule });
    triangles += corners.length / 3;
    const cut = triangleArea(corners);
    area += cut;
    worst = Math.max(worst, Math.abs(cut - ruledArea(mark.path)));
  }
  return { fills, triangles, worst, area, rules: [...rules] };
}

describe('the demos cut into triangles', () => {
  it('covers every fill of the flat demo to its own area', () => {
    const cut = cutting(marksAt(tangent, 5));
    expect(cut.rules).toEqual(['nonzero']);
    expect(cut.fills).toBe(48);
    expect(cut.triangles).toBe(1056);
    // The area a fill rule encloses and the area its triangles cover are the
    // same number to a part in ten thousand of a millionth of a figure unit.
    expect(cut.worst).toBeLessThan(1e-10);
  });

  it('covers every fill of the solid demo to its own area', () => {
    const cut = cutting(marksAt(solid, 6));
    expect(cut.rules).toEqual(['nonzero']);
    expect(cut.fills).toBe(249);
    expect(cut.triangles).toBe(1193);
    expect(cut.worst).toBeLessThan(1e-10);
  });

  it('cuts a typeset equation, holes and all', () => {
    const glyphs = outlinedMarks(marksAt(tangent, 5)).filter(
      (mark) => mark.kind === 'path' && mark.fill && mark.path.length > 1
    );
    expect(glyphs).toHaveLength(7);
    for (const glyph of glyphs) {
      if (glyph.kind !== 'path') continue;
      const corners = trianglesOf(glyph.path, { tolerance: TOLERANCE, rule: glyph.fill?.rule });
      expect(corners.length).toBeGreaterThan(0);
      expect(triangleArea(corners)).toBeCloseTo(ruledArea(glyph.path), 10);
      // A hole is a place the rule calls empty, and no triangle reaches it.
      const loops = flattenPath(glyph.path, { tolerance: TOLERANCE });
      for (const loop of loops) {
        const middle = loop.reduce((sum, point) => vec2(sum.x + point.x, sum.y + point.y), vec2(0, 0));
        const centre = vec2(middle.x / loop.length, middle.y / loop.length);
        if (windingAt(loops, centre) === 0) expect(covered(corners, centre)).toBe(false);
      }
    }
  });
});
