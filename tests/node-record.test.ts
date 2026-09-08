import { describe, expect, it } from 'vitest';
import {
  mat3,
  marksAt,
  resolveNode,
  sameMarks,
  slopeOf,
  toGraph,
  vec2,
  writeTemplate,
  type Figure,
  type GroupRecord,
  type Mark,
  type NodeRecord,
  type Vec2,
} from '../index.js';
import { DEEP, EMBER, INK, PEACH } from '../demos/palette.js';
import { TYPE } from '../demos/typeface.js';
import { FRAMES, GIVEN, LABEL_Y, LOCAL, OWN, RIDER, SWING, TEXT, turns } from '../demos/rotate.js';
import { TIMES as FLAT_TIMES, coords, pointAt, tangent, walkPath } from '../demos/tangent.js';

const ink = { colour: INK };
const edge = { colour: DEEP, width: 0.04 };
const wash = { colour: PEACH };
const marker = { colour: EMBER };

/**
 * The rotation demo's scene as records, written the way the demo writes it as
 * calls.
 *
 * `dot` is a group holding one shape, so it is written out here rather than
 * named: the eighteen builders over the tree resolve into these three kinds, and
 * each one gains a record of its own with the step that carries it.
 */
function panel(name: string, pivot: Vec2, swing: number, label: string): NodeRecord {
  const centre = vec2(pivot.x + swing, pivot.y);
  return {
    kind: 'group',
    name,
    children: [
      {
        kind: 'group',
        name: 'pivot',
        children: [
          { kind: 'shape', name: 'disc', path: { kind: 'circle', centre: pivot, radius: 0.07 }, style: { fill: marker } },
        ],
      },
      {
        kind: 'group',
        name: 'rider',
        children: [
          {
            kind: 'shape',
            name: 'ell',
            path: { kind: 'polygon', points: LOCAL.map((point) => vec2.add(point, centre)) },
            style: { fill: wash, stroke: edge },
          },
          {
            kind: 'text',
            name: 'word',
            at: vec2.add(centre, RIDER),
            content: 'upright',
            size: TEXT.label,
            options: { fill: ink, align: 'middle' },
          },
        ],
      },
      {
        kind: 'text',
        name: 'label',
        at: vec2(pivot.x, LABEL_Y),
        content: label,
        size: TEXT.note,
        options: { fill: ink, align: 'middle' },
      },
    ],
  };
}

const written: GroupRecord = {
  kind: 'group',
  name: 'turns',
  children: [panel('own', OWN, 0, 'about its centre'), panel('given', GIVEN, SWING, 'about a given point')],
  style: TYPE,
};

const fromRecords: Figure = { ...turns, scene: resolveNode(written) };

describe('a scene built from records', () => {
  it('draws the rotation demo mark for mark at each frame of its strip', () => {
    expect(FRAMES).toHaveLength(4);
    for (const seconds of FRAMES) {
      const drawn = marksAt(turns, seconds);
      expect(drawn).toHaveLength(8);
      expect(sameMarks(marksAt(fromRecords, seconds), drawn)).toBe(true);
    }
  });

  it('gives every mark the id the tree gives it', () => {
    expect(marksAt(fromRecords, 0).map((mark) => mark.id)).toEqual(marksAt(turns, 0).map((mark) => mark.id));
  });

  it('hands the family down from a group record the way the tree does', () => {
    const bare = resolveNode({ ...written, style: undefined });
    const words = marksAt({ ...turns, scene: bare }, 0).filter((mark) => mark.kind === 'text');
    expect(words.length).toBeGreaterThan(0);
    // A group with no style hands nothing down, so a text mark falls back to the
    // painters' own family rather than the one the demo names.
    expect(words.every((mark) => mark.kind === 'text' && mark.family === 'sans-serif')).toBe(true);
  });

  it('carries a transform on a group record', () => {
    const shifted = resolveNode({
      kind: 'group',
      name: 'turns',
      children: written.children,
      style: TYPE,
      transform: mat3.translation(vec2(1, 0)),
    });
    const moved = marksAt({ ...turns, scene: shifted }, 0);
    const still = marksAt(fromRecords, 0);
    expect(moved).toHaveLength(still.length);
    expect(sameMarks(moved, still)).toBe(false);
  });
});

/** The slope the flat demo reads at a time, which is what its reading writes. */
function slopeAt(seconds: number): number {
  return slopeOf(coords, walkPath, toGraph(coords.x, pointAt(seconds).x));
}

const reading = (seconds: number) => ({
  template: 'slope {0}',
  holes: [{ value: slopeAt(seconds), precision: 0.01 }],
});

function readingMark(seconds: number): Mark {
  const mark = marksAt(tangent, seconds).find((one) => one.id === 'tangent/reading');
  if (!mark) throw new Error(`the flat demo draws no reading at ${seconds}`);
  return mark;
}

describe('a text record', () => {
  it('writes the flat demo reading at each of its named times', () => {
    const times = Object.values(FLAT_TIMES);
    expect(times).toHaveLength(7);
    for (const seconds of times) {
      const mark = readingMark(seconds);
      expect(mark.kind).toBe('text');
      expect(writeTemplate(reading(seconds))).toBe(mark.kind === 'text' ? mark.text : '');
    }
  });

  it('writes the three readings the strip shows', () => {
    expect(Object.values(FLAT_TIMES).map((seconds) => writeTemplate(reading(seconds)))).toEqual([
      'slope 0.00',
      'slope 0.00',
      'slope 0.00',
      'slope 1.16',
      'slope 6.00',
      'slope 6.00',
      'slope 6.00',
    ]);
  });

  it('resolves to the text node the reading is drawn from', () => {
    const node = resolveNode({
      kind: 'text',
      name: 'reading',
      at: vec2(0, 0),
      content: reading(FLAT_TIMES.morphTo),
      size: 0.3,
      options: { fill: ink },
    });
    expect(node.kind === 'text' && node.text).toBe('slope 1.16');
  });

  it('follows a track through a hole and keeps the width the precision names', () => {
    const content = { template: 'slope {0}', holes: [{ value: { kind: 'track' as const, name: 's' }, precision: 0.01 }] };
    expect(writeTemplate(content, { tracks: { s: 0 } })).toBe('slope 0.00');
    expect(writeTemplate(content, { tracks: { s: 6 } })).toBe('slope 6.00');
    expect(writeTemplate(content, { tracks: { s: 1.157 } })).toBe('slope 1.16');
  });

  it('writes each hole to its own precision', () => {
    const content = {
      template: '{0} and {1} and {2}',
      holes: [
        { value: 1 / 3, precision: 1 },
        { value: 1 / 3, precision: 0.01 },
        { value: 1 / 3, precision: 0.001 },
      ],
    };
    expect(writeTemplate(content)).toBe('0 and 0.33 and 0.333');
  });

  it('writes a hole more than once where the template names it twice', () => {
    expect(writeTemplate({ template: '{0}, {0}', holes: [{ value: 2, precision: 1 }] })).toBe('2, 2');
  });

  it('writes a doubled brace as one brace, which is what leaves a set writable', () => {
    expect(writeTemplate({ template: '{{{0}, {1}}', holes: [{ value: 1, precision: 1 }, { value: 2, precision: 1 }] })).toBe(
      '{1, 2}'
    );
  });

  it('writes a plain string as itself', () => {
    expect(writeTemplate('upright')).toBe('upright');
    expect(writeTemplate('a {0 and a } alone')).toBe('a {0 and a } alone');
  });

  it('refuses a hole the list has no entry for, naming what was asked for', () => {
    expect(() => writeTemplate({ template: 'slope {1}', holes: [{ value: 1, precision: 1 }] })).toThrow(
      'the template asks for hole 1 and carries 1'
    );
  });

  it('refuses a hole whose expression is a place or a true or false', () => {
    expect(() =>
      writeTemplate({ template: '{0}', holes: [{ value: { kind: 'point', x: 1, y: 2 }, precision: 1 }] })
    ).toThrow('hole 0 is a number and was given a point');
    expect(() =>
      writeTemplate({ template: '{0}', holes: [{ value: true, precision: 1 }] })
    ).toThrow('hole 0 is a number and was given a true or false');
  });
});
