import { describe, expect, it } from 'vitest';
import {
  curveNamed,
  marksAt,
  resolveTimeline,
  sameMarks,
  type EntryRecord,
  type SpanRecord,
  type TimelineRecord,
} from '../index.js';
import { PANELS, TIMES as BOOLEAN_TIMES, booleans } from '../demos/boolean.js';
import { TIMES as FLAT_TIMES, tangent } from '../demos/tangent.js';

/** The nine fades of the boolean demo's entrance, in the order its calls make
 * them: the outlines one panel after another, then the words, then the results. */
const entries: readonly EntryRecord[] = [
  ...PANELS.map((panel): EntryRecord => ({ kind: 'fadeIn', target: `booleans/${panel.name}/discs` })),
  ...PANELS.map((panel): EntryRecord => ({ kind: 'fadeIn', target: `booleans/${panel.name}/label` })),
  ...PANELS.map((panel): EntryRecord => ({ kind: 'fadeIn', target: `booleans/${panel.name}/result` })),
];

describe('the timeline as data', () => {
  it('carries the curve of each of the boolean demo spans by name', () => {
    const spans = booleans.timeline!.spans;
    expect(spans).toHaveLength(9);
    // The three outlines leave at speed and settle, and the words and the
    // results are still at both ends, which is the default a play takes.
    for (const span of spans.slice(0, 3)) expect(span.curve).toBe(curveNamed('easeOut'));
    for (const span of spans.slice(3)) expect(span.curve).toBe(curveNamed('smoothstep'));
  });

  it('gives the boolean demo marks at its named times, read from spans rather than built', () => {
    const spans: readonly SpanRecord[] = booleans.timeline!.spans.map((span, at) => ({
      entry: entries[at],
      from: span.from,
      to: span.to,
      curve: at < 3 ? 'easeOut' : 'smoothstep',
    }));
    const record: TimelineRecord = { spans, duration: booleans.timeline!.duration };
    const built = resolveTimeline(record);
    expect(built.duration).toBe(booleans.timeline!.duration);

    for (const seconds of Object.values(BOOLEAN_TIMES)) {
      const marks = marksAt({ ...booleans, timeline: built }, seconds);
      expect(marks.length).toBeGreaterThan(0);
      expect(sameMarks(marks, marksAt(booleans, seconds)), `the picture at ${seconds}`).toBe(true);
    }
  });

  it('runs past its last span where a figure waits at the end', () => {
    const last = Math.max(...booleans.timeline!.spans.map((span) => span.to));
    expect(booleans.timeline!.duration).toBeGreaterThan(last);
    expect(resolveTimeline({ spans: [], duration: 3 }).duration).toBe(3);
    expect(resolveTimeline({ spans: [{ entry: entries[0], from: 0, to: 2 }] }).duration).toBe(2);
  });

  it('reads the flat demo thirty spans as numbers rather than as the calls that made them', () => {
    const spans = tangent.timeline!.spans;
    expect(spans).toHaveLength(30);
    // Its entrance is everything up to the walk, which is where the first span
    // that starts after the entrance has finished begins.
    const entrance = spans.filter((span) => span.from < 3.5);
    expect(entrance).toHaveLength(23);
  });

  it('shows a negative offset as a span that starts before the one before it ends', () => {
    const spans = tangent.timeline!.spans;
    const overlapping = spans.filter((span, at) => at > 0 && span.from < spans[at - 1].to && span.from > spans[at - 1].from);
    expect(overlapping.length).toBeGreaterThanOrEqual(6);
  });

  it('gives the flat demo view entry a span of no width, which is applied in full at every time', () => {
    const record: TimelineRecord = {
      spans: [{ entry: { kind: 'followView', target: 'tangent/point' }, from: 0, to: 0 }],
    };
    const built = resolveTimeline(record);
    expect(built.spans).toHaveLength(1);
    expect(built.duration).toBe(0);
    const marks = marksAt(tangent, FLAT_TIMES.walkTo);
    expect(built.extentAt({ width: 10.8, height: 6 }, 0, () => marks).centre).toBeDefined();
  });
});
