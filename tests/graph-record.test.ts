import { describe, expect, it } from 'vitest';
import {
  bracePath,
  flatten,
  interval,
  plot,
  pointOf,
  resolvePath,
  sameMarks,
  sampleTrack,
  toGraph,
  vec2,
  type Expression,
  type Mark,
  type Path,
  type PathRecord,
} from '../index.js';
import { TIMES, coords, curve, pointAt, sceneAt, walk } from '../demos/tangent.js';

/** Two paths compared by tolerance, through the comparison the package already
 * publishes over marks, so a path is held to the same number a frame is. */
const samePath = (one: Path, two: Path): boolean => {
  const mark = (path: Path): Mark => ({ kind: 'path', id: 'p', path });
  return sameMarks([mark(one)], [mark(two)]);
};

/** The flat demo's curve, `x * x`, as an expression of the bound variable `x`. */
const parabola: Expression = {
  kind: 'arithmetic',
  operator: '*',
  left: { kind: 'variable', name: 'x' },
  right: { kind: 'variable', name: 'x' },
};

/** The whole plotted curve, which is what `areaUnder` and `tangentAt` take. */
const plotted: PathRecord = { kind: 'plot', coords, of: parabola };

/** The graph x the flat demo's dot stands at, which is the one number its
 * region and its tangent are both drawn from. */
const graphX = (seconds: number) => toGraph(coords.x, pointAt(seconds).x);

const NAMED = Object.values(TIMES);

/**
 * One of the flat demo's own marks at a time, taken from its tree rather than
 * from its figure.
 *
 * The figure outlines a tapered stroke after its timeline has run, so the
 * tangent a figure hands back is the polygon round the line rather than the line.
 * What a path producer answers for is the geometry it makes, so the reading is
 * taken where the tree is flattened.
 */
function drawn(seconds: number, id: string): Mark {
  const along = sampleTrack(walk, seconds) as number;
  const mark = flatten(sceneAt(along)).find((one) => one.id === id);
  if (!mark) throw new Error(`the flat demo draws no ${id} at ${seconds}`);
  return mark;
}

const pathOf = (mark: Mark): Path => (mark.kind === 'path' ? mark.path : []);

describe('the graph path producers as records', () => {
  it('draws the flat demo parabola from an expression of x', () => {
    expect(samePath(resolvePath(plotted), pathOf(drawn(NAMED[0], 'tangent/curve')))).toBe(true);
  });

  it('draws its shaded region at each of the seven named times', () => {
    expect(NAMED).toHaveLength(7);
    for (const seconds of NAMED) {
      const record: PathRecord = {
        kind: 'areaUnder',
        coords,
        curve: { kind: 'plot', coords, of: parabola, over: { from: 0, to: { kind: 'variable', name: 'along' } } },
      };
      const region = resolvePath(record, { variables: { along: graphX(seconds) } });
      expect(samePath(region, pathOf(drawn(seconds, 'tangent/area')))).toBe(true);
    }
  });

  it('draws its tangent at each of the seven named times', () => {
    for (const seconds of NAMED) {
      const record: PathRecord = {
        kind: 'tangentAt',
        coords,
        curve: { kind: 'plot', coords, of: parabola, over: interval(0, 3) },
        x: { kind: 'variable', name: 'along' },
        reach: 1.2,
      };
      const drawnLine = resolvePath(record, { variables: { along: graphX(seconds) } });
      expect(samePath(drawnLine, pathOf(drawn(seconds, 'tangent/tangent')))).toBe(true);
    }
  });

  it('reads the parabola where the TypeScript reads it, at its own resolution', () => {
    const options = { resolution: 8, over: interval(-1, 2) };
    const record: PathRecord = { kind: 'plot', coords, of: parabola, ...options };
    expect(samePath(resolvePath(record), plot(coords, curve, options))).toBe(true);
  });

  it('draws a brace where its own call draws one', () => {
    const from = pointOf(coords, 3, curve(3));
    const to = pointOf(coords, 3, 0);
    const record: PathRecord = { kind: 'bracePath', from, to, depth: 0.3 };
    expect(samePath(resolvePath(record), bracePath(from, to, { depth: 0.3 }))).toBe(true);
    expect(
      samePath(
        resolvePath({ kind: 'bracePath', from, to, depth: 0.3, curl: 0.08 }),
        bracePath(from, to, { depth: 0.3, curl: 0.08 })
      )
    ).toBe(true);
  });

  it('follows a track through a plotted region rather than restating it', () => {
    const record: PathRecord = {
      kind: 'areaUnder',
      coords,
      curve: { kind: 'plot', coords, of: parabola, over: { from: 0, to: { kind: 'track', name: 'x' } } },
    };
    const narrow = resolvePath(record, { tracks: { x: 1 } });
    const wide = resolvePath(record, { tracks: { x: 3 } });
    expect(samePath(narrow, wide)).toBe(false);
  });

  it('refuses a curve that reads as a place and a baseline that reads as one', () => {
    expect(() => resolvePath({ kind: 'plot', coords, of: vec2(1, 2) })).toThrow(
      'a plotted curve is a number and was given a point'
    );
    expect(() =>
      resolvePath({ kind: 'areaUnder', coords, curve: plotted, baseline: vec2(0, 0) })
    ).toThrow("a region's baseline is a number and was given a point");
  });
});
