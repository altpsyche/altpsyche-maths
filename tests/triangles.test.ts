import { describe, expect, it } from 'vitest';
import {
  areaOf,
  circle,
  clipTriangles,
  colourFrom,
  flattenPath,
  intersectionOf,
  interval,
  line,
  marksAt,
  outlinedMarks,
  outlinePath,
  polygon,
  rect,
  strokeTrianglesOf,
  trianglesOf,
  triangleArea,
  vec2,
  windingAt,
} from '@altpsyche/maths';
import type { Bounds, Mark, Path, Stroke, Vec2 } from '@altpsyche/maths';
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

/**
 * The outline's own tolerance rather than the triangulation's, since the outline
 * is where the curve is approximated and cutting a polyline is exact.
 */
const OUTLINE_TOLERANCE = 1e-3;

const black = colourFrom('#000');

/**
 * The area the two round caps of an open stroke come to, which is the regular
 * polygon inscribed in a disc of that radius rather than the disc.
 *
 * A turn is stepped at the widest angle whose chord stays inside the tolerance,
 * which for a radius r and a step d is r(1 - cos(d/2)), and each cap is a half
 * turn. An n-sided polygon inscribed in a disc covers (n/2)r²sin(2π/n), which at
 * a radius of a twentieth and a tolerance of a thousandth is sixteen sides and
 * 2.55 parts in a hundred under the disc.
 */
function capDisc(radius: number): number {
  const widest = 2 * Math.acos(1 - OUTLINE_TOLERANCE / radius);
  const sides = 2 * Math.ceil(Math.PI / widest);
  return ((sides / 2) * radius * radius * Math.sin((2 * Math.PI) / sides));
}

/** Every stroked mark of a figure at a time, widened and cut, with each one's
 * triangles measured against the area its own outline encloses. */
function stroking(marks: readonly Mark[]) {
  let strokes = 0;
  let triangles = 0;
  let empty = 0;
  let worst = 0;
  for (const mark of outlinedMarks(marks)) {
    if (mark.kind !== 'path' || !mark.stroke) continue;
    strokes += 1;
    const corners = strokeTrianglesOf(mark.path, mark.stroke);
    triangles += corners.length / 3;
    if (corners.length === 0) {
      empty += 1;
      continue;
    }
    const outline = outlinePath(mark.path, mark.stroke.width, {
      cap: mark.stroke.cap,
      join: mark.stroke.join,
    });
    worst = Math.max(worst, Math.abs(triangleArea(corners) - ruledArea(outline)));
  }
  return { strokes, triangles, empty, worst };
}

describe('strokeTrianglesOf', () => {
  it('cuts a straight line into two triangles covering its length by its width', () => {
    const corners = strokeTrianglesOf(line(vec2(0, 0), vec2(2, 0)), { colour: black, width: 0.1 });
    expect(corners).toHaveLength(6);
    expect(triangleArea(corners)).toBeCloseTo(0.2, 12);
  });

  it('covers a stroked circle to a part in ten thousand of two pi r w', () => {
    const corners = strokeTrianglesOf(circle(vec2(0, 0), 1), { colour: black, width: 0.1 });
    const band = 2 * Math.PI * 1 * 0.1;
    // The whole of the gap is the flattening, so it grows as the tolerance grows
    // against the radius.
    expect(Math.abs(triangleArea(corners) - band) / band).toBeLessThan(1e-4);
  });

  it('leaves a closed subpath a ring rather than a disc', () => {
    const corners = strokeTrianglesOf(circle(vec2(0, 0), 1), { colour: black, width: 0.1 });
    expect(covered(corners, vec2(0, 0))).toBe(false);
    expect(covered(corners, vec2(0, 1))).toBe(true);
  });

  // A stroke half as wide as the circle it runs round leaves an inner loop whose
  // corners are bevels, and a ring bevelled that finely was read as filled
  // before, which drew the whole disc rather than the band.
  it('leaves a ring where the width is a quarter of the radius', () => {
    const corners = strokeTrianglesOf(circle(vec2(0, 0), 0.2), { colour: black, width: 0.05 });
    const band = 2 * Math.PI * 0.2 * 0.05;
    expect(Math.abs(triangleArea(corners) - band) / band).toBeLessThan(1e-3);
    expect(covered(corners, vec2(0, 0))).toBe(false);
  });

  it('adds the cap the stroke names to the area', () => {
    const path = line(vec2(0, 0), vec2(2, 0));
    const butt = strokeTrianglesOf(path, { colour: black, width: 0.1 });
    const square = strokeTrianglesOf(path, { colour: black, width: 0.1, cap: 'square' });
    const round = strokeTrianglesOf(path, { colour: black, width: 0.1, cap: 'round' });
    // A square cap reaches half the width past each end, so the two of them add
    // the width squared to the length by the width.
    expect(triangleArea(butt)).toBeCloseTo(0.2, 12);
    expect(triangleArea(square)).toBeCloseTo(0.21, 12);
    expect(triangleArea(round)).toBeCloseTo(0.2 + capDisc(0.05), 12);
  });

  it('draws nothing for a subpath with no length under a butt cap', () => {
    const dot = line(vec2(1, 1), vec2(1, 1));
    expect(strokeTrianglesOf(dot, { colour: black, width: 0.1 })).toHaveLength(0);
    const round = strokeTrianglesOf(dot, { colour: black, width: 0.1, cap: 'round' });
    expect(triangleArea(round)).toBeCloseTo(capDisc(0.05), 12);
  });

  it('covers the share of a solid stroke the dash pattern draws', () => {
    const path = line(vec2(0, 0), vec2(2, 0));
    const solidRun = strokeTrianglesOf(path, { colour: black, width: 0.1 });
    const dashed = strokeTrianglesOf(path, { colour: black, width: 0.1, dash: [0.1, 0.1] });
    // Ten runs of a tenth over two units under a butt cap, so half the area and
    // none of the length the caps of a wider run would add.
    expect(triangleArea(dashed)).toBeCloseTo(triangleArea(solidRun) / 2, 12);
  });

  it('widens a tapered stroke solid and leaves its dash out', () => {
    // A taper is a fraction of the whole path's length, and outlinedMarks drops
    // the dash with the stroke it turns into a fill, so both painters draw this
    // solid too.
    const path = line(vec2(0, 0), vec2(2, 0));
    const taper = { from: 0.1, to: 0.1 } as const;
    const solidRun = strokeTrianglesOf(path, { colour: black, width: taper });
    const dashed = strokeTrianglesOf(path, { colour: black, width: taper, dash: [0.1, 0.1] });
    expect(triangleArea(dashed)).toBeCloseTo(triangleArea(solidRun), 12);
  });

  it('cuts a tapered stroke, which reaches it as an outline already', () => {
    const tapered = outlinePath(line(vec2(0, 0), vec2(2, 0)), { from: 0.2, to: 0 });
    const corners = trianglesOf(tapered, { tolerance: OUTLINE_TOLERANCE, rule: 'nonzero' });
    // A width falling to nothing along a straight run is a triangle of the
    // length by half the width at its start.
    expect(triangleArea(corners)).toBeCloseTo(0.2, 6);
  });
});

describe('the demos stroked into triangles', () => {
  it('covers every stroke of the flat demo to its own outline', () => {
    const cut = stroking(marksAt(tangent, 5));
    expect(cut.strokes).toBe(115);
    expect(cut.triangles).toBe(498);
    // Eight marks carry an empty path and sixteen a subpath with no length under
    // a butt cap, and both other painters draw nothing for either.
    expect(cut.empty).toBe(24);
    expect(cut.worst).toBeLessThan(1e-10);
  });

  it('covers every stroke of the solid demo to its own outline', () => {
    const cut = stroking(marksAt(solid, 6));
    expect(cut.strokes).toBe(72);
    expect(cut.triangles).toBe(558);
    expect(cut.empty).toBe(8);
    expect(cut.worst).toBeLessThan(1e-10);
  });
});

/** The rectangle a clip names, as a path, so a clipped area can be read off the
 * package's own boolean intersection. */
function boxPath(box: Bounds): Path {
  const across = interval.ordered(box.x);
  const up = interval.ordered(box.y);
  return rect(vec2(across.from, up.from), across.to - across.from, up.to - up.from);
}

/**
 * How much of a list of triangles falls inside a box, by the boolean
 * intersection rather than by the clipping under test.
 *
 * A triangle and a rectangle are both straight-sided, so the two answers are
 * held to the 1.776e-15 the boolean operations hold themselves to rather than to
 * a flattening.
 */
function intersectedArea(corners: readonly Vec2[], box: Bounds): number {
  const against = boxPath(box);
  let sum = 0;
  for (let at = 0; at + 2 < corners.length; at += 3) {
    sum += areaOf(intersectionOf(polygon([corners[at], corners[at + 1], corners[at + 2]]), against));
  }
  return sum;
}

/** Every clipped mark of a figure at a time, cut to its box and measured against
 * the intersection of the same triangles with that box. */
function clipping(marks: readonly Mark[]) {
  let clipped = 0;
  let paths = 0;
  let before = 0;
  let after = 0;
  let emptied = 0;
  let worst = 0;
  for (const mark of outlinedMarks(marks)) {
    if (!mark.clip) continue;
    clipped += 1;
    if (mark.kind !== 'path') continue;
    paths += 1;
    const corners = mark.fill
      ? trianglesOf(mark.path, { tolerance: TOLERANCE, rule: mark.fill.rule })
      : strokeTrianglesOf(mark.path, mark.stroke as Stroke);
    const cut = clipTriangles(corners, mark.clip);
    before += corners.length / 3;
    after += cut.length / 3;
    if (corners.length > 0 && cut.length === 0) emptied += 1;
    worst = Math.max(worst, Math.abs(triangleArea(cut) - intersectedArea(corners, mark.clip)));
  }
  return { clipped, paths, before, after, emptied, worst };
}

const unitBox: Bounds = { x: interval(0, 1), y: interval(0, 1) };

describe('clipTriangles', () => {
  it('leaves a triangle inside the box alone', () => {
    const inside = [vec2(0.1, 0.1), vec2(0.9, 0.1), vec2(0.5, 0.9)];
    const cut = clipTriangles(inside, unitBox);
    expect(cut).toEqual(inside);
  });

  it('drops a triangle outside the box', () => {
    const outside = [vec2(2, 2), vec2(3, 2), vec2(2.5, 3)];
    expect(clipTriangles(outside, unitBox)).toHaveLength(0);
  });

  it('cuts a triangle back to the box where it crosses one side', () => {
    // The triangle's slope leaves the box at half its height, so what stays is
    // the box less the corner triangle of a half by a half.
    const across = [vec2(0, 0), vec2(2, 0), vec2(0, 1)];
    const cut = clipTriangles(across, unitBox);
    expect(triangleArea(cut)).toBeCloseTo(intersectedArea(across, unitBox), 14);
    expect(triangleArea(cut)).toBeCloseTo(0.75, 14);
  });

  it('cuts a triangle covering the whole box back to the box', () => {
    const over = [vec2(-5, -1), vec2(5, -1), vec2(0, 6)];
    const cut = clipTriangles(over, unitBox);
    // Four corners are a fan of two triangles, and their area is the box's.
    expect(cut).toHaveLength(6);
    expect(triangleArea(cut)).toBeCloseTo(1, 14);
  });

  it('reads a box given either way round as the same box', () => {
    const across = [vec2(0, 0), vec2(2, 0), vec2(0, 1)];
    const backwards: Bounds = { x: interval(1, 0), y: interval(1, 0) };
    expect(triangleArea(clipTriangles(across, backwards))).toBeCloseTo(0.75, 14);
  });

  it('keeps a corner sitting on the boundary without adding one', () => {
    const touching = [vec2(0, 0), vec2(1, 0), vec2(0, 1)];
    expect(clipTriangles(touching, unitBox)).toHaveLength(3);
  });
});

describe('the demos clipped', () => {
  it('cuts every clipped mark of the flat demo to its own box', () => {
    const cut = clipping(marksAt(tangent, 5));
    // Twelve of the forty carry text, which has no outline until a card has a
    // source of glyphs.
    expect(cut.clipped).toBe(40);
    expect(cut.paths).toBe(28);
    expect(cut.before).toBe(317);
    expect(cut.after).toBe(244);
    expect(cut.worst).toBeLessThan(1e-9);
  });

  it('cuts every clipped mark of the solid demo to its own box', () => {
    const cut = clipping(marksAt(solid, 6));
    expect(cut.clipped).toBe(72);
    expect(cut.paths).toBe(61);
    expect(cut.before).toBe(296);
    expect(cut.after).toBe(190);
    // Two marks fall wholly outside the box they carry.
    expect(cut.emptied).toBe(2);
    expect(cut.worst).toBeLessThan(1e-9);
  });
});
