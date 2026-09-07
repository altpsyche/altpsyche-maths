import { describe, expect, it } from 'vitest';
import {
  boundsOf,
  boundsOfMarks,
  circumscribe,
  centreOf,
  circle,
  coordsOf,
  dot,
  flash,
  flatten,
  group,
  growFrom,
  indicate,
  interval,
  lengthOf,
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

describe('a thing indicated', () => {
  const ring = () =>
    flatten(
      group('fig', [
        shape('ring', circle(vec2(2, 1), 1), { stroke: pen, fill: { colour: '#eee' } }),
        text('word', vec2(2, 1), 'hi', 0.5, { fill: ink }),
      ])
    );
  const widthOf = (marks: readonly Mark[]) => {
    const box = boundsOfMarks(marks)!;
    return box.x.to - box.x.from;
  };

  it('is the very same marks at both ends of its span', () => {
    const marks = ring();
    expect(indicate('fig', { colour: '#f00' })(marks, 0)).toBe(marks);
    expect(indicate('fig', { colour: '#f00' })(marks, 1)).toBe(marks);
  });

  it('is at its fullest half way through', () => {
    const marks = ring();
    const swelled = indicate('fig', { factor: 1.5 })(marks, 0.5);
    expect(widthOf(swelled) / widthOf(marks)).toBeCloseTo(1.5, 12);
  });

  it('swells and settles rather than growing straight through', () => {
    const marks = ring();
    const at = (along: number) => widthOf(indicate('fig', { factor: 1.5 })(marks, along));
    expect(at(0.25)).toBeGreaterThan(widthOf(marks));
    expect(at(0.25)).toBeCloseTo(at(0.75), 12);
    expect(at(0.5)).toBeGreaterThan(at(0.25));
  });

  it('leaves from rest and settles, since each half is the curve a track uses', () => {
    const marks = ring();
    const at = (along: number) => widthOf(indicate('fig', { factor: 1.5 })(marks, along));
    // Flat at both ends: the first twentieth of the span moves less than the
    // twentieth either side of a quarter through.
    expect(at(0.05) - at(0)).toBeLessThan(at(0.3) - at(0.25));
  });

  it('holds a colour for the length of the span and lets it go at the ends', () => {
    const marks = ring();
    const held = indicate('fig', { colour: '#f00' })(marks, 0.5);
    const ringMark = held[0];
    const word = held[1];
    if (ringMark.kind !== 'path' || word.kind !== 'text') throw new Error('a ring is a path and a word is text');
    expect(ringMark.stroke?.colour).toBe('#f00');
    expect(ringMark.fill?.colour).toBe('#f00');
    expect(word.fill.colour).toBe('#f00');
    const ended = indicate('fig', { colour: '#f00' })(marks, 1)[0];
    if (ended.kind !== 'path') throw new Error('a ring is a path');
    expect(ended.stroke?.colour).toBe('#222');
  });

  it('leaves the colours alone where none is named', () => {
    const held = indicate('fig')(ring(), 0.5)[0];
    if (held.kind !== 'path') throw new Error('a ring is a path');
    expect(held.stroke?.colour).toBe('#222');
  });

  it('changes nothing where its target matches nothing', () => {
    const marks = ring();
    expect(indicate('nowhere', { colour: '#f00' })(marks, 0.5)).toBe(marks);
  });
});

describe('a flash', () => {
  const dotted = () => flatten(group('fig', [dot('point', vec2(1, 2), 0.1, ink)]));
  const rays = (marks: readonly Mark[]) => marks.filter((mark) => mark.id.includes('/flash/'));

  it('has the same number of marks at every fraction of its span', () => {
    // A mark that arrives between one frame and the next turns up in a
    // comparison between two frames as something that changed.
    const counts = [0, 0.25, 0.5, 0.75, 1].map((along) => flash('fig', { stroke: pen })(dotted(), along).length);
    expect(new Set(counts)).toEqual(new Set([1 + 12]));
  });

  it('draws the number of rays it was asked for', () => {
    expect(rays(flash('fig', { stroke: pen, rays: 5 })(dotted(), 0.5))).toHaveLength(5);
  });

  it('shows nothing at both ends of the span', () => {
    for (const along of [0, 1]) {
      for (const ray of rays(flash('fig', { stroke: pen })(dotted(), along))) expect(ray.opacity).toBe(0);
    }
    for (const ray of rays(flash('fig', { stroke: pen })(dotted(), 0.5))) expect(ray.opacity).toBe(1);
  });

  it('reaches further as the span runs on', () => {
    const spanOf = (along: number) => {
      const box = boundsOfMarks(rays(flash('fig', { stroke: pen, reach: 2 })(dotted(), along)))!;
      return box.x.to - box.x.from;
    };
    expect(spanOf(0)).toBeCloseTo(0, 12);
    expect(spanOf(0.5)).toBeCloseTo(2, 12);
    expect(spanOf(1)).toBeCloseTo(4, 12);
  });

  it('names its rays under the thing it points at', () => {
    const marks = flash('fig/point', { stroke: pen, rays: 2 })(dotted(), 0.5);
    expect(marks.map((mark) => mark.id)).toEqual(['fig/point/disc', 'fig/point/flash/0', 'fig/point/flash/1']);
  });

  it('flashes from a point a figure names instead of the middle of the box', () => {
    const marks = flash('fig', { stroke: pen, at: vec2(0, 0), reach: 1, inner: 0 })(dotted(), 1);
    const first = rays(marks)[0];
    if (first.kind !== 'path') throw new Error('a ray is a path');
    expect(first.path[0].start.x).toBeCloseTo(0, 12);
    expect(first.path[0].start.y).toBeCloseTo(0, 12);
  });

  it('changes nothing where its target matches nothing', () => {
    const marks = dotted();
    expect(flash('nowhere', { stroke: pen })(marks, 0.5)).toBe(marks);
  });
});

describe('a shape drawn round something', () => {
  const ring = () => flatten(group('fig', [shape('ring', circle(vec2(1, 2), 1), { stroke: pen })]));
  const drawn = (marks: readonly Mark[]) => marks.find((mark) => mark.id === 'fig/circumscribed')!;

  it('is in the list at every fraction of the span', () => {
    const counts = [0, 0.25, 0.5, 0.75, 1].map(
      (along) => circumscribe('fig', { stroke: pen })(ring(), along).length
    );
    expect(new Set(counts)).toEqual(new Set([2]));
  });

  it('is the box round the thing plus the padding it was given', () => {
    const marks = circumscribe('fig', { stroke: pen, padding: 0.5 })(ring(), 0.5);
    const mark = drawn(marks);
    if (mark.kind !== 'path') throw new Error('the shape is a path');
    const box = boundsOf(mark.path)!;
    expect(box.x.from).toBeCloseTo(-0.5, 12);
    expect(box.x.to).toBeCloseTo(2.5, 12);
    expect(box.y.from).toBeCloseTo(0.5, 12);
    expect(box.y.to).toBeCloseTo(3.5, 12);
  });

  it('draws nothing at the beginning and shows nothing at the end', () => {
    const started = drawn(circumscribe('fig', { stroke: pen })(ring(), 0));
    if (started.kind !== 'path') throw new Error('the shape is a path');
    expect(started.path).toEqual([]);
    expect(drawn(circumscribe('fig', { stroke: pen })(ring(), 1)).opacity).toBe(0);
  });

  it('draws on over the first half and fades over the second', () => {
    const lengthAt = (along: number) => {
      const mark = drawn(circumscribe('fig', { stroke: pen })(ring(), along));
      if (mark.kind !== 'path') throw new Error('the shape is a path');
      return lengthOf(mark.path);
    };
    expect(lengthAt(0.25)).toBeGreaterThan(0);
    expect(lengthAt(0.5)).toBeGreaterThan(lengthAt(0.25));
    expect(lengthAt(0.75)).toBeCloseTo(lengthAt(0.5), 9);
    expect(drawn(circumscribe('fig', { stroke: pen })(ring(), 0.75)).opacity).toBeCloseTo(0.5, 12);
  });

  it('draws the ellipse through the same four sides when asked', () => {
    const marks = circumscribe('fig', { stroke: pen, around: 'ellipse' })(ring(), 0.5);
    const mark = drawn(marks);
    if (mark.kind !== 'path') throw new Error('the shape is a path');
    const box = boundsOf(mark.path)!;
    expect(box.x.from).toBeCloseTo(0, 12);
    expect(box.x.to).toBeCloseTo(2, 12);
    expect(mark.path[0].closed).toBe(true);
  });

  it('changes nothing where its target matches nothing', () => {
    const marks = ring();
    expect(circumscribe('nowhere', { stroke: pen })(marks, 0.5)).toBe(marks);
  });
});
