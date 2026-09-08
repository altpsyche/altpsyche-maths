import { describe, expect, it } from 'vitest';
import {
  coordsOf,
  flatten,
  interval,
  numberLine,
  resolveNode,
  riemannBars,
  sameMarks,
  scaleOf,
  type Expression,
  type Mark,
  type NodeRecord,
} from '../index.js';
import { INK, MIST } from '../demos/palette.js';
import { TEXT, TIP, TIMES, coords, curve, sceneAt } from '../demos/tangent.js';

const ink = { colour: INK };
const pen = { colour: INK, width: 0.02 };
const faint = { colour: MIST, width: 0.012 };

/** The flat demo's own marks under one name, from its tree rather than its
 * figure, since a figure outlines a tapered stroke after its timeline has run. */
const under = (id: string): readonly Mark[] =>
  flatten(sceneAt(0))
    .filter((mark) => mark.id === id || mark.id.startsWith(`${id}/`))
    .map((mark) => ({ ...mark, id: mark.id.slice('tangent/'.length) }));

describe('the graph frame nodes as records', () => {
  it('draws the flat demo number plane, every minor line of it', () => {
    const record: NodeRecord = {
      kind: 'numberPlane',
      name: 'grid',
      coords,
      options: { stroke: faint, minors: 4, minorOpacity: 0.45 },
    };
    const theirs = under('tangent/grid');
    expect(theirs).toHaveLength(42);
    expect(sameMarks(flatten(resolveNode(record)), theirs)).toBe(true);
  });

  it('draws the flat demo axes, both lines with their ticks, labels and tips', () => {
    const record: NodeRecord = {
      kind: 'axes',
      name: 'axes',
      coords,
      options: { stroke: pen, fill: ink, size: TEXT.tick, tip: TIP },
    };
    const theirs = under('tangent/axes');
    expect(theirs).toHaveLength(27);
    expect(sameMarks(flatten(resolveNode(record)), theirs)).toBe(true);
  });

  it('reads a different tick count as a different grid', () => {
    const grid = (minors: number): NodeRecord => ({
      kind: 'numberPlane',
      name: 'grid',
      coords,
      options: { stroke: faint, minors, minorOpacity: 0.45 },
    });
    expect(sameMarks(flatten(resolveNode(grid(4))), flatten(resolveNode(grid(2))))).toBe(false);
  });

  it('holds the flat demo axes at each of its seven named times, since a frame stands still', () => {
    const record: NodeRecord = {
      kind: 'axes',
      name: 'axes',
      coords,
      options: { stroke: pen, fill: ink, size: TEXT.tick, tip: TIP },
    };
    const first = flatten(resolveNode(record));
    for (const seconds of Object.values(TIMES)) {
      expect(sameMarks(flatten(resolveNode(record, { tracks: { s: seconds } })), first)).toBe(true);
    }
  });
});

describe('a number line and a run of bars, which no demo draws', () => {
  const scale = scaleOf(interval(-2, 4), interval(-3, 3));

  it('draws a number line where its own call draws one', () => {
    const options = { stroke: pen, fill: ink, size: 0.28, at: 0, direction: 'across' as const, ticks: 7 };
    const record: NodeRecord = { kind: 'numberLine', name: 'line', scale, options };
    expect(sameMarks(flatten(resolveNode(record)), flatten(numberLine('line', scale, options)))).toBe(true);
  });

  it('draws a run of bars from an expression of x where the call draws them from a function', () => {
    const parabola: Expression = {
      kind: 'arithmetic',
      operator: '*',
      left: { kind: 'variable', name: 'x' },
      right: { kind: 'variable', name: 'x' },
    };
    const options = { fill: ink, bars: 6, over: interval(0, 3), height: 'middle' as const };
    const record: NodeRecord = { kind: 'riemannBars', name: 'bars', coords, of: parabola, options };
    const theirs = flatten(riemannBars('bars', coords, curve, options));
    expect(theirs).toHaveLength(6);
    expect(sameMarks(flatten(resolveNode(record)), theirs)).toBe(true);
  });

  it('walks a run of bars across the graph on a track', () => {
    const flat: Expression = 1;
    const record: NodeRecord = {
      kind: 'riemannBars',
      name: 'bars',
      coords,
      of: flat,
      options: {
        fill: ink,
        bars: 4,
        over: { from: { kind: 'track', name: 'x' }, to: { kind: 'arithmetic', operator: '+', left: { kind: 'track', name: 'x' }, right: 1 } },
      },
    };
    const left = flatten(resolveNode(record, { tracks: { x: 0 } }));
    const right = flatten(resolveNode(record, { tracks: { x: 2 } }));
    expect(left).toHaveLength(4);
    expect(sameMarks(left, right)).toBe(false);
  });

  it('refuses a bars curve that reads as a place', () => {
    const record: NodeRecord = { kind: 'riemannBars', name: 'bars', coords, of: { kind: 'point', x: 1, y: 2 } };
    expect(() => flatten(resolveNode(record))).toThrow('a plotted curve is a number and was given a point');
  });

  it('takes a scale the coordinates were not built from', () => {
    const other = coordsOf(scaleOf(interval(0, 1), interval(-1, 1)), scaleOf(interval(0, 1), interval(-1, 1)));
    const record: NodeRecord = { kind: 'numberPlane', name: 'grid', coords: other, options: { stroke: faint } };
    expect(flatten(resolveNode(record)).length).toBeGreaterThan(0);
  });
});
