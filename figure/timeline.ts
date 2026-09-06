/**
 * Animations in the order they happen, turned into absolute spans.
 *
 * The order is written once and compiled once. Reading it at a time is then a
 * walk over a sorted list, which is what lets the same timeline answer a page
 * playing forward, a reader dragging backwards, and a recorder stepping.
 */
import { curveFor, type Curve } from '../values/ease.js';
import type { Animation } from './animation.js';
import type { Mark } from './mark.js';

export interface Span {
  animation: Animation;
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

  play(animation: Animation, seconds: number, options: PlayOptions = {}): Timeline {
    const from = this.duration + (options.after ?? 0);
    const to = from + seconds;
    const span: Span = { animation, from, to, curve: options.curve ?? curveFor(true, true) };
    return new Timeline([...this.spans, span], Math.max(this.duration, to));
  }

  /** Several changes over one span, which is how two things move at once. */
  together(animations: readonly Animation[], seconds: number, options: PlayOptions = {}): Timeline {
    let built: Timeline = this;
    animations.forEach((animation, at) => {
      built = built.play(animation, seconds, at === 0 ? options : { ...options, after: -seconds });
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
      const width = span.to - span.from;
      const raw = width <= 0 ? (seconds >= span.to ? 1 : 0) : (seconds - span.from) / width;
      const held = raw <= 0 ? 0 : raw >= 1 ? 1 : raw;
      built = span.animation(built, span.curve(held));
    }
    return built;
  }
}
