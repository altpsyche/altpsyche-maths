import { describe, expect, it } from 'vitest';
import {
  boundsOf,
  boundsOfMarks,
  byAspect,
  centreOf,
  durationOf,
  followView,
  frameView,
  insetMarks,
  marksAt,
  matchingAspect,
  moveView,
  resolveExtent,
  resolveExtentChoice,
  resolveInset,
  resolveViewChange,
  sameMarks,
  vec2,
  type Extent,
  type ExtentRecord,
  type InsetRecord,
  type Mark,
  type ViewChangeRecord,
} from '../index.js';
import { LENS, LENS_SHOWS, REACH, ROOM, TIMES as FLAT_TIMES, size, tangent } from '../demos/tangent.js';

/** The flat demo's follow, as the record the demo writes as a call. */
const follows: ViewChangeRecord = {
  kind: 'followView',
  target: 'tangent/point',
  options: { within: REACH, room: ROOM, axis: 'x' },
};

/** The marks the flat demo draws at a time, which is what a view that follows
 * something reads. */
const marksOf = (seconds: number) => {
  const marks = marksAt(tangent, seconds);
  return () => marks;
};

const middleOfMark = (marks: readonly Mark[], id: string) => {
  const mark = marks.find((each) => each.id === id);
  if (mark?.kind !== 'path') throw new Error(`the flat demo draws no ${id}`);
  return centreOf(boundsOf(mark.path)!);
};

describe('the view moves as records', () => {
  it('follows the dot where the demo own call follows it, at each of its named times', () => {
    const resolved = resolveViewChange(follows);
    const called = followView('tangent/point', { within: REACH, room: ROOM, axis: 'x' });
    for (const seconds of Object.values(FLAT_TIMES)) {
      const marks = marksOf(seconds);
      expect(resolved.view(size, 1, marks), `the follow at ${seconds}`).toEqual(called.view(size, 1, marks));
    }
  });

  it('holds the dot within 2.14 figure units of the middle of the frame', () => {
    const resolved = resolveViewChange(follows);
    let followed = 0;
    let still = 0;
    for (let step = 0; step <= 200; step += 1) {
      const seconds = (durationOf(tangent) * step) / 200;
      const marks = marksAt(tangent, seconds);
      const centre = resolved.view(size, 1, () => marks).centre ?? vec2(0, 0);
      const middle = middleOfMark(marks, 'tangent/point/disc');
      followed = Math.max(followed, Math.abs(middle.x - centre.x));
      still = Math.max(still, Math.abs(middle.x));
    }
    // The dot reaches 2.76 from the middle of the picture and the room caps the
    // frame's own travel at 0.62, so 2.14 is the two of them together and the
    // room binds rather than the reach of 1.2.
    expect(ROOM).toBeCloseTo(0.62, 12);
    expect(still).toBeCloseTo(2.76, 2);
    expect(followed).toBeLessThanOrEqual(2.14 + 1e-12);
    expect(followed).toBeGreaterThan(2.13);
    expect(REACH).toBe(1.2);
  });

  it('frames the flat demo brace and its reading, holding both inside the frame', () => {
    const targets = ['tangent/rise/brace', 'tangent/reading'];
    const record: ViewChangeRecord = { kind: 'frameView', targets, options: { padding: 0.2 } };
    const resolved = resolveViewChange(record);
    for (const seconds of Object.values(FLAT_TIMES)) {
      const marks = marksAt(tangent, seconds);
      const named = marks.filter((mark) => targets.some((target) => mark.id.startsWith(target)));
      if (named.length === 0) continue;
      const framed = resolved.view(size, 1, () => marks);
      expect(framed).toEqual(frameView(targets, { padding: 0.2 }).view(size, 1, () => marks));

      const centre = framed.centre ?? vec2(0, 0);
      const box = boundsOfMarks(named)!;
      expect(box.x.from).toBeGreaterThanOrEqual(centre.x - framed.width / 2 - 1e-9);
      expect(box.x.to).toBeLessThanOrEqual(centre.x + framed.width / 2 + 1e-9);
      expect(box.y.from).toBeGreaterThanOrEqual(centre.y - framed.height / 2 - 1e-9);
      expect(box.y.to).toBeLessThanOrEqual(centre.y + framed.height / 2 + 1e-9);
    }
  });

  it('moves the view where its own call moves it', () => {
    const to = { width: 6, centre: vec2(1, -0.5) };
    const record: ViewChangeRecord = { kind: 'moveView', to };
    for (const along of [0, 0.5, 1]) {
      expect(resolveViewChange(record).view(size, along, () => [])).toEqual(moveView(to).view(size, along, () => []));
    }
  });

  it('refuses a view move the set has no form for', () => {
    const record = { kind: 'orbitView', target: 'tangent/point' } as unknown as ViewChangeRecord;
    expect(() => resolveViewChange(record)).toThrow('a view move has no kind called orbitView');
  });
});

describe('the extent a figure declares as a record', () => {
  const shapes = {
    wide: { width: 10.8, height: 6 },
    square: { width: 8, height: 8 },
    tall: { width: 6, height: 10.8 },
  };

  it('carries a fixed extent as itself', () => {
    const fixed: Extent = { width: 10.8, height: 6, centre: vec2(0, 0) };
    expect(resolveExtent(resolveExtentChoice(fixed), 1.78)).toEqual(fixed);
  });

  it('chooses by the shape of the surface where its own call chooses', () => {
    const record: ExtentRecord = { kind: 'byAspect', ...shapes };
    const called = byAspect(shapes);
    for (const aspect of [1.78, 1.2, 1, 0.8, 0.5625]) {
      expect(resolveExtent(resolveExtentChoice(record), aspect), `at ${aspect}`).toEqual(called(aspect));
    }
  });

  it('takes the shape of what it is drawn on at a fixed height', () => {
    const record: ExtentRecord = { kind: 'matchingAspect', height: 6 };
    for (const aspect of [1.78, 1, 0.5625]) {
      expect(resolveExtent(resolveExtentChoice(record), aspect)).toEqual(matchingAspect(6)(aspect));
    }
    expect(resolveExtent(resolveExtentChoice({ kind: 'matchingAspect' }), 1.78)).toEqual(matchingAspect()(1.78));
  });

  it('refuses an extent the set has no form for', () => {
    const record = { kind: 'byDuration', height: 6 } as unknown as ExtentRecord;
    expect(() => resolveExtentChoice(record)).toThrow('an extent has no kind called byDuration');
  });
});

describe('an inset as a record', () => {
  const record: InsetRecord = {
    shows: LENS_SHOWS,
    into: LENS,
    view: { kind: 'followView', target: 'tangent/point' },
    name: 'tangent/lens',
    hides: ['tangent/window'],
  };

  it('draws the flat demo panel where the demo own inset draws it, at each of its named times', () => {
    for (const seconds of Object.values(FLAT_TIMES)) {
      const marks = marksAt(tangent, seconds);
      const theirs = marks.filter((mark) => mark.id.startsWith('tangent/lens'));
      const whole = marks.filter((mark) => !mark.id.startsWith('tangent/lens'));
      const ours = insetMarks(whole, resolveInset(record));
      expect(theirs.length, `the inset at ${seconds}`).toBeGreaterThanOrEqual(32);
      expect(theirs.length).toBeLessThanOrEqual(40);
      expect(marks.length).toBeGreaterThanOrEqual(178);
      expect(marks.length).toBeLessThanOrEqual(186);
      expect(sameMarks(ours, theirs)).toBe(true);
    }
  });

  it('holds the panel inside the rectangle it draws into, which is a clip on every mark', () => {
    // The marks are clipped rather than cut, so a magnified curve runs well past
    // the rectangle and what holds the panel inside it is the clip each carries.
    for (const seconds of Object.values(FLAT_TIMES)) {
      const marks = marksAt(tangent, seconds).filter((mark) => !mark.id.startsWith('tangent/lens'));
      const drawn = insetMarks(marks, resolveInset(record));
      expect(drawn.length).toBeGreaterThan(0);
      for (const mark of drawn) {
        expect(mark.clip, mark.id).toBeDefined();
        expect(mark.clip!.x.from).toBeGreaterThanOrEqual(LENS.x.from - 1e-9);
        expect(mark.clip!.x.to).toBeLessThanOrEqual(LENS.x.to + 1e-9);
        expect(mark.clip!.y.from).toBeGreaterThanOrEqual(LENS.y.from - 1e-9);
        expect(mark.clip!.y.to).toBeLessThanOrEqual(LENS.y.to + 1e-9);
      }
    }
  });

  it('carries an inset with no view move of its own', () => {
    const still: InsetRecord = { shows: LENS_SHOWS, into: LENS, name: 'plain' };
    expect(resolveInset(still)).toEqual(still);
  });
});
