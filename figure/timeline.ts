/**
 * Animations in the order they happen, turned into absolute spans.
 *
 * The order is written once and compiled once. Reading it at a time is then a
 * walk over a sorted list, which is what lets the same timeline answer a page
 * playing forward, a reader dragging backwards, and a recorder stepping.
 */
import { curveFor, type Curve } from '../values/ease.js';
import type { Animation } from './animation.js';
import type { Extent, ViewChange } from './extent.js';
import type { Mark } from './mark.js';

/** What one entry of a timeline changes: some of the marks, or the view. */
export type Entry = Animation | ViewChange;

/** A change to the marks rather than to the view. An animation is a function and
 * a view change is an object holding one, which is the whole of the test. */
function changesMarks(entry: Entry): entry is Animation {
  return typeof entry === 'function';
}

export interface Span {
  entry: Entry;
  from: number;
  to: number;
  curve: Curve;
}

export interface PlayOptions {
  /** How the change is paced. Still at both ends unless a figure says otherwise,
   * because a move that starts and stops abruptly reads as a jump. */
  curve?: Curve;
  /** Seconds after the previous entry finished. A negative wait overlaps this
   * animation with the one before it. */
  after?: number;
}

export interface StaggerOptions extends PlayOptions {
  /** Seconds between one change starting and the next. A quarter of each
   * change's own length unless a figure says otherwise, so a row overlaps rather
   * than running one at a time. */
  gap?: number;
}

/**
 * The ordered list, built by naming one thing after another.
 *
 * Each call hands back a new timeline rather than changing this one, so a figure
 * that builds a timeline inside a function called every frame cannot accumulate
 * entries it did not mean to.
 */
export class Timeline {
  private constructor(
    readonly spans: readonly Span[],
    readonly duration: number
  ) {}

  static empty(): Timeline {
    return new Timeline([], 0);
  }

  /**
   * A timeline from spans already compiled, which is what a figure read from a
   * file carries.
   *
   * The duration is given rather than read off the spans, since a figure that
   * waits at the end runs past the end of its last one.
   */
  static of(spans: readonly Span[], duration?: number): Timeline {
    return new Timeline(spans, duration ?? spans.reduce((last, span) => Math.max(last, span.to), 0));
  }

  play(entry: Entry, seconds: number, options: PlayOptions = {}): Timeline {
    const from = this.duration + (options.after ?? 0);
    const to = from + seconds;
    const span: Span = { entry, from, to, curve: options.curve ?? curveFor(true, true) };
    return new Timeline([...this.spans, span], Math.max(this.duration, to));
  }

  /** Several changes over one span, which is how two things move at once. */
  together(entries: readonly Entry[], seconds: number, options: PlayOptions = {}): Timeline {
    let built: Timeline = this;
    entries.forEach((entry, at) => {
      built = built.play(entry, seconds, at === 0 ? options : { ...options, after: -seconds });
    });
    return built;
  }

  /**
   * A row of changes, each starting a gap after the one before and each running
   * the same length.
   *
   * Written out by hand this is one play a change with a negative wait between
   * them, and getting that arithmetic right at every entry is what a row of six
   * things arriving one after another used to cost.
   */
  stagger(entries: readonly Entry[], seconds: number, options: StaggerOptions = {}): Timeline {
    const gap = Math.max(0, options.gap ?? seconds / 4);
    let built: Timeline = this;
    entries.forEach((entry, at) => {
      built = built.play(entry, seconds, at === 0 ? options : { ...options, after: gap - seconds });
    });
    return built;
  }

  wait(seconds: number): Timeline {
    return new Timeline(this.spans, this.duration + seconds);
  }

  /**
   * The marks as every span leaves them at a time.
   *
   * A span that has not started yet is applied at nothing and a span already
   * finished is applied in full, which is what makes this a function of time
   * rather than a record of what has been played. A mark waiting to fade in is
   * therefore invisible rather than solid, and one that has faded out stays gone.
   */
  at(marks: readonly Mark[], seconds: number): readonly Mark[] {
    let built = marks;
    for (const span of this.spans) {
      if (!changesMarks(span.entry)) continue;
      built = span.entry(built, span.curve(this.along(span, seconds)));
    }
    return built;
  }

  /**
   * The extent as every view entry leaves it at a time, starting from the one
   * the figure declares.
   *
   * A figure with no view entry gets the declared extent back at every time. One
   * that has view entries gets it as the base of the fold rather than as the
   * answer, so a declared extent chosen from the shape of the surface still
   * chooses under a view that moves.
   */
  extentAt(extent: Extent, seconds: number, marks: () => readonly Mark[] = () => []): Extent {
    let built = extent;
    for (const span of this.spans) {
      if (changesMarks(span.entry)) continue;
      built = span.entry.view(built, span.curve(this.along(span, seconds)), marks);
    }
    return built;
  }

  /** How far through its own span the clock is, held inside nothing to one. A
   * span of no width is over the instant it is reached. */
  private along(span: Span, seconds: number): number {
    const width = span.to - span.from;
    const raw = width <= 0 ? (seconds >= span.to ? 1 : 0) : (seconds - span.from) / width;
    return raw <= 0 ? 0 : raw >= 1 ? 1 : raw;
  }
}
