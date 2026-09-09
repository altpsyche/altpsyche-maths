import { describe, expect, it } from 'vitest';
import { resolvePath, sameMarks, vec2, type PathRecord } from '../index.js';
import { BIG, SMALL } from '../demos/boolean.js';

/**
 * The boolean operations as forms of a path record.
 *
 * The demo itself is a record and its committed file is what the sheets are
 * drawn from, so what is left to hold here is the forms on their own: the demo's
 * marks are gated against its file rather than against a second transcription.
 */
describe('the boolean operations as records', () => {
  it('reads the union clear of a crossing as two loops and inside as one', () => {
    const apart = (value: number) => ({ tracks: { apart: value } });
    const record: PathRecord = {
      kind: 'union',
      first: { kind: 'circle', centre: vec2(0, 0), radius: BIG },
      second: { kind: 'circle', centre: { kind: 'point', x: { kind: 'track', name: 'apart' }, y: 0 }, radius: SMALL },
    };
    expect(resolvePath(record, apart(-1.44))).toHaveLength(2);
    expect(resolvePath(record, apart(-0.9))).toHaveLength(1);
    expect(resolvePath(record, apart(0))).toHaveLength(1);
  });

  it('takes a tolerance the way the call does', () => {
    const record = (tolerance?: number): PathRecord => ({
      kind: 'intersection',
      first: { kind: 'circle', centre: vec2(0, 0), radius: 1 },
      second: { kind: 'circle', centre: vec2(0.5, 0), radius: 1 },
      tolerance,
    });
    expect(resolvePath(record())).toHaveLength(1);
    expect(resolvePath(record(1e-9))).toHaveLength(1);
  });
});

describe('a path record whose parameter follows a track', () => {
  it('moves the shape the track moves', () => {
    const record: PathRecord = {
      kind: 'circle',
      centre: { kind: 'point', x: { kind: 'track', name: 'apart' }, y: 0 },
      radius: 1,
    };
    expect(resolvePath(record, { tracks: { apart: 0 } })[0].start).toEqual({ x: 1, y: 0 });
    expect(resolvePath(record, { tracks: { apart: 3 } })[0].start).toEqual({ x: 4, y: 0 });
  });

  it('writes a fixed parameter as itself, since a bare number and a bare point are literals', () => {
    const called = resolvePath({ kind: 'circle', centre: vec2(2, -1), radius: 3 });
    const spelled = resolvePath({
      kind: 'circle',
      centre: { kind: 'point', x: 2, y: -1 },
      radius: { kind: 'arithmetic', operator: '+', left: 1, right: 2 },
    });
    expect(sameMarks(
      [{ kind: 'path', id: 'p', path: called }],
      [{ kind: 'path', id: 'p', path: spelled }]
    )).toBe(true);
  });

  it('refuses a place where a number belongs and a number where a place belongs', () => {
    expect(() => resolvePath({ kind: 'circle', centre: vec2(0, 0), radius: vec2(1, 2) })).toThrow(
      "a circle's radius is a number and was given a point"
    );
    expect(() => resolvePath({ kind: 'circle', centre: 3, radius: 1 })).toThrow(
      "a circle's centre is a point and was given a number"
    );
    expect(() => resolvePath({ kind: 'polygon', points: [vec2(0, 0), 2, vec2(1, 1)] })).toThrow(
      'point 1 of a polygon is a point and was given a number'
    );
  });
});
