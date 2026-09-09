/**
 * Two demos as figure records, which every test of the file reads.
 *
 * The rotation demo is the demo's own record, since that demo is written as data
 * and its committed file is what the sheets are drawn from. The boolean demo is
 * still a module of calls, so its record is written out here and comparing the
 * two is what holds the resolver.
 */
import {
  vec2,
  type Expression,
  type Extent,
  type FigureRecord,
  type NodeRecord,
  type PathRecord,
  type SpanRecord,
} from '../index.js';
import { DEEP, INK, PEACH, SLATE } from '../demos/palette.js';
import { TYPE } from '../demos/typeface.js';
import { written as turning } from '../demos/rotate.js';
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
const wash = { colour: PEACH };
const still = { colour: SLATE, width: 0.018 };
const walker = { colour: DEEP, width: 0.018 };

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

export { turning };
