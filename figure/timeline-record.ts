/**
 * The timeline written as data, and it is the compiled spans rather than the
 * calls that built them.
 *
 * A span is an entry, a `from`, a `to` and the name of a curve, which is what
 * `figure/timeline.ts` already holds and what `marksAt` already reads. The
 * `after` offset a call takes and a stagger's gap are not here: each is folded
 * into the next `from` when the call is made and neither can be read back out of
 * the numbers, since two spans starting together say nothing about which call
 * grouped them.
 *
 * Writing the calls instead would put the compiler in every renderer. What is
 * lost is the author's intent behind an overlap, and the overlap itself is in the
 * numbers.
 */
import { curveNamed, type CurveName } from '../values/ease.js';
import { Timeline, type Entry, type Span } from './timeline.js';
import { resolveAnimation, type AnimationRecord } from './animation-record.js';
import { resolveViewChange, type ViewChangeRecord } from './view-record.js';
import type { Bindings } from './expression.js';

/** What one span changes: some of the marks, or the view. */
export type EntryRecord = AnimationRecord | ViewChangeRecord;

export interface SpanRecord {
  readonly entry: EntryRecord;
  readonly from: number;
  readonly to: number;
  /** How the change is paced, still at both ends unless named. */
  readonly curve?: CurveName;
}

export interface TimelineRecord {
  readonly spans: readonly SpanRecord[];
  /** How long the figure runs, which is past the end of its last span where a
   * figure waits at the end. The last span's own end unless named. */
  readonly duration?: number;
}

/** A view move rather than a change to the marks, told apart by its kind, which
 * is what lets one list hold both. */
const changesView = (record: EntryRecord): record is ViewChangeRecord =>
  record.kind === 'moveView' || record.kind === 'followView' || record.kind === 'frameView';

/** The entry a record describes, which is an animation or a view move. */
export function resolveEntry(record: EntryRecord, bindings: Bindings = {}): Entry {
  return changesView(record) ? resolveViewChange(record) : resolveAnimation(record, bindings);
}

/** The timeline a record describes, as the spans it is played from. */
export function resolveTimeline(record: TimelineRecord, bindings: Bindings = {}): Timeline {
  const spans: Span[] = record.spans.map((span) => ({
    entry: resolveEntry(span.entry, bindings),
    from: span.from,
    to: span.to,
    curve: curveNamed(span.curve ?? 'smoothstep'),
  }));
  return Timeline.of(spans, record.duration);
}
