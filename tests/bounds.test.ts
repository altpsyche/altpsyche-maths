import { describe, expect, it } from 'vitest';
import { boundsOf, boundsOfMarks, circle, colourFrom, coordsOf, flatten, group, interval, line, plot, polygon, scaleOf, shape, text, vec2, type Path } from '../index.js';

const ink = { colour: colourFrom('#222') };
const pen = { colour: colourFrom('#222'), width: 0.02 };

/** One cubic whose two controls stand a long way off the curve itself, which is
 * where the box round the control points and the box round the curve differ. */
const bulge: Path = [
  { start: vec2(0, 0), curves: [{ control1: vec2(0, 1), control2: vec2(1, 1), to: vec2(1, 0) }], closed: false },
];

const hullOf = (path: Path) => {
  const points = path.flatMap((subpath) => [
    subpath.start,
    ...subpath.curves.flatMap((curve) => [curve.control1, curve.control2, curve.to]),
  ]);
  return {
    x: interval(Math.min(...points.map((point) => point.x)), Math.max(...points.map((point) => point.x))),
    y: interval(Math.min(...points.map((point) => point.y)), Math.max(...points.map((point) => point.y))),
  };
};

describe('the box round a path', () => {
  it('is exactly the circle it holds, at any radius and any centre', () => {
    // The four cubics meet at the points furthest out along each axis, so the box
    // is exact and the 2.7 parts in ten thousand they cost sit inside it.
    for (const [centre, radius] of [
      [vec2(0, 0), 1],
      [vec2(3, -2), 0.25],
      [vec2(-1.5, 4), 7],
    ] as const) {
      const box = boundsOf(circle(centre, radius));
      if (!box) throw new Error('a circle has a box');
      expect(box.x.from).toBe(centre.x - radius);
      expect(box.x.to).toBe(centre.x + radius);
      expect(box.y.from).toBe(centre.y - radius);
      expect(box.y.to).toBe(centre.y + radius);
    }
  });

  it('is smaller than the box round the control points', () => {
    const box = boundsOf(bulge);
    if (!box) throw new Error('a cubic has a box');
    // The curve reaches three quarters of the way up where its controls reach
    // all of it, so the cheap answer is a third too tall.
    expect(box.y.to).toBeCloseTo(0.75, 12);
    expect(hullOf(bulge).y.to).toBe(1);
    expect(interval.span(hullOf(bulge).y) / interval.span(box.y)).toBeCloseTo(4 / 3, 12);
  });

  it('holds a straight segment between its own ends', () => {
    const box = boundsOf(line(vec2(0, 0), vec2(2, 3)));
    if (!box) throw new Error('a line has a box');
    expect(box.x.from).toBe(0);
    expect(box.x.to).toBe(2);
    expect(box.y.from).toBe(0);
    expect(box.y.to).toBe(3);
  });

  it('holds a shape written from its corners', () => {
    const box = boundsOf(polygon([vec2(-1, 0), vec2(2, 0), vec2(2, 5), vec2(-1, 5)]));
    if (!box) throw new Error('a polygon has a box');
    expect(box.x.from).toBe(-1);
    expect(box.x.to).toBe(2);
    expect(box.y.to).toBe(5);
  });

  it('holds a curve that turns twice along one axis', () => {
    const wave: Path = [
      {
        start: vec2(0, 0),
        curves: [{ control1: vec2(0, 3), control2: vec2(1, -3), to: vec2(1, 0) }],
        closed: false,
      },
    ];
    const box = boundsOf(wave);
    if (!box) throw new Error('a cubic has a box');
    // Both turns are inside the piece, so both count, and neither is an end.
    expect(box.y.to).toBeGreaterThan(0);
    expect(box.y.from).toBeLessThan(0);
    expect(box.y.to).toBeLessThan(3);
    expect(box.y.from).toBeGreaterThan(-3);
    expect(box.y.to).toBeCloseTo(-box.y.from, 12);
  });

  it('holds the demo curve where the graph cuts it', () => {
    const coords = coordsOf(
      scaleOf(interval(-1, 4), interval(-4.6, 4.6)),
      scaleOf(interval(-1, 9), interval(-2.4, 2.4))
    );
    const box = boundsOf(plot(coords, (x) => x * x));
    if (!box) throw new Error('a curve has a box');
    expect(box.x.from).toBeCloseTo(-4.6, 9);
    expect(box.x.to).toBeCloseTo(2.76, 6);
    expect(box.y.from).toBeCloseTo(-1.92, 9);
    expect(box.y.to).toBeCloseTo(2.4, 6);
  });

  it('is nothing where the path holds no points', () => {
    expect(boundsOf([])).toBeNull();
  });
});

describe('the box round a list of marks', () => {
  it('holds every path in the list', () => {
    const tree = group('fig', [
      shape('left', circle(vec2(-2, 0), 1), { stroke: pen }),
      shape('right', circle(vec2(3, 1), 0.5), { stroke: pen }),
    ]);
    const box = boundsOfMarks(flatten(tree));
    if (!box) throw new Error('two circles have a box');
    expect(box.x.from).toBe(-3);
    expect(box.x.to).toBe(3.5);
    expect(box.y.from).toBe(-1);
    expect(box.y.to).toBe(1.5);
  });

  it('reaches only a text mark own anchor, whatever the text says', () => {
    // Measuring text gives a different answer per machine, so a box that took
    // it in would be a different box on two machines.
    const boxOf = (content: string) =>
      boundsOfMarks(flatten(group('fig', [text('word', vec2(1, 2), content, 0.3, { fill: ink })])));
    const short = boxOf('x');
    const long = boxOf('a label forty characters long, or near it');
    expect(short).toEqual(long);
    expect(short?.x.from).toBe(1);
    expect(short?.x.to).toBe(1);
    expect(short?.y.from).toBe(2);
  });

  it('is nothing where the list is empty', () => {
    expect(boundsOfMarks([])).toBeNull();
  });
});
