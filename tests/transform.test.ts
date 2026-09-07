import { describe, expect, it } from 'vitest';
import {
  boundsOfMarks,
  centreOf,
  circle,
  coordsOf,
  dot,
  flatten,
  group,
  growFrom,
  interval,
  moveAlong,
  plot,
  pointAlong,
  polygon,
  rotate,
  sameMarks,
  scale,
  scaleOf,
  shape,
  text,
  vec2,
  type Mark,
} from '../index.js';

const pen = { colour: '#222', width: 0.1 };
const ink = { colour: '#222' };

/** An L, whose box centre is a long way from where its weight is, which is what
 * makes it worth turning. */
const ell = polygon([vec2(0, 0), vec2(3, 0), vec2(3, 1), vec2(1, 1), vec2(1, 4), vec2(0, 4)]);
const elbow = () => flatten(group('fig', [shape('L', ell, { stroke: pen })]));

const points = (marks: readonly Mark[]) =>
  marks.flatMap((mark) =>
    mark.kind === 'path'
      ? mark.path.flatMap((subpath) => [subpath.start, ...subpath.curves.map((curve) => curve.to)])
      : [mark.at]
  );

const furthest = (one: readonly Mark[], two: readonly Mark[]) => {
  const a = points(one);
  const b = points(two);
  return Math.max(...a.map((point, at) => Math.hypot(point.x - b[at].x, point.y - b[at].y)));
};

describe('a turn', () => {
  it('lands where it began after a whole circle', () => {
    expect(furthest(elbow(), rotate('fig', 2 * Math.PI)(elbow(), 1))).toBeLessThan(1e-12);
  });

  it('keeps every point one distance from one centre across the whole span', () => {
    // This is what a pivot read off the marks after the turn would break: the
    // box round a turned shape is not the turned box, so the centre would move
    // as the fraction advanced and the turn would not be a turn.
    const marks = elbow();
    const box = boundsOfMarks(marks);
    if (!box) throw new Error('an L has a box');
    const pivot = centreOf(box);
    const radii: number[] = [];
    for (let step = 0; step <= 100; step++) {
      const turned = rotate('fig', 2 * Math.PI)(marks, step / 100);
      const corner = points(turned)[0];
      radii.push(Math.hypot(corner.x - pivot.x, corner.y - pivot.y));
    }
    expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(1e-12);
  });

  it('turns about a box centre that has moved by the time it is done', () => {
    // Read back after an eighth turn, the box centre is somewhere else, which
    // is the whole reason it is read before.
    const marks = elbow();
    const before = centreOf(boundsOfMarks(marks)!);
    const after = centreOf(boundsOfMarks(rotate('fig', Math.PI / 4)(marks, 1))!);
    expect(before.y).toBeCloseTo(2, 12);
    expect(after.y).toBeCloseTo(1.2928932188, 9);
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(0.7);
  });

  it('turns about a point a figure names instead', () => {
    const marks = elbow();
    const turned = rotate('fig', Math.PI, { pivot: vec2(0, 0) })(marks, 1);
    const corner = points(turned)[0];
    expect(corner.x).toBeCloseTo(0, 12);
    expect(corner.y).toBeCloseTo(0, 12);
    // The corner at three across turns to three back the other way.
    const far = points(turned)[1];
    expect(far.x).toBeCloseTo(-3, 12);
    expect(far.y).toBeCloseTo(0, 12);
  });

  it('hands back the very same marks at a fraction of nothing', () => {
    const marks = elbow();
    expect(rotate('fig', Math.PI)(marks, 0)).toBe(marks);
  });

  it('leaves the words upright and moves their anchor', () => {
    const marks = flatten(group('fig', [text('word', vec2(1, 0), 'hi', 0.5, { fill: ink })]));
    const turned = rotate('fig', Math.PI / 2, { pivot: vec2(0, 0) })(marks, 1);
    const word = turned[0];
    if (word.kind !== 'text') throw new Error('a word is text');
    expect(word.at.x).toBeCloseTo(0, 12);
    expect(word.at.y).toBeCloseTo(1, 12);
    expect(word.size).toBe(0.5);
    expect(word.text).toBe('hi');
  });

  it('changes nothing where its target matches nothing', () => {
    const marks = elbow();
    expect(rotate('nowhere', Math.PI)(marks, 1)).toBe(marks);
  });
});

describe('a growth', () => {
  const both = () =>
    flatten(
      group('fig', [
        shape('ring', circle(vec2(0, 0), 1), { stroke: pen }),
        text('word', vec2(2, 0), 'hi', 0.5, { fill: ink }),
      ])
    );

  it('carries the stroke and the words with the geometry', () => {
    // A transform that scales makes the lines thicker and the words bigger, the
    // way flatten already does for a group that scales.
    const grown = scale('fig', 2)(both(), 1);
    const ring = grown[0];
    const word = grown[1];
    if (ring.kind !== 'path' || word.kind !== 'text') throw new Error('a ring is a path and a word is text');
    expect(ring.stroke?.width).toBeCloseTo(0.2, 12);
    expect(word.size).toBeCloseTo(1, 12);
  });

  it('keeps the box centre where it was', () => {
    const marks = both();
    const before = centreOf(boundsOfMarks(marks)!);
    const after = centreOf(boundsOfMarks(scale('fig', 2)(marks, 1))!);
    expect(after.x).toBeCloseTo(before.x, 12);
    expect(after.y).toBeCloseTo(before.y, 12);
  });

  it('doubles the box it holds', () => {
    const marks = both();
    const before = boundsOfMarks(marks)!;
    const after = boundsOfMarks(scale('fig', 2)(marks, 1))!;
    expect(after.x.to - after.x.from).toBeCloseTo(2 * (before.x.to - before.x.from), 12);
  });

  it('hands back the very same marks at a fraction of nothing', () => {
    const marks = both();
    expect(scale('fig', 3)(marks, 0)).toBe(marks);
  });

  it('starts from the factor it is given rather than from its own size', () => {
    const marks = both();
    const nothing = scale('fig', 1, { from: 0 })(marks, 0);
    const box = boundsOfMarks(nothing)!;
    expect(box.x.to - box.x.from).toBeCloseTo(0, 12);
    expect(sameMarks(scale('fig', 1, { from: 0 })(marks, 1), marks)).toBe(true);
  });
});

describe('a mark carried along a path', () => {
  const coords = coordsOf(
    scaleOf(interval(-1, 4), interval(-4.6, 4.6)),
    scaleOf(interval(-1, 9), interval(-2.4, 2.4))
  );
  const curve = plot(coords, (x) => x * x);
  const start = pointAlong(curve, 0)!;
  const rider = () => flatten(group('fig', [dot('point', start, 0.08, ink)]));

  it('takes steps of one size along the path', () => {
    // By length rather than by piece: even steps in a cubic's parameter cover
    // more of the curve where the curve is moving fast.
    const places = Array.from({ length: 21 }, (_, step) => {
      const marks = moveAlong('fig', curve)(rider(), step / 20);
      return centreOf(boundsOfMarks(marks)!);
    });
    const gaps = places
      .slice(1)
      .map((place, at) => Math.hypot(place.x - places[at].x, place.y - places[at].y));
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(1.002);
  });

  it('sits on the far end of the path at a fraction of one', () => {
    const marks = moveAlong('fig', curve)(rider(), 1);
    const place = centreOf(boundsOfMarks(marks)!);
    const end = pointAlong(curve, 1)!;
    expect(place.x).toBeCloseTo(end.x, 9);
    expect(place.y).toBeCloseTo(end.y, 9);
  });

  it('hands back the very same marks at a fraction of nothing', () => {
    const marks = rider();
    expect(moveAlong('fig', curve)(marks, 0)).toBe(marks);
  });

  it('carries a mark placed elsewhere along the same shape from where it stands', () => {
    const away = flatten(group('fig', [dot('point', vec2(0, 0), 0.08, ink)]));
    const carriedTo = centreOf(boundsOfMarks(moveAlong('fig', curve)(away, 1))!);
    const end = pointAlong(curve, 1)!;
    expect(carriedTo.x).toBeCloseTo(end.x - start.x, 9);
    expect(carriedTo.y).toBeCloseTo(end.y - start.y, 9);
  });

  it('changes nothing along a path with no points', () => {
    const marks = rider();
    expect(moveAlong('fig', [])(marks, 0.5)).toBe(marks);
  });

  it('leaves a stroke and a word the size they were', () => {
    const marks = flatten(
      group('fig', [shape('ring', circle(vec2(0, 0), 1), { stroke: pen }), text('word', vec2(0, 0), 'hi', 0.5, { fill: ink })])
    );
    const moved = moveAlong('fig', curve)(marks, 0.5);
    const ring = moved[0];
    const word = moved[1];
    if (ring.kind !== 'path' || word.kind !== 'text') throw new Error('a ring is a path and a word is text');
    expect(ring.stroke?.width).toBe(0.1);
    expect(word.size).toBe(0.5);
  });
});

describe('a thing grown from a point', () => {
  const ring = () => flatten(group('fig', [shape('ring', circle(vec2(2, 1), 1), { stroke: pen })]));

  it('is the point itself at the beginning of its span', () => {
    const marks = growFrom('fig', vec2(0, 0))(ring(), 0);
    const box = boundsOfMarks(marks)!;
    expect(box.x.from).toBeCloseTo(0, 12);
    expect(box.x.to).toBeCloseTo(0, 12);
    expect(box.y.from).toBeCloseTo(0, 12);
    expect(box.y.to).toBeCloseTo(0, 12);
  });

  it('is the marks themselves at the end of its span', () => {
    const marks = ring();
    expect(growFrom('fig', vec2(0, 0))(marks, 1)).toBe(marks);
  });

  it('grows out of its own middle when no point is named', () => {
    const small = growFrom('fig')(ring(), 0);
    const box = boundsOfMarks(small)!;
    expect(box.x.from).toBeCloseTo(2, 12);
    expect(box.y.from).toBeCloseTo(1, 12);
  });

  it('is half its size half way through', () => {
    const half = growFrom('fig', vec2(0, 0))(ring(), 0.5);
    const box = boundsOfMarks(half)!;
    expect(box.x.to - box.x.from).toBeCloseTo(1, 12);
    const stroke = half[0];
    if (stroke.kind !== 'path') throw new Error('a ring is a path');
    expect(stroke.stroke?.width).toBeCloseTo(0.05, 12);
  });

  it('takes its words down with it', () => {
    const marks = flatten(group('fig', [text('word', vec2(2, 0), 'hi', 0.5, { fill: ink })]));
    const word = growFrom('fig', vec2(0, 0))(marks, 0)[0];
    if (word.kind !== 'text') throw new Error('a word is text');
    expect(word.size).toBeCloseTo(0, 12);
    expect(word.at.x).toBeCloseTo(0, 12);
  });
});
