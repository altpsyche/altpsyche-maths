import { describe, expect, it } from 'vitest';
import {
  durationOf,
  extentAt,
  isLoop,
  marksAt,
  interval,
  resolveFigure,
  sameMarks,
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
import { FRAMES, GIVEN, LABEL_Y, LOCAL, OWN, RIDER, SWING, TEXT, TURN, turns } from '../demos/rotate.js';
import {
  BIG,
  DISC_Y,
  LABEL_Y as BOOLEAN_LABEL_Y,
  PANEL,
  PANELS,
  SMALL,
  TEXT as BOOLEAN_TEXT,
  TIMES as BOOLEAN_TIMES,
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
const turning: FigureRecord = {
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
const operations: FigureRecord = {
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

describe('a figure built from one record', () => {
  it('draws the rotation demo mark for mark at each frame of its strip and at its still time', () => {
    const built = resolveFigure(turning);
    expect(FRAMES).toHaveLength(4);
    for (const seconds of [...FRAMES, turns.still]) {
      const drawn = marksAt(turns, seconds);
      expect(drawn).toHaveLength(8);
      expect(sameMarks(marksAt(built, seconds), drawn)).toBe(true);
    }
  });

  it('draws the boolean demo mark for mark at each of its named times', () => {
    const built = resolveFigure(operations);
    const times = Object.values(BOOLEAN_TIMES);
    expect(times).toHaveLength(7);
    for (const seconds of times) {
      const drawn = marksAt(booleans, seconds);
      expect(drawn).toHaveLength(12);
      expect(sameMarks(marksAt(built, seconds), drawn)).toBe(true);
    }
  });

  it('rebuilds the scene from the track rather than reading it once', () => {
    const built = resolveFigure(operations);
    // The walking disc is at a different place at each of these, so a scene read
    // once and kept would draw the first of them three times over.
    const walked = [BOOLEAN_TIMES.clear, BOOLEAN_TIMES.crossing, BOOLEAN_TIMES.inside].map((seconds) =>
      marksAt(built, seconds).filter((mark) => mark.id.endsWith('/discs/second')),
    );
    for (const marks of walked) expect(marks).toHaveLength(3);
    expect(sameMarks(walked[0], walked[1])).toBe(false);
    expect(sameMarks(walked[1], walked[2])).toBe(false);
  });

  it('carries the duration, the still time and the loop flag the record names', () => {
    const built = resolveFigure(turning);
    expect(durationOf(built)).toBe(durationOf(turns));
    expect(built.still).toBe(turns.still);
    expect(built.loop).toBe(true);
    expect(isLoop(built)).toBe(true);
  });

  it('reads an extent chosen from the shape of the surface', () => {
    const wide: Extent = { width: 8, height: 4 };
    const tall: Extent = { width: 4, height: 8 };
    const built = resolveFigure({
      ...turning,
      extent: { kind: 'byAspect', wide, square: { width: 6, height: 6 }, tall },
    });
    expect(extentAt(built, 0, 2).width).toBe(8);
    expect(extentAt(built, 0, 0.5).height).toBe(8);
  });

  it('carries an inset, whose marks are the figure own marks inside a clip', () => {
    const rectangle = { x: interval(1, 3), y: interval(1, 2) };
    const built = resolveFigure({
      ...turning,
      insets: [{ shows: { width: 2, height: 1, centre: OWN }, into: rectangle, name: 'panel' }],
    });
    const own = marksAt(resolveFigure(turning), 0);
    const withPanel = marksAt(built, 0);
    // Six of the figure's eight marks reach the panel, since it shows a window
    // two units by one and a mark clear of that window is not copied into it.
    expect(own).toHaveLength(8);
    expect(withPanel).toHaveLength(14);
    for (const mark of withPanel.slice(own.length)) {
      expect(mark.id.startsWith('panel/')).toBe(true);
      expect(mark.clip).toEqual(rectangle);
    }
  });
});
