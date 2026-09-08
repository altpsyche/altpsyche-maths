import { describe, expect, it } from 'vitest';
import {
  marksAt,
  resolveNode,
  resolvePath,
  sameMarks,
  vec2,
  type Expression,
  type Figure,
  type NodeRecord,
  type PathRecord,
} from '../index.js';
import { DEEP, INK, PEACH, SLATE } from '../demos/palette.js';
import { TYPE } from '../demos/typeface.js';
import {
  BIG,
  DISC_Y,
  LABEL_Y,
  PANEL,
  PANELS,
  SMALL,
  TEXT,
  TIMES,
  booleans,
} from '../demos/boolean.js';

const ink = { colour: INK };
const still = { colour: SLATE, width: 0.018 };
const walker = { colour: DEEP, width: 0.018 };
const wash = { colour: PEACH };

/**
 * The boolean demo's scene as records, written the way the demo writes it as
 * calls.
 *
 * The walking disc's centre is the track the demo drives its scene from, so it
 * is an expression rather than a place. That is the whole reason a boolean
 * operation is a form rather than geometry the figure carries: the answer's
 * cubics are none of the operands' and this disc changes the answer every frame.
 */
function panel(name: string, at: number): NodeRecord {
  const middle = (at - 1) * PANEL;
  const first: PathRecord = { kind: 'circle', centre: vec2(middle, DISC_Y), radius: BIG };
  const walking: Expression = {
    kind: 'point',
    x: { kind: 'arithmetic', operator: '+', left: middle, right: { kind: 'track', name: 'apart' } },
    y: DISC_Y,
  };
  const second: PathRecord = { kind: 'circle', centre: walking, radius: SMALL };
  return {
    kind: 'group',
    name,
    children: [
      {
        kind: 'shape',
        name: 'result',
        path: { kind: name as 'union' | 'intersection' | 'difference', first, second },
        style: { fill: wash },
      },
      {
        kind: 'group',
        name: 'discs',
        children: [
          { kind: 'shape', name: 'first', path: first, style: { stroke: still } },
          { kind: 'shape', name: 'second', path: second, style: { stroke: walker } },
        ],
      },
      {
        kind: 'text',
        name: 'label',
        at: vec2(middle, LABEL_Y),
        content: name,
        size: TEXT.label,
        options: { fill: ink, align: 'middle' },
      },
    ],
  };
}

const written: NodeRecord = {
  kind: 'group',
  name: 'booleans',
  children: PANELS.map((one, at) => panel(one.name, at)),
  style: TYPE,
};

const fromRecords: Figure = {
  ...booleans,
  scene: (_seconds, values) => resolveNode(written, { tracks: values }),
};

describe('the boolean operations as records', () => {
  it('draws the boolean demo mark for mark at each of its named times', () => {
    const times = Object.values(TIMES);
    expect(times).toHaveLength(7);
    for (const seconds of times) {
      const drawn = marksAt(booleans, seconds);
      expect(drawn).toHaveLength(12);
      expect(sameMarks(marksAt(fromRecords, seconds), drawn)).toBe(true);
    }
  });

  it('takes the operation through all four cases of the walk', () => {
    // Clear of each other, touching at one point, crossing at two, and one wholly
    // inside the other, which is what says the records answer where the calls do
    // rather than only where the geometry is easy.
    for (const seconds of [TIMES.clear, TIMES.touching, TIMES.crossing, TIMES.inside]) {
      const drawn = marksAt(booleans, seconds).filter((mark) => mark.id.endsWith('/result'));
      expect(drawn).toHaveLength(3);
      const through = marksAt(fromRecords, seconds).filter((mark) => mark.id.endsWith('/result'));
      expect(sameMarks(through, drawn)).toBe(true);
    }
  });

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
