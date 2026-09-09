/**
 * Two demos written as figure records, which every test of the file reads.
 *
 * The rotation demo is a fixed scene with a fixed extent and two spans that turn
 * together, and the boolean demo is a scene rebuilt from a track with the nine
 * fades of its entrance. Between them they carry a figure's nine fields, so a
 * writer, a reader and a validator are each measured against a whole picture
 * rather than against a record assembled to suit them.
 */
import {
  vec2,
  type Expression,
  type Extent,
  type FigureRecord,
  type NodeRecord,
  type PathRecord,
  type SpanRecord,
  type Vec2,
} from '../index.js';
import { DEEP, EMBER, INK, PEACH, SLATE } from '../demos/palette.js';
import { TYPE } from '../demos/typeface.js';
import { GIVEN, LABEL_Y, LOCAL, OWN, RIDER, SWING, TEXT, TURN, turns } from '../demos/rotate.js';
import {
  BIG,
  DISC_Y,
  LABEL_Y as BOOLEAN_LABEL_Y,
  PANEL,
  PANELS,
  SMALL,
  TEXT as BOOLEAN_TEXT,
  booleans,
} from '../demos/boolean.js';

const ink = { colour: INK };
const edge = { colour: DEEP, width: 0.04 };
const wash = { colour: PEACH };
const marker = { colour: EMBER };
const still = { colour: SLATE, width: 0.018 };
const walker = { colour: DEEP, width: 0.018 };

/** One panel of the rotation demo as records, written the way the demo writes it
 * as calls. */
function turningPanel(name: string, pivot: Vec2, swing: number, label: string): NodeRecord {
  const centre = vec2(pivot.x + swing, pivot.y);
  return {
    kind: 'group',
    name,
    children: [
      { kind: 'dot', name: 'pivot', at: pivot, radius: 0.07, fill: marker },
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

/** The rotation demo as one record: a fixed scene, a fixed extent, two spans that
 * turn together at one pace, and the loop flag. */
export const turning: FigureRecord = {
  extent: turns.extent as Extent,
  scene: {
    kind: 'group',
    name: 'turns',
    children: [
      turningPanel('own', OWN, 0, 'about its centre'),
      turningPanel('given', GIVEN, SWING, 'about a given point'),
    ],
    style: TYPE,
  },
  timeline: {
    spans: [
      { entry: { kind: 'rotate', target: 'turns/own/rider', angle: 2 * Math.PI }, from: 0, to: TURN, curve: 'linear' },
      {
        entry: { kind: 'rotate', target: 'turns/given/rider', angle: 2 * Math.PI, options: { pivot: GIVEN } },
        from: 0,
        to: TURN,
        curve: 'linear',
      },
    ],
    duration: TURN,
  },
  duration: TURN,
  still: TURN * 0.125,
  loop: true,
};

/** One panel of the boolean demo as records. The walking disc's centre reads the
 * demo's track, so the answer's cubics are different at every time and the record
 * that describes them is the same record throughout. */
function operating(name: string, at: number): NodeRecord {
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
        at: vec2(middle, BOOLEAN_LABEL_Y),
        content: name,
        size: BOOLEAN_TEXT.label,
        options: { fill: ink, align: 'middle' },
      },
    ],
  };
}

/** The boolean demo as one record: a scene rebuilt from its track at every time,
 * and the nine fades of its entrance as spans. */
export const operations: FigureRecord = {
  extent: booleans.extent as Extent,
  scene: {
    kind: 'group',
    name: 'booleans',
    children: PANELS.map((one, at) => operating(one.name, at)),
    style: TYPE,
  },
  tracks: booleans.tracks,
  timeline: {
    spans: booleans.timeline!.spans.map((span, at): SpanRecord => {
      const target = ['discs', 'label', 'result'][Math.floor(at / 3)];
      return {
        entry: { kind: 'fadeIn', target: `booleans/${PANELS[at % 3].name}/${target}` },
        from: span.from,
        to: span.to,
        curve: at < 3 ? 'easeOut' : 'smoothstep',
      };
    }),
    duration: booleans.timeline!.duration,
  },
  duration: booleans.duration,
  still: booleans.still,
};
