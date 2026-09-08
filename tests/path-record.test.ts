import { describe, expect, it } from 'vitest';
import {
  arc,
  circle,
  line,
  pathFromData,
  pointOn,
  polygon,
  polyline,
  rect,
  resolvePath,
  sameMarks,
  vec2,
  type Mark,
  type Path,
  type PathRecord,
} from '../index.js';

/** Two paths compared by tolerance, through the comparison the package already
 * publishes over marks, so a path is held to the same number a frame is. */
const samePath = (one: Path, two: Path): boolean => {
  const mark = (path: Path): Mark => ({ kind: 'path', id: 'p', path });
  return sameMarks([mark(one)], [mark(two)]);
};

/**
 * Every reading a curve gives of its own distance from a centre, which is what
 * says a cubic arc is the radius it claims.
 */
const radius = (path: Path, centre = vec2(0, 0), steps = 400): number[] => {
  const readings: number[] = [];
  for (const subpath of path) {
    let from = subpath.start;
    for (const curve of subpath.curves) {
      for (let at = 0; at <= steps; at++) {
        const point = pointOn(from, curve, at / steps);
        readings.push(Math.hypot(point.x - centre.x, point.y - centre.y));
      }
      from = curve.to;
    }
  }
  return readings;
};

const CORNERS = [vec2(-0.6, -0.8), vec2(0.6, -0.8), vec2(0.6, -0.4), vec2(-0.2, 0.8)];

/** Each named form beside the call it stands for. */
const FORMS: readonly { record: PathRecord; called: Path }[] = [
  { record: { kind: 'line', from: vec2(-1, 2), to: vec2(3, -4) }, called: line(vec2(-1, 2), vec2(3, -4)) },
  { record: { kind: 'polyline', points: CORNERS }, called: polyline(CORNERS) },
  { record: { kind: 'polygon', points: CORNERS }, called: polygon(CORNERS) },
  { record: { kind: 'rect', corner: vec2(-2, 1), width: 4, height: 2.5 }, called: rect(vec2(-2, 1), 4, 2.5) },
  { record: { kind: 'circle', centre: vec2(-3, 7), radius: 5 }, called: circle(vec2(-3, 7), 5) },
  {
    record: { kind: 'arc', centre: vec2(1, 1), radius: 2, from: 0.3, to: 0.3 + (5 * Math.PI) / 3 },
    called: arc(vec2(1, 1), 2, 0.3, 0.3 + (5 * Math.PI) / 3),
  },
  {
    record: { kind: 'data', d: 'M0 0 L10 0 C12 4 8 9 4 6 Z' },
    called: pathFromData('M0 0 L10 0 C12 4 8 9 4 6 Z'),
  },
];

describe('a path written as a named form', () => {
  it('resolves to what its own call returns, for each of the seven forms', () => {
    expect(FORMS).toHaveLength(7);
    for (const { record, called } of FORMS) {
      const resolved = resolvePath(record);
      expect(samePath(resolved, called)).toBe(true);
      expect(resolved).toHaveLength(called.length);
      resolved.forEach((subpath, at) => {
        expect(subpath.closed).toBe(called[at].closed);
        expect(subpath.curves).toHaveLength(called[at].curves.length);
      });
    }
  });

  it('tells two different forms apart, which is what says the comparison can fail', () => {
    expect(samePath(resolvePath({ kind: 'polygon', points: CORNERS }), polyline(CORNERS))).toBe(false);
  });

  it('holds a resolved arc between 2.6 and 2.8 parts in ten thousand of the true radius', () => {
    const centre = vec2(1, 1);
    const drawn = resolvePath({ kind: 'arc', centre, radius: 2, from: 0, to: 2 * Math.PI });
    const worst = Math.max(...radius(drawn, centre).map((r) => Math.abs(r - 2)));
    expect(worst / 2).toBeLessThan(2.8e-4);
    expect(worst / 2).toBeGreaterThan(2.6e-4);
  });

  it('holds a resolved circle to the same bound', () => {
    const worst = Math.max(...radius(resolvePath({ kind: 'circle', centre: vec2(0, 0), radius: 1 })).map((r) => Math.abs(r - 1)));
    expect(worst).toBeLessThan(2.8e-4);
    expect(worst).toBeGreaterThan(2.6e-4);
  });

  it('has nothing to draw for an arc of no sweep and a polyline of one point', () => {
    expect(resolvePath({ kind: 'arc', centre: vec2(0, 0), radius: 1, from: 0, to: 0 })).toEqual([]);
    expect(resolvePath({ kind: 'polyline', points: [vec2(0, 0)] })).toEqual([]);
  });
});

describe('a path written out as cubics', () => {
  it('is the path it names, since a subpath is already data', () => {
    const written = circle(vec2(2, -1), 3);
    expect(resolvePath({ kind: 'cubics', subpaths: written })).toBe(written);
  });

  it('carries a shape no named form describes', () => {
    const subpaths: Path = [
      {
        start: vec2(0, 0),
        curves: [{ control1: vec2(1, 4), control2: vec2(5, -3), to: vec2(6, 1) }],
        closed: false,
      },
    ];
    expect(samePath(resolvePath({ kind: 'cubics', subpaths }), subpaths)).toBe(true);
  });
});

describe('a form outside the set', () => {
  it('is refused with a sentence naming what was asked for', () => {
    expect(() => resolvePath({ kind: 'spiral' } as unknown as PathRecord)).toThrow('a path has no form called spiral');
  });
});
